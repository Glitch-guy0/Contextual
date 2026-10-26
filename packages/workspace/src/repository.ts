import type { Kysely } from "kysely";
import type { Database } from "@repo/db";

/** Resolved row shapes for notebook_nodes (Kysely unwraps ColumnType on select). */
export interface NodeRow {
  readonly id: string;
  readonly user_id: string;
  readonly notebook_id: string;
  readonly parent_id: string | null;
  readonly kind: "text" | "document";
  readonly title: string;
  readonly content: string | null;
  readonly document_id: string | null;
  readonly position: number;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Resolved row shapes for notebook_edges. */
export interface EdgeRow {
  readonly id: string;
  readonly user_id: string;
  readonly notebook_id: string;
  readonly source_id: string;
  readonly target_id: string;
  readonly edge_type: "cites" | "related";
  readonly created_at: string;
}

/**
 * Tenant-scoped persistence for the notebook graph.
 *
 * Every statement carries `user_id = ?` from the verified TenantContext. Ownership is
 * a predicate on the reading statement rather than a separate existence probe: one round
 * trip, no TOCTOU window (design §3.4, DSP-018). Input never supplies `user_id`.
 */
export class WorkspaceRepository {
  constructor(private readonly db: Kysely<Database>) {}

  private ownedNotebook(userId: string, notebookId: string) {
    return this.db
      .selectFrom("notebooks")
      .select("id")
      .where("id", "=", notebookId)
      .where("user_id", "=", userId)
      .where("deleted_at", "is", null);
  }

  async notebookExists(userId: string, notebookId: string): Promise<boolean> {
    const row = await this.ownedNotebook(userId, notebookId)
      .select("id")
      .executeTakeFirst();
    return row !== undefined;
  }

  async findNode(
    userId: string,
    notebookId: string,
    nodeId: string
  ): Promise<NodeRow | undefined> {
    return this.db
      .selectFrom("notebook_nodes")
      .selectAll()
      .where("id", "=", nodeId)
      .where("notebook_id", "=", notebookId)
      .where("user_id", "=", userId)
      .executeTakeFirst() as Promise<NodeRow | undefined>;
  }

  async listNodes(
    userId: string,
    notebookId: string,
    parentId?: string | null
  ): Promise<NodeRow[]> {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    let query = this.db
      .selectFrom("notebook_nodes")
      .selectAll()
      .where("notebook_id", "=", notebookId)
      .where("user_id", "=", userId)
      .orderBy("position")
      .orderBy("created_at");

    if (parentId === undefined) {
      query = query.where("parent_id", "is", null);
    } else if (parentId === null) {
      query = query.where("parent_id", "is", null);
    } else {
      query = query.where("parent_id", "=", parentId);
    }

    return query.execute() as Promise<NodeRow[]>;
  }

  async insertNode(userId: string, row: Omit<NodeRow, "id" | "created_at" | "updated_at" | "user_id">): Promise<NodeRow> {
    const inserted = await this.db
      .insertInto("notebook_nodes")
      .values({ ...row, user_id: userId })
      .returningAll()
      .executeTakeFirstOrThrow();
    return inserted as NodeRow;
  }

  async deleteNode(userId: string, notebookId: string, nodeId: string): Promise<boolean> {
    const deleted = await this.db
      .deleteFrom("notebook_nodes")
      .where("id", "=", nodeId)
      .where("notebook_id", "=", notebookId)
      .where("user_id", "=", userId)
      .returning("id")
      .execute();
    return deleted.length > 0;
  }

  async listEdges(userId: string, notebookId: string): Promise<EdgeRow[]> {
    return this.db
      .selectFrom("notebook_edges")
      .selectAll()
      .where("notebook_id", "=", notebookId)
      .where("user_id", "=", userId)
      .orderBy("created_at")
      .execute() as Promise<EdgeRow[]>;
  }

  async countEdgesForNode(userId: string, notebookId: string, nodeId: string): Promise<number> {
    const result = await this.db
      .selectFrom("notebook_edges")
      .select((eb) => eb.fn.countAll<number>().as("total"))
      .where("notebook_id", "=", notebookId)
      .where("user_id", "=", userId)
      .where((eb) => eb.or([eb("source_id", "=", nodeId), eb("target_id", "=", nodeId)]))
      .executeTakeFirst();
    return Number(result?.total ?? 0);
  }

  async findEdge(userId: string, notebookId: string, edgeId: string): Promise<EdgeRow | undefined> {
    return this.db
      .selectFrom("notebook_edges")
      .selectAll()
      .where("id", "=", edgeId)
      .where("notebook_id", "=", notebookId)
      .where("user_id", "=", userId)
      .executeTakeFirst() as Promise<EdgeRow | undefined>;
  }

  async findEdgeByEndpoints(
    userId: string,
    notebookId: string,
    sourceId: string,
    targetId: string,
    edgeType: string
  ): Promise<EdgeRow | undefined> {
    return this.db
      .selectFrom("notebook_edges")
      .selectAll()
      .where("source_id", "=", sourceId)
      .where("target_id", "=", targetId)
      .where("edge_type", "=", edgeType as "cites" | "related")
      .where("notebook_id", "=", notebookId)
      .where("user_id", "=", userId)
      .executeTakeFirst() as Promise<EdgeRow | undefined>;
  }

  async insertEdge(userId: string, row: Omit<EdgeRow, "id" | "created_at" | "user_id">): Promise<EdgeRow> {
    return this.db
      .insertInto("notebook_edges")
      .values({ ...row, user_id: userId })
      .returningAll()
      .executeTakeFirstOrThrow() as Promise<EdgeRow>;
  }

  async deleteEdge(userId: string, notebookId: string, edgeId: string): Promise<boolean> {
    const deleted = await this.db
      .deleteFrom("notebook_edges")
      .where("id", "=", edgeId)
      .where("notebook_id", "=", notebookId)
      .where("user_id", "=", userId)
      .returning("id")
      .execute();
    return deleted.length > 0;
  }

  async countOwnedNotebookRows(userId: string, notebookId: string): Promise<number> {
    const result = await this.db
      .selectFrom("notebook_nodes")
      .select((eb) => eb.fn.countAll<number>().as("total"))
      .where("notebook_id", "=", notebookId)
      .where("user_id", "=", userId)
      .executeTakeFirst();
    return Number(result?.total ?? 0);
  }
}