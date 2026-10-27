import { describe, expect, test, beforeEach } from "bun:test";
import {
  InProcessMem0Store,
  InMemoryRedis,
  InMemoryVectorStore,
} from "../../packages/memory/src/index.js";

describe("Milestone M6: Story S6.6 — Multi-Tenant Isolation Suite (AC-6.4, BR-002, BR-019)", () => {
  let redis: InMemoryRedis;
  let vector: InMemoryVectorStore;
  let store: InProcessMem0Store;

  beforeEach(() => {
    redis = new InMemoryRedis();
    vector = new InMemoryVectorStore();
    store = new InProcessMem0Store({
      redisClient: redis,
      vectorClient: vector,
    });
  });

  test("TC-6.6.1: 50 Iterations — User B receives zero hits when searching User A's seeded memory keywords", async () => {
    const memoryCorpus = [
      "User A prefers concise bullet point summaries with bold headings",
      "User A is building an autonomous financial risk audit pipeline",
      "User A always requires code examples in idiomatic TypeScript and Bun",
      "User A strictly requires ISO 27001 data classification tags on documents",
      "User A frequently analyzes medical imaging DICOM headers with Python",
    ];

    // Seed memories for User A
    for (const mem of memoryCorpus) {
      await store.add("tenant_user_a", mem, { category: "preference" });
    }

    // Verify User A can find their memories
    const userAHits = await store.search("tenant_user_a", "TypeScript Bun bullet summaries", { limit: 5 });
    expect(userAHits.length).toBeGreaterThan(0);
    expect(userAHits.every((hit) => hit.userId === "tenant_user_a")).toBe(true);

    // 50 test iterations from User B querying User A's topics
    const queries = [
      "bullet point summaries",
      "autonomous financial risk audit",
      "idiomatic TypeScript Bun code",
      "ISO 27001 data classification",
      "DICOM headers Python",
      "summaries bold headings",
      "financial audit pipeline",
      "TypeScript code",
      "medical imaging",
      "data classification tags",
    ];

    for (let i = 0; i < 50; i++) {
      const q = queries[i % queries.length]!;
      const userBHits = await store.search("tenant_user_b", q, { limit: 10 });

      // Zero-leakage invariant: User B MUST receive zero results
      expect(userBHits.length).toBe(0);
    }
  });

  test("TC-6.6.2: Direct ID Access Guard — User B cannot retrieve User A's memory by ID", async () => {
    const addResult = await store.add("tenant_user_a", "Secret corporate roadmap notes", {
      category: "fact",
    });

    // User A can get it
    const aItem = await store.get("tenant_user_a", addResult.memoryId);
    expect(aItem).not.toBeNull();
    expect(aItem?.content).toContain("Secret corporate roadmap");

    // User B cannot get it using the exact memoryId
    const bItem = await store.get("tenant_user_b", addResult.memoryId);
    expect(bItem).toBeNull();
  });

  test("TC-6.6.3: Cross-Tenant Deletion Isolation — User B cannot delete User A's memory", async () => {
    const addResult = await store.add("tenant_user_a", "Critical tenant A memory record");

    // User B attempts to delete User A's memory
    await store.delete("tenant_user_b", addResult.memoryId);

    // User A's memory must remain untouched
    const aItem = await store.get("tenant_user_a", addResult.memoryId);
    expect(aItem).not.toBeNull();
    expect(aItem?.id).toBe(addResult.memoryId);
  });

  test("TC-6.6.4: Independent Tenant Purge — Purging User A does not affect User B", async () => {
    await store.add("tenant_user_a", "User A unique note 1");
    await store.add("tenant_user_a", "User A unique note 2");
    await store.add("tenant_user_b", "User B unique note 1");

    // Purge User A
    const purgeResult = await store.deleteUserMemories("tenant_user_a");
    expect(purgeResult.deletedCount).toBe(2);

    // User A memories should be gone
    const aList = await store.list("tenant_user_a");
    expect(aList.length).toBe(0);

    // User B memories must be completely preserved
    const bList = await store.list("tenant_user_b");
    expect(bList.length).toBe(1);
    expect(bList[0]?.content).toContain("User B unique note 1");
  });
});
