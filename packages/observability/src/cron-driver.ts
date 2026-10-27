import type { CronExecutionResult } from "@repo/contracts";
import { DailyResetEngine, InMemoryDailyResetRedis } from "@repo/metering";
import { getLogger } from "./logger.js";
import { emitHeartbeat } from "./heartbeat.js";
import { getCorrelationId } from "./context.js";

export interface DailyResetCronOptions {
  userIds: string[];
  dateString?: string;
  dailyResetEngine?: DailyResetEngine;
}

/**
 * Execute daily 08:00 UTC credit reset batch cron job.
 * Wraps @repo/metering daily reset with idempotency, structured logging, and heartbeat emission.
 */
export async function executeDailyResetCron(
  options: DailyResetCronOptions
): Promise<CronExecutionResult> {
  const startTime = Date.now();
  const logger = getLogger("maintenance");
  const correlationId = getCorrelationId();

  const resetEngine =
    options.dailyResetEngine ??
    new DailyResetEngine({ redisClient: new InMemoryDailyResetRedis() });

  logger.info("cron.daily_reset.started", {
    user_count: options.userIds.length,
    date: options.dateString,
    correlation_id: correlationId,
  });

  try {
    const batchResult = await resetEngine.executeDailyResetBatch(
      options.userIds,
      options.dateString
    );

    const durationMs = Date.now() - startTime;
    const isCompleted = batchResult.executed > 0;

    const result: CronExecutionResult = {
      status: isCompleted ? "completed" : "skipped",
      processed: batchResult.executed,
      idempotent_skips: batchResult.skipped,
      expired_credits: batchResult.totalExpiredCredits,
      duration_ms: durationMs,
      timestamp: new Date().toISOString(),
    };

    logger.info("cron.daily_reset.completed", {
      processed_users: result.processed,
      reset_count: result.processed,
      skipped_count: result.idempotent_skips,
      expired_credits: result.expired_credits,
      duration_ms: durationMs,
    });

    await emitHeartbeat("daily_credit_reset", "ok", {
      latencyMs: durationMs,
      metadata: {
        processed_users: result.processed,
        idempotent_skips: result.idempotent_skips,
        expired_credits: result.expired_credits,
      },
    });

    return result;
  } catch (err: unknown) {
    const durationMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);

    logger.error("cron.daily_reset.failed", {
      error: errorMessage,
      duration_ms: durationMs,
    });

    await emitHeartbeat("daily_credit_reset", "down", {
      latencyMs: durationMs,
      error: errorMessage,
    });

    throw err;
  }
}
