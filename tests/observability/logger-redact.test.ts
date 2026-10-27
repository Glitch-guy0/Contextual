import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import {
  runWithCorrelation,
  getCorrelationId,
  getTraceparent,
  createCorrelationId,
  getLogger,
  formatJsonLog,
  setLogDestination,
  redactSecrets,
  redactString,
  type LogEntry,
} from "../../packages/observability/src/index.js";

describe("Milestone M7: Story S7.2 — Logger, Async Context & Secret Redaction", () => {
  let capturedLogs: LogEntry[] = [];

  beforeEach(() => {
    capturedLogs = [];
    setLogDestination((entry) => {
      capturedLogs.push(entry);
    });
  });

  afterEach(() => {
    setLogDestination(null);
  });

  describe("AsyncLocalStorage Correlation Context", () => {
    it("returns 'none' when outside correlation context", () => {
      expect(getCorrelationId()).toBe("none");
      expect(getTraceparent()).toBeUndefined();
    });

    it("runs within correlation context using explicit correlationId and traceparent", async () => {
      const testId = "corr_test_123456";
      const testTraceparent = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";

      await runWithCorrelation({ correlationId: testId, traceparent: testTraceparent }, async () => {
        expect(getCorrelationId()).toBe(testId);
        expect(getTraceparent()).toBe(testTraceparent);

        // Nested async call preserves context
        await new Promise((resolve) => setTimeout(resolve, 5));
        expect(getCorrelationId()).toBe(testId);
        expect(getTraceparent()).toBe(testTraceparent);
      });

      // Cleans up after execution
      expect(getCorrelationId()).toBe("none");
      expect(getTraceparent()).toBeUndefined();
    });

    it("generates corr_ UUID when correlationId is omitted", () => {
      runWithCorrelation({}, () => {
        const id = getCorrelationId();
        expect(id.startsWith("corr_")).toBe(true);
        expect(id.length).toBeGreaterThan(10);
      });
    });

    it("accepts string shorthand as correlationId", () => {
      runWithCorrelation("req-xyz-789", () => {
        expect(getCorrelationId()).toBe("req-xyz-789");
      });
    });

    it("properly scopes concurrent async contexts without cross-talk", async () => {
      const taskA = runWithCorrelation("task-A-id", async () => {
        await new Promise((r) => setTimeout(r, 10));
        return getCorrelationId();
      });

      const taskB = runWithCorrelation("task-B-id", async () => {
        await new Promise((r) => setTimeout(r, 5));
        return getCorrelationId();
      });

      const [resA, resB] = await Promise.all([taskA, taskB]);
      expect(resA).toBe("task-A-id");
      expect(resB).toBe("task-B-id");
    });
  });

  describe("Pino-Compatible Structured JSON Logger", () => {
    it("emits log adhering strictly to platform schema", () => {
      const logger = getLogger("test-service", "debug");
      logger.info("notebook.created", { notebook_id: "nb-123", title: "My Research" });

      expect(capturedLogs.length).toBe(1);
      const log = capturedLogs[0]!;

      expect(log.service).toBe("test-service");
      expect(log.level).toBe("info");
      expect(log.event).toBe("notebook.created");
      expect(log.correlation_id).toBe("none");
      expect(typeof log.timestamp).toBe("string");
      expect((log.payload as any).notebook_id).toBe("nb-123");
    });

    it("injects correlation_id and traceparent when running inside context", () => {
      const logger = getLogger("platform", "debug");
      const trace = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";

      runWithCorrelation({ correlationId: "corr_session_999", traceparent: trace }, () => {
        logger.info("auth.verified", { user_id: "user_abc" });
      });

      expect(capturedLogs.length).toBe(1);
      const log = capturedLogs[0]!;
      expect(log.correlation_id).toBe("corr_session_999");
      expect(log.traceparent).toBe(trace);
    });

    it("respects log level thresholds", () => {
      const logger = getLogger("filtered-service", "warn");

      logger.debug("debug.event", { ignored: true });
      logger.info("info.event", { ignored: true });
      logger.warn("warn.event", { allowed: true });
      logger.error("error.event", { allowed: true });

      expect(capturedLogs.length).toBe(2);
      expect(capturedLogs[0]!.event).toBe("warn.event");
      expect(capturedLogs[1]!.event).toBe("error.event");
    });

    it("formats manual JSON log entry with formatJsonLog", () => {
      const entry = formatJsonLog("critical", "system.outage", { reason: "db down" }, {
        service: "ingestion",
        correlationId: "corr-direct-123",
      });

      expect(entry.level).toBe("critical");
      expect(entry.service).toBe("ingestion");
      expect(entry.correlation_id).toBe("corr-direct-123");
      expect(entry.event).toBe("system.outage");
    });
  });

  describe("Deep Secret & PII Redactor", () => {
    it("redacts Bearer JWT tokens in strings", () => {
      const raw = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakMe";
      const redacted = redactString(raw);
      expect(redacted).toBe("Authorization: Bearer [REDACTED]");
    });

    it("redacts Clerk secret keys (live and test)", () => {
      const live = "clerk_key: sk_live_9a8b7c6d5e4f3a2b1c0d";
      const test = "clerk_key: sk_test_123456789abcdef";
      expect(redactString(live)).toBe("clerk_key: sk_[REDACTED]");
      expect(redactString(test)).toBe("clerk_key: sk_[REDACTED]");
    });

    it("redacts Postgres connection URIs", () => {
      const raw = "Connecting to postgresql://postgres:mysecretpassword@ep-super-pool.us-east-2.aws.neon.tech/neondb?sslmode=require";
      expect(redactString(raw)).toBe("Connecting to postgresql://[REDACTED]@[REDACTED]");
    });

    it("redacts Google API keys", () => {
      const raw = "Gemini key: AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q";
      expect(redactString(raw)).toBe("Gemini key: AIza[REDACTED]");
    });

    it("redacts sensitive object keys recursively", () => {
      const payload = {
        user_id: "user_123",
        email: "alice@example.com",
        password: "superSecurePassword123!",
        secret: "top_secret_data",
        api_key: "some_key_value",
        nested: {
          client_secret: "cl_secret_xyz",
          safe_field: "hello world",
          tokens: ["normal", "token123", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.sig"],
        },
      };

      const sanitized = redactSecrets(payload) as any;

      expect(sanitized.user_id).toBe("user_123");
      expect(sanitized.email).toBe("alice@example.com");
      expect(sanitized.password).toBe("[REDACTED]");
      expect(sanitized.secret).toBe("[REDACTED]");
      expect(sanitized.api_key).toBe("[REDACTED]");
      expect(sanitized.nested.client_secret).toBe("[REDACTED]");
      expect(sanitized.nested.safe_field).toBe("hello world");
      expect(sanitized.nested.tokens[2]).toBe("Bearer [REDACTED]");
    });

    it("handles circular object references without throwing or stack overflowing", () => {
      const circularObj: any = { name: "loop", secret: "super-secret" };
      circularObj.self = circularObj;

      const sanitized = redactSecrets(circularObj) as any;
      expect(sanitized.name).toBe("loop");
      expect(sanitized.secret).toBe("[REDACTED]");
      expect(sanitized.self).toBe("[CIRCULAR]");
    });

    it("sanitizes Error objects with embedded sensitive information", () => {
      const err = new Error("Failed to connect: postgresql://admin:secret123@db.prod.internal/main");
      (err as any).token = "leaked-token";

      const sanitized = redactSecrets(err) as any;
      expect(sanitized.name).toBe("Error");
      expect(sanitized.message).toContain("[REDACTED]");
      expect(sanitized.message).not.toContain("secret123");
      expect(sanitized.token).toBe("[REDACTED]");
    });

    it("automatically redacts logger payloads on emit", () => {
      const logger = getLogger("security-audit", "debug");
      logger.info("auth.attempt", {
        user_id: "usr_42",
        token: "jwt_raw_secret_here",
        connection_url: "postgres://user:pass@localhost:5432/db",
      });

      expect(capturedLogs.length).toBe(1);
      const payload = capturedLogs[0]!.payload as any;
      expect(payload.user_id).toBe("usr_42");
      expect(payload.token).toBe("[REDACTED]");
      expect(payload.connection_url).toBe("postgresql://[REDACTED]@[REDACTED]");
    });
  });
});
