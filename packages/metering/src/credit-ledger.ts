import {
  CREDIT_GRANT_DEFAULT,
  type DebitResult,
} from "@repo/contracts/metering";

export const DEBIT_CREDITS_LUA = `
local current = redis.call('GET', KEYS[1])
local balance

if not current then
    balance = tonumber(ARGV[2])
else
    balance = tonumber(current)
end

local cost = tonumber(ARGV[1])

if balance < cost then
    return {0, tostring(balance), tostring(cost)}
end

balance = balance - cost
redis.call('SET', KEYS[1], tostring(balance), 'EX', tonumber(ARGV[3]))

return {1, tostring(balance), tostring(cost)}
`.trim();

export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: { ex?: number }): Promise<unknown>;
  eval<T = unknown>(script: string, keys: string[], args: (string | number)[]): Promise<T>;
  evalsha?<T = unknown>(sha: string, keys: string[], args: (string | number)[]): Promise<T>;
  scriptLoad?(script: string): Promise<string>;
}

/**
 * In-memory fallback Redis engine for hermetic local testing and offline execution.
 */
export class InMemoryRedis implements RedisLike {
  private store = new Map<string, { value: string; expiresAt?: number }>();
  private scripts = new Map<string, string>();

  private isExpired(entry?: { value: string; expiresAt?: number }): boolean {
    if (!entry) return true;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      return true;
    }
    return false;
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (this.isExpired(entry)) {
      this.store.delete(key);
      return null;
    }
    return entry!.value;
  }

  async set(key: string, value: string, opts?: { ex?: number }): Promise<"OK"> {
    const expiresAt = opts?.ex ? Date.now() + opts.ex * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
    return "OK";
  }

  async scriptLoad(script: string): Promise<string> {
    const sha = "sha_" + Math.abs(script.split("").reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)).toString(16);
    this.scripts.set(sha, script);
    return sha;
  }

  async eval<T = unknown>(script: string, keys: string[], args: (string | number)[]): Promise<T> {
    // Execute debit script semantics synchronously without yielding (reproducing Redis single-threaded atomicity)
    if (script.includes("debit_amount") || script === DEBIT_CREDITS_LUA) {
      const key = keys[0] ?? "";
      const cost = Number(args[0]);
      const defaultGrant = Number(args[1]);
      const ttl = Number(args[2]);

      const entry = this.store.get(key);
      let balance: number;
      if (!entry || this.isExpired(entry)) {
        balance = defaultGrant;
      } else {
        balance = Number(entry.value);
      }

      if (balance < cost) {
        return [0, String(balance), String(cost)] as unknown as T;
      }

      balance = balance - cost;
      const expiresAt = ttl ? Date.now() + ttl * 1000 : undefined;
      this.store.set(key, { value: String(balance), expiresAt });
      return [1, String(balance), String(cost)] as unknown as T;
    }

    throw new Error(`Unsupported script in InMemoryRedis: ${script.slice(0, 40)}`);
  }

  async evalsha<T = unknown>(sha: string, keys: string[], args: (string | number)[]): Promise<T> {
    const script = this.scripts.get(sha);
    if (!script) {
      throw new Error("NOSCRIPT No matching script. Please use EVAL.");
    }
    return this.eval<T>(script, keys, args);
  }

  clear(): void {
    this.store.clear();
    this.scripts.clear();
  }
}

export interface CreditLedgerConfig {
  redisClient?: RedisLike;
  defaultGrant?: number;
  balanceTtlSeconds?: number;
}

export class CreditLedgerService {
  private redis: RedisLike;
  private defaultGrant: number;
  private balanceTtl: number;
  private scriptSha: string | null = null;

  constructor(config: CreditLedgerConfig = {}) {
    this.redis = config.redisClient ?? new InMemoryRedis();
    this.defaultGrant = config.defaultGrant ?? CREDIT_GRANT_DEFAULT;
    this.balanceTtl = config.balanceTtlSeconds ?? 172800; // 48h
  }

  private getKey(userId: string): string {
    return `credits:${userId}`;
  }

  /**
   * Retrieves the current credit balance. Initialises to defaultGrant if not set.
   */
  async getBalance(userId: string): Promise<number> {
    const key = this.getKey(userId);
    const val = await this.redis.get(key);
    if (val === null) {
      await this.redis.set(key, String(this.defaultGrant), { ex: this.balanceTtl });
      return this.defaultGrant;
    }
    return Number(val);
  }

  /**
   * Directly sets the user balance (e.g. for testing or administrative resets).
   */
  async setBalance(userId: string, balance: number): Promise<void> {
    const key = this.getKey(userId);
    await this.redis.set(key, String(balance), { ex: this.balanceTtl });
  }

  /**
   * Atomically evaluates balance and decrements credits in a single Redis roundtrip.
   */
  async debitCredits(userId: string, cost: number, action = "llm_action"): Promise<DebitResult> {
    const key = this.getKey(userId);
    const keys = [key];
    const args = [String(cost), String(this.defaultGrant), String(this.balanceTtl)];

    let result: [number, string, string];

    try {
      if (this.scriptSha && this.redis.evalsha) {
        result = await this.redis.evalsha<[number, string, string]>(this.scriptSha, keys, args);
      } else {
        result = await this.redis.eval<[number, string, string]>(DEBIT_CREDITS_LUA, keys, args);
        if (this.redis.scriptLoad && !this.scriptSha) {
          this.redis.scriptLoad(DEBIT_CREDITS_LUA).then((sha) => (this.scriptSha = sha)).catch(() => {});
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("NOSCRIPT") && this.redis.scriptLoad) {
        this.scriptSha = await this.redis.scriptLoad(DEBIT_CREDITS_LUA);
        result = await this.redis.evalsha!<[number, string, string]>(this.scriptSha, keys, args);
      } else {
        // Fallback to direct eval
        result = await this.redis.eval<[number, string, string]>(DEBIT_CREDITS_LUA, keys, args);
      }
    }

    const success = result[0] === 1;
    const remaining = Number(result[1]);
    const debited = success ? Number(result[2]) : 0;

    return {
      success,
      remaining,
      debited,
      action,
    };
  }
}
