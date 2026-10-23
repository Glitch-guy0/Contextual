---
id: S0.3
epic: EPIC-001
milestone: M0
target_version: v0.1.0-alpha.1
status: not-started
owner: developer-agent
---

# Story S0.3: Toolchain Scripts, Strict Typecheck & Monorepo Build Pipeline

## Outcome
The monorepo build, lint, and typecheck scripts are fully operational and validated across all packages. Turborepo pipeline caching is active, verifying that `bun run build` completes with zero circular dependencies and `bun run typecheck` passes with zero errors under strict mode (`NFR-010`, `AC-0.3`, `AC-0.4`).

## Change Matrix
- **`new_files`:**
  - `tests/monorepo-build.test.ts`
- **`allowed_files`:**
  - `package.json`
  - `turbo.json`
  - `packages/contracts/package.json`
  - `packages/config/package.json`
  - `packages/db/package.json`
  - `packages/ui/package.json`
- **`forbidden_files`:**
  - `apps/**`
  - `infra/**`

## Acceptance Criteria
1. Root scripts configured in `package.json`: `"build": "turbo run build"`, `"typecheck": "turbo run typecheck"`, `"lint": "turbo run lint"`, `"clean": "turbo run clean"`.
2. Running `bun run build` builds all internal packages in dependency topological order in < 15 seconds.
3. Running `bun run typecheck` succeeds across all workspace packages with 0 TypeScript errors.
4. Second execution of `bun run build` achieves Turborepo `FULL TURBO` cache hits.

## Verification
- **Command:** `bun run build && bun run typecheck`
- **Expected:** All package builds complete cleanly; 0 type errors.
