import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
  createMemoryStore,
  getMemoryStoreMode,
  InProcessMem0Store,
  WorkerMemoryStore,
} from "../../packages/memory/src/index.js";

describe("Milestone M6: Story S6.2 — Memory Package Scaffolding & Factory Seam", () => {
  const originalEnv = process.env.MEMORY_STORE_MODE;

  afterEach(() => {
    process.env.MEMORY_STORE_MODE = originalEnv;
  });

  describe("Mode Resolution", () => {
    test("defaults to 'in-process' when no config or env var is present", () => {
      delete process.env.MEMORY_STORE_MODE;
      expect(getMemoryStoreMode()).toBe("in-process");
    });

    test("resolves mode from explicit config override", () => {
      expect(getMemoryStoreMode({ mode: "worker" })).toBe("worker");
      expect(getMemoryStoreMode({ mode: "in-process" })).toBe("in-process");
    });

    test("resolves mode from process.env.MEMORY_STORE_MODE", () => {
      process.env.MEMORY_STORE_MODE = "worker";
      expect(getMemoryStoreMode()).toBe("worker");
      process.env.MEMORY_STORE_MODE = "in-process";
      expect(getMemoryStoreMode()).toBe("in-process");
    });
  });

  describe("Factory Instantiation & Interface Compliance", () => {
    test("creates an in-process store by default", () => {
      delete process.env.MEMORY_STORE_MODE;
      const store = createMemoryStore();
      expect(store).toBeInstanceOf(InProcessMem0Store);
      expect((store as any).mode).toBe("in-process");
    });

    test("creates a worker seam store when configured", () => {
      const store = createMemoryStore({ mode: "worker", workerEndpoint: "https://worker.test" });
      expect(store).toBeInstanceOf(WorkerMemoryStore);
      expect((store as any).mode).toBe("worker");
      expect((store as WorkerMemoryStore).endpoint).toBe("https://worker.test");
    });

    test("both stores implement MemoryStore methods identically", async () => {
      const stores = [createMemoryStore({ mode: "in-process" }), createMemoryStore({ mode: "worker" })];

      for (const store of stores) {
        // Add memory
        const addRes = await store.add("user_test_123", "User prefers functional programming with immutability", { category: "preference" });
        expect(addRes.memoryId).toBeDefined();
        expect(addRes.status).toBe("created");

        // Get memory
        const item = await store.get("user_test_123", addRes.memoryId);
        expect(item).not.toBeNull();
        expect(item?.content).toContain("functional programming");

        // Search memory
        const hits = await store.search("user_test_123", "immutability");
        expect(hits.length).toBeGreaterThan(0);
        expect(hits[0].id).toBe(addRes.memoryId);

        // Delete memory
        const deleted = await store.delete("user_test_123", addRes.memoryId);
        expect(deleted).toBe(true);

        const checkAfter = await store.get("user_test_123", addRes.memoryId);
        expect(checkAfter).toBeNull();
      }
    });
  });
});
