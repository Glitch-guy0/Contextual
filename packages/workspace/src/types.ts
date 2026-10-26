import type { NodeKind, DocumentCard, DocumentCardStatus, CardSourceType } from "@repo/contracts";
import { AppProblemError } from "@repo/contracts";

export type NodeValidationReason =
  | "title_missing"
  | "content_required_for_text"
  | "document_id_required_for_document"
  | "unknown_parent";

/**
 * Node creation/input validation outcome.
 *
 * The RFC 9457 catalogue is closed at 17 members and has no generic 400 key, so node-level
 * validation reports a typed result carrying ValidationErrorItem-shaped issues instead of
 * forcing an ill-fitting catalogue key. The HTTP layer serialises it via serializeProblemDetails.
 * (Edge-type violations DO have a key — INVALID_NODE_RELATION — and use it, see edges.ts.)
 */
export type NodeValidation =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: NodeValidationReason; readonly issues: readonly { readonly message: string; readonly field: string }[] };

export function validateNodeInput(input: {
  readonly kind: NodeKind;
  readonly title?: string;
  readonly content?: string | null;
  readonly document_id?: string | null;
}): NodeValidation {
  if (!input.title || input.title.trim().length === 0) {
    return {
      ok: false,
      reason: "title_missing",
      issues: [{ field: "title", message: "title is required" }],
    };
  }

  if (input.kind === "text" && !input.content) {
    return {
      ok: false,
      reason: "content_required_for_text",
      issues: [{ field: "content", message: "content is required when kind=text" }],
    };
  }

  if (input.kind === "document" && !input.document_id) {
    return {
      ok: false,
      reason: "document_id_required_for_document",
      issues: [{ field: "document_id", message: "document_id is required when kind=document" }],
    };
  }

  return { ok: true };
}

export function buildDocumentCard(row: {
  readonly title: string;
  readonly kind: NodeKind;
  readonly content: string | null;
  readonly document_id: string | null;
}): DocumentCard | null {
  if (row.kind !== "document") {
    return null;
  }

  const preview = (row.content ?? "").slice(0, 500);
  const pageCountMatch = /(\d+)\s+page/i.exec(preview);

  return {
    title: row.title,
    page_count: pageCountMatch?.[1] ? Number(pageCountMatch[1]) : 1,
    status: (row.document_id ? "indexed" : "queued") as DocumentCardStatus,
    source_type: null as CardSourceType | null,
    preview,
    chunk_index: null,
  };
}

export class WorkspaceValidationError extends Error {
  public readonly reason: NodeValidationReason;
  public readonly issues: readonly { readonly message: string; readonly field: string }[];

  constructor(reason: NodeValidationReason, issues: readonly { readonly message: string; readonly field: string }[]) {
    super(issues.map((issue) => `${issue.field}: ${issue.message}`).join("; "));
    this.name = "WorkspaceValidationError";
    this.reason = reason;
    this.issues = issues;
  }
}

export function notFound(instance: string): AppProblemError {
  return new AppProblemError("NOTEBOOK_NOT_FOUND", {
    detail: "Notebook or node does not exist, or is not owned by the authenticated tenant.",
    instance,
  });
}