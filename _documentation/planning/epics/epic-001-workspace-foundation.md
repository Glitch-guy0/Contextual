---
doc_class: canonical
owner: pm-agent
milestone: M1
status: planned
created: 2026-10-23
last_verified: 2026-10-23
review_cadence_days: 90
code_refs: []
related:
  - _documentation/planning/prd.md
  - _documentation/planning/conventions.md
supersedes: []
regenerable: false
pinned: false
---

# EPIC-001: Workspace Foundation, Toolchain & Core Authentication

> **Milestone:** M0 & M1 (`v0.1.0`) · **Status:** Planned · **Risk Tier:** LOW  
> **Business Outcome:** Developers can bootstrap a local containerized stack in < 5 minutes, and users can securely authenticate via Clerk OAuth with tenant data isolated across Neon Postgres.  

```mermaid
graph TD
    DEV["Developer / Bootstrap"] --> MONO["Turborepo Monorepo<br/>(@repo/* packages)"]
    DEV --> DOCKER["Docker Compose Stack<br/>(Local Postgres, Redis, Qdrant)"]
    DEV --> DOCTOR["npm run dev:doctor<br/>(8-layer health check < 5m)"]
    USER["User / Login"] --> CLERK["Clerk OAuth (Google/GitHub)<br/>(RS256 JWT Verification)"]
    CLERK --> NEON["Neon Postgres Schema<br/>(Users, Threads, Messages)"]

    classDef blue fill:#E8F0FE,stroke:#4285F4,stroke-width:1.5px,color:#174EA6;
    classDef green fill:#E6F4EA,stroke:#34A853,stroke-width:1.5px,color:#137333;

    class DEV,USER blue;
    class MONO,DOCKER,DOCTOR,CLERK,NEON green;
```

## 1. Scope
- Turborepo monorepo structure with `@repo/contracts`, `@repo/config`, `@repo/db`, `@repo/ui`.
- Bun toolchain configuration and Node 22 LTS runtime compatibility (`ADR-0002`).
- Containerized local stack (`infra/compose.yaml`) with Redis, Postgres, and Qdrant.
- `npm run dev:doctor` diagnostic script running in < 5 minutes (`NFR-010`).
- Clerk authentication integration supporting Google and GitHub OAuth (`FR-001`).
- Multi-tenant session verification middleware rejecting unauthenticated requests with HTTP 401 (`FR-003`, `BR-001`).
- Neon Postgres schema migrations for user accounts, conversation threads, and messages (`FR-002`).

## 2. Out of Scope
- Credit debiting or rate limiting (owned by `EPIC-002`).
- Document ingestion or vector storage (owned by `EPIC-003`).

## 3. Requirements Covered
- `FR-001`: Social OAuth Authentication
- `FR-002`: Conversation Thread Persistence
- `FR-003`: Multi-Tenant Session Isolation
- `FR-012`: Local Developer Setup & dev:doctor
- `FR-021`: Turborepo Monorepo Layout
- `NFR-006`: Auth Verification (100% 401 rejection on invalid JWT)
- `NFR-010`: Developer Bootstrap SLA (< 5 minutes)

## 4. Acceptance Criteria
1. `bun run build` succeeds across all monorepo packages with zero type errors.
2. `npm run dev:doctor` checks 8 health layers and passes with 100% green status.
3. Protected endpoint `/api/v1/threads` returns HTTP 401 when called without a valid Clerk JWT.
4. Authenticated request creates thread row in Neon Postgres tagged with `user_id`.
