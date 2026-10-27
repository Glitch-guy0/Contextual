import { describe, expect, test, beforeEach } from "bun:test";
import {
  UpstashVectorMemoryStore,
  InMemoryVectorStore,
  generateDeterministic768Embedding,
} from "../../packages/memory/src/index.js";

describe("Milestone M6: Story S6.4 — Upstash Vector Semantic Memory Adapter", () => {
  let vectorStore: InMemoryVectorStore;
  let memoryStore: UpstashVectorMemoryStore;

  beforeEach(() => {
    vectorStore = new InMemoryVectorStore();
    memoryStore = new UpstashVectorMemoryStore({ vectorClient: vectorStore });
  });

  describe("Embedding & Vector Upsert", () => {
    test("TC-6.4.1: Generates 768-dimensional normalized embeddings", () => {
      const vec = generateDeterministic768Embedding("User prefers Next.js App Router with server actions");
      expect(vec.length).toBe(768);

      let norm = 0;
      for (const x of vec) norm += x * x;
      expect(Math.abs(Math.sqrt(norm) - 1.0)).toBeLessThan(0.001);
    });

    test("TC-6.4.2: Add memory indexes 768-dim vector with tenant metadata filter", async () => {
      const added = await memoryStore.add("user_alice", "Prefers Tailwind CSS v4 and shadcn/ui", {
        category: "preference",
      });

      expect(added.memoryId).toBeDefined();
      expect(added.status).toBe("created");

      // Verify search finds it
      const hits = await memoryStore.search("user_alice", "Tailwind styling");
      expect(hits.length).toBeGreaterThan(0);
      expect(hits[0].content).toContain("Tailwind CSS");
      expect(hits[0].score).toBeDefined();
      expect(hits[0].score!).toBeGreaterThan(0.2);
    });
  });

  describe("Multi-Tenant Semantic Isolation (AC-6.4, BR-002, BR-019)", () => {
    test("TC-6.4.3: User B searching identical keywords seeded by User A receives empty array", async () => {
      await memoryStore.add("user_alice", "Top secret: migrating core database to CockroachDB in Q4", {
        category: "fact",
      });

      // Alice can search and find her secret
      const aliceHits = await memoryStore.search("user_alice", "CockroachDB database migration");
      expect(aliceHits.length).toBe(1);
      expect(aliceHits[0].content).toContain("CockroachDB");

      // Bob searches exact same query
      const bobHits = await memoryStore.search("user_bob", "CockroachDB database migration");
      expect(bobHits.length).toBe(0);
      expect(bobHits).toEqual([]);
    });

    test("TC-6.4.4: Deletion cascade purges all vectors for a tenant", async () => {
      await memoryStore.add("user_alice", "Memory item A");
      await memoryStore.add("user_alice", "Memory item B");

      const purgeResult = await memoryStore.deleteUserMemories("user_alice");
      expect(purgeResult.deletedCount).toBe(2);

      const afterHits = await memoryStore.search("user_alice", "Memory item");
      expect(afterHits.length).toBe(0);
    });
  });

  describe("Latency SLA (AC-6.3, NFR-008 < 150ms p95)", () => {
    test("TC-6.4.5: Vector search query executes in p95 < 150ms across 50 iterations", async () => {
      await memoryStore.add("user_perf", "Large scale distributed streaming with Apache Flink");
      await memoryStore.add("user_perf", "Real-time stateful stream processing and checkpoints");
      await memoryStore.add("user_perf", "Event-driven microservices architecture");

      const latencies: number[] = [];

      for (let i = 0; i < 50; i++) {
        const start = performance.now();
        const hits = await memoryStore.search("user_perf", "Flink stream processing", { limit: 3 });
        const elapsed = performance.now() - start;
        latencies.push(elapsed);
        expect(hits.length).toBeGreaterThan(0);
      }

      latencies.sort((a, b) => a - b);
      const p95Index = Math.floor(latencies.length * 0.95);
      const p95Latency = latencies[p95Index];

      expect(p95Latency).toBeLessThan(150.0);
    });
  });
});
