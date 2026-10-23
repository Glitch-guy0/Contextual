import {
  decodeProtectedHeader,
  jwtVerify,
  errors,
  type JWTPayload,
  type KeyLike,
} from "jose";
import { getKeyByKid } from "./jwks.js";
import { createTenantContext, type TenantContext } from "./context.js";

/**
 * Offline RS256 JWT Token Verifier
 * Reference: Architecture §3.6, AC-1.4.3, TC-1.4.1, TC-1.4.3, TC-1.4.4
 */

export type AuthErrorCode =
  | "AUTH_UNAUTHORIZED"
  | "AUTH_TOKEN_EXPIRED"
  | "AUTH_TOKEN_MALFORMED"
  | "AUTH_TOKEN_INVALID";

export interface VerifySuccess {
  readonly success: true;
  readonly context: TenantContext;
  readonly payload: JWTPayload;
}

export interface VerifyFailure {
  readonly success: false;
  readonly error: AuthErrorCode;
  readonly message: string;
}

export type VerifyResult = VerifySuccess | VerifyFailure;

export interface VerifyOptions {
  jwksUrl?: string;
  issuer?: string;
  audience?: string;
  clockTolerance?: number; // seconds
  correlationId?: string;
}

/**
 * Validates RS256 signed JWT offline against cached Clerk JWKS keys in < 2ms.
 */
export async function verifyToken(
  token: string,
  options?: VerifyOptions
): Promise<VerifyResult> {
  const correlationId = options?.correlationId ?? "corr_unknown";

  if (!token || typeof token !== "string" || token.trim().length === 0) {
    logAuthEvent("auth.token.rejected", {
      reason: "Missing token",
      error: "AUTH_UNAUTHORIZED",
      correlationId,
    });
    return {
      success: false,
      error: "AUTH_UNAUTHORIZED",
      message: "Missing or empty bearer token.",
    };
  }

  try {
    // 1. Decode header to identify key ID (kid)
    const header = decodeProtectedHeader(token);
    if (!header.kid) {
      logAuthEvent("auth.token.rejected", {
        reason: "Missing kid in header",
        error: "AUTH_TOKEN_MALFORMED",
        correlationId,
      });
      return {
        success: false,
        error: "AUTH_TOKEN_MALFORMED",
        message: "JWT header is missing key ID ('kid').",
      };
    }

    // 2. Resolve public key from memory cache (< 1ms)
    const key = await getKeyByKid(header.kid, {
      jwksUrl: options?.jwksUrl,
    });

    if (!key) {
      logAuthEvent("auth.token.rejected", {
        reason: "Key not found for kid",
        kid: header.kid,
        error: "AUTH_TOKEN_INVALID",
        correlationId,
      });
      return {
        success: false,
        error: "AUTH_TOKEN_INVALID",
        message: `Public key not found for key ID: ${header.kid}`,
      };
    }

    // 3. Cryptographically verify signature and claims (RS256)
    const { payload } = await jwtVerify(token, key as KeyLike, {
      algorithms: ["RS256"],
      issuer: options?.issuer,
      audience: options?.audience,
      clockTolerance: options?.clockTolerance ?? 5,
    });

    // Extract user ID from standard sub or Clerk custom claims
    const userId =
      (payload.sub as string | undefined) ??
      (payload.user_id as string | undefined) ??
      (payload.userId as string | undefined);

    if (!userId) {
      logAuthEvent("auth.token.rejected", {
        reason: "Missing sub/userId claim",
        error: "AUTH_TOKEN_INVALID",
        correlationId,
      });
      return {
        success: false,
        error: "AUTH_TOKEN_INVALID",
        message: "Token is missing subject claim ('sub').",
      };
    }

    const sessionId = (payload.sid as string | undefined) ?? "sess_unknown";
    const context = createTenantContext(userId, sessionId, payload as Record<string, unknown>);

    logAuthEvent("auth.token.verified", {
      userId,
      sessionId,
      correlationId,
    });

    return {
      success: true,
      context,
      payload,
    };
  } catch (err: unknown) {
    if (err instanceof errors.JWTExpired) {
      logAuthEvent("auth.token.rejected", {
        reason: "Token expired",
        error: "AUTH_TOKEN_EXPIRED",
        correlationId,
      });
      return {
        success: false,
        error: "AUTH_TOKEN_EXPIRED",
        message: "Token has expired.",
      };
    }

    const message = err instanceof Error ? err.message : "Invalid token.";
    logAuthEvent("auth.token.rejected", {
      reason: message,
      error: "AUTH_TOKEN_INVALID",
      correlationId,
    });

    return {
      success: false,
      error: "AUTH_TOKEN_INVALID",
      message: `Token verification failed: ${message}`,
    };
  }
}

function logAuthEvent(event: string, payload: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== "test") {
    console.info(
      JSON.stringify({
        event,
        ...payload,
        timestamp: new Date().toISOString(),
      })
    );
  }
}
