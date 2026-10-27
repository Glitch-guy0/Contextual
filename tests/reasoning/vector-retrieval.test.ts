import { describe, expect, it } from "bun:test";
import {
  retrieveMultiVectorContext,
  buildTenantVectorFilter,
  mapRawHitToRetrievedChunk,
  type VectorSearchFn,
  type RawVectorHit,
} from "../../packages/reasoning/src/index.js";
import type { SubQuestion } from "@repo/contracts";

describe("Milestone M5: Story S5.3 — Multi-Vector Top-3 Scoped Retrieval (Phase 3 & 4)", () => {
  const sampleUserId = "usr_tenant_12345";
  const sampleNotebookId = "nbk_workspace_67890";

  const sampleSubQuestions: SubQuestion[] = [
    { id: "sq-1", query: "Self-attention computational complexity", hyde_passage: "Attention complexity passage" },
    { id: "sq-2", query: "Recurrent neural network memory footprint", hyde_passage: "RNN memory footprint passage" },
    { id: "sq-3", query: "Transformer positional encoding mechanisms", hyde_passage: "Positional encoding passage" },
  ];

  describe("Tenant Filter Construction (BR-002, NFR-007)", () => {
    it("constructs filter with mandatory user_id", () => {
      const filter = buildTenantVectorFilter(sampleUserId);
      expect(filter).toBe("user_id = 'usr_tenant_12345'");
    });

    it("constructs composite filter with user_id and notebook_id", () => {
      const filter = buildTenantVectorFilter(sampleUserId, sampleNotebookId);
      expect(filter).toBe("user_id = 'usr_tenant_12345' and notebook_id = 'nbk_workspace_67890'");
    });

    it("sanitizes quotes in user_id and notebook_id to prevent injection", () => {
      const filter = buildTenantVectorFilter("usr' OR '1'='1", "nbk'--");
      expect(filter).toBe("user_id = 'usr OR 1=1' and notebook_id = 'nbk--'");
    });
  });

  describe("Top-3 Chunk Retrieval & Cardinality (BR-008, AC-5.2)", () => {
    it("queries vector store concurrently and limits results to top-3 per sub-question", async () => {
      const queryFilters: string[] = [];
      const queryProbes: string[] = [];

      const mockSearchFn: VectorSearchFn = async (queryText, filter, topK) => {
        queryFilters.push(filter);
        queryProbes.push(queryText);

        // Return 5 hits to verify top-3 capping
        return Array.from({ length: 5 }, (_, i) => ({
          id: `chunk_${queryText.slice(0, 5)}_${i}`,
          score: 0.95 - i * 0.05,
          metadata: {
            document_id: `doc_${i}`,
            document_title: `Paper ${i}`,
            text: `Content for hit ${i} of query ${queryText}`,
            source_type: "pdf" as const,
            page_or_timestamp: i + 1,
            user_id: sampleUserId,
            notebook_id: sampleNotebookId,
          },
        }));
      };

      const result = await retrieveMultiVectorContext(sampleSubQuestions, {
        userId: sampleUserId,
        notebookId: sampleNotebookId,
        vectorSearchFn: mockSearchFn,
      });

      // 3 sub-questions queried concurrently
      expect(queryFilters.length).toBe(3);
      expect(queryFilters.every((f) => f.includes(`user_id = '${sampleUserId}'`))).toBe(true);
      expect(queryFilters.every((f) => f.includes(`notebook_id = '${sampleNotebookId}'`))).toBe(true);

      // Verify each sub-question has strictly at most 3 hits (BR-008)
      for (const sq of sampleSubQuestions) {
        const hits = result.hitsBySubQuestion.get(sq.id);
        expect(hits).toBeDefined();
        expect(hits!.length).toBeLessThanOrEqual(3);
      }

      // Total raw hits capped at 3 * 3 = 9
      expect(result.rawHits.length).toBe(9);
    });

    it("maps raw hits into validated RetrievedContextChunk structure", () => {
      const rawHit: RawVectorHit = {
        id: "chunk_abc_1",
        score: 0.912,
        metadata: {
          document_id: "doc_101",
          document_title: "Attention Is All You Need",
          text: "The Transformer uses multi-head attention in three different ways.",
          source_type: "pdf",
          page_or_timestamp: 4,
          chunk_index: 12,
        },
      };

      const mapped = mapRawHitToRetrievedChunk(rawHit);
      expect(mapped.chunk_id).toBe("chunk_abc_1");
      expect(mapped.score).toBe(0.912);
      expect(mapped.document_title).toBe("Attention Is All You Need");
      expect(mapped.source_type).toBe("pdf");
      expect(mapped.page_or_timestamp).toBe(4);
    });
  });

  describe("Latency SLA (NFR-001 < 100ms p95)", () => {
    it("executes parallel searches across sub-questions with p95 < 100ms", async () => {
      const simulatedFastSearch: VectorSearchFn = async (queryText) => {
        // Simulate 15ms network round-trip to Upstash Vector REST API
        await new Promise((r) => setTimeout(r, 15));
        return [
          {
            id: `chunk_${queryText.slice(0, 3)}`,
            score: 0.88,
            metadata: {
              document_id: "doc_fast",
              document_title: "Fast Retrieval",
              text: "Fast chunk snippet",
              source_type: "web",
            },
          },
        ];
      };

      const start = Date.now();
      const result = await retrieveMultiVectorContext(sampleSubQuestions, {
        userId: sampleUserId,
        vectorSearchFn: simulatedFastSearch,
      });
      const duration = Date.now() - start;

      // Concurrent execution ensures 3 * 15ms takes ~15-30ms, well under 100ms SLA
      expect(duration).toBeLessThan(100);
      expect(result.elapsed_ms).toBeLessThan(100);
      expect(result.rawHits.length).toBe(3);
    });

    it("handles search timeouts cleanly without breaking the reasoning pipeline", async () => {
      const hangingSearch: VectorSearchFn = async () => {
        await new Promise((r) => setTimeout(r, 500));
        return [];
      };

      const result = await retrieveMultiVectorContext(sampleSubQuestions.slice(0, 1), {
        userId: sampleUserId,
        timeoutMs: 50,
        vectorSearchFn: hangingSearch,
      });

      expect(result.rawHits.length).toBe(0);
      expect(result.elapsed_ms).toBeLessThan(200);
    });
  });
});
