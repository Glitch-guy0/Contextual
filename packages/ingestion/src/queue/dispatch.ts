// Local alias keeps this package's typecheck stable during monorepo bootstrap.
import type { IngestionJobAccepted, IngestionJobPayload } from "@repo/contracts/ingestion";
import type { AppProblemError } from "@repo/contracts/errors";

// S3.2 seam: real QStash signature verification will be wired against the live
// Upstash signing key once the webhook handler is attached to the process route.
export function verifyQstashSignature(
  _requestBody: string,
  _signatureHeader: string,
  _signingKey: string
): void {
  throw new AppProblemError(
    "queue-dispatch-failed",
    { detail: "QStash signature verification is not wired in this workspace yet.", instance: "/api/v1/ingestions/process" }
  );
}

export function createIngestionJobAccepted(
  jobId: string,
  baseUrl: string
): IngestionJobAccepted {
  return {
    jobId,
    progressStreamUrl: `${baseUrl}/api/v1/ingestions/${jobId}/progress`,
    status: "accepted",
  };
}

export interface QueueDispatchOptions {
  qstashToken: string;
  qstashUrl: string;
  processEndpoint: string;
}

export async function dispatchIngestionTask(
  payload: IngestionJobPayload,
  options: QueueDispatchOptions
): Promise<IngestionJobAccepted> {
  qstashToken: string;
  qstashUrl: string;
  processEndpoint: string;
}

export async function dispatchIngestionTask(
  payload: IngestionJobPayload,
  options: QueueDispatchOptions
): Promise<IngestionJobAccepted> {
  const jobId = payload.jobId;
  const progressStreamUrl = `/api/v1/ingestions/${jobId}/progress`;

  await publishQStashTask(payload, options);

  return {
    jobId,
    progressStreamUrl,
    status: "accepted",
  };
}

async function publishQStashTask(
  payload: IngestionJobPayload,
  options: QueueDispatchOptions
): Promise<void> {
  const body = JSON.stringify({
    job_id: payload.jobId,
    tenant_id: payload.tenantId,
    notebook_id: payload.notebookId,
    source_type: payload.sourceType,
    source_value: payload.sourceValue,
    staging_key: payload.stagingKey,
    title: payload.title,
  });

  logDispatchRequested({
    jobId: payload.jobId,
    qstashUrl: options.qstashUrl,
    processEndpoint: options.processEndpoint,
  });

  // S3.2 seam: real QStash dispatch will be swapped for the signed task publisher.
  const qStashResponse = await fetch(`${options.qstashUrl}/v2/task`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.qstashToken}`,
      "Content-Type": "application/json",
      "Upstash-Prometheus-Metrics": "false",
    },
    body,
  });

  if (!qStashResponse.ok) {
    logDispatchFailed({ jobId: payload.jobId, status: qStashResponse.status });
    throw new AppProblemError(
      "queue-dispatch-failed",
      {
        detail: `QStash task publish failed with status ${qStashResponse.status}.`,
        instance: "/api/v1/ingestions",
      }
    );
  }

  logDispatchIssued({ jobId: payload.jobId, qstashUrl: options.qstashUrl });
}

function logDispatchRequested(_payload: {
  jobId: string;
  qstashUrl: string;
  processEndpoint: string;
}): void {
  // Structured logging seam wired in production via the centralized logger.
}

function logDispatchIssued(_payload: { jobId: string; qstashUrl: string }): void {
  // Structured logging seam wired in production via the centralized logger.
}

function logDispatchFailed(_payload: { jobId: string; status: number }): void {
  // Structured logging seam wired in production via the centralized logger.
}

export function buildProcessWebhookPayload(payload: IngestionJobPayload): string {
  return JSON.stringify(payload);
}

export class QueueDispatchError extends AppProblemError {
  constructor(message: string, instance = "/api/v1/ingestions") {
    super("queue-dispatch-failed", { detail: message, instance });
    this.name = "QueueDispatchError";
  }
}

export function createIngestionJobAccepted(
  jobId: string,
  baseUrl: string
): IngestionJobAccepted {
  return {
    jobId,
    progressStreamUrl: `${baseUrl}/api/v1/ingestions/${jobId}/progress`,
    status: "accepted",
  };
}

// S3.2 seam: the real QStash webhook handler will validate the signature, resolve
// the persisted IngestionJobPayload, and dispatch to the process worker.
export function createQstashWebhookHandler(
  _options: {
    verifySignature: typeof verifyQstashSignature;
    processPayload: (payload: IngestionJobPayload) => Promise<void>;
  }
): (requestBody: string, signatureHeader: string) => Promise<void> {
  return async (_requestBody, _signatureHeader) => {
    throw new AppProblemError(
      "queue-dispatch-failed",
      { detail: "QStash webhook handling is not wired in this workspace yet.", instance: "/api/v1/ingestions/process" }
    );
  };
}
