---
doc_class: canonical
owner: sprint-agent
milestone: M6
story: S6.5
status: complete
risk_tier: MEDIUM
created: 2026-10-27
last_verified: 2026-10-27
related:
  - _documentation/planning/milestones/m6-pluggable-memory/sprint-status.yaml
  - _documentation/planning/milestones/m6-pluggable-memory/milestone.md
  - _documentation/planning/architecture/05-m6-pluggable-long-term-memory-store.md
supersedes: []
regenerable: false
pinned: false
---

# S6.5 — In-Process Mem0 Engine Adapter & Remote Worker Extraction Seam

> **Work Unit:** WU-M6-5 · **Effort:** 4 · **Priority:** p0 · **Risk Tier:** MEDIUM  
> **Owner:** `developer-agent` · **Depends on:** S6.4

```mermaid
graph TD
    CALLER["MemoryStore Caller"] --> FACTORY["createMemoryStore()"]
    FACTORY -->|in-process| MEM0["InProcessMem0Store<br/>(Redis + Vector Coordination)"]
    FACTORY -->|worker| SEAM["WorkerMemoryStore<br/>(HTTP Seam Client)"]
    MEM0 --> DEDUP["Fact Extraction &<br/>Similarity Deduplication (>0.85)"]
    SEAM --> WORKER_API["Worker HTTP API (/api/v1/memory)"]
    MEM0 --> TEST["tests/memory/<br/>extraction-seam.test.ts"]

    classDef blue fill:#E8F0FE,stroke:#4285F4,stroke-width:1.5px,color:#174EA6;
    classDef green fill:#E6F4EA,stroke:#34A853,stroke-width:1.5px,color:#137333;
    class CALLER blue;
    class FACTORY,MEM0,SEAM,DEDUP,WORKER_API,TEST green;
```

## Goal
Implement the unified `InProcessMem0Store` coordinating Redis entity storage and Vector search with fact deduplication, and implement `WorkerMemoryStore` to prove extraction seam portability.

## Acceptance Criteria
1. Implement `InProcessMem0Store` in `@repo/memory/src/mem0-store.ts` implementing `MemoryStore`.
2. Coordinate fact extraction and semantic deduplication: if new memory has cosine similarity > 0.85 to existing memory, update existing record rather than creating a duplicate.
3. Implement `WorkerMemoryStore` in `@repo/memory/src/worker-store.ts` implementing `MemoryStore` over HTTP seam.
4. Verify extraction seam portability: switching between `in-process` and `worker` mode executes identically via `MemoryStore` interface with zero caller changes (`AC-6.1`, `FR-020`, `NFR-019`).
5. Ensure zero external vendor memory charges: strictly $0.00/month infrastructure ceiling (`NFR-014`, `NFR-016`).

## Change Matrix (frozen)
| Class | Paths |
|---|---|
| **new_files** | `packages/memory/src/mem0-store.ts`, `packages/memory/src/worker-store.ts`, `tests/memory/mem0-store.test.ts`, `tests/memory/extraction-seam.test.ts` |
| **allowed_files** | `packages/memory/**`, `tests/memory/**` |
| **forbidden_files** | `packages/contracts/**`, `packages/metering/**`, `packages/auth/**`, `packages/ingestion/**`, `packages/config/**`, `packages/ui/**`, `packages/workspace/**`, `packages/db/**`, `packages/reasoning/**`, `infra/**`, `apps/**`, `_documentation/**` |

## Verification Hook
```bash
bun test tests/memory/extraction-seam.test.ts && bun test tests/memory/mem0-store.test.ts && turbo run typecheck --filter=@repo/memory
```

## Rollout / Compatibility
Expand-only. Delivers the core memory engine and seam adapters in `@repo/memory` without impacting existing runtime services.
