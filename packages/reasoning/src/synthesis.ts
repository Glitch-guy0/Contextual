/**
 * Phase 6: Grounded LLM Synthesis & Streaming.
 * Enforces zero-hallucination constraint, emits citation anchors [1], [2],
 * and handles atomic 0.5 credit metering debit.
 * Reference: architecture/05-m5-grounded-reasoning-engine.md §3.6, §3.8, BR-009, BR-014, BR-015, AC-5.3.
 */

import {
  CREDIT_COST_LLM_ACTION,
  AppProblemError,
  type StreamReasoningChunk,
  type ChatSynthesisResult,
  type CitationAnchor,
  type UnavailableSourceInfo,
  type InferenceProviderType,
} from "@repo/contracts";
import type { AssembledContextResult } from "./assembly.js";
import { GeminiProvider, type InferenceProvider, type StreamProviderOptions } from "./providers/gemini.js";

export const INSUFFICIENT_CONTEXT_MESSAGE =
  "Insufficient context available in your notes to answer this question.";

export interface MeteringDebitFn {
  (userId: string, cost: number): Promise<{ success: boolean; remaining: number }>;
}

export interface SynthesisOptions {
  readonly userId: string;
  readonly notebookId: string;
  readonly provider?: InferenceProvider;
  readonly providerOptions?: StreamProviderOptions;
  readonly meteringDebitFn?: MeteringDebitFn;
  readonly unavailableSources?: readonly UnavailableSourceInfo[];
}

/**
 * Executes Phase 6 Grounded Synthesis Streaming.
 * Yields Server-Sent Event (SSE) StreamReasoningChunks and returns the final aggregate ChatSynthesisResult.
 */
export async function* streamGroundedSynthesis(
  assembledContext: AssembledContextResult,
  options: SynthesisOptions,
): AsyncGenerator<StreamReasoningChunk, ChatSynthesisResult, void> {
  const startTime = Date.now();
  const provider = options.provider ?? new GeminiProvider();

  // 1. Metering Guard: Debit 0.5 credits atomically before downstream provider execution (BR-014, BR-015)
  if (options.meteringDebitFn) {
    const debitRes = await options.meteringDebitFn(options.userId, CREDIT_COST_LLM_ACTION);
    if (!debitRes.success) {
      // Structured WARN log on 402 Insufficient Credits short-circuit
      const warnPayload = JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "WARN",
        service: "reasoning",
        event: "insufficient_credits_short_circuit",
        payload: {
          userId: options.userId,
          requiredCost: CREDIT_COST_LLM_ACTION,
          remaining: debitRes.remaining,
        },
      });
      if (process.env.NODE_ENV !== "test") {
        process.stdout.write(`${warnPayload}\n`);
      }

      throw new AppProblemError("INSUFFICIENT_CREDITS", {
        detail: `Action requires ${CREDIT_COST_LLM_ACTION} credits, but account has ${debitRes.remaining} credits remaining.`,
        instance: "/api/v1/chat",
      });
    }
  }

  // 2. Empty Context Guard: If zero relevant chunks retrieved, output deterministic notice (BR-009)
  if (assembledContext.uniqueChunks.length === 0) {
    yield {
      event: "citations",
      data: { citations: [] },
    };

    yield {
      event: "token",
      data: { token: INSUFFICIENT_CONTEXT_MESSAGE },
    };

    if (assembledContext.unavailableFooter) {
      yield {
        event: "token",
        data: { token: assembledContext.unavailableFooter },
      };
    }

    const durationMs = Date.now() - startTime;
    yield {
      event: "done",
      data: {
        provider: provider.name,
        duration_ms: durationMs,
      },
    };

    return {
      text: assembledContext.unavailableFooter
        ? `${INSUFFICIENT_CONTEXT_MESSAGE}${assembledContext.unavailableFooter}`
        : INSUFFICIENT_CONTEXT_MESSAGE,
      citations: [],
      sub_questions: [],
      unavailable_sources: options.unavailableSources ?? [],
      provider_used: provider.name,
      duration_ms: durationMs,
    };
  }

  // 3. Emit phase_start and citations manifest for instant client-side rendering
  yield {
    event: "phase_start",
    data: { phase: "synthesis" },
  };

  yield {
    event: "citations",
    data: { citations: assembledContext.citations },
  };

  if (options.unavailableSources && options.unavailableSources.length > 0) {
    yield {
      event: "unavailable_sources",
      data: { unavailable_sources: options.unavailableSources },
    };
  }

  // 4. Stream tokens from inference provider
  let aggregatedText = "";
  let tokenCount = 0;

  for await (const token of provider.streamText(
    assembledContext.formattedPromptEnvelope,
    options.providerOptions,
  )) {
    tokenCount++;
    aggregatedText += token;
    yield {
      event: "token",
      data: { token },
    };
  }

  // 5. Append FR-039 unavailable sources footer if present
  if (assembledContext.unavailableFooter) {
    aggregatedText += assembledContext.unavailableFooter;
    yield {
      event: "token",
      data: { token: assembledContext.unavailableFooter },
    };
  }

  const durationMs = Date.now() - startTime;

  // 6. Emit completion event
  yield {
    event: "done",
    data: {
      provider: provider.name,
      duration_ms: durationMs,
    },
  };

  // Structured INFO log on synthesis completion
  const infoPayload = JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "INFO",
    service: "reasoning",
    event: "grounded_synthesis_stream_completed",
    payload: {
      userId: options.userId,
      provider: provider.name,
      tokensCount: tokenCount,
      citationsCount: assembledContext.citations.length,
      duration_ms: durationMs,
    },
  });
  if (process.env.NODE_ENV !== "test") {
    process.stdout.write(`${infoPayload}\n`);
  }

  return {
    text: aggregatedText,
    citations: assembledContext.citations,
    sub_questions: [],
    unavailable_sources: options.unavailableSources ?? [],
    provider_used: provider.name,
    duration_ms: durationMs,
  };
}

/**
 * Non-streaming convenience wrapper that consumes streamGroundedSynthesis to completion.
 */
export async function synthesizeGroundedResponse(
  assembledContext: AssembledContextResult,
  options: SynthesisOptions,
): Promise<ChatSynthesisResult> {
  const iterator = streamGroundedSynthesis(assembledContext, options);
  while (true) {
    const next = await iterator.next();
    if (next.done) {
      return next.value;
    }
  }
}
