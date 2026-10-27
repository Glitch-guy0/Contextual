---
doc_class: canonical
owner: sprint-agent
milestone: M7
story: S7.4
status: ready-for-dev
risk_tier: HIGH
created: 2026-10-27
last_verified: 2026-10-27
related:
  - _documentation/planning/milestones/m7-maintenance-observability/sprint-status.yaml
  - _documentation/planning/milestones/m7-maintenance-observability/milestone.md
  - _documentation/planning/architecture/05-m7-autonomous-maintenance-and-observability.md
supersedes: []
regenerable: false
pinned: false
---

# S7.4 — QStash Webhook Receiver with Cryptographic Signature Verification & Crons Driver

> **Work Unit:** WU-M7-4 · **Effort:** 4 · **Priority:** p0 · **Risk Tier:** HIGH  
> **Owner:** `developer-agent` · **Depends on:** S7.3

```mermaid
graph TD
    WEBHOOK["Incoming Webhook Request<br/>(Upstash-Signature)"] --> RECV["QStashSignatureVerifier<br/>HMAC SHA-256 Check"]
    RECV -->|Valid Signature| DRIVER["CronDriver Service<br/>executeDailyResetCron()"]
    RECV -->|Invalid Signature| ERR["HTTP 401 Unauthorized<br/>Short-Circuit"]
    DRIVER --> METER["@repo/metering<br/>executeDailyResetBatch()"]
    DRIVER --> LOG["Log & Heartbeat<br/>Structured Output"]
    LOG --> TEST["tests/observability/<br/>qstash-crons.test.ts"]

    classDef blue fill:#E8F0FE,stroke:#4285F4,stroke-width:1.5px,color:#174EA6;
    classDef green fill:#E6F4EA,stroke:#34A853,stroke-width:1.5px,color:#137333;
    classDef red fill:#FCE8E6,stroke:#EA4335,stroke-width:1.5px,color:#C5221F;
    class WEBHOOK,RECV blue;
    class DRIVER,METER,LOG,TEST green;
    class ERR red;
```

## Goal
Build the QStash webhook receiver with cryptographic HMAC SHA-256 signature verification (`Upstash-Signature`) guarding maintenance routes against unauthorized execution, and implement the scheduled crons driver orchestrating the daily 08:00 UTC credit reset batch.

## Acceptance Criteria
1. `QStashSignatureVerifier` validates incoming `Upstash-Signature` headers against the raw request body using `QSTASH_CURRENT_SIGNING_KEY` and fallback `QSTASH_NEXT_SIGNING_KEY`.
2. Reject requests with missing or cryptographically mismatched signatures with `false` or HTTP 401.
3. `executeDailyResetCron()` invokes `@repo/metering`'s `executeDailyResetBatch()`, records processed accounts and expired balances, and returns `CronExecutionResult`.
4. Successfully resets credits idempotently under concurrent invocations (`BR-025`, `BR-026`).
5. Emits structured JSON log with `correlation_id` and green heartbeat pulse upon job completion.

## Change Matrix (frozen)
| Class | Paths |
|---|---|
| **new_files** | `packages/observability/src/qstash-receiver.ts`, `packages/observability/src/cron-driver.ts`, `tests/observability/qstash-crons.test.ts` |
| **allowed_files** | `packages/observability/**`, `tests/observability/**` |
| **forbidden_files** | `packages/contracts/**`, `packages/metering/**`, `packages/auth/**`, `packages/ingestion/**`, `packages/config/**`, `packages/ui/**`, `packages/workspace/**`, `packages/db/**`, `packages/reasoning/**`, `packages/memory/**`, `infra/**`, `apps/**`, `_documentation/**` |

## Verification Hook
```bash
bun test tests/observability/qstash-crons.test.ts && turbo run typecheck --filter=@repo/observability
```

## Rollout / Compatibility
Expand-only. Validates webhook security and coordinates credit reset execution without altering existing metering logic.
