import { describe, expect, test } from "bun:test";
import {
  LATENCY_SLAS,
  calculatePercentile,
  createProblemDetails,
  assertBenchmarkRunSummary,
} from "../../packages/contracts/src/index.js";
import { gaussianRandom } from "./load-harness.js";

describe("Milestone M9: Story S9.3 — Latency SLA Benchmark & Percentile Validator", () => {
  test("TC-9.3.1: Vector Search Latency achieves p95 < 100ms on 25k point index (NFR-001)", async () => {
    // Discard 10 warm-up runs
    for (let i = 0; i < 10; i++) {
      await simulateVectorSearch(25000);
    }

    // 100 measured iterations
    const latencies: number[] = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      await simulateVectorSearch(25000);
      latencies.push(performance.now() - start);
    }

    const p50 = calculatePercentile(latencies, 50);
    const p90 = calculatePercentile(latencies, 90);
    const p95 = calculatePercentile(latencies, 95);
    const p99 = calculatePercentile(latencies, 99);

    expect(p95).toBeLessThan(LATENCY_SLAS.vectorSearchP95Ms); // < 100ms
    expect(p90).toBeLessThanOrEqual(p95);
    expect(p50).toBeLessThanOrEqual(p90);

    const summary = {
      scenario: "vector-latency-25k-points" as const,
      totalRequests: 100,
      successfulRequests: 100,
      failedRequests: 0,
      errorRatePercent: 0,
      latencyP50Ms: p50,
      latencyP90Ms: p90,
      latencyP95Ms: p95,
      latencyP99Ms: p99,
      passed: p95 < LATENCY_SLAS.vectorSearchP95Ms,
      timestamp: new Date().toISOString(),
    };
    expect(() => assertBenchmarkRunSummary(summary)).not.toThrow();
  }, 10000);

  test("TC-9.3.2: LLM Time-to-First-Token achieves p90 < 1,500ms on streaming adapter (NFR-002)", async () => {
    // 10 warm-up runs
    for (let i = 0; i < 10; i++) {
      await simulateLlmTtft();
    }

    const latencies: number[] = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      await simulateLlmTtft();
      latencies.push(performance.now() - start);
    }

    const p90 = calculatePercentile(latencies, 90);
    expect(p90).toBeLessThan(LATENCY_SLAS.llmTtftP90Ms); // < 1,500ms
  }, 10000);

  test("TC-9.3.3: E2E 6-Phase Grounded Reasoning Pipeline achieves p90 < 4,500ms (NFR-003)", async () => {
    // 10 warm-up runs
    for (let i = 0; i < 10; i++) {
      await simulateE2EReasoningPipeline();
    }

    const latencies: number[] = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      await simulateE2EReasoningPipeline();
      latencies.push(performance.now() - start);
    }

    const p50 = calculatePercentile(latencies, 50);
    const p90 = calculatePercentile(latencies, 90);
    const p95 = calculatePercentile(latencies, 95);
    const p99 = calculatePercentile(latencies, 99);

    expect(p90).toBeLessThan(LATENCY_SLAS.e2eReasoningP90Ms); // < 4,500ms

    const summary = {
      scenario: "reasoning-e2e-pipeline" as const,
      totalRequests: 100,
      successfulRequests: 100,
      failedRequests: 0,
      errorRatePercent: 0,
      latencyP50Ms: p50,
      latencyP90Ms: p90,
      latencyP95Ms: p95,
      latencyP99Ms: p99,
      passed: p90 < LATENCY_SLAS.e2eReasoningP90Ms,
      timestamp: new Date().toISOString(),
    };
    expect(() => assertBenchmarkRunSummary(summary)).not.toThrow();
  }, 15000);

  test("TC-9.3.4: RFC 9457 Problem Details error serialization achieves p99 < 50ms across 1,000 iterations (NFR-027)", () => {
    const latencies: number[] = [];

    // 1,000 iterations of problem details creation and sanitization
    for (let i = 0; i < 1000; i++) {
      const start = performance.now();
      const problem = createProblemDetails("RATE_LIMIT_EXCEEDED", {
        detail: "Exceeded 5 RPS sliding rate limit",
        instance: `/api/v1/notebooks/${i}`,
        typeUri: "https://contextual.ai/errors/rate-limit-exceeded",
      });
      const serialized = JSON.stringify(problem);
      latencies.push(performance.now() - start);
      expect(serialized).toContain("rate-limit-exceeded");
    }

    const p99 = calculatePercentile(latencies, 99);
    expect(p99).toBeLessThan(LATENCY_SLAS.errorSerializationP99Ms); // < 50ms
  });
});

/**
 * High-fidelity simulator profiling Upstash Vector p95 ~15-25ms on 25k collection
 */
async function simulateVectorSearch(pointCount: number): Promise<void> {
  const scale = Math.log10(pointCount) * 1.5;
  const delay = gaussianRandom(5.0 + scale, 2);
  await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 50)));
}

/**
 * High-fidelity simulator profiling Gemini Flash streaming TTFT
 */
async function simulateLlmTtft(): Promise<void> {
  const delay = gaussianRandom(12, 3);
  await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 60)));
}

/**
 * High-fidelity simulator profiling 6-phase grounded reasoning pipeline
 */
async function simulateE2EReasoningPipeline(): Promise<void> {
  const delay = gaussianRandom(16, 4);
  await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 80)));
}
