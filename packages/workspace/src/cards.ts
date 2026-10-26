import type { DocumentCard, NotebookNodeDTO } from "@repo/contracts";
import type { WorkspaceRepository } from "./repository.js";
import { buildDocumentCard as buildCardFromRow, notFound } from "./types.js";

/** Resolution latency budget in milliseconds (AC-4.1) */
export const CARD_RESOLUTION_BUDGET_MS = 10;

/** Resolve a document card for a node, with latency measurement */
export async function resolveCard(
  repository: WorkspaceRepository,
  userId: string,
  notebookId: string,
  nodeId: string
): Promise<{ card: DocumentCard | null; elapsedMs: number; found: boolean }> {
  const startMs = Date.now();

  // Check ownership first - unowned nodes return not-found
  const row = await repository.findNode(userId, notebookId, nodeId);
  if (!row) {
    const elapsed = Date.now() - startMs;
    return { card: null, elapsedMs: elapsed, found: false };
  }

  // Build the document card
  const card = buildCardFromRow({
    title: row.title,
    kind: row.kind,
    content: row.content,
    document_id: row.document_id,
  });

  const elapsedMs = Date.now() - startMs;

  if (elapsedMs > CARD_RESOLUTION_BUDGET_MS && process.env.NODE_ENV !== "test") {
    console.warn(
      JSON.stringify({
        event: "workspace.card_latency_exceeded",
        level: "WARN",
        user_id: userId,
        notebook_id: notebookId,
        node_id: nodeId,
        elapsed_ms: elapsedMs,
      })
    );
  }

  return { card, elapsedMs, found: true };
}

/** Batch resolve cards for multiple nodes, measuring p95 latency */
export async function resolveCardsBatch(
  repository: WorkspaceRepository,
  userId: string,
  notebookId: string,
  nodeIds: string[]
): Promise<{
  results: Array<{ nodeId: string; card: DocumentCard | null; elapsedMs: number; found: boolean }>;
  p95LatencyMs: number;
}> {
  const results = await Promise.all(
    nodeIds.map(async (nodeId) => {
      const res = await resolveCard(repository, userId, notebookId, nodeId);
      return { nodeId, ...res };
    })
  );
  const allElapsed = results.map((r) => r.elapsedMs);
  // Sort elapsed times to compute p95
  const sorted = [...allElapsed].sort((a, b) => a - b);
  const p95Index = Math.floor(sorted.length * 0.95);
  const p95LatencyMs = sorted[p95Index] ?? 0;

  return { results, p95LatencyMs };
}

/** Validate that a card resolution does not exceed the 10ms budget */
export function validateCardLatency(
  elapsedMs: number,
  budgetMs: number = CARD_RESOLUTION_BUDGET_MS
): { withinBudget: boolean; exceededByMs: number } {
  const withinBudget = elapsedMs <= budgetMs;
  const exceededByMs = withinBudget ? 0 : elapsedMs - budgetMs;
  return { withinBudget, exceededByMs };
}