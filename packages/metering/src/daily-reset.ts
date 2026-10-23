import {
  CREDIT_GRANT_DEFAULT,
  type ResetResult,
} from "@repo/contracts/metering";

export const DAILY_RESET_LUA = `
local locked = redis.call('SET', KEYS[1], '1', 'NX', 'EX', tonumber(ARGV[2]))

if not locked then
    local current = redis.call('GET', KEYS[2]) or ARGV[1]
    return {0, tostring(current), "0"}
end

local old_balance_str = redis.call('GET', KEYS[2])
local old_balance
if not old_balance_str then
    old_balance = tonumber(ARGV[1])
else
    old_balance = tonumber(old_balance_str)
end

local expired = math.max(0, old_balance)

redis.call('SET', KEYS[2], ARGV[1], 'EX', tonumber(ARGV[3]))

return {1, ARGV[1], tostring(expired)}
`.trim();

export interface DailyResetRedisLike {
  get?(key: string): Promise<string | null>;
  set?(key: string, value: string, opts?: { ex?: number }): Promise<unknown>;
  eval<T = unknown>(script: string, keys: string[], args: (string | number)[]): Promise<T>;
  evalsha?<T = unknown>(sha: string, keys: string[], args: (string | number)[]): Promise<T>;
  scriptLoad?(script: string): Promise<string>;
}

export class InMemoryDailyResetRedis implements DailyResetRedisLike {
  private store = new Map<string, { value: string; expiresAt?: number }>();
  private scripts = new Map<string, string>();

  async scriptLoad(script: string): Promise<string> {
    const sha = "sha_reset_" + Math.abs(script.split("").reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)).toString(16);
    this.scripts.set(sha, script);
    return sha;
  }

  async eval<T = unknown>(_script: string, keys: string[], args: (string | number)[]): Promise<T> {
    const lockKey = keys[0] ?? "";
    const balanceKey = keys[1] ?? "";
    const defaultGrant = String(args[0]);
    const lockTtl = Number(args[1]);
    const balanceTtl = Number(args[2]);

    const lockEntry = this.store.get(lockKey);
    const now = Date.now();
    const isLockActive = lockEntry && (!lockEntry.expiresAt || lockEntry.expiresAt > now);

    if (isLockActive) {
      const balanceEntry = this.store.get(balanceKey);
      const current = balanceEntry ? balanceEntry.value : defaultGrant;
      return [0, current, "0"] as unknown as T;
    }

    // Acquire lock
    this.store.set(lockKey, {
      value: "1",
      expiresAt: lockTtl ? now + lockTtl * 1000 : undefined,
    });

    const oldBalanceEntry = this.store.get(balanceKey);
    const oldBalance = oldBalanceEntry ? Number(oldBalanceEntry.value) : Number(defaultGrant);
    const expired = Math.max(0, oldBalance);

    // Set new balance
    this.store.set(balanceKey, {
      value: defaultGrant,
      expiresAt: balanceTtl ? now + balanceTtl * 1000 : undefined,
    });

    return [1, defaultGrant, String(expired)] as unknown as T;
  }

  async evalsha<T = unknown>(sha: string, keys: string[], args: (string | number)[]): Promise<T> {
    const script = this.scripts.get(sha);
    if (!script) {
      throw new Error("NOSCRIPT No matching script. Please use EVAL.");
    }
    return this.eval<T>(script, keys, args);
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, opts?: { ex?: number }): Promise<"OK"> {
    const expiresAt = opts?.ex ? Date.now() + opts.ex * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
    return "OK";
  }

  clear(): void {
    this.store.clear();
    this.scripts.clear();
  }
}

export interface DailyResetEngineConfig {
  redisClient?: DailyResetRedisLike;
  defaultGrant?: number;
  lockTtlSeconds?: number;
  balanceTtlSeconds?: number;
}

export interface ResetBatchResult {
  readonly total: number;
  readonly executed: number;
  readonly skipped: number;
  readonly totalExpiredCredits: number;
  readonly results: readonly ResetResult[];
}

export class DailyResetEngine {
  private redis: DailyResetRedisLike;
  private defaultGrant: number;
  private lockTtl: number;
  private balanceTtl: number;
  private scriptSha: string | null = null;

  constructor(config: DailyResetEngineConfig = {}) {
    this.redis = config.redisClient ?? new InMemoryDailyResetRedis();
    this.defaultGrant = config.defaultGrant ?? CREDIT_GRANT_DEFAULT;
    this.lockTtl = config.lockTtlSeconds ?? 86400; // 24h
    this.balanceTtl = config.balanceTtlSeconds ?? 172800; // 48h
  }

  /**
   * Executes daily credit reset for a single user.
   * Guarded by SET NX lock for strict idempotency (TC-2.6.2, BR-025).
   *
   * @param userId The tenant user ID
   * @param dateString Optional UTC date in 'YYYY-MM-DD' format (defaults to current UTC date)
   */
  async executeDailyReset(userId: string, dateString?: string): Promise<ResetResult> {
    const date = dateString ?? new Date().toISOString().slice(0, 10);
    const lockKey = `reset:${date}:${userId}`;
    const balanceKey = `credits:${userId}`;

    const keys = [lockKey, balanceKey];
    const args = [String(this.defaultGrant), String(this.lockTtl), String(this.balanceTtl)];

    let result: [number, string, string];

    try {
      if (this.scriptSha && this.redis.evalsha) {
        result = await this.redis.evalsha<[number, string, string]>(this.scriptSha, keys, args);
      } else {
        result = await this.redis.eval<[number, string, string]>(DAILY_RESET_LUA, keys, args);
        if (this.redis.scriptLoad && !this.scriptSha) {
          this.redis.scriptLoad(DAILY_RESET_LUA).then((sha) => (this.scriptSha = sha)).catch(() => {});
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("NOSCRIPT") && this.redis.scriptLoad) {
        this.scriptSha = await this.redis.scriptLoad(DAILY_RESET_LUA);
        result = await this.redis.evalsha!<[number, string, string]>(this.scriptSha, keys, args);
      } else {
        result = await this.redis.eval<[number, string, string]>(DAILY_RESET_LUA, keys, args);
      }
    }

    const executed = result[0] === 1;
    const balance = Number(result[1]);
    const expiredCredits = Number(result[2]);

    return {
      executed,
      balance,
      expiredCredits,
      date,
    };
  }

  /**
   * Executes daily reset across a batch of active user IDs.
   */
  async executeDailyResetBatch(userIds: string[], dateString?: string): Promise<ResetBatchResult> {
    const results: ResetResult[] = [];
    let executedCount = 0;
    let skippedCount = 0;
    let totalExpired = 0;

    for (const userId of userIds) {
      const res = await this.executeDailyReset(userId, dateString);
      results.push(res);
      if (res.executed) {
        executedCount++;
        totalExpired += res.expiredCredits;
      } else {
        skippedCount++;
      }
    }

    return {
      total: userIds.length,
      executed: executedCount,
      skipped: skippedCount,
      totalExpiredCredits: totalExpired,
      results,
    };
  }
}
