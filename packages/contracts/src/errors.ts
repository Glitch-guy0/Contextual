import {
  ERROR_CATALOGUE,
  type ErrorCatalogueKey,
  type ErrorTypeUri,
  isCataloguedErrorKey,
} from "./error-catalog";

export interface ValidationErrorItem {
  readonly field: string;
  readonly message: string;
}

export type QuotaService =
  | "google-ai-studio"
  | "groq"
  | "upstash-redis"
  | "upstash-vector"
  | "cloudflare-workers-ai"
  | "qdrant-cloud";

export interface QuotaExtension {
  readonly service: QuotaService;
  readonly quota_period: "daily" | "monthly";
  readonly quota_used: number;
  readonly quota_limit: number;
  readonly resets_in_seconds: number;
  readonly credits_remaining: number;
}

export interface ProblemDocument {
  readonly type: ErrorTypeUri;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
  readonly instance: string;
  readonly code?: string;
  readonly correlation_id?: string;
  readonly errors?: readonly ValidationErrorItem[];
  readonly quota?: QuotaExtension;
  readonly [key: string]: unknown;
}

/**
 * Sanitizes strings by stripping secrets, credentials, tokens, and internal stack traces.
 * Conforms to NFR-026 and BR-031.
 */
export function sanitizeSensitiveData(text: string): string {
  if (!text) return text;
  return text
    // Redact Bearer tokens
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer [REDACTED]")
    // Redact JWT tokens
    .replace(/eyJ[A-Za-z0-9\-_=]+\.eyJ[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_.+/=]*/g, "[REDACTED_JWT]")
    // Redact PostgreSQL connection strings (e.g. postgresql://user:pass@host:5432/db)
    .replace(/postgres(?:ql)?:\/\/[^:]+:[^@]+@[^\s"']+/gi, "postgresql://[REDACTED_USER]:[REDACTED_PASS]@[REDACTED_HOST]")
    // Redact API keys with common prefixes
    .replace(/(?:sk|pk|api[_-]?key)[_-][A-Za-z0-9_\-]{8,}/gi, "[REDACTED_API_KEY]")
    // Redact file paths containing stack traces or internal dirs
    .replace(/(?:\/[a-zA-Z0-9_\-.]+)+\.(?:ts|js|mjs|cjs):\d+:\d+/g, "[REDACTED_STACK_TRACE]");
}

export interface SerializeProblemParams {
  detail: string;
  instance: string;
  correlation_id?: string;
  errors?: readonly ValidationErrorItem[];
  quota?: QuotaExtension;
  customExtensions?: Record<string, unknown>;
}

/**
 * Serializes an error into RFC 9457 application/problem+json.
 * Validates against closed 17-member catalogue, redacts sensitive info, and ensures mandatory members.
 */
export function serializeProblemDetails(
  key: ErrorCatalogueKey,
  params: SerializeProblemParams
): ProblemDocument {
  if (!isCataloguedErrorKey(key)) {
    throw new Error(`Uncatalogued error key: ${String(key)}. Must be a member of ERROR_CATALOGUE.`);
  }

  const definition = ERROR_CATALOGUE[key];
  const sanitizedDetail = sanitizeSensitiveData(params.detail);

  const cleanExtensions: Record<string, unknown> = {};
  if (params.customExtensions) {
    for (const [k, v] of Object.entries(params.customExtensions)) {
      if (k === "stack" || k === "connectionString" || k === "password" || k === "secret") {
        continue; // strip forbidden sensitive fields
      }
      if (typeof v === "string") {
        cleanExtensions[k] = sanitizeSensitiveData(v);
      } else {
        cleanExtensions[k] = v;
      }
    }
  }

  return {
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: sanitizedDetail,
    instance: params.instance,
    code: key,
    ...(params.correlation_id ? { correlation_id: params.correlation_id } : {}),
    ...(params.errors && params.errors.length > 0 ? { errors: params.errors } : {}),
    ...(params.quota ? { quota: params.quota } : {}),
    ...cleanExtensions,
  };
}

export const createProblemDetails = serializeProblemDetails;

export class AppProblemError extends Error {
  public readonly key: ErrorCatalogueKey;
  public readonly instance: string;
  public readonly correlation_id?: string;
  public readonly quota?: QuotaExtension;
  public readonly errors?: readonly ValidationErrorItem[];
  public readonly customExtensions?: Record<string, unknown>;

  constructor(
    key: ErrorCatalogueKey,
    params: {
      detail: string;
      instance: string;
      correlation_id?: string;
      quota?: QuotaExtension;
      errors?: readonly ValidationErrorItem[];
      customExtensions?: Record<string, unknown>;
    }
  ) {
    super(params.detail);
    this.name = "AppProblemError";
    this.key = key;
    this.instance = params.instance;
    this.correlation_id = params.correlation_id;
    this.quota = params.quota;
    this.errors = params.errors;
    this.customExtensions = params.customExtensions;
  }

  public toProblemDocument(): ProblemDocument {
    return serializeProblemDetails(this.key, {
      detail: this.message,
      instance: this.instance,
      correlation_id: this.correlation_id,
      quota: this.quota,
      errors: this.errors,
      customExtensions: this.customExtensions,
    });
  }
}
