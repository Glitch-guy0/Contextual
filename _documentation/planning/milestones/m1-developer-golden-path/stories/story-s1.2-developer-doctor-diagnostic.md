---
id: S1.2
epic: EPIC-001
milestone: M1
target_version: v0.1.0
status: not-started
owner: developer-agent
---

# Story S1.2: 8-Layer Developer Diagnostic Suite (npm run dev:doctor)

## Outcome
The project equips developers with a comprehensive 8-layer diagnostic health probe executable via `npm run dev:doctor`, verifying local environment health, container runtimes, network ports, database connectivity, and workspace build integrity in < 5 minutes (`FR-012`, `NFR-010`).

## Change Matrix
- **`new_files`:**
  - `packages/config/src/doctor/index.ts`
  - `packages/config/src/doctor/types.ts`
  - `packages/config/src/doctor/layers.ts`
  - `packages/config/src/doctor/cli.ts`
  - `tests/dev-doctor.test.ts`
- **`allowed_files`:**
  - `package.json`
  - `packages/config/package.json`
  - `packages/config/src/index.ts`
- **`forbidden_files`:**
  - `packages/auth/**`
  - `packages/db/**`
  - `packages/ui/**`
  - `apps/**`

## Acceptance Criteria
1. `packages/config/src/doctor/index.ts` implements the sequential 8-layer probe runner returning structured layer results with elapsed durations.
2. Layer 1 verifies Node.js (`>= 22.0.0`) or Bun (`>= 1.1.0`) versions.
3. Layer 2 checks Docker daemon reachability.
4. Layer 3 evaluates environment variables against the Zod config schema.
5. Layer 4 & 5 probe PostgreSQL and Redis connectivity pings.
6. Layer 6 asserts availability of ports 3000, 5432, and 6379.
7. Layer 7 & 8 verify monorepo package symlinks and Turborepo DAG integrity.
8. Root `package.json` wires `"dev:doctor": "bun run packages/config/src/doctor/cli.ts"`.

## Verification
- **Command:** `bun test tests/dev-doctor.test.ts`
- **Expected:** All 4 diagnostic layer scenarios pass with 0 failures.
