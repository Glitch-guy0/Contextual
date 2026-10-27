/**
 * Adaptive In-Process Circuit-Breaker Interceptor.
 * Transparent failover from Google Gemini Flash to Groq Llama-3.3-70B on HTTP 429 quota exhaustion.
 * Reference: architecture/05-m5-grounded-reasoning-engine.md §3.7, §7, NFR-022, ADR-0004, FM-501, FM-504.
 */

import {
  CREDIT_COST_LLM_ACTION,
  AppProblemError,
  type InferenceProviderType,
} from "@repo/contracts";
import { GeminiProvider, type InferenceProvider, type StreamProviderOptions } from "./providers/gemini.js";
import { GroqProvider } from "./providers/groq.js";

export interface CircuitBreakerConfig {
  readonly primaryProvider?: InferenceProvider;
  readonly fallbackProvider?: InferenceProvider;
  readonly primaryTimeoutMs?: number;
  readonly refundCompensationFn?: (userId: string, cost: number) => Promise<unknown>;
}

export interface CircuitBreakerStreamState {
  activeProvider: InferenceProviderType;
  fallbackUsed: boolean;
  failoverLatencyMs: number;
}

/**
 * Checks if an error is a recoverable quota exhaustion (HTTP 429) or transient provider failure.
 */
export function isQuotaOrTransientError(error: unknown): boolean {
  if (!error) return false;
  const err = error as { status?: number; message?: string; name?: string };

  if (err.name === "AbortError" || err.message?.includes("AbortError")) {
    return false; // Do not failover on client abort (FM-504)
  }

  if (err.status === 429 || err.status === 503 || err.status === 504) {
    return true;
  }

  const msg = (err.message ?? "").toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("resource_exhausted") ||
    msg.includes("rate_limit_exceeded") ||
    msg.includes("quota exhausted") ||
    msg.includes("timeout") ||
    msg.includes("ttft timeout")
  );
}

export class CircuitBreakerInterceptor implements InferenceProvider {
  readonly name: InferenceProviderType = "gemini";
  private primary: InferenceProvider;
  private fallback: InferenceProvider;
  private primaryTimeoutMs: number;
  private refundCompensationFn?: (userId: string, cost: number) => Promise<unknown>;

  private state: CircuitBreakerStreamState = {
    activeProvider: "gemini",
    fallbackUsed: false,
    failoverLatencyMs: 0,
  };

  constructor(config: CircuitBreakerConfig = {}) {
    this.primary = config.primaryProvider ?? new GeminiProvider();
    this.fallback = config.fallbackProvider ?? new GroqProvider();
    this.primaryTimeoutMs = config.primaryTimeoutMs ?? 3000;
    this.refundCompensationFn = config.refundCompensationFn;
  }

  getState(): Readonly<CircuitBreakerStreamState> {
    return { ...this.state };
  }

  isFallbackUsed(): boolean {
    return this.state.fallbackUsed;
  }

  getActiveProvider(): InferenceProviderType {
    return this.state.activeProvider;
  }

  getFallbackHeaders(): Record<string, string> {
    if (this.state.fallbackUsed) {
      return { "x-fallback-provider": "groq" };
    }
    return {};
  }

  async *streamText(
    prompt: string,
    options: StreamProviderOptions & { userId?: string } = {},
  ): AsyncIterable<string> {
    this.state = {
      activeProvider: "gemini",
      fallbackUsed: false,
      failoverLatencyMs: 0,
    };

    if (options.signal?.aborted) {
      throw new Error("AbortError: Operation aborted by client");
    }

    let primaryFailed = false;
    let primaryError: unknown = null;
    let firstTokenReceived = false;
    const failoverStart = Date.now();

    // 1. Attempt Primary Provider (Google Gemini Flash)
    try {
      const primaryStream = this.primary.streamText(prompt, options);
      for await (const token of primaryStream) {
        firstTokenReceived = true;
        yield token;
      }
      return;
    } catch (err) {
      // If client aborted mid-stream, immediately abort without falling over (FM-504)
      if (options.signal?.aborted || (err as Error)?.message?.includes("AbortError")) {
        throw err;
      }

      // If tokens have already been streamed to the user, we cannot seamlessly restart
      if (firstTokenReceived) {
        throw err;
      }

      // Check if error qualifies for circuit-breaker failover
      if (isQuotaOrTransientError(err)) {
        primaryFailed = true;
        primaryError = err;
      } else {
        throw err;
      }
    }

    // 2. Failover to Groq Llama-3.3-70B on Gemini 429
    if (primaryFailed) {
      const failoverLatencyMs = Date.now() - failoverStart;
      this.state.fallbackUsed = true;
      this.state.activeProvider = "groq";
      this.state.failoverLatencyMs = failoverLatencyMs;

      // Structured WARN log on circuit-breaker trip
      const warnPayload = JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "WARN",
        service: "reasoning",
        event: "circuit_breaker_tripped",
        payload: {
          primary_error: (primaryError as Error)?.message ?? String(primaryError),
          fallback_provider: "groq",
          failover_latency_ms: failoverLatencyMs,
        },
      });
      if (process.env.NODE_ENV !== "test") {
        process.stdout.write(`${warnPayload}\n`);
      }

      try {
        const fallbackStream = this.fallback.streamText(prompt, options);
        for await (const token of fallbackStream) {
          yield token;
        }
        return;
      } catch (fallbackErr) {
        // Both primary and fallback failed!
        const errPayload = JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "ERROR",
          service: "reasoning",
          event: "all_inference_providers_failed",
          payload: {
            primary_error: (primaryError as Error)?.message,
            fallback_error: (fallbackErr as Error)?.message,
          },
        });
        if (process.env.NODE_ENV !== "test") {
          process.stdout.write(`${errPayload}\n`);
        }

        // Automatic credit compensation if userId is known
        if (options.userId && this.refundCompensationFn) {
          try {
            await this.refundCompensationFn(options.userId, CREDIT_COST_LLM_ACTION);
          } catch {
            // Log but preserve upstream error
          }
        }

        throw new AppProblemError("UPSTREAM_PROVIDER_UNAVAILABLE", {
          detail: "Both primary (Google Gemini) and fallback (Groq Llama-3.3) inference providers failed or exhausted quotas.",
          instance: "/api/v1/chat",
        });
      }
    }
  }
}
