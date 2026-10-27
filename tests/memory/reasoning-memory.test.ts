import { describe, expect, test } from "bun:test";
import {
  InProcessMem0Store,
  InMemoryRedis,
  InMemoryVectorStore,
} from "../../packages/memory/src/index.js";
import {
  retrieveUserMemoryContext,
  dispatchAsyncMemoryExtraction,
  formatMemoryContextBlock,
  buildGroundedPromptWithMemoryEnvelope,
} from "../../packages/reasoning/src/index.js";
import type { MemoryStore } from "@repo/contracts";

describe("Milestone M6: Story S6.6 — Reasoning Engine Memory Integration Hooks", () => {
  test("TC-6.6.6: Pre-synthesis recall retrieves and formats user memory into prompt context", async () => {
    const redis = new InMemoryRedis();
    const vector = new InMemoryVectorStore();
    const store = new InProcessMem0Store({
      redisClient: redis,
      vectorClient: vector,
    });

    const userId = "user_reasoning_test";
    await store.add(userId, "Prefers responses formatted in markdown with concise bullet lists", {
      category: "preference",
    });
    await store.add(userId, "Primary architecture uses TypeScript, Next.js, and Upstash", {
      category: "fact",
    });

    const result = await retrieveUserMemoryContext(userId, "architecture and formatting preferences", store);

    expect(result.degraded).toBe(false);
    expect(result.memories.length).toBeGreaterThan(0);
    expect(result.memoryContext).toContain("User Long-Term Memory Context");
    expect(result.memoryContext).toContain("concise bullet lists");
    expect(result.memoryContext).toContain("TypeScript, Next.js");
  });

  test("TC-6.6.7: Transparent degradation on MemoryStore timeout (> 150ms) preserves pipeline continuity", async () => {
    // Create a slow memory store mock that hangs for 300ms
    const slowStore: MemoryStore = {
      mode: "in-process",
      add: async () => ({ memoryId: "mock", status: "created", content: "" }),
      get: async () => null,
      list: async () => [],
      delete: async () => true,
      deleteUserMemories: async () => ({ deletedCount: 0 }),
      search: async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return [];
      },
    };

    const start = Date.now();
    const result = await retrieveUserMemoryContext("user_timeout", "query", slowStore, { timeoutMs: 50 });
    const elapsed = Date.now() - start;

    expect(result.degraded).toBe(true);
    expect(result.memoryContext).toBe("");
    expect(result.memories.length).toBe(0);
    // Timeout should have fired well before the 300ms slow response
    expect(elapsed).toBeLessThan(200);
  });

  test("TC-6.6.8: Post-response async memory extraction records turn without throwing", async () => {
    const redis = new InMemoryRedis();
    const vector = new InMemoryVectorStore();
    const store = new InProcessMem0Store({
      redisClient: redis,
      vectorClient: vector,
    });

    const userId = "user_async_extract";
    const addResult = await dispatchAsyncMemoryExtraction(
      userId,
      "What is the recommended caching pattern?",
      "We recommend Upstash Redis with a TTL of 3600 seconds.",
      store,
    );

    expect(addResult).not.toBeNull();
    expect(addResult?.memoryId).toBeDefined();

    // Verify memory was persisted
    const list = await store.list(userId);
    expect(list.length).toBe(1);
    expect(list[0]?.content).toContain("What is the recommended caching pattern?");
  });

  test("TC-6.6.9: buildGroundedPromptWithMemoryEnvelope injects memory block while preserving citation instructions", () => {
    const userPrompt = "How do we scale our database?";
    const contextBlock = '[1] (Doc: "DB Guide")\n"Use read replicas for horizontal scale."';
    const memoryBlock = "- [preference] User prefers managed serverless components";

    const prompt = buildGroundedPromptWithMemoryEnvelope(userPrompt, contextBlock, memoryBlock);

    expect(prompt).toContain("You are Contextual, a deeply grounded AI reasoning engine.");
    expect(prompt).toContain("Every factual assertion MUST cite its source using the exact tag [1], [2]");
    expect(prompt).toContain("Respect user long-term preferences and constraints");
    expect(prompt).toContain(memoryBlock);
    expect(prompt).toContain(contextBlock);
    expect(prompt).toContain(`User Prompt: ${userPrompt}`);
  });
});
