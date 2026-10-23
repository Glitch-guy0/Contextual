import { createProblemDetails } from "@repo/contracts";
import { verifyToken, type VerifyOptions } from "./verifier.js";
import {
  HEADER_TENANT_USER_ID,
  HEADER_TENANT_SESSION_ID,
  HEADER_CORRELATION_ID,
  type TenantContext,
} from "./context.js";

/**
 * Edge-Compatible Authentication Guard & Header Injector
 * Enforces RFC 9457 Problem Details on HTTP 401 unauthenticated calls
 * Reference: Architecture §3.6, AC-1.4.4, TC-1.4.2, TC-1.4.3
 */

export interface AuthMiddlewareOptions extends VerifyOptions {
  protectedPrefixes?: string[];
  publicPaths?: string[];
}

export type AuthGuardResult =
  | {
      readonly authorized: true;
      readonly context: TenantContext;
      readonly headers: Headers;
    }
  | {
      readonly authorized: false;
      readonly response: Response;
    };

const DEFAULT_PROTECTED_PREFIXES = ["/api/v1"];
const DEFAULT_PUBLIC_PATHS = [
  "/",
  "/api/health",
  "/sign-in",
  "/sign-up",
  "/terms",
  "/privacy",
  "/favicon.ico",
];

/**
 * Guards a standard Web API Request. If protected and unauthorized, returns HTTP 401 RFC 9457.
 */
export async function guardAuthRequest(
  request: Request,
  options?: AuthMiddlewareOptions
): Promise<AuthGuardResult> {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const correlationId =
    request.headers.get(HEADER_CORRELATION_ID) ??
    `req_${Math.random().toString(36).substring(2, 11)}`;

  const protectedPrefixes = options?.protectedPrefixes ?? DEFAULT_PROTECTED_PREFIXES;
  const publicPaths = options?.publicPaths ?? DEFAULT_PUBLIC_PATHS;

  // 1. Check if path is explicitly public
  if (publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const passHeaders = new Headers(request.headers);
    passHeaders.set(HEADER_CORRELATION_ID, correlationId);
    return {
      authorized: true,
      context: {
        userId: "anonymous",
        sessionId: "sess_anonymous",
        claims: {},
      },
      headers: passHeaders,
    };
  }

  // 2. Check if path is protected
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) {
    const passHeaders = new Headers(request.headers);
    passHeaders.set(HEADER_CORRELATION_ID, correlationId);
    return {
      authorized: true,
      context: {
        userId: "anonymous",
        sessionId: "sess_anonymous",
        claims: {},
      },
      headers: passHeaders,
    };
  }

  // 3. Extract Bearer token
  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const problem = createProblemDetails("AUTHENTICATION_REQUIRED", {
      detail: "Missing or malformed Authorization header with Bearer token.",
      instance: pathname,
      customExtensions: {
        code: "AUTH_UNAUTHORIZED",
        correlation_id: correlationId,
      },
    });

    return {
      authorized: false,
      response: new Response(JSON.stringify(problem), {
        status: 401,
        headers: {
          "content-type": "application/problem+json",
          [HEADER_CORRELATION_ID]: correlationId,
        },
      }),
    };
  }

  const token = authHeader.substring(7).trim();
  const verifyResult = await verifyToken(token, {
    ...options,
    correlationId,
  });

  if (!verifyResult.success) {
    const problem = createProblemDetails("AUTHENTICATION_REQUIRED", {
      detail: verifyResult.message,
      instance: pathname,
      customExtensions: {
        code: verifyResult.error,
        correlation_id: correlationId,
      },
    });

    return {
      authorized: false,
      response: new Response(JSON.stringify(problem), {
        status: 401,
        headers: {
          "content-type": "application/problem+json",
          [HEADER_CORRELATION_ID]: correlationId,
        },
      }),
    };
  }

  // 4. Inject TenantContext into request headers
  const downstreamHeaders = new Headers(request.headers);
  downstreamHeaders.set(HEADER_TENANT_USER_ID, verifyResult.context.userId);
  downstreamHeaders.set(HEADER_TENANT_SESSION_ID, verifyResult.context.sessionId);
  downstreamHeaders.set(HEADER_CORRELATION_ID, correlationId);

  return {
    authorized: true,
    context: verifyResult.context,
    headers: downstreamHeaders,
  };
}
