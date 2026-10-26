/**
 * M4 Notebook Workspace & Domain Graph — shared contract types.
 * Reference: conventions.md §1, architecture/05-m4-notebook-workspace-and-domain-graph.md §3.3,
 * FR-031..FR-034, BR-002, BR-036, NFR-007.
 */

/** Closed union of permitted edge relations (FR-032). Any other string is rejected with HTTP 400 invalid-node-relation. */
export type EdgeType = "cites" | "related";

/** Node variant: a text note, or a reference to an ingested document (FR-031, FR-033). */
export type NodeKind = "text" | "document";

/** Declared retrieval scope for a cross-note query (FR-034). */
export type ScopedSearchKind = "node" | "branch" | "notebook";

/** Resolution status carried on a document-backed card. */
export type DocumentCardStatus = "queued" | "processing" | "indexed" | "failed";

/** Source medium of the backing document, aligned with the M3 ingestion SourceType. */
export type CardSourceType = "pdf" | "youtube" | "web";

export const EDGE_TYPES: readonly EdgeType[] = ["cites", "related"] as const;
export const NODE_KINDS: readonly NodeKind[] = ["text", "document"] as const;
export const SCOPED_SEARCH_KINDS: readonly ScopedSearchKind[] = ["node", "branch", "notebook"] as const;

export function isEdgeType(value: string): value is EdgeType {
  return (EDGE_TYPES as readonly string[]).includes(value);
}

export function isNodeKind(value: string): value is NodeKind {
  return (NODE_KINDS as readonly string[]).includes(value);
}

export function isScopedSearchKind(value: string): value is ScopedSearchKind {
  return (SCOPED_SEARCH_KINDS as readonly string[]).includes(value);
}

/** Document-backed card payload resolved in < 10ms (FR-033, AC-4.1). */
export interface DocumentCard {
  readonly title: string;
  readonly page_count: number;
  readonly status: DocumentCardStatus;
  readonly source_type: CardSourceType | null;
  readonly preview: string;
  readonly chunk_index: number | null;
}

/** A node in the notebook graph. Tenant fields are always populated from the verified TenantContext, never from input. */
export interface NotebookNodeDTO {
  readonly id: string;
  readonly notebook_id: string;
  readonly user_id: string;
  readonly parent_id: string | null;
  readonly kind: NodeKind;
  readonly title: string;
  readonly content: string | null;
  readonly document_id: string | null;
  readonly position: number;
  readonly card: DocumentCard | null;
  readonly created_at: string;
  readonly updated_at: string;
}

/** A typed directional relation between two nodes (FR-032). */
export interface NotebookEdgeDTO {
  readonly id: string;
  readonly notebook_id: string;
  readonly user_id: string;
  readonly source_id: string;
  readonly target_id: string;
  readonly edge_type: EdgeType;
  readonly created_at: string;
}

export interface CreateNodeInput {
  readonly notebook_id: string;
  readonly title: string;
  readonly kind: NodeKind;
  readonly content?: string;
  readonly parent_id?: string | null;
  readonly document_id?: string | null;
  readonly position?: number;
}

export interface CreateEdgeInput {
  readonly notebook_id: string;
  readonly source_id: string;
  readonly target_id: string;
  readonly edge_type: string;
}

export interface ScopedSearchRequest {
  readonly scope_kind: ScopedSearchKind;
  readonly scope_id: string;
  readonly query: string;
  readonly limit?: number;
}

export interface ScopedSearchHit {
  readonly node_id: string;
  readonly document_id: string | null;
  readonly title: string;
  readonly snippet: string;
  readonly score: number;
}

export interface ScopedSearchResponse {
  readonly scope: {
    readonly scope_kind: ScopedSearchKind;
    readonly scope_id: string;
  };
  readonly results: readonly ScopedSearchHit[];
  readonly credits_debited: number;
}