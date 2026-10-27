import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import {
  createTracer,
  formatTraceparent,
  parseTraceparent,
  extractTraceparent,
  injectTraceparent,
  setSpanExporter,
  OtlpSpanExporter,
  emitHeartbeat,
  onHeartbeat,
  getCorrelationId,
  getTraceparent,
  type SpanData,
  type HeartbeatPayload,
} from "../../packages/observability/src/index.js";

describe("Milestone M7: Story S7.3 — OpenTelemetry Tracing, W3C Propagation & Better Stack Export", () => {
  let exportedSpans: SpanData[] = [];
  let capturedHeartbeats: HeartbeatPayload[] = [];
  let removeHeartbeatListener: (() => void) | null = null;

  beforeEach(() => {
    exportedSpans = [];
    capturedHeartbeats = [];
    setSpanExporter((spans) => {
      exportedSpans.push(...spans);
    });
    removeHeartbeatListener = onHeartbeat((hb) => {
      capturedHeartbeats.push(hb);
    });
  });

  afterEach(() => {
    setSpanExporter(null);
    if (removeHeartbeatListener) {
      removeHeartbeatListener();
      removeHeartbeatListener = null;
    }
  });

  describe("W3C Traceparent Header Parsing & Propagation", () => {
    const validTrace = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";

    it("parses valid W3C traceparent header correctly", () => {
      const parsed = parseTraceparent(validTrace);
      expect(parsed).not.toBeNull();
      expect(parsed!.traceId).toBe("4bf92f3577b34da6a3ce929d0e0e4736");
      expect(parsed!.spanId).toBe("00f067aa0ba902b7");
      expect(parsed!.traceFlags).toBe(1);
    });

    it("formats SpanContext into valid W3C traceparent string", () => {
      const formatted = formatTraceparent({
        traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
        spanId: "00f067aa0ba902b7",
        traceFlags: 1,
      });
      expect(formatted).toBe(validTrace);
    });

    it("rejects malformed traceparent headers", () => {
      expect(parseTraceparent("not-a-trace")).toBeNull();
      expect(parseTraceparent("01-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01")).toBeNull(); // invalid version
      expect(parseTraceparent("00-short-00f067aa0ba902b7-01")).toBeNull();
    });

    it("rejects all-zero traceId or spanId per W3C spec", () => {
      const allZeroTrace = "00-00000000000000000000000000000000-00f067aa0ba902b7-01";
      const allZeroSpan = "00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01";
      expect(parseTraceparent(allZeroTrace)).toBeNull();
      expect(parseTraceparent(allZeroSpan)).toBeNull();
    });

    it("extracts and injects traceparent in headers record", () => {
      const headers: Record<string, string> = { traceparent: validTrace };
      const extracted = extractTraceparent(headers);
      expect(extracted).not.toBeNull();
      expect(extracted!.traceId).toBe("4bf92f3577b34da6a3ce929d0e0e4736");

      const outHeaders: Record<string, string> = {};
      injectTraceparent(outHeaders, extracted!);
      expect(outHeaders["traceparent"]).toBe(validTrace);
    });
  });

  describe("Tracer & Span Lifecycle", () => {
    it("creates active span, sets attributes, and captures end event", async () => {
      const tracer = createTracer("workspace-service");

      await tracer.withSpan("notebook.query", async (span) => {
        span.setAttribute("notebook.id", "nb-789");
        span.setAttribute("user.tier", "pro");
        span.addEvent("cache.miss", { key: "nb:nb-789" });

        // Traceparent should be accessible in active context during span
        const activeTrace = getTraceparent();
        expect(activeTrace).toBeDefined();
        expect(activeTrace!.includes(span.context.traceId)).toBe(true);

        return "query-result";
      });

      expect(exportedSpans.length).toBe(1);
      const recorded = exportedSpans[0]!;
      expect(recorded.name).toBe("notebook.query");
      expect(recorded.status.code).toBe("OK");
      expect(recorded.attributes["notebook.id"]).toBe("nb-789");
      expect(recorded.attributes["service.name"]).toBe("workspace-service");
      expect(recorded.events.length).toBe(1);
      expect(recorded.events[0]!.name).toBe("cache.miss");
      expect(recorded.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("captures exceptions, records exception event, and sets status ERROR", async () => {
      const tracer = createTracer("reasoning-engine");

      await expect(
        tracer.withSpan("reasoning.synthesize", async () => {
          throw new Error("Quota exceeded for test");
        })
      ).rejects.toThrow("Quota exceeded for test");

      expect(exportedSpans.length).toBe(1);
      const recorded = exportedSpans[0]!;
      expect(recorded.name).toBe("reasoning.synthesize");
      expect(recorded.status.code).toBe("ERROR");
      expect(recorded.status.message).toContain("Quota exceeded");
      expect(recorded.events.some((e) => e.name === "exception")).toBe(true);
    });

    it("inherits parent traceId when parent header is supplied", async () => {
      const tracer = createTracer("platform");
      const parentTrace = "00-11112222333344445555666677778888-aaaabbbbccccdddd-01";

      await tracer.withSpan(
        "child.operation",
        async (span) => {
          expect(span.context.traceId).toBe("11112222333344445555666677778888");
          expect(span.parentSpanId).toBe("aaaabbbbccccdddd");
        },
        { parent: parentTrace }
      );

      expect(exportedSpans.length).toBe(1);
      expect(exportedSpans[0]!.traceId).toBe("11112222333344445555666677778888");
      expect(exportedSpans[0]!.parentSpanId).toBe("aaaabbbbccccdddd");
    });
  });

  describe("OTLP Exporter Non-Blocking Timeout Guard (FM-704)", () => {
    it("handles simulated unreachable endpoint gracefully without failing callers", async () => {
      const failingExporter = new OtlpSpanExporter({
        endpoint: "http://10.255.255.1:9999", // unroutable IP
        timeoutMs: 50,
      });

      const start = Date.now();
      const res = await failingExporter.export([
        {
          name: "test.span",
          traceId: "12345678901234567890123456789012",
          spanId: "1234567890123456",
          traceFlags: 1,
          startTime: start,
          status: { code: "OK" },
          attributes: {},
          events: [],
        },
      ]);

      const elapsed = Date.now() - start;
      // Must not throw, returns false, and caps at timeout
      expect(res).toBe(false);
      expect(elapsed).toBeLessThan(300);
    });
  });

  describe("Heartbeat Liveness Monitor (NFR-031)", () => {
    it("emits healthy heartbeat pulse with metadata", async () => {
      const result = await emitHeartbeat("daily_credit_reset", "ok", {
        latencyMs: 120,
        metadata: { users_reset: 42 },
      });

      expect(result.job).toBe("daily_credit_reset");
      expect(result.status).toBe("ok");
      expect(result.latency_ms).toBe(120);
      expect(typeof result.timestamp).toBe("string");

      expect(capturedHeartbeats.length).toBe(1);
      expect(capturedHeartbeats[0]!.job).toBe("daily_credit_reset");
      expect(capturedHeartbeats[0]!.status).toBe("ok");
    });

    it("emits failed heartbeat pulse with error description", async () => {
      const result = await emitHeartbeat("retention_sweep", "down", {
        error: "Database lock timeout",
        latencyMs: 5000,
      });

      expect(result.status).toBe("down");
      expect(result.metadata?.error).toBe("Database lock timeout");

      expect(capturedHeartbeats.length).toBe(1);
      expect(capturedHeartbeats[0]!.job).toBe("retention_sweep");
      expect(capturedHeartbeats[0]!.status).toBe("down");
    });
  });
});
