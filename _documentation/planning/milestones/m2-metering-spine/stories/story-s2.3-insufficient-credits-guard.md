---
id: S2.3
epic: EPIC-002
milestone: M2
target_version: v0.2.0
status: not-started
owner: developer-agent
---

# Story S2.3: Insufficient Credits Ingress Guard & HTTP 402 Short-Circuit

## Outcome
Protected metered endpoints are guarded by a middleware/service guard that refuses requests immediately with HTTP 402 `INSUFFICIENT_CREDITS` whenever account balance is lower than the configured action cost (`FR-016`, `BR-015`). Zero calls are made to downstream LLMs or background workers.

## Change Matrix
- **`new_files`:**
  - `packages/metering/src/metering-guard.ts`
  - `packages/metering/tests/metering-guard.test.ts`
- **`allowed_files`:**
  - `packages/metering/src/index.ts`
  - `packages/contracts/src/errors.ts`
- **`forbidden_files`:**
  - `apps/**`
  - `packages/db/**`

## Acceptance Criteria
1. When balance is 0.2 and action cost is 0.5, guard aborts and returns an RFC 9457 problem envelope with `status: 402` and `type: "https://contextual.ai/errors/insufficient-credits"`.
2. Mock downstream LLM route handler is asserted to have been called 0 times during rejection.
3. Response payload includes `credits_remaining: 0.2` and `credits_required: 0.5`.

## Verification
- **Command:** `bun test packages/metering/tests/metering-guard.test.ts`
- **Expected:** All 2 test scenarios pass with 0 failures.
