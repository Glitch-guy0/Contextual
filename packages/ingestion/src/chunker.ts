// Local alias keeps this package's typecheck stable during monorepo bootstrap.
import type { TextChunk, IngestionChunkPayload, SourceType } from "@repo/contracts/ingestion";

export type { TextChunk, IngestionChunkPayload, SourceType } from "@repo/contracts/ingestion";

const DEFAULT_CHUNK_SIZE = 800;
const DEFAULT_OVERLAP = 100;
const SEPARATOR_HIERARCHY = ["\n\n", "\n", ". ", "! ", "? ", "; ", " ", ""];

export interface ChunkerOptions {
  readonly chunkSize?: number;
  readonly overlap?: number;
  readonly userId: string;
  readonly documentId: string;
  readonly notebookId: string;
  readonly sourceType: SourceType;
  readonly title: string;
  readonly pageNumber?: number | null;
  readonly timestampSeconds?: number | null;
}

export class ChunkerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChunkerError";
  }
}

export function chunkText(
  text: string,
  options: ChunkerOptions
): Array<{ readonly chunk: TextChunk; readonly payload: IngestionChunkPayload }> {
  if (options.userId == null || options.userId === "") {
    throw new ChunkerError("userId is required for chunking");
  }

  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap = options.overlap ?? DEFAULT_OVERLAP;

  logChunkingStarted({ sourceType: options.sourceType, title: options.title, textLength: text.length });

  const segments = splitByHierarchy(text, SEPARATOR_HIERARCHY);
  const normalized = mergeSegments(segments, chunkSize);
  const chunks = buildChunks(normalized, chunkSize, overlap);

  const result = chunks.map((chunk, index) => ({
    chunk: {
      chunkIndex: index,
      text: chunk.text,
      charStart: chunk.charStart,
      charEnd: chunk.charEnd,
      page: options.pageNumber,
      timestampSeconds: options.timestampSeconds ?? null,
    },
    payload: {
      user_id: options.userId,
      document_id: options.documentId,
      notebook_id: options.notebookId,
      source_type: options.sourceType,
      title: options.title,
      chunk_index: index,
      char_start: chunk.charStart,
      char_end: chunk.charEnd,
      page_number: options.pageNumber,
      timestamp_seconds: options.timestampSeconds ?? null,
      text: chunk.text,
    },
  }));

  logChunkingCompleted({ sourceType: options.sourceType, title: options.title, chunkCount: result.length });

  return result;
}

function logChunkingStarted(_payload: { sourceType: string; title: string; textLength: number }): void {
  // Structured logging seam wired in production via the centralized logger.
}

function logChunkingCompleted(_payload: { sourceType: string; title: string; chunkCount: number }): void {
  // Structured logging seam wired in production via the centralized logger.
}

function splitByHierarchy(text: string, separators: string[]): string[] {
  let current = text;

  for (const separator of separators) {
    if (separator === "") {
      return current.split("").map((char) => char);
    }

    const escapedSeparator = escapeRegExp(separator);
    const parts = current.split(new RegExp(`(${escapedSeparator})`)).filter(Boolean);

    if (parts.length > 1) {
      current = parts.map((part) => part.trim()).filter(Boolean).join(separator);
    }
  }

  const trimmed = current.trim();
  return trimmed ? [trimmed] : [];
}

function mergeSegments(segments: string[], maxSize: number): string[] {
  const merged: string[] = [];
  let cursor = "";

  for (const segment of segments) {
    const candidate = cursor ? `${cursor}${segment}` : segment;
    if (candidate.length > maxSize && cursor.length) {
      merged.push(cursor.trim());
      cursor = segment;
    } else {
      cursor = candidate;
    }
  }

  if (cursor.trim()) {
    merged.push(cursor.trim());
  }

  return merged;
}

function buildChunks(
  segments: string[],
  chunkSize: number,
  overlap: number
): Array<{ readonly text: string; readonly charStart: number; readonly charEnd: number }> {
  const chunks: Array<{ readonly text: string; readonly charStart: number; readonly charEnd: number }> = [];
  let position = 0;

  for (const segment of segments) {
    if (!segment) continue;

    while (position < segment.length) {
      const start = position;
      const end = Math.min(start + chunkSize, segment.length);
      chunks.push({
        text: segment.slice(start, end),
        charStart: start,
        charEnd: end,
      });
      position = end - overlap;
      if (position <= start) break;
    }

    position += segment.length;
  }

  return chunks;
}

function escapeRegExp(pattern: string): string {
  return pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
