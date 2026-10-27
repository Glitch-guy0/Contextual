---
doc_class: canonical
owner: pm-agent
milestone: M7
status: completed
created: 2026-10-23
last_verified: 2026-10-27
review_cadence_days: 90
code_refs: []
related:
  - _documentation/index.md
  - _documentation/project-details.md
  - _documentation/planning/prd.md
  - _documentation/planning/conventions.md
  - _documentation/planning/milestones/overview.md
  - _documentation/planning/architecture/05-m7-autonomous-maintenance-and-observability.md
  - _documentation/planning/milestones/m7-maintenance-observability/sprint-status.yaml
  - _documentation/planning/milestones/m7-maintenance-observability/pm-approval.md
  - _documentation/planning/milestones/m7-maintenance-observability/dev-log.md
  - _documentation/planning/decisions/adr-0004-unified-upstash-serverless-architecture.md
  - _documentation/planning/epics/epic-007-maintenance-and-keepalive.md
supersedes: []
regenerable: false
pinned: false
---

# Milestone Charter — M7: Autonomous Maintenance Crons & Observability (v0.7.0)

> **Status:** Completed (Gate G6 PASS · Follows M6 Pluggable Memory)  
> **Author:** pm-agent (Stage 2 Owner) · **Date:** 2026-10-27  
> **Target Version:** `v0.7.0` · **Risk Tier:** HIGH  
> **Grounding:** `project-brief.md` (FR-015, FR-040..FR-042; BR-010..BR-012, BR-025..BR-027, BR-037, BR-044; NFR-009, NFR-017, NFR-026, NFR-031, NFR-032; ADR-0004)  


```mermaid
graph TD
    subgraph "Scheduled Maintenance Spine (Upstash QStash)"
        QSTASH["Upstash QStash Cron Engine<br/>(Serverless HTTP Schedules)"]
        QSTASH -->|Daily 08:00 UTC| RESET["/api/v1/crons/reset-credits<br/>(Idempotent Lua Ledger Reset)"]
        QSTASH -->|Weekly Schedule| SWEEP["/api/v1/crons/retention-sweep<br/>(7-Day Idle Notebook Cascade)"]
        SWEEP --> PURGE_VEC["Delete Vectors in Upstash Vector<br/>(Points purged by notebookId)"]
        SWEEP --> TOMBSTONE["Create 30-Day Tombstone in Neon<br/>(Subsequent calls return HTTP 410)"]
    end

    subgraph "Telemetry & Observability Pipeline"
        ALL["All API Routes & Handlers"] --> PINO["Structured JSON Logger<br/>(Pino + Correlation ID)"]
        PINO --> REDACT["Redaction Sanitizer<br/>(Strip JWT, Keys, DB URIs, PII)"]
        REDACT --> OTEL["OpenTelemetry Node SDK<br/>(W3C traceparent export)"]
        OTEL --> BETTER["Better Stack Cloud<br/>(Log Storage & Uptime Probes)"]
    end

    classDef blue fill:#E8F0FE,stroke:#4285F4,stroke-width:1.5px,color:#174EA6;
    classDef green fill:#E6F4EA,stroke:#34A853,stroke-width:1.5px,color:#137333;

    class QSTASH,ALL blue;
    class RESET,SWEEP,PURGE_VEC,TOMBSTONE,PINO,REDACT,OTEL,BETTER green;
```

---

## 1. Executive Summary & Outcome

Milestone M7 introduces production-grade autonomous maintenance and centralized observability (`v0.7.0`). It deploys serverless crons via Upstash QStash to execute the daily 08:00 UTC credit reset (`BR-025`) and the weekly 7-day retention cascade sweeper (`BR-037`). Idle notebooks are safely purged with vector deletion and 30-day tombstones returning HTTP 410 `NOTEBOOK_EXPIRED` (`BR-044`). The milestone also establishes structured JSON logging via Pino, W3C trace propagation, strict credential and PII redaction (`NFR-026`), and OTLP telemetry forwarding to Better Stack.

*(Note: Per ADR-0004, Upstash Vector never suspends from inactivity; the artificial 48-hour Qdrant keepalive probe is officially deprecated).*

---

## 2. In Scope

- **Autonomous Maintenance Crons (`FR-015`, `FR-040`):**
  - Daily 08:00 UTC credit ledger reset via QStash HTTP trigger and idempotent Redis Lua script (`BR-025`, `BR-026`).
  - Weekly retention sweeper identifying notebooks idle for ≥ 7 days (`BR-037`).
- **7-Day Retention Cascade & Tombstones (`FR-041`, `BR-044`):**
  - Deletes all associated vector points in Upstash Vector for idle notebooks.
  - Updates Neon Postgres record to tombstone status with a 30-day TTL.
  - Returns HTTP 410 `NOTEBOOK_EXPIRED` with RFC 9457 error payload if tombstoned notebook is requested.
- **Centralized Telemetry & Logging (`FR-042`, `NFR-009`, `BR-010`):**
  - Structured JSON logs with schema `{ timestamp, level, correlation_id, service, event, payload }`.
  - W3C `traceparent` header propagation across all internal function calls.
  - OpenTelemetry SDK exporting spans to Better Stack via OTLP/HTTP.
- **Strict PII & Secret Redaction (`NFR-026`, `BR-012`):**
  - Regex filtering stripping Authorization Bearer tokens, Clerk JWTs, Upstash/Google API keys, and connection strings before stdout emission.

---

## 3. Out of Scope

- Marketing landing page visual styling (owned by Milestone M8).
- Multi-user concurrency load testing scripts (owned by Milestone M9).
- Final production CI/CD tag push (owned by Milestone GA).

---

## 4. Acceptance Criteria & Gate Status

| ID | Criterion | Evidence Target | Gate |
|:---:|---|---|:---:|
| **AC-7.1** | Daily Credit Reset | QStash webhook invokes reset; user balances reset to 10 at 08:00 UTC idempotently | G5 |
| **AC-7.2** | Retention Cascade Purge | Idle notebook (≥ 7 days) has vectors deleted; request returns HTTP 410 Tombstone | G5 |
| **AC-7.3** | Structured Logging Format | 100% of logs emit valid JSON carrying `correlation_id` and W3C trace context | G6 |
| **AC-7.4** | Secret Redaction Attestation | Injected Bearer tokens and API keys are redacted to `[REDACTED]` in log output | G6 |

---

## 5. Next Steps & Pipeline Handoff

1. Follows completion and sign-off of Milestone M6 (Pluggable Memory).
2. `sprint-agent` authors `m7-maintenance-observability/sprint-status.yaml` and story cards.
3. Hands off to `developer-agent` for crons and telemetry pipeline implementation.
