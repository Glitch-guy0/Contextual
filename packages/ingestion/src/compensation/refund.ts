import { AppProblemError } from "@repo/contracts/errors";
import { REFUND_SCRIPT_LUA } from "./refund-lua";
import type { RefundResult, FailureReason } from "@repo/contracts/ingestion";

export type { RefundResult } from "@repo/contracts/ingestion";

export async function refundCreditsOnFailure(
  options: RefundOptions
): Promise<RefundResult> {
  const [refundedRaw, balanceRaw] = (await options.redisEval(
    REFUND_SCRIPT_LUA,
    [options.creditsKey, options.jobKey],
    [String(options.refundAmount), options.reason]
  )) as Array<number | string>;

  const refunded = refundedRaw === 1;
  const newBalance = Number(balanceRaw ?? 0);

  return {
    refunded,
    newBalance,
  };
}

export async function compensateOnFailure(
  options: RefundOptions
): Promise<RefundResult> {
  return refundCreditsOnFailure(options);
}

export async function markJobFailed(
  options: {
    jobKey: string;
    status: "failed";
    reason: FailureReason;
    redisEval: (script: string, keys: string[], args: string[]) => Promise<unknown>;
  }
): Promise<void> {
  await options.redisEval(
    "HSET",
    [options.jobKey],
    ["status", options.status, "failure_reason", options.reason]
  );
}

export function createCompensationError(
  message: string,
  instance = "/api/v1/ingestions/process"
): AppProblemError {
  return new AppProblemError("INTERNAL_SERVER_ERROR", { detail: message, instance });
}

export interface RefundOptions {
  readonly creditsKey: string;
  readonly jobKey: string;
  readonly refundAmount: number;
  readonly reason: FailureReason;
  readonly redisEval: (script: string, keys: string[], args: string[]) => Promise<unknown>;
}
