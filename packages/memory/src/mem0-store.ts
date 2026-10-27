import type {
  MemoryStore,
  MemoryItem,
  MemorySearchOptions,
  MemoryAddResult,
  MemoryDeleteResult,
  MemoryStoreConfig,
} from "@repo/contracts";
import { UpstashRedisMemoryStore, type RedisLike } from "./redis-memory.js";
import { UpstashVectorMemoryStore, type VectorClientLike } from "./vector-memory.js";

export interface InProcessMem0StoreConfig extends Partial<MemoryStoreConfig> {
  redisClient?: RedisLike;
  vectorClient?: VectorClientLike;
  dedupThreshold?: number;
}

/**
 * In-Process Mem0 Engine Adapter (Milestone M6)
 *
 * Coordinates Redis entity KV storage and Vector semantic search with
 * cosine similarity deduplication (> 0.85).
 * Strictly preserves the $0.00/month infrastructure ceiling (ADR-0004, NFR-014, NFR-016).
 */
export class InProcessMem0Store implements MemoryStore {
  readonly mode = "in-process" as const;
  private redisStore: UpstashRedisMemoryStore;
  private vectorStore: UpstashVectorMemoryStore;
  private dedupThreshold: number;

  constructor(config?: InProcessMem0StoreConfig) {
    this.redisStore = new UpstashRedisMemoryStore({
      redisClient: config?.redisClient,
      url: config?.redisUrl,
      token: config?.redisToken,
    });
    this.vectorStore = new UpstashVectorMemoryStore({
      vectorClient: config?.vectorClient,
      url: config?.vectorUrl,
      token: config?.vectorToken,
    });
    this.dedupThreshold = config?.dedupThreshold ?? 0.85;
  }

  async add(userId: string, content: string, metadata?: Record<string, unknown>): Promise<MemoryAddResult> {
    if (!userId || typeof userId !== "string") {
      throw new Error("userId must be a non-empty string");
    }

    // Check for near-duplicate memories in vector store
    const existingHits = await this.vectorStore.search(userId, content, {
      limit: 1,
      threshold: this.dedupThreshold,
    });

    const firstHit = existingHits[0];
    if (firstHit && firstHit.score !== undefined && firstHit.score >= this.dedupThreshold) {
      // Deduplicate: update existing memory record with latest timestamp and merged metadata
      const existingId = firstHit.id;
      const now = new Date().toISOString();
      const updatedMetadata = {
        ...(firstHit.metadata || {}),
        ...(metadata || {}),
        deduplicated_from: content,
        updated_at: now,
      };

      // Re-add to Redis under existing ID (or update)
      await this.redisStore.add(userId, content, { ...updatedMetadata, memoryId: existingId });

      return {
        memoryId: existingId,
        status: "deduplicated",
        content,
      };
    }

    // New unique memory: persist to both Redis and Vector stores
    const redisResult = await this.redisStore.add(userId, content, metadata);
    await this.vectorStore.add(userId, content, {
      ...(metadata || {}),
      memory_id: redisResult.memoryId,
    });

    return {
      memoryId: redisResult.memoryId,
      status: "created",
      content,
    };
  }

  async search(userId: string, query: string, options?: MemorySearchOptions): Promise<MemoryItem[]> {
    if (!userId || !query) return [];

    // Semantic retrieval from vector store
    const vectorHits = await this.vectorStore.search(userId, query, options);
    if (vectorHits.length === 0) {
      // Fallback substring query on Redis working memory
      return this.redisStore.search(userId, query, options);
    }

    // Hydrate entities from Redis where available
    const hydrated: MemoryItem[] = [];
    for (const hit of vectorHits) {
      const redisItem = await this.redisStore.get(userId, hit.id);
      if (redisItem) {
        hydrated.push({
          ...redisItem,
          score: hit.score ?? 0.9,
        });
      } else {
        hydrated.push(hit);
      }
    }

    return hydrated.slice(0, options?.limit ?? 5);
  }

  async get(userId: string, memoryId: string): Promise<MemoryItem | null> {
    return this.redisStore.get(userId, memoryId);
  }

  async list(userId: string, limit?: number): Promise<MemoryItem[]> {
    return this.redisStore.list(userId, limit);
  }

  async delete(userId: string, memoryId: string): Promise<boolean> {
    const deletedRedis = await this.redisStore.delete(userId, memoryId);
    const deletedVector = await this.vectorStore.delete(userId, memoryId);
    return deletedRedis || deletedVector;
  }

  async deleteUserMemories(userId: string): Promise<MemoryDeleteResult> {
    const redisPurge = await this.redisStore.deleteUserMemories(userId);
    await this.vectorStore.deleteUserMemories(userId);
    return redisPurge;
  }
}
