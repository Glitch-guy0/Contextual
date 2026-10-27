/**
 * Phase 1: Query Decomposition Engine.
 * Splits complex prompts into 2 to 5 targeted sub-questions.
 * Reference: architecture/05-m5-grounded-reasoning-engine.md §3.2, FR-008, BR-007, AC-5.1.
 */

import type { SubQuestion } from "@repo/contracts";
import type { DecompositionOptions, DecompositionResult } from "./types.js";

const DECOMPOSITION_SYSTEM_PROMPT = `You are a query decomposition engine.
Your task is to analyze the user's prompt and decompose it into 2 to 5 targeted, non-overlapping search sub-questions.
Rules:
1. Output strictly valid JSON with no markdown formatting or prose.
2. JSON structure must be:
   {
     "sub_questions": [
       { "id": "sq-1", "query": "First targeted sub-question" },
       { "id": "sq-2", "query": "Second targeted sub-question" }
     ]
   }
3. Minimum 2 sub-questions, maximum 5 sub-questions.
4. Each sub-question must be specific, self-contained, and suitable for vector search.`;

/**
 * Deterministic heuristic decomposition used when prompt is simple or LLM is unparseable.
 * Guarantees 2 to 5 sub-questions.
 */
export function heuristicDecompose(prompt: string): SubQuestion[] {
  const trimmed = prompt.trim();
  const cleaned = trimmed.replace(/[\r\n]+/g, " ");

  // For short prompts (< 50 chars), produce exactly 2 sub-questions
  if (cleaned.length < 50) {
    return [
      { id: "sq-1", query: cleaned },
      { id: "sq-2", query: `Key concepts, overview, and details regarding ${cleaned.replace(/\?+$/, "")}` },
    ];
  }

  // Check for multi-clause delimiters: semicolons, bullet points, numbered lists, 'vs', 'compared to', 'and'
  const subQuestions: SubQuestion[] = [];

  // Split on questions if multiple exist
  const questionParts = cleaned
    .split(/(?<=\?)\s+/)
    .map((q) => q.trim())
    .filter((q) => q.length > 5);

  if (questionParts.length >= 2) {
    for (let i = 0; i < Math.min(questionParts.length, 5); i++) {
      const q = questionParts[i];
      if (q) {
        subQuestions.push({
          id: `sq-${subQuestions.length + 1}`,
          query: q,
        });
      }
    }
  } else {
    // Check for "vs", "versus", "difference between", "compare"
    const isComparison = /\b(vs|versus|difference between|compare|differences between)\b/i.test(cleaned);
    if (isComparison) {
      subQuestions.push(
        { id: "sq-1", query: `Primary definition, architecture, and mechanisms in: ${cleaned}` },
        { id: "sq-2", query: `Contrasting factors, trade-offs, and comparative performance in: ${cleaned}` },
        { id: "sq-3", query: `Implementation examples, constraints, and operational context in: ${cleaned}` },
      );
    } else {
      // Split by clauses (and, while, whereas, also, plus)
      const clauses = cleaned
        .split(/\b(?:and also|additionally|furthermore|as well as|while|whereas)\b/i)
        .map((c) => c.trim().replace(/^[,;.]+|[,;.]+$/g, ""))
        .filter((c) => c.length > 10);

      if (clauses.length >= 2) {
        for (let i = 0; i < Math.min(clauses.length, 5); i++) {
          const c = clauses[i];
          if (c) {
            subQuestions.push({
              id: `sq-${subQuestions.length + 1}`,
              query: c.endsWith("?") ? c : `${c}?`,
            });
          }
        }
      } else {
        // Fallback: 3 structured perspectives
        subQuestions.push(
          { id: "sq-1", query: cleaned },
          { id: "sq-2", query: `Detailed mechanism and theoretical basis for: ${cleaned}` },
          { id: "sq-3", query: `Practical applications, edge cases, and impact of: ${cleaned}` },
        );
      }
    }
  }

  // Ensure between 2 and 5 items
  if (subQuestions.length < 2) {
    subQuestions.push({
      id: "sq-2",
      query: `Context and supporting details for ${cleaned}`,
    });
  }

  return subQuestions.slice(0, 5);
}

/**
 * Phase 1 Decomposition Engine:
 * Calls provided LLM or falls back to heuristic decomposition.
 */
export async function decomposeQuery(
  prompt: string,
  options: DecompositionOptions = {},
): Promise<DecompositionResult> {
  const startTime = Date.now();
  const trimmed = prompt.trim();
  let fallbackUsed = false;
  let subQuestions: SubQuestion[] = [];

  // Short prompt optimization: bypass LLM if < 50 chars for speed
  if (trimmed.length < 50 || !options.llmCompletion) {
    subQuestions = heuristicDecompose(trimmed);
    fallbackUsed = !options.llmCompletion && trimmed.length >= 50;
  } else {
    try {
      const userPrompt = `Decompose this query into 2 to 5 targeted sub-questions for vector search:\n"${trimmed}"`;
      const response = await options.llmCompletion(userPrompt, DECOMPOSITION_SYSTEM_PROMPT);

      // Attempt to extract JSON from response (handling potential backtick code blocks)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (
          parsed &&
          Array.isArray(parsed.sub_questions) &&
          parsed.sub_questions.length >= 1
        ) {
          subQuestions = parsed.sub_questions
            .map((sq: { id?: string; query?: string }, idx: number) => ({
              id: typeof sq.id === "string" && sq.id.length > 0 ? sq.id : `sq-${idx + 1}`,
              query: typeof sq.query === "string" ? sq.query.trim() : "",
            }))
            .filter((sq: { query: string }) => sq.query.length > 0);
        }
      }

      // Validate bounds: must be 2 to 5
      if (subQuestions.length < 2 || subQuestions.length > 5) {
        if (subQuestions.length === 1) {
          subQuestions.push({
            id: "sq-2",
            query: `Contextual background and core definitions for ${trimmed}`,
          });
        } else if (subQuestions.length > 5) {
          subQuestions = subQuestions.slice(0, 5);
        } else {
          // If 0, trigger fallback
          subQuestions = heuristicDecompose(trimmed);
          fallbackUsed = true;
        }
      }
    } catch {
      subQuestions = heuristicDecompose(trimmed);
      fallbackUsed = true;
    }
  }

  const elapsedMs = Date.now() - startTime;

  // Structured observability log per spec
  // eslint-disable-next-line no-console
  const logPayload = JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "INFO",
    service: "reasoning",
    event: "query_decomposition_completed",
    payload: {
      prompt_length: trimmed.length,
      sub_questions_count: subQuestions.length,
      fallback_used: fallbackUsed,
      elapsed_ms: elapsedMs,
    },
  });
  if (process.env.NODE_ENV !== "test") {
    // Only emit to stdout in non-test or when explicitly enabled
    process.stdout.write(`${logPayload}\n`);
  }

  return {
    sub_questions: subQuestions,
    elapsed_ms: elapsedMs,
    fallback_used: fallbackUsed,
  };
}
