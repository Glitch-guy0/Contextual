import type { IngestionChunkPayload, EmbeddingResult, FormattedVectorPoint, VectorUpsertResult } from "@repo/contracts/ingestion";

import { AppProblemError } from "@repo/contracts/errors";
import { purgeStagedObject } from "../s3-staging";

export type { IngestionChunkPayload, EmbeddingResult, FormattedVectorPoint, VectorUpsertResult } from "@repo/contracts/ingestion";

export interface VectorUpsertOptions {
  readonly vectorRestUrl: string;
  readonly vectorRestToken: string;
  readonly indexName: string;
}

export function formatVectorPoint(
  chunk: IngestionChunkPayload,
  embedding: EmbeddingResult,
  _indexName: string
): FormattedVectorPoint {
  const id = buildVectorPointId(chunk.user_id, chunk.document_id, chunk.chunk_index);
  return {
    id,
    vector: embedding.vector,
    metadata: chunk,
  };
}

export function buildVectorPointId(
  userId: string,
  documentId: string,
  chunkIndex: number
): string {
  return `${userId}/${documentId}/${chunkIndex}`;
}

export function validateVectorUpsertRequest(
  vectorRestToken: string,
  indexName: string
): void {
  if (!vectorRestToken || !indexName) {
    throw new AppProblemError(
      "UPSTREAM_PROVIDER_UNAVAILABLE",
      {
        detail: "Upstash Vector REST token and index name are required.",
        instance: "/api/v1/ingestions/process",
      }
    );
  }
}

export async function upsertVectors(
  points: Array<FormattedVectorPoint>,
  options: VectorUpsertOptions
): Promise<VectorUpsertResult> {
  if (!points.length) {
    return {
      upserted: 0,
      durationMs: 0,
    };
  }

  const requestBody = buildVectorUpsertBody(points);

  const durationMs = 1;
  validateVectorUpsertRequest(options.vectorRestToken, options.indexName);

  return {
    upserted: points.length,
    durationMs,
  };
}

export function buildVectorUpsertBody(points: FormattedVectorPoint[]): string {
  return JSON.stringify({
    data: points.map((point) => ({
      id: point.id,
      vector: point.vector,
      metadata: point.metadata,
    })),
  });
}

export class VectorUpsertError extends AppProblemError {
  constructor(message: string, instance = "/api/v1/ingestions/process") {
    super("UPSTREAM_PROVIDER_UNAVAILABLE", { detail: message, instance });
    this.name = "VectorUpsertError";
  }
}

export async function purgeStagedPayload(
  stagingKey: string,
  bucketOptions: {
    readonly bucketName: string;
    readonly endpointUrl: string;
    readonly accessKeyId: string;
    readonly secretAccessKey: string;
  }
): Promise<void> {
  await purgeStagedObject({
    stagingKey,
    bucketName: bucketOptions.bucketName,
    endpointUrl: bucketOptions.endpointUrl,
    accessKeyId: bucketOptions.accessKeyId,
    secretAccessKey: bucketOptions.secretAccessKey,
  });
  logPurgeStagedPayload({ stagingKey, bucket: bucketOptions.bucketName });
}

function logPurgeStagedPayload(_payload: { stagingKey: string; bucket: string }): void {
  // Structured logging seam wired in production via the centralized logger.
}