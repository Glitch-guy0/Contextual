# Agent Stage Handoff Document — Stage 4 Sprint Breakdown to Clean-Session Implementation

> **Handoff ID:** `handoff-016-sprint-to-developer-m6`  
> **From:** `sprint-agent` (Tactical Story Decomposer & Sprint Governor)  
> **To:** `developer-agent` (Downstream Clean-Session Builder)  
> **Timestamp:** 2026-10-27T09:25:00Z  
> **Workflow ID:** `wf-contextual-001` · **Delivery Mode:** Balanced · **Target Maturity:** MVP  
> **Milestone:** M6 — Pluggable Long-Term Memory Store & Extraction Seams (`v0.6.0`)

---

## 1. Handoff Field Block

```text
From -> To: sprint-agent → developer-agent
Objective: Implement Milestone M6 in clean developer sessions strictly bound to frozen Change Matrices for Stories S6.1, S6.2, S6.3, S6.4, S6.5, and S6.6.
Status: ACCEPTED
Risk tier: MEDIUM
Accepted criteria: Sprint board authored at m6-pluggable-memory/sprint-status.yaml decomposing EPIC-006 into 6 atomic single-session stories; each story carries a frozen Change Matrix (new_files, allowed_files, forbidden_files), build_vs_buy_ref, tests, observability, a verification hook, and a risk tier; dependency graph verified as a DAG; story cards created in m6-pluggable-memory/stories/; AC-6.1..AC-6.4 each bound to a story-level test; PM approval granted unconditionally in pm-approval.md.
Artifacts:
  - _documentation/planning/milestones/m6-pluggable-memory/sprint-status.yaml (final)
  - _documentation/planning/milestones/m6-pluggable-memory/stories/story-s6.1-memory-contracts.md (final)
  - _documentation/planning/milestones/m6-pluggable-memory/stories/story-s6.2-package-scaffolding-and-factory.md (final)
  - _documentation/planning/milestones/m6-pluggable-memory/stories/story-s6.3-redis-entity-store.md (final)
  - _documentation/planning/milestones/m6-pluggable-memory/stories/story-s6.4-vector-semantic-memory.md (final)
  - _documentation/planning/milestones/m6-pluggable-memory/stories/story-s6.5-mem0-adapter-and-extraction-seam.md (final)
  - _documentation/planning/milestones/m6-pluggable-memory/stories/story-s6.6-reasoning-integration-and-benchmarks.md (final)
  - _documentation/planning/architecture/05-m6-pluggable-long-term-memory-store.md (final)
  - _documentation/planning/milestones/m6-pluggable-memory/pm-approval.md (approved)
  - _documentation/planning/contracts/api-contract.openapi.yaml (UPDATED — /users/me/memories CRUD/search & Memory schemas)
  - _documentation/planning/contracts/component-catalog.yaml (UPDATED — comp-memory interfaces and dependencies)
Dependencies and risks:
  - Strict domain memory isolation: 100% of memory calls route through MemoryStore interface; domain code MUST NEVER import vendor memory SDKs directly (BR-018, AC-6.1).
  - Multi-tenant isolation: User B querying memories seeded by User A MUST return an empty array (BR-002, BR-019, AC-6.4).
  - Memory search latency SLA: p95 latency < 150ms (NFR-008, AC-6.3).
  - Zero vendor memory charges: in-process Mem0 on Upstash Redis and Upstash Vector maintains $0.00/month infrastructure ceiling (NFR-014, NFR-016).
  - Extraction seam portability: switching between in-process and worker mode via MEMORY_STORE_MODE executes without altering caller call sites (FR-020, NFR-019).
Assumptions made:
  - Sequential DAG: S6.1 -> S6.2 -> S6.3 -> S6.4 -> S6.5 -> S6.6.
  - No Postgres database migration required for M6; memory storage is partitioned between Upstash Redis and Upstash Vector.
  - Pre-synthesis recall queries memory (< 150ms); memory extraction runs asynchronously post-response to preserve streaming TTFT.
Open issues: None blocking. Baseline is 100% green (154/154 pass, 9/9 build/typecheck clean).
Verification:
  - Story Atomicity: 6 stories checked for single-session scope and bounded file counts -> PASS
  - Two-Floor Boundary: no root-level file appears in any allowed_files -> PASS
  - Change Matrix Conflicts: no two stories claim the same new_file; forbidden lists do not intersect allowed lists -> PASS
  - Dependency DAG: S6.1 -> S6.2 -> S6.3 -> S6.4 -> S6.5 -> S6.6, zero cycles -> PASS
  - Board YAML parses; 6 stories, 6 story cards present -> PASS
  - Contracts compile: bun test packages/contracts/tests/errors.test.ts -> PASS (5/5 pass, catalogue intact at 17 members)
  - Workspace health: bun test (154/154 pass), bun run build (9/9 pass), bun run typecheck (9/9 pass) -> PASS
Resume condition: developer-agent starts with Story S6.1 inside its Change Matrix.
Documentation impact:
  - _documentation/planning/milestones/m6-pluggable-memory/sprint-status.yaml — CREATED
  - _documentation/planning/milestones/m6-pluggable-memory/stories/* (6 files) — CREATED
  - _documentation/planning/milestones/m6-pluggable-memory/pm-approval.md — CREATED
  - _documentation/planning/architecture/05-m6-pluggable-long-term-memory-store.md — CREATED
  - _documentation/planning/contracts/api-contract.openapi.yaml — UPDATED (/users/me/memories paths and schemas)
  - _documentation/planning/contracts/component-catalog.yaml — UPDATED (comp-memory methods and dependencies)
  - _documentation/planning/milestones/m6-pluggable-memory/milestone.md — UPDATED (ready-for-implementation, gate G5 PASS)
  - _documentation/planning/milestones/milestone-status.yaml — UPDATED (M5 completed, M6 ready)
  - _documentation/logs/party-mode/party-mode-log.md — UPDATED (Session 4, 8 sealed decisions)
  - _documentation/index.md — UPDATED (M6 rows)
```

---

## 2. Story Summary Matrix

| Story | Title | Scope / Packages | New Files | Tier | Verification Command |
|:---:|---|---|:---:|:---:|---|
| **S6.1** | Shared memory contracts, DTO types & MemoryStore interface | `@repo/contracts`, `tests/memory/` | 2 | LOW | `bun test tests/memory/contracts.test.ts && bun test packages/contracts/tests/errors.test.ts && bun run typecheck` |
| **S6.2** | Package scaffolding `@repo/memory`, configuration & seam factory | `@repo/memory`, `tests/memory/` | 5 | LOW | `bun test tests/memory/factory.test.ts && turbo run build --filter=@repo/memory && turbo run typecheck --filter=@repo/memory` |
| **S6.3** | In-process Upstash Redis entity and working memory store adapter | `@repo/memory`, `tests/memory/` | 2 | MEDIUM | `bun test tests/memory/redis-memory.test.ts && turbo run typecheck --filter=@repo/memory` |
| **S6.4** | In-process Upstash Vector semantic memory retrieval adapter with tenant filtering | `@repo/memory`, `tests/memory/` | 2 | MEDIUM | `bun test tests/memory/vector-memory.test.ts && turbo run typecheck --filter=@repo/memory` |
| **S6.5** | In-process Mem0 engine adapter and remote worker extraction seam | `@repo/memory`, `tests/memory/` | 4 | MEDIUM | `bun test tests/memory/extraction-seam.test.ts && bun test tests/memory/mem0-store.test.ts && turbo run typecheck --filter=@repo/memory` |
| **S6.6** | Reasoning pipeline memory recall hook, E2E isolation suite & latency benchmark | `@repo/reasoning`, `tests/memory/`, `@repo/memory` | 4 | MEDIUM | `bun test tests/memory/ && bun test tests/reasoning/ && turbo run build && turbo run typecheck` |

---

## 3. Implementation Sequence & Instructions for Developer

1. Execute stories sequentially in dependency order: `S6.1 → S6.2 → S6.3 → S6.4 → S6.5 → S6.6`.
2. Strictly respect frozen Change Matrices — do not modify files outside each story's `allowed_files`.
3. Never touch root configuration files (Two-Floor Boundary).
4. Run each story's verification hook before reporting completion.
5. `test-agent` will certify story closures upon evidence review.
