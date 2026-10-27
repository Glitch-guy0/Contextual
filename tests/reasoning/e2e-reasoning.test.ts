import { describe, expect, it } from "bun:test";
import {
  decomposeQuery,
  attachHydeToSubQuestions,
  retrieveMultiVectorContext,
  assembleGroundedContext,
  streamGroundedSynthesis,
  synthesizeGroundedResponse,
  CircuitBreakerInterceptor,
  GeminiProvider,
  GroqProvider,
  INSUFFICIENT_CONTEXT_MESSAGE,
  type VectorSearchFn,
} from "../../packages/reasoning/src/index.js";
import { CREDIT_COST_LLM_ACTION, AppProblemError } from "@repo/contracts";

describe("Milestone M5: Story S5.6 — Full 6-Phase Grounded Reasoning Engine E2E Integration", () => {
  const sampleUserId = "usr_e2e_tenant_999";
  const sampleNotebookId = "nbk_e2e_workspace_888";

  // Mock Vector DB containing indexed documents
  const mockKnowledgeStore: Record<string, { docId: string; title: string; text: string; sourceType: "pdf" | "web" }[]> = {
    attention: [
      {
        docId: "doc_transformer",
        title: "Attention Is All You Need",
        text: "The Transformer is an architecture that eschews recurrence and relies entirely on an attention mechanism.",
        sourceType: "pdf",
      },
      {
        docId: "doc_bert",
        title: "BERT Representation",
        text: "Bidirectional Encoder Representations from Transformers applies deep bidirectional attention.",
        sourceType: "web",
      },
    ],
    scaling: [
      {
        docId: "doc_scaling",
        title: "Scaling Laws for Neural Language Models",
        text: "Cross-entropy loss scales as a power-law with compute, dataset size, and parameter count.",
        sourceType: "pdf",
      },
    ],
  };

  const e2eVectorSearch: VectorSearchFn = async (queryText, filter, topK) => {
    // Assert tenant isolation in all queries
    if (!filter.includes(`user_id = '${sampleUserId}'`)) {
      throw new Error(`Tenant leak detected: filter '${filter}' missing user_id`);
    }

    const lower = queryText.toLowerCase();
    const hits = [];

    if (lower.includes("attention") || lower.includes("transformer")) {
      for (const item of mockKnowledgeStore.attention!) {
        hits.push({
          id: `chunk_${item.docId}_1`,
          score: 0.92,
          metadata: {
            document_id: item.docId,
            document_title: item.title,
            text: item.text,
            source_type: item.sourceType,
            user_id: sampleUserId,
            notebook_id: sampleNotebookId,
          },
        });
      }
    }

    if (lower.includes("scale") || lower.includes("scaling") || lower.includes("compute")) {
      for (const item of mockKnowledgeStore.scaling!) {
        hits.push({
          id: `chunk_${item.docId}_1`,
          score: 0.89,
          metadata: {
            document_id: item.docId,
            document_title: item.title,
            text: item.text,
            source_type: item.sourceType,
            user_id: sampleUserId,
            notebook_id: sampleNotebookId,
          },
        });
      }
    }

    return hits.slice(0, topK);
  };

  it("executes the entire 6-phase reasoning pipeline end-to-end on primary provider (Gemini)", async () => {
    const userPrompt =
      "How does the transformer attention mechanism work, and what are its computational scaling laws?";
    let creditBalance = 10.0;

    const mockDebit = async (userId: string, cost: number) => {
      if (creditBalance < cost) {
        return { success: false, remaining: creditBalance };
      }
      creditBalance -= cost;
      return { success: true, remaining: creditBalance };
    };

    // Phase 1: Query Decomposition (FR-008, BR-007)
    const decompResult = await decomposeQuery(userPrompt);
    expect(decompResult.sub_questions.length).toBeGreaterThanOrEqual(2);
    expect(decompResult.sub_questions.length).toBeLessThanOrEqual(5);

    // Phase 2: HyDE Synthesis (FR-009)
    const enrichedQuestions = await attachHydeToSubQuestions(decompResult.sub_questions);
    expect(enrichedQuestions.every((sq) => typeof sq.hyde_passage === "string")).toBe(true);

    // Phase 3 & 4: Multi-Vector Top-3 Retrieval (FR-010, BR-008)
    const retrievalResult = await retrieveMultiVectorContext(enrichedQuestions, {
      userId: sampleUserId,
      notebookId: sampleNotebookId,
      vectorSearchFn: e2eVectorSearch,
    });
    expect(retrievalResult.rawHits.length).toBeGreaterThan(0);

    // Phase 5: Context Assembly & Citation Deduplication (FR-011, FR-039)
    const assembledContext = assembleGroundedContext(
      retrievalResult.rawHits,
      userPrompt,
      [{ document_id: "doc_pending_1", title: "Future_Work.pdf", status: "processing" }],
    );
    expect(assembledContext.citations.length).toBeGreaterThanOrEqual(1);
    expect(assembledContext.unavailableFooter).toContain("Document 'Future_Work.pdf' (processing)");

    // Phase 6: Grounded Synthesis Streaming via Gemini Flash (BR-009, BR-014)
    const mockGeminiTokens = [
      "The transformer attention mechanism [1] eschews recurrence entirely. ",
      "Furthermore, empirical scaling laws [2] demonstrate power-law improvements with compute.",
    ];

    const stream = streamGroundedSynthesis(assembledContext, {
      userId: sampleUserId,
      notebookId: sampleNotebookId,
      meteringDebitFn: mockDebit,
      providerOptions: { mockTokenStream: mockGeminiTokens },
      unavailableSources: [{ document_id: "doc_pending_1", title: "Future_Work.pdf", status: "processing" }],
    });

    const receivedEvents = [];
    let completeResult;
    while (true) {
      const next = await stream.next();
      if (next.done) {
        completeResult = next.value;
        break;
      }
      receivedEvents.push(next.value);
    }

    // Verify debit
    expect(creditBalance).toBe(9.5); // Debited 0.5 credits

    // Verify stream event structure
    expect(receivedEvents[0].event).toBe("phase_start");
    expect(receivedEvents[1].event).toBe("citations");
    expect(receivedEvents[1].data.citations?.length).toBeGreaterThanOrEqual(1);

    expect(completeResult).toBeDefined();
    expect(completeResult!.text).toContain("transformer attention mechanism [1]");
    expect(completeResult!.text).toContain("Document 'Future_Work.pdf' (processing)");
    expect(completeResult!.provider_used).toBe("gemini");
  });

  it("transparently fails over to Groq Llama-3.3-70B when Gemini returns HTTP 429", async () => {
    const userPrompt = "Explain multi-head attention mechanism";

    const mockGemini429 = new (class extends GeminiProvider {
      override async *streamText(): AsyncIterable<string> {
        const err = new Error("Google AI Studio quota exhausted: HTTP 429 RESOURCE_EXHAUSTED");
        (err as unknown as { status: number }).status = 429;
        throw err;
      }
    })();

    const mockGroqFallback = new (class extends GroqProvider {
      override async *streamText(): AsyncIterable<string> {
        yield "Synthesized via Groq Llama-3.3-70B: Attention computes weighted values [1].";
      }
    })();

    const circuitBreaker = new CircuitBreakerInterceptor({
      primaryProvider: mockGemini429,
      fallbackProvider: mockGroqFallback,
    });

    const assembled = assembleGroundedContext(
      [
        {
          chunk_id: "chunk_1",
          document_id: "doc_1",
          document_title: "Attention Paper",
          text: "Attention computes weighted values based on compatibility of queries and keys.",
          score: 0.95,
          source_type: "pdf",
        },
      ],
      userPrompt,
    );

    const result = await synthesizeGroundedResponse(assembled, {
      userId: sampleUserId,
      notebookId: sampleNotebookId,
      provider: circuitBreaker,
    });

    expect(result.text).toContain("Synthesized via Groq Llama-3.3-70B");
    expect(circuitBreaker.isFallbackUsed()).toBe(true);
    expect(circuitBreaker.getActiveProvider()).toBe("groq");
    expect(circuitBreaker.getFallbackHeaders()).toEqual({ "x-fallback-provider": "groq" });
  });

  it("short-circuits with HTTP 402 with 0 provider calls when credits are exhausted", async () => {
    const assembled = assembleGroundedContext([], "Some prompt");
    const mockDebitEmpty = async () => ({ success: false, remaining: 0.0 });

    let caughtError: unknown = null;
    try {
      const stream = streamGroundedSynthesis(assembled, {
        userId: sampleUserId,
        notebookId: sampleNotebookId,
        meteringDebitFn: mockDebitEmpty,
      });
      await stream.next();
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(AppProblemError);
    expect((caughtError as AppProblemError).key).toBe("INSUFFICIENT_CREDITS");
  });
});
