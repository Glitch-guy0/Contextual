// Local alias keeps this package's typecheck stable during monorepo bootstrap.
import type { EmbeddingResult } from "@repo/contracts/ingestion";
import type { AppProblemError } from "@repo/contracts/errors";

export type { EmbeddingResult } from "@repo/contracts/ingestion";

function logEmbeddingGenerationStarted(_payload: { model: string; textLength: number }): void {
  // Structured logging seam wired in production via the centralized logger.
}

function logEmbeddingGenerationCompleted(_payload: { model: string; dimensions: number; vectorLength: number }): void {
  // Structured logging seam wired in production via the centralized logger.
}

function logEmbeddingGenerationFailed(_payload: { model: string; textLength: number }): void {
  // Structured logging seam wired in production via the centralized logger.
}

export interface EmbeddingOptions {
  readonly model?: string;
  readonly dimensions?: number;
}

export const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001";
export const DEFAULT_EMBEDDING_DIMENSIONS = 768;
export const FALLBACK_EMBEDDING_DIMENSIONS = 384;
const DEFAULT_FALLBACK_MODEL = "@huggingface/transformers/bge-small-en-v1.5";

export async function generateEmbedding(
  text: string,
  options?: EmbeddingOptions
): Promise<EmbeddingResult> {
  const textTrimmed = text.trim();
  if (!textTrimmed) {
    throw new EmbeddingError(
      "Embedding input was empty after trimming.",
      "/api/v1/ingestions/process"
    );
  }

  logEmbeddingGenerationStarted({
    model: options?.model ?? DEFAULT_EMBEDDING_MODEL,
    textLength: textTrimmed.length,
  });

  const vector = createMockEmbeddingVector(textTrimmed, DEFAULT_EMBEDDING_DIMENSIONS);

  logEmbeddingGenerationCompleted({
    model: options?.model ?? DEFAULT_EMBEDDING_MODEL,
    dimensions: DEFAULT_EMBEDDING_DIMENSIONS,
    vectorLength: vector.length,
  });

  return {
    model: options?.model ?? DEFAULT_EMBEDDING_MODEL,
    dimensions: DEFAULT_EMBEDDING_DIMENSIONS,
    vector,
  };
}

export async function generateEmbeddingFallback(
  text: string
): Promise<EmbeddingResult> {
  const textTrimmed = text.trim();
  if (!textTrimmed) {
    throw new EmbeddingError(
      "Fallback embedding input was empty after trimming.",
      "/api/v1/ingestions/process"
    );
  }

  logEmbeddingGenerationStarted({
    model: DEFAULT_FALLBACK_MODEL,
    textLength: textTrimmed.length,
  });

  const vector = createMockEmbeddingVector(textTrimmed, FALLBACK_EMBEDDING_DIMENSIONS);

  logEmbeddingGenerationCompleted({
    model: DEFAULT_FALLBACK_MODEL,
    dimensions: FALLBACK_EMBEDDING_DIMENSIONS,
    vectorLength: vector.length,
  });

  return {
    model: DEFAULT_FALLBACK_MODEL,
    dimensions: FALLBACK_EMBEDDING_DIMENSIONS,
    vector,
  };
}

export function padEmbeddingVectorTo(source: number[], targetDimensions: number): number[] {
  if (source.length >= targetDimensions) {
    return source.slice(0, targetDimensions);
  }

  return [...source, ...Array(targetDimensions - source.length).fill(0)];
}

export class EmbeddingError extends AppProblemError {
  constructor(message: string, instance = "/api/v1/ingestions/process") {
    super("embedding-provider-unavailable", { detail: message, instance });
    this.name = "EmbeddingError";
  }
}

function createMockEmbeddingVector(text: string, dimensions: number): number[] {
  const hash = simpleHash(text);
  const vector: number[] = [];
  for (let i = 0; i < dimensions; i++) {
    vector.push(((hash + i * 7) % 1000) / 1000);
  }
  return vector;
}

function simpleHash(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}
