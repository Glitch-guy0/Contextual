---
doc_class: canonical
owner: sprint-agent
milestone: M4
story: S4.3
status: complete
risk_tier: MEDIUM
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

# S4.3 — Typed Edge Write Path & Relation Validation

> **Work Unit:** WU-M4-4 · **Effort:** 3 · **Priority:** p0 · **Risk Tier:** MEDIUM  
> **Owner:** `developer-agent` · **Depends on:** S4.2

```mermaid
graph TD
    REQ["createEdge"] --> Z["EdgeType union check"]
    Z -->|invalid| E400["400 invalid-node-relation<br/>0 queries, 0 credits"]
    Z -->|cites | related| OWN["Both endpoints in caller's tenant"]
    OWN -->|foreign| E404["404"]
    OWN -->|ok| TX["transaction insert"]
    TX -->|dup| E409["409"]
    TX -->|ok| R201["201"]

    classDef blue fill:#E8F0FE,stroke:#4285F4,stroke-width:1.5px,color:#174EA6;
    classDef green fill:#E6F4EA,stroke:#34A853,stroke-width:1.5px,color:#137333;
    classDef amber fill:#FEF7E0,stroke:#FBBC04,stroke-width:1.5px,color:#B06000;
    classDef red fill:#FCE8E6,stroke:#EA4335,stroke-width:1.5px,color:#C5221F;
    class REQ,Z,OWN blue;
    class TX,R201 green;
    class E404 amber;
    class E400,E409 red;
```

## Goal
Implement the typed edge write path so an unsupported relation string is rejected **before** any database round trip.

## Acceptance Criteria
1. `relation_type: "author_of"` → HTTP 400 with RFC 9457 `invalid-node-relation` (**AC-4.2**); query counter stays at 0.
2. `cites` and `related` are the only accepted values; the union is the single source of truth.
3. Both endpoints must resolve inside the caller's `user_id` + `notebook_id`, else 404 with 0 credits debited.
4. Self-edge → 400; duplicate `(source_id, target_id, edge_type)` → 409.
5. Listing edges for a foreign notebook returns 404 with zero rows (**AC-4.3**).

## Change Matrix (frozen)
| Class | Paths |
|---|---|
| **new_files** | `packages/workspace/src/edges.ts`, `tests/workspace/edge-validation.test.ts`, `tests/workspace/edge-tenant.test.ts` |
| **allowed_files** | `packages/workspace/**`, `tests/workspace/**`, `_documentation/planning/contracts/api-contract.openapi.yaml` |
| **forbidden_files** | `packages/metering/**`, `packages/auth/**`, `packages/ingestion/**`, `packages/config/**`, `packages/ui/**`, `packages/db/**`, `tests/*.test.ts`, `infra/**`, `apps/**`, `_documentation/**` |

## Verification Hook
```bash
bun test tests/workspace/edge-validation.test.ts tests/workspace/edge-tenant.test.ts
```

## Rollout / Compatibility
Additive endpoint on an additive path. No existing request shape changes → no `BREAKING CHANGE` footer.
