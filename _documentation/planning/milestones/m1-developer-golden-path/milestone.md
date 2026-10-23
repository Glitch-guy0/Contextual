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
  - _documentation/index.md
  - _documentation/project-details.md
  - _documentation/planning/prd.md
  - _documentation/planning/conventions.md
  - _documentation/planning/milestones/overview.md
  - _documentation/planning/milestones/milestone-status.yaml
  - _documentation/planning/epics/epic-001-workspace-foundation.md
supersedes: []
regenerable: false
pinned: false
---

# Milestone Charter — M1: Developer Golden Path & Core Authentication (v0.1.0)

> **Status:** Planned (Follows M0 Workspace Foundation)  
> **Author:** pm-agent (Stage 2 Owner) · **Date:** 2026-10-23  
> **Target Version:** `v0.1.0` · **Risk Tier:** MEDIUM  
> **Grounding:** `project-brief.md` (FR-001..FR-003, FR-012, FR-022, FR-034; BR-001..BR-004; NFR-006, NFR-010)  

```mermaid
graph TD
    DEV["Developer Workstation"] --> DOCKER["Docker Compose Stack<br/>(infra/compose.yaml: Postgres 16, Redis 7)"]
    DEV --> DOCTOR["dev:doctor Diagnostic<br/>(8-Layer Diagnostic Health Probe)"]
    USER["User / Browser Client"] --> CLERK["Clerk Identity Provider<br/>(Social OAuth RS256 JWT)"]
    CLERK --> MID["Auth Middleware<br/>(Extracts & Validates userId)"]
    MID -->|Valid JWT| NEON["Neon Postgres Schema<br/>(Users, Threads, Notebooks)"]
    MID -->|Missing / Invalid JWT| E401["HTTP 401 Unauthorized<br/>(RFC 9457 Problem Details)"]

    classDef blue fill:#E8F0FE,stroke:#4285F4,stroke-width:1.5px,color:#174EA6;
    classDef green fill:#E6F4EA,stroke:#34A853,stroke-width:1.5px,color:#137333;
    classDef amber fill:#FEF7E0,stroke:#FBBC04,stroke-width:1.5px,color:#B06000;

    class DEV,USER blue;
    class DOCKER,DOCTOR,CLERK,MID,NEON green;
    class E401 amber;
```

---

## 1. Executive Summary & Outcome

Milestone M1 establishes the local developer runtime and core security perimeter (`v0.1.0`). It delivers the containerized developer stack (`infra/compose.yaml`), the 8-layer `dev:doctor` diagnostic suite ensuring a clean local boot in < 5 minutes (`NFR-010`), Clerk OAuth JWT authentication middleware, and initial Kysely database schema migrations for Neon Postgres covering user identities, conversation threads, and notebooks.

---

## 2. In Scope

- **Local Infrastructure Orchestration:**
  - `infra/compose.yaml` spinning up local PostgreSQL 16 and Redis 7 for zero-cloud-credential offline development.
  - Environment variable templates (`.env.example`) with strict Zod validation.
- **Developer Diagnostic Golden Path (`FR-012`):**
  - `npm run dev:doctor`: 8-layer diagnostic script checking Node/Bun version, Docker daemon, database connectivity, Redis ping, environment variable presence, ports, and monorepo build health in < 5 minutes (`NFR-010`).
- **Core Authentication & Security Perimeter (`FR-001`, `FR-003`, `[Q-002]`):**
  - Clerk OAuth integration strictly restricted to Google and GitHub social logins (`[Q-002]`), eliminating email magic links, email delivery services, and password credentials.
  - Edge-compatible auth middleware verifying RS256 JWT signatures offline via Clerk public JWKS keys.
  - Multi-tenant isolation: 100% of protected `/api/v1/*` endpoints reject unauthenticated calls with HTTP 401 Problem Details (`NFR-006`, `BR-001`).
- **Persistence Foundation (`FR-002`, `FR-022`):**
  - Neon Postgres schema migrations via Kysely (`users`, `conversation_threads`, `notebooks`).
  - Strict foreign key constraints and tenant indexes on `user_id` (`BR-002`).

---

## 3. Out of Scope

- Credit debiting or rate limiting (owned by Milestone M2).
- Document ingestion, text parsing, or vector embeddings (owned by Milestone M3).
- LLM reasoning, HyDE summaries, or streaming generation (owned by Milestone M5).

---

## 4. Acceptance Criteria & Gate Status

| ID | Criterion | Evidence Target | Gate |
|:---:|---|---|:---:|
| **AC-1.1** | Containerized Local Stack | `docker compose -f infra/compose.yaml up -d` boots healthy Postgres and Redis in < 30s | G5 |
| **AC-1.2** | 8-Layer Doctor Diagnostic | `npm run dev:doctor` runs all 8 checks and exits 0 in < 5 minutes | G5 |
| **AC-1.3** | Strict 401 Rejection | 100% of protected routes return HTTP 401 with RFC 9457 body when called without Bearer token | G6 |
| **AC-1.4** | Multi-Tenant DB Schema | Kysely migrations apply cleanly; tenant queries strictly filter on `user_id` | G6 |

---

## 5. Next Steps & Pipeline Handoff

1. Milestone M0 must pass Gate G6 before M1 implementation commences.
2. `sprint-agent` will author `m1-developer-golden-path/sprint-status.yaml` and story cards upon M0 completion.
3. Hands off to `developer-agent` for container and auth middleware construction.
