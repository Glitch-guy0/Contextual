/**
 * Canonical Maintenance Crons & Observability Contracts
 * Grounding: _documentation/planning/architecture/05-m7-autonomous-maintenance-and-observability.md
 * References: FR-015, FR-040..FR-042, BR-010..BR-012, BR-025..BR-027, BR-037..BR-040, BR-044, NFR-009, NFR-026, NFR-031
 */

export const HEADER_CORRELATION_ID = "x-correlation-id";
export const HEADER_TRACEPARENT = "traceparent";
export const HEADER_UPSTASH_SIGNATURE = "upstash-signature";

export type LogLevel = "debug" | "info" | "warn" | "error" | "critical";

export const LOG_LEVELS: readonly LogLevel[] = [
  "debug",
  "info",
  "warn",
  "error",
  "critical",
] as const;

export interface LogRecord {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly correlation_id: string;
  readonly service: string;
  readonly event: string;
  readonly payload?: Record<string, unknown>;
  readonly traceparent?: string;
}

export interface SpanContext {
  readonly traceId: string;
  readonly spanId: string;
  readonly traceFlags: number;
  readonly isRemote?: boolean;
}

export interface QStashWebhookPayload {
  readonly type: "daily_credit_reset" | "retention_sweep";
  readonly schedule_id?: string;
  readonly timestamp?: string;
  readonly dry_run?: boolean;
}

export interface CronExecutionResult {
  readonly status: "completed" | "skipped" | "failed";
  readonly processed: number;
  readonly idempotent_skips: number;
  readonly expired_credits?: number;
  readonly duration_ms: number;
  readonly timestamp: string;
  readonly error?: string;
}

export interface RetentionSweepSummary {
  readonly status: "completed" | "skipped" | "failed";
  readonly idle_notebooks_purged: number;
  readonly vectors_deleted: number;
  readonly tombstones_created: number;
  readonly expired_tombstones_purged: number;
  readonly duration_ms: number;
  readonly timestamp: string;
  readonly error?: string;
}

export interface TombstoneRecord {
  readonly notebookId: string;
  readonly userId: string;
  readonly title: string;
  readonly deletedAt: string;
  readonly expiresAt: string;
  readonly isTombstoned: boolean;
}

export interface HeartbeatPayload {
  readonly job: string;
  readonly status: "ok" | "degraded" | "down";
  readonly timestamp: string;
  readonly latency_ms?: number;
  readonly metadata?: Record<string, unknown>;
}

export interface RetentionSweepOptions {
  readonly idleDaysThreshold?: number;
  readonly tombstoneTtlDays?: number;
  readonly batchSize?: number;
  readonly dryRun?: boolean;
}

/** Runtime type guards and validators */

export function isValidLogLevel(level: unknown): level is LogLevel {
  return typeof level === "string" && (LOG_LEVELS as readonly string[]).includes(level);
}

/**
 * Validates standard W3C traceparent header format:
 * 00-{32 hex chars}-{16 hex chars}-{2 hex chars}
 */
export function isValidTraceparent(header: unknown): header is string {
  if (typeof header !== "string") return false;
  const match = header.match(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/);
  return match !== null;
}

export function assertQStashWebhookPayload(payload: unknown): asserts payload is QStashWebhookPayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("QStash webhook payload must be a non-null object");
  }

  const p = payload as Record<string, unknown>;
  if (p.type !== "daily_credit_reset" && p.type !== "retention_sweep") {
    throw new Error(`Invalid QStash webhook type: expected 'daily_credit_reset' or 'retention_sweep', got '${String(p.type)}'`);
  }

  if (p.schedule_id !== undefined && typeof p.schedule_id !== "string") {
    throw new Error("Optional schedule_id must be a string");
  }

  if (p.timestamp !== undefined && typeof p.timestamp !== "string") {
    throw new Error("Optional timestamp must be an ISO date-time string");
  }
}

export function assertRetentionSweepOptions(options: unknown): asserts options is RetentionSweepOptions {
  if (!options || typeof options !== "object") {
    throw new Error("Retention sweep options must be a non-null object");
  }

  const opt = options as Record<string, unknown>;
  if (opt.idleDaysThreshold !== undefined) {
    if (typeof opt.idleDaysThreshold !== "number" || opt.idleDaysThreshold < 1) {
      throw new Error("idleDaysThreshold must be a positive number >= 1");
    }
  }

  if (opt.tombstoneTtlDays !== undefined) {
    if (typeof opt.tombstoneTtlDays !== "number" || opt.tombstoneTtlDays < 1) {
      throw new Error("tombstoneTtlDays must be a positive number >= 1");
    }
  }

  if (opt.batchSize !== undefined) {
    if (typeof opt.batchSize !== "number" || opt.batchSize < 1 || opt.batchSize > 1000) {
      throw new Error("batchSize must be an integer between 1 and 1000");
    }
  }
}
