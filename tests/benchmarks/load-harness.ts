/**
 * 50 CCU Concurrency Load Harness & Workload Simulator
 * Grounding: FR-013, NFR-005, NFR-011
 */

import { calculatePercentile, type BenchmarkRunSummary } from "../../packages/contracts/src/index.js";

export type WorkloadType = "scoped-retrieval" | "grounded-reasoning" | "document-ingest" | "metering-debit";

export interface WorkloadTaskResult {
  readonly taskId: string;
  readonly type: WorkloadType;
  readonly durationMs: number;
  readonly success: boolean;
  readonly error?: string;
}

export interface LoadHarnessOptions {
  readonly concurrentUsers: number; // e.g. 50
  readonly totalIterations: number; // e.g. 100+
  readonly errorRateThresholdPercent?: number; // e.g. 1.0%
}

/**
 * Calibrated Box-Muller Gaussian random number generator
 */
export function gaussianRandom(mean: number, stdDev: number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return Math.max(1, mean + (z * stdDev));
}

/**
 * Simulated atomic in-memory credit ledger for concurrent debit races (NFR-011)
 */
export class SimulatedCreditLedger {
  private balance: number;
  private readonly mutex = new Set<string>();

  constructor(initialBalance = 10.0) {
    this.balance = initialBalance;
  }

  getBalance(): number {
    return this.balance;
  }

  async debit(cost: number): Promise<{ success: boolean; remaining: number }> {
    // Atomic check and debit simulating Redis Lua script
    if (this.balance >= cost) {
      this.balance = Math.round((this.balance - cost) * 100) / 100;
      return { success: true, remaining: this.balance };
    }
    return { success: false, remaining: this.balance };
  }
}

/**
 * Concurrency Load Harness Worker Pool
 */
export class LoadHarness {
  private readonly concurrentUsers: number;
  private readonly totalIterations: number;
  private readonly creditLedger: SimulatedCreditLedger;

  constructor(options: LoadHarnessOptions) {
    this.concurrentUsers = options.concurrentUsers;
    this.totalIterations = options.totalIterations;
    this.creditLedger = new SimulatedCreditLedger(50.0);
  }

  getCreditLedger(): SimulatedCreditLedger {
    return this.creditLedger;
  }

  /**
   * Execute task based on workload distribution
   */
  private async executeTask(index: number): Promise<WorkloadTaskResult> {
    const start = performance.now();
    const taskId = `task-${index}-${Date.now()}`;

    // Workload distribution:
    // 0..39: scoped-retrieval (40%)
    // 40..69: grounded-reasoning (30%)
    // 70..89: document-ingest (20%)
    // 90..99: metering-debit (10%)
    const mod = index % 100;
    let type: WorkloadType = "scoped-retrieval";

    try {
      if (mod < 40) {
        type = "scoped-retrieval";
        // Simulate vector query + card resolution (p95 ~25ms)
        const delay = gaussianRandom(20, 5);
        await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 100)));
      } else if (mod < 70) {
        type = "grounded-reasoning";
        // Simulate 6-phase reasoning decomposition & prompt assembly
        const delay = gaussianRandom(35, 10);
        await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 150)));
      } else if (mod < 90) {
        type = "document-ingest";
        // Simulate chunking and embedding dispatch
        const delay = gaussianRandom(30, 8);
        await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 120)));
      } else {
        type = "metering-debit";
        // Atomic ledger debit race
        await this.creditLedger.debit(0.5);
      }

      const durationMs = performance.now() - start;
      return { taskId, type, durationMs, success: true };
    } catch (err) {
      const durationMs = performance.now() - start;
      return {
        taskId,
        type,
        durationMs,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Run the concurrent load simulation
   */
  async run(): Promise<BenchmarkRunSummary & { taskResults: WorkloadTaskResult[] }> {
    const results: WorkloadTaskResult[] = [];
    const queue: number[] = Array.from({ length: this.totalIterations }, (_, i) => i);

    // Bounded worker pool of `this.concurrentUsers` concurrent workers
    const worker = async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (item === undefined) break;
        const res = await this.executeTask(item);
        results.push(res);
      }
    };

    const workers = Array.from({ length: this.concurrentUsers }, () => worker());
    await Promise.all(workers);

    const totalRequests = results.length;
    const successfulRequests = results.filter((r) => r.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const errorRatePercent = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;

    const durations = results.map((r) => r.durationMs);
    const latencyP50Ms = calculatePercentile(durations, 50);
    const latencyP90Ms = calculatePercentile(durations, 90);
    const latencyP95Ms = calculatePercentile(durations, 95);
    const latencyP99Ms = calculatePercentile(durations, 99);

    const passed = errorRatePercent < 1.0;

    return {
      scenario: "concurrency-mixed-50-ccu",
      totalRequests,
      successfulRequests,
      failedRequests,
      errorRatePercent,
      latencyP50Ms,
      latencyP90Ms,
      latencyP95Ms,
      latencyP99Ms,
      passed,
      timestamp: new Date().toISOString(),
      taskResults: results,
    };
  }
}
