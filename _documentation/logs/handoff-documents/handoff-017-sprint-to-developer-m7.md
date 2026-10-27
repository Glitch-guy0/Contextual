# Agent Stage Handoff Document — Stage 4 Sprint Breakdown to Clean-Session Implementation

> **Handoff ID:** `handoff-017-sprint-to-developer-m7`  
> **From:** `sprint-agent` (Tactical Story Decomposer & Sprint Governor)  
> **To:** `developer-agent` (Downstream Clean-Session Builder)  
> **Timestamp:** 2026-10-27T10:48:00Z  
> **Workflow ID:** `wf-contextual-001` · **Delivery Mode:** Balanced · **Target Maturity:** MVP  
> **Milestone:** M7 — Autonomous Maintenance Crons & Observability (`v0.7.0`)

---

## 1. Handoff Field Block

```text
From -> To: sprint-agent → developer-agent
Objective: Implement Milestone M7 in clean developer sessions strictly bound to frozen Change Matrices for Stories S7.1, S7.2, S7.3, S7.4, S7.5, and S7.6.
Status: ACCEPTED
Risk tier: HIGH
Accepted criteria: Sprint board authored at m7-maintenance-observability/sprint-status.yaml decomposing EPIC-007 into 6 atomic single-session stories; each story carries a frozen Change Matrix (new_files, allowed_files, forbidden_files), build_vs_buy_ref, tests, observability, a verification hook, and a risk tier; dependency graph verified as a DAG (S7.1 -> S7.2 -> S7.3 -> S7.4 -> S7.5 -> S7.6); story cards created in m7-maintenance-observability/stories/; AC-7.1..AC-7.4 each bound to a story-level test; PM approval granted unconditionally in pm-approval.md.
Artifacts:
  - _documentation/planning/milestones/m7-maintenance-observability/sprint-status.yaml (final)
  - _documentation/planning/milestones/m7-maintenance-observability/stories/story-s7.1-observability-contracts.md (final)
  - _documentation/planning/milestones/m7-maintenance-observability/stories/story-s7.2-pino-logger-and-redactor.md (final)
  - _documentation/planning/milestones/m7-maintenance-observability/stories/story-s7.3-opentelemetry-and-betterstack.md (final)
  - _documentation/planning/milestones/m7-maintenance-observability/stories/story-s7.4-qstash-crons-driver.md (final)
  - _documentation/planning/milestones/m7-maintenance-observability/stories/story-s7.5-retention-cascade-and-tombstones.md (final)
  - _documentation/planning/milestones/m7-maintenance-observability/stories/story-s7.6-e2e-integration-and-benchmarks.md (final)
  - _documentation/planning/architecture/05-m7-autonomous-maintenance-and-observability.md (final)
  - _documentation/planning/milestones/m7-maintenance-observability/pm-approval.md (approved)
  - _documentation/planning/contracts/api-contract.openapi.yaml (UPDATED — /crons/retention-sweep & /crons/reset-credits endpoints)
  - _documentation/planning/contracts/component-catalog.yaml (UPDATED — comp-observability and comp-maintenance components)
  - _documentation/planning/contracts/config-schema.yaml (UPDATED — BETTER_STACK_SOURCE_TOKEN)
Dependencies and risks:
  - Webhook security: QStash webhooks must verify Upstash-Signature to prevent unauthorized execution (BR-025, BR-026).
  - Retention cascade data integrity: Upstash Vector points must be deleted before child relational records are dropped and tombstone is set (BR-039, BR-040).
  - Tombstone protocol: requests to expired notebooks must return HTTP 410 NOTEBOOK_EXPIRED (RFC 9457) with deletion timestamp (BR-044, AC-7.2).
  - Secret redaction: 100% of logs must redact Bearer tokens, Clerk keys, and database URIs to [REDACTED] (NFR-026, AC-7.4).
  - Non-blocking OTLP export: OpenTelemetry export timeouts must be capped at 500ms to prevent stalling request threads.
Assumptions made:
  - Sequential DAG: S7.1 -> S7.2 -> S7.3 -> S7.4 -> S7.5 -> S7.6.
  - No new database migration required: notebooks table already possesses idle_since, deleted_at, and expires_at columns.
  - Closed 17-member RFC 9457 error catalogue remains intact (NOTEBOOK_EXPIRED is member #13).
Open issues: None blocking. Monorepo baseline is 100% green (204/204 pass across 41 files; 10/10 build/typecheck clean).
Verification:
  - Story Atomicity: 6 stories checked for single-session scope and bounded file counts -> PASS
  - Two-Floor Boundary: no root-level file appears in any allowed_files -> PASS
  - Change Matrix Conflicts: no two stories claim the same new_file; forbidden lists do not intersect allowed lists -> PASS
  - Dependency DAG: S7.1 -> S7.2 -> S7.3 -> S7.4 -> S7.5 -> S7.6, zero cycles -> PASS
  - Board YAML parses; 6 stories, 6 story cards present -> PASS
  - Contracts compile: bun test packages/contracts/tests/errors.test.ts -> PASS (5/5 pass, catalogue intact at 17 members)
  - Workspace health: bun test (204/204 pass), bun run build (10/10 pass), bun run typecheck (10/10 pass) -> PASS
Resume condition: developer-agent starts with Story S7.1 inside its Change Matrix.
Documentation impact:
  - _documentation/planning/milestones/m7-maintenance-observability/sprint-status.yaml — CREATED
  - _documentation/planning/milestones/m7-maintenance-observability/stories/* (6 files) — CREATED
  - _documentation/planning/milestones/m7-maintenance-observability/pm-approval.md — CREATED
  - _documentation/planning/architecture/05-m7-autonomous-maintenance-and-observability.md — CREATED
  - _documentation/planning/contracts/api-contract.openapi.yaml — UPDATED (/crons/ endpoints)
  - _documentation/planning/contracts/component-catalog.yaml — UPDATED (comp-observability, comp-maintenance)
  - _documentation/planning/contracts/config-schema.yaml — UPDATED (BETTER_STACK_SOURCE_TOKEN)
  - _documentation/planning/milestones/m7-maintenance-observability/milestone.md — UPDATED (ready-for-implementation, Gate G5 PASS)
  - _documentation/planning/milestones/milestone-status.yaml — UPDATED (M7 ready, Gate G5 PASS)
  - _documentation/logs/party-mode/party-mode-log.md — UPDATED (Session 5, 8 sealed decisions)
  - _documentation/index.md — UPDATED (M7 rows)
```

---

## 2. Story Summary Matrix

| Story | Title | Scope / Packages | New Files | Tier | Verification Command |
|:---:|---|---|:---:|:---:|---|
| **S7.1** | Shared maintenance & observability contracts, DTO types & RFC 9457 catalogue check | `@repo/contracts`, `tests/observability/` | 2 | LOW | `bun test tests/observability/contracts.test.ts && bun test packages/contracts/tests/errors.test.ts && bun run typecheck` |
| **S7.2** | Package scaffolding `@repo/observability`, AsyncLocalStorage context, Pino logger & redactor | `@repo/observability`, `tests/observability/` | 7 | MEDIUM | `bun test tests/observability/logger-redact.test.ts && turbo run build --filter=@repo/observability && turbo run typecheck --filter=@repo/observability` |
| **S7.3** | OpenTelemetry tracing provider, W3C traceparent propagator & Better Stack OTLP export | `@repo/observability`, `tests/observability/` | 3 | MEDIUM | `bun test tests/observability/tracer-telemetry.test.ts && turbo run typecheck --filter=@repo/observability` |
| **S7.4** | QStash webhook receiver with cryptographic signature verification & scheduled crons driver | `@repo/observability`, `tests/observability/` | 3 | HIGH | `bun test tests/observability/qstash-crons.test.ts && turbo run typecheck --filter=@repo/observability` |
| **S7.5** | 7-day retention cascade sweeper, Upstash Vector point purge, Neon Postgres cascade & 30-day tombstones | `@repo/db`, `@repo/observability`, `tests/observability/` | 3 | HIGH | `bun test tests/observability/retention-cascade.test.ts && turbo run typecheck --filter=@repo/observability --filter=@repo/db` |
| **S7.6** | E2E maintenance & observability integration suite, latency/throughput verification & documentation sync | `tests/observability/`, `@repo/observability` | 1 | MEDIUM | `bun test tests/observability/e2e-maintenance-observability.test.ts && bun test && bun run build && bun run typecheck` |

---

## 3. Implementation Sequence & Instructions for Developer

1. Execute stories sequentially in dependency order: `S7.1 → S7.2 → S7.3 → S7.4 → S7.5 → S7.6`.
2. Strictly respect frozen Change Matrices — do not modify files outside each story's `allowed_files`.
3. Never touch root configuration files (Two-Floor Boundary).
4. Run each story's verification hook before reporting completion.
5. `test-agent` will certify story closures upon evidence review.
