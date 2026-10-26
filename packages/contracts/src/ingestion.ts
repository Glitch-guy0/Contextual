export type SourceType = "pdf" | "youtube" | "web";

export interface PresignedUploadRequest {
  readonly filename: string;
  readonly fileSizeBytes: number;
  readonly contentType: "application/pdf";
}

export interface PresignedUploadResponse {
  readonly uploadUrl: string;
  readonly stagingKey: string;
  readonly expiresInSeconds: number;
}

export interface SubmitIngestionRequest {
  readonly notebookId: string;
  readonly sourceType: SourceType;
  readonly sourceValue: string;
  readonly title?: string;
}

export interface IngestionJobAccepted {
  readonly jobId: string;
  readonly progressStreamUrl: string;
  readonly status: "accepted";
}

export interface IngestionJobPayload {
  readonly jobId: string;
  readonly tenantId: string;
  readonly notebookId: string;
  readonly sourceType: SourceType;
  readonly sourceValue: string;
  readonly stagingKey: string;
  readonly title?: string;
}

export interface IngestionResult {
  readonly job_id: string;
  readonly status: "completed" | "failed";
  readonly chunks_indexed: number;
  readonly failure_reason?: string;
}

export interface TextChunk {
  readonly chunkIndex: number;
  readonly text: string;
  readonly charStart: number;
  readonly charEnd: number;
  readonly page?: number | null;
  readonly timestampSeconds?: number | null;
}

export interface IngestionChunkPayload {
  readonly user_id: string;
  readonly document_id: string;
  readonly notebook_id: string;
  readonly source_type: SourceType;
  readonly title: string;
  readonly chunk_index: number;
  readonly char_start: number;
  readonly char_end: number;
  readonly page_number?: number | null;
  readonly timestamp_seconds?: number | null;
  readonly text: string;
}

export type FailureReason =
  | "PASSWORD_PROTECTED"
  | "NO_TEXT_LAYER"
  | "PAGE_LIMIT_EXCEEDED"
  | "SOURCE_NOT_FOUND"
  | "TRANSCRIPT_DISABLED"
  | "CRAWL_FAILED"
  | "NO_READABLE_CONTENT"
  | "EMBEDDING_PROVIDER_UNAVAILABLE"
  | "VECTOR_UPSERT_FAILED";

export interface ProgressState {
  readonly job_id: string;
  readonly status: "processing" | "completed" | "failed";
  readonly percentage: number;
  readonly current_step: string;
  readonly pages_total?: number;
  readonly pages_processed?: number;
  readonly chunks_total?: number;
  readonly error_reason?: string | null;
  readonly last_event_id: number;
}

export interface ProgressEvent {
  readonly event: "progress" | "complete" | "error";
  readonly jobId: string;
  readonly percentage: number;
  readonly step?: string;
  readonly totalPages?: number;
  readonly processedPages?: number;
  readonly totalChunks?: number;
  readonly reason?: string;
  readonly refunded?: boolean;
  readonly lastEventId: number;
}

export interface RefundResult {
  readonly refunded: boolean;
  readonly newBalance: number;
}

export interface RetryResult {
  readonly accepted: boolean;
  readonly jobId: string;
  readonly noDebit: boolean;
}

export interface PdfExtractOptions {
  readonly title?: string;
}

export interface ExtractedPdfResult {
  readonly pageCount: number;
  readonly title: string;
  readonly text: string;
  readonly pages: string[];
}

export interface ExtractedYouTubeResult {
  readonly title: string;
  readonly transcript: string;
  readonly segments: TranscriptSegment[];
}

export interface TranscriptSegment {
  readonly startSeconds: number;
  readonly text: string;
}

export interface ExtractedWebResult {
  readonly title: string;
  readonly markdown: string;
  readonly readableText: string;
}

export interface EmbeddingResult {
  readonly model: string;
  readonly dimensions: number;
  readonly vector: number[];
}

export interface VectorUpsertResult {
  readonly upserted: number;
  readonly durationMs: number;
}

export interface FormattedVectorPoint {
  readonly id: string;
  readonly vector: number[];
  readonly metadata: IngestionChunkPayload;
}
