// Public package surface for @repo/ingestion.
// Types that belong to the workspace contract are imported from @repo/contracts/ingestion
// so downstream packages always resolve a single canonical shape; package-specific
// runtime helpers and error classes stay local to this package.

import { AppProblemError } from "@repo/contracts/errors";

// === Workspace contract types (additive, from @repo/contracts/ingestion) ===
export type {
  SourceType,
  PresignedUploadRequest,
  PresignedUploadResponse,
  SubmitIngestionRequest,
  IngestionJobAccepted,
  IngestionJobPayload,
  IngestionResult,
  TextChunk,
  IngestionChunkPayload,
  ProgressState,
  ProgressEvent,
  RefundResult,
  FailureReason,
  PdfExtractOptions,
  ExtractedPdfResult,
  ExtractedYouTubeResult,
  TranscriptSegment,
  ExtractedWebResult,
  EmbeddingResult,
  VectorUpsertResult,
  FormattedVectorPoint,
} from "@repo/contracts/ingestion";

// === Extractors ===
export {
  extractPdf,
  validatePdfResult,
  checkPdfPageLimit,
  PdfExtractionError,
  extractYouTubeTranscript,
  validateYouTubeResult,
  YouTubeExtractionError,
  extractWebPage,
  validateWebResult,
  WebExtractionError,
} from "./extractors/index";

// === Chunker ===
export { ChunkerError, chunkText } from "./chunker";
export type { ChunkerOptions } from "./chunker";

// === Embedding ===
export {
  EmbeddingError,
  generateEmbedding,
  generateEmbeddingFallback,
  padEmbeddingVectorTo,
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_EMBEDDING_DIMENSIONS,
  FALLBACK_EMBEDDING_DIMENSIONS,
} from "./embedding";
export type { EmbeddingOptions } from "./embedding";

// === Vector upsert ===
export {
  VectorUpsertError,
  formatVectorPoint,
  upsertVectors,
  buildVectorPointId,
  purgeStagedPayload,
  buildVectorUpsertBody,
  validateVectorUpsertRequest,
} from "./vector/upsert";
export type { VectorUpsertOptions } from "./vector/upsert";

// === S3 staging ===
export {
  S3StagingError,
  createPresignedUploadUrl,
  sanitizeStagingKey,
  purgeStagedObject,
} from "./s3-staging";

// === Queue dispatch ===
export {
  QueueDispatchError,
  dispatchIngestionTask,
  buildProcessWebhookPayload,
  createIngestionJobAccepted,
  createQstashWebhookHandler,
  verifyQstashSignature,
} from "./queue/dispatch";
export type { QueueDispatchOptions } from "./queue/dispatch";

// === Progress ===
export {
  ProgressStreamError,
  streamProgress,
  createProgressState,
  serializeSseEvent,
  deserializeSseEvent,
} from "./progress/sse";
export type { ProgressStore, SseProgressOptions } from "./progress/sse";

// === Compensation ===
export {
  refundCreditsOnFailure,
  compensateOnFailure,
  markJobFailed,
  createCompensationError,
} from "./compensation/refund";
export type { RefundOptions } from "./compensation/refund";
export { REFUND_SCRIPT_LUA, COMPENSATE_ON_FAILURE_LUA } from "./compensation/refund-lua";

// === Cross-cutting contracts ===
export {
  AppProblemError,
  createProblemDetails,
  serializeProblemDetails,
  sanitizeSensitiveData,
  createRetryResult,
  contractRetryPolicyFromConfig,
  FAILURE_REASON_NAMESPACE,
  validateFailureReason,
} from "@repo/contracts/errors";
export type {
  ValidationErrorItem,
  QuotaExtension,
  ProblemDocument,
  RetryResult,
  ContractRetryPolicy,
  SerializeProblemParams,
} from "@repo/contracts/errors";
export type { RetryResult as ContractIngestionRetryResult } from "@repo/contracts/ingestion";

// === Local error overrides ===
export class CompensationError extends AppProblemError {
  constructor(message: string, instance = "/api/v1/ingestions/process") {
    super("INTERNAL_SERVER_ERROR", { detail: message, instance });
    this.name = "CompensationError";
  }
}