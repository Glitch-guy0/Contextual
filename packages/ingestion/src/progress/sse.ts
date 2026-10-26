// Local alias keeps this package's typecheck stable during monorepo bootstrap.
import type { ProgressEvent, ProgressState } from "@repo/contracts/ingestion";
import { AppProblemError } from "@repo/contracts/errors";

export type { ProgressEvent, ProgressState } from "@repo/contracts/ingestion";

export interface ProgressStore {
  get(jobId: string): ProgressState | undefined;
  set(jobId: string, state: ProgressState): void;
  appendEvent(jobId: string, event: ProgressEvent): void;
  getEventsAfter(jobId: string, lastEventId: number): ProgressEvent[];
}

export interface SseProgressOptions {
  readonly jobId: string;
  readonly store: ProgressStore;
  readonly maxDurationMs?: number;
  readonly lastEventId?: string;
}

export async function* streamProgress(
  options: SseProgressOptions
): AsyncIterable<string> {
  const { jobId, store, maxDurationMs = 280_000, lastEventId } = options;
  const startMs = Date.now();
  let lastId = lastEventId ? Number(lastEventId) : 0;

  if (lastEventId) {
    const replay = store.getEventsAfter(jobId, lastId);
    for (const event of replay) {
      if (Date.now() - startMs > maxDurationMs) break;
      lastId = event.lastEventId;
      yield serializeSseEvent(event);
    }
  }

  while (Date.now() - startMs <= maxDurationMs) {
    const current = store.get(jobId);
    if (!current) break;
    if (current.status !== "processing") break;

    const event: ProgressEvent = {
      event: "progress",
      jobId: current.job_id,
      percentage: current.percentage,
      step: current.current_step,
      totalPages: current.pages_total,
      processedPages: current.pages_processed,
      totalChunks: current.chunks_total,
      reason: current.error_reason ?? undefined,
      lastEventId: current.last_event_id,
    };

    lastId = event.lastEventId;
    yield serializeSseEvent(event);

    const maybeFinal = store.get(jobId);
    if (!maybeFinal || maybeFinal.status !== "processing") break;

    logProgressEventEmitted({
      jobId,
      lastEventId: event.lastEventId,
      event: event.event,
      percentage: event.percentage,
    });

    await sleep(250);
  }

  const finalState = store.get(jobId);
  if (finalState) {
    const finalEvent: ProgressEvent = {
      event: finalState.status === "failed" ? "error" : "complete",
      jobId: finalState.job_id,
      percentage: finalState.percentage,
      step: finalState.current_step,
      reason: finalState.error_reason ?? undefined,
      lastEventId: finalState.last_event_id,
    };
    yield serializeSseEvent(finalEvent);
  }
}

export function serializeSseEvent(event: ProgressEvent): string {
  return [
    `id: ${event.lastEventId}`,
    `event: ${event.event}`,
    `data: ${JSON.stringify(event)}`,
    "",
  ].join("\n");
}

export function deserializeSseEvent(line: string): ProgressEvent | null {
  try {
    if (!line.startsWith("data: ")) return null;
    const payload = line.slice(6).trim();
    return JSON.parse(payload) as ProgressEvent;
  } catch {
    return null;
  }
}

export function createProgressState(params: {
  job_id: string;
  status: "processing" | "completed" | "failed";
  percentage: number;
  current_step: string;
  pages_total?: number;
  pages_processed?: number;
  chunks_total?: number;
  error_reason?: string | null;
  last_event_id: number;
}): ProgressState {
  return {
    job_id: params.job_id,
    status: params.status,
    percentage: params.percentage,
    current_step: params.current_step,
    pages_total: params.pages_total ?? undefined,
    pages_processed: params.pages_processed ?? undefined,
    chunks_total: params.chunks_total ?? undefined,
    error_reason: params.error_reason ?? null,
    last_event_id: params.last_event_id,
  };
}

export class ProgressStreamError extends AppProblemError {
  constructor(message: string, instance = "/api/v1/ingestions/process") {
    super("PROGRESS_STREAM_UNAVAILABLE", { detail: message, instance });
    this.name = "ProgressStreamError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logProgressEventEmitted(_payload: {
  jobId: string;
  lastEventId: number;
  event: string;
  percentage: number;
}): void {
  // Structured logging seam wired in production via the centralized logger.
}
