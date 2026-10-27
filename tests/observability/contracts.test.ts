import { describe, expect, test } from "bun:test";
import {
  HEADER_CORRELATION_ID,
  HEADER_TRACEPARENT,
  HEADER_UPSTASH_SIGNATURE,
  LOG_LEVELS,
  isValidLogLevel,
  isValidTraceparent,
  assertQStashWebhookPayload,
  assertRetentionSweepOptions,
  ERROR_CATALOGUE,
} from "@repo/contracts";

describe("Milestone M7: Story S7.1 — Shared Maintenance & Observability Contracts", () => {
  describe("Header Constants & Formats", () => {
    test("exports canonical header names", () => {
      expect(HEADER_CORRELATION_ID).toBe("x-correlation-id");
      expect(HEADER_TRACEPARENT).toBe("traceparent");
      expect(HEADER_UPSTASH_SIGNATURE).toBe("upstash-signature");
    });

    test("validates W3C traceparent format strictly", () => {
      const validTraceparent = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
      expect(isValidTraceparent(validTraceparent)).toBe(true);

      // Malformed versions
      expect(isValidTraceparent("invalid-traceparent")).toBe(false);
      expect(isValidTraceparent("01-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01")).toBe(false); // bad version
      expect(isValidTraceparent("00-short-00f067aa0ba902b7-01")).toBe(false);
      expect(isValidTraceparent("00-4bf92f3577b34da6a3ce929d0e0e4736-short-01")).toBe(false);
      expect(isValidTraceparent(null)).toBe(false);
      expect(isValidTraceparent(undefined)).toBe(false);
    });
  });

  describe("Log Levels", () => {
    test("exports canonical log levels", () => {
      expect(LOG_LEVELS).toEqual(["debug", "info", "warn", "error", "critical"]);
    });

    test("validates log levels correctly", () => {
      expect(isValidLogLevel("debug")).toBe(true);
      expect(isValidLogLevel("info")).toBe(true);
      expect(isValidLogLevel("warn")).toBe(true);
      expect(isValidLogLevel("error")).toBe(true);
      expect(isValidLogLevel("critical")).toBe(true);
      expect(isValidLogLevel("verbose")).toBe(false);
      expect(isValidLogLevel("trace")).toBe(false);
      expect(isValidLogLevel("")).toBe(false);
    });
  });

  describe("QStash Webhook Payload Assertions", () => {
    test("accepts valid daily_credit_reset payload", () => {
      expect(() =>
        assertQStashWebhookPayload({
          type: "daily_credit_reset",
          schedule_id: "sched_daily_0800",
          timestamp: "2026-10-27T08:00:00.000Z",
        })
      ).not.toThrow();
    });

    test("accepts valid retention_sweep payload", () => {
      expect(() =>
        assertQStashWebhookPayload({
          type: "retention_sweep",
          schedule_id: "sched_retention_weekly",
          dry_run: true,
        })
      ).not.toThrow();
    });

    test("rejects invalid webhook payload type", () => {
      expect(() =>
        assertQStashWebhookPayload({
          type: "unknown_task",
        })
      ).toThrow("Invalid QStash webhook type");

      expect(() => assertQStashWebhookPayload(null)).toThrow();
      expect(() => assertQStashWebhookPayload("not an object")).toThrow();
    });
  });

  describe("Retention Sweep Options Assertions", () => {
    test("accepts valid sweep options", () => {
      expect(() =>
        assertRetentionSweepOptions({
          idleDaysThreshold: 7,
          tombstoneTtlDays: 30,
          batchSize: 50,
          dryRun: false,
        })
      ).not.toThrow();
    });

    test("rejects invalid thresholds and bounds", () => {
      expect(() =>
        assertRetentionSweepOptions({
          idleDaysThreshold: 0,
        })
      ).toThrow("idleDaysThreshold must be a positive number");

      expect(() =>
        assertRetentionSweepOptions({
          batchSize: 2000,
        })
      ).toThrow("batchSize must be an integer between 1 and 1000");
    });
  });

  describe("Invariance of Closed 17-Member RFC 9457 Error Catalogue", () => {
    test("ensures catalogue contains exactly 17 members and includes NOTEBOOK_EXPIRED", () => {
      const keys = Object.keys(ERROR_CATALOGUE);
      expect(keys.length).toBe(17);
      expect(ERROR_CATALOGUE.NOTEBOOK_EXPIRED).toBeDefined();
      expect(ERROR_CATALOGUE.NOTEBOOK_EXPIRED.status).toBe(410);
      expect(ERROR_CATALOGUE.NOTEBOOK_EXPIRED.title).toBe("Notebook Expired");
      expect(ERROR_CATALOGUE.NOTEBOOK_EXPIRED.type).toBe("https://contextual.ai/errors/notebook-expired");
    });
  });
});
