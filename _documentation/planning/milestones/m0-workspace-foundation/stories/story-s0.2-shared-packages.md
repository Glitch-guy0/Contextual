---
id: S0.2
epic: EPIC-001
milestone: M0
target_version: v0.1.0-alpha.1
status: not-started
owner: developer-agent
---

# Story S0.2: Internal Shared Packages Foundation (@repo/config, contracts, db, ui)

## Outcome
Four core shared packages (`@repo/config`, `@repo/contracts`, `@repo/db`, `@repo/ui`) are established in `packages/`. They define the internal package boundary contracts, strict TypeScript configurations, RFC 9457 structured error types, and database/UI interface stubs before any downstream application or container code is written (`FR-021`, `CV-001`..`CV-012`).

## Change Matrix
- **`new_files`:**
  - `packages/config/package.json`
  - `packages/config/tsconfig.base.json`
  - `packages/config/tsconfig.node.json`
  - `packages/config/tsconfig.react.json`
  - `packages/contracts/package.json`
  - `packages/contracts/tsconfig.json`
  - `packages/contracts/src/index.ts`
  - `packages/contracts/src/rfc9457.ts`
  - `packages/db/package.json`
  - `packages/db/tsconfig.json`
  - `packages/db/src/index.ts`
  - `packages/db/src/schema.ts`
  - `packages/ui/package.json`
  - `packages/ui/tsconfig.json`
  - `packages/ui/src/index.ts`
- **`allowed_files`:**
  - `package.json`
- **`forbidden_files`:**
  - `apps/**`
  - `infra/**`

## Acceptance Criteria
1. `packages/config` exports reusable `tsconfig` presets (`tsconfig.base.json`, `tsconfig.node.json`, `tsconfig.react.json`) enforcing TypeScript `strict: true`.
2. `packages/contracts` exports standard RFC 9457 Problem Details schema and TypeScript types (`ProblemDocument`, `ValidationError`).
3. `packages/db` defines Kysely schema table interfaces stubbed for `users`, `threads`, and `notebooks`.
4. `packages/ui` exports core design token constants and base component interface stubs.
5. All packages use `@repo/*` namespace and resolve cleanly as internal workspace dependencies.

## Verification
- **Command:** `bun test tests/package-exports.test.ts`
- **Expected:** All 4 package export scenarios pass with 0 failures.
