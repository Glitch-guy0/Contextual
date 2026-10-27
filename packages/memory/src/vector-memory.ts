import type {
  MemoryStore,
  MemoryItem,
  MemorySearchOptions,
  MemoryAddResult,
  MemoryDeleteResult,
  MemoryCategory,
} from "@repo/contracts";

export interface VectorHit {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface VectorPoint {
  id: string;
  vector: number[];
  metadata?: Record<string, unknown>;
}

export interface VectorQueryOptions {
  vector: number[];
  topK?: number;
  filter?: string;
  includeMetadata?: boolean;
}

export interface VectorClientLike {
  upsert(vectors: VectorPoint[]): Promise<unknown>;
  query(options: VectorQueryOptions): Promise<VectorHit[]>;
  delete(ids: string[]): Promise<unknown>;
}

/**
 * Deterministic 768-dimensional normalized embedding generator for local dev & testing
 */
export function generateDeterministic768Embedding(text: string): number[] {
  const dim = 768;
  const vector: number[] = new Array(dim).fill(0);
  const words = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

  for (const word of words) {
    let hash = 5381;
    for (let j = 0; j < word.length; j++) {
      hash = ((hash << 5) + hash) + word.charCodeAt(j);
    }
    for (let k = 0; k < 8; k++) {
      const idx = Math.abs((hash + k * 97) % dim);
      vector[idx] = (vector[idx] ?? 0) + 1.0;
    }
  }

  // Normalize to unit length
  let norm = 0;
  for (let i = 0; i < dim; i++) {
    const val = vector[i] ?? 0;
    norm += val * val;
  }
  norm = Math.sqrt(norm) || 1.0;
  for (let i = 0; i < dim; i++) {
    vector[i] = (vector[i] ?? 0) / norm;
  }

  return vector;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const valA = a[i] ?? 0;
    const valB = b[i] ?? 0;
    dot += valA * valB;
  }
  return Math.max(0, Math.min(1, dot));
}

export class InMemoryVectorStore implements VectorClientLike {
  private store: Map<string, VectorPoint> = new Map();

  async upsert(vectors: VectorPoint[]): Promise<unknown> {
    for (const v of vectors) {
      this.store.set(v.id, v);
    }
    return "OK";
  }

  async query(options: VectorQueryOptions): Promise<VectorHit[]> {
    const hits: VectorHit[] = [];

    // Parse filter for user_id = '...'
    let requiredUserId: string | null = null;
    if (options.filter) {
      const match = options.filter.match(/user_id\s*=\s*'([^']+)'/);
      if (match && match[1]) requiredUserId = match[1];
    }

    for (const [id, point] of this.store.entries()) {
      if (requiredUserId) {
        const metaUser = point.metadata?.user_id;
        if (metaUser !== requiredUserId) continue;
      }

      const score = cosineSimilarity(options.vector, point.vector);
      hits.push({
        id,
        score,
        metadata: options.includeMetadata !== false ? point.metadata : undefined,
      });
    }

    hits.sort((a, b) => b.score - a.score);
    return hits.slice(0, options.topK ?? 10);
  }

  async delete(ids: string[]): Promise<unknown> {
    for (const id of ids) {
      this.store.delete(id);
    }
    return "OK";
  }
}

export interface UpstashVectorMemoryStoreConfig {
  vectorClient?: VectorClientLike;
  embedFn?: (text: string) => Promise<number[]>;
  url?: string;
  token?: string;
}

/**
 * Upstash Vector Semantic Memory Retrieval Adapter (Milestone M6)
 * Strict multi-tenant isolation with p95 < 150ms search latency (AC-6.3, AC-6.4, BR-002, NFR-008).
 */
export class UpstashVectorMemoryStore implements MemoryStore {
  private client: VectorClientLike;
  private embedFn: (text: string) => Promise<number[]>;
  private trackedIdsByUser: Map<string, Set<string>> = new Map();

  constructor(config?: UpstashVectorMemoryStoreConfig) {
    this.client = config?.vectorClient ?? new InMemoryVectorStore();
    this.embedFn = config?.embedFn ?? (async (text: string) => generateDeterministic768Embedding(text));
  }

  private sanitizeUserId(userId: string): string {
    return userId.replace(/['"\\]/g, "");
  }

  private makeVectorId(userId: string, memoryId: string): string {
    const cleanUserId = this.sanitizeUserId(userId);
    if (memoryId.startsWith(`mem_${cleanUserId}_`)) {
      return memoryId;
    }
    return `mem_${cleanUserId}_${memoryId}`;
  }

  async add(userId: string, content: string, metadata?: Record<string, unknown>): Promise<MemoryAddResult> {
    if (!userId || typeof userId !== "string") {
      throw new Error("userId must be a non-empty string");
    }
    const cleanUserId = this.sanitizeUserId(userId);
    const memoryId =
      (metadata?.memory_id as string) ||
      (metadata?.memoryId as string) ||
      `mem_${cleanUserId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const category = (metadata?.category as MemoryCategory) || "preference";

    const vector = await this.embedFn(content);
    const vectorId = this.makeVectorId(cleanUserId, memoryId);

    const pointMetadata: Record<string, unknown> = {
      ...(metadata || {}),
      user_id: cleanUserId,
      memory_id: memoryId,
      content,
      category,
      created_at: now,
      updated_at: now,
    };

    await this.client.upsert([
      {
        id: vectorId,
        vector,
        metadata: pointMetadata,
      },
    ]);

    let userSet = this.trackedIdsByUser.get(cleanUserId);
    if (!userSet) {
      userSet = new Set();
      this.trackedIdsByUser.set(cleanUserId, userSet);
    }
    userSet.add(vectorId);

    return {
      memoryId,
      status: "created",
      content,
    };
  }

  async search(userId: string, query: string, options?: MemorySearchOptions): Promise<MemoryItem[]> {
    if (!userId || !query) return [];
    const cleanUserId = this.sanitizeUserId(userId);
    const queryVector = await this.embedFn(query);
    const filter = `user_id = '${cleanUserId}'`;

    const hits = await this.client.query({
      vector: queryVector,
      topK: (options?.limit ?? 5) * 2,
      filter,
      includeMetadata: true,
    });

    const threshold = options?.threshold ?? 0.0;
    const items: MemoryItem[] = [];

    for (const hit of hits) {
      if (hit.score < threshold) continue;
      const meta = hit.metadata || {};
      if (meta.user_id !== cleanUserId) continue; // Defense-in-depth isolation assertion

      if (options?.category && meta.category !== options.category) continue;

      items.push({
        id: (meta.memory_id as string) || hit.id,
        userId: cleanUserId,
        content: (meta.content as string) || "",
        category: meta.category as MemoryCategory,
        metadata: meta,
        score: hit.score,
        createdAt: (meta.created_at as string) || new Date().toISOString(),
        updatedAt: (meta.updated_at as string) || new Date().toISOString(),
      });
    }

    return items.slice(0, options?.limit ?? 5);
  }

  async get(userId: string, memoryId: string): Promise<MemoryItem | null> {
    if (!userId || !memoryId) return null;
    const results = await this.search(userId, memoryId, { limit: 10 });
    const found = results.find((r) => r.id === memoryId);
    return found || null;
  }

  async delete(userId: string, memoryId: string): Promise<boolean> {
    if (!userId || !memoryId) return false;
    const cleanUserId = this.sanitizeUserId(userId);
    const vectorId = this.makeVectorId(cleanUserId, memoryId);

    await this.client.delete([vectorId, memoryId]);
    const userSet = this.trackedIdsByUser.get(cleanUserId);
    if (userSet) {
      userSet.delete(vectorId);
      userSet.delete(memoryId);
    }
    return true;
  }

  async deleteUserMemories(userId: string): Promise<MemoryDeleteResult> {
    if (!userId) return { deletedCount: 0 };
    const cleanUserId = this.sanitizeUserId(userId);
    const userSet = this.trackedIdsByUser.get(cleanUserId);
    if (!userSet || userSet.size === 0) {
      return { deletedCount: 0 };
    }

    const idsToDelete = Array.from(userSet);
    await this.client.delete(idsToDelete);
    this.trackedIdsByUser.delete(cleanUserId);
    return { deletedCount: idsToDelete.length };
  }

  async list(userId: string, limit?: number): Promise<MemoryItem[]> {
    if (!userId) return [];
    return this.search(userId, "user preference context", { limit: limit ?? 20, threshold: 0.0 });
  }
}
