import {
  AppProblemError,
  serializeProblemDetails,
  type ProblemDocument,
} from "@repo/contracts/errors";
import {
  CREDIT_COST_LLM_ACTION,
  type MeteredAction,
  type RateLimitResult,
} from "@repo/contracts/metering";
import { CreditLedgerService } from "./credit-ledger";
import { RateLimiterService } from "./rate-limiter";

export interface MeteringGuardConfig {
  rateLimiter?: RateLimiterService;
  creditLedger?: CreditLedgerService;
}

export interface GuardRequestParams {
  userId: string;
  cost?: number;
  action?: MeteredAction | string;
  instance: string;
  correlationId?: string;
  nowMs?: number;
}

export interface GuardDecisionAllowed {
  allowed: true;
  decision: "ADMITTED";
  remainingCredits: number;
  debited: number;
  rateLimit: RateLimitResult;
}

export interface GuardDecisionRejected {
  allowed: false;
  decision: "RATE_LIMITED" | "INSUFFICIENT_CREDITS";
  status: 429 | 402;
  problem: ProblemDocument;
  rateLimit?: RateLimitResult;
  retryAfterSeconds?: number;
}

export type GuardDecision = GuardDecisionAllowed | GuardDecisionRejected;

export type DownstreamHandler<T> = (ctx: {
  userId: string;
  remainingCredits: number;
  rateLimitRemaining: number;
}) => Promise<T> | T;

export class MeteringGuard {
  private rateLimiter: RateLimiterService;
  private creditLedger: CreditLedgerService;

  constructor(config: MeteringGuardConfig = {}) {
    this.rateLimiter = config.rateLimiter ?? new RateLimiterService();
    this.creditLedger = config.creditLedger ?? new CreditLedgerService();
  }

  /**
   * Pre-flight evaluates whether a user request can proceed.
   * If rate-limited or lacking sufficient balance, returns rejection without debiting.
   * If valid, atomicity debits credits and returns admission.
   */
  async evaluate(params: GuardRequestParams): Promise<GuardDecision> {
    const {
      userId,
      cost = CREDIT_COST_LLM_ACTION,
      action = "llm_action",
      instance,
      correlationId,
      nowMs = Date.now(),
    } = params;

    // 1. Sliding window rate limit check
    const rateLimit = await this.rateLimiter.checkRateLimit(userId, nowMs);
    if (!rateLimit.allowed) {
      const problem = serializeProblemDetails("RATE_LIMIT_EXCEEDED", {
        detail: `Rate limit of ${rateLimit.limit} requests per second exceeded. Please retry after ${rateLimit.retryAfterSeconds}s.`,
        instance,
        correlation_id: correlationId,
        customExtensions: {
          retry_after: rateLimit.retryAfterSeconds,
          limit: rateLimit.limit,
        },
      });

      return {
        allowed: false,
        decision: "RATE_LIMITED",
        status: 429,
        problem,
        rateLimit,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      };
    }

    // 2. Atomic credit balance debit check
    const debitResult = await this.creditLedger.debitCredits(userId, cost, action);
    if (!debitResult.success) {
      const problem = serializeProblemDetails("INSUFFICIENT_CREDITS", {
        detail: `Insufficient credit balance for action '${action}'. Required: ${cost}, available: ${debitResult.remaining}.`,
        instance,
        correlation_id: correlationId,
        customExtensions: {
          credits_required: cost,
          credits_remaining: debitResult.remaining,
        },
      });

      return {
        allowed: false,
        decision: "INSUFFICIENT_CREDITS",
        status: 402,
        problem,
        rateLimit,
      };
    }

    return {
      allowed: true,
      decision: "ADMITTED",
      remainingCredits: debitResult.remaining,
      debited: debitResult.debited,
      rateLimit,
    };
  }

  /**
   * High-level guard wrapper executing a downstream handler only if admitted.
   * Short-circuits immediately with AppProblemError if rejected.
   */
  async executeGuarded<T>(
    params: GuardRequestParams,
    handler: DownstreamHandler<T>
  ): Promise<{ result: T; decision: GuardDecisionAllowed }> {
    const decision = await this.evaluate(params);

    if (!decision.allowed) {
      const errorKey = decision.decision === "RATE_LIMITED" ? "RATE_LIMIT_EXCEEDED" : "INSUFFICIENT_CREDITS";
      throw new AppProblemError(errorKey, {
        detail: decision.problem.detail,
        instance: decision.problem.instance,
        correlation_id: decision.problem.correlation_id,
        customExtensions: {
          status: decision.status,
          ...(decision.retryAfterSeconds ? { retry_after: decision.retryAfterSeconds } : {}),
        },
      });
    }

    const result = await handler({
      userId: params.userId,
      remainingCredits: decision.remainingCredits,
      rateLimitRemaining: decision.rateLimit.remaining,
    });

    return {
      result,
      decision,
    };
  }
}
