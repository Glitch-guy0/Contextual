import type {
  MemoryStore,
  MemoryItem,
  MemorySearchOptions,
  MemoryAddResult,
  MemoryDeleteResult,
  MemoryStoreConfig,
  MemoryStoreMode,
} from "@repo/contracts";

/**
 * Ephemeral In-Memory Base Store used for fallback & local testing
 */
export class EphemeralMemoryStore implements MemoryStore {
  readonly mode: MemoryStoreMode = "in-process";
  protected items: Map<string, MemoryItem> = new Map();

  async add(userId: string, content: string, metadata?: Record<string, unknown>): Promise<MemoryAddResult> {
    const memoryId = `mem_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const item: MemoryItem = {
      id: memoryId,
      userId,
      content,
      category: (metadata?.category as any) || "preference",
      metadata,
      createdAt: now,
      updatedAt: now,
    };
    this.items.set(memoryId, item);
    return { memoryId, status: "created", content };
  }

  async search(userId: string, query: string, options?: MemorySearchOptions): Promise<MemoryItem[]> {
    const qLower = query.toLowerCase();
    const hits: MemoryItem[] = [];
    for (const item of this.items.values()) {
      if (item.userId !== userId) continue;
      if (options?.category && item.category !== options.category) continue;
      if (item.content.toLowerCase().includes(qLower)) {
        hits.push({ ...item, score: 0.9 });
      }
    }
    const limit = options?.limit ?? 5;
    return hits.slice(0, limit);
  }

  async get(userId: string, memoryId: string): Promise<MemoryItem | null> {
    const item = this.items.get(memoryId);
    if (!item || item.userId !== userId) return null;
    return item;
  }

  async delete(userId: string, memoryId: string): Promise<boolean> {
    const item = this.items.get(memoryId);
    if (!item || item.userId !== userId) return false;
    return this.items.delete(memoryId);
  }

  async deleteUserMemories(userId: string): Promise<MemoryDeleteResult> {
    let deletedCount = 0;
    for (const [id, item] of this.items.entries()) {
      if (item.userId === userId) {
        this.items.delete(id);
        deletedCount++;
      }
    }
    return { deletedCount };
  }

  async list(userId: string, limit?: number): Promise<MemoryItem[]> {
    const userItems: MemoryItem[] = [];
    for (const item of this.items.values()) {
      if (item.userId === userId) userItems.push(item);
    }
    return userItems.slice(0, limit ?? 20);
  }
}

/**
 * Worker Seam Store Adapter (simulates or executes remote worker seam)
 */
export class BaseWorkerMemoryStore extends EphemeralMemoryStore {
  override readonly mode: MemoryStoreMode = "worker";
  public endpoint: string;

  constructor(config?: Partial<MemoryStoreConfig>) {
    super();
    this.endpoint = config?.workerEndpoint || process.env.MEMORY_WORKER_ENDPOINT || "https://memory.contextual.internal/api/v1";
  }
}

import { InProcessMem0Store, type InProcessMem0StoreConfig } from "./mem0-store.js";
import { WorkerMemoryStore, type WorkerMemoryStoreConfig } from "./worker-store.js";

/**
 * Resolve memory store mode from configuration or environment
 */
export function getMemoryStoreMode(config?: Partial<MemoryStoreConfig>): MemoryStoreMode {
  if (config?.mode) return config.mode;
  const envMode = process.env.MEMORY_STORE_MODE;
  if (envMode === "worker" || envMode === "in-process") {
    return envMode;
  }
  return "in-process";
}

export type MemoryStoreOptions = (InProcessMem0StoreConfig | WorkerMemoryStoreConfig) & Partial<MemoryStoreConfig>;

/**
 * Polymorphic MemoryStore Factory (M6 Seam Architecture)
 *
 * Instantiates InProcessMem0Store or WorkerMemoryStore based on configuration.
 * Callers strictly consume the abstract MemoryStore port interface (FR-019, FR-020, BR-018).
 */
export function createMemoryStore(config?: MemoryStoreOptions): MemoryStore {
  const mode = getMemoryStoreMode(config);
  if (mode === "worker") {
    return new WorkerMemoryStore(config as WorkerMemoryStoreConfig);
  }
  return new InProcessMem0Store(config as InProcessMem0StoreConfig);
}

