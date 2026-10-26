// Local alias keeps this package's typecheck stable during monorepo bootstrap.
// Once @repo/ingestion is published through the workspace, this file will delegate
// to that module. Until then, a narrow set of types are defined locally so the
// package's own sources can resolve their imports.

export type { SourceType } from "@repo/contracts/ingestion";

export interface TextChunk {
  readonly chunkIndex: number;
  readonly text: string;
  readonly charStart: number;
  readonly charEnd: number;
  readonly page?: number | null;
  readonly timestampSeconds?: number | null;
}
