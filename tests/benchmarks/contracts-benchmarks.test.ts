import { describe, expect, test } from "bun:test";
import {
  LATENCY_SLAS,
  CONCURRENCY_SLA,
  FREE_TIER_MANIFEST,
  BENCHMARK_SCENARIOS,
  assertLatencySLAConfig,
  assertConcurrencySLAConfig,
  assertFreeTierCloudManifest,
  assertBenchmarkRunSummary,
  calculatePercentile,
  ERROR_CATALOGUE,
} from "../../packages/contracts/src/index.js";

describe("Milestone M9: Story S9.1 — Benchmark Contracts & SLA Thresholds", () => {
  test("TC-9.1.1: LATENCY_SLAS conforms to LatencySLAConfig with exact NFR thresholds", () => {
    expect(() => assertLatencySLAConfig(LATENCY_SLAS)).not.toThrow();
    expect(LATENCY_SLAS.vectorSearchP95Ms).toBe(100);       // NFR-001
    expect(LATENCY_SLAS.llmTtftP90Ms).toBe(1500);           // NFR-002
    expect(LATENCY_SLAS.e2eReasoningP90Ms).toBe(4500);      // NFR-003
    expect(LATENCY_SLAS.errorSerializationP99Ms).toBe(50);  // NFR-027

    expect(() => assertLatencySLAConfig({ ...LATENCY_SLAS, vectorSearchP95Ms: -1 })).toThrow();
  });

  test("TC-9.1.2: CONCURRENCY_SLA conforms to ConcurrencySLAConfig with 50 CCU and < 1% error rate", () => {
    expect(() => assertConcurrencySLAConfig(CONCURRENCY_SLA)).not.toThrow();
    expect(CONCURRENCY_SLA.concurrentUsers).toBe(50);          // NFR-005
    expect(CONCURRENCY_SLA.maxErrorRatePercent).toBe(1.0);     // NFR-005
    expect(CONCURRENCY_SLA.targetDurationSeconds).toBe(60);

    expect(() => assertConcurrencySLAConfig({ ...CONCURRENCY_SLA, maxErrorRatePercent: 150 })).toThrow();
  });

  test("TC-9.1.3: FREE_TIER_MANIFEST documents all 8 cloud accounts with $0.00 ceiling", () => {
    expect(FREE_TIER_MANIFEST.length).toBeGreaterThanOrEqual(8);

    const requiredVendors = [
      "Vercel",
      "Clerk",
      "Neon",
      "Upstash",
      "Google AI Studio",
      "Groq",
      "Filebase",
      "Better Stack",
    ];

    for (const vendor of requiredVendors) {
      const entry = FREE_TIER_MANIFEST.find((m) => m.provider === vendor);
      expect(entry).toBeDefined();
      expect(entry!.monthlyCostLimitUsd).toBe(0);
      expect(entry!.creditCardRequired).toBe(false);
      expect(() => assertFreeTierCloudManifest(entry)).not.toThrow();
    }

    expect(() =>
      assertFreeTierCloudManifest({
        provider: "AWS",
        service: "EC2",
        freeTierTierName: "Paid",
        monthlyCostLimitUsd: 10,
        rateLimits: "unlimited",
        storageCeiling: "100GB",
        creditCardRequired: true,
      })
    ).toThrow();
  });

  test("TC-9.1.4: calculatePercentile computes accurate statistical percentiles", () => {
    // 100 sequential values: 1 to 100
    const values = Array.from({ length: 100 }, (_, i) => i + 1);

    expect(calculatePercentile(values, 50)).toBe(50.5);
    expect(calculatePercentile(values, 90)).toBe(90.1);
    expect(calculatePercentile(values, 95)).toBe(95.05);
    expect(calculateMathP99(values)).toBeGreaterThanOrEqual(99);

    // Single value edge case
    expect(calculatePercentile([42], 95)).toBe(42);
    // Empty array edge case
    expect(calculatePercentile([], 95)).toBe(0);
  });

  test("TC-9.1.5: BenchmarkRunSummary validates run summaries and assertBenchmarkRunSummary works", () => {
    expect(BENCHMARK_SCENARIOS).toContain("concurrency-mixed-50-ccu");
    expect(BENCHMARK_SCENARIOS).toContain("vector-latency-25k-points");
    expect(BENCHMARK_SCENARIOS).toContain("reasoning-e2e-pipeline");
    expect(BENCHMARK_SCENARIOS).toContain("multi-tenant-penetration");
    expect(BENCHMARK_SCENARIOS).toContain("zero-cost-ceiling-audit");

    const validSummary = {
      scenario: "concurrency-mixed-50-ccu" as const,
      totalRequests: 500,
      successfulRequests: 498,
      failedRequests: 2,
      errorRatePercent: 0.4,
      latencyP50Ms: 25.4,
      latencyP90Ms: 78.2,
      latencyP95Ms: 92.0,
      latencyP99Ms: 110.5,
      passed: true,
      timestamp: new Date().toISOString(),
    };

    expect(() => assertBenchmarkRunSummary(validSummary)).not.toThrow();

    const invalidSummary = { ...validSummary, errorRatePercent: 150 };
    expect(() => assertBenchmarkRunSummary(invalidSummary)).toThrow();
  });

  test("TC-9.1.6: Closed 17-member RFC 9457 error catalogue remains intact", () => {
    expect(Object.keys(ERROR_CATALOGUE).length).toBe(17);
    expect(ERROR_CATALOGUE.INSUFFICIENT_CREDITS).toBeDefined();
    expect(ERROR_CATALOGUE.RATE_LIMIT_EXCEEDED).toBeDefined();
    expect(ERROR_CATALOGUE.NOTEBOOK_EXPIRED).toBeDefined();
  });
});

function calculateMathP99(values: number[]): number {
  return calculatePercentile(values, 99);
}
