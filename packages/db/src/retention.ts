import type { Kysely } from "kysely";
import type { Database } from "./schema.js";

export interface IdleNotebookRecord {
  id: string;
  user_id: string;
  title: string;
  updated_at: string;
  idle_since?: string;
}

export interface TombstoneResult {
  notebookId: string;
  deletedAt: string;
  expiresAt: string;
  isTombstoned: boolean;
}

/**
 * Find notebooks that have been inactive for at least the specified threshold.
 * (updated_at < cutoffDate AND deleted_at IS NULL).
 */
export async function findIdleNotebooks(
  db: Kysely<Database>,
  cutoffDate: Date | string,
  limit = 50
): Promise<IdleNotebookRecord[]> {
  const cutoffStr = cutoffDate instanceof Date ? cutoffDate.toISOString() : cutoffDate;

  const rows = await db
    .selectFrom("notebooks")
    .select(["id", "user_id", "title", "updated_at", "idle_since"])
    .where("deleted_at", "is", null)
    .where("updated_at", "<", cutoffStr)
    .limit(limit)
    .execute();

  return rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    title: r.title,
    updated_at: r.updated_at,
    idle_since: r.idle_since,
  }));
}

/**
 * Cascades deletion of relational child elements (edges, nodes) and marks the notebook
 * record as tombstoned with a 30-day retention countdown (BR-040, BR-044).
 */
export async function cascadeTombstoneNotebook(
  db: Kysely<Database>,
  notebookId: string,
  tombstoneTtlDays = 30
): Promise<TombstoneResult | null> {
  const now = new Date();
  const deletedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + tombstoneTtlDays * 86_400_000).toISOString();

  return await db.transaction().execute(async (trx) => {
    // 1. Delete child edges
    await trx
      .deleteFrom("notebook_edges")
      .where("notebook_id", "=", notebookId)
      .execute();

    // 2. Delete child nodes
    await trx
      .deleteFrom("notebook_nodes")
      .where("notebook_id", "=", notebookId)
      .execute();

    // 3. Mark notebook as tombstoned via deleted_at (M1 schema)
    const updated = await trx
      .updateTable("notebooks")
      .set({
        deleted_at: deletedAt,
      })
      .where("id", "=", notebookId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (Number(updated.numUpdatedRows) === 0) {
      return null;
    }

    return {
      notebookId,
      deletedAt,
      expiresAt,
      isTombstoned: true,
    };
  });
}

/**
 * Hard-purges notebooks whose tombstone expiry has elapsed (deleted_at < NOW - 30 days).
 */
export async function hardPurgeExpiredNotebooks(
  db: Kysely<Database>,
  tombstoneRetentionDays = 30,
  referenceNow = new Date()
): Promise<number> {
  const cutoffStr = new Date(
    referenceNow.getTime() - tombstoneRetentionDays * 86_400_000
  ).toISOString();

  const result = await db
    .deleteFrom("notebooks")
    .where("deleted_at", "is not", null)
    .where("deleted_at", "<", cutoffStr)
    .executeTakeFirst();

  return Number(result.numDeletedRows);
}

/**
 * Check if a notebook is tombstoned or active.
 */
export async function getNotebookTombstoneStatus(
  db: Kysely<Database>,
  notebookId: string,
  tombstoneTtlDays = 30
): Promise<{
  exists: boolean;
  isTombstoned: boolean;
  deletedAt?: string;
  expiresAt?: string;
  title?: string;
}> {
  const row = await db
    .selectFrom("notebooks")
    .select(["id", "title", "deleted_at"])
    .where("id", "=", notebookId)
    .executeTakeFirst();

  if (!row) {
    return { exists: false, isTombstoned: false };
  }

  const isTombstoned = Boolean(row.deleted_at);
  const deletedAt = row.deleted_at ?? undefined;
  const expiresAt = deletedAt
    ? new Date(new Date(deletedAt).getTime() + tombstoneTtlDays * 86_400_000).toISOString()
    : undefined;

  return {
    exists: true,
    isTombstoned,
    deletedAt,
    expiresAt,
    title: row.title,
  };
}
