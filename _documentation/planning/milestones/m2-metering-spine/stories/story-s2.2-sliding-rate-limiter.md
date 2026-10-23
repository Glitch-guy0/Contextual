---
id: S2.2
epic: EPIC-002
milestone: M2
target_version: v0.2.0
status: not-started
owner: developer-agent
---

# Story S2.2: Per-User 5 RPS Sliding Window Rate Limiter

## Outcome
All requests are evaluated against a 5 requests-per-second sliding window (`RATE_LIMIT_RPS = 5`). Requests exceeding the rate are throttled with `allowed: false` and a computed `retry_after: 1` backoff (`FR-017`, `BR-016`). Rejected requests never debit user credits (`BR-017`).

## Change Matrix
- **`new_files`:**
  - `packages/metering/src/rate-limiter.ts`
  - `packages/metering/src/lua/sliding-window.lua`
  - `packages/metering/tests/rate-limiter.test.ts`
- **`allowed_files`:**
  - `packages/metering/src/index.ts`
  - `packages/contracts/src/metering.ts`
- **`forbidden_files`:**
  - `apps/**`
  - `packages/db/**`

## Acceptance Criteria
1. Up to 5 requests within a 1,000ms rolling window return `{ allowed: true, remaining: 4..0 }`.
2. A 6th request inside the same 1,000ms window returns `{ allowed: false, retryAfterSeconds: 1 }`.
3. Limiter evaluation p99 latency < 10 ms (`NFR-012`).
4. Rejection by the rate limiter bypasses credit debiting, ensuring balance is untouched (`BR-017`).

## Verification
- **Command:** `bun test packages/metering/tests/rate-limiter.test.ts`
- **Expected:** All 3 test scenarios pass with 0 failures.
