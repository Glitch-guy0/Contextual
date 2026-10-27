import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import {
  QStashSignatureVerifier,
  generateQStashSignature,
  executeDailyResetCron,
  setLogDestination,
  onHeartbeat,
  type LogEntry,
  type HeartbeatPayload,
} from "../../packages/observability/src/index.js";
import { DailyResetEngine, InMemoryDailyResetRedis } from "../../packages/metering/src/daily-reset.js";

describe("Milestone M7: Story S7.4 — QStash Webhook Receiver & Scheduled Crons Driver", () => {
  const currentKey = "sigkey_current_test_secret_1234567890";
  const nextKey = "sigkey_next_test_secret_0987654321";

  let capturedLogs: LogEntry[] = [];
  let capturedHeartbeats: HeartbeatPayload[] = [];
  let removeHeartbeatListener: (() => void) | null = null;

  beforeEach(() => {
    capturedLogs = [];
    capturedHeartbeats = [];
    setLogDestination((entry) => capturedLogs.push(entry));
    removeHeartbeatListener = onHeartbeat((hb) => capturedHeartbeats.push(hb));
  });

  afterEach(() => {
    setLogDestination(null);
    if (removeHeartbeatListener) {
      removeHeartbeatListener();
      removeHeartbeatListener = null;
    }
  });

  describe("QStashSignatureVerifier Cryptographic HMAC Verification", () => {
    const verifier = new QStashSignatureVerifier({
      currentSigningKey: currentKey,
      nextSigningKey: nextKey,
    });

    const body = JSON.stringify({ type: "daily_credit_reset", timestamp: "2026-10-27T08:00:00Z" });

    it("accepts signature signed with currentSigningKey", async () => {
      const validSig = generateQStashSignature(body, currentKey);
      const ok = await verifier.verify({ "upstash-signature": validSig }, body);
      expect(ok).toBe(true);
    });

    it("accepts signature signed with nextSigningKey (zero-downtime key rotation)", async () => {
      const nextSig = generateQStashSignature(body, nextKey);
      const ok = await verifier.verify({ "upstash-signature": nextSig }, body);
      expect(ok).toBe(true);
    });

    it("rejects request when Upstash-Signature header is missing", async () => {
      const ok = await verifier.verify({}, body);
      expect(ok).toBe(false);
    });

    it("rejects request when rawBody was tampered with", async () => {
      const validSig = generateQStashSignature(body, currentKey);
      const tamperedBody = JSON.stringify({ type: "daily_credit_reset", malicious: true });
      const ok = await verifier.verify({ "upstash-signature": validSig }, tamperedBody);
      expect(ok).toBe(false);
    });

    it("rejects signature signed with invalid or rogue key", async () => {
      const rogueKey = "sigkey_rogue_attacker_key";
      const rogueSig = generateQStashSignature(body, rogueKey);
      const ok = await verifier.verify({ "upstash-signature": rogueSig }, body);
      expect(ok).toBe(false);
    });

    it("rejects expired webhook signatures past clock tolerance", async () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 1000;
      const expiredSig = generateQStashSignature(body, currentKey, { timestamp: oldTimestamp });
      const strictVerifier = new QStashSignatureVerifier({
        currentSigningKey: currentKey,
        clockToleranceSeconds: 60,
      });
      const ok = await strictVerifier.verify({ "upstash-signature": expiredSig }, body);
      expect(ok).toBe(false);
    });
  });

  describe("executeDailyResetCron Driver", () => {
    it("executes credit reset across batch of users idempotently (BR-025, BR-026)", async () => {
      const redis = new InMemoryDailyResetRedis();
      const resetEngine = new DailyResetEngine({ redisClient: redis });

      // Pre-seed user balances
      await redis.set("credits:user_alpha", "2.5");
      await redis.set("credits:user_beta", "0.0");
      await redis.set("credits:user_gamma", "10.0");

      const userIds = ["user_alpha", "user_beta", "user_gamma"];
      const dateString = "2026-10-27";

      // First run: executes all 3 resets
      const result1 = await executeDailyResetCron({
        userIds,
        dateString,
        dailyResetEngine: resetEngine,
      });

      expect(result1.status).toBe("completed");
      expect(result1.processed).toBe(3);
      expect(result1.idempotent_skips).toBe(0);
      expect(result1.expired_credits).toBe(12.5); // 2.5 + 0.0 + 10.0

      // Verified balances are now 10.0
      expect(await redis.get("credits:user_alpha")).toBe("10");
      expect(await redis.get("credits:user_beta")).toBe("10");
      expect(await redis.get("credits:user_gamma")).toBe("10");

      // Verify heartbeat and structured log
      expect(capturedHeartbeats.some((hb) => hb.job === "daily_credit_reset" && hb.status === "ok")).toBe(true);
      expect(capturedLogs.some((l) => l.event === "cron.daily_reset.completed")).toBe(true);

      // Second concurrent/duplicate run for same day: must skip all 3 (idempotent lock active)
      const result2 = await executeDailyResetCron({
        userIds,
        dateString,
        dailyResetEngine: resetEngine,
      });

      expect(result2.status).toBe("skipped");
      expect(result2.processed).toBe(0);
      expect(result2.idempotent_skips).toBe(3);
    });

    it("emits failed heartbeat and logs error when underlying service throws", async () => {
      const failingEngine = {
        executeDailyResetBatch: async () => {
          throw new Error("Redis cluster connection refused");
        },
      } as unknown as DailyResetEngine;

      await expect(
        executeDailyResetCron({
          userIds: ["usr-1"],
          dailyResetEngine: failingEngine,
        })
      ).rejects.toThrow("Redis cluster connection refused");

      expect(capturedHeartbeats.some((hb) => hb.job === "daily_credit_reset" && hb.status === "down")).toBe(true);
      expect(capturedLogs.some((l) => l.event === "cron.daily_reset.failed")).toBe(true);
    });
  });
});
