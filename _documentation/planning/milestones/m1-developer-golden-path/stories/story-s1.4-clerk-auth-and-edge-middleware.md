---
id: S1.4
epic: EPIC-001
milestone: M1
target_version: v0.1.0
status: not-started
owner: developer-agent
---

# Story S1.4: Core Authentication Module (@repo/auth), JWKS Offline Token Verification & Edge Middleware Guard

## Outcome
The project establishes the multi-tenant security perimeter by creating the `@repo/auth` module. It verifies Clerk OAuth RS256 JWT tokens offline via cached public JWKS keys, injects typed `TenantContext` (`userId`, `sessionId`, `claims`) into requests, and enforces strict HTTP 401 RFC 9457 Problem Details rejection on unauthenticated calls to `/api/v1/*` routes (`FR-001`, `FR-003`, `NFR-006`, `BR-001`, `BR-003`).

## Change Matrix
- **`new_files`:**
  - `packages/auth/package.json`
  - `packages/auth/tsconfig.json`
  - `packages/auth/src/index.ts`
  - `packages/auth/src/jwks.ts`
  - `packages/auth/src/verifier.ts`
  - `packages/auth/src/context.ts`
  - `packages/auth/src/middleware.ts`
  - `tests/auth-perimeter.test.ts`
- **`allowed_files`:**
  - `package.json`
- **`forbidden_files`:**
  - `packages/db/**`
  - `packages/ui/**`
  - `packages/config/**`
  - `apps/**`

## Acceptance Criteria
1. `packages/auth/package.json` configures `@repo/auth` workspace package with `@clerk/backend` and `@repo/contracts` peer dependencies.
2. `packages/auth/src/jwks.ts` fetches and caches Clerk JWKS public keys in memory with a 1-hour TTL and stale-while-revalidate strategy.
3. `packages/auth/src/verifier.ts` validates RS256 cryptographic signatures, `exp`, `nbf`, and `iss` claims offline in < 2 ms.
4. `packages/auth/src/middleware.ts` guards protected `/api/v1/*` endpoints:
   - Returns RFC 9457 HTTP 401 `application/problem+json` when `Authorization: Bearer <token>` is missing or invalid.
   - Extracts payload and injects `TenantContext` headers (`x-tenant-user-id`, `x-tenant-session-id`) on successful verification.

## Verification
- **Command:** `bun test tests/auth-perimeter.test.ts`
- **Expected:** All 4 auth verification scenarios pass with 0 failures.
