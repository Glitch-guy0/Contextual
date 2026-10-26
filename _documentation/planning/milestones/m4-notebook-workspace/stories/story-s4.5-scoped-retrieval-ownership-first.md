---
doc_class: canonical
owner: sprint-agent
milestone: M4
story: S4.5
status: complete
risk_tier: HIGH
created: 2026-10-26
last_verified: 2026-10-26
related:
  - _documentation/planning/milestones/m4-notebook-workspace/sprint-status.yaml
  - _documentation/planning/milestones/m4-notebook-workspace/milestone.md
  - _documentation/planning/architecture/05-m4-notebook-workspace-and-domain-graph.md
  - _documentation/planning/registers/failure-mode-register.md
supersedes: []
regenerable: false
pinned: false
---

# S4.5 — Scoped Retrieval With Ownership Checked Before Debit

> **Work Unit:** WU-M4-6 · **Effort:** 5 · **Priority:** p0 · **Risk Tier:** **HIGH**  
> **Owner:** `developer-agent` · **Depends on:** S4.2

```mermaid
graph TD
    S["scopedSearch"] --> V["validate scope DTO"]
    V --> O["ownership predicate<br/>WHERE user_id = ?"]
    O -->|0 rows| F404["404 notebook-not-found<br/>debits: 0 · vector calls: 0"]
    O -->|row| D["debit via Lua"]
    D -->|short| F402["402 INSUFFICIENT_CREDITS"]
    D -->|ok| Q["vector query<br/>user_id filter"]
    Q --> R["scoped results"]

    classDef blue fill:#E8F0FE,stroke:#4285F4,stroke-width:1.5px,color:#174EA6;
    classDef green fill:#E6F4EA,stroke:#34A853,stroke-width:1.5px,color:#137333;
    classDef amber fill:#FEF7E0,stroke:#FBBC04,stroke-width:1.5px,color:#B06000;
    classDef red fill:#FCE8E6,stroke:#EA4335,stroke-width:1.5px,color:#C5221F;
    class S,V,O blue;
    class D,Q,R green;
    class F404 amber;
    class F402 red;
```

## Goal
Implement scoped retrieval (`node` | `branch` | `notebook`) where the ownership predicate **structurally gates** the metering debit.

## Hard Sequencing Contract
```
validate DTO → ownership predicate → [only if owned] debit → vector query
```
There must be no code path in which `debitCredits()` is reachable without the predicate having returned ≥ 1 row.

## Acceptance Criteria
1. Malformed `scope_kind` → HTTP 400 before any other work.
2. **AC-4.4:** unowned scope → HTTP 404 `notebook-not-found`, `credits_balance` **unchanged**, vector client invocation count **0**.
3. Ownership is a `WHERE user_id = ?` predicate on the reading statement, not a separate probe.
4. Owned scope debits **exactly once**, then queries Upstash Vector with the mandatory `user_id` filter (`NFR-007`).
5. Insufficient balance → HTTP 402 with zero vector calls.

## Preconditions & Recovery
- **Precondition:** S4.2's repository contract merged; `debitCredits` has a single call site, inside the gated path.
- **Recovery:** debit succeeded + vector call threw → restore via existing atomic `refund-credits.lua`, surface HTTP 503.
- **Stop condition:** any test observing `credits_balance` change on an unowned scope halts the story and returns it to `architect-agent` (FM-403, AP=H).

## Change Matrix (frozen)
| Class | Paths |
|---|---|
| **new_files** | `packages/workspace/src/search.ts`, `tests/workspace/scoped-search-ownership.test.ts`, `tests/workspace/scoped-search-metering.test.ts` |
| **allowed_files** | `packages/workspace/**`, `tests/workspace/**`, `_documentation/planning/contracts/api-contract.openapi.yaml` |
| **forbidden_files** | `packages/metering/**`, `packages/auth/**`, `packages/ingestion/**`, `packages/config/**`, `packages/ui/**`, `packages/db/**`, `tests/*.test.ts`, `infra/**`, `apps/**`, `_documentation/**` |

> `@repo/metering` is a **dependency, not an editable file**: the story consumes `debitCredits` through its public contract and may not modify the ledger, Lua scripts, or its config.

## Verification Hook
```bash
bun test tests/workspace/scoped-search-ownership.test.ts tests/workspace/scoped-search-metering.test.ts
```
The ownership test asserts **three** things together: 404 status, unchanged balance, zero vector calls.

## Rollout / Compatibility
Additive endpoint. Authorization runs before metering, so an unauthorized probe costs the platform no credit and the caller no balance.
