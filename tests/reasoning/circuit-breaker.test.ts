import { describe, expect, it } from "bun:test";
import {
  CircuitBreakerInterceptor,
  GeminiProvider,
  GroqProvider,
  type InferenceProvider,
} from "../../packages/reasoning/src/index.js";
import { AppProblemError } from "@repo/contracts";

describe("Milestone M5: Story S5.5 — Groq Fallback Circuit-Breaker on Gemini 429 (NFR-022, ADR-0004)", () => {
  const samplePrompt = "Explain attention mechanism with citations";

  it("yields tokens from primary Gemini provider when healthy", async () => {
    const mockGemini = new (class extends GeminiProvider {
      override async *streamText(): AsyncIterable<string> {
        yield "Gemini token 1 ";
        yield "Gemini token 2";
      }
    })();

    const breaker = new CircuitBreakerInterceptor({
      primaryProvider: mockGemini,
    });

    const tokens: string[] = [];
    for await (const token of breaker.streamText(samplePrompt)) {
      tokens.push(token);
    }

    expect(tokens.join("")).toBe("Gemini token 1 Gemini token 2");
    expect(breaker.isFallbackUsed()).toBe(false);
    expect(breaker.getActiveProvider()).toBe("gemini");
    expect(breaker.getFallbackHeaders()).toEqual({});
  });

  it("transparently fails over to Groq Llama-3.3-70B on Gemini HTTP 429 quota exhaustion", async () => {
    // Primary Gemini throws 429 quota exhaustion
    const mockGemini = new (class extends GeminiProvider {
      override async *streamText(): AsyncIterable<string> {
        const err = new Error("Google AI Studio quota exhausted: HTTP 429 RESOURCE_EXHAUSTED");
        (err as unknown as { status: number }).status = 429;
        throw err;
      }
    })();

    // Fallback Groq produces grounded tokens
    const mockGroq = new (class extends GroqProvider {
      override async *streamText(): AsyncIterable<string> {
        yield "Groq Llama-3.3 fallback token 1 ";
        yield "Groq fallback token 2";
      }
    })();

    const breaker = new CircuitBreakerInterceptor({
      primaryProvider: mockGemini,
      fallbackProvider: mockGroq,
    });

    const tokens: string[] = [];
    for await (const token of breaker.streamText(samplePrompt)) {
      tokens.push(token);
    }

    expect(tokens.join("")).toBe("Groq Llama-3.3 fallback token 1 Groq fallback token 2");
    expect(breaker.isFallbackUsed()).toBe(true);
    expect(breaker.getActiveProvider()).toBe("groq");
    expect(breaker.getFallbackHeaders()).toEqual({ "x-fallback-provider": "groq" });
  });

  it("halts immediately on AbortSignal without triggering fallback (FM-504)", async () => {
    let fallbackInvoked = false;

    const mockGemini = new (class extends GeminiProvider {
      override async *streamText(): AsyncIterable<string> {
        const err = new Error("AbortError: Operation aborted by client");
        err.name = "AbortError";
        throw err;
      }
    })();

    const mockGroq = new (class extends GroqProvider {
      override async *streamText(): AsyncIterable<string> {
        fallbackInvoked = true;
        yield "Should never run";
      }
    })();

    const controller = new AbortController();
    controller.abort();

    const breaker = new CircuitBreakerInterceptor({
      primaryProvider: mockGemini,
      fallbackProvider: mockGroq,
    });

    let caughtError: unknown = null;
    try {
      const stream = breaker.streamText(samplePrompt, { signal: controller.signal });
      await stream[Symbol.asyncIterator]().next();
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect((caughtError as Error).message).toContain("AbortError");
    expect(fallbackInvoked).toBe(false);
  });

  it("surfaces HTTP 502 UPSTREAM_PROVIDER_UNAVAILABLE with compensation if both providers fail", async () => {
    const mockGemini = new (class extends GeminiProvider {
      override async *streamText(): AsyncIterable<string> {
        const err = new Error("HTTP 429 RESOURCE_EXHAUSTED");
        (err as unknown as { status: number }).status = 429;
        throw err;
      }
    })();

    const mockGroq = new (class extends GroqProvider {
      override async *streamText(): AsyncIterable<string> {
        const err = new Error("Groq HTTP 429 Rate limit exceeded");
        (err as unknown as { status: number }).status = 429;
        throw err;
      }
    })();

    let refundUserId = "";
    let refundCost = 0;
    const mockRefund = async (userId: string, cost: number) => {
      refundUserId = userId;
      refundCost = cost;
    };

    const breaker = new CircuitBreakerInterceptor({
      primaryProvider: mockGemini,
      fallbackProvider: mockGroq,
      refundCompensationFn: mockRefund,
    });

    let caughtError: unknown = null;
    try {
      const stream = breaker.streamText(samplePrompt, { userId: "usr_dual_fail_1" });
      await stream[Symbol.asyncIterator]().next();
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(AppProblemError);
    const problem = caughtError as AppProblemError;
    expect(problem.key).toBe("UPSTREAM_PROVIDER_UNAVAILABLE");
    const doc = problem.toProblemDocument();
    expect(doc.status).toBe(502);
    expect(doc.detail).toContain("Both primary");

    // Verified automatic credit compensation
    expect(refundUserId).toBe("usr_dual_fail_1");
    expect(refundCost).toBe(0.5);
  });
});
