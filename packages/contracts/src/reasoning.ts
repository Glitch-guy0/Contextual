/**
 * M5 6-Phase Grounded Reasoning Engine — Shared Contract Types.
 * Reference: conventions.md §1, architecture/05-m5-grounded-reasoning-engine.md §3.1,
 * FR-008..FR-011, FR-039, BR-002, BR-007..BR-009, BR-027, NFR-001..NFR-003, NFR-022.
 */

import type { CardSourceType } from "./workspace.js";

/** Active phase of the 6-phase reasoning pipeline. */
export type ReasoningPhase =
  | "decomposition"
  | "hyde"
  | "embedding"
  | "retrieval"
  | "assembly"
  | "synthesis";

export const REASONING_PHASES: readonly ReasoningPhase[] = [
  "decomposition",
  "hyde",
  "embedding",
  "retrieval",
  "assembly",
  "synthesis",
] as const;

export function isReasoningPhase(value: string): value is ReasoningPhase {
  return (REASONING_PHASES as readonly string[]).includes(value);
}

/** Supported inference providers with circuit-breaker failover (ADR-0004). */
export type InferenceProviderType = "gemini" | "groq";

export const INFERENCE_PROVIDER_TYPES: readonly InferenceProviderType[] = [
  "gemini",
  "groq",
] as const;

export function isInferenceProviderType(value: string): value is InferenceProviderType {
  return (INFERENCE_PROVIDER_TYPES as readonly string[]).includes(value);
}

/** Decomposed sub-question produced in Phase 1 (FR-008, BR-007). */
export interface SubQuestion {
  readonly id: string;
  readonly query: string;
  readonly hyde_passage?: string;
}

/** Synthetic hypothetical passage generated in Phase 2 (FR-009). */
export interface HydePassage {
  readonly sub_question_id: string;
  readonly passage: string;
}

/** Individual chunk retrieved from Upstash Vector in Phase 3 & 4 (FR-010, BR-008). */
export interface RetrievedContextChunk {
  readonly chunk_id: string;
  readonly document_id: string;
  readonly document_title: string;
  readonly text: string;
  readonly score: number;
  readonly source_type: CardSourceType | null;
  readonly page_or_timestamp?: string | number | null;
  readonly chunk_index?: number | null;
}

/** Clickable inline citation anchor linking to source document chunk preview (FR-011, AC-5.3). */
export interface CitationAnchor {
  readonly index: number;
  readonly chunk_id: string;
  readonly document_id: string;
  readonly document_title: string;
  readonly source_type: CardSourceType | null;
  readonly snippet: string;
}

/** Information about pending, processing, or failed sources in the notebook scope (FR-039). */
export interface UnavailableSourceInfo {
  readonly document_id: string;
  readonly title: string;
  readonly status: "queued" | "processing" | "failed";
}

/** Ingress payload for grounded chat synthesis (/api/v1/chat). */
export interface ChatSynthesisRequest {
  readonly prompt: string;
  readonly notebook_id: string;
  readonly scope_node_ids?: readonly string[];
}

/** Streaming SSE event type emitted during synthesis. */
export type StreamReasoningEventType =
  | "phase_start"
  | "sub_questions"
  | "citations"
  | "token"
  | "unavailable_sources"
  | "done"
  | "error";

export const STREAM_REASONING_EVENT_TYPES: readonly StreamReasoningEventType[] = [
  "phase_start",
  "sub_questions",
  "citations",
  "token",
  "unavailable_sources",
  "done",
  "error",
] as const;

export function isStreamReasoningEventType(value: string): value is StreamReasoningEventType {
  return (STREAM_REASONING_EVENT_TYPES as readonly string[]).includes(value);
}

/** Server-Sent Event payload emitted to the client during reasoning stream. */
export interface StreamReasoningChunk {
  readonly event: StreamReasoningEventType;
  readonly data: {
    readonly phase?: ReasoningPhase;
    readonly sub_questions?: readonly SubQuestion[];
    readonly citations?: readonly CitationAnchor[];
    readonly token?: string;
    readonly unavailable_sources?: readonly UnavailableSourceInfo[];
    readonly provider?: InferenceProviderType;
    readonly duration_ms?: number;
    readonly error?: string;
  };
}

/** Final aggregate result of non-streaming or completed synthesis. */
export interface ChatSynthesisResult {
  readonly text: string;
  readonly citations: readonly CitationAnchor[];
  readonly sub_questions: readonly SubQuestion[];
  readonly unavailable_sources: readonly UnavailableSourceInfo[];
  readonly provider_used: InferenceProviderType;
  readonly duration_ms: number;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ValidationSuccess<T> {
  readonly success: true;
  readonly data: T;
}

export interface ValidationFailure {
  readonly success: false;
  readonly errors: readonly string[];
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Validates inbound ChatSynthesisRequest according to S5.1 and FR-008..FR-011 specifications:
 * - prompt: string, minLength: 3, maxLength: 2000
 * - notebook_id: string, valid UUID format
 * - scope_node_ids: optional array of valid UUID strings
 */
export function validateChatSynthesisRequest(input: unknown): ValidationResult<ChatSynthesisRequest> {
  const errors: string[] = [];

  if (!input || typeof input !== "object") {
    return { success: false, errors: ["Request body must be a non-null object"] };
  }

  const candidate = input as Record<string, unknown>;

  // Validate prompt
  if (typeof candidate.prompt !== "string") {
    errors.push("Field 'prompt' is required and must be a string");
  } else {
    const trimmed = candidate.prompt.trim();
    if (trimmed.length < 3) {
      errors.push("Field 'prompt' must have at least 3 characters");
    }
    if (trimmed.length > 2000) {
      errors.push("Field 'prompt' must not exceed 2000 characters");
    }
  }

  // Validate notebook_id
  if (typeof candidate.notebook_id !== "string") {
    errors.push("Field 'notebook_id' is required and must be a string");
  } else if (!UUID_REGEX.test(candidate.notebook_id.trim())) {
    errors.push("Field 'notebook_id' must be a valid UUID");
  }

  // Validate scope_node_ids if present
  if (candidate.scope_node_ids !== undefined && candidate.scope_node_ids !== null) {
    if (!Array.isArray(candidate.scope_node_ids)) {
      errors.push("Field 'scope_node_ids' must be an array of UUIDs if provided");
    } else {
      for (let i = 0; i < candidate.scope_node_ids.length; i++) {
        const item = candidate.scope_node_ids[i];
        if (typeof item !== "string" || !UUID_REGEX.test(item.trim())) {
          errors.push(`Element at scope_node_ids[${i}] must be a valid UUID string`);
        }
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      prompt: (candidate.prompt as string).trim(),
      notebook_id: (candidate.notebook_id as string).trim(),
      ...(candidate.scope_node_ids !== undefined && candidate.scope_node_ids !== null
        ? { scope_node_ids: (candidate.scope_node_ids as string[]).map((id) => id.trim()) }
        : {}),
    },
  };
}

/**
 * Asserts that input is a valid ChatSynthesisRequest, throwing an Error if invalid.
 */
export function assertChatSynthesisRequest(input: unknown): ChatSynthesisRequest {
  const res = validateChatSynthesisRequest(input);
  if (!res.success) {
    throw new Error(`Invalid ChatSynthesisRequest: ${res.errors.join("; ")}`);
  }
  return res.data;
}
