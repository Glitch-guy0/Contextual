---
id: S2.4
epic: EPIC-002
milestone: M2
target_version: v0.2.0
status: not-started
owner: developer-agent
---

# Story S2.4: Closed 17-Member RFC 9457 Problem Details Error Catalog & Serializer

## Outcome
All API exceptions and error responses serialize strictly according to RFC 9457 `application/problem+json` with all 5 mandatory top-level members (`type`, `title`, `status`, `detail`, `instance`). Error types are strictly validated against a closed 17-member platform catalogue (`FR-025`, `FR-027`, `BR-028`..`BR-032`).

## Change Matrix
- **`new_files`:**
  - `packages/contracts/src/errors.ts`
  - `packages/contracts/src/error-catalog.ts`
  - `packages/contracts/tests/errors.test.ts`
- **`allowed_files`:**
  - `packages/contracts/src/index.ts`
  - `packages/contracts/package.json`
- **`forbidden_files`:**
  - `apps/**`
  - `packages/metering/**`

## Acceptance Criteria
1. Attempting to emit an uncatalogued error type (e.g. `unknown-fatal-bug`) throws a TypeScript compile-time and runtime validation error.
2. Formatted problem detail payloads include required members and strip internal error stacks, database connection strings, and API secrets (`NFR-026`, `BR-031`).
3. Serialization latency p99 < 50 ms (`NFR-027`).

## Verification
- **Command:** `bun test packages/contracts/tests/errors.test.ts`
- **Expected:** All 3 test scenarios pass with 0 failures.
