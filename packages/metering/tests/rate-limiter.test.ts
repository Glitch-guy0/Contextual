import { describe, expect, test } from "bun:test";
import { CreditLedgerService } from "../src/credit-ledger";
import { RateLimiterService } from "../src/rate-limiter";

describe("Story S2.2: Per-User 5 RPS Sliding Window Rate Limiter", () => {
  test("TC-2.2.1: 5 requests within 1000ms admitted with allowed: true and decreasing remaining", async () => {
    const rateLimiter = new RateLimiterService();
    const userId = "usr_rl_01";
    const baseTime = 1700000000000;

    for (let i = 0; i < 5; i++) {
      const res = await rateLimiter.checkRateLimit(userId, baseTime + i * 50);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(4 - i);
      expect(res.retryAfterSeconds).toBe(0);
      expect(res.limit).toBe(5);
    }
  });

  test("TC-2.2.2: 6th request within 1000ms rejected with allowed: false and retryAfterSeconds >= 1", async () => {
    const rateLimiter = new RateLimiterService();
    const userId = "usr_rl_02";
    const baseTime = 1700000000000;

    // Fire 5 requests
    for (let i = 0; i < 5; i++) {
      const res = await rateLimiter.checkRateLimit(userId, baseTime + i * 20);
      expect(res.allowed).toBe(true);
    }

    // 6th request within the same 1000ms window
    const throttled = await rateLimiter.checkRateLimit(userId, baseTime + 500);
    expect(throttled.allowed).toBe(false);
    expect(throttled.remaining).toBe(0);
    expect(throttled.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(throttled.limit).toBe(5);

    // After window expires (>1000ms after the oldest request)
    const laterRes = await rateLimiter.checkRateLimit(userId, baseTime + 1050);
    expect(laterRes.allowed).toBe(true);
  });

  test("TC-2.2.3: Rejected requests debit zero credits (BR-017)", async () => {
    const rateLimiter = new RateLimiterService();
    const ledger = new CreditLedgerService();
    const userId = "usr_rl_03";
    const baseTime = 1700000000000;

    // Initialize balance
    const initialBalance = await ledger.getBalance(userId);
    expect(initialBalance).toBe(10.0);

    // Consume all 5 RPS slots with legitimate debits
    for (let i = 0; i < 5; i++) {
      const rl = await rateLimiter.checkRateLimit(userId, baseTime + i * 10);
      expect(rl.allowed).toBe(true);
      if (rl.allowed) {
        await ledger.debitCredits(userId, 0.5, "llm_action");
      }
    }

    const balanceAfter5 = await ledger.getBalance(userId);
    expect(balanceAfter5).toBe(7.5);

    // 6th request is throttled
    const throttled = await rateLimiter.checkRateLimit(userId, baseTime + 100);
    expect(throttled.allowed).toBe(false);

    // BR-017 invariant: if throttled, debit is short-circuited
    if (throttled.allowed) {
      await ledger.debitCredits(userId, 0.5, "llm_action");
    }

    // Balance remains exactly 7.5; zero credits were deducted
    const balanceAfterThrottled = await ledger.getBalance(userId);
    expect(balanceAfterThrottled).toBe(7.5);
  });

  test("User isolation: throttling User A does not affect User B", async () => {
    const rateLimiter = new RateLimiterService();
    const baseTime = 1700000000000;

    // Saturate user A
    for (let i = 0; i < 5; i++) {
      await rateLimiter.checkRateLimit("user_a", baseTime);
    }
    const throttledA = await rateLimiter.checkRateLimit("user_a", baseTime);
    expect(throttledA.allowed).toBe(false);

    // User B should be completely fresh
    const resB = await rateLimiter.checkRateLimit("user_b", baseTime);
    expect(resB.allowed).toBe(true);
    expect(resB.remaining).toBe(4);
  });
});
