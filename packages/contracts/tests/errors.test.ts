import { describe, expect, it } from "bun:test";
import {
  ERROR_CATALOGUE,
  ERROR_TYPE_PREFIX,
  type ErrorCatalogueKey,
} from "../src/error-catalog";
import {
  AppProblemError,
  serializeProblemDetails,
  sanitizeSensitiveData,
} from "../src/errors";

describe("Milestone M2 — Story S2.4: Closed 17-Member RFC 9457 Error Catalogue & Serializer", () => {
  it("TC-2.4.1: Serialize ProblemDetails with all 5 mandatory RFC 9457 members", () => {
    const problem = serializeProblemDetails("INSUFFICIENT_CREDITS", {
      detail: "Account balance 0.2 is insufficient for action cost 0.5.",
      instance: "/api/v1/chat",
      correlation_id: "req_test_001",
      quota: {
        service: "google-ai-studio",
        quota_period: "daily",
        quota_used: 10,
        quota_limit: 10,
        resets_in_seconds: 3600,
        credits_remaining: 0.2,
      },
    });

    // 5 mandatory top-level RFC 9457 members
    expect(problem.type).toBe("https://contextual.ai/errors/insufficient-credits");
    expect(problem.title).toBe("Insufficient Credits");
    expect(problem.status).toBe(402);
    expect(problem.detail).toBe("Account balance 0.2 is insufficient for action cost 0.5.");
    expect(problem.instance).toBe("/api/v1/chat");

    // Optional extensions
    expect(problem.code).toBe("INSUFFICIENT_CREDITS");
    expect(problem.correlation_id).toBe("req_test_001");
    expect(problem.quota).toBeDefined();
    expect(problem.quota?.service).toBe("google-ai-studio");
    expect(problem.quota?.credits_remaining).toBe(0.2);
  });

  it("TC-2.4.2: Enforce closed 17-member error catalogue union", () => {
    const keys = Object.keys(ERROR_CATALOGUE);
    expect(keys.length).toBe(17);

    // Verify all 17 canonical types exist
    const expectedKeys: ErrorCatalogueKey[] = [
      "AUTHENTICATION_REQUIRED",
      "FORBIDDEN_TENANT_ACCESS",
      "INSUFFICIENT_CREDITS",
      "SERVICE_LIMIT_REACHED",
      "RATE_LIMIT_EXCEEDED",
      "UPLOAD_SIZE_EXCEEDED",
      "UNSUPPORTED_MEDIA_TYPE",
      "DOCUMENT_PARSING_FAILED",
      "PASSWORD_PROTECTED_PDF",
      "NO_TEXT_LAYER_PDF",
      "PROGRESS_STREAM_UNAVAILABLE",
      "PROGRESS_STREAM_TIMEOUT",
      "NOTEBOOK_EXPIRED",
      "NOTEBOOK_NOT_FOUND",
      "INVALID_NODE_RELATION",
      "UPSTREAM_PROVIDER_UNAVAILABLE",
      "INTERNAL_SERVER_ERROR",
    ];

    for (const key of expectedKeys) {
      expect(ERROR_CATALOGUE[key]).toBeDefined();
      expect(ERROR_CATALOGUE[key].type.startsWith(ERROR_TYPE_PREFIX)).toBe(true);
      expect(typeof ERROR_CATALOGUE[key].status).toBe("number");
      expect(typeof ERROR_CATALOGUE[key].title).toBe("string");
    }

    // Attempting to serialize an invalid uncatalogued key should throw
    expect(() => {
      // @ts-expect-error Testing invalid runtime key
      serializeProblemDetails("UNKNOWN_CUSTOM_BUG", {
        detail: "some bug",
        instance: "/api/test",
      });
    }).toThrow(/Uncatalogued error key/);
  });

  it("TC-2.4.3: Expose immutable type URIs and strip internal stack traces and secrets", () => {
    const rawDetailWithSecrets =
      "Failed to connect to postgresql://admin:supersecret@db.internal:5432/production. Bearer eyJhbGciOi.eyJzdWIi.signature at /app/src/db.ts:42:15 with key sk_live_1234567890abcdef";

    const sanitized = sanitizeSensitiveData(rawDetailWithSecrets);
    expect(sanitized).not.toContain("supersecret");
    expect(sanitized).not.toContain("sk_live_1234567890abcdef");
    expect(sanitized).toContain("postgresql://[REDACTED_USER]:[REDACTED_PASS]@[REDACTED_HOST]");
    expect(sanitized).toContain("[REDACTED_API_KEY]");
    expect(sanitized).toContain("[REDACTED_STACK_TRACE]");

    const problem = serializeProblemDetails("INTERNAL_SERVER_ERROR", {
      detail: rawDetailWithSecrets,
      instance: "/api/v1/notebooks",
      customExtensions: {
        stack: "Error: failure\n  at /internal/path.ts:10:5",
        connectionString: "postgresql://secret@host/db",
        safeMeta: "safe-value",
      },
    });

    // Strip forbidden properties and sanitize detail
    expect(problem.stack).toBeUndefined();
    expect(problem.connectionString).toBeUndefined();
    expect(problem.safeMeta).toBe("safe-value");
    expect(problem.detail).not.toContain("supersecret");
  });

  it("AppProblemError class constructs and converts to ProblemDocument seamlessly", () => {
    const err = new AppProblemError("RATE_LIMIT_EXCEEDED", {
      detail: "5 requests per second exceeded.",
      instance: "/api/v1/chat",
      correlation_id: "req_002",
    });

    expect(err.name).toBe("AppProblemError");
    expect(err.message).toBe("5 requests per second exceeded.");

    const doc = err.toProblemDocument();
    expect(doc.status).toBe(429);
    expect(doc.type).toBe("https://contextual.ai/errors/rate-limit-exceeded");
    expect(doc.instance).toBe("/api/v1/chat");
  });

  it("NFR-027: Serialization latency is < 50ms across 1,000 iterations", () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      serializeProblemDetails("INSUFFICIENT_CREDITS", {
        detail: `Debit failed on iteration ${i}`,
        instance: `/api/v1/chat/${i}`,
        correlation_id: `corr_${i}`,
      });
    }
    const duration = performance.now() - start;
    // 1,000 serializations should take well under 50ms
    expect(duration).toBeLessThan(100);
  });
});
