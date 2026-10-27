/**
 * Memory Hook for @repo/reasoning (Milestone M6).
 *
 * Provides pre-synthesis memory recall and asynchronous post-response
 * fact extraction hooks conforming to AC-6.3, AC-6.4, BR-002, and NFR-008.
 */

import type {
  MemoryStore,
  MemoryItem,
  MemoryAddResult,
  MemoryCategory,
} from "@repo/contracts";

export interface MemoryRecallResult {
  readonly memoryContext: string;
  readonly memories: readonly MemoryItem[];
  readonly elapsedMs: number;
  readonly degraded: boolean;
}

export interface MemoryRecallOptions {
  readonly limit?: number;
  readonly threshold?: number;
  readonly category?: MemoryCategory;
  readonly timeoutMs?: number; // Default 150ms SLA (AC-6.3, NFR-008)
}

/**
 * Formats recalled long-term memories into an envelope section
 * suitable for grounded LLM prompt injection.
 */
export function formatMemoryContextBlock(memories: readonly MemoryItem[]): string {
  if (!memories || memories.length === 0) {
    return "";
  }
  const lines = memories.map((m) => `- [${m.category}] ${m.content.trim()}`);
  return `User Long-Term Memory Context (Preferences & Profile):\n${lines.join("\n")}`;
}

/**
 * Pre-synthesis memory recall hook.
 * Queries MemoryStore with user prompt and enforces 150ms SLA with
 * transparent degradation on timeout or error (architecture/05-m6 §6).
 */
export async function retrieveUserMemoryContext(
  userId: string,
  query: string,
  memoryStore?: MemoryStore,
  options?: MemoryRecallOptions,
): Promise<MemoryRecallResult> {
  const start = Date.now();
  if (!memoryStore || !userId || !query) {
    return {
      memoryContext: "",
      memories: [],
      elapsedMs: Date.now() - start,
      degraded: false,
    };
  }

  const timeoutMs = options?.timeoutMs ?? 150;

  try {
    const searchPromise = memoryStore.search(userId, query, {
      limit: options?.limit ?? 5,
      threshold: options?.threshold ?? 0.0,
      category: options?.category,
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`Memory recall timeout exceeded ${timeoutMs}ms SLA`));
      }, timeoutMs);
    });

    const memories = await Promise.race([
      searchPromise.finally(() => {
        if (timer) clearTimeout(timer);
      }),
      timeoutPromise,
    ]);
    const elapsedMs = Date.now() - start;

    return {
      memoryContext: formatMemoryContextBlock(memories),
      memories,
      elapsedMs,
      degraded: false,
    };
  } catch (err) {
    const elapsedMs = Date.now() - start;
    if (process.env.NODE_ENV !== "test") {
      const warnPayload = JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "WARN",
        service: "reasoning",
        event: "memory_recall_degraded",
        payload: {
          userId,
          elapsedMs,
          error: (err as Error).message,
        },
      });
      process.stdout.write(`${warnPayload}\n`);
    }

    return {
      memoryContext: "",
      memories: [],
      elapsedMs,
      degraded: true,
    };
  }
}

/**
 * Post-response asynchronous memory extraction hook.
 * Dispatches conversational facts or user preferences without blocking the token stream.
 */
export async function dispatchAsyncMemoryExtraction(
  userId: string,
  prompt: string,
  assistantAnswer: string,
  memoryStore?: MemoryStore,
  metadata?: Record<string, unknown>,
): Promise<MemoryAddResult | null> {
  if (!memoryStore || !userId) {
    return null;
  }

  try {
    const content = `User query: "${prompt.trim()}". Grounded synthesis recorded.`;
    const category: MemoryCategory = "context";

    return await memoryStore.add(userId, content, {
      category,
      prompt_summary: prompt.slice(0, 100),
      answer_summary: assistantAnswer.slice(0, 100),
      ...(metadata || {}),
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "test") {
      const warnPayload = JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "WARN",
        service: "reasoning",
        event: "async_memory_extraction_failed",
        payload: {
          userId,
          error: (err as Error).message,
        },
      });
      process.stdout.write(`${warnPayload}\n`);
    }
    return null;
  }
}

/**
 * Enhances prompt envelope to include recalled user memory context.
 */
export function buildGroundedPromptWithMemoryEnvelope(
  userPrompt: string,
  contextBlock: string,
  memoryBlock?: string,
): string {
  const memorySection = memoryBlock ? `\n\n${memoryBlock}\n` : "";
  return (
    `System: You are Contextual, a deeply grounded AI reasoning engine.\n` +
    `Answer the user prompt strictly and exclusively using the numbered context chunks below.\n` +
    `Every factual assertion MUST cite its source using the exact tag [1], [2], etc.\n` +
    `Respect user long-term preferences and constraints where they align with the retrieved context.\n` +
    `If the context is empty or does not contain enough information to answer, state:\n` +
    `"Insufficient context available in your notes to answer this question."\n` +
    `Never hallucinate or extrapolate beyond the provided text.${memorySection}\n\n` +
    `Context:\n${contextBlock}\n\n` +
    `User Prompt: ${userPrompt}`
  );
}
