# Party-Mode Collaboration Log — End-to-End Milestone Planning & Architecture Alignment

## Session Meta
- **Date:** 2026-10-23T16:05:00.000Z
- **Topic / Feature:** End-to-End Milestone Architecture, Delivery Plan & Sprint Decomposition (M0 through GA)
- **Mode:** Structural
- **Session Chairs:** `pm-agent` (Stage 2 Owner) & `architect-agent` (Stage 3 Owner)

## Participants
- `pm-agent` (Stage 2 Owner: Product roadmap, requirements hierarchy, PRD governance, SemVer mapping)
- `architect-agent` (Stage 3 Owner: C4 topology, OpenAPI 3.1 contracts, database schema, serverless architecture)
- `test-agent` (Verification Lead: 7-level verification pyramid, truth tables, quality gates G1–G6)
- `sprint-agent` (Sprint Governor & Board Writer: Story decomposition, Change Matrices)
- `data-architect` (Persistence Authority: Neon Postgres Kysely schema, Upstash Vector indexing, retention sweeper)
- `security-architect` (Security Authority: Clerk RS256 JWT validation, tenant isolation, redaction pipelines)
- `deployment-agent` (Stage 5 Owner: Vercel Hobby serverless topology, GitHub Actions CI/CD, $0.00 ceiling)
- `failure-mode-specialist` (Fault Tolerance Lead: Groq circuit breaking, S3 transient deletion, credit rollback)
- `observability-specialist` (Telemetry Lead: Structured JSON Pino logging, W3C traceparent, Better Stack)
- `devprod-specialist` (Developer Experience Lead: Turborepo, Bun toolchain, dev:doctor 8-layer diagnostic)

---

## Agenda & Discussion Rounds

### Round 1: Scope, Architecture Alignment & Milestone Spine (M0 through GA)
- **PM Agent:**
  - Contextual's delivery spine spans 11 milestones from M0 (`v0.1.0-alpha.1`) to GA (`v1.0.0`).
  - Previously reconciled milestone drift confirmed zero implementation code exists in the workspace. M0 (Workspace Foundation) is our active priority for immediate sprint execution.
  - Every milestone must deliver a standalone, demoable, testable increment strictly within the $0.00/month infrastructure ceiling (`NFR-016`).
  - Milestone charters (`milestone.md`) must be authored for all remaining milestones (M1 through GA) to establish unequivocal boundaries.
- **Architect Agent:**
  - System architecture has been updated and solidified in ADR-0004 ("Unified Upstash Serverless Ecosystem & Groq Fallback"):
    1. Upstash Vector replaces Qdrant Cloud Free — provides serverless REST with zero 7-day idle suspension, deprecating the fragile 48h keepalive probe.
    2. Upstash QStash replaces BullMQ — native HTTP webhook task queue and cron engine ideal for Vercel Hobby serverless without persistent worker processes.
    3. Google AI Studio (`gemini-embedding-001`) + Gemini Flash as primary inference, backed by Groq Llama-3.3-70B as an ultra-fast secondary fallback circuit breaker (1,000 RPD vs Cloudflare's 18 RPD).
    4. In-process Mem0 backed by Upstash Redis and Upstash Vector replaces standalone Cloudflare Workers.
- **Sprint Agent:**
  - Milestone M0 is ready for sprint decomposition. We need atomic stories with frozen Change Matrices:
    - Story S0.1: Monorepo Scaffolding & Bun Toolchain (`turbo.json`, `package.json`, `bunfig.toml`).
    - Story S0.2: Shared Internal Packages (`@repo/config`, `@repo/contracts`, `@repo/db`, `@repo/ui`).
    - Story S0.3: Workspace Scripts, Strict Typechecking & CI Validation (`bun run build`, `bun run typecheck`, `bun run lint`).
- **Test Agent:**
  - Enforce the 7-level verification pyramid across all milestones. M0 must prove clean hermetic builds and zero type errors. Subsequent milestones must verify Lua atomic credit debits (Level 2), mock provider resilience (Level 3), and k6 50 CCU concurrency (Level 6).
- **Specialists (Security, Data, Deployment, DevProd):**
  - DevProd: M0 establishes the TypeScript strict baseline so M1 can layer `infra/compose.yaml` and `dev:doctor`.
  - Security: Tenant filtering (`user_id`) must be an invariant on all database queries and vector searches (`BR-002`).
  - Data: Schema definitions in `@repo/db` must use Kysely with type generation for Neon Postgres.
  - Deployment: Vercel Hobby serverless limits function execution to 10s. Heavy ingestion must be asynchronous via QStash.

---

### Round 2: Trade-off Analysis & Contradiction Resolution

#### Trade-off 1: Landing Page Architecture (Milestone M8)
- **Option A (Next.js 15 Unified App):** Integrate the marketing landing page directly inside `apps/platform` (or `apps/web`) using Next.js 15 App Router.
  - *Pros:* Single deployment pipeline on Vercel Hobby, shared UI component library (`@repo/ui`), single domain routing, zero CORS friction.
  - *Cons:* Slightly larger client bundle than pure static HTML; uses serverless compute quota.
- **Option B (Standalone Astro SSG):** Build `apps/landing` as a dedicated Astro static site.
  - *Pros:* 100% zero-JS baseline HTML/CSS, maximum Lighthouse score (99+), zero serverless function execution.
  - *Cons:* Separate Vercel project deployment (or reverse proxy routing setup), duplicated UI primitives.
- **Party Consensus:** While Astro provides extreme static speed, Next.js 15 SSG (`output: 'export'` or statically generated routes) provides identical Lighthouse scores while avoiding multiple Vercel project deployments. However, as this impacts product packaging and user preference, escalate to `questionnaire.yaml` (Q-1).

#### Trade-off 2: Clerk Authentication Methods (Milestone M1)
- **Option A (Strict Social OAuth Google & GitHub):** Only allow Google and GitHub OAuth.
  - *Pros:* Minimal attack surface, zero password reset or email delivery complexity, matches developer target audience.
  - *Cons:* Non-developer evaluators without GitHub/Google cannot sign in.
- **Option B (Social OAuth + Passwordless Email Magic Link):** Allow Google, GitHub, and email magic links via Clerk.
  - *Pros:* Accessible to all users; Clerk handles email deliverability natively within free tier.
  - *Cons:* Slightly broader user registration surface.
- **Party Consensus:** Social OAuth meets all FR-001 requirements; escalating to `questionnaire.yaml` (Q-2) to let the user confirm preference.

#### Trade-off 3: Local Offline Vector Search Development Mode (Milestones M0 & M1)
- **Option A (In-memory Mock Vector Adapter in `@repo/contracts`):** Fast in-memory cosine similarity mock for tests and offline development.
  - *Pros:* Zero external dependencies, instantaneous test execution (< 5s), zero Docker overhead for vector testing.
  - *Cons:* Does not run full Upstash Vector REST protocol.
- **Option B (Local Containerized Engine in `infra/compose.yaml`):** Run Qdrant/Milvus locally.
  - *Pros:* Real vector engine running locally.
  - *Cons:* Divergent API from Upstash Vector REST endpoints, higher RAM usage on developer machines.
- **Party Consensus:** In-memory mock adapter aligned with `@repo/contracts` interfaces (ADR-0004); escalate to `questionnaire.yaml` (Q-3).

---

### Round 3: Consensus & Sealed Decisions

The round-table participants reached unanimous consensus on the execution sequence:
1. **Charter All Milestones (M0..GA):** Author canonical milestone charters for M1, M3, M4, M5, M6, M7, M8, M9, and GA in `_documentation/planning/milestones/` aligned with ADR-0004.
2. **Decompose Active Milestone M0:** `sprint-agent` authors `m0-workspace-foundation/sprint-status.yaml`, story cards under `stories/`, and `git-plan.md`.
3. **Escalate Unsettled Decisions:** Populate `questionnaire.yaml` with the three identified product and architecture choices for the user.
4. **Update PRD & Architecture:** Record ADR-0004 dated delta in `prd.md` and synchronize `index.md` and `milestone-status.yaml`.

---

## Sealed Decision Register

| Decision ID | Summary | Owner | Sealed State |
|---|---|---|---|
| **D-PTY-01** | Full 11-milestone delivery hierarchy confirmed; M0 is active next sprint | `pm-agent` | Sealed |
| **D-PTY-02** | Upstash Vector, Upstash QStash, and Groq fallback adopted across M3, M5, M7 | `architect-agent` | Sealed |
| **D-PTY-03** | M0 sprint scope decomposed into 3 atomic stories (S0.1, S0.2, S0.3) with frozen Change Matrices | `sprint-agent` | Sealed |
| **D-PTY-04** | 7-level verification pyramid enforced across all milestone acceptance criteria | `test-agent` | Sealed |
| **D-PTY-05** | Three open architectural options escalated to `questionnaire.yaml` (Landing architecture, Auth methods, Local vector mock) | `discovery-agent` | Sealed |

---

## Handoff & Next Steps

1. **`pm-agent`**: Author canonical charters for M1, M3, M4, M5, M6, M7, M8, M9, and GA under `_documentation/planning/milestones/`.
2. **`sprint-agent`**: Author `sprint-status.yaml`, story cards, and `git-plan.md` for active milestone M0.
3. **`architect-agent`**: Confirm component catalog and tech stack alignment with ADR-0004.
4. **`discovery-agent`**: Populate `_documentation/planning/questionnaire.yaml` with open decision items.
5. **`hygiene-agent`**: Synchronize `_documentation/index.md` and `_documentation/planning/milestones/milestone-status.yaml`.
