---
doc_class: canonical
owner: sprint-agent
milestone: GA
story: SGA.1
status: ready-for-dev
risk_tier: LOW
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

# SGA.1 — GitHub Actions CI/CD Pipeline Workflow & Automated Pre-Merge Verification Suite

> **Work Unit:** WU-GA-1 · **Effort:** 3 · **Priority:** p0 · **Risk Tier:** LOW  
> **Owner:** `developer-agent` · **Depends on:** — (sprint entry point)  

```mermaid
graph TD
    PR["Pull Request / Push to main"] --> CHECKOUT["actions/checkout@v4<br/>Fetch repository code"]
    CHECKOUT --> BUN["oven-sh/setup-bun@v2<br/>Setup Bun runtime"]
    BUN --> INSTALL["bun install --frozen-lockfile<br/>Deterministic dependencies"]
    INSTALL --> LINT["bun run lint<br/>Zero ESLint warnings"]
    LINT --> TYPE["bun run typecheck<br/>11/11 packages typecheck clean"]
    TYPE --> TEST["bun test<br/>Unit, integration, benchmark suites"]
    TEST --> ERRORS["RFC 9457 Error Integrity<br/>bun test packages/contracts/tests/errors.test.ts"]
    ERRORS --> BUILD["bun run build<br/>11/11 packages compile cleanly"]

    classDef blue fill:#E8F0FE,stroke:#4285F4,stroke-width:1.5px,color:#174EA6;
    classDef green fill:#E6F4EA,stroke:#34A853,stroke-width:1.5px,color:#137333;
    class PR,CHECKOUT,BUN,INSTALL blue;
    class LINT,TYPE,TEST,ERRORS,BUILD green;
```

---

## 1. Goal & Context

Establish the continuous integration workflow `.github/workflows/ci.yml` to automate quality gate verification (Gate G5 / G6) on every pull request and push to the `main` branch. The pipeline executes linting, strict TypeScript typechecking, test suites, RFC 9457 error catalogue verification, and monorepo compilation using the official Bun action (`oven-sh/setup-bun@v2`). Author `tests/ci/ci-workflow.test.ts` to validate the workflow configuration file integrity.

---

## 2. Acceptance Criteria

1. Create `.github/workflows/ci.yml` defining the CI job `verify` running on `ubuntu-latest`.
2. Configure triggers on push to `main` and pull requests targeting `main`.
3. Install dependencies via `bun install --frozen-lockfile` ensuring deterministic reproducibility.
4. Run strict sequential quality checks:
   - `bun run lint`
   - `bun run typecheck`
   - `bun test`
   - `bun test packages/contracts/tests/errors.test.ts` (explicit error catalogue assertion)
   - `bun run build`
5. Author `tests/ci/ci-workflow.test.ts` asserting:
   - Workflow file exists at `.github/workflows/ci.yml`.
   - YAML syntax is valid and parses correctly.
   - Triggers include `push` and `pull_request` on `main`.
   - All 5 required execution steps are present and properly ordered.
   - Error catalogue test is explicitly mandated.
6. Verify workflow does not require external cloud secrets for standard PR test runs.

---

## 3. Change Matrix (frozen)

| Class | Paths |
|---|---|
| **new_files** | `.github/workflows/ci.yml`, `tests/ci/ci-workflow.test.ts` |
| **allowed_files** | `.github/workflows/**`, `tests/ci/**` |
| **forbidden_files** | `packages/**`, `tests/benchmarks/**`, `tests/reasoning/**`, `tests/workspace/**`, `tests/ui/**`, `tests/memory/**`, `tests/observability/**`, `infra/**`, `apps/**`, `_documentation/**`, `package.json`, `turbo.json`, `bunfig.toml` |

---

## 4. Verification Hook

```bash
bun test tests/ci/ci-workflow.test.ts && bun test packages/contracts/tests/errors.test.ts && bun run typecheck
```

---

## 5. Rollout / Compatibility

Non-breaking CI automation. Adds GitHub Actions configuration without altering any existing runtime packages or public interfaces.
