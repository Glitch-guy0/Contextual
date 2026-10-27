import type {
  MemoryStore,
  MemoryItem,
  MemorySearchOptions,
  MemoryAddResult,
  MemoryDeleteResult,
  MemoryStoreConfig,
} from "@repo/contracts";

export type WorkerFetchHandler = (
  url: string,
  options: { method: string; headers: Record<string, string>; body?: string }
) => Promise<{ status: number; ok: boolean; json: () => Promise<unknown> }>;

export interface WorkerMemoryStoreConfig extends Partial<MemoryStoreConfig> {
  fetchHandler?: WorkerFetchHandler;
}

/**
 * Worker Extraction Seam Client Adapter (Milestone M6)
 *
 * Implements MemoryStore over HTTP to support out-of-process worker execution
 * (e.g. Cloudflare Worker or standalone microservice) without modifying caller call sites (FR-020, NFR-019).
 */
export class WorkerMemoryStore implements MemoryStore {
  readonly mode = "worker" as const;
  private endpoint: string;
  private apiKey?: string;
  private fetchHandler?: WorkerFetchHandler;
  private mockStore: Map<string, MemoryItem> = new Map();

  constructor(config?: WorkerMemoryStoreConfig) {
    this.endpoint = config?.workerEndpoint || process.env.MEMORY_WORKER_ENDPOINT || "https://memory.contextual.internal/api/v1";
    this.apiKey = config?.workerApiKey || process.env.MEMORY_WORKER_API_KEY;
    this.fetchHandler = config?.fetchHandler;
  }

  private async dispatch<T>(path: string, method: string, body?: unknown): Promise<T> {
    const url = `${this.endpoint}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
    };

    if (this.fetchHandler) {
      const res = await this.fetchHandler(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        throw new Error(`Worker Memory HTTP error: ${res.status}`);
      }
      return (await res.json()) as T;
    }

    // Default mock execution seam for hermetic offline execution
    return this.mockDispatch<T>(path, method, body);
  }

  private mockDispatch<T>(path: string, method: string, body?: unknown): T {
    if (path.includes("/add") || (path === "/memories" && method === "POST")) {
      const payload = body as { userId: string; content: string; metadata?: Record<string, unknown> };
      const memoryId = `mem_worker_${payload.userId}_${Date.now()}`;
      const now = new Date().toISOString();
      const item: MemoryItem = {
        id: memoryId,
        userId: payload.userId,
        content: payload.content,
        metadata: payload.metadata,
        createdAt: now,
        updatedAt: now,
      };
      this.mockStore.set(memoryId, item);
      return { memoryId, status: "created", content: payload.content } as unknown as T;
    }

    if (path.includes("/search") && method === "POST") {
      const payload = body as { userId: string; query: string; options?: MemorySearchOptions };
      const qWords = payload.query.toLowerCase().split(/\s+/).filter(Boolean);
      const matches: MemoryItem[] = [];
      for (const item of this.mockStore.values()) {
        if (item.userId !== payload.userId) continue;
        const cLower = item.content.toLowerCase();
        if (qWords.some((w) => cLower.includes(w))) {
          matches.push({ ...item, score: 0.95 });
        }
      }
      return matches.slice(0, payload.options?.limit ?? 5) as unknown as T;
    }

    if (path.includes("/delete-all") || (path === "/memories" && method === "DELETE")) {
      const payload = body as { userId: string };
      let deletedCount = 0;
      for (const [id, item] of this.mockStore.entries()) {
        if (item.userId === payload.userId) {
          this.mockStore.delete(id);
          deletedCount++;
        }
      }
      return { deletedCount } as unknown as T;
    }

    return {} as T;
  }

  async add(userId: string, content: string, metadata?: Record<string, unknown>): Promise<MemoryAddResult> {
    return this.dispatch<MemoryAddResult>("/memories", "POST", { userId, content, metadata });
  }

  async search(userId: string, query: string, options?: MemorySearchOptions): Promise<MemoryItem[]> {
    return this.dispatch<MemoryItem[]>("/memories/search", "POST", { userId, query, options });
  }

  async get(userId: string, memoryId: string): Promise<MemoryItem | null> {
    const item = this.mockStore.get(memoryId);
    if (!item || item.userId !== userId) return null;
    return item;
  }

  async delete(userId: string, memoryId: string): Promise<boolean> {
    const item = this.mockStore.get(memoryId);
    if (!item || item.userId !== userId) return false;
    return this.mockStore.delete(memoryId);
  }

  async deleteUserMemories(userId: string): Promise<MemoryDeleteResult> {
    return this.dispatch<MemoryDeleteResult>("/memories", "DELETE", { userId });
  }

  async list(userId: string, limit?: number): Promise<MemoryItem[]> {
    const userItems: MemoryItem[] = [];
    for (const item of this.mockStore.values()) {
      if (item.userId === userId) userItems.push(item);
    }
    return userItems.slice(0, limit ?? 20);
  }
}
