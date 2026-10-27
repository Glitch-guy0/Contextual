/**
 * Benchmark Suite, Hardening & Security Audit Contracts
 * Grounding: FR-013, NFR-001..NFR-005, NFR-007, NFR-016, BR-002, BR-036, NFR-026, NFR-027
 */

/**
 * Latency SLA Configuration (NFR-001..NFR-003, NFR-027)
 */
export interface LatencySLAConfig {
  readonly vectorSearchP95Ms: number;
  readonly llmTtftP90Ms: number;
  readonly e2eReasoningP90Ms: number;
  readonly errorSerializationP99Ms: number;
}

export const LATENCY_SLAS: LatencySLAConfig = {
  vectorSearchP95Ms: 100,       // NFR-001: Vector search p95 < 100ms
  llmTtftP90Ms: 1500,           // NFR-002: Time to first token p90 < 1,500ms
  e2eReasoningP90Ms: 4500,      // NFR-003: 6-phase reasoning p90 < 4,500ms
  errorSerializationP99Ms: 50,  // NFR-027: Problem details serialization p99 < 50ms
};

export function assertLatencySLAConfig(data: unknown): asserts data is LatencySLAConfig {
  if (!data || typeof data !== "object") {
    throw new Error("LatencySLAConfig must be an object");
  }
  const d = data as Record<string, unknown>;
  if (typeof d.vectorSearchP95Ms !== "number" || d.vectorSearchP95Ms <= 0) {
    throw new Error("vectorSearchP95Ms must be a positive number");
  }
  if (typeof d.llmTtftP90Ms !== "number" || d.llmTtftP90Ms <= 0) {
    throw new Error("llmTtftP90Ms must be a positive number");
  }
  if (typeof d.e2eReasoningP90Ms !== "number" || d.e2eReasoningP90Ms <= 0) {
    throw new Error("e2eReasoningP90Ms must be a positive number");
  }
  if (typeof d.errorSerializationP99Ms !== "number" || d.errorSerializationP99Ms <= 0) {
    throw new Error("errorSerializationP99Ms must be a positive number");
  }
}

/**
 * Concurrency SLA Configuration (NFR-005)
 */
export interface ConcurrencySLAConfig {
  readonly concurrentUsers: number;
  readonly maxErrorRatePercent: number;
  readonly targetDurationSeconds: number;
}

export const CONCURRENCY_SLA: ConcurrencySLAConfig = {
  concurrentUsers: 50,          // NFR-005: 50 CCU
  maxErrorRatePercent: 1.0,     // NFR-005: Error rate < 1.0%
  targetDurationSeconds: 60,
};

export function assertConcurrencySLAConfig(data: unknown): asserts data is ConcurrencySLAConfig {
  if (!data || typeof data !== "object") {
    throw new Error("ConcurrencySLAConfig must be an object");
  }
  const d = data as Record<string, unknown>;
  if (typeof d.concurrentUsers !== "number" || d.concurrentUsers <= 0 || !Number.isInteger(d.concurrentUsers)) {
    throw new Error("concurrentUsers must be a positive integer");
  }
  if (typeof d.maxErrorRatePercent !== "number" || d.maxErrorRatePercent < 0 || d.maxErrorRatePercent > 100) {
    throw new Error("maxErrorRatePercent must be a number between 0 and 100");
  }
  if (typeof d.targetDurationSeconds !== "number" || d.targetDurationSeconds <= 0) {
    throw new Error("targetDurationSeconds must be a positive number");
  }
}

/**
 * Free-Tier Cloud Manifest (NFR-016)
 */
export interface FreeTierCloudManifest {
  readonly provider: string;
  readonly service: string;
  readonly freeTierTierName: string;
  readonly monthlyCostLimitUsd: 0;
  readonly rateLimits: string;
  readonly storageCeiling: string;
  readonly creditCardRequired: false;
}

export const FREE_TIER_MANIFEST: readonly FreeTierCloudManifest[] = [
  {
    provider: "Vercel",
    service: "Next.js App Hosting",
    freeTierTierName: "Hobby",
    monthlyCostLimitUsd: 0,
    rateLimits: "100GB bandwidth/mo",
    storageCeiling: "Serverless ephemeral",
    creditCardRequired: false,
  },
  {
    provider: "Clerk",
    service: "OAuth & JWT Auth",
    freeTierTierName: "Free",
    monthlyCostLimitUsd: 0,
    rateLimits: "10,000 MAU",
    storageCeiling: "Managed users",
    creditCardRequired: false,
  },
  {
    provider: "Neon",
    service: "Serverless Postgres",
    freeTierTierName: "Free Tier",
    monthlyCostLimitUsd: 0,
    rateLimits: "Auto-suspend 5m",
    storageCeiling: "0.5 GB shared",
    creditCardRequired: false,
  },
  {
    provider: "Upstash",
    service: "Redis (Metering & Memory)",
    freeTierTierName: "Free",
    monthlyCostLimitUsd: 0,
    rateLimits: "10,000 commands/day",
    storageCeiling: "256 MB",
    creditCardRequired: false,
  },
  {
    provider: "Upstash",
    service: "Vector (Semantic Index)",
    freeTierTierName: "Free",
    monthlyCostLimitUsd: 0,
    rateLimits: "10,000 queries/day",
    storageCeiling: "10,000 vectors",
    creditCardRequired: false,
  },
  {
    provider: "Upstash",
    service: "QStash (Cron Schedules)",
    freeTierTierName: "Free",
    monthlyCostLimitUsd: 0,
    rateLimits: "500 messages/day",
    storageCeiling: "Message queue ephemeral",
    creditCardRequired: false,
  },
  {
    provider: "Google AI Studio",
    service: "Gemini 1.5 Flash / Embeddings",
    freeTierTierName: "Free Tier",
    monthlyCostLimitUsd: 0,
    rateLimits: "15 RPM / 1M TPM",
    storageCeiling: "Zero persistent",
    creditCardRequired: false,
  },
  {
    provider: "Groq",
    service: "Llama-3.3-70B Versatile",
    freeTierTierName: "Free Developer",
    monthlyCostLimitUsd: 0,
    rateLimits: "30 RPM / 6,000 TPM",
    storageCeiling: "Zero persistent",
    creditCardRequired: false,
  },
  {
    provider: "Filebase",
    service: "S3 Transient Staging",
    freeTierTierName: "Free",
    monthlyCostLimitUsd: 0,
    rateLimits: "Standard S3 API",
    storageCeiling: "5 GB IPFS/S3",
    creditCardRequired: false,
  },
  {
    provider: "Better Stack",
    service: "Logtail Structured Logs",
    freeTierTierName: "Free",
    monthlyCostLimitUsd: 0,
    rateLimits: "1 GB ingestion/mo",
    storageCeiling: "3-day retention",
    creditCardRequired: false,
  },
] as const;

export function assertFreeTierCloudManifest(data: unknown): asserts data is FreeTierCloudManifest {
  if (!data || typeof data !== "object") {
    throw new Error("FreeTierCloudManifest must be an object");
  }
  const d = data as Record<string, unknown>;
  if (typeof d.provider !== "string" || d.provider.length === 0) {
    throw new Error("provider must be a non-empty string");
  }
  if (typeof d.service !== "string" || d.service.length === 0) {
    throw new Error("service must be a non-empty string");
  }
  if (typeof d.freeTierTierName !== "string" || d.freeTierTierName.length === 0) {
    throw new Error("freeTierTierName must be a non-empty string");
  }
  if (d.monthlyCostLimitUsd !== 0) {
    throw new Error("monthlyCostLimitUsd must be strictly 0");
  }
  if (typeof d.rateLimits !== "string" || d.rateLimits.length === 0) {
    throw new Error("rateLimits must be a non-empty string");
  }
  if (typeof d.storageCeiling !== "string" || d.storageCeiling.length === 0) {
    throw new Error("storageCeiling must be a non-empty string");
  }
  if (d.creditCardRequired !== false) {
    throw new Error("creditCardRequired must be strictly false");
  }
}

/**
 * Benchmark Scenario Definitions
 */
export type BenchmarkScenario =
  | "concurrency-mixed-50-ccu"
  | "vector-latency-25k-points"
  | "reasoning-e2e-pipeline"
  | "multi-tenant-penetration"
  | "zero-cost-ceiling-audit";

export const BENCHMARK_SCENARIOS: readonly BenchmarkScenario[] = [
  "concurrency-mixed-50-ccu",
  "vector-latency-25k-points",
  "reasoning-e2e-pipeline",
  "multi-tenant-penetration",
  "zero-cost-ceiling-audit",
] as const;

/**
 * Benchmark Run Summary
 */
export interface BenchmarkRunSummary {
  readonly scenario: BenchmarkScenario;
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly errorRatePercent: number;
  readonly latencyP50Ms: number;
  readonly latencyP90Ms: number;
  readonly latencyP95Ms: number;
  readonly latencyP99Ms: number;
  readonly passed: boolean;
  readonly timestamp: string;
}

export function assertBenchmarkRunSummary(data: unknown): asserts data is BenchmarkRunSummary {
  if (!data || typeof data !== "object") {
    throw new Error("BenchmarkRunSummary must be an object");
  }
  const d = data as Record<string, unknown>;
  if (!BENCHMARK_SCENARIOS.includes(d.scenario as BenchmarkScenario)) {
    throw new Error(`Invalid benchmark scenario: ${String(d.scenario)}`);
  }
  if (typeof d.totalRequests !== "number" || d.totalRequests < 0 || !Number.isInteger(d.totalRequests)) {
    throw new Error("totalRequests must be a non-negative integer");
  }
  if (typeof d.successfulRequests !== "number" || d.successfulRequests < 0 || !Number.isInteger(d.successfulRequests)) {
    throw new Error("successfulRequests must be a non-negative integer");
  }
  if (typeof d.failedRequests !== "number" || d.failedRequests < 0 || !Number.isInteger(d.failedRequests)) {
    throw new Error("failedRequests must be a non-negative integer");
  }
  if (typeof d.errorRatePercent !== "number" || d.errorRatePercent < 0 || d.errorRatePercent > 100) {
    throw new Error("errorRatePercent must be between 0 and 100");
  }
  if (typeof d.latencyP50Ms !== "number" || d.latencyP50Ms < 0) {
    throw new Error("latencyP50Ms must be non-negative");
  }
  if (typeof d.latencyP90Ms !== "number" || d.latencyP90Ms < 0) {
    throw new Error("latencyP90Ms must be non-negative");
  }
  if (typeof d.latencyP95Ms !== "number" || d.latencyP95Ms < 0) {
    throw new Error("latencyP95Ms must be non-negative");
  }
  if (typeof d.latencyP99Ms !== "number" || d.latencyP99Ms < 0) {
    throw new Error("latencyP99Ms must be non-negative");
  }
  if (typeof d.passed !== "boolean") {
    throw new Error("passed must be a boolean");
  }
  if (typeof d.timestamp !== "string" || Number.isNaN(Date.parse(d.timestamp))) {
    throw new Error("timestamp must be a valid ISO date string");
  }
}

/**
 * Calculate statistical percentile from sample values
 */
export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0]!;

  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) {
    return sorted[lower]!;
  }

  const val = (sorted[lower]! * (1 - weight)) + (sorted[upper]! * weight);
  return Math.round(val * 10000) / 10000;
}
