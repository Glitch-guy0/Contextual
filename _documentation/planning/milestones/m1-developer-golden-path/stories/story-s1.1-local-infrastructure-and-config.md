---
id: S1.1
epic: EPIC-001
milestone: M1
target_version: v0.1.0
status: not-started
owner: developer-agent
---

# Story S1.1: Containerized Local Stack (infra/compose.yaml) & Strict Environment Configuration

## Outcome
The project provides a turnkey, zero-cloud-credential offline developer stack running PostgreSQL 16 and Redis 7 via Docker Compose (`infra/compose.yaml`), alongside strict Zod environment variable parsing in `@repo/config` and a documented `.env.example` file (`FR-012`, `ADR-0002`, `NFR-010`).

## Change Matrix
- **`new_files`:**
  - `infra/compose.yaml`
  - `.env.example`
  - `packages/config/src/env.ts`
  - `tests/infra-compose.test.ts`
- **`allowed_files`:**
  - `packages/config/package.json`
  - `packages/config/src/index.ts`
- **`forbidden_files`:**
  - `packages/auth/**`
  - `packages/db/**`
  - `packages/ui/**`
  - `apps/**`

## Acceptance Criteria
1. `infra/compose.yaml` specifies hardened, scale-down Alpine images: `postgres:16-alpine` (port 5432, database `contextual_dev`) and `redis:7-alpine` (port 6379) with healthcheck commands.
2. Root `.env.example` defines all required runtime, database, cache, and Clerk environment variables with sensible local defaults and placeholders.
3. `packages/config/src/env.ts` implements `validateEnv()` with a strict Zod schema enforcing typing, default fallbacks, and port integers.
4. `tests/infra-compose.test.ts` verifies compose schema syntax and configuration validation logic.

## Verification
- **Command:** `bun test tests/infra-compose.test.ts`
- **Expected:** All 3 scenarios pass with 0 failures.
