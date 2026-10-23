import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { generateKeyPair, exportJWK, SignJWT, type KeyLike } from "jose";
import {
  registerLocalJwks,
  clearJwksCache,
  verifyToken,
  guardAuthRequest,
  HEADER_TENANT_USER_ID,
  HEADER_TENANT_SESSION_ID,
  HEADER_CORRELATION_ID,
} from "../packages/auth/src/index.js";

describe("Milestone M1 — Story S1.4: Core Authentication Module (@repo/auth)", () => {
  const TEST_KID = "key_test_clerk_offline_001";
  let privateKey: KeyLike;
  let validToken: string;
  let expiredToken: string;
  let invalidSignatureToken: string;

  beforeAll(async () => {
    // 1. Generate RSA key pair for testing offline verification
    const { publicKey, privateKey: privKey } = await generateKeyPair("RS256", {
      modulusLength: 2048,
    });
    privateKey = privKey as KeyLike;

    const publicJwk = await exportJWK(publicKey);
    publicJwk.kid = TEST_KID;
    publicJwk.alg = "RS256";
    publicJwk.use = "sig";

    // 2. Seed memory cache with public JWKS key
    await registerLocalJwks([publicJwk]);

    // 3. Forge test JWTs
    const now = Math.floor(Date.now() / 1000);

    // Valid token
    validToken = await new SignJWT({
      sub: "user_2testTenant999",
      sid: "sess_2testSession888",
      email: "engineer@contextual.ai",
      role: "member",
    })
      .setProtectedHeader({ alg: "RS256", kid: TEST_KID })
      .setIssuedAt(now - 10)
      .setNotBefore(now - 10)
      .setExpirationTime(now + 3600)
      .setIssuer("https://clerk.contextual.ai")
      .sign(privateKey);

    // Expired token (expired 10 minutes ago)
    expiredToken = await new SignJWT({
      sub: "user_2expiredUser",
      sid: "sess_expired",
    })
      .setProtectedHeader({ alg: "RS256", kid: TEST_KID })
      .setIssuedAt(now - 1200)
      .setExpirationTime(now - 600)
      .setIssuer("https://clerk.contextual.ai")
      .sign(privateKey);

    // Token signed with an unregistered, different key
    const { privateKey: rogueKey } = await generateKeyPair("RS256");
    invalidSignatureToken = await new SignJWT({
      sub: "user_2hacker",
      sid: "sess_rogue",
    })
      .setProtectedHeader({ alg: "RS256", kid: "unknown_kid_999" })
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(rogueKey);
  });

  afterAll(() => {
    clearJwksCache();
  });

  test("TC-1.4.1: Auth verifier validates RS256 JWT signatures offline against cached Clerk JWKS keys", async () => {
    const startTime = performance.now();
    const result = await verifyToken(validToken);
    const durationMs = performance.now() - startTime;

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.context.userId).toBe("user_2testTenant999");
      expect(result.context.sessionId).toBe("sess_2testSession888");
      expect(result.payload.email).toBe("engineer@contextual.ai");
    }

    // Offline verification must complete well within the < 2ms / < 10ms budget
    expect(durationMs).toBeLessThan(10);
  });

  test("TC-1.4.2: Missing or invalid Authorization header triggers HTTP 401 with RFC 9457 Problem Details envelope", async () => {
    // 1. Request with missing Authorization header
    const missingAuthReq = new Request("https://contextual.ai/api/v1/notebooks", {
      method: "GET",
    });
    const missingResult = await guardAuthRequest(missingAuthReq);

    expect(missingResult.authorized).toBe(false);
    if (!missingResult.authorized) {
      expect(missingResult.response.status).toBe(401);
      expect(missingResult.response.headers.get("content-type")).toBe("application/problem+json");

      const body = await missingResult.response.json();
      expect(body.type).toBe("https://contextual.ai/errors/authentication-required");
      expect(body.title).toBe("Authentication Required");
      expect(body.status).toBe(401);
      expect(body.instance).toBe("/api/v1/notebooks");
      expect(body.code).toBe("AUTH_UNAUTHORIZED");
    }

    // 2. Request with malformed header (not Bearer)
    const malformedReq = new Request("https://contextual.ai/api/v1/notebooks", {
      method: "GET",
      headers: { Authorization: "Basic dXNlcjpwYXNz" },
    });
    const malformedResult = await guardAuthRequest(malformedReq);
    expect(malformedResult.authorized).toBe(false);
    if (!malformedResult.authorized) {
      expect(malformedResult.response.status).toBe(401);
      const body = await malformedResult.response.json();
      expect(body.code).toBe("AUTH_UNAUTHORIZED");
    }

    // 3. Request with unknown key / invalid signature
    const rogueReq = new Request("https://contextual.ai/api/v1/notebooks", {
      headers: { Authorization: `Bearer ${invalidSignatureToken}` },
    });
    const rogueResult = await guardAuthRequest(rogueReq);
    expect(rogueResult.authorized).toBe(false);
    if (!rogueResult.authorized) {
      expect(rogueResult.response.status).toBe(401);
      const body = await rogueResult.response.json();
      expect(body.code).toBe("AUTH_TOKEN_INVALID");
    }
  });

  test("TC-1.4.3: Expired JWT triggers HTTP 401 with code AUTH_TOKEN_EXPIRED", async () => {
    const expiredReq = new Request("https://contextual.ai/api/v1/conversation-threads", {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });

    const result = await guardAuthRequest(expiredReq);
    expect(result.authorized).toBe(false);

    if (!result.authorized) {
      expect(result.response.status).toBe(401);
      expect(result.response.headers.get("content-type")).toBe("application/problem+json");

      const body = await result.response.json();
      expect(body.type).toBe("https://contextual.ai/errors/authentication-required");
      expect(body.status).toBe(401);
      expect(body.code).toBe("AUTH_TOKEN_EXPIRED");
      expect(body.detail).toContain("expired");
    }
  });

  test("TC-1.4.4: Valid JWT successfully constructs and returns typed TenantContext with userId and claims", async () => {
    const validReq = new Request("https://contextual.ai/api/v1/notebooks/create", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${validToken}`,
        "x-correlation-id": "req_trace_test_001",
      },
    });

    const result = await guardAuthRequest(validReq);
    expect(result.authorized).toBe(true);

    if (result.authorized) {
      expect(result.context.userId).toBe("user_2testTenant999");
      expect(result.context.sessionId).toBe("sess_2testSession888");
      expect(result.context.claims.role).toBe("member");

      // Verify injected headers for downstream route handlers
      expect(result.headers.get(HEADER_TENANT_USER_ID)).toBe("user_2testTenant999");
      expect(result.headers.get(HEADER_TENANT_SESSION_ID)).toBe("sess_2testSession888");
      expect(result.headers.get(HEADER_CORRELATION_ID)).toBe("req_trace_test_001");
    }
  });
});
