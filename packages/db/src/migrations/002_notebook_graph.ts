import { type Kysely, sql } from "kysely";

/**
 * Migration 002: Notebook Graph (notebook_nodes, notebook_edges)
 * Expand-only: creates two new tables and their indexes. No existing column is
 * altered or dropped, so M1-M3 readers are unaffected and nothing needs contracting.
 * Reference: architecture/05-m4-notebook-workspace-and-domain-graph.md §3.3,
 * FR-031 (workspace), FR-032 (typed edges), FR-033 (document-backed nodes), BR-002.
 *
 * Non-obvious decisions (schema-orm-governance §10.2):
 * - user_id is denormalized onto both tables so the tenant guard is a single indexed
 *   `WHERE user_id = ?` predicate instead of a join through notebooks; that is what
 *   makes AC-4.3 structural rather than call-site-dependent.
 * - CHECK (edge_type IN ('cites','related')) mirrors the API union as defence-in-depth:
 *   the API validator produces the 400, the constraint guarantees the invariant for any
 *   future write path.
 * - ON DELETE CASCADE keeps graph deletion whole (FM-401 orphan-edge guard).
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("notebook_nodes")
    .ifNotExists()
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("user_id", "varchar(128)", (col) =>
      col.notNull().references("users.id").onDelete("cascade")
    )
    .addColumn("notebook_id", "uuid", (col) =>
      col.notNull().references("notebooks.id").onDelete("cascade")
    )
    .addColumn("parent_id", "uuid")
    .addColumn("kind", "varchar(16)", (col) =>
      col.notNull().check(sql`kind IN ('text', 'document')`)
    )
    .addColumn("title", "varchar(255)", (col) => col.notNull())
    .addColumn("content", "text")
    .addColumn("document_id", "uuid")
    .addColumn("position", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addCheckConstraint(
      "ck_notebook_nodes_document_requires_document_id",
      sql`NOT (kind = 'document') OR document_id IS NOT NULL`
    )
    .execute();

  await db.schema
    .createIndex("idx_nodes_tenant")
    .ifNotExists()
    .on("notebook_nodes")
    .columns(["user_id", "notebook_id"])
    .execute();

  await db.schema
    .createIndex("idx_nodes_parent")
    .ifNotExists()
    .on("notebook_nodes")
    .columns(["notebook_id", "parent_id"])
    .execute();

  await db.schema
    .createTable("notebook_edges")
    .ifNotExists()
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("user_id", "varchar(128)", (col) =>
      col.notNull().references("users.id").onDelete("cascade")
    )
    .addColumn("notebook_id", "uuid", (col) =>
      col.notNull().references("notebooks.id").onDelete("cascade")
    )
    .addColumn("source_id", "uuid", (col) =>
      col.notNull().references("notebook_nodes.id").onDelete("cascade")
    )
    .addColumn("target_id", "uuid", (col) =>
      col.notNull().references("notebook_nodes.id").onDelete("cascade")
    )
    .addColumn("edge_type", "varchar(16)", (col) =>
      col.notNull().check(sql`edge_type IN ('cites', 'related')`)
    )
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addCheckConstraint("ck_notebook_edges_no_self_edge", sql`source_id <> target_id`)
    .addUniqueConstraint("uq_notebook_edges_triple", ["source_id", "target_id", "edge_type"])
    .execute();

  await db.schema
    .createIndex("idx_edges_tenant")
    .ifNotExists()
    .on("notebook_edges")
    .columns(["user_id", "notebook_id"])
    .execute();

  await db.schema
    .createIndex("idx_edges_source")
    .ifNotExists()
    .on("notebook_edges")
    .column("source_id")
    .execute();

  await db.schema
    .createIndex("idx_edges_target")
    .ifNotExists()
    .on("notebook_edges")
    .column("target_id")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex("idx_edges_target").ifExists().execute();
  await db.schema.dropIndex("idx_edges_source").ifExists().execute();
  await db.schema.dropIndex("idx_edges_tenant").ifExists().execute();
  await db.schema.dropTable("notebook_edges").ifExists().cascade().execute();

  await db.schema.dropIndex("idx_nodes_parent").ifExists().execute();
  await db.schema.dropIndex("idx_nodes_tenant").ifExists().execute();
  await db.schema.dropTable("notebook_nodes").ifExists().cascade().execute();
}