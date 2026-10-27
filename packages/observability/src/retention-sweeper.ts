import type { Kysely } from "kysely";
import type { Database } from "@repo/db";
import {
  findIdleNotebooks,
  cascadeTombstoneNotebook,
  hardPurgeExpiredNotebooks,
  getNotebookTombstoneStatus,
} from "@repo/db";
import {
  serializeProblemDetails,
  type ProblemDocument,
  type RetentionSweepOptions,
  type RetentionSweepSummary,
} from "@repo/contracts";
import { getLogger } from "./logger.js";
import { emitHeartbeat } from "./heartbeat.js";
import { getCorrelationId } from "./context.js";

export interface VectorPurgeClient {
  deleteByNotebookId(notebookId: string): Promise<{ deleted: number }>;
}

/**
 * In-memory vector client for tests and environments without live Upstash Vector credentials.
 */
export class InMemoryVectorPurgeClient implements VectorPurgeClient {
  private notebookVectors = new Map<string, string[]>();

  seed(notebookId: string, count: number): void {
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      ids.push(`vec_${notebookId}_${i}`);
    }
    this.notebookVectors.set(notebookId, ids);
  }

  getVectorCount(notebookId: string): number {
    return this.notebookVectors.get(notebookId)?.length ?? 0;
  }

  async deleteByNotebookId(notebookId: string): Promise<{ deleted: number }> {
    const existing = this.notebookVectors.get(notebookId);
    const count = existing ? existing.length : 0;
    this.notebookVectors.delete(notebookId);
    return { deleted: count };
  }
}

/**
 * Creates RFC 9457 HTTP 410 NOTEBOOK_EXPIRED ProblemDocument with tombstone timestamps (AC-7.2).
 */
export function createNotebookExpiredProblem(
  notebookId: string,
  deletedAt?: string,
  expiresAt?: string,
  correlationId?: string
): ProblemDocument {
  const corr = correlationId ?? getCorrelationId();

  return serializeProblemDetails("NOTEBOOK_EXPIRED", {
    detail: `Notebook '${notebookId}' has expired following 7 days of inactivity and was purged per platform retention policy.`,
    instance: `/notebooks/${notebookId}`,
    correlation_id: corr !== "none" ? corr : undefined,
    customExtensions: {
      deletion_timestamp: deletedAt ?? new Date().toISOString(),
      tombstone_expires_at: expiresAt ?? new Date(Date.now() + 30 * 86_400_000).toISOString(),
    },
  });
}

export class RetentionSweeper {
  private db: Kysely<Database>;
  private vectorClient: VectorPurgeClient;

  constructor(db: Kysely<Database>, vectorClient?: VectorPurgeClient) {
    this.db = db;
    this.vectorClient = vectorClient ?? new InMemoryVectorPurgeClient();
  }

  /**
   * Executes two-phase 7-day retention cascade sweep (BR-037..BR-040, BR-044).
   * 1. Detects idle notebooks (updated_at < NOW - 7 days).
   * 2. Phase A: Deletes vectors in Upstash Vector filtered by notebook_id (FM-702).
   * 3. Phase B: Drops child nodes & edges and sets 30-day tombstone in Neon Postgres.
   * 4. Hard purges tombstones older than 30 days.
   */
  async executeRetentionSweep(
    options: RetentionSweepOptions = {}
  ): Promise<RetentionSweepSummary> {
    const startTime = Date.now();
    const logger = getLogger("maintenance");

    const idleDaysThreshold = options.idleDaysThreshold ?? 7;
    const tombstoneTtlDays = options.tombstoneTtlDays ?? 30;
    const batchSize = options.batchSize ?? 50;

    const cutoffDate = new Date(Date.now() - idleDaysThreshold * 86_400_000);

    logger.info("cron.retention_sweep.started", {
      idle_threshold_days: idleDaysThreshold,
      tombstone_ttl_days: tombstoneTtlDays,
      cutoff_date: cutoffDate.toISOString(),
      dry_run: options.dryRun,
    });

    try {
      const idleNotebooks = await findIdleNotebooks(this.db, cutoffDate, batchSize);

      let totalVectorsDeleted = 0;
      let totalTombstonesCreated = 0;

      if (!options.dryRun) {
        for (const notebook of idleNotebooks) {
          // Phase A: Purge vector points in Upstash Vector
          const purgeResult = await this.vectorClient.deleteByNotebookId(notebook.id);
          totalVectorsDeleted += purgeResult.deleted;

          // Phase B: Cascade drop relational child records and mark tombstoned
          const tombstoneResult = await cascadeTombstoneNotebook(
            this.db,
            notebook.id,
            tombstoneTtlDays
          );

          if (tombstoneResult) {
            totalTombstonesCreated++;
          }
        }
      }

      // Hard-purge expired tombstones older than 30 days
      const expiredTombstonesPurged = options.dryRun
        ? 0
        : await hardPurgeExpiredNotebooks(this.db);

      const durationMs = Date.now() - startTime;

      const summary: RetentionSweepSummary = {
        status: "completed",
        idle_notebooks_purged: idleNotebooks.length,
        vectors_deleted: totalVectorsDeleted,
        tombstones_created: totalTombstonesCreated,
        expired_tombstones_purged: expiredTombstonesPurged,
        duration_ms: durationMs,
        timestamp: new Date().toISOString(),
      };

      logger.info("cron.retention_sweep.completed", {
        idle_notebooks: summary.idle_notebooks_purged,
        vectors_deleted: summary.vectors_deleted,
        tombstones_created: summary.tombstones_created,
        expired_purged: summary.expired_tombstones_purged,
        duration_ms: durationMs,
      });

      await emitHeartbeat("retention_sweep", "ok", {
        latencyMs: durationMs,
        metadata: {
          purged_count: summary.idle_notebooks_purged,
          vectors_deleted: summary.vectors_deleted,
          tombstones_created: summary.tombstones_created,
        },
      });

      return summary;
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : String(err);

      logger.error("cron.retention_sweep.failed", {
        error: errorMessage,
        duration_ms: durationMs,
      });

      await emitHeartbeat("retention_sweep", "down", {
        latencyMs: durationMs,
        error: errorMessage,
      });

      throw err;
    }
  }

  /**
   * Check access to a notebook. If tombstoned, generates HTTP 410 NOTEBOOK_EXPIRED ProblemDocument.
   */
  async checkNotebookAccess(notebookId: string): Promise<{
    isTombstoned: boolean;
    exists: boolean;
    problem?: ProblemDocument;
  }> {
    const status = await getNotebookTombstoneStatus(this.db, notebookId);

    if (!status.exists) {
      return { isTombstoned: false, exists: false };
    }

    if (status.isTombstoned) {
      return {
        isTombstoned: true,
        exists: true,
        problem: createNotebookExpiredProblem(notebookId, status.deletedAt, status.expiresAt),
      };
    }

    return { isTombstoned: false, exists: true };
  }
}
