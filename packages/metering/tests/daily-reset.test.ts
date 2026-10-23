import { describe, expect, test } from "bun:test";
import { DailyResetEngine } from "../src/daily-reset";

describe("Story S2.6: Idempotent Daily 08:00 UTC Credit Reset Cron & QStash Endpoint", () => {
  test("TC-2.6.1: Account with 3.5 credits resets to 10.0 and expires 3.5 credits (BR-025)", async () => {
    const engine = new DailyResetEngine();
    const userId = "usr_reset_01";
    const date = "2026-10-24";

    // Set an initial balance of 3.5
    // Using engine's redis client directly or mock
    const redis = (engine as unknown as { redis: { set: (k: string, v: string) => Promise<unknown> } }).redis;
    await redis.set(`credits:${userId}`, "3.5");

    const result = await engine.executeDailyReset(userId, date);

    expect(result.executed).toBe(true);
    expect(result.balance).toBe(10.0);
    expect(result.expiredCredits).toBe(3.5);
    expect(result.date).toBe(date);
  });

  test("TC-2.6.2: 10 parallel concurrent triggers execute exactly once (idempotency)", async () => {
    const engine = new DailyResetEngine();
    const userId = "usr_reset_02";
    const date = "2026-10-24";

    const redis = (engine as unknown as { redis: { set: (k: string, v: string) => Promise<unknown> } }).redis;
    await redis.set(`credits:${userId}`, "2.0");

    // Fire 10 parallel executions
    const promises = Array.from({ length: 10 }, () => engine.executeDailyReset(userId, date));
    const results = await Promise.all(promises);

    const executedCount = results.filter((r) => r.executed).length;
    const skippedCount = results.filter((r) => !r.executed).length;

    expect(executedCount).toBe(1);
    expect(skippedCount).toBe(9);

    // Every result reports balance 10.0
    for (const r of results) {
      expect(r.balance).toBe(10.0);
    }
  });

  test("TC-2.6.3: Unspent credits permanently expire with zero roll-over carry-over (BR-026)", async () => {
    const engine = new DailyResetEngine();
    const userId = "usr_reset_03";
    const date = "2026-10-24";

    const redis = (engine as unknown as { redis: { set: (k: string, v: string) => Promise<unknown> } }).redis;
    // User had remaining 8.5 credits
    await redis.set(`credits:${userId}`, "8.5");

    const result = await engine.executeDailyReset(userId, date);
    expect(result.executed).toBe(true);
    expect(result.balance).toBe(10.0);
    expect(result.expiredCredits).toBe(8.5);

    // Subsequent call on the same day reports executed: false and 0 expired
    const nextCall = await engine.executeDailyReset(userId, date);
    expect(nextCall.executed).toBe(false);
    expect(nextCall.balance).toBe(10.0);
    expect(nextCall.expiredCredits).toBe(0);
  });

  test("executeDailyResetBatch handles multi-tenant batch and tallies totals correctly", async () => {
    const engine = new DailyResetEngine();
    const date = "2026-10-24";
    const redis = (engine as unknown as { redis: { set: (k: string, v: string) => Promise<unknown> } }).redis;

    await redis.set("credits:user_1", "1.5");
    await redis.set("credits:user_2", "4.0");
    await redis.set("credits:user_3", "10.0");

    const batchRes = await engine.executeDailyResetBatch(["user_1", "user_2", "user_3"], date);

    expect(batchRes.total).toBe(3);
    expect(batchRes.executed).toBe(3);
    expect(batchRes.skipped).toBe(0);
    expect(batchRes.totalExpiredCredits).toBe(15.5);

    // Running the same batch a second time on the same day should skip all
    const secondBatch = await engine.executeDailyResetBatch(["user_1", "user_2", "user_3"], date);
    expect(secondBatch.total).toBe(3);
    expect(secondBatch.executed).toBe(0);
    expect(secondBatch.skipped).toBe(3);
    expect(secondBatch.totalExpiredCredits).toBe(0);
  });
});
