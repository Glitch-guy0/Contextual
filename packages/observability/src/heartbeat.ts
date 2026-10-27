import type { HeartbeatPayload } from "@repo/contracts";
import { getLogger } from "./logger.js";

export type HeartbeatStatus = "ok" | "degraded" | "down";

export interface HeartbeatOptions {
  latencyMs?: number;
  error?: string;
  metadata?: Record<string, unknown>;
  heartbeatUrl?: string;
}

export type HeartbeatListener = (payload: HeartbeatPayload) => void;

const heartbeatListeners = new Set<HeartbeatListener>();

/**
 * Register a listener for heartbeat events (useful for tests and synthetic monitors).
 */
export function onHeartbeat(listener: HeartbeatListener): () => void {
  heartbeatListeners.add(listener);
  return () => {
    heartbeatListeners.delete(listener);
  };
}

/**
 * Emit a heartbeat pulse recording job liveness and health status (NFR-031).
 */
export async function emitHeartbeat(
  jobName: string,
  status: HeartbeatStatus,
  options: HeartbeatOptions = {}
): Promise<HeartbeatPayload> {
  const metadata: Record<string, unknown> = {
    ...options.metadata,
  };
  if (options.error) {
    metadata.error = options.error;
  }

  const payload: HeartbeatPayload = {
    job: jobName,
    status,
    timestamp: new Date().toISOString(),
    latency_ms: options.latencyMs,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };

  // Structured JSON log via central logger
  const logger = getLogger("maintenance");
  if (status === "ok") {
    logger.info("cron.heartbeat", payload);
  } else if (status === "degraded") {
    logger.warn("cron.heartbeat", payload);
  } else {
    logger.error("cron.heartbeat", payload);
  }

  // Notify listeners
  for (const listener of heartbeatListeners) {
    try {
      listener(payload);
    } catch {
      // Ignore listener error
    }
  }

  // Optional external webhook ping with 500ms timeout guard
  const targetUrl =
    options.heartbeatUrl ??
    (typeof process !== "undefined" ? process.env.BETTER_STACK_HEARTBEAT_URL : undefined);

  if (targetUrl) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 500);

    try {
      await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch {
      // Fire-and-forget; never block or throw
    } finally {
      clearTimeout(timeout);
    }
  }

  return payload;
}
