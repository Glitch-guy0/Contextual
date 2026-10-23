import {
  CREDIT_GRANT_DEFAULT,
  CREDIT_RESET_UTC_HOUR,
  RATE_LIMIT_RPS,
  RATE_LIMIT_WINDOW_MS,
  type RateLimitResult,
} from "@repo/contracts/metering";

export interface RateLimitHeaderOptions {
  rateLimit?: RateLimitResult;
  limit?: number;
  remaining?: number;
  windowMs?: number;
  retryAfterSeconds?: number;
  creditBalance?: number;
  dailyGrant?: number;
  nowMs?: number;
}

/**
 * Computes the timestamp of the next daily 08:00 UTC reset.
 */
export function getNextDailyResetTimestamp(nowMs = Date.now()): {
  resetsAt: Date;
  resetsInSeconds: number;
  isoString: string;
} {
  const now = new Date(nowMs);
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();

  let target = new Date(Date.UTC(year, month, day, CREDIT_RESET_UTC_HOUR, 0, 0, 0));
  if (now.getTime() >= target.getTime()) {
    target = new Date(Date.UTC(year, month, day + 1, CREDIT_RESET_UTC_HOUR, 0, 0, 0));
  }

  const resetsInSeconds = Math.max(1, Math.ceil((target.getTime() - now.getTime()) / 1000));

  return {
    resetsAt: target,
    resetsInSeconds,
    isoString: target.toISOString(),
  };
}

/**
 * Generates standardized IETF RateLimit and contextual credit response headers.
 * Conforms to RFC 6585, IETF draft-ietf-httpapi-ratelimit-headers, and platform conventions.
 */
export function generateRateLimitHeaders(options: RateLimitHeaderOptions = {}): Record<string, string> {
  const nowMs = options.nowMs ?? Date.now();
  const limit = options.limit ?? options.rateLimit?.limit ?? RATE_LIMIT_RPS;
  const remaining = options.remaining ?? options.rateLimit?.remaining ?? 0;
  const windowMs = options.windowMs ?? options.rateLimit?.windowMs ?? RATE_LIMIT_WINDOW_MS;
  const retryAfterSeconds =
    options.retryAfterSeconds ?? options.rateLimit?.retryAfterSeconds ?? 0;

  const windowSeconds = Math.max(1, Math.round(windowMs / 1000));
  const resetDelta = retryAfterSeconds > 0 ? retryAfterSeconds : windowSeconds;

  const headers: Record<string, string> = {
    "RateLimit-Limit": String(limit),
    "RateLimit-Remaining": String(Math.max(0, remaining)),
    "RateLimit-Reset": String(resetDelta),
    "RateLimit-Policy": `${limit};w=${windowSeconds}`,
  };

  if (retryAfterSeconds > 0) {
    headers["Retry-After"] = String(retryAfterSeconds);
  }

  const { isoString } = getNextDailyResetTimestamp(nowMs);

  if (options.creditBalance !== undefined) {
    headers["X-Credit-Balance"] = String(options.creditBalance);
    headers["X-Credit-Daily-Grant"] = String(options.dailyGrant ?? CREDIT_GRANT_DEFAULT);
    headers["X-Credit-Resets-At"] = isoString;
  }

  return headers;
}
