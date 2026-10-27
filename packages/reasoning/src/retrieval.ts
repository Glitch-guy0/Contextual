/**
 * Phase 3 & 4: Multi-Vector Top-3 Scoped Retrieval.
 * Executes parallel similarity searches against Upstash Vector with strict tenant filtering.
 * Reference: architecture/05-m5-grounded-reasoning-engine.md §3.4, FR-010, BR-002, BR-008, NFR-001.
 */

import type { SubQuestion, RetrievedContextChunk, CardSourceType } from "@repo/contracts";

export interface VectorQueryOptions {
  readonly userId: string;
  readonly notebookId?: string;
  readonly topKPerQuestion?: number;
  readonly vectorSearchFn?: VectorSearchFn;
  readonly timeoutMs?: number;
}

export interface RawVectorHit {
  readonly id: string;
  readonly score: number;
  readonly metadata: {
    readonly document_id?: string;
    readonly document_title?: string;
    readonly text?: string;
    readonly source_type?: CardSourceType | null;
    readonly page_or_timestamp?: string | number | null;
    readonly chunk_index?: number | null;
    readonly user_id?: string;
    readonly notebook_id?: string;
    [key: string]: unknown;
  };
}

/** Function signature for performing a vector search for a single query text/embedding. */
export type VectorSearchFn = (
  queryText: string,
  filter: string,
  topK: number,
) => Promise<RawVectorHit[]>;

export interface MultiVectorRetrievalResult {
  readonly rawHits: readonly RetrievedContextChunk[];
  readonly hitsBySubQuestion: ReadonlyMap<string, readonly RetrievedContextChunk[]>;
  readonly elapsed_ms: number;
  readonly totalHitsCount: number;
}

/**
 * Builds the Upstash Vector SQL-like metadata filter string ensuring strict tenant isolation.
 * Reference: conventions.md §5, BR-002, NFR-007.
 */
export function buildTenantVectorFilter(userId: string, notebookId?: string): string {
  const sanitizedUserId = userId.replace(/'/g, "");
  let filter = `user_id = '${sanitizedUserId}'`;
  if (notebookId) {
    const sanitizedNotebookId = notebookId.replace(/'/g, "");
    filter += ` and notebook_id = '${sanitizedNotebookId}'`;
  }
  return filter;
}

/**
 * Maps a raw Upstash Vector hit into a validated RetrievedContextChunk.
 */
export function mapRawHitToRetrievedChunk(hit: RawVectorHit): RetrievedContextChunk {
  const meta = hit.metadata || {};
  return {
    chunk_id: hit.id,
    document_id: meta.document_id ?? "unknown-doc",
    document_title: meta.document_title ?? "Untitled Document",
    text: meta.text ?? "",
    score: hit.score,
    source_type: meta.source_type ?? null,
    page_or_timestamp: meta.page_or_timestamp ?? null,
    chunk_index: meta.chunk_index ?? null,
  };
}

/**
 * Phase 3 & 4 Multi-Vector Retrieval:
 * Issues parallel vector searches across sub-questions with tenant filter.
 * Bounded by strict topK (default 3) per sub-question (BR-008).
 */
export async function retrieveMultiVectorContext(
  subQuestions: readonly SubQuestion[],
  options: VectorQueryOptions,
): Promise<MultiVectorRetrievalResult> {
  const startTime = Date.now();
  const topK = Math.min(options.topKPerQuestion ?? 3, 3); // Strictly <= 3 (BR-008)
  const filter = buildTenantVectorFilter(options.userId, options.notebookId);
  const timeoutMs = options.timeoutMs ?? 300; // Strict budget

  const hitsBySubQuestion = new Map<string, RetrievedContextChunk[]>();
  const allHits: RetrievedContextChunk[] = [];

  if (options.vectorSearchFn) {
    const searchPromises = subQuestions.map(async (sq) => {
      // Use HyDE passage if available, otherwise sub-question query
      const queryProbe = sq.hyde_passage?.trim() ? sq.hyde_passage : sq.query;
      try {
        const rawHits = await Promise.race([
          options.vectorSearchFn!(queryProbe, filter, topK),
          new Promise<RawVectorHit[]>((_, reject) =>
            setTimeout(() => reject(new Error("Vector query timeout")), timeoutMs),
          ),
        ]);

        const mapped = (rawHits || []).slice(0, topK).map(mapRawHitToRetrievedChunk);
        hitsBySubQuestion.set(sq.id, mapped);
        allHits.push(...mapped);
      } catch {
        hitsBySubQuestion.set(sq.id, []);
      }
    });

    await Promise.all(searchPromises);
  }

  const elapsedMs = Date.now() - startTime;

  // Structured observability logging
  if (allHits.length === 0) {
    const warnPayload = JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "WARN",
      service: "reasoning",
      event: "vector_search_empty_results",
      payload: {
        userId: options.userId,
        notebookId: options.notebookId,
        subQuestionsCount: subQuestions.length,
        elapsed_ms: elapsedMs,
      },
    });
    if (process.env.NODE_ENV !== "test") {
      process.stdout.write(`${warnPayload}\n`);
    }
  } else {
    const infoPayload = JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "INFO",
      service: "reasoning",
      event: "multi_vector_retrieval_completed",
      payload: {
        userId: options.userId,
        subQuestionsCount: subQuestions.length,
        rawHitsCount: allHits.length,
        elapsed_ms: elapsedMs,
      },
    });
    if (process.env.NODE_ENV !== "test") {
      process.stdout.write(`${infoPayload}\n`);
    }
  }

  return {
    rawHits: allHits,
    hitsBySubQuestion,
    elapsed_ms: elapsedMs,
    totalHitsCount: allHits.length,
  };
}
