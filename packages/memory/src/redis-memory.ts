import type {
  MemoryStore,
  MemoryItem,
  MemorySearchOptions,
  MemoryAddResult,
  MemoryDeleteResult,
  MemoryCategory,
} from "@repo/contracts";

export interface RedisLike {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
  sadd(key: string, ...members: string[]): Promise<number>;
  srem(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
}

export class InMemoryRedis implements RedisLike {
  private kv: Map<string, unknown> = new Map();
  private sets: Map<string, Set<string>> = new Map();

  async get<T = unknown>(key: string): Promise<T | null> {
    const val = this.kv.get(key);
    if (val === undefined) return null;
    return val as T;
  }

  async set(key: string, value: unknown): Promise<unknown> {
    this.kv.set(key, value);
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const k of keys) {
      if (this.kv.delete(k)) count++;
      if (this.sets.delete(k)) count++;
    }
    return count;
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    let set = this.sets.get(key);
    if (!set) {
      set = new Set();
      this.sets.set(key, set);
    }
    let added = 0;
    for (const m of members) {
      if (!set.has(m)) {
        set.add(m);
        added++;
      }
    }
    return added;
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const set = this.sets.get(key);
    if (!set) return 0;
    let removed = 0;
    for (const m of members) {
      if (set.delete(m)) removed++;
    }
    return removed;
  }

  async smembers(key: string): Promise<string[]> {
    const set = this.sets.get(key);
    if (!set) return [];
    return Array.from(set);
  }
}

export interface UpstashRedisMemoryStoreConfig {
  redisClient?: RedisLike;
  url?: string;
  token?: string;
}

/**
 * Upstash Redis User Entity & Working Memory Store
 * Enforces strict multi-tenant key namespacing (BR-002, BR-018).
 */
export class UpstashRedisMemoryStore implements MemoryStore {
  private redis: RedisLike;

  constructor(config?: UpstashRedisMemoryStoreConfig) {
    if (config?.redisClient) {
      this.redis = config.redisClient;
    } else {
      this.redis = new InMemoryRedis();
    }
  }

  private userKey(userId: string): string {
    return `mem:user:${userId}:ids`;
  }

  private entityKey(userId: string, memoryId: string): string {
    return `mem:entity:${userId}:${memoryId}`;
  }

  async add(userId: string, content: string, metadata?: Record<string, unknown>): Promise<MemoryAddResult> {
    if (!userId || typeof userId !== "string") {
      throw new Error("userId must be a non-empty string");
    }
    const memoryId =
      (metadata?.memoryId as string) ||
      (metadata?.memory_id as string) ||
      `mem_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const category = (metadata?.category as MemoryCategory) || "preference";

    const item: MemoryItem = {
      id: memoryId,
      userId,
      content,
      category,
      metadata: metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    await this.redis.set(this.entityKey(userId, memoryId), item);
    await this.redis.sadd(this.userKey(userId), memoryId);

    return {
      memoryId,
      status: "created",
      content,
    };
  }

  async get(userId: string, memoryId: string): Promise<MemoryItem | null> {
    if (!userId || !memoryId) return null;
    const raw = await this.redis.get<MemoryItem | string>(this.entityKey(userId, memoryId));
    if (!raw) return null;
    const item = typeof raw === "string" ? (JSON.parse(raw) as MemoryItem) : raw;
    if (item.userId !== userId) return null;
    return item;
  }

  async list(userId: string, limit?: number): Promise<MemoryItem[]> {
    if (!userId) return [];
    const memoryIds = await this.redis.smembers(this.userKey(userId));
    const items: MemoryItem[] = [];

    for (const mid of memoryIds) {
      const item = await this.get(userId, mid);
      if (item) items.push(item);
    }

    // Sort newest first
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items.slice(0, limit ?? 20);
  }

  async delete(userId: string, memoryId: string): Promise<boolean> {
    if (!userId || !memoryId) return false;
    const existing = await this.get(userId, memoryId);
    if (!existing) return false;

    await this.redis.del(this.entityKey(userId, memoryId));
    await this.redis.srem(this.userKey(userId), memoryId);
    return true;
  }

  async deleteUserMemories(userId: string): Promise<MemoryDeleteResult> {
    if (!userId) return { deletedCount: 0 };
    const memoryIds = await this.redis.smembers(this.userKey(userId));
    if (memoryIds.length === 0) return { deletedCount: 0 };

    const keysToDelete = memoryIds.map((id) => this.entityKey(userId, id));
    keysToDelete.push(this.userKey(userId));

    await this.redis.del(...keysToDelete);
    return { deletedCount: memoryIds.length };
  }

  async search(userId: string, query: string, options?: MemorySearchOptions): Promise<MemoryItem[]> {
    if (!userId || !query) return [];
    const all = await this.list(userId, 100);
    const qWords = query.toLowerCase().split(/\s+/).filter(Boolean);

    const matches: MemoryItem[] = [];
    for (const item of all) {
      if (options?.category && item.category !== options.category) continue;
      const cLower = item.content.toLowerCase();
      if (qWords.some((w) => cLower.includes(w))) {
        matches.push({ ...item, score: 0.9 });
      }
    }

    return matches.slice(0, options?.limit ?? 5);
  }
}
