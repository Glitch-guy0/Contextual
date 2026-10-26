// Public package surface for @repo/ingestion.
// Types that belong to the workspace contract are imported from @repo/contracts/ingestion
// so downstream packages always resolve a single canonical shape; package-specific
// runtime helpers and error classes stay local to this package.

// === Workspace contract types (additive, from @repo/contracts/ingestion) ===
export type {
  SourceType,
  PresignedUploadRequest,
  SubmitIngestionRequest,
  IngestionJobAccepted,
  IngestionJobPayload,
  IngestionResult,
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
export { extractPdf, validatePdfResult, checkPdfPageLimit, PdfExtractionError } from "./extractors/pdf";








export type { ExtractedPdfResult, PdfExtractOptions } from "@repo/contracts/ingestion";









export { extractYouTubeTranscript, validateYouTubeResult, YouTubeExtractionError } from "./extractors/youtube";








export type { ExtractedYouTubeResult, TranscriptSegment } from "@repo/contracts/ingestion";









export { extractWebPage, validateWebResult, WebExtractionError } from "./extractors/web";







export type { ExtractedWebResult } from "@repo/contracts/ingestion";










// === Chunker ===
export { ChunkerError, chunkText } from "./chunker";








// === Embedding ===
export { EmbeddingError, generateEmbedding, generateEmbeddingFallback, padEmbeddingVectorTo } from "./embedding";







export type { EmbeddingResult } from "@repo/contracts/ingestion";









// === Chunker ===
export {
  ChunkerError,
  chunkText,
} from "./chunker";







export type { TextChunk, IngestionChunkPayload, SourceType } from "@repo/contracts/ingestion";









// === Vector upsert ===
export {
  VectorUpsertError,
  formatVectorPoint,
  upsertVectors,
  buildVectorPointId,
  purgeStagedPayload,
  buildVectorUpsertBody,
} from "./vector/upsert";







export type { FormattedVectorPoint, VectorUpsertResult } from "./vector/upsert";







export type { IngestionChunkPayload, EmbeddingResult } from "@repo/contracts/ingestion";









export type { FormattedVectorPoint, VectorUpsertResult } from "@repo/contracts/ingestion";










// === S3 staging ===
export { S3StagingError, createPresignedUploadUrl, sanitizeStagingKey } from "./s3-staging";











// === Queue dispatch ===
export {
  QueueDispatchError,
  dispatchIngestionTask,
  buildProcessWebhookPayload,
  createIngestionJobAccepted,
  createQstashWebhookHandler,
  verifyQstashSignature,
} from "./queue/dispatch";








export type { IngestionJobAccepted, IngestionJobPayload } from "@repo/contracts/ingestion";







// === Progress ===
export {
  ProgressStreamError,
  streamProgress,
  createProgressState,
  serializeSseEvent,
  deserializeSseEvent,
  ProgressStore,
  SseProgressOptions,
} from "./progress/sse";








export type { ProgressEvent, ProgressState } from "@repo/contracts/ingestion";







// === Compensation ===
export { refundCreditsOnFailure, compensateOnFailure, markJobFailed, createCompensationError } from "./compensation/refund";








export type { RefundResult, FailureReason } from "@repo/contracts/ingestion";








export { REFUND_SCRIPT_LUA, COMPENSATE_ON_FAILURE_LUA } from "./compensation/refund-lua";









// === Cross-cutting contracts ===
export {
  AppProblemError,
  createProblemDetails,
  serializeProblemDetails,
  sanitizeSensitiveData,
  ValidationErrorItem,
  QuotaExtension,
  ProblemDocument,
  RetryResult,
  ContractRetryPolicy,
  createRetryResult,
  contractRetryPolicyFromConfig,
  FAILURE_REASON_NAMESPACE,
  validateFailureReason,
} from "@repo/contracts/errors";








export type { RetryResult, ContractRetryPolicy } from "@repo/contracts/errors";








export type { RetryResult as ContractIngestionRetryResult } from "@repo/contracts/ingestion";









// === Local error overrides ===
export class CompensationError extends AppProblemError {
  constructor(message: string, instance = "/api/v1/ingestions/process") {
    super("compensation-failed", { detail: message, instance });
    this.name = "CompensationError";
  }
}



export {
  ProgressStreamError,
  streamProgress,
  createProgressState,
  serializeSseEvent,
  deserializeSseEvent,
  ProgressStore,
  SseProgressOptions,
} from "./progress/sse";








export type { ProgressEvent, ProgressState } from "@repo/contracts/ingestion";







// === Compensation ===
export { refundCreditsOnFailure, compensateOnFailure, markJobFailed, createCompensationError } from "./compensation/refund";








export type { RefundResult, FailureReason } from "@repo/contracts/ingestion";








export { REFUND_SCRIPT_LUA, COMPENSATE_ON_FAILURE_LUA } from "./compensation/refund-lua";









// === Cross-cutting contracts ===
export {
  AppProblemError,
  createProblemDetails,
  serializeProblemDetails,
  sanitizeSensitiveData,
  ValidationErrorItem,
  QuotaExtension,
  ProblemDocument,
  RetryResult,
  ContractRetryPolicy,
  createRetryResult,
  contractRetryPolicyFromConfig,
  FAILURE_REASON_NAMESPACE,
  validateFailureReason,
} from "@repo/contracts/errors";








export type { RetryResult, ContractRetryPolicy } from "@repo/contracts/errors";








export type { RetryResult as ContractIngestionRetryResult } from "@repo/contracts/ingestion";









// === Local error overrides ===
export class CompensationError extends AppProblemError {
  constructor(message: string, instance = "/api/v1/ingestions/process") {
    super("compensation-failed", { detail: message, instance });
    this.name = "CompensationError";
  }
}

