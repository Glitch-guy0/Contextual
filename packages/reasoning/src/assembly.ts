/**
 * Phase 5: Context Assembly, Citation Deduplication & FR-039 Unavailable Sources Footer.
 * Reference: architecture/05-m5-grounded-reasoning-engine.md §3.5, FR-011, FR-039, AC-5.3.
 */

import type {
  RetrievedContextChunk,
  CitationAnchor,
  UnavailableSourceInfo,
} from "@repo/contracts";

export interface AssembledContextResult {
  readonly contextText: string;
  readonly uniqueChunks: readonly RetrievedContextChunk[];
  readonly citations: readonly CitationAnchor[];
  readonly unavailableFooter: string;
  readonly formattedPromptEnvelope: string;
}

/**
 * Deduplicates retrieved chunks by chunk_id, preserving the highest similarity score.
 */
export function deduplicateChunks(
  chunks: readonly RetrievedContextChunk[],
): RetrievedContextChunk[] {
  const map = new Map<string, RetrievedContextChunk>();

  for (const chunk of chunks) {
    const existing = map.get(chunk.chunk_id);
    if (!existing || chunk.score > existing.score) {
      map.set(chunk.chunk_id, chunk);
    }
  }

  // Sort descending by score for optimal prompt relevance
  return Array.from(map.values()).sort((a, b) => b.score - a.score);
}

/**
 * Assigns 1-based numeric citation anchors to deduplicated chunks.
 */
export function buildCitationManifest(
  chunks: readonly RetrievedContextChunk[],
): CitationAnchor[] {
  return chunks.map((chunk, idx) => ({
    index: idx + 1,
    chunk_id: chunk.chunk_id,
    document_id: chunk.document_id,
    document_title: chunk.document_title,
    source_type: chunk.source_type,
    snippet: chunk.text.length > 200 ? `${chunk.text.slice(0, 197)}...` : chunk.text,
  }));
}

/**
 * Formats the FR-039 Unavailable or Processing Sources Footer.
 * Explicitly notifies user of pending/failed documents in the notebook scope.
 */
export function formatUnavailableSourcesFooter(
  sources: readonly UnavailableSourceInfo[] = [],
): string {
  if (!sources || sources.length === 0) {
    return "";
  }

  const items = sources
    .map((s) => `Document '${s.title}' (${s.status})`)
    .join(", ");

  return `\n\n---\n*Unavailable or processing sources:* ${items}`;
}

/**
 * Formats the context block for injection into the grounded LLM prompt.
 */
export function formatContextBlock(
  citations: readonly CitationAnchor[],
  chunks: readonly RetrievedContextChunk[],
): string {
  if (citations.length === 0) {
    return "No relevant context found in workspace.";
  }

  const chunkMap = new Map<string, RetrievedContextChunk>(
    chunks.map((c) => [c.chunk_id, c]),
  );

  return citations
    .map((anchor) => {
      const chunk = chunkMap.get(anchor.chunk_id);
      const text = chunk?.text ?? anchor.snippet;
      return `[${anchor.index}] (Doc: "${anchor.document_title}")\n"${text.trim()}"`;
    })
    .join("\n\n");
}

/**
 * Builds the complete grounded prompt envelope enforcing zero hallucination (BR-009).
 */
export function buildGroundedPromptEnvelope(
  userPrompt: string,
  contextBlock: string,
): string {
  return (
    `System: You are Contextual, a deeply grounded AI reasoning engine.\n` +
    `Answer the user prompt strictly and exclusively using the numbered context chunks below.\n` +
    `Every factual assertion MUST cite its source using the exact tag [1], [2], etc.\n` +
    `If the context is empty or does not contain enough information to answer, state:\n` +
    `"Insufficient context available in your notes to answer this question."\n` +
    `Never hallucinate or extrapolate beyond the provided text.\n\n` +
    `Context:\n${contextBlock}\n\n` +
    `User Prompt: ${userPrompt}`
  );
}

/**
 * Phase 5 Context Assembler:
 * Combines deduplication, citation mapping, and FR-039 footer formatting.
 */
export function assembleGroundedContext(
  rawHits: readonly RetrievedContextChunk[],
  userPrompt: string,
  unavailableSources: readonly UnavailableSourceInfo[] = [],
): AssembledContextResult {
  const uniqueChunks = deduplicateChunks(rawHits);
  const citations = buildCitationManifest(uniqueChunks);
  const contextText = formatContextBlock(citations, uniqueChunks);
  const unavailableFooter = formatUnavailableSourcesFooter(unavailableSources);
  const formattedPromptEnvelope = buildGroundedPromptEnvelope(userPrompt, contextText);

  return {
    contextText,
    uniqueChunks,
    citations,
    unavailableFooter,
    formattedPromptEnvelope,
  };
}
