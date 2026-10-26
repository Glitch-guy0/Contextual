import { describe, expect, test } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

describe("Milestone M3: Transient Ingestion Scaffold & Contracts", () => {
  const rootDir = process.cwd();

  test("AC-3.1..AC-3.5: @repo/ingestion package and scaffold files exist", () => {
    expect(existsSync(join(rootDir, "packages/ingestion/package.json"))).toBe(true);
    expect(existsSync(join(rootDir, "packages/ingestion/src/index.ts"))).toBe(true);
    expect(existsSync(join(rootDir, "packages/ingestion/tsconfig.json"))).toBe(true);

    const indexContent = readFileSync(join(rootDir, "packages/ingestion/src/index.ts"), "utf-8");
    expect(indexContent).toContain("createPresignedUploadUrl");
    expect(indexContent).toContain("dispatchIngestionTask");
    expect(indexContent).toContain("streamProgress");
    expect(indexContent).toContain("refundCreditsOnFailure");
    expect(indexContent).toContain("CompensationError");
  });

  test("AC-3.1..AC-3.5: additive ingestion DTOs present in @repo/contracts", () => {
    expect(existsSync(join(rootDir, "packages/contracts/src/ingestion.ts"))).toBe(true);

    const ingestionContent = readFileSync(join(rootDir, "packages/contracts/src/ingestion.ts"), "utf-8");
    expect(ingestionContent).toContain("PresignedUploadRequest");
    expect(ingestionContent).toContain("IngestionJobAccepted");
    expect(ingestionContent).toContain("IngestionJobPayload");
    expect(ingestionContent).toContain("ProgressState");
    expect(ingestionContent).toContain("ProgressEvent");
    expect(ingestionContent).toContain("RefundResult");
    expect(ingestionContent).toContain("FailureReason");
    expect(ingestionContent).toContain("EmbeddingResult");
    expect(ingestionContent).toContain("VectorUpsertResult");
  });

  test("AC-3.5: atomic refund Lua script present in @repo/ingestion", () => {
    expect(existsSync(join(rootDir, "packages/ingestion/src/compensation/refund-lua.ts"))).toBe(true);

    const refundLua = readFileSync(
      join(rootDir, "packages/ingestion/src/compensation/refund-lua.ts"),
      "utf-8"
    );
    expect(refundLua).toContain("REFUND_SCRIPT_LUA");
    expect(refundLua).toContain("already_refunded");
    expect(refundLua).toContain("HSET");
    expect(refundLua).toContain("SET");
  });

  test("AC-3.1..AC-3.5: extractor error classes exist for PDF, YouTube, and web", () => {
    expect(existsSync(join(rootDir, "packages/ingestion/src/extractors/pdf.ts"))).toBe(true);
    expect(existsSync(join(rootDir, "packages/ingestion/src/extractors/youtube.ts"))).toBe(true);
    expect(existsSync(join(rootDir, "packages/ingestion/src/extractors/web.ts"))).toBe(true);
    expect(existsSync(join(rootDir, "packages/ingestion/src/extractors/index.ts"))).toBe(true);

    const pdf = readFileSync(join(rootDir, "packages/ingestion/src/extractors/pdf.ts"), "utf-8");
    const youtube = readFileSync(join(rootDir, "packages/ingestion/src/extractors/youtube.ts"), "utf-8");
    const web = readFileSync(join(rootDir, "packages/ingestion/src/extractors/web.ts"), "utf-8");

    expect(pdf).toContain("PdfExtractionError");
    expect(pdf).toContain("extractPdf");
    expect(pdf).toContain("validatePdfResult");
    expect(pdf).toContain("checkPdfPageLimit");
    expect(youtube).toContain("YouTubeExtractionError");
    expect(youtube).toContain("extractYouTubeTranscript");
    expect(youtube).toContain("validateYouTubeResult");
    expect(web).toContain("WebExtractionError");
    expect(web).toContain("extractWebPage");
    expect(web).toContain("validateWebResult");
  });

  test("AC-3.4: SSE progress stream module and caps present", () => {
    expect(existsSync(join(rootDir, "packages/ingestion/src/progress/sse.ts"))).toBe(true);
    expect(existsSync(join(rootDir, "packages/ingestion/src/progress/index.ts"))).toBe(true);

    const sse = readFileSync(join(rootDir, "packages/ingestion/src/progress/sse.ts"), "utf-8");
    expect(sse).toContain("streamProgress");
    expect(sse).toContain("280_000");
    expect(sse).toContain("lastEventId");
    expect(sse).toContain("serializeSseEvent");
    expect(sse).toContain("deserializeSseEvent");
    expect(sse).toContain("ProgressStreamError");
  });

  // S3.4 wire-production story note: the process worker and purge service folders
  // are reserved in the sprint change matrix but not implemented in this session.
  test("AC-3.4: worker and storage story folders reserved", () => {
    const root = join(rootDir, "packages/ingestion/src");
    expect(existsSync(join(root, "workers"))).toBe(true);
    expect(existsSync(join(root, "storage"))).toBe(true);
    expect(existsSync(join(rootDir, "packages/ingestion/src/workers/process.ts"))).toBe(false);
    expect(existsSync(join(rootDir, "packages/ingestion/src/storage/purge.ts"))).toBe(false);
  });

  test("AC-3.2: embedding, vector upsert, and staging seams present", () => {
    expect(existsSync(join(rootDir, "packages/ingestion/src/embedding.ts"))).toBe(true);
    expect(existsSync(join(rootDir, "packages/ingestion/src/vector/upsert.ts"))).toBe(true);
    expect(existsSync(join(rootDir, "packages/ingestion/src/s3-staging.ts"))).toBe(true);

    const embedding = readFileSync(join(rootDir, "packages/ingestion/src/embedding.ts"), "utf-8");
    const upsert = readFileSync(join(rootDir, "packages/ingestion/src/vector/upsert.ts"), "utf-8");
    const staging = readFileSync(join(rootDir, "packages/ingestion/src/s3-staging.ts"), "utf-8");

    expect(embedding).toContain("generateEmbedding");
    expect(embedding).toContain("generateEmbeddingFallback");
    expect(upsert).toContain("upsertVectors");
    expect(upsert).toContain("formatVectorPoint");
    expect(upsert).toContain("purgeStagedPayload");
    expect(staging).toContain("createPresignedUploadUrl");
    expect(staging).toContain("presign");
    expect(staging).toContain("FIVE_MB_BYTES");
  });

  test("AC-3.5: compensation module exports refund and compensation helpers", () => {
    expect(existsSync(join(rootDir, "packages/ingestion/src/compensation/refund.ts"))).toBe(true);

    const refund = readFileSync(join(rootDir, "packages/ingestion/src/compensation/refund.ts"), "utf-8");
    expect(refund).toContain("refundCreditsOnFailure");
    expect(refund).toContain("compensateOnFailure");
    expect(refund).toContain("markJobFailed");
    expect(refund).toContain("createCompensationError");
    expect(refund).toContain("RefundOptions");
  });

  test("AC-3.1..AC-3.5: M3 scaffold exposes story intent files", () => {
    const storyDir = join(rootDir, "_documentation/planning/milestones/m3-transient-ingestion/stories");
    expect(existsSync(join(storyDir, "s3.1-implemented.md"))).toBe(true);
    expect(existsSync(join(storyDir, "s3.2-route-handlers-plan.md"))).toBe(true);
    expect(existsSync(join(storyDir, "s3.3-extractor-story-plan.md"))).toBe(true);
    expect(existsSync(join(storyDir, "s3.4-worker-and-storage-story-plan.md"))).toBe(true);
    expect(existsSync(join(storyDir, "s3.5-progress-story-plan.md"))).toBe(true);
    expect(existsSync(join(storyDir, "s3.6-verification-story-plan.md"))).toBe(true);
  });
});
