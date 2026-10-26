import type { NotebookEdgeDTO } from "@repo/contracts";
import type { WorkspaceRepository } from "./repository.js";
import { AppProblemError } from "@repo/contracts";
import { notFound } from "./types.js";

/** Closed union of permitted edge relations (FR-032). Any other string is rejected with HTTP 400 invalid-node-relation. */
export type EdgeType = "cites" | "related";

/** Validation result for edge creation input */
export interface EdgeValidation {
  ok: boolean;
  reason?: "invalid_edge_type";
  issues: readonly { message: string; field: string }[];
}

/** Validate edge type is in the closed union */
export function validateEdgeType(type: string): EdgeValidation {
  if (type === "cites" || type === "related") {
    return { ok: true, issues: [] };
  }
  return {
    ok: false,
    reason: "invalid_edge_type",
    issues: [{ message: `Edge type must be "cites" or "related", got "${type}"`, field: "edge_type" }],
  };
}

/** Create a typed edge between two nodes in the same notebook */
export async function createEdge(
  repository: WorkspaceRepository,
  userId: string,
  notebookId: string,
  sourceId: string,
  targetId: string,
  edgeType: string
): Promise<NotebookEdgeDTO> {
  // Validate edge type before any database round trip
  const typeValidation = validateEdgeType(edgeType);
  if (!typeValidation.ok) {
    if (process.env.NODE_ENV !== "test") {
      console.info(
        JSON.stringify({
          event: "workspace.edge_rejected",
          level: "INFO",
          user_id: userId,
          rejected_value: String(edgeType).slice(0, 64),
        })
      );
    }
    throw new AppProblemError(
      "INVALID_NODE_RELATION",
      {
        detail: typeValidation.issues[0]?.message ?? `Edge type must be "cites" or "related", got "${edgeType}"`,
        instance: "/api/v1/notebooks/{notebookId}/edges",
      }
    );
  }

  // Check that both nodes exist and belong to the same user's notebook
  const sourceNode = await repository.findNode(userId, notebookId, sourceId);
  if (!sourceNode) {
    throw notFound("/api/v1/notebooks/{notebookId}/edges");
  }

  const targetNode = await repository.findNode(userId, notebookId, targetId);
  if (!targetNode) {
    throw notFound("/api/v1/notebooks/{notebookId}/edges");
  }

  // Prevent self-edges
  if (sourceId === targetId) {
    throw new AppProblemError(
      "INVALID_NODE_RELATION",
      {
        detail: "Self-edges are not allowed",
        instance: "/api/v1/notebooks/{notebookId}/edges",
      }
    );
  }

  // Prevent duplicate edges (same source, target, type combination)
  const existing = await repository.findEdgeByEndpoints(
    userId,
    notebookId,
    sourceId,
    targetId,
    edgeType
  );
  if (existing) {
    throw new AppProblemError(
      "INVALID_NODE_RELATION",
      {
        detail: "Duplicate edge between these nodes with this type already exists",
        instance: "/api/v1/notebooks/{notebookId}/edges",
      }
    );
  }

  // Insert the edge
  const inserted = await repository.insertEdge(userId, {
    notebook_id: notebookId,
    source_id: sourceId,
    target_id: targetId,
    edge_type: edgeType as "cites" | "related",
  });

  if (process.env.NODE_ENV !== "test") {
    console.info(
      JSON.stringify({
        event: "workspace.edge_created",
        level: "INFO",
        user_id: userId,
        notebook_id: notebookId,
        edge_id: inserted.id,
        relation_type: inserted.edge_type,
      })
    );
  }

  return inserted as NotebookEdgeDTO;
}

/** List edges for a notebook, optionally filtered by type */
export async function listEdgesForNotebook(
  repository: WorkspaceRepository,
  userId: string,
  notebookId: string,
  edgeType?: string
): Promise<NotebookEdgeDTO[]> {
  const allEdges = await repository.listEdges(userId, notebookId);

  if (edgeType) {
    return allEdges.filter(
      (eb) => eb.edge_type === edgeType
    ) as NotebookEdgeDTO[];
  }
  return allEdges as NotebookEdgeDTO[];
}

/** Check if an edge would be valid before creating it */
export async function canCreateEdge(
  repository: WorkspaceRepository,
  userId: string,
  notebookId: string,
  sourceId: string,
  targetId: string,
  edgeType: string
): Promise<{ ok: boolean; reason?: string }> {
  // Validate edge type
  const typeValidation = validateEdgeType(edgeType);
  if (!typeValidation.ok) {
    return { ok: false, reason: typeValidation.reason ?? typeValidation.issues[0]?.message };
  }

  // Check nodes exist
  const sourceNode = await repository.findNode(userId, notebookId, sourceId);
  const targetNode = await repository.findNode(userId, notebookId, targetId);

  if (!sourceNode) return { ok: false, reason: "source node not found" };
  if (!targetNode) return { ok: false, reason: "target node not found" };

  // Prevent self-edges
  if (sourceId === targetId) return { ok: false, reason: "self-edges are not allowed" };

  // Check for duplicate
  const existing = await repository.findEdgeByEndpoints(
    userId,
    notebookId,
    sourceId,
    targetId,
    edgeType
  );
  if (existing) return { ok: false, reason: "duplicate edge already exists" };

  return { ok: true };
}