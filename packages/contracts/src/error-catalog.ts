/**
 * Closed 17-Member RFC 9457 Problem Details Error Catalogue
 * Reference: conventions.md §4, FR-025, FR-027, BR-028..BR-032
 */

export const ERROR_TYPE_PREFIX = "https://contextual.ai/errors/";

export const ERROR_CATALOGUE = {
  AUTHENTICATION_REQUIRED: {
    type: `${ERROR_TYPE_PREFIX}authentication-required`,
    title: "Authentication Required",
    status: 401,
  },
  FORBIDDEN_TENANT_ACCESS: {
    type: `${ERROR_TYPE_PREFIX}forbidden-tenant-access`,
    title: "Forbidden Tenant Access",
    status: 403,
  },
  INSUFFICIENT_CREDITS: {
    type: `${ERROR_TYPE_PREFIX}insufficient-credits`,
    title: "Insufficient Credits",
    status: 402,
  },
  SERVICE_LIMIT_REACHED: {
    type: `${ERROR_TYPE_PREFIX}service-limit-reached`,
    title: "Service Limit Reached",
    status: 402,
  },
  RATE_LIMIT_EXCEEDED: {
    type: `${ERROR_TYPE_PREFIX}rate-limit-exceeded`,
    title: "Rate Limit Exceeded",
    status: 429,
  },
  UPLOAD_SIZE_EXCEEDED: {
    type: `${ERROR_TYPE_PREFIX}upload-size-exceeded`,
    title: "Upload Size Exceeded",
    status: 413,
  },
  UNSUPPORTED_MEDIA_TYPE: {
    type: `${ERROR_TYPE_PREFIX}unsupported-media-type`,
    title: "Unsupported Media Type",
    status: 415,
  },
  DOCUMENT_PARSING_FAILED: {
    type: `${ERROR_TYPE_PREFIX}document-parsing-failed`,
    title: "Document Parsing Failed",
    status: 422,
  },
  PASSWORD_PROTECTED_PDF: {
    type: `${ERROR_TYPE_PREFIX}password-protected-pdf`,
    title: "Password Protected PDF",
    status: 422,
  },
  NO_TEXT_LAYER_PDF: {
    type: `${ERROR_TYPE_PREFIX}no-text-layer-pdf`,
    title: "No Text Layer Found in PDF",
    status: 422,
  },
  PROGRESS_STREAM_UNAVAILABLE: {
    type: `${ERROR_TYPE_PREFIX}progress-stream-unavailable`,
    title: "Progress Stream Unavailable",
    status: 503,
  },
  PROGRESS_STREAM_TIMEOUT: {
    type: `${ERROR_TYPE_PREFIX}progress-stream-timeout`,
    title: "Progress Stream Timeout",
    status: 504,
  },
  NOTEBOOK_EXPIRED: {
    type: `${ERROR_TYPE_PREFIX}notebook-expired`,
    title: "Notebook Expired",
    status: 410,
  },
  NOTEBOOK_NOT_FOUND: {
    type: `${ERROR_TYPE_PREFIX}notebook-not-found`,
    title: "Notebook Not Found",
    status: 404,
  },
  INVALID_NODE_RELATION: {
    type: `${ERROR_TYPE_PREFIX}invalid-node-relation`,
    title: "Invalid Node Relation",
    status: 400,
  },
  UPSTREAM_PROVIDER_UNAVAILABLE: {
    type: `${ERROR_TYPE_PREFIX}upstream-provider-unavailable`,
    title: "Upstream Provider Unavailable",
    status: 502,
  },
  INTERNAL_SERVER_ERROR: {
    type: `${ERROR_TYPE_PREFIX}internal-server-error`,
    title: "Internal Server Error",
    status: 500,
  },
} as const;

export type ErrorCatalogueKey = keyof typeof ERROR_CATALOGUE;
export type ErrorTypeUri = typeof ERROR_CATALOGUE[ErrorCatalogueKey]["type"];

export function isCataloguedErrorKey(key: string): key is ErrorCatalogueKey {
  return Object.prototype.hasOwnProperty.call(ERROR_CATALOGUE, key);
}

export function isCataloguedTypeUri(uri: string): uri is ErrorTypeUri {
  return Object.values(ERROR_CATALOGUE).some((item) => item.type === uri);
}
