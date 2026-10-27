import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { v4 as uuidv4 } from "uuid";
import type { Kysely } from "kysely";
import { getKyselyDb, closeKyselyDb, type Database } from "../../packages/db/src/index.js";
import {
  findIdleNotebooks,
  cascadeTombstoneNotebook,
  hardPurgeExpiredNotebooks,
} from "../../packages/db/src/retention.js";
import {
  RetentionSweeper,
  InMemoryVectorPurgeClient,
  createNotebookExpiredProblem,
  setLogDestination,
  onHeartbeat,
  type LogEntry,
  type HeartbeatPayload,
} from "../../packages/observability/src/index.js";

describe("Milestone M7: Story S7.5 — 7-Day Retention Cascade Sweeper & 30-Day Tombstone Engine", () => {
  let db: Kysely<Database>;
  let vectorClient: InMemoryVectorPurgeClient;
  let sweeper: RetentionSweeper;

  const testUserId = `user-retention-${uuidv4()}`;
  const activeNotebookId = uuidv4();
  const idleNotebookId = uuidv4();
  const expiredTombstoneId = uuidv4();

  let capturedLogs: LogEntry[] = [];
  let capturedHeartbeats: HeartbeatPayload[] = [];
  let removeHeartbeatListener: (() => void) | null = null;

  beforeAll(async () => {
    const connStr =
      process.env.DATABASE_URL ??
      "postgresql://contextual:contextual_local_only@127.0.0.1:5432/contextual";
    db = getKyselyDb(connStr);
    vectorClient = new InMemoryVectorPurgeClient();
    sweeper = new RetentionSweeper(db, vectorClient);

    setLogDestination((entry) => capturedLogs.push(entry));
    removeHeartbeatListener = onHeartbeat((hb) => capturedHeartbeats.push(hb));

    // Seed test user
    await db.insertInto("users").values({
      id: testUserId,
      email: `${testUserId}@example.com`,
    }).execute();

    const now = new Date();
    const tenDaysAgo = new Date(now.getTime() - 10 * 86_400_000).toISOString();
    const thirtyFiveDaysAgo = new Date(now.getTime() - 35 * 86_400_000).toISOString();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 86_400_000).toISOString();

    // 1. Active notebook (updated_at = NOW)
    await db.insertInto("notebooks").values({
      id: activeNotebookId,
      user_id: testUserId,
      title: "Active Research Notebook",
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }).execute();

    // 2. Idle notebook (updated_at = 10 days ago, idle >= 7 days)
    await db.insertInto("notebooks").values({
      id: idleNotebookId,
      user_id: testUserId,
      title: "Abandoned Research Notebook",
      created_at: tenDaysAgo,
      updated_at: tenDaysAgo,
      idle_since: tenDaysAgo,
      deleted_at: null,
    }).execute();

    // Seed child nodes and edges for the idle notebook
    const nodeId1 = uuidv4();
    const nodeId2 = uuidv4();
    await db.insertInto("notebook_nodes").values([
      {
        id: nodeId1,
        user_id: testUserId,
        notebook_id: idleNotebookId,
        parent_id: null,
        kind: "text",
        title: "Node 1",
        content: "Content 1",
        document_id: null,
        position: 0,
        created_at: tenDaysAgo,
        updated_at: tenDaysAgo,
      },
      {
        id: nodeId2,
        user_id: testUserId,
        notebook_id: idleNotebookId,
        parent_id: nodeId1,
        kind: "text",
        title: "Node 2",
        content: "Content 2",
        document_id: null,
        position: 1,
        created_at: tenDaysAgo,
        updated_at: tenDaysAgo,
      },
    ]).execute();

    await db.insertInto("notebook_edges").values({
      id: uuidv4(),
      user_id: testUserId,
      notebook_id: idleNotebookId,
      source_id: nodeId1,
      target_id: nodeId2,
      edge_type: "related",
      created_at: tenDaysAgo,
    }).execute();

    // Seed vectors in vector store
    vectorClient.seed(idleNotebookId, 8);
    expect(vectorClient.getVectorCount(idleNotebookId)).toBe(8);

    // 3. Pre-expired tombstoned notebook (deleted_at = 35 days ago, older than 30-day tombstone TTL)
    await db.insertInto("notebooks").values({
      id: expiredTombstoneId,
      user_id: testUserId,
      title: "Old Expired Notebook",
      created_at: thirtyFiveDaysAgo,
      updated_at: thirtyFiveDaysAgo,
      deleted_at: thirtyFiveDaysAgo,
    }).execute();
  });

  afterAll(async () => {
    setLogDestination(null);
    if (removeHeartbeatListener) {
      removeHeartbeatListener();
    }

    // Clean up test records
    try {
      await db.deleteFrom("notebook_edges").where("user_id", "=", testUserId).execute();
      await db.deleteFrom("notebook_nodes").where("user_id", "=", testUserId).execute();
      await db.deleteFrom("notebooks").where("user_id", "=", testUserId).execute();
      await db.deleteFrom("users").where("id", "=", testUserId).execute();
    } catch {
      // Suppress cleanup error
    }

    await closeKyselyDb();
  });

  it("findIdleNotebooks detects idle notebooks and ignores active ones", async () => {
    const cutoffDate = new Date(Date.now() - 7 * 86_400_000);
    const idleList = await findIdleNotebooks(db, cutoffDate);

    const foundIdle = idleList.find((n) => n.id === idleNotebookId);
    const foundActive = idleList.find((n) => n.id === activeNotebookId);

    expect(foundIdle).toBeDefined();
    expect(foundIdle!.title).toBe("Abandoned Research Notebook");
    expect(foundActive).toBeUndefined();
  });

  it("createNotebookExpiredProblem creates RFC 9457 HTTP 410 ProblemDocument (AC-7.2)", () => {
    const deletedAt = "2026-10-20T00:00:00.000Z";
    const expiresAt = "2026-11-19T00:00:00.000Z";

    const problem = createNotebookExpiredProblem(idleNotebookId, deletedAt, expiresAt, "corr-test-410");

    expect(problem.status).toBe(410);
    expect(problem.title).toBe("Notebook Expired");
    expect(problem.type).toBe("https://contextual.ai/errors/notebook-expired");
    expect(problem.code).toBe("NOTEBOOK_EXPIRED");
    expect(problem.instance).toBe(`/notebooks/${idleNotebookId}`);
    expect(problem.correlation_id).toBe("corr-test-410");
    expect(problem.deletion_timestamp).toBe(deletedAt);
    expect(problem.tombstone_expires_at).toBe(expiresAt);
  });

  it("executes full retention cascade sweep (BR-037..BR-040, BR-044)", async () => {
    const summary = await sweeper.executeRetentionSweep({
      idleDaysThreshold: 7,
      tombstoneTtlDays: 30,
    });

    expect(summary.status).toBe("completed");
    expect(summary.idle_notebooks_purged).toBeGreaterThanOrEqual(1);
    expect(summary.vectors_deleted).toBeGreaterThanOrEqual(8);
    expect(summary.tombstones_created).toBeGreaterThanOrEqual(1);
    expect(summary.expired_tombstones_purged).toBeGreaterThanOrEqual(1);

    // 1. Assert vectors in Upstash Vector were purged (BR-039)
    expect(vectorClient.getVectorCount(idleNotebookId)).toBe(0);

    // 2. Assert child relational nodes & edges were deleted (BR-040)
    const remainingNodes = await db
      .selectFrom("notebook_nodes")
      .select("id")
      .where("notebook_id", "=", idleNotebookId)
      .execute();
    expect(remainingNodes.length).toBe(0);

    const remainingEdges = await db
      .selectFrom("notebook_edges")
      .select("id")
      .where("notebook_id", "=", idleNotebookId)
      .execute();
    expect(remainingEdges.length).toBe(0);

    // 3. Assert notebook tombstone record in database (BR-044)
    const tombstonedRow = await db
      .selectFrom("notebooks")
      .select(["id", "deleted_at"])
      .where("id", "=", idleNotebookId)
      .executeTakeFirst();

    expect(tombstonedRow).toBeDefined();
    expect(tombstonedRow!.deleted_at).not.toBeNull();

    // 4. Assert pre-expired notebook was hard-purged from notebooks table
    const hardPurgedRow = await db
      .selectFrom("notebooks")
      .select("id")
      .where("id", "=", expiredTombstoneId)
      .executeTakeFirst();
    expect(hardPurgedRow).toBeUndefined();

    // 5. Assert structured log and green heartbeat pulse emitted
    expect(capturedLogs.some((l) => l.event === "cron.retention_sweep.completed")).toBe(true);
    expect(capturedHeartbeats.some((hb) => hb.job === "retention_sweep" && hb.status === "ok")).toBe(true);
  });

  it("checkNotebookAccess returns HTTP 410 ProblemDocument for tombstoned notebook", async () => {
    const access = await sweeper.checkNotebookAccess(idleNotebookId);

    expect(access.exists).toBe(true);
    expect(access.isTombstoned).toBe(true);
    expect(access.problem).toBeDefined();
    expect(access.problem!.status).toBe(410);
    expect(access.problem!.code).toBe("NOTEBOOK_EXPIRED");
    expect(access.problem!.type).toBe("https://contextual.ai/errors/notebook-expired");
  });

  it("checkNotebookAccess returns active status for non-tombstoned notebook", async () => {
    const access = await sweeper.checkNotebookAccess(activeNotebookId);

    expect(access.exists).toBe(true);
    expect(access.isTombstoned).toBe(false);
    expect(access.problem).toBeUndefined();
  });
});
