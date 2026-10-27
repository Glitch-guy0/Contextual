---
doc_class: canonical
owner: sprint-agent
milestone: M8
story: S8.6
status: ready-for-dev
risk_tier: LOW
created: 2026-10-27
last_verified: 2026-10-27
related:
  - _documentation/planning/milestones/m8-landing-disclosure/sprint-status.yaml
  - _documentation/planning/milestones/m8-landing-disclosure/milestone.md
  - _documentation/planning/architecture/05-m8-public-marketing-landing-and-privacy-governance.md
supersedes: []
regenerable: false
pinned: false
---

# S8.6 — Performance Budget Simulation Suite, Component Catalog Update & Documentation Sync

> **Work Unit:** WU-M8-6 · **Effort:** 3 · **Priority:** p0 · **Risk Tier:** LOW  
> **Owner:** `developer-agent` · **Depends on:** S8.5

```mermaid
graph TD
    PERF["Core Web Vitals & Bundle Simulation<br/>tests/ui/performance-budget.test.ts"] --> BUDGET["Assert LCP < 2.0s, CLS < 0.1, CSS < 50KB"]
    BUDGET --> SUITE["Full Monorepo Suite Pass<br/>bun test (259+ tests pass)"]
    SUITE --> DOC_SYNC["Documentation Synchronization<br/>component-catalog, overview, milestone-status"]

    classDef blue fill:#E8F0FE,stroke:#4285F4,stroke-width:1.5px,color:#174EA6;
    classDef green fill:#E6F4EA,stroke:#34A853,stroke-width:1.5px,color:#137333;
    class PERF,BUDGET blue;
    class SUITE,DOC_SYNC green;
```

## Goal
Verify frontend performance budgets (Lighthouse Performance score ≥ 90, LCP < 2.0s, CLS < 0.1, FID < 100ms) under simulated 4G profile (`NFR-018`), and execute complete documentation synchronization across contracts and roadmap.

## Acceptance Criteria
1. Performance benchmark test `tests/ui/performance-budget.test.ts` verifying critical CSS bundle size < 50KB, zero render-blocking third-party scripts, and DOM node count < 800.
2. Core Web Vitals simulation asserts LCP < 2.0s and CLS < 0.1 under throttled conditions (`NFR-018`).
3. Unified test suite runs completely clean: all new UI tests pass alongside existing 259 monorepo tests with zero regressions.
4. Component catalog `component-catalog.yaml` updated with `comp-ui` package definitions and dependency relationships.
5. Milestone trackers (`milestone-status.yaml`, `overview.md`, `index.md`) updated to reflect complete M8 planning and readiness for developer handoff.

## Change Matrix (frozen)
| Class | Paths |
|---|---|
| **new_files** | `tests/ui/performance-budget.test.ts` |
| **allowed_files** | `packages/ui/src/**`, `tests/ui/**`, `_documentation/planning/**`, `_documentation/index.md` |
| **forbidden_files** | `packages/metering/**`, `packages/auth/**`, `packages/ingestion/**`, `packages/config/**`, `packages/workspace/**`, `packages/db/**`, `packages/reasoning/**`, `packages/memory/**`, `packages/observability/**`, `infra/**`, `apps/**` |

## Verification Hook
```bash
bun test tests/ui/performance-budget.test.ts && bun test && bun run build && bun run typecheck
```

## Rollout / Compatibility
Documentation and benchmark test addition. Fully compatible with existing packages and builds.
