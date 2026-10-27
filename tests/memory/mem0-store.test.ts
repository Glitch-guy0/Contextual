import { describe, expect, test, beforeEach } from "bun:test";
import {
  InProcessMem0Store,
  InMemoryRedis,
  InMemoryVectorStore,
} from "../../packages/memory/src/index.js";

describe("Milestone M6: Story S6.5 — In-Process Mem0 Engine & Deduplication", () => {
  let redis: InMemoryRedis;
  let vector: InMemoryVectorStore;
  let store: InProcessMem0Store;

  beforeEach(() => {
    redis = new InMemoryRedis();
    vector = new InMemoryVectorStore();
    store = new InProcessMem0Store({
      redisClient: redis,
      vectorClient: vector,
      dedupThreshold: 0.85,
    });
  });

  describe("Fact Extraction & Deduplication (> 0.85)", () => {
    test("TC-6.5.1: First memory creates new record in both Redis and Vector", async () => {
      const result = await store.add("user_alice", "Prefers dark mode with high contrast accessibility tokens", {
        category: "preference",
      });

      expect(result.memoryId).toBeDefined();
      expect(result.status).toBe("created");

      // Verify entity stored in Redis
      const redisItem = await store.get("user_alice", result.memoryId);
      expect(redisItem).not.toBeNull();
      expect(redisItem?.content).toContain("dark mode");

      // Verify searchable via vector
      const searchHits = await store.search("user_alice", "dark mode contrast");
      expect(searchHits.length).toBeGreaterThan(0);
      expect(searchHits[0].id).toBe(result.memoryId);
    });

    test("TC-6.5.2: Identical or highly similar memory (> 0.85) is deduplicated", async () => {
      const first = await store.add("user_alice", "Prefers dark mode with high contrast accessibility tokens", {
        category: "preference",
      });
      expect(first.status).toBe("created");

      // Add identical memory
      const second = await store.add("user_alice", "Prefers dark mode with high contrast accessibility tokens", {
        category: "preference",
        updated_note: "re-asserted",
      });

      expect(second.status).toBe("deduplicated");
      expect(second.memoryId).toBe(first.memoryId);

      // Verify only 1 memory exists in list
      const all = await store.list("user_alice");
      expect(all.length).toBe(1);
      expect(all[0].id).toBe(first.memoryId);
    });

    test("TC-6.5.3: Distinct memory creates separate record", async () => {
      const m1 = await store.add("user_alice", "Prefers Python for numerical analysis and pandas");
      const m2 = await store.add("user_alice", "Prefers TypeScript for distributed web services");

      expect(m1.status).toBe("created");
      expect(m2.status).toBe("created");
      expect(m1.memoryId).not.toBe(m2.memoryId);

      const all = await store.list("user_alice");
      expect(all.length).toBe(2);
    });
  });

  describe("Cascade Deletion Across Multi-Store", () => {
    test("TC-6.5.4: Delete single memory removes from both stores", async () => {
      const added = await store.add("user_alice", "Temporary memory point");
      const deleted = await store.delete("user_alice", added.memoryId);
      expect(deleted).toBe(true);

      const getCheck = await store.get("user_alice", added.memoryId);
      expect(getCheck).toBeNull();

      const searchCheck = await store.search("user_alice", "Temporary memory point");
      expect(searchCheck.length).toBe(0);
    });

    test("TC-6.5.5: deleteUserMemories purges all tenant records across Redis and Vector", async () => {
      await store.add("user_alice", "Alice memory 1");
      await store.add("user_alice", "Alice memory 2");

      const purge = await store.deleteUserMemories("user_alice");
      expect(purge.deletedCount).toBe(2);

      const all = await store.list("user_alice");
      expect(all.length).toBe(0);

      const search = await store.search("user_alice", "Alice memory");
      expect(search.length).toBe(0);
    });
  });
});
