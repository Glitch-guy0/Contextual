import { describe, expect, it } from "bun:test";
import {
  deduplicateChunks,
  buildCitationManifest,
  formatUnavailableSourcesFooter,
  formatContextBlock,
  buildGroundedPromptEnvelope,
  assembleGroundedContext,
} from "../../packages/reasoning/src/index.js";
import type { RetrievedContextChunk, UnavailableSourceInfo } from "@repo/contracts";

describe("Milestone M5: Story S5.3 — Context Assembly, Deduplication & Citations (Phase 5)", () => {
  const chunkA1: RetrievedContextChunk = {
    chunk_id: "chunk_A",
    document_id: "doc_1",
    document_title: "Attention Is All You Need",
    text: "The Transformer is the first transduction model relying entirely on self-attention.",
    score: 0.82,
    source_type: "pdf",
  };

  const chunkA2: RetrievedContextChunk = {
    chunk_id: "chunk_A",
    document_id: "doc_1",
    document_title: "Attention Is All You Need",
    text: "The Transformer is the first transduction model relying entirely on self-attention.",
    score: 0.94, // Higher score from another sub-question
    source_type: "pdf",
  };

  const chunkB: RetrievedContextChunk = {
    chunk_id: "chunk_B",
    document_id: "doc_2",
    document_title: "Deep Residual Learning",
    text: "Deeper neural networks are more difficult to train. We present a residual learning framework.",
    score: 0.88,
    source_type: "pdf",
  };

  const chunkC: RetrievedContextChunk = {
    chunk_id: "chunk_C",
    document_id: "doc_3",
    document_title: "BERT Pre-training",
    text: "BERT is designed to pre-train deep bidirectional representations from unlabeled text.",
    score: 0.75,
    source_type: "web",
  };

  describe("Chunk Deduplication", () => {
    it("coalesces duplicate chunks and retains the highest score", () => {
      const rawHits = [chunkA1, chunkB, chunkA2, chunkC];
      const deduped = deduplicateChunks(rawHits);

      expect(deduped.length).toBe(3);
      const foundA = deduped.find((c) => c.chunk_id === "chunk_A");
      expect(foundA).toBeDefined();
      expect(foundA!.score).toBe(0.94); // Kept higher score

      // Sorted descending by score: A (0.94) -> B (0.88) -> C (0.75)
      expect(deduped[0].chunk_id).toBe("chunk_A");
      expect(deduped[1].chunk_id).toBe("chunk_B");
      expect(deduped[2].chunk_id).toBe("chunk_C");
    });

    it("returns empty array when input is empty", () => {
      expect(deduplicateChunks([])).toEqual([]);
    });
  });

  describe("Citation Manifest & Indexing", () => {
    it("assigns 1-based numeric indices and generates preview snippets", () => {
      const chunks = [chunkA2, chunkB];
      const citations = buildCitationManifest(chunks);

      expect(citations.length).toBe(2);
      expect(citations[0].index).toBe(1);
      expect(citations[0].chunk_id).toBe("chunk_A");
      expect(citations[0].document_title).toBe("Attention Is All You Need");
      expect(citations[0].snippet).toContain("transduction model");

      expect(citations[1].index).toBe(2);
      expect(citations[1].chunk_id).toBe("chunk_B");
      expect(citations[1].document_title).toBe("Deep Residual Learning");
    });

    it("truncates long chunk text in citation snippets to 200 characters", () => {
      const longChunk: RetrievedContextChunk = {
        chunk_id: "chunk_long",
        document_id: "doc_long",
        document_title: "Long Document",
        text: "A".repeat(300),
        score: 0.9,
        source_type: "pdf",
      };

      const citations = buildCitationManifest([longChunk]);
      expect(citations[0].snippet.length).toBe(200);
      expect(citations[0].snippet.endsWith("...")).toBe(true);
    });
  });

  describe("Unavailable Sources Footer (FR-039)", () => {
    it("returns empty string when there are no unavailable sources", () => {
      expect(formatUnavailableSourcesFooter([])).toBe("");
    });

    it("formats disclosure footer for queued, processing, or failed documents", () => {
      const sources: UnavailableSourceInfo[] = [
        { document_id: "doc_p", title: "Q3_Report.pdf", status: "processing" },
        { document_id: "doc_f", title: "Meeting_Audio.mp3", status: "failed" },
      ];

      const footer = formatUnavailableSourcesFooter(sources);
      expect(footer).toContain("---");
      expect(footer).toContain("*Unavailable or processing sources:*");
      expect(footer).toContain("Document 'Q3_Report.pdf' (processing)");
      expect(footer).toContain("Document 'Meeting_Audio.mp3' (failed)");
    });
  });

  describe("Grounded Prompt Envelope Formatting", () => {
    it("formats context block with [1], [2] anchors and document names", () => {
      const citations = buildCitationManifest([chunkA2, chunkB]);
      const contextBlock = formatContextBlock(citations, [chunkA2, chunkB]);

      expect(contextBlock).toContain('[1] (Doc: "Attention Is All You Need")');
      expect(contextBlock).toContain('[2] (Doc: "Deep Residual Learning")');
    });

    it("buildsGroundedPromptEnvelope enforces zero-hallucination instruction (BR-009)", () => {
      const envelope = buildGroundedPromptEnvelope("Explain attention mechanism", "Context text here");

      expect(envelope).toContain("System: You are Contextual, a deeply grounded AI reasoning engine.");
      expect(envelope).toContain("strictly and exclusively using the numbered context chunks below");
      expect(envelope).toContain("Every factual assertion MUST cite its source using the exact tag [1], [2]");
      expect(envelope).toContain("Insufficient context available in your notes to answer this question.");
      expect(envelope).toContain("Never hallucinate or extrapolate beyond the provided text.");
      expect(envelope).toContain("User Prompt: Explain attention mechanism");
    });

    it("assembleGroundedContext integrates deduplication, citations, and unavailable sources footer", () => {
      const rawHits = [chunkA1, chunkB, chunkA2];
      const unavailable: UnavailableSourceInfo[] = [
        { document_id: "doc_x", title: "PendingDoc.pdf", status: "queued" },
      ];

      const result = assembleGroundedContext(rawHits, "Tell me about transformers", unavailable);

      expect(result.uniqueChunks.length).toBe(2);
      expect(result.citations.length).toBe(2);
      expect(result.unavailableFooter).toContain("Document 'PendingDoc.pdf' (queued)");
      expect(result.formattedPromptEnvelope).toContain('[1] (Doc: "Attention Is All You Need")');
    });
  });
});
