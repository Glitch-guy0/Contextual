---
doc_class: canonical
owner: sprint-agent
milestone: M4
story: S4.1
status: complete
risk_tier: LOW
created: 2026-10-26
last_verified: 2026-10-26
related:
  - _documentation/planning/milestones/m4-notebook-workspace/sprint-status.yaml
  - _documentation/planning/milestones/m4-notebook-workspace/milestone.md
  - _documentation/planning/architecture/05-m4-notebook-workspace-and-domain-graph.md
supersedes: []
regenerable: false
pinned: false
---

# S4.1 — Graph Contracts, Schema Types & Expand Migration

> **Work Unit:** WU-M4-1 · **Effort:** 3 · **Priority:** p0 · **Risk Tier:** LOW  
> **Owner:** `developer-agent` · **Depends on:** — (sprint entry point)

```mermaid
graph TD
    CTX["@repo/contracts<br/>EdgeType union"] --> SCHEMA["@repo/db schema.ts<br/>node + edge tables"]
    SCHEMA --> MIG["migration 002<br/>(expand only)"]
    MIG --> TEST["tests/workspace/<br/>migration.test.ts"]

    classDef blue fill:#E8F0FE,stroke:#4285F4,stroke-width:1.5px,color:#174EA6;
    classDef green fill:#E6F4EA,stroke:#34A853,stroke-width:1.5px,color:#137333;
    class CTX,SCHEMA blue;
    class MIG,TEST green;
```

## Goal
Establish the persistence and type foundation for the M4 domain graph: a closed `EdgeType` union, Kysely table types for `notebook_nodes` / `notebook_edges`, and an **expand-only** migration `002`.

## Acceptance Criteria
1. `EdgeType` exported from `@repo/contracts` as `"cites" | "related"` — no wider.
2. Kysely interfaces for `notebook_nodes` and `notebook_edges` added to `packages/db/src/schema.ts` and registered on `Database`.
3. `002_notebook_graph.ts` creates both tables with:
   - composite index `(user_id, notebook_id)` on each table,
   - `CHECK (edge_type IN ('cites','related'))` and `CHECK (source_id <> target_id)`,
   - `FOREIGN KEY … ON DELETE CASCADE` to `notebooks` and to `notebook_nodes`,
   - `UNIQUE (source_id, target_id, edge_type)`.
4. Migrator runs `001 → 002` on a fresh database **and** on a database already migrated through `001`.
5. `raw-sql-exceptions.md` stays at 0 rows (everything expressed through the Kysely migration builder).

## Change Matrix (frozen)
| Class | Paths |
|---|---|
| **new_files** | `packages/contracts/src/workspace.ts`, `packages/db/src/migrations/002_notebook_graph.ts`, `tests/workspace/migration.test.ts` |
| **allowed_files** | `packages/contracts/src/**`, `packages/db/src/**`, `tests/workspace/**` |
| **forbidden_files** | `packages/metering/**`, `packages/auth/**`, `packages/ingestion/**`, `packages/config/**`, `packages/ui/**`, `packages/workspace/**`, `tests/*.test.ts`, `infra/**`, `apps/**`, `_documentation/**` |

## Verification Hook
```bash
bun test tests/workspace/migration.test.ts && bun run typecheck
```
Evidence must show the CHECK constraint rejecting a non-`cites`/`related` `edge_type` at the SQL level.

## Rollout / Compatibility
Expand-only. No existing column is altered or dropped, so the running M1–M3 code is unaffected. Nothing to contract later.
