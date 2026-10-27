---
doc_class: canonical
owner: sprint-agent
milestone: M7
story: S7.5
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

# S7.5 — 7-Day Retention Cascade Sweeper, Vector Purge, DB Cascade & 30-Day Tombstones

> **Work Unit:** WU-M7-5 · **Effort:** 5 · **Priority:** p0 · **Risk Tier:** HIGH  
> **Owner:** `developer-agent` · **Depends on:** S7.4

```mermaid
graph TD
    SWEEP["RetentionSweeper Service<br/>executeRetentionSweep()"] --> FIND["findIdleNotebooks()<br/>updated_at < NOW - 7 days"]
    FIND --> VEC["purgeNotebookVectors()<br/>Upstash Vector delete by notebook_id"]
    VEC --> CASCADE["cascadeTombstoneNotebook()<br/>Drop nodes/edges & set deleted_at"]
    CASCADE --> TOMB["handleTombstoneCheck()<br/>Return HTTP 410 NOTEBOOK_EXPIRED"]
    SWEEP --> PURGE["hardPurgeExpiredNotebooks()<br/>deleted_at < NOW - 30 days"]
    TOMB --> TEST["tests/observability/<br/>retention-cascade.test.ts"]

    classDef blue fill:#E8F0FE,stroke:#4285F4,stroke-width:1.5px,color:#174EA6;
    classDef green fill:#E6F4EA,stroke:#34A853,stroke-width:1.5px,color:#137333;
    classDef red fill:#FCE8E6,stroke:#EA4335,stroke-width:1.5px,color:#C5221F;
    class SWEEP,FIND blue;
    class VEC,CASCADE,PURGE,TEST green;
    class TOMB red;
```

## Goal
Implement the 7-day retention cascade sweeper and 30-day tombstone engine. Idle notebooks are detected via Neon Postgres queries, associated vector points are deleted from Upstash Vector, relational child nodes/edges are purged, and a 30-day tombstone is established that returns HTTP 410 `NOTEBOOK_EXPIRED` (RFC 9457) before permanent hard purging.

## Acceptance Criteria
1. `findIdleNotebooks(db, cutoffDate)` returns notebooks with `deleted_at IS NULL` and `updated_at < cutoffDate` (7 days of inactivity).
2. `purgeNotebookVectors(vectorClient, notebookId)` deletes all vector embeddings associated with `notebookId` from Upstash Vector (`BR-039`).
3. `cascadeTombstoneNotebook(db, notebookId)` deletes child `notebook_nodes` and `notebook_edges` and sets `deleted_at = NOW()`, `expires_at = NOW() + 30 days`, `is_tombstoned = true` (`BR-040`, `BR-044`).
4. `hardPurgeExpiredNotebooks(db)` hard-deletes notebook records where `deleted_at IS NOT NULL` and `expires_at < NOW()`.
5. Access to a tombstoned notebook returns RFC 9457 HTTP 410 `NOTEBOOK_EXPIRED` ProblemDocument with deletion timestamp (`AC-7.2`).

## Change Matrix (frozen)
| Class | Paths |
|---|---|
| **new_files** | `packages/db/src/retention.ts`, `packages/observability/src/retention-sweeper.ts`, `tests/observability/retention-cascade.test.ts` |
| **allowed_files** | `packages/db/**`, `packages/observability/**`, `tests/observability/**` |
| **forbidden_files** | `packages/contracts/**`, `packages/metering/**`, `packages/auth/**`, `packages/ingestion/**`, `packages/config/**`, `packages/ui/**`, `packages/workspace/**`, `packages/reasoning/**`, `packages/memory/**`, `infra/**`, `apps/**`, `_documentation/**` |

## Verification Hook
```bash
bun test tests/observability/retention-cascade.test.ts && turbo run typecheck --filter=@repo/observability --filter=@repo/db
```

## Rollout / Compatibility
Expand-only. Utilizes existing `deleted_at`, `expires_at`, and `idle_since` fields on the `notebooks` table created in Milestone M1.
