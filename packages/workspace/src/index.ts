// Public package surface for @repo/workspace.
export { WorkspaceRepository } from "./repository.js";
export type { NodeRow, EdgeRow } from "./repository.js";
export { NodeService } from "./nodes.js";
export {
  validateNodeInput,
  buildDocumentCard,
  notFound,
  WorkspaceValidationError,
} from "./types.js";
export type { NodeValidation, NodeValidationReason } from "./types.js";
export {
  validateEdgeType,
  createEdge,
  canCreateEdge,
  listEdgesForNotebook,
} from "./edges.js";
export type { EdgeType, EdgeValidation } from "./edges.js";
export {
  resolveCard,
  resolveCardsBatch,
  validateCardLatency,
  CARD_RESOLUTION_BUDGET_MS,
} from "./cards.js";
export { scopedSearch } from "./search.js";
export type {
  ScopedSearchDependencies,
  VectorClientLike,
  CreditLedgerLike,
  VectorMatch,
  VectorQueryOptions,
  DebitResultLike,
} from "./search.js";