/**
 * Multi-Tenant Security Context Definitions
 * Reference: Architecture §3.6, FR-001, FR-003, BR-001
 */

export const HEADER_TENANT_USER_ID = "x-tenant-user-id";
export const HEADER_TENANT_SESSION_ID = "x-tenant-session-id";
export const HEADER_CORRELATION_ID = "x-correlation-id";

export interface TenantContext {
  readonly userId: string; // Clerk User ID (e.g. "user_2xyz...")
  readonly sessionId: string; // Clerk Session ID (e.g. "sess_2abc...")
  readonly claims: Record<string, unknown>;
}

/**
 * Creates an immutable TenantContext instance
 */
export function createTenantContext(
  userId: string,
  sessionId: string,
  claims: Record<string, unknown> = {}
): TenantContext {
  if (!userId || typeof userId !== "string") {
    throw new Error("Invalid TenantContext: userId must be a non-empty string");
  }
  return Object.freeze({
    userId,
    sessionId: sessionId || "sess_unknown",
    claims: Object.freeze({ ...claims }),
  });
}

/**
 * Extracts TenantContext from incoming request headers if previously injected by middleware
 */
export function extractTenantContextFromHeaders(
  headers: Headers | Record<string, string | string[] | undefined>
): TenantContext | null {
  let userId: string | null = null;
  let sessionId: string | null = null;

  if (typeof (headers as Headers).get === "function") {
    const h = headers as Headers;
    userId = h.get(HEADER_TENANT_USER_ID);
    sessionId = h.get(HEADER_TENANT_SESSION_ID);
  } else {
    const raw = headers as Record<string, string | string[] | undefined>;
    const rawUid = raw[HEADER_TENANT_USER_ID];
    const rawSid = raw[HEADER_TENANT_SESSION_ID];
    userId = Array.isArray(rawUid) ? (rawUid[0] ?? null) : (rawUid ?? null);
    sessionId = Array.isArray(rawSid) ? (rawSid[0] ?? null) : (rawSid ?? null);
  }

  if (!userId) {
    return null;
  }

  return createTenantContext(userId, sessionId ?? "sess_unknown");
}
