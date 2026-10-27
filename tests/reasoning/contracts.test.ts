import { describe, expect, it } from "bun:test";
import {
  REASONING_PHASES,
  isReasoningPhase,
  INFERENCE_PROVIDER_TYPES,
  isInferenceProviderType,
  STREAM_REASONING_EVENT_TYPES,
  isStreamReasoningEventType,
  validateChatSynthesisRequest,
  assertChatSynthesisRequest,
  ERROR_CATALOGUE,
  type ReasoningPhase,
  type InferenceProviderType,
  type StreamReasoningEventType,
  type ChatSynthesisRequest,
  type ChatSynthesisResult,
  type SubQuestion,
  type HydePassage,
  type RetrievedContextChunk,
  type CitationAnchor,
  type UnavailableSourceInfo,
  type StreamReasoningChunk,
} from "@repo/contracts";

describe("Milestone M5: Story S5.1 — Reasoning Contracts & Validation", () => {
  describe("Type Constants and Type Guards", () => {
    it("exports all 6 reasoning phases matching the 6-phase engine design", () => {
      expect(REASONING_PHASES).toEqual([
        "decomposition",
        "hyde",
        "embedding",
        "retrieval",
        "assembly",
        "synthesis",
      ]);
      expect(REASONING_PHASES.length).toBe(6);
      expect(isReasoningPhase("decomposition")).toBe(true);
      expect(isReasoningPhase("hyde")).toBe(true);
      expect(isReasoningPhase("embedding")).toBe(true);
      expect(isReasoningPhase("retrieval")).toBe(true);
      expect(isReasoningPhase("assembly")).toBe(true);
      expect(isReasoningPhase("synthesis")).toBe(true);
      expect(isReasoningPhase("invalid_phase")).toBe(false);
    });

    it("exports dual inference provider types (Gemini primary, Groq fallback)", () => {
      expect(INFERENCE_PROVIDER_TYPES).toEqual(["gemini", "groq"]);
      expect(isInferenceProviderType("gemini")).toBe(true);
      expect(isInferenceProviderType("groq")).toBe(true);
      expect(isInferenceProviderType("openai")).toBe(false);
    });

    it("exports all 7 stream reasoning event types", () => {
      expect(STREAM_REASONING_EVENT_TYPES).toEqual([
        "phase_start",
        "sub_questions",
        "citations",
        "token",
        "unavailable_sources",
        "done",
        "error",
      ]);
      expect(isStreamReasoningEventType("phase_start")).toBe(true);
      expect(isStreamReasoningEventType("sub_questions")).toBe(true);
      expect(isStreamReasoningEventType("citations")).toBe(true);
      expect(isStreamReasoningEventType("token")).toBe(true);
      expect(isStreamReasoningEventType("unavailable_sources")).toBe(true);
      expect(isStreamReasoningEventType("done")).toBe(true);
      expect(isStreamReasoningEventType("error")).toBe(true);
      expect(isStreamReasoningEventType("unknown")).toBe(false);
    });
  });

  describe("ChatSynthesisRequest Validation", () => {
    const validNotebookId = "11111111-2222-4333-8444-555555555555";
    const validNodeId1 = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const validNodeId2 = "ffffffff-0000-4111-8222-333333333333";

    it("validates a standard compliant request", () => {
      const input = {
        prompt: "What are the core differences between multi-head attention and recurrence?",
        notebook_id: validNotebookId,
        scope_node_ids: [validNodeId1, validNodeId2],
      };

      const result = validateChatSynthesisRequest(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.prompt).toBe(input.prompt);
        expect(result.data.notebook_id).toBe(validNotebookId);
        expect(result.data.scope_node_ids).toEqual([validNodeId1, validNodeId2]);
      }
    });

    it("validates a request without scope_node_ids", () => {
      const input = {
        prompt: "Explain the HyDE passage generation technique.",
        notebook_id: validNotebookId,
      };

      const result = validateChatSynthesisRequest(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.prompt).toBe(input.prompt);
        expect(result.data.notebook_id).toBe(validNotebookId);
        expect(result.data.scope_node_ids).toBeUndefined();
      }
    });

    it("rejects prompt shorter than 3 characters", () => {
      const input = {
        prompt: "hi",
        notebook_id: validNotebookId,
      };

      const result = validateChatSynthesisRequest(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.includes("at least 3 characters"))).toBe(true);
      }
    });

    it("rejects prompt exceeding 2000 characters", () => {
      const longPrompt = "a".repeat(2001);
      const input = {
        prompt: longPrompt,
        notebook_id: validNotebookId,
      };

      const result = validateChatSynthesisRequest(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.includes("must not exceed 2000 characters"))).toBe(true);
      }
    });

    it("rejects malformed or non-UUID notebook_id", () => {
      const input = {
        prompt: "Valid prompt question?",
        notebook_id: "not-a-uuid",
      };

      const result = validateChatSynthesisRequest(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.includes("valid UUID"))).toBe(true);
      }
    });

    it("rejects malformed scope_node_ids", () => {
      const input = {
        prompt: "Valid prompt question?",
        notebook_id: validNotebookId,
        scope_node_ids: ["invalid-uuid"],
      };

      const result = validateChatSynthesisRequest(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.includes("scope_node_ids[0]"))).toBe(true);
      }
    });

    it("assertChatSynthesisRequest succeeds on valid input and throws on invalid", () => {
      const valid = {
        prompt: "How does the circuit breaker handle 429 quota exhaustion?",
        notebook_id: validNotebookId,
      };
      const parsed = assertChatSynthesisRequest(valid);
      expect(parsed.prompt).toBe(valid.prompt);

      expect(() => {
        assertChatSynthesisRequest({ prompt: "x", notebook_id: "bad" });
      }).toThrow(/Invalid ChatSynthesisRequest/);
    });
  });

  describe("Invariance of Closed 17-Member RFC 9457 Error Catalogue", () => {
    it("ensures error catalogue has strictly 17 members with zero modifications", () => {
      const catalogKeys = Object.keys(ERROR_CATALOGUE);
      expect(catalogKeys.length).toBe(17);
      expect(catalogKeys).toEqual([
        "AUTHENTICATION_REQUIRED",
        "FORBIDDEN_TENANT_ACCESS",
        "INSUFFICIENT_CREDITS",
        "SERVICE_LIMIT_REACHED",
        "RATE_LIMIT_EXCEEDED",
        "UPLOAD_SIZE_EXCEEDED",
        "UNSUPPORTED_MEDIA_TYPE",
        "DOCUMENT_PARSING_FAILED",
        "PASSWORD_PROTECTED_PDF",
        "NO_TEXT_LAYER_PDF",
        "PROGRESS_STREAM_UNAVAILABLE",
        "PROGRESS_STREAM_TIMEOUT",
        "NOTEBOOK_EXPIRED",
        "NOTEBOOK_NOT_FOUND",
        "INVALID_NODE_RELATION",
        "UPSTREAM_PROVIDER_UNAVAILABLE",
        "INTERNAL_SERVER_ERROR",
      ]);
    });
  });
});
