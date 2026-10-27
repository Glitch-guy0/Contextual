import { describe, expect, it } from "bun:test";
import {
  streamGroundedSynthesis,
  assembleGroundedContext,
  GeminiProvider,
} from "../../packages/reasoning/src/index.js";
import { AppProblemError, CREDIT_COST_LLM_ACTION } from "@repo/contracts";
import type { RetrievedContextChunk } from "@repo/contracts";

describe("Milestone M5: Story S5.4 — Reasoning Metering & 0.5 Credit Debit Guard (BR-014, BR-015)", () => {
  const sampleUserId = "usr_metering_test_1";
  const sampleNotebookId = "nbk_metering_test_2";

  const sampleChunks: RetrievedContextChunk[] = [
    {
      chunk_id: "chunk_m1",
      document_id: "doc_m",
      document_title: "Metering Architecture",
      text: "The Lua credit ledger executes atomic debits inside Redis.",
      score: 0.9,
      source_type: "pdf",
    },
  ];

  it("atomically debits 0.5 credits before synthesis begins", async () => {
    let debitedUserId = "";
    let debitedCost = 0;

    const mockDebitFn = async (userId: string, cost: number) => {
      debitedUserId = userId;
      debitedCost = cost;
      return { success: true, remaining: 9.5 };
    };

    const assembled = assembleGroundedContext(sampleChunks, "Explain metering");
    const stream = streamGroundedSynthesis(assembled, {
      userId: sampleUserId,
      notebookId: sampleNotebookId,
      meteringDebitFn: mockDebitFn,
      providerOptions: { mockTokenStream: ["Grounded token"] },
    });

    const tokens: string[] = [];
    for await (const chunk of stream) {
      if (chunk.event === "token") {
        tokens.push(chunk.data.token!);
      }
    }

    expect(debitedUserId).toBe(sampleUserId);
    expect(debitedCost).toBe(0.5);
    expect(debitedCost).toBe(CREDIT_COST_LLM_ACTION);
    expect(tokens.length).toBe(1);
  });

  it("short-circuits with HTTP 402 if credit balance < 0.5 with zero provider calls", async () => {
    let providerCalled = false;
    const trackingProvider = new (class extends GeminiProvider {
      override async *streamText(): AsyncIterable<string> {
        providerCalled = true;
        yield "Should not be emitted";
      }
    })();

    const mockDebitFn = async () => {
      // Simulate account with only 0.2 credits (insufficient for 0.5 cost)
      return { success: false, remaining: 0.2 };
    };

    const assembled = assembleGroundedContext(sampleChunks, "Explain metering");
    const stream = streamGroundedSynthesis(assembled, {
      userId: sampleUserId,
      notebookId: sampleNotebookId,
      provider: trackingProvider,
      meteringDebitFn: mockDebitFn,
    });

    let thrownError: unknown = null;
    try {
      await stream.next();
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(AppProblemError);
    const problem = thrownError as AppProblemError;
    expect(problem.key).toBe("INSUFFICIENT_CREDITS");
    const doc = problem.toProblemDocument();
    expect(doc.status).toBe(402);
    expect(doc.type).toBe("https://contextual.ai/errors/insufficient-credits");
    expect(doc.detail).toContain("0.5 credits");

    // Zero downstream provider calls must be made!
    expect(providerCalled).toBe(false);
  });
});
