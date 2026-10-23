# Agent Stage Handoff Document — Stage 4 Sprint Breakdown to Clean-Session Implementation

> **Handoff ID:** `handoff-007-sprint-to-developer`  
> **From:** `sprint-agent` (Tactical Story Decomposer & Sprint Governor)  
> **To:** `developer-agent` (Downstream Clean-Session Builder)  
> **Timestamp:** 2026-10-23T11:58:00Z  
> **Workflow ID:** `wf-contextual-001` · **Delivery Mode:** Balanced · **Target Maturity:** MVP  
> **Milestone:** M1 — Developer Golden Path & Core Authentication (`v0.1.0`)  

---

## 1. Handoff Field Block

```text
From -> To: sprint-agent → developer-agent
Objective: Implement Milestone M1 in clean developer sessions strictly bound to frozen Change Matrices for Stories S1.1, S1.2, S1.3, and S1.4.
Status: READY_FOR_HANDOFF
Risk tier: MEDIUM
Accepted criteria: Sprint board authored at m1-developer-golden-path/sprint-status.yaml decomposing EPIC-001 into 4 atomic, single-session stories; each story carries frozen Change Matrix (new_files, allowed_files, forbidden_files), verification scenarios, and observability hooks; Two-Floor boundary strictly enforced; individual story cards created in m1-developer-golden-path/stories/.
Artifacts:
  - _documentation/planning/milestones/m1-developer-golden-path/sprint-status.yaml (final)
  - _documentation/planning/milestones/m1-developer-golden-path/stories/story-s1.1-local-infrastructure-and-config.md (final)
  - _documentation/planning/milestones/m1-developer-golden-path/stories/story-s1.2-developer-doctor-diagnostic.md (final)
  - _documentation/planning/milestones/m1-developer-golden-path/stories/story-s1.3-kysely-relational-persistence-and-migrations.md (final)
  - _documentation/planning/milestones/m1-developer-golden-path/stories/story-s1.4-clerk-auth-and-edge-middleware.md (final)
Dependencies and risks:
  - Docker daemon (Docker Desktop or OrbStack) required locally to test compose stack and Layer 2 of dev:doctor.
  - Bun workspace lockfile must remain immutable during package installations.
Assumptions made:
  - Linear dependency DAG: S1.1 (Infra & Config) -> S1.2 (dev:doctor) -> S1.3 (Kysely DB) -> S1.4 (Clerk Auth & Middleware).
  - All unit test files are placed under tests/ following monorepo conventions.
Open issues: None blocking.
Verification:
  - Story Atomicity: All 4 stories verified for single-session scope and bounded file count -> PASS
  - Two-Floor Boundary: No first-floor packages import next/server; root files restricted to package.json and config -> PASS
  - Dependency DAG: Verified linear DAG (S1.1 -> S1.2 -> S1.3 -> S1.4) with zero circular edges -> PASS
Resume condition: developer-agent starts implementation with Story S1.1 (Containerized Local Stack & Config).
Documentation impact:
  - _documentation/planning/milestones/m1-developer-golden-path/sprint-status.yaml — CREATED
  - _documentation/planning/milestones/m1-developer-golden-path/stories/story-s1.1-local-infrastructure-and-config.md — CREATED
  - _documentation/planning/milestones/m1-developer-golden-path/stories/story-s1.2-developer-doctor-diagnostic.md — CREATED
  - _documentation/planning/milestones/m1-developer-golden-path/stories/story-s1.3-kysely-relational-persistence-and-migrations.md — CREATED
  - _documentation/planning/milestones/m1-developer-golden-path/stories/story-s1.4-clerk-auth-and-edge-middleware.md — CREATED
  - _documentation/system/workflow-context.yaml — UPDATED
  - _documentation/index.md — UPDATED
```

---

## 2. Story Summary Matrix

| Story ID | Title | Scope / Packages | New Files | Verification Command |
|---|---|---|---|---|
| **S1.1** | Containerized Local Stack & Config | `infra/compose.yaml`, `@repo/config`, `.env.example` | 4 | `bun test tests/infra-compose.test.ts` |
| **S1.2** | 8-Layer Developer Diagnostic Suite | `dev:doctor`, `@repo/config/src/doctor/` | 5 | `bun test tests/dev-doctor.test.ts` |
| **S1.3** | Kysely Relational Persistence & Migrations | `@repo/db` (schemas, client, migrator) | 4 | `bun test tests/database-persistence.test.ts` |
| **S1.4** | Clerk Auth Module & Edge Middleware | `@repo/auth`, offline RS256 JWKS verifier, 401 guard | 8 | `bun test tests/auth-perimeter.test.ts` |

---
*Sealed by sprint-agent for Milestone M1 implementation readiness.*
