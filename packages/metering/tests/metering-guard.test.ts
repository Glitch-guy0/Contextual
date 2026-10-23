import { describe, expect, mock, test } from "bun:test";
import { AppProblemError } from "@repo/contracts/errors";
import { CreditLedgerService } from "../src/credit-ledger";
import { MeteringGuard } from "../src/metering-guard";
import { RateLimiterService } from "../src/rate-limiter";

describe("Story S2.3: Insufficient Credits Ingress Guard & HTTP 402 Short-Circuit", () => {
  test("TC-2.3.1: Request with balance < cost returns HTTP 402 INSUFFICIENT_CREDITS", async () => {
    const ledger = new CreditLedgerService();
    const rateLimiter = new RateLimiterService();
    const guard = new MeteringGuard({ creditLedger: ledger, rateLimiter });

    const userId = "usr_guard_01";
    // Set balance to 0.2
    await ledger.setBalance(userId, 0.2);

    const decision = await guard.evaluate({
      userId,
      cost: 0.5,
      action: "llm_action",
      instance: "/api/v1/chat",
      correlationId: "req_test_01",
    });

    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.decision).toBe("INSUFFICIENT_CREDITS");
      expect(decision.status).toBe(402);
      expect(decision.problem.type).toBe("https://contextual.ai/errors/insufficient-credits");
      expect(decision.problem.title).toBe("Insufficient Credits");
      expect(decision.problem.status).toBe(402);
      expect(decision.problem.code).toBe("INSUFFICIENT_CREDITS");
      expect(decision.problem.instance).toBe("/api/v1/chat");
      expect(decision.problem.correlation_id).toBe("req_test_01");
    }

    // Verify balance was untouched
    const balance = await ledger.getBalance(userId);
    expect(balance).toBe(0.2);
  });

  test("TC-2.3.2: Short-circuit executes without calling downstream handler (BR-015)", async () => {
    const ledger = new CreditLedgerService();
    const rateLimiter = new RateLimiterService();
    const guard = new MeteringGuard({ creditLedger: ledger, rateLimiter });

    const userId = "usr_guard_02";
    await ledger.setBalance(userId, 0.2); // Not enough for cost 0.5

    const mockDownstreamHandler = mock(() => {
      return { answer: "LLM generated response" };
    });

    let thrownError: AppProblemError | null = null;
    try {
      await guard.executeGuarded(
        {
          userId,
          cost: 0.5,
          instance: "/api/v1/chat",
          correlationId: "req_test_02",
        },
        mockDownstreamHandler
      );
    } catch (err) {
      if (err instanceof AppProblemError) {
        thrownError = err;
      }
    }

    // Assert downstream handler was called strictly 0 times (BR-015)
    expect(mockDownstreamHandler).toHaveBeenCalledTimes(0);
    expect(thrownError).not.toBeNull();
    expect(thrownError?.key).toBe("INSUFFICIENT_CREDITS");
    expect(thrownError?.instance).toBe("/api/v1/chat");
    const problem = thrownError?.toProblemDocument();
    expect(problem?.status).toBe(402);
    expect(problem?.type).toBe("https://contextual.ai/errors/insufficient-credits");
  });

  test("Rate limit exceeded short-circuits with HTTP 429 and calls downstream 0 times", async () => {
    const ledger = new CreditLedgerService();
    const rateLimiter = new RateLimiterService();
    const guard = new MeteringGuard({ creditLedger: ledger, rateLimiter });

    const userId = "usr_guard_03";
    await ledger.setBalance(userId, 10.0);
    const baseTime = 1700000000000;

    // Fire 5 requests
    for (let i = 0; i < 5; i++) {
      const res = await guard.evaluate({
        userId,
        cost: 0.5,
        instance: "/api/v1/chat",
        nowMs: baseTime + i * 10,
      });
      expect(res.allowed).toBe(true);
    }

    const mockDownstreamHandler = mock(() => "should not be called");

    // 6th request is throttled
    let thrownError: AppProblemError | null = null;
    try {
      await guard.executeGuarded(
        {
          userId,
          cost: 0.5,
          instance: "/api/v1/chat",
          nowMs: baseTime + 200,
        },
        mockDownstreamHandler
      );
    } catch (err) {
      if (err instanceof AppProblemError) {
        thrownError = err;
      }
    }

    expect(mockDownstreamHandler).toHaveBeenCalledTimes(0);
    expect(thrownError).not.toBeNull();
    expect(thrownError?.key).toBe("RATE_LIMIT_EXCEEDED");
    const problem = thrownError?.toProblemDocument();
    expect(problem?.status).toBe(429);
    expect(problem?.type).toBe("https://contextual.ai/errors/rate-limit-exceeded");
  });

  test("Successful request debits credits and calls downstream handler once", async () => {
    const ledger = new CreditLedgerService();
    const rateLimiter = new RateLimiterService();
    const guard = new MeteringGuard({ creditLedger: ledger, rateLimiter });

    const userId = "usr_guard_04";
    await ledger.setBalance(userId, 10.0);

    const mockDownstreamHandler = mock((ctx: { remainingCredits: number }) => {
      return { generated: true, balanceRemaining: ctx.remainingCredits };
    });

    const execution = await guard.executeGuarded(
      {
        userId,
        cost: 1.0,
        action: "doc_process",
        instance: "/api/v1/ingestions",
      },
      mockDownstreamHandler
    );

    expect(mockDownstreamHandler).toHaveBeenCalledTimes(1);
    expect(execution.result.generated).toBe(true);
    expect(execution.result.balanceRemaining).toBe(9.0);
    expect(execution.decision.remainingCredits).toBe(9.0);
    expect(execution.decision.debited).toBe(1.0);
  });
});
