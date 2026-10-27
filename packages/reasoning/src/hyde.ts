/**
 * Phase 2: Hypothetical Document Embeddings (HyDE) Generator.
 * Synthesizes concise 50-100 word hypothetical passages to bridge vocabulary divergence.
 * Reference: architecture/05-m5-grounded-reasoning-engine.md §3.3, FR-009.
 */

import type { SubQuestion, HydePassage } from "@repo/contracts";
import type { HydeOptions, HydeResult } from "./types.js";

const HYDE_SYSTEM_PROMPT = `You are a hypothetical document passage generator for vector search retrieval.
For the given sub-question, write a concise, authoritative hypothetical excerpt (50 to 100 words) that directly answers the question as if found in a high-quality textbook or technical document.
Rules:
1. Write strictly the excerpt text. No intro, no markdown headers, no concluding remarks.
2. Word count must be strictly between 50 and 100 words.
3. Include domain-specific terminology, technical nouns, and standard phrasing.`;

/**
 * Deterministic heuristic passage generator used when LLM is unavailable or unparseable.
 * Generates ~50-80 words of domain vocabulary based on the sub-question terms.
 */
export function heuristicHydePassage(subQuestion: SubQuestion): string {
  const query = subQuestion.query.trim().replace(/\?+$/, "");
  return (
    `In technical documentation regarding ${query}, the core concepts involve foundational architectural principles, ` +
    `system mechanics, operational trade-offs, and practical execution details. Standard implementations establish clear boundaries ` +
    `to ensure scalability, predictable resource consumption, and reliable performance across varying workload profiles. ` +
    `Key considerations include data integrity, concurrency handling, interface contracts, and observable telemetry metrics ` +
    `that allow engineers to evaluate system behavior under real-world production conditions.`
  );
}

/**
 * Generates a hypothetical passage for a single sub-question.
 */
async function generateSinglePassage(
  subQuestion: SubQuestion,
  options: HydeOptions,
): Promise<HydePassage> {
  if (!options.llmCompletion) {
    return {
      sub_question_id: subQuestion.id,
      passage: heuristicHydePassage(subQuestion),
    };
  }

  try {
    const userPrompt = `Write a 50-100 word hypothetical passage answering:\n"${subQuestion.query}"`;
    const response = await options.llmCompletion(userPrompt, HYDE_SYSTEM_PROMPT);
    const cleaned = response.trim().replace(/^["'`]|["'`]$/g, "");

    const wordCount = cleaned.split(/\s+/).filter(Boolean).length;
    if (wordCount >= 20 && wordCount <= 200) {
      return {
        sub_question_id: subQuestion.id,
        passage: cleaned,
      };
    }

    return {
      sub_question_id: subQuestion.id,
      passage: heuristicHydePassage(subQuestion),
    };
  } catch {
    return {
      sub_question_id: subQuestion.id,
      passage: heuristicHydePassage(subQuestion),
    };
  }
}

/**
 * Phase 2 HyDE Generator:
 * Generates hypothetical passages concurrently across all provided sub-questions.
 */
export async function generateHydePassages(
  subQuestions: readonly SubQuestion[],
  options: HydeOptions = {},
): Promise<HydeResult> {
  const startTime = Date.now();
  let fallbackUsed = !options.llmCompletion;

  // Execute concurrently across sub-questions
  const passagePromises = subQuestions.map((sq) =>
    generateSinglePassage(sq, options).catch(() => {
      fallbackUsed = true;
      return {
        sub_question_id: sq.id,
        passage: heuristicHydePassage(sq),
      };
    }),
  );

  const passages = await Promise.all(passagePromises);
  const elapsedMs = Date.now() - startTime;

  return {
    passages,
    elapsed_ms: elapsedMs,
    fallback_used: fallbackUsed,
  };
}

/**
 * Convenience function attaching generated HyDE passages directly to the SubQuestion array.
 */
export async function attachHydeToSubQuestions(
  subQuestions: readonly SubQuestion[],
  options: HydeOptions = {},
): Promise<SubQuestion[]> {
  const { passages } = await generateHydePassages(subQuestions, options);
  const passageMap = new Map<string, string>(
    passages.map((p) => [p.sub_question_id, p.passage]),
  );

  return subQuestions.map((sq) => ({
    ...sq,
    hyde_passage: passageMap.get(sq.id) ?? heuristicHydePassage(sq),
  }));
}
