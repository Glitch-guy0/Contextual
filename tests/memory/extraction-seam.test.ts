import { describe, expect, test, afterEach } from "bun:test";
import {
  createMemoryStore,
  type MemoryStore,
  WorkerMemoryStore,
  InProcessMem0Store,
} from "../../packages/memory/src/index.js";

describe("Milestone M6: Story S6.5 — Extraction Seam & Mode Toggle (FR-020, NFR-019)", () => {
  const originalEnv = process.env.MEMORY_STORE_MODE;

  afterEach(() => {
    process.env.MEMORY_STORE_MODE = originalEnv;
  });

  test("TC-6.5.6: createMemoryStore instantiates InProcessMem0Store by default", () => {
    delete process.env.MEMORY_STORE_MODE;
    const store = createMemoryStore();
    expect(store).toBeInstanceOf(InProcessMem0Store);
    expect((store as any).mode).toBe("in-process");
  });

  test("TC-6.5.7: createMemoryStore instantiates WorkerMemoryStore in worker mode", () => {
    process.env.MEMORY_STORE_MODE = "worker";
    const store = createMemoryStore({ workerEndpoint: "https://worker.contextual.test" });
    expect(store).toBeInstanceOf(WorkerMemoryStore);
    expect((store as any).mode).toBe("worker");
  });

  test("TC-6.5.8: Polymorphic contract parity across in-process and worker modes", async () => {
    // Both stores must fulfill the exact same caller interaction without divergence
    const inProcessStore = createMemoryStore({ mode: "in-process" });
    const workerStore = createMemoryStore({ mode: "worker" });

    const callers: MemoryStore[] = [inProcessStore, workerStore];

    for (const caller of callers) {
      // 1. Add
      const addRes = await caller.add("usr_seam_test", "Client prefers OpenAPI 3.1 contracts with strictly closed schemas", {
        category: "directive",
      });
      expect(addRes.memoryId).toBeDefined();

      // 2. Search
      const hits = await caller.search("usr_seam_test", "OpenAPI schemas");
      expect(hits.length).toBeGreaterThan(0);
      expect(hits[0].content).toContain("OpenAPI 3.1");

      // 3. Purge
      const purge = await caller.deleteUserMemories("usr_seam_test");
      expect(purge.deletedCount).toBeGreaterThan(0);

      const after = await caller.search("usr_seam_test", "OpenAPI schemas");
      expect(after.length).toBe(0);
    }
  });

  test("TC-6.5.9: Worker store delegates over custom fetch handler with Authorization header", async () => {
    const dispatchedCalls: { url: string; method: string; headers: Record<string, string>; body?: string }[] = [];

    const customFetch = async (url: string, opts: any) => {
      dispatchedCalls.push({ url, method: opts.method, headers: opts.headers, body: opts.body });
      if (url.includes("/memories") && opts.method === "POST") {
        return {
          status: 201,
          ok: true,
          json: async () => ({ memoryId: "mem_remote_123", status: "created", content: "Dispatched content" }),
        };
      }
      return { status: 200, ok: true, json: async () => ({}) };
    };

    const worker = new WorkerMemoryStore({
      workerEndpoint: "https://api.worker.test",
      workerApiKey: "sec_token_xyz999",
      fetchHandler: customFetch,
    });

    const res = await worker.add("usr_remote_1", "Dispatched content");
    expect(res.memoryId).toBe("mem_remote_123");
    expect(dispatchedCalls.length).toBe(1);
    expect(dispatchedCalls[0].url).toBe("https://api.worker.test/memories");
    expect(dispatchedCalls[0].headers["Authorization"]).toBe("Bearer sec_token_xyz999");
    expect(dispatchedCalls[0].headers["Content-Type"]).toBe("application/json");
  });
});
