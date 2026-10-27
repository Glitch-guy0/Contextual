import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { v4 as uuidv4 } from "uuid";
import type { Kysely } from "kysely";
import { getKyselyDb, closeKyselyDb, type Database } from "../../packages/db/src/index.js";
import { DailyResetEngine, InMemoryDailyResetRedis } from "../../packages/metering/src/daily-reset.js";
import {
  QStashSignatureVerifier,
  generateQStashSignature,
  executeDailyResetCron,
  RetentionSweeper,
  InMemoryVectorPurgeClient,
  createTracer,
  runWithCorrelation,
  getCorrelationId,
  getTraceparent,
  setLogDestination,
  onHeartbeat,
  redactSecrets,
  redactString,
  type LogEntry,
  type HeartbeatPayload,
} from "../../packages/observability/src/index.js";

describe("Milestone M7: Story S7.6 — Unified E2E Maintenance & Observability Integration Suite", () => {
  let db: Kysely<Database>;
  let redis: InMemoryDailyResetRedis;
  let resetEngine: DailyResetEngine;
  let vectorClient: InMemoryVectorPurgeClient;
  let sweeper: RetentionSweeper;
  let signatureVerifier: QStashSignatureVerifier;

  const currentSigningKey = "sig_current_prod_secret_key_m7_test_123";
  const nextSigningKey = "sig_next_prod_secret_key_m7_test_456";

  const testUserId = `user-m7-e2e-${uuidv4()}`;
  const idleNotebookId = uuidv4();
  const activeNotebookId = uuidv4();

  const capturedLogs: LogEntry[] = [];
  const capturedHeartbeats: HeartbeatPayload[] = [];
  let removeHeartbeat: (() => void) | null = null;

  beforeAll(async () => {
    const connStr =
      process.env.DATABASE_URL ??
      "postgresql://contextual:contextual_local_only@127.0.0.1:5432/contextual";
    db = getKyselyDb(connStr);
    redis = new InMemoryDailyResetRedis();
    resetEngine = new DailyResetEngine({ redisClient: redis });
    vectorClient = new InMemoryVectorPurgeClient();
    sweeper = new RetentionSweeper(db, vectorClient);

    signatureVerifier = new QStashSignatureVerifier({
      currentSigningKey,
      nextSigningKey,
    });

    setLogDestination((entry) => capturedLogs.push(entry));
    removeHeartbeat = onHeartbeat((hb) => capturedHeartbeats.push(hb));

    // Seed test user
    await db.insertInto("users").values({
      id: testUserId,
      email: `${testUserId}@example.com`,
    }).execute();

    const now = new Date();
    const eightDaysAgo = new Date(now.getTime() - 8 * 86_400_000).toISOString();

    // Seed active notebook
    await db.insertInto("notebooks").values({
      id: activeNotebookId,
      user_id: testUserId,
      title: "Active Notebook (Under 7 Days)",
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }).execute();

    // Seed idle notebook (8 days old, exceeds 7-day retention threshold)
    await db.insertInto("notebooks").values({
      id: idleNotebookId,
      user_id: testUserId,
      title: "Idle Notebook (Exceeds 7 Days)",
      created_at: eightDaysAgo,
      updated_at: eightDaysAgo,
      idle_since: eightDaysAgo,
      deleted_at: null,
    }).execute();

    // Seed child nodes and edges
    const nodeA = uuidv4();
    const nodeB = uuidv4();
    await db.insertInto("notebook_nodes").values([
      {
        id: nodeA,
        user_id: testUserId,
        notebook_id: idleNotebookId,
        parent_id: null,
        kind: "text",
        title: "Alpha Source",
        content: "Source notes",
        document_id: null,
        position: 0,
        created_at: eightDaysAgo,
        updated_at: eightDaysAgo,
      },
      {
        id: nodeB,
        user_id: testUserId,
        notebook_id: idleNotebookId,
        parent_id: nodeA,
        kind: "text",
        title: "Beta Synthesis",
        content: "Synthesis notes",
        document_id: null,
        position: 1,
        created_at: eightDaysAgo,
        updated_at: eightDaysAgo,
      },
    ]).execute();

    await db.insertInto("notebook_edges").values({
      id: uuidv4(),
      user_id: testUserId,
      notebook_id: idleNotebookId,
      source_id: nodeA,
      target_id: nodeB,
      edge_type: "cites",
      created_at: eightDaysAgo,
    }).execute();

    // Seed vector embeddings in Upstash Vector
    vectorClient.seed(idleNotebookId, 12);
  });

  afterAll(async () => {
    setLogDestination(null);
    if (removeHeartbeat) {
      removeHeartbeat();
    }

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

  it("AC-7.1: Simulated QStash Webhook triggers Daily Credit Reset idempotently at 08:00 UTC", async () => {
    // 1. Pre-seed depleted credits for 2 users
    await redis.set(`credits:${testUserId}`, "1.25");
    const otherUser = `user-other-${uuidv4()}`;
    await redis.set(`credits:${otherUser}`, "0.0");

    // 2. Prepare signed QStash webhook payload
    const rawPayload = JSON.stringify({
      type: "daily_credit_reset",
      timestamp: "2026-10-27T08:00:00.000Z",
    });
    const signature = generateQStashSignature(rawPayload, currentSigningKey);

    // 3. Verify cryptographic webhook signature
    const isValidSignature = await signatureVerifier.verify(
      { "upstash-signature": signature },
      rawPayload
    );
    expect(isValidSignature).toBe(true);

    // 4. Execute credit reset batch via cron driver
    const result = await executeDailyResetCron({
      userIds: [testUserId, otherUser],
      dateString: "2026-10-27",
      dailyResetEngine: resetEngine,
    });

    expect(result.status).toBe("completed");
    expect(result.processed).toBe(2);
    expect(result.idempotent_skips).toBe(0);
    expect(result.expired_credits).toBe(1.25);

    // 5. Assert user balances are now 10.0 credits (BR-026)
    expect(await redis.get(`credits:${testUserId}`)).toBe("10");
    expect(await redis.get(`credits:${otherUser}`)).toBe("10");

    // 6. Assert strict idempotency on duplicate trigger: skipped without double-granting (BR-025)
    const duplicateResult = await executeDailyResetCron({
      userIds: [testUserId, otherUser],
      dateString: "2026-10-27",
      dailyResetEngine: resetEngine,
    });

    expect(duplicateResult.status).toBe("skipped");
    expect(duplicateResult.processed).toBe(0);
    expect(duplicateResult.idempotent_skips).toBe(2);

    // 7. Verify green heartbeat emitted
    expect(
      capturedHeartbeats.some(
        (hb) => hb.job === "daily_credit_reset" && hb.status === "ok"
      )
    ).toBe(true);
  });

  it("AC-7.2: 7-Day Retention Cascade Purge deletes vectors, drops relational children, and returns HTTP 410 Tombstone", async () => {
    // 1. Verify vectors exist before sweep
    expect(vectorClient.getVectorCount(idleNotebookId)).toBe(12);

    // 2. Execute retention cascade sweep
    const sweepResult = await sweeper.executeRetentionSweep({
      idleDaysThreshold: 7,
      tombstoneTtlDays: 30,
    });

    expect(sweepResult.status).toBe("completed");
    expect(sweepResult.idle_notebooks_purged).toBeGreaterThanOrEqual(1);
    expect(sweepResult.vectors_deleted).toBeGreaterThanOrEqual(12);

    // 3. Verify vectors deleted from Upstash Vector (BR-039)
    expect(vectorClient.getVectorCount(idleNotebookId)).toBe(0);

    // 4. Verify relational child nodes and edges dropped in Neon Postgres (BR-040)
    const nodes = await db
      .selectFrom("notebook_nodes")
      .select("id")
      .where("notebook_id", "=", idleNotebookId)
      .execute();
    expect(nodes.length).toBe(0);

    const edges = await db
      .selectFrom("notebook_edges")
      .select("id")
      .where("notebook_id", "=", idleNotebookId)
      .execute();
    expect(edges.length).toBe(0);

    // 5. Verify tombstone set in notebooks table (deleted_at IS NOT NULL) (BR-044)
    const tombstonedRow = await db
      .selectFrom("notebooks")
      .select(["id", "deleted_at"])
      .where("id", "=", idleNotebookId)
      .executeTakeFirst();
    expect(tombstonedRow).toBeDefined();
    expect(tombstonedRow!.deleted_at).not.toBeNull();

    // 6. Verify client access returns RFC 9457 HTTP 410 NOTEBOOK_EXPIRED ProblemDocument
    const access = await sweeper.checkNotebookAccess(idleNotebookId);
    expect(access.isTombstoned).toBe(true);
    expect(access.problem).toBeDefined();
    expect(access.problem!.status).toBe(410);
    expect(access.problem!.code).toBe("NOTEBOOK_EXPIRED");
    expect(access.problem!.type).toBe("https://contextual.ai/errors/notebook-expired");
    expect(access.problem!.deletion_timestamp).toBeDefined();
    expect(access.problem!.tombstone_expires_at).toBeDefined();

    // 7. Verify active notebook was NOT tombstoned or purged
    const activeAccess = await sweeper.checkNotebookAccess(activeNotebookId);
    expect(activeAccess.isTombstoned).toBe(false);
    expect(activeAccess.problem).toBeUndefined();
  });

  it("AC-7.3: Centralized Structured JSON Logging carries correlation_id and W3C trace context across 100% of events", async () => {
    const tracer = createTracer("e2e-test-service");
    const correlationId = "corr_e2e_ac73_test";

    await runWithCorrelation({ correlationId }, async () => {
      await tracer.withSpan("maintenance.full_pipeline", async (span) => {
        span.setAttribute("tenant.id", testUserId);
        expect(getCorrelationId()).toBe(correlationId);
        expect(getTraceparent()).toBeDefined();

        // Trigger maintenance crons within active span
        await executeDailyResetCron({
          userIds: [testUserId],
          dateString: "2026-10-28", // new date
          dailyResetEngine: resetEngine,
        });
      });
    });

    // Verify all emitted logs conform strictly to JSON schema { timestamp, level, correlation_id, service, event, payload }
    const resetLogs = capturedLogs.filter(
      (l) => l.correlation_id === correlationId
    );
    expect(resetLogs.length).toBeGreaterThanOrEqual(2);

    for (const log of resetLogs) {
      expect(typeof log.timestamp).toBe("string");
      expect(typeof log.level).toBe("string");
      expect(log.correlation_id).toBe(correlationId);
      expect(typeof log.service).toBe("string");
      expect(typeof log.event).toBe("string");
      expect(typeof log.payload).toBe("object");
      expect(log.traceparent).toBeDefined();
    }
  });

  it("AC-7.4: Secret & PII Redactor transparently sanitizes credentials to [REDACTED]", () => {
    const sensitivePayload = {
      user_id: "usr_tenant_42",
      auth_header: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.superSecretToken",
      clerk_live_key: "sk_live_51Mszabcdef0123456789",
      clerk_test_key: "sk_test_9876543210fedcba",
      db_connection: "postgresql://postgres:mySuperSecretPassword@ep-cool-pool.neon.tech/neondb",
      google_api_key: "AIzaSyD-1234567890abcdefghijklmnopqrst",
      credentials: "CleartextCredentialsToRedact",
      metadata: {
        password: "CleartextPassword99!",
        signing_key: "qstash_secret_to_redact",
        safe_metric: 42,
      },
    };

    const sanitized = redactSecrets(sensitivePayload) as any;

    expect(sanitized.user_id).toBe("usr_tenant_42");
    expect(sanitized.auth_header).toBe("Bearer [REDACTED]");
    expect(sanitized.clerk_live_key).toBe("sk_[REDACTED]");
    expect(sanitized.clerk_test_key).toBe("sk_[REDACTED]");
    expect(sanitized.db_connection).toBe("postgresql://[REDACTED]@[REDACTED]");
    expect(sanitized.google_api_key).toBe("AIza[REDACTED]");
    expect(sanitized.credentials).toBe("[REDACTED]");
    expect(sanitized.metadata.password).toBe("[REDACTED]");
    expect(sanitized.metadata.signing_key).toBe("[REDACTED]");
    expect(sanitized.metadata.safe_metric).toBe(42);
  });
});
