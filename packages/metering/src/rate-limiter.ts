import {
  RATE_LIMIT_RPS,
  RATE_LIMIT_WINDOW_MS,
  type RateLimitResult,
} from "@repo/contracts/metering";

export const SLIDING_WINDOW_LUA = `
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local max_requests = tonumber(ARGV[3])
local clear_before = now - window

-- Prune requests outside rolling window
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, clear_before)

local current_count = redis.call('ZCARD', KEYS[1])

if current_count >= max_requests then
    local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
    local retry_after = 1
    if #oldest > 0 then
        local oldest_ts = tonumber(oldest[2])
        local remaining_window_ms = (oldest_ts + window) - now
        if remaining_window_ms > 0 then
            retry_after = math.ceil(remaining_window_ms / 1000)
        end
    end
    return {0, current_count, retry_after}
end

redis.call('ZADD', KEYS[1], now, ARGV[4])
redis.call('EXPIRE', KEYS[1], 2)

return {1, max_requests - (current_count + 1), 0}
`.trim();

export interface RateLimiterRedisLike {
  get?(key: string): Promise<string | null>;
  set?(key: string, value: string, opts?: { ex?: number }): Promise<unknown>;
  del?(key: string): Promise<number | unknown>;
  eval<T = unknown>(script: string, keys: string[], args: (string | number)[]): Promise<T>;
  evalsha?<T = unknown>(sha: string, keys: string[], args: (string | number)[]): Promise<T>;
  scriptLoad?(script: string): Promise<string>;
}

/**
 * In-memory hermetic sliding window rate limiter engine for unit tests and local execution.
 */
export class InMemoryRateLimitRedis implements RateLimiterRedisLike {
  private zsets = new Map<string, Array<{ score: number; member: string }>>();
  private scripts = new Map<string, string>();

  async scriptLoad(script: string): Promise<string> {
    const sha = "sha_rl_" + Math.abs(script.split("").reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)).toString(16);
    this.scripts.set(sha, script);
    return sha;
  }

  async eval<T = unknown>(script: string, keys: string[], args: (string | number)[]): Promise<T> {
    const key = keys[0] ?? "";
    const now = Number(args[0]);
    const window = Number(args[1]);
    const maxRequests = Number(args[2]);
    const requestId = String(args[3]);

    let set = this.zsets.get(key) || [];
    const clearBefore = now - window;
    set = set.filter((item) => item.score > clearBefore);

    if (set.length >= maxRequests) {
      const oldest = set[0];
      let retryAfter = 1;
      if (oldest) {
        const remainingMs = oldest.score + window - now;
        if (remainingMs > 0) {
          retryAfter = Math.ceil(remainingMs / 1000);
        }
      }
      this.zsets.set(key, set);
      return [0, set.length, retryAfter] as unknown as T;
    }

    set.push({ score: now, member: requestId });
    set.sort((a, b) => a.score - b.score);
    this.zsets.set(key, set);

    const remaining = maxRequests - set.length;
    return [1, remaining, 0] as unknown as T;
  }

  async evalsha<T = unknown>(sha: string, keys: string[], args: (string | number)[]): Promise<T> {
    const script = this.scripts.get(sha);
    if (!script) {
      throw new Error("NOSCRIPT No matching script. Please use EVAL.");
    }
    return this.eval<T>(script, keys, args);
  }

  async del(key: string): Promise<number> {
    const existed = this.zsets.has(key);
    this.zsets.delete(key);
    return existed ? 1 : 0;
  }

  clear(): void {
    this.zsets.clear();
    this.scripts.clear();
  }
}

export interface RateLimiterConfig {
  redisClient?: RateLimiterRedisLike;
  limit?: number;
  windowMs?: number;
  keyPrefix?: string;
}

export class RateLimiterService {
  private redis: RateLimiterRedisLike;
  private limit: number;
  private windowMs: number;
  private keyPrefix: string;
  private scriptSha: string | null = null;

  constructor(config: RateLimiterConfig = {}) {
    this.redis = config.redisClient ?? new InMemoryRateLimitRedis();
    this.limit = config.limit ?? RATE_LIMIT_RPS;
    this.windowMs = config.windowMs ?? RATE_LIMIT_WINDOW_MS;
    this.keyPrefix = config.keyPrefix ?? "rl:";
  }

  private getKey(userId: string): string {
    return `${this.keyPrefix}${userId}`;
  }

  /**
   * Evaluates rolling sliding window rate limit for the given user.
   *
   * @param userId Unique user identifier
   * @param nowMs Optional timestamp for deterministic time injection (defaults to Date.now())
   */
  async checkRateLimit(userId: string, nowMs = Date.now()): Promise<RateLimitResult> {
    const key = this.getKey(userId);
    const requestId = `${nowMs}:${Math.random().toString(36).slice(2, 9)}`;
    const keys = [key];
    const args = [nowMs, this.windowMs, this.limit, requestId];

    let result: [number, number, number];

    try {
      if (this.scriptSha && this.redis.evalsha) {
        result = await this.redis.evalsha<[number, number, number]>(this.scriptSha, keys, args);
      } else {
        result = await this.redis.eval<[number, number, number]>(SLIDING_WINDOW_LUA, keys, args);
        if (this.redis.scriptLoad && !this.scriptSha) {
          this.redis
            .scriptLoad(SLIDING_WINDOW_LUA)
            .then((sha) => (this.scriptSha = sha))
            .catch(() => {});
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("NOSCRIPT") && this.redis.scriptLoad) {
        this.scriptSha = await this.redis.scriptLoad(SLIDING_WINDOW_LUA);
        result = await this.redis.evalsha!<[number, number, number]>(this.scriptSha, keys, args);
      } else {
        result = await this.redis.eval<[number, number, number]>(SLIDING_WINDOW_LUA, keys, args);
      }
    }

    const allowed = result[0] === 1;
    const remaining = allowed ? Number(result[1]) : 0;
    const retryAfterSeconds = allowed ? 0 : Math.max(1, Number(result[2]));

    return {
      allowed,
      remaining,
      retryAfterSeconds,
      windowMs: this.windowMs,
      limit: this.limit,
    };
  }

  /**
   * Resets rate limiter counter for the given user (e.g. for test cleanup).
   */
  async reset(userId: string): Promise<void> {
    const key = this.getKey(userId);
    if (this.redis.del) {
      await this.redis.del(key);
    }
  }
}
