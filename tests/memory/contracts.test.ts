import { describe, expect, test } from "bun:test";
import {
  MEMORY_CATEGORIES,
  MEMORY_STORE_MODES,
  isValidMemoryCategory,
  isValidMemoryStoreMode,
  assertCreateMemoryRequest,
  assertMemorySearchOptions,
  ERROR_CATALOGUE,
} from "../../packages/contracts/src/index.js";

describe("Milestone M6: Story S6.1 — Shared Memory Contracts & Validation", () => {
  describe("Type Constants and Type Guards", () => {
    test("exports valid closed memory categories", () => {
      expect(MEMORY_CATEGORIES).toEqual(["preference", "fact", "directive", "context"]);
      expect(isValidMemoryCategory("preference")).toBe(true);
      expect(isValidMemoryCategory("fact")).toBe(true);
      expect(isValidMemoryCategory("directive")).toBe(true);
      expect(isValidMemoryCategory("context")).toBe(true);
      expect(isValidMemoryCategory("invalid_cat")).toBe(false);
      expect(isValidMemoryCategory(null)).toBe(false);
    });

    test("exports valid memory store modes", () => {
      expect(MEMORY_STORE_MODES).toEqual(["in-process", "worker"]);
      expect(isValidMemoryStoreMode("in-process")).toBe(true);
      expect(isValidMemoryStoreMode("worker")).toBe(true);
      expect(isValidMemoryStoreMode("remote_saas")).toBe(false);
    });
  });

  describe("CreateMemoryRequest Validation", () => {
    test("validates a compliant memory creation request", () => {
      const valid = {
        content: "Prefers concise, bullet-pointed summaries with code snippets",
        category: "preference",
        metadata: { source: "session_1" },
      };
      expect(() => assertCreateMemoryRequest(valid)).not.toThrow();
    });

    test("validates request without optional category and metadata", () => {
      const valid = {
        content: "Specialized in distributed systems and consensus protocols",
      };
      expect(() => assertCreateMemoryRequest(valid)).not.toThrow();
    });

    test("rejects non-object or null input", () => {
      expect(() => assertCreateMemoryRequest(null)).toThrow("CreateMemoryRequest must be a non-null object");
      expect(() => assertCreateMemoryRequest("string")).toThrow("CreateMemoryRequest must be a non-null object");
    });

    test("rejects memory content shorter than 3 characters", () => {
      expect(() => assertCreateMemoryRequest({ content: "ab" })).toThrow("between 3 and 5000 characters");
      expect(() => assertCreateMemoryRequest({ content: "   " })).toThrow("between 3 and 5000 characters");
    });

    test("rejects memory content exceeding 5000 characters", () => {
      const huge = "x".repeat(5001);
      expect(() => assertCreateMemoryRequest({ content: huge })).toThrow("between 3 and 5000 characters");
    });

    test("rejects invalid memory category", () => {
      expect(() => assertCreateMemoryRequest({ content: "Valid content", category: "bad_cat" })).toThrow("CreateMemoryRequest.category must be one of");
    });

    test("rejects non-object metadata", () => {
      expect(() => assertCreateMemoryRequest({ content: "Valid content", metadata: "not-an-obj" })).toThrow("CreateMemoryRequest.metadata must be a key-value object");
      expect(() => assertCreateMemoryRequest({ content: "Valid content", metadata: [1, 2] })).toThrow("CreateMemoryRequest.metadata must be a key-value object");
    });
  });

  describe("MemorySearchOptions Validation", () => {
    test("allows undefined or empty options", () => {
      expect(() => assertMemorySearchOptions(undefined)).not.toThrow();
      expect(() => assertMemorySearchOptions({})).not.toThrow();
    });

    test("validates limit between 1 and 100", () => {
      expect(() => assertMemorySearchOptions({ limit: 5 })).not.toThrow();
      expect(() => assertMemorySearchOptions({ limit: 0 })).toThrow("limit must be an integer between 1 and 100");
      expect(() => assertMemorySearchOptions({ limit: 101 })).toThrow("limit must be an integer between 1 and 100");
    });

    test("validates threshold between 0.0 and 1.0", () => {
      expect(() => assertMemorySearchOptions({ threshold: 0.75 })).not.toThrow();
      expect(() => assertMemorySearchOptions({ threshold: -0.1 })).toThrow("threshold must be a float between 0.0 and 1.0");
      expect(() => assertMemorySearchOptions({ threshold: 1.2 })).toThrow("threshold must be a float between 0.0 and 1.0");
    });

    test("validates search category filter", () => {
      expect(() => assertMemorySearchOptions({ category: "fact" })).not.toThrow();
      expect(() => assertMemorySearchOptions({ category: "unknown" })).toThrow("category must be one of");
    });
  });

  describe("Invariance of Closed 17-Member RFC 9457 Error Catalogue", () => {
    test("ensures error catalogue has strictly 17 members with zero modifications", () => {
      expect(Object.keys(ERROR_CATALOGUE).length).toBe(17);
    });
  });
});
