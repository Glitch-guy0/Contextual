/**
 * Memory Contract & Canonical MemoryStore Port Interface (Milestone M6)
 *
 * Implements hexagonal port isolating domain logic from vendor memory SDKs (BR-018, FR-019).
 */

export const MEMORY_CATEGORIES = ["preference", "fact", "directive", "context"] as const;
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export const MEMORY_STORE_MODES = ["in-process", "worker"] as const;
export type MemoryStoreMode = (typeof MEMORY_STORE_MODES)[number];

export interface MemoryItem {
  id: string;
  userId: string;
  content: string;
  category?: MemoryCategory;
  metadata?: Record<string, unknown>;
  score?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MemorySearchOptions {
  limit?: number;
  threshold?: number;
  category?: MemoryCategory;
}

export interface MemoryAddResult {
  memoryId: string;
  status: "created" | "updated" | "deduplicated";
  content: string;
}

export interface MemoryDeleteResult {
  deletedCount: number;
}

export interface CreateMemoryRequest {
  content: string;
  category?: MemoryCategory;
  metadata?: Record<string, unknown>;
}

export interface MemoryStoreConfig {
  mode: MemoryStoreMode;
  redisUrl?: string;
  redisToken?: string;
  vectorUrl?: string;
  vectorToken?: string;
  workerEndpoint?: string;
  workerApiKey?: string;
}

export interface MemoryStore {
  add(userId: string, content: string, metadata?: Record<string, unknown>): Promise<MemoryAddResult>;
  search(userId: string, query: string, options?: MemorySearchOptions): Promise<MemoryItem[]>;
  get(userId: string, memoryId: string): Promise<MemoryItem | null>;
  delete(userId: string, memoryId: string): Promise<boolean>;
  deleteUserMemories(userId: string): Promise<MemoryDeleteResult>;
  list(userId: string, limit?: number): Promise<MemoryItem[]>;
}

export function isValidMemoryCategory(val: unknown): val is MemoryCategory {
  return typeof val === "string" && (MEMORY_CATEGORIES as readonly string[]).includes(val);
}

export function isValidMemoryStoreMode(val: unknown): val is MemoryStoreMode {
  return typeof val === "string" && (MEMORY_STORE_MODES as readonly string[]).includes(val);
}

export function assertCreateMemoryRequest(input: unknown): asserts input is CreateMemoryRequest {
  if (!input || typeof input !== "object") {
    throw new Error("CreateMemoryRequest must be a non-null object");
  }
  const req = input as Record<string, unknown>;
  if (typeof req.content !== "string") {
    throw new Error("CreateMemoryRequest.content must be a string");
  }
  const trimmed = req.content.trim();
  if (trimmed.length < 3 || trimmed.length > 5000) {
    throw new Error("CreateMemoryRequest.content must be between 3 and 5000 characters");
  }
  if (req.category !== undefined && !isValidMemoryCategory(req.category)) {
    throw new Error(`CreateMemoryRequest.category must be one of: ${MEMORY_CATEGORIES.join(", ")}`);
  }
  if (req.metadata !== undefined && (typeof req.metadata !== "object" || req.metadata === null || Array.isArray(req.metadata))) {
    throw new Error("CreateMemoryRequest.metadata must be a key-value object");
  }
}

export function assertMemorySearchOptions(input: unknown): asserts input is MemorySearchOptions {
  if (input === undefined || input === null) return;
  if (typeof input !== "object" || Array.isArray(input)) {
    throw new Error("MemorySearchOptions must be an object");
  }
  const opts = input as Record<string, unknown>;
  if (opts.limit !== undefined && (typeof opts.limit !== "number" || opts.limit < 1 || opts.limit > 100)) {
    throw new Error("MemorySearchOptions.limit must be an integer between 1 and 100");
  }
  if (opts.threshold !== undefined && (typeof opts.threshold !== "number" || opts.threshold < 0 || opts.threshold > 1)) {
    throw new Error("MemorySearchOptions.threshold must be a float between 0.0 and 1.0");
  }
  if (opts.category !== undefined && !isValidMemoryCategory(opts.category)) {
    throw new Error(`MemorySearchOptions.category must be one of: ${MEMORY_CATEGORIES.join(", ")}`);
  }
}
