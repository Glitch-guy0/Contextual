---
doc_class: canonical
owner: git-planner-agent
milestone: M0
status: active
created: 2026-10-23
last_verified: 2026-10-23
review_cadence_days: 90
code_refs: []
related:
  - _documentation/planning/conventions.md
  - _documentation/planning/milestones/m0-workspace-foundation/milestone.md
  - _documentation/planning/milestones/m0-workspace-foundation/sprint-status.yaml
supersedes: []
regenerable: false
pinned: false
---

# Git Plan — Milestone M0: Workspace Foundation & Scaffolding

> **Author:** git-planner-agent · **Date:** 2026-10-23 · **Status:** Final  
> **Base Branch:** `main` (or active iteration branch) · **Convention Source:** `_documentation/planning/conventions.md`  
> **Target Release Tag:** `v0.1.0-alpha.1` · **Derived Version Impact:** Pre-release (`0.0.0` → `0.1.0-alpha.1`)  

```mermaid
graph TD
    BASE["Base Branch: main"] --> B1["feat/s0-1-monorepo-scaffold"]
    BASE --> B2["feat/s0-2-shared-packages"]
    BASE --> B3["feat/s0-3-toolchain-scripts"]
    
    B1 --> M1["Merge S0.1 (Squash)"]
    B2 --> M2["Merge S0.2 (Squash)"]
    B3 --> M3["Merge S0.3 (Squash)"]
    
    M3 --> TAG["Annotated Tag: v0.1.0-alpha.1<br/>(deployment-agent at CP5)"]

    classDef blue fill:#E8F0FE,stroke:#4285F4,stroke-width:1.5px,color:#174EA6;
    classDef green fill:#E6F4EA,stroke:#34A853,stroke-width:1.5px,color:#137333;
    classDef amber fill:#FEF7E0,stroke:#FBBC04,stroke-width:1.5px,color:#B06000;

    class BASE,TAG amber;
    class B1,B2,B3 blue;
    class M1,M2,M3 green;
```

---

## 1. Branch Topology

| Story ID | Branch Name | Base Branch | Merge Strategy | PR Title | Breaking |
|---|---|---|---|---|:---:|
| **S0.1** | `feat/s0-1-monorepo-scaffold` | `main` | squash | `feat(workspace): turborepo layout and bun toolchain` | no |
| **S0.2** | `feat/s0-2-shared-packages` | `main` | squash | `feat(workspace): shared internal packages @repo/*` | no |
| **S0.3** | `feat/s0-3-toolchain-scripts` | `main` | squash | `feat(workspace): toolchain build and verification scripts` | no |

---

## 2. Commit Sequences

### Story S0.1: Turborepo Monorepo Root Scaffolding
- **Commit 1:** `chore(workspace): initialize root package.json and turbo.json monorepo configuration`
- **Commit 2:** `chore(toolchain): configure bunfig.toml and .gitignore for hermetic builds`

### Story S0.2: Internal Shared Packages Foundation
- **Commit 1:** `feat(config): establish shared strict tsconfig presets in packages/config`
- **Commit 2:** `feat(contracts): scaffold @repo/contracts with rfc9457 error types`
- **Commit 3:** `feat(db): stub @repo/db package for kysely schemas`
- **Commit 4:** `feat(ui): stub @repo/ui shared component package`

### Story S0.3: Toolchain Scripts, Strict Typecheck & Verification
- **Commit 1:** `chore(scripts): configure root build, typecheck, lint, and clean npm/bun scripts`
- **Commit 2:** `test(workspace): add automated verification test for monorepo package layout`

---

## 3. Release Tag Specifications

- **Tag Name:** `v0.1.0-alpha.1`
- **Tag Type:** Annotated (`git tag -a v0.1.0-alpha.1 -m "..."`)
- **Sign-off:** Approved by `pm-agent` upon clean Gate G6 verification.
