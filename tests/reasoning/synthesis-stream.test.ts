import { describe, expect, it } from "bun:test";
import {
  streamGroundedSynthesis,
  synthesizeGroundedResponse,
  INSUFFICIENT_CONTEXT_MESSAGE,
  assembleGroundedContext,
  GeminiProvider,
} from "../../packages/reasoning/src/index.js";
import type { RetrievedContextChunk, StreamReasoningChunk } from "@repo/contracts";

describe("Milestone M5: Story S5.4 — Grounded Synthesis Streaming via Gemini Flash (Phase 6)", () => {
  const sampleUserId = "usr_tenant_stream_1";
  const sampleNotebookId = "nbk_stream_2";

  const sampleChunks: RetrievedContextChunk[] = [
    {
      chunk_id: "chunk_trans_1",
      document_id: "doc_1",
      document_title: "Attention Is All You Need",
      text: "The Transformer uses multi-head attention to attend to information from different representation subspaces.",
      score: 0.95,
      source_type: "pdf",
    },
    {
      chunk_id: "chunk_trans_2",
      document_id: "doc_2",
      document_title: "Scaling Laws for Neural Models",
      text: "Model performance scales as a power-law with model size, dataset size, and total compute used for training.",
      score: 0.88,
      source_type: "web",
    },
  ];

  describe("Token Streaming and Citation Manifest Delivery (AC-5.3, BR-009)", () => {
    it("emits phase_start and citation manifest before streaming tokens", async () => {
      const assembled = assembleGroundedContext(sampleChunks, "Explain attention and scaling");
      const mockTokens = [
        "Multi-head attention mechanism [1] allows ",
        "the model to attend to different subspaces. ",
        "Performance scales as a power-law with compute [2].",
      ];

      const provider = new GeminiProvider();
      const stream = streamGroundedSynthesis(assembled, {
        userId: sampleUserId,
        notebookId: sampleNotebookId,
        provider,
        providerOptions: { mockTokenStream: mockTokens },
      });

      const events: StreamReasoningChunk[] = [];
      while (true) {
        const next = await stream.next();
        if (next.done) {
          expect(next.value.citations.length).toBe(2);
          expect(next.value.provider_used).toBe("gemini");
          break;
        }
        events.push(next.value);
      }

      // Check event sequence: phase_start -> citations -> tokens -> done
      expect(events[0].event).toBe("phase_start");
      expect(events[0].data.phase).toBe("synthesis");

      expect(events[1].event).toBe("citations");
      expect(events[1].data.citations?.length).toBe(2);
      expect(events[1].data.citations?.[0].index).toBe(1);
      expect(events[1].data.citations?.[0].document_title).toBe("Attention Is All You Need");

      const tokenEvents = events.filter((e) => e.event === "token");
      expect(tokenEvents.length).toBe(3);
      expect(tokenEvents[0].data.token).toContain("Multi-head attention");

      const lastEvent = events[events.length - 1];
      expect(lastEvent.event).toBe("done");
      expect(lastEvent.data.provider).toBe("gemini");
      expect(lastEvent.data.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it("synthesizeGroundedResponse aggregates full answer seamlessly", async () => {
      const assembled = assembleGroundedContext(sampleChunks, "Explain attention and scaling");
      const mockTokens = ["Part A [1]. ", "Part B [2]."];

      const result = await synthesizeGroundedResponse(assembled, {
        userId: sampleUserId,
        notebookId: sampleNotebookId,
        providerOptions: { mockTokenStream: mockTokens },
      });

      expect(result.text).toBe("Part A [1]. Part B [2].");
      expect(result.citations.length).toBe(2);
      expect(result.provider_used).toBe("gemini");
    });
  });

  describe("Empty Context Deterministic Notice (BR-009)", () => {
    it("outputs deterministic insufficient context notice when context is empty", async () => {
      const emptyAssembled = assembleGroundedContext([], "What is dark matter?");
      const result = await synthesizeGroundedResponse(emptyAssembled, {
        userId: sampleUserId,
        notebookId: sampleNotebookId,
      });

      expect(result.text).toBe(INSUFFICIENT_CONTEXT_MESSAGE);
      expect(result.citations.length).toBe(0);
    });

    it("appends FR-039 footer to insufficient context notice if documents are processing", async () => {
      const emptyAssembled = assembleGroundedContext([], "What is dark matter?", [
        { document_id: "doc_pending", title: "Physics.pdf", status: "processing" },
      ]);

      const result = await synthesizeGroundedResponse(emptyAssembled, {
        userId: sampleUserId,
        notebookId: sampleNotebookId,
        unavailableSources: [{ document_id: "doc_pending", title: "Physics.pdf", status: "processing" }],
      });

      expect(result.text).toContain(INSUFFICIENT_CONTEXT_MESSAGE);
      expect(result.text).toContain("*Unavailable or processing sources:* Document 'Physics.pdf' (processing)");
    });
  });

  describe("TTFT Latency Budget (NFR-002 p90 < 1,500ms)", () => {
    it("completes Time-to-First-Token in < 1,500ms", async () => {
      const assembled = assembleGroundedContext(sampleChunks, "Quick test");
      const start = Date.now();

      const stream = streamGroundedSynthesis(assembled, {
        userId: sampleUserId,
        notebookId: sampleNotebookId,
        providerOptions: { mockTokenStream: ["First token immediately"] },
      });

      let ttftMs = -1;
      for await (const chunk of stream) {
        if (chunk.event === "token") {
          ttftMs = Date.now() - start;
          break;
        }
      }

      expect(ttftMs).toBeGreaterThanOrEqual(0);
      expect(ttftMs).toBeLessThan(1500);
    });
  });
});
