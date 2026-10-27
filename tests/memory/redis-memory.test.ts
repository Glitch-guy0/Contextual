import { describe, expect, test, beforeEach } from "bun:test";
import { UpstashRedisMemoryStore, InMemoryRedis } from "../../packages/memory/src/index.js";

describe("Milestone M6: Story S6.3 — Upstash Redis Entity & Working Memory Store", () => {
  let redis: InMemoryRedis;
  let store: UpstashRedisMemoryStore;

  beforeEach(() => {
    redis = new InMemoryRedis();
    store = new UpstashRedisMemoryStore({ redisClient: redis });
  });

  describe("CRUD Operations & Key Namespacing", () => {
    test("TC-6.3.1: Add memory stores under mem:entity and mem:user sets", async () => {
      const result = await store.add("user_alice", "Prefers TypeScript strict mode with zero any types", {
        category: "preference",
        tool: "eslint",
      });

      expect(result.memoryId).toBeDefined();
      expect(result.memoryId).toContain("mem_user_alice_");
      expect(result.status).toBe("created");

      // Verify Redis internal keys
      const members = await redis.smembers("mem:user:user_alice:ids");
      expect(members).toContain(result.memoryId);

      const entity = await redis.get(`mem:entity:user_alice:${result.memoryId}`);
      expect(entity).not.toBeNull();
      expect((entity as any).content).toContain("TypeScript strict mode");
      expect((entity as any).category).toBe("preference");
    });

    test("TC-6.3.2: Get memory returns null for nonexistent or wrong user", async () => {
      const added = await store.add("user_alice", "User prefers Bun test runner", { category: "tooling" });

      const retrieved = await store.get("user_alice", added.memoryId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(added.memoryId);

      const wrongUser = await store.get("user_bob", added.memoryId);
      expect(wrongUser).toBeNull();

      const notFound = await store.get("user_alice", "mem_nonexistent_123");
      expect(notFound).toBeNull();
    });

    test("TC-6.3.3: List memories retrieves all user memories in chronological order", async () => {
      await store.add("user_alice", "First preference: Vitest or Bun");
      await store.add("user_alice", "Second preference: Tailwind or Vanilla CSS");
      await store.add("user_alice", "Third preference: Turborepo");

      const list = await store.list("user_alice");
      expect(list.length).toBe(3);

      const limited = await store.list("user_alice", 2);
      expect(limited.length).toBe(2);
    });

    test("TC-6.3.4: Delete memory removes entity key and membership", async () => {
      const added = await store.add("user_alice", "Temporary preference to delete");

      const deleted = await store.delete("user_alice", added.memoryId);
      expect(deleted).toBe(true);

      const afterDelete = await store.get("user_alice", added.memoryId);
      expect(afterDelete).toBeNull();

      const members = await redis.smembers("mem:user:user_alice:ids");
      expect(members.includes(added.memoryId)).toBe(false);
    });

    test("TC-6.3.5: deleteUserMemories cascade purges all user memories completely", async () => {
      const m1 = await store.add("user_alice", "Memory 1");
      const m2 = await store.add("user_alice", "Memory 2");

      const purgeResult = await store.deleteUserMemories("user_alice");
      expect(purgeResult.deletedCount).toBe(2);

      expect(await store.get("user_alice", m1.memoryId)).toBeNull();
      expect(await store.get("user_alice", m2.memoryId)).toBeNull();

      const list = await store.list("user_alice");
      expect(list.length).toBe(0);
    });
  });

  describe("Multi-Tenant Key Isolation (BR-002, BR-018)", () => {
    test("TC-6.3.6: User B cannot access, list, or delete User A memories", async () => {
      const aliceMemory = await store.add("user_alice", "Alice confidential architectural notes", { category: "fact" });
      const bobMemory = await store.add("user_bob", "Bob public preferences", { category: "preference" });

      // Alice list contains only Alice
      const aliceList = await store.list("user_alice");
      expect(aliceList.length).toBe(1);
      expect(aliceList[0].id).toBe(aliceMemory.memoryId);

      // Bob list contains only Bob
      const bobList = await store.list("user_bob");
      expect(bobList.length).toBe(1);
      expect(bobList[0].id).toBe(bobMemory.memoryId);

      // Bob tries to get Alice memory
      const stolen = await store.get("user_bob", aliceMemory.memoryId);
      expect(stolen).toBeNull();

      // Bob tries to delete Alice memory
      const deleteAttempt = await store.delete("user_bob", aliceMemory.memoryId);
      expect(deleteAttempt).toBe(false);

      // Alice memory is still intact
      const aliceCheck = await store.get("user_alice", aliceMemory.memoryId);
      expect(aliceCheck).not.toBeNull();
    });

    test("TC-6.3.7: Search filters by query string and respects user boundary", async () => {
      await store.add("user_alice", "Enjoys microservices with gRPC");
      await store.add("user_alice", "Monolith first with modular seams");
      await store.add("user_bob", "Enjoys microservices with Kafka");

      const aliceHits = await store.search("user_alice", "microservices");
      expect(aliceHits.length).toBe(1);
      expect(aliceHits[0].content).toContain("gRPC");

      const bobHits = await store.search("user_bob", "microservices");
      expect(bobHits.length).toBe(1);
      expect(bobHits[0].content).toContain("Kafka");
    });
  });
});
