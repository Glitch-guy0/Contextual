/**
 * Internal and adapter types for @repo/reasoning.
 * Reference: architecture/05-m5-grounded-reasoning-engine.md §3, FR-008..FR-011.
 */

import type {
  SubQuestion,
  HydePassage,
  ReasoningPhase,
  InferenceProviderType,
  RetrievedContextChunk,
  CitationAnchor,
  UnavailableSourceInfo,
  ChatSynthesisRequest,
  ChatSynthesisResult,
  StreamReasoningChunk,
  StreamReasoningEventType,
} from "@repo/contracts";

export type {
  SubQuestion,
  HydePassage,
  ReasoningPhase,
  InferenceProviderType,
  RetrievedContextChunk,
  CitationAnchor,
  UnavailableSourceInfo,
  ChatSynthesisRequest,
  ChatSynthesisResult,
  StreamReasoningChunk,
  StreamReasoningEventType,
};

/** Pluggable LLM caller signature for decomposition and HyDE probes. */
export type LlmCompletionFn = (prompt: string, systemPrompt?: string) => Promise<string>;

export interface DecompositionOptions {
  readonly minSubQuestions?: number;
  readonly maxSubQuestions?: number;
  readonly llmCompletion?: LlmCompletionFn;
}

export interface DecompositionResult {
  readonly sub_questions: readonly SubQuestion[];
  readonly elapsed_ms: number;
  readonly fallback_used: boolean;
}

export interface HydeOptions {
  readonly targetWordCount?: number;
  readonly llmCompletion?: LlmCompletionFn;
}

export interface HydeResult {
  readonly passages: readonly HydePassage[];
  readonly elapsed_ms: number;
  readonly fallback_used: boolean;
}
