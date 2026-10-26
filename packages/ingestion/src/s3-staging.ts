import { sanitizeSensitiveData, AppProblemError } from "@repo/contracts/errors";
import type { ErrorCatalogueKey } from "@repo/contracts/error-catalog";
import type { PresignedUploadResponse } from "@repo/contracts/ingestion";

export type { PresignedUploadResponse } from "@repo/contracts/ingestion";

// S3 staging seams stay stub-only in this workspace so typecheck never depends on
// the AWS SDK. The real presign/purge paths will be wired once the upstream packages
// are installed.

export class StubS3Client {
  async send(_command: unknown): Promise<{ $metadata: unknown }> {
    return { $metadata: {} };
  }
}

const FIVE_MB_BYTES = 5_242_880;
const PRESIGN_EXPIRY_SECONDS = 300;

function logPresignRequested(_payload: {
  userId: string;
  filename: string;
  fileSizeBytes: number;
  contentType: string;
  bucketName: string;
}): void {
  // Structured logging seam wired in production via the centralized logger.
}

function logPresignIssued(_payload: { stagingKey: string; expiresInSeconds: number }): void {
  // Structured logging seam wired in production via the centralized logger.
}

function logPresignValidationFailed(_payload: { fileSizeBytes: number; contentType: string }): void {
  // Structured logging seam wired in production via the centralized logger.
}

export function sanitizeStagingKey(key: string): string {
  return sanitizeSensitiveData(key);
}

export async function createPresignedUploadUrl({
  userId,
  filename,
  fileSizeBytes,
  contentType,
  bucketName,
  endpointUrl,
  accessKeyId,
  secretAccessKey,
}: {
  userId: string;
  filename: string;
  fileSizeBytes: number;
  contentType: "application/pdf";
  bucketName: string;
  endpointUrl: string;
  accessKeyId: string;
  secretAccessKey: string;
}): Promise<PresignedUploadResponse> {
  if (fileSizeBytes > FIVE_MB_BYTES) {
    logPresignValidationFailed({ fileSizeBytes, contentType });
    throw new S3StagingError(
      "UPLOAD_SIZE_EXCEEDED",
      `File exceeds 5 MB ceiling. Provided ${fileSizeBytes} bytes.`,
      "/api/v1/ingestions/presign"
    );
  }

  if (contentType !== "application/pdf") {
    throw new S3StagingError(
      "UNSUPPORTED_MEDIA_TYPE",
      `Ingestion staging only supports application/pdf. Received ${contentType}.`,
      "/api/v1/ingestions/presign"
    );
  }

  const sanitizedFilename = sanitizeFilename(filename);
  const jobId = crypto.randomUUID();
  const stagingKey = `staging/${userId}/${jobId}/${sanitizedFilename}`;

  logPresignRequested({ userId, filename, fileSizeBytes, contentType, bucketName });

  const uploadUrl = `https://example.invalid/staging/${encodeURIComponent(stagingKey)}?Expires=${Date.now() + PRESIGN_EXPIRY_SECONDS * 1000}`;

  logPresignIssued({ stagingKey, expiresInSeconds: PRESIGN_EXPIRY_SECONDS });

  return {
    uploadUrl,
    stagingKey,
    expiresInSeconds: PRESIGN_EXPIRY_SECONDS,
  };
}

export async function purgeStagedObject({
  stagingKey,
  bucketName,
  endpointUrl,
  accessKeyId,
  secretAccessKey,
}: {
  stagingKey: string;
  bucketName: string;
  endpointUrl?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}): Promise<void> {
  logPurgedStagedObject({ stagingKey, bucketName });
}

function logPurgedStagedObject(_payload: { stagingKey: string; bucketName: string }): void {
  // Structured logging seam wired in production via the centralized logger.
}

function sanitizeFilename(filename: string): string {
  const safe = filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
  if (!safe.length) {
    return `upload_${crypto.randomUUID().slice(0, 8)}.pdf`;
  }
  return safe;
}

export class S3StagingError extends AppProblemError {
  constructor(key: ErrorCatalogueKey, message: string, instance = "/api/v1/ingestions/presign") {
    super(key, { detail: message, instance });
    this.name = "S3StagingError";
  }
}
