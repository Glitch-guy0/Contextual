import {
  type ScopedSearchRequest,
  type ScopedSearchResponse,
  type ScopedSearchHit,
  CREDIT_COST_LLM_ACTION,
  isScopedSearchKind,
  AppProblemError,
} from "@repo/contracts";
import type { WorkspaceRepository } from "./repository.js";
import { notFound, WorkspaceValidationError } from "./types.js";

const INSTANCE = "/api/v1/notebooks/{notebookId}/search";

export interface VectorMatch {
  readonly id: string;
  readonly score: number;
  readonly metadata?: {
    readonly user_id?: string;
    readonly notebook_id?: string;
    readonly node_id?: string;
    readonly document_id?: string;
    readonly title?: string;
    readonly text?: string;
    readonly [key: string]: unknown;
  };
}

export interface VectorQueryOptions {
  readonly query: string;
  readonly limit?: number;
  readonly filter: {
    readonly user_id: string;
    readonly notebook_id?: string;
    readonly node_id?: string;
    readonly [key: string]: unknown;
  };
}

export interface VectorClientLike {
  query(options: VectorQueryOptions): Promise<VectorMatch[]>;
}

export interface DebitResultLike {
  readonly success: boolean;
  readonly remaining: number;
  readonly debited: number;
}

export interface CreditLedgerLike {
  debitCredits(userId: string, cost: number, action?: string): Promise<DebitResultLike>;
  refundCredits?(userId: string, amount: number): Promise<unknown>;
}

export interface ScopedSearchDependencies {
  readonly repository: WorkspaceRepository;
  readonly creditLedger: CreditLedgerLike;
  readonly vectorClient: VectorClientLike;
}

/**
 * Scoped Cross-Note Retrieval with Ownership-First Metering (FR-034, BR-036, AC-4.4).
 *
 * Hard sequencing contract:
 * validate DTO -> ownership predicate -> [only if owned] debit -> vector query
 *
 * Ownership is evaluated BEFORE any credit debit is committed.
 * An unowned scope answers 404 with 0 credits debited and 0 vector calls issued.
 */
export async function scopedSearch(
  deps: ScopedSearchDependencies,
  userId: string,
  notebookId: string,
  request: ScopedSearchRequest
): Promise<ScopedSearchResponse> {
  const startMs = Date.now();

  // 1. Validate scope DTO
  if (!request.scope_kind || !isScopedSearchKind(request.scope_kind)) {
    throw new WorkspaceValidationError("unknown_parent" as any, [
      { field: "scope_kind", message: 'scope_kind must be one of "node", "branch", "notebook"' },
    ]);
  }

  if (!request.scope_id || typeof request.scope_id !== "string" || request.scope_id.trim() === "") {
    throw new WorkspaceValidationError("unknown_parent" as any, [
      { field: "scope_id", message: "scope_id is required and must be a non-empty string" },
    ]);
  }

  if (!request.query || typeof request.query !== "string" || request.query.trim() === "") {
    throw new WorkspaceValidationError("unknown_parent" as any, [
      { field: "query", message: "query is required and must be a non-empty string" },
    ]);
  }

  // 2. Ownership predicate evaluation (WHERE user_id = ?) BEFORE debit
  let owned = false;

  if (request.scope_kind === "notebook") {
    // Notebook scope: scope_id must be this notebook and owned by caller
    if (request.scope_id !== notebookId) {
      owned = false;
    } else {
      owned = await deps.repository.notebookExists(userId, notebookId);
    }
  } else if (request.scope_kind === "node" || request.scope_kind === "branch") {
    // Node / branch scope: scope_id must be a node inside this notebook owned by caller
    const node = await deps.repository.findNode(userId, notebookId, request.scope_id);
    owned = node !== undefined;
  }

  if (!owned) {
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        JSON.stringify({
          event: "workspace.scoped_search_rejected",
          level: "WARN",
          user_id: userId,
          notebook_id: notebookId,
          scope_kind: request.scope_kind,
        })
      );
    }
    // Hard stop: return 404 with 0 credits debited and 0 vector calls
    throw notFound(INSTANCE);
  }

  // 3. Issue debit via Lua (cost = 0.5 credits) - ONLY reached if owned
  const cost = CREDIT_COST_LLM_ACTION;
  const debit = await deps.creditLedger.debitCredits(userId, cost, "scoped_search");

  if (!debit.success) {
    // Zero vector calls issued
    throw new AppProblemError("INSUFFICIENT_CREDITS", {
      detail: `Insufficient credit balance to perform scoped search (required: ${cost}).`,
      instance: INSTANCE,
    });
  }

  // 4. Query vector store with mandatory user_id tenant filter (NFR-007)
  const filter: { user_id: string; notebook_id?: string; node_id?: string } = {
    user_id: userId,
    notebook_id: notebookId,
  };

  if (request.scope_kind === "node") {
    filter.node_id = request.scope_id;
  }

  let matches: VectorMatch[];
  try {
    matches = await deps.vectorClient.query({
      query: request.query,
      limit: request.limit ?? 10,
      filter,
    });
  } catch (error) {
    // Compensation: restore debited credit on vector failure
    if (deps.creditLedger.refundCredits) {
      try {
        await deps.creditLedger.refundCredits(userId, cost);
      } catch (refundErr) {
        if (process.env.NODE_ENV !== "test") {
          console.error(
            JSON.stringify({
              event: "workspace.search_refund_failed",
              level: "ERROR",
              user_id: userId,
              error: String(refundErr),
            })
          );
        }
      }
    }
    throw new AppProblemError("UPSTREAM_PROVIDER_UNAVAILABLE", {
      detail: "Vector search provider failed to respond; debited credit was compensated.",
      instance: INSTANCE,
    });
  }

  if (process.env.NODE_ENV !== "test") {
    console.info(
      JSON.stringify({
        event: "workspace.scoped_search_accepted",
        level: "INFO",
        user_id: userId,
        notebook_id: notebookId,
        elapsed_ms: Date.now() - startMs,
      })
    );
  }

  const results: ScopedSearchHit[] = (matches ?? []).map((m) => ({
    node_id: String(m.metadata?.node_id ?? m.id),
    document_id: m.metadata?.document_id ? String(m.metadata.document_id) : null,
    title: String(m.metadata?.title ?? "Untitled"),
    snippet: String(m.metadata?.text ?? ""),
    score: Number(m.score ?? 0),
  }));

  return {
    scope: {
      scope_kind: request.scope_kind,
      scope_id: request.scope_id,
    },
    results,
    credits_debited: cost,
  };
}
