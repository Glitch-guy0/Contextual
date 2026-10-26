import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { Kysely, sql } from "kysely";
import { getKyselyDb, closeKyselyDb } from "../../packages/db/src/index.js";
import { WorkspaceRepository } from "../../packages/workspace/src/repository.js";
import { resolveCard, resolveCardsBatch, validateCardLatency, CARD_RESOLUTION_BUDGET_MS } from "../../packages/workspace/src/cards.js";
import { AppProblemError } from "../../packages/contracts/src/errors.js";
import { v4 as uuidv4 } from "uuid";

describe("Milestone M4 — Story S4.4: Document Card Resolution Under 10ms Budget", () => {
  let db: Kysely<any>;
  let repo: WorkspaceRepository;

  beforeAll(async () => {
    db = getKyselyDb("postgresql://contextual:contextual_local_only@127.0.0.1:5432/contextual");
    // Ensure notebook_nodes and notebook_edges tables exist (M4 migration)
    await db.schema
      .createTable("notebook_nodes", (col) => col)
      .ifNotExists()
      .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
      .addColumn("user_id", "varchar(128)", (c) => c.notNull().references("users.id").onDelete("cascade"))
      .addColumn("notebook_id", "uuid", (c) => c.notNull().references("notebooks.id").onDelete("cascade"))
      .addColumn("parent_id", "uuid")
      .addColumn("kind", "varchar(16)", (c) => c.notNull().check(sql`kind IN ('text', 'document')`))
      .addColumn("title", "varchar(255)", (c) => c.notNull())
      .addColumn("content", "text")
      .addColumn("document_id", "uuid")
      .addColumn("position", "integer", (c) => c.notNull().defaultTo(0))
      .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
      .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
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
      .createTable("notebook_edges", (col) => col)
      .ifNotExists()
      .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
      .addColumn("user_id", "varchar(128)", (c) => c.notNull().references("users.id").onDelete("cascade"))
      .addColumn("notebook_id", "uuid", (c) => c.notNull().references("notebooks.id").onDelete("cascade"))
      .addColumn("source_id", "uuid", (c) => c.notNull().references("notebook_nodes.id").onDelete("cascade"))
      .addColumn("target_id", "uuid", (c) => c.notNull().references("notebook_nodes.id").onDelete("cascade"))
      .addColumn("edge_type", "varchar(16)", (c) => c.notNull().check(sql`edge_type IN ('cites', 'related')`))
      .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
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

    repo = new WorkspaceRepository(db);
  });

  afterAll(async () => {
    await closeKyselyDb();
  });

  test("TC-S4.4.1: resolveCard returns null for unowned node", async () => {
    const userId = `user-${uuidv4()}`;

    await db.insertInto("users").values({
      id: userId,
      email: `${userId}@example.com`,
    }).execute();

    const notebookId = uuidv4();

    await db
      .insertInto("notebooks")
      .values({ id: notebookId, user_id: userId, title: "Test", created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .execute();

    const { card, elapsedMs, found } = await resolveCard(repo, userId, notebookId, uuidv4());
    expect(card).toBeNull();
    expect(found).toBe(false);
    expect(elapsedMs).toBeLessThan(100);
  });

  test("TC-S4.4.2: resolveCard returns card for owned node", async () => {
    const userId = `user-${uuidv4()}`;

    await db.insertInto("users").values({
      id: userId,
      email: `${userId}@example.com`,
    }).execute();

    const notebookId = uuidv4();

    await db
      .insertInto("notebooks")
      .values({ id: notebookId, user_id: userId, title: "Test", created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .execute();

    const row = await repo.insertNode(userId, {
      notebook_id: notebookId,
      parent_id: null,
      kind: "document",
      title: "Test Paper",
      content: "This is a 12-page paper about machine learning.",
      document_id: uuidv4(),
      position: 0,
    });

    const { card, elapsedMs, found } = await resolveCard(repo, userId, notebookId, row.id);
    expect(found).toBe(true);
    expect(card).not.toBeNull();
    expect(card?.title).toBe("Test Paper");
    expect(card?.page_count).toBeGreaterThanOrEqual(1);
    expect(card?.preview.length).toBeLessThanOrEqual(500);
    expect(elapsedMs).toBeLessThan(CARD_RESOLUTION_BUDGET_MS * 10);
  });

  test("TC-S4.4.3: resolveCardsBatch p95 latency", async () => {
    const userId = `user-${uuidv4()}`;

    await db.insertInto("users").values({
      id: userId,
      email: `${userId}@example.com`,
    }).execute();

    const notebookId = uuidv4();

    await db
      .insertInto("notebooks")
      .values({ id: notebookId, user_id: userId, title: "Test", created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .execute();

    const nodeIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const row = await repo.insertNode(userId, {
        notebook_id: notebookId,
        parent_id: null,
        kind: "document",
        title: `Paper ${i}`,
        content: `Content ${i} with multiple pages`,
        document_id: uuidv4(),
        position: i,
      });
      nodeIds.push(row.id);
    }

    const textRow = await repo.insertNode(userId, {
      notebook_id: notebookId,
      parent_id: null,
      kind: "text",
      title: "Text Note",
      content: "Just some text",
      document_id: null,
      position: 5,
    });
    nodeIds.push(textRow.id);

    const { results, p95LatencyMs } = await resolveCardsBatch(repo, userId, notebookId, nodeIds);

    expect(results.length).toBe(6);
    expect(p95LatencyMs).toBeLessThan(CARD_RESOLUTION_BUDGET_MS * 5);

    results.forEach((r) => {
      expect(r.elapsedMs).toBeDefined();
      expect(r.found).toBe(true);
    });
  });

  test("TC-S4.4.4: validateCardLatency detects budget violations", () => {
    const result1 = validateCardLatency(5);
    expect(result1.withinBudget).toBe(true);
    expect(result1.exceededByMs).toBe(0);

    const result2 = validateCardLatency(15);
    expect(result2.withinBudget).toBe(false);
    expect(result2.exceededByMs).toBe(5);
  });
});