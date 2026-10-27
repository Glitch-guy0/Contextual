import { describe, expect, it } from "bun:test";
import {
  decomposeQuery,
  heuristicDecompose,
  generateHydePassages,
  heuristicHydePassage,
  attachHydeToSubQuestions,
} from "../../packages/reasoning/src/index.js";

describe("Milestone M5: Story S5.2 — Query Decomposition (P1) & HyDE Generator (P2)", () => {
  describe("Phase 1: Query Decomposition (FR-008, BR-007, AC-5.1)", () => {
    it("decomposes short prompts (< 50 chars) into exactly 2 sub-questions", async () => {
      const shortPrompt = "What is Upstash Vector?";
      const result = await decomposeQuery(shortPrompt);

      expect(result.sub_questions.length).toBe(2);
      expect(result.sub_questions[0].id).toBe("sq-1");
      expect(result.sub_questions[0].query).toBe("What is Upstash Vector?");
      expect(result.sub_questions[1].id).toBe("sq-2");
      expect(result.sub_questions[1].query.length).toBeGreaterThan(10);
      expect(result.elapsed_ms).toBeLessThan(100);
    });

    it("decomposes comparison queries into 2 to 5 sub-questions", async () => {
      const compPrompt = "Compare Google Gemini Flash vs Groq Llama-3.3-70B latency and fallback behavior";
      const result = await decomposeQuery(compPrompt);

      expect(result.sub_questions.length).toBeGreaterThanOrEqual(2);
      expect(result.sub_questions.length).toBeLessThanOrEqual(5);
      expect(result.sub_questions.every((sq) => sq.query.length > 0)).toBe(true);
    });

    it("decomposes multi-clause complex questions into 2 to 5 sub-questions", async () => {
      const multiClausePrompt =
        "How does the metering spine debit 0.5 credits atomically, and also how does the circuit breaker handle HTTP 429 quota exhaustion?";
      const result = await decomposeQuery(multiClausePrompt);

      expect(result.sub_questions.length).toBeGreaterThanOrEqual(2);
      expect(result.sub_questions.length).toBeLessThanOrEqual(5);
    });

    it("parses structured LLM completion response into sub-questions", async () => {
      const mockLlm = async () => {
        return JSON.stringify({
          sub_questions: [
            { id: "sq-1", query: "What is the token limit of Gemini Flash?" },
            { id: "sq-2", query: "What is Groq Llama-3.3-70B tokens per second throughput?" },
            { id: "sq-3", query: "How does the circuit breaker detect HTTP 429 errors?" },
          ],
        });
      };

      const result = await decomposeQuery(
        "Explain Gemini Flash limits and Groq throughput and circuit breaker 429 handling",
        { llmCompletion: mockLlm },
      );

      expect(result.fallback_used).toBe(false);
      expect(result.sub_questions.length).toBe(3);
      expect(result.sub_questions[0].query).toBe("What is the token limit of Gemini Flash?");
      expect(result.sub_questions[1].query).toBe("What is Groq Llama-3.3-70B tokens per second throughput?");
      expect(result.sub_questions[2].query).toBe("How does the circuit breaker detect HTTP 429 errors?");
    });

    it("safely falls back to heuristic decomposition when LLM output is malformed", async () => {
      const brokenLlm = async () => "I am an AI and I think you should search for things.";

      const result = await decomposeQuery(
        "Detailed comparison of transformer attention mechanisms and recurrent state updates",
        { llmCompletion: brokenLlm },
      );

      expect(result.fallback_used).toBe(true);
      expect(result.sub_questions.length).toBeGreaterThanOrEqual(2);
      expect(result.sub_questions.length).toBeLessThanOrEqual(5);
    });

    it("safely falls back when LLM throws an error or network timeout", async () => {
      const failingLlm = async () => {
        throw new Error("HTTP 503 Service Unavailable");
      };

      const result = await decomposeQuery(
        "Describe the Upstash Redis rate limiting sliding window algorithm",
        { llmCompletion: failingLlm },
      );

      expect(result.fallback_used).toBe(true);
      expect(result.sub_questions.length).toBeGreaterThanOrEqual(2);
      expect(result.sub_questions.length).toBeLessThanOrEqual(5);
    });

    it("heuristicDecompose returns 2 to 5 sub-questions for diverse prompts", () => {
      const prompts = [
        "Short query",
        "How does X work? What is Y? When is Z used?",
        "Difference between A and B in terms of memory and performance",
        "A single long paragraph discussing architectural trade-offs without question marks or obvious separators",
      ];

      for (const p of prompts) {
        const sqs = heuristicDecompose(p);
        expect(sqs.length).toBeGreaterThanOrEqual(2);
        expect(sqs.length).toBeLessThanOrEqual(5);
        for (let i = 0; i < sqs.length; i++) {
          expect(sqs[i].id).toBe(`sq-${i + 1}`);
          expect(sqs[i].query.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("Phase 2: HyDE Synthetic Passage Generator (FR-009)", () => {
    const sampleSubQuestions = [
      { id: "sq-1", query: "What is the computational complexity of self-attention?" },
      { id: "sq-2", query: "Why do recurrent neural networks suffer from sequential bottlenecks?" },
    ];

    it("generates hypothetical passages with ~50-100 words per sub-question", async () => {
      const result = await generateHydePassages(sampleSubQuestions);

      expect(result.passages.length).toBe(2);
      expect(result.passages[0].sub_question_id).toBe("sq-1");
      expect(result.passages[1].sub_question_id).toBe("sq-2");

      const wordCount1 = result.passages[0].passage.split(/\s+/).filter(Boolean).length;
      const wordCount2 = result.passages[1].passage.split(/\s+/).filter(Boolean).length;

      expect(wordCount1).toBeGreaterThanOrEqual(40);
      expect(wordCount1).toBeLessThanOrEqual(120);
      expect(wordCount2).toBeGreaterThanOrEqual(40);
      expect(wordCount2).toBeLessThanOrEqual(120);
    });

    it("attaches hyde_passage directly to SubQuestion objects", async () => {
      const enriched = await attachHydeToSubQuestions(sampleSubQuestions);

      expect(enriched.length).toBe(2);
      expect(enriched[0].hyde_passage).toBeDefined();
      expect(typeof enriched[0].hyde_passage).toBe("string");
      expect(enriched[0].hyde_passage!.length).toBeGreaterThan(50);
      expect(enriched[1].hyde_passage).toBeDefined();
    });

    it("supports pluggable LLM passage synthesis", async () => {
      const customLlm = async (prompt: string) => {
        return `In transformer neural network architectures, self-attention scales quadratically with sequence length O(n^2). Each token attends to all previous tokens simultaneously, requiring large memory buffers for query, key, and value projection matrices during forward and backward propagation passes.`;
      };

      const result = await generateHydePassages(sampleSubQuestions.slice(0, 1), {
        llmCompletion: customLlm,
      });

      expect(result.passages[0].passage).toContain("transformer neural network architectures");
      expect(result.fallback_used).toBe(false);
    });

    it("executes decomposition and HyDE in < 1,000ms", async () => {
      const start = Date.now();
      const decomp = await decomposeQuery(
        "Explain multi-tenant data isolation in Upstash Vector and Neon Postgres",
      );
      const enriched = await attachHydeToSubQuestions(decomp.sub_questions);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
      expect(enriched.length).toBeGreaterThanOrEqual(2);
      expect(enriched.every((sq) => typeof sq.hyde_passage === "string")).toBe(true);
    });
  });
});
