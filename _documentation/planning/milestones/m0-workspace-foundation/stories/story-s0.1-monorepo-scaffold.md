---
id: S0.1
epic: EPIC-001
milestone: M0
target_version: v0.1.0-alpha.1
status: not-started
owner: developer-agent
---

# Story S0.1: Turborepo Monorepo Root Scaffolding & Bun Toolchain

## Outcome
The project root is configured as a hermetic Turborepo monorepo governed by the Bun package manager. It establishes workspace boundaries (`apps/*`, `packages/*`), build task pipelines with dependency caching, and clean version control ignore rules (`FR-021`, `ADR-0002`).

## Change Matrix
- **`new_files`:**
  - `package.json`
  - `turbo.json`
  - `bunfig.toml`
  - `.gitignore`
- **`allowed_files`:** []
- **`forbidden_files`:**
  - `apps/**`
  - `packages/**`
  - `infra/**`

## Acceptance Criteria
1. Root `package.json` specifies `"private": true` and defines workspaces `["apps/*", "packages/*"]`.
2. `turbo.json` configures tasks for `build`, `typecheck`, `lint`, and `clean` with proper `dependsOn` (e.g. `^build`) and caching outputs (`dist/**`, `.next/**`).
3. `bunfig.toml` configures lockfile format and runtime options for deterministic installation.
4. `.gitignore` comprehensively ignores `node_modules`, `.turbo`, `.next`, `dist`, `.env*.local`, and OS artifacts.

## Verification
- **Command:** `bun test tests/monorepo-layout.test.ts`
- **Expected:** All 3 layout and config validation scenarios pass with 0 failures.
