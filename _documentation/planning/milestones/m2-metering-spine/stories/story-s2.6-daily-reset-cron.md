---
id: S2.6
epic: EPIC-002
milestone: M2
target_version: v0.2.0
status: not-started
owner: developer-agent
---

# Story S2.6: Idempotent Daily 08:00 UTC Credit Reset Cron & QStash Endpoint

## Outcome
Account balances reset to 10.0 credits at `CREDIT_RESET_TZ` (08:00 UTC) every day (`FR-014`, `FR-024`, `BR-025`). Unspent credits permanently expire with zero carry-over. Resets are guarded by an atomic Redis Lua script (`SET reset:{date}:{userId} 1 NX EX 86400`) ensuring strict idempotency under concurrent triggers (`NFR-023`, `NFR-024`, `BR-026`).

## Change Matrix
- **`new_files`:**
  - `packages/metering/src/daily-reset.ts`
  - `packages/metering/src/lua/daily-reset.lua`
  - `packages/metering/tests/daily-reset.test.ts`
- **`allowed_files`:**
  - `packages/metering/src/index.ts`
  - `packages/contracts/src/metering.ts`
- **`forbidden_files`:**
  - `apps/**`

## Acceptance Criteria
1. Resetting an account with balance 3.5 resets balance to exactly 10.0 and logs `{ userId, expiredCredits: 3.5 }`.
2. Running `executeDailyReset(userId)` concurrently 10 times in parallel results in exactly 1 reset execution and 9 idempotent no-ops.
3. Reset timestamp calculation relies on Redis server `TIME` command rather than local host clocks (`BR-026`).

## Verification
- **Command:** `bun test packages/metering/tests/daily-reset.test.ts`
- **Expected:** All 3 test scenarios pass with 0 failures.
