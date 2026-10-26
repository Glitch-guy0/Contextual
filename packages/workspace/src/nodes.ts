import type { CreateNodeInput, NotebookNodeDTO, NodeKind } from "@repo/contracts";
import type { WorkspaceRepository } from "./repository.js";
import {
  buildDocumentCard,
  notFound,
  validateNodeInput,
  WorkspaceValidationError,
} from "./types.js";

const INSTANCE = "/api/v1/notebooks/{notebookId}/nodes";

/**
 * Node CRUD for the notebook graph (FR-031).
 *
 * Every entry point resolves ownership through the repository's tenant predicate before
 * any read or write; an unowned notebook or node surfaces as NOTEBOOK_NOT_FOUND (404),
 * never 403 — sealed as M4-PM-001 to avoid confirming another tenant's ids exist.
 */
export class NodeService {
  constructor(private readonly repository: WorkspaceRepository) {}

  async create(userId: string, input: CreateNodeInput): Promise<NotebookNodeDTO> {
    const validation = validateNodeInput({
      kind: input.kind,
      title: input.title,
      content: input.content,
      document_id: input.document_id,
    });
    if (!validation.ok) {
      throw new WorkspaceValidationError(validation.reason, validation.issues);
    }

    if (!(await this.repository.notebookExists(userId, input.notebook_id))) {
      if (process.env.NODE_ENV !== "test") {
        console.warn(
          JSON.stringify({
            event: "workspace.tenant_predicate_zero_rows",
            level: "WARN",
            user_id: userId,
            scope_kind: "notebook",
          })
        );
      }
      throw notFound(INSTANCE);
    }

    if (input.parent_id) {
      const parent = await this.repository.findNode(userId, input.notebook_id, input.parent_id);
      if (!parent) {
        if (process.env.NODE_ENV !== "test") {
          console.warn(
            JSON.stringify({
              event: "workspace.tenant_predicate_zero_rows",
              level: "WARN",
              user_id: userId,
              scope_kind: "node",
            })
          );
        }
        throw notFound(INSTANCE);
      }
    }

    const row = await this.repository.insertNode(userId, {
      notebook_id: input.notebook_id,
      parent_id: input.parent_id ?? null,
      kind: input.kind,
      title: input.title.trim(),
      content: input.content ?? null,
      document_id: input.document_id ?? null,
      position: input.position ?? 0,
    });

    if (process.env.NODE_ENV !== "test") {
      console.info(
        JSON.stringify({
          event: "workspace.node_created",
          level: "INFO",
          user_id: userId,
          notebook_id: input.notebook_id,
          node_id: row.id,
        })
      );
    }

    return this.toDto(row);
  }

  async get(userId: string, notebookId: string, nodeId: string): Promise<NotebookNodeDTO> {
    const row = await this.repository.findNode(userId, notebookId, nodeId);
    if (!row) {
      if (process.env.NODE_ENV !== "test") {
        console.warn(
          JSON.stringify({
            event: "workspace.tenant_predicate_zero_rows",
            level: "WARN",
            user_id: userId,
            scope_kind: "node",
          })
        );
      }
      throw notFound(INSTANCE);
    }
    return this.toDto(row);
  }

  async list(userId: string, notebookId: string, parentId?: string | null): Promise<NotebookNodeDTO[]> {
    if (!(await this.repository.notebookExists(userId, notebookId))) {
      if (process.env.NODE_ENV !== "test") {
        console.warn(
          JSON.stringify({
            event: "workspace.tenant_predicate_zero_rows",
            level: "WARN",
            user_id: userId,
            scope_kind: "notebook",
          })
        );
      }
      throw notFound(INSTANCE);
    }
    const rows = await this.repository.listNodes(userId, notebookId, parentId);
    return rows.map((row) => this.toDto(row));
  }

  async remove(userId: string, notebookId: string, nodeId: string): Promise<{ edges_removed: number }> {
    const row = await this.repository.findNode(userId, notebookId, nodeId);
    if (!row) {
      if (process.env.NODE_ENV !== "test") {
        console.warn(
          JSON.stringify({
            event: "workspace.tenant_predicate_zero_rows",
            level: "WARN",
            user_id: userId,
            scope_kind: "node",
          })
        );
      }
      throw notFound(INSTANCE);
    }

    const edgesBefore = await this.repository.countEdgesForNode(userId, notebookId, nodeId);
    const deleted = await this.repository.deleteNode(userId, notebookId, nodeId);
    if (!deleted) {
      throw notFound(INSTANCE);
    }

    if (process.env.NODE_ENV !== "test") {
      console.info(
        JSON.stringify({
          event: "workspace.node_deleted",
          level: "INFO",
          user_id: userId,
          notebook_id: notebookId,
          node_id: nodeId,
        })
      );
    }

    const edgesAfter = await this.repository.countEdgesForNode(userId, notebookId, nodeId);
    return { edges_removed: edgesBefore - edgesAfter };
  }

  private toDto(row: {
    id: string;
    notebook_id: string;
    user_id: string;
    parent_id: string | null;
    kind: string;
    title: string;
    content: string | null;
    document_id: string | null;
    position: number;
    created_at: string;
    updated_at: string;
  }): NotebookNodeDTO {
    const kind = row.kind as NodeKind;
    return {
      id: row.id,
      notebook_id: row.notebook_id,
      user_id: row.user_id,
      parent_id: row.parent_id,
      kind,
      title: row.title,
      content: row.content,
      document_id: row.document_id,
      position: row.position,
      card: buildDocumentCard({
        title: row.title,
        kind,
        content: row.content,
        document_id: row.document_id,
      }),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}