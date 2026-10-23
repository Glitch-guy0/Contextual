# Agent Stage Handoff Document — Stage 3 Architecture Design to Stage 4 Sprint Breakdown & Implementation

> **Handoff ID:** `handoff-009-architect-to-sprint-developer`  
> **From:** `architect-agent` (Stage 3 Owner · System Designer & C4 Modeler)  
> **To:** `sprint-agent` / `developer-agent` (Stage 4 Owners · Sprint Governor & Downstream Builder)  
> **Timestamp:** 2026-10-23T18:20:00Z  
> **Workflow ID:** `wf-contextual-001` · **Delivery Mode:** Balanced · **Target Maturity:** MVP  
> **Milestone:** M2 — Metering Spine & Quota Throttling (`v0.2.0`)  

---

## 1. Handoff Field Block

```text
From -> To: architect-agent → sprint-agent / developer-agent
Objective: Deliver complete, validated technical architecture for Milestone M2 (Metering Spine & Quota Throttling) for Sprint story ratification and clean-session implementation across stories S2.1 through S2.6.
Status: READY_FOR_HANDOFF
Risk tier: HIGH
Accepted criteria: Checkpoint 3 (CP3) satisfied: Detailed architectural design document authored (05-m2-metering-spine-and-quota-throttling.md) with C4 models, Redis key namespaces, atomic Lua scripts (debit-credits.lua, sliding-window.lua, daily-reset.lua), closed 17-member RFC 9457 error catalogue, quota header specifications, and SET NX EX 86400 idempotency locks; OpenAPI 3.1 specification updated (/credits/balance headers, /credits/reset webhook); component catalog (component-catalog.yaml) updated with @repo/metering and @repo/contracts; package dependency plan (package-dependency-plan.md) updated with @repo/metering; failure mode register (failure-mode-register.md) updated with M2 FMEA sweep (FM-201..FM-206); raw SQL exception register (raw-sql-exceptions.md) ratified with zero raw SQL exceptions; planning dispatch log (planning-dispatch-log.md) recorded with status ACCEPTED across all 5 M2 specialist consultations (DSP-006..DSP-010); Gate G4 passed.
Artifacts:
  - _documentation/planning/architecture/05-m2-metering-spine-and-quota-throttling.md (created, final)
  - _documentation/planning/architecture.md (updated, final)
  - _documentation/planning/contracts/component-catalog.yaml (updated, final)
  - _documentation/planning/contracts/api-contract.openapi.yaml (updated, final)
  - _documentation/planning/registers/package-dependency-plan.md (updated, final)
  - _documentation/planning/registers/raw-sql-exceptions.md (updated, final)
  - _documentation/planning/registers/failure-mode-register.md (updated, final)
  - _documentation/logs/handoff-documents/planning-dispatch-log.md (updated, final)
  - _documentation/planning/milestones/milestone-status.yaml (updated, G4 PASS)
  - _documentation/planning/milestones/m2-metering-spine/milestone.md (updated, architecture-finalized)
  - _documentation/system/workflow-context.yaml (updated, active milestone M2)
  - _documentation/index.md (updated, routed)
Dependencies and risks:
  - Upstash Redis network latency and serverless cold starts: Mitigated via HTTP connection Keep-Alive on Upstash REST client and hard 2,000ms client timeout.
  - Redis EVALSHA cache eviction (NOSCRIPT error): Mitigated by executeLua wrapper executing automatic SCRIPT LOAD reload and SHA1 cache update.
  - Concurrent daily reset race conditions at 08:00 UTC: Mitigated by atomic SET reset:{date}:{userId} 1 NX EX 86400 idempotency locks.
  - Host clock drift: Mitigated by querying Redis server TIME command within Lua scripts rather than local host clocks (BR-026).
Assumptions made:
  - Decision: Atomic single EVALSHA Lua script for credit debiting chosen over PostgreSQL row locking to avoid waking serverless database compute and prevent cold starts.
  - Decision: Redis sorted set millisecond timestamp sliding window chosen over fixed window counter to eliminate 2x window-boundary burst traffic attacks.
  - Decision: Upstash QStash cron trigger combined with lazy on-demand evaluation chosen for daily 08:00 UTC resets without persistent server processes.
  - Decision: Zero raw SQL exceptions required for M2; high-concurrency metering is isolated purely in Upstash Redis.
Open issues: None blocking. Zero unresolved architectural ambiguities.
Verification:
  - Architecture Review: Checked all 12 arc42 headings and Section Stewards in architecture.md -> PASS
  - C4 Context & Mermaid: Validated vertical graph TD pastel formatting and node syntax in 05-m2-metering-spine-and-quota-throttling.md -> PASS
  - Contract Synchronization: Validated component-catalog.yaml, api-contract.openapi.yaml, and config-schema.yaml against M2 specifications -> PASS
  - Specialist Dispatches: All 5 dispatches (DSP-006..010) marked ACCEPTED in planning-dispatch-log.md -> PASS
  - Code Execution: Production code implementation and live Lua script tests deferred to Stage 4 (developer-agent) -> NOT_VERIFIED (Stage 4 responsibility)
Resume condition: sprint-agent confirms sprint board (m2-metering-spine/sprint-status.yaml) and developer-agent implements stories S2.1 through S2.6 strictly adhering to frozen Change Matrices.
Documentation impact:
  - _documentation/planning/architecture/05-m2-metering-spine-and-quota-throttling.md — CREATED
  - _documentation/planning/architecture.md — UPDATED
  - _documentation/planning/contracts/component-catalog.yaml — UPDATED
  - _documentation/planning/contracts/api-contract.openapi.yaml — UPDATED
  - _documentation/planning/registers/package-dependency-plan.md — UPDATED
  - _documentation/planning/registers/raw-sql-exceptions.md — UPDATED
  - _documentation/planning/registers/failure-mode-register.md — UPDATED
  - _documentation/logs/handoff-documents/planning-dispatch-log.md — UPDATED
  - _documentation/planning/milestones/milestone-status.yaml — UPDATED
  - _documentation/planning/milestones/m2-metering-spine/milestone.md — UPDATED
  - _documentation/system/workflow-context.yaml — UPDATED
  - _documentation/index.md — UPDATED
```

---

## 2. Handoff Metadata
- **From Agent:** `architect-agent`
- **Sequence:** 009
- **Timestamp:** 2026-10-23T18:20:00Z
- **Active Workflow ID:** `wf-contextual-001`
- **Delivery Mode:** `balanced`
- **Target Maturity:** `mvp`

---

## 3. Executive Context Digest
Stage 3 Architecture Planning for Milestone M2 (Metering Spine & Quota Throttling, `v0.2.0`) is complete. The system architecture establishes:
1. **Atomic Upstash Redis Lua Credit Ledger (`packages/metering/src/credit-ledger.ts`, `lua/debit-credits.lua`):** Allocates a default 10.0 daily credit grant (`CREDIT_GRANT_DEFAULT`), debits 0.5 credits for LLM actions and 1.0 for document ingest in a single atomic `EVALSHA` call, guaranteeing zero negative balances and zero lost updates under 100 concurrent races (`NFR-011`, `BR-013`).
2. **5 RPS Sliding Window Rate Limiter (`packages/metering/src/rate-limiter.ts`, `lua/sliding-window.lua`):** Uses Redis sorted sets scoring millisecond timestamps to enforce a rolling 1,000ms window (`NFR-012`). The 6th request within 1s returns HTTP 429 with computed `Retry-After: 1` and `RateLimit` headers; throttled requests debit zero credits (`BR-017`).
3. **Ingress Credit Guard & HTTP 402 Short-Circuit (`packages/metering/src/metering-guard.ts`):** Evaluates account balance against action cost; returns RFC 9457 HTTP 402 `INSUFFICIENT_CREDITS` immediately when balance < cost, guaranteeing zero calls to downstream LLMs or vector stores (`BR-015`).
4. **Closed 17-Member RFC 9457 Error System (`packages/contracts/src/error-catalog.ts`, `errors.ts`):** Serializes `application/problem+json` envelopes with immutable type URIs, machine-readable quota fields (`service`, `quota_period`, `resets_in_seconds`, `credits_remaining`), and strict regex redaction of secrets, tokens, and database credentials (`NFR-026`, `BR-031`).
5. **Upstream Quota Classifier & RateLimit Headers (`packages/metering/src/quota-classifier.ts`, `headers.ts`):** Maps Google AI Studio 429 `RESOURCE_EXHAUSTED` to RFC 9457 `SERVICE_LIMIT_REACHED` (HTTP 402) rather than misleading generic 5xx errors; injects standardized `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, and `RateLimit-Policy` headers.
6. **Idempotent Daily 08:00 UTC Reset Engine (`packages/metering/src/daily-reset.ts`, `lua/daily-reset.lua`):** Resets balances to 10.0 credits at 08:00 UTC (aligned with Google AI Studio reset boundary), permanently drops unspent credits without carry-over, protected by `SET reset:{date}:{userId} 1 NX EX 86400` locks against duplicate execution (`NFR-023`, `BR-025`).

---

## 4. Suggested Next Contributors

### `sprint-agent`
- **Why:** Verify Milestone M2 sprint board (`_documentation/planning/milestones/m2-metering-spine/sprint-status.yaml`) and confirm frozen Change Matrices for stories S2.1 through S2.6.
- **Could help with:** Review story definitions and ensure atomicity checks pass before clean-room builder session commences.

### `developer-agent`
- **Why:** Implement stories S2.1 through S2.6 in clean sessions adhering strictly to frozen Change Matrices in `packages/metering` and `packages/contracts`.
- **Could help with:** Author TypeScript code, Redis Lua scripts, and unit/integration test suites.

### `test-agent`
- **Why:** Validate OpenAPI contracts and execute independent verification gate certification (Checkpoint 4 / Gate G6) once developer implementation completes.
- **Could help with:** Verify 100 concurrent debit race tests, 5 RPS rate limiter tests, and RFC 9457 error serialization tests.

---
*Sealed by architect-agent at Stage 3 completion (Gate G4 PASS / Checkpoint 3 Certified).*
