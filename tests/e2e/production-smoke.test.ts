import { describe, expect, it } from "bun:test";
import { ProductionSmokeRunner, type SmokeRunSummary } from "../../scripts/production-smoke.ts";

describe("Milestone GA: Story SGA.3 — Automated Post-Deployment Production Smoke Verification Suite", () => {
  const runner = new ProductionSmokeRunner();

  it("TC-GA.3.1: Phase 1 — Authentication & Identity validation passes", async () => {
    const res = await runner.verifyAuthPhase();
    expect(res.status).toBe("PASS");
    expect(res.phase).toBe(1);
    expect(res.durationMs).toBeGreaterThanOrEqual(0);
    expect(res.details.authenticated).toBe(true);
    expect(res.details.sub).toBe("user_smoke_test_ga");
  });

  it("TC-GA.3.2: Phase 2 — Transient ingestion verifies immediate S3 purge (BR-046)", async () => {
    const res = await runner.verifyIngestionPhase();
    expect(res.status).toBe("PASS");
    expect(res.phase).toBe(2);
    expect(res.details.stagedS3).toBe(true);
    expect(res.details.upsertedVector).toBe(true);
    expect(res.details.purgedS3Immediately).toBe(true);
  });

  it("TC-GA.3.3: Phase 3 — Grounded reasoning synthesis verifies inline citations (BR-009)", async () => {
    const res = await runner.verifyReasoningPhase();
    expect(res.status).toBe("PASS");
    expect(res.phase).toBe(3);
    expect(res.details.inlineCitationVerified).toBe(true);
    expect(res.details.citationCount).toBeGreaterThanOrEqual(1);
  });

  it("TC-GA.3.4: Phase 4 — Telemetry audit verifies W3C traceparent, correlation_id, and secret redaction (NFR-026, NFR-031)", async () => {
    const res = await runner.verifyTelemetryPhase();
    expect(res.status).toBe("PASS");
    expect(res.phase).toBe(4);
    expect(String(res.details.traceparent)).toStartWith("00-");
    expect(String(res.details.correlationId)).toStartWith("corr_");
    expect(res.details.secretsRedacted).toBe(true);
  });

  it("TC-GA.3.5: Full end-to-end smoke pipeline completes with PASS and all invariants certified", async () => {
    const summary: SmokeRunSummary = await runner.run();
    expect(summary.overallStatus).toBe("PASS");
    expect(summary.phases.length).toBe(4);
    expect(summary.totalDurationMs).toBeGreaterThanOrEqual(0);

    // Invariant assertions
    expect(summary.invariants.transientStorageZeroByte).toBe(true);
    expect(summary.invariants.tenantIsolationPreserved).toBe(true);
    expect(summary.invariants.citationsGrounded).toBe(true);
    expect(summary.invariants.secretsRedacted).toBe(true);
  });

  it("TC-GA.3.6: Smoke runner respects target URL configuration", () => {
    const customRunner = new ProductionSmokeRunner("https://custom-staging.vercel.app");
    expect(customRunner["targetUrl"]).toBe("https://custom-staging.vercel.app");
    expect(customRunner["isLive"]).toBe(true);
  });
});
