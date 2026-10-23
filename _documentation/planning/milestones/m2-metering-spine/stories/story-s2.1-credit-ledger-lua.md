---
id: S2.1
epic: EPIC-002
milestone: M2
target_version: v0.2.0
status: not-started
owner: developer-agent
---

# Story S2.1: Atomic Upstash Redis Lua Credit Ledger Service

## Outcome
Accounts have a default balance of 10.0 credits (`CREDIT_GRANT_DEFAULT`) per day. Action costs (`CREDIT_COST_LLM_ACTION` = 0.5, `CREDIT_COST_DOC_PROCESS` = 1.0) are debited atomically via an Upstash Redis Lua script (`EVALSHA`), guaranteeing that balances are never observed negative and updates are never lost under concurrency (`NFR-011`, `BR-013`, `BR-014`).

## Change Matrix
- **`new_files`:**
  - `packages/metering/src/credit-ledger.ts`
  - `packages/metering/src/lua/debit-credits.lua`
  - `packages/metering/tests/credit-ledger.test.ts`
- **`allowed_files`:**
  - `packages/metering/src/index.ts`
  - `packages/metering/package.json`
  - `packages/contracts/src/metering.ts`
- **`forbidden_files`:**
  - `apps/**`
  - `packages/db/**`

## Acceptance Criteria
1. Initial lookup of an uninitialized account initializes `credits:{userId}` to 10.0 and returns 10.0.
2. Executing `debitCredits(userId, 0.5, 'llm_action')` decrements balance to 9.5 and returns `{ success: true, remaining: 9.5 }`.
3. 100 concurrent debit requests of 0.5 credits against a balance of 10.0 results in exactly 20 successful debits and 80 rejected debits, leaving the final balance exactly 0.0 with 0 negative readings.
4. If script cache is flushed (`NOSCRIPT`), wrapper catches and executes `SCRIPT LOAD` automatically.

## Verification
- **Command:** `bun test packages/metering/tests/credit-ledger.test.ts`
- **Expected:** All 3 test scenarios pass with 0 failures.
