---
doc_class: canonical
owner: sprint-agent
milestone: GA
story: SGA.5
status: ready-for-dev
risk_tier: MEDIUM
created: 2026-10-27
last_verified: 2026-10-27
related:
  - _documentation/planning/milestones/ga-production-release/sprint-status.yaml
  - _documentation/planning/milestones/ga-production-release/milestone.md
  - _documentation/planning/architecture/05-ga-general-availability-production-release.md
supersedes: []
regenerable: false
pinned: false
---

# SGA.5 — Annotated Git Release Tagging Automation Script & Checkpoint 5 Governance Assertions

> **Work Unit:** WU-GA-5 · **Effort:** 3 · **Priority:** p0 · **Risk Tier:** MEDIUM  
> **Owner:** `developer-agent` · **Depends on:** `SGA.4`  

```mermaid
graph TD
    CLI["scripts/cut-release-tag.ts"] --> PRE1["1. Full Test Pass<br/>bun test (339+ pass, 0 fail)"]
    CLI --> PRE2["2. Strict Typecheck<br/>bun run typecheck (11/11 clean)"]
    CLI --> PRE3["3. Monorepo Build<br/>bun run build (11/11 clean)"]
    CLI --> PRE4["4. Git Working Tree<br/>git status --porcelain clean"]
    CLI --> PRE5["5. PM Approval Record<br/>pm-approval.md exists & APPROVED"]
    PRE1 & PRE2 & PRE3 & PRE4 & PRE5 --> CUT["Create Annotated Tag<br/>git tag -a v1.0.0 -m ..."]
    CUT --> TEST["tests/deployment/<br/>release-tag.test.ts"]

    classDef blue fill:#E8F0FE,stroke:#4285F4,stroke-width:1.5px,color:#174EA6;
    classDef green fill:#E6F4EA,stroke:#34A853,stroke-width:1.5px,color:#137333;
    class CLI blue;
    class PRE1,PRE2,PRE3,PRE4,PRE5,CUT,TEST green;
```

---

## 1. Goal & Context

Implement the release automation script `scripts/cut-release-tag.ts` to govern the formal creation of the annotated Git tag `v1.0.0` at Checkpoint 5. The script enforces 5 mandatory pre-flight invariant assertions: full monorepo test pass, strict TypeScript compilation, monorepo build success, clean git working tree, and presence of an unconditional PM approval artifact. Provide support for `--dry-run` to enable automated verification without altering git repository history. Author `tests/deployment/release-tag.test.ts` to validate release automation logic.

---

## 2. Acceptance Criteria

1. Implement `scripts/cut-release-tag.ts`:
   - Validates target version (defaults to `v1.0.0`).
   - Executes pre-flight check 1: verifies `bun test` passes with 0 failures.
   - Executes pre-flight check 2: verifies `bun run typecheck` reports 0 errors.
   - Executes pre-flight check 3: verifies `bun run build` compiles cleanly.
   - Executes pre-flight check 4: verifies working tree is clean (`git status --porcelain`).
   - Executes pre-flight check 5: verifies `_documentation/planning/milestones/ga-production-release/pm-approval.md` contains `APPROVED FOR IMPLEMENTATION`.
   - Formulates annotated release message with PM & Deployment signoffs, commit SHA, and milestone summary.
   - Respects `--dry-run` flag: outputs release message and status without calling `git tag`.
2. Author `tests/deployment/release-tag.test.ts`:
   - Validates script exports invariant verification helpers.
   - Asserts dry-run execution succeeds when preconditions are met.
   - Asserts script rejects execution when any precondition check fails.
   - Validates release message format against standard template.

---

## 3. Change Matrix (frozen)

| Class | Paths |
|---|---|
| **new_files** | `scripts/cut-release-tag.ts`, `tests/deployment/release-tag.test.ts` |
| **allowed_files** | `scripts/**`, `tests/deployment/**` |
| **forbidden_files** | `packages/**`, `.github/**`, `tests/ci/**`, `tests/e2e/**`, `tests/documentation/**`, `tests/benchmarks/**`, `tests/reasoning/**`, `tests/workspace/**`, `tests/ui/**`, `infra/**`, `apps/**`, `_documentation/**`, `package.json`, `turbo.json`, `bunfig.toml` |

---

## 4. Verification Hook

```bash
bun test tests/deployment/release-tag.test.ts && bun test packages/contracts/tests/errors.test.ts && bun run typecheck
```

---

## 5. Rollout / Compatibility

Operational automation script only. Safe for execution in developer sessions and CI pipelines.
