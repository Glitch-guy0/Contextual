# Changelog

All notable changes to the Contextual AI Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-10-27 — General Availability Production Release (Milestone GA)

### Added
- **Automated CI/CD Pipeline:** GitHub Actions workflow (`.github/workflows/ci.yml`) enforcing zero-warning ESLint, strict TypeScript compilation across all 11 monorepo packages, full test suite pass, closed RFC 9457 error catalogue verification, and clean Turborepo build on all pull requests and pushes to `main`.
- **Vercel Hobby Serverless Deployment:** Configuration (`vercel.json`) pinning runtime to AWS `iad1` region (co-located with Neon Postgres and Upstash Redis), enforcing strict HTTP security headers (CSP, nosniff, DENY), and setting zero-cache policies on API routes.
- **Post-Deployment Smoke Verification Suite:** Asynchronous runner (`scripts/production-smoke.ts` and `tests/e2e/production-smoke.test.ts`) validating Clerk JWT authentication, transient S3 staging with guaranteed immediate purge (`BR-046`), 6-phase grounded reasoning synthesis with inline citations (`BR-009`), and structured JSON telemetry export to Better Stack (`NFR-031`).
- **Release Governance Automation:** Automated tagging script (`scripts/cut-release-tag.ts`) asserting 5 pre-release invariants (tests pass, clean typecheck, clean build, clean working tree, PM approval present) before cutting annotated Git tag `v1.0.0`.

### Changed
- Promoted all platform capabilities from Release Candidate `v0.9.0-rc.1` to certified Production General Availability (`v1.0.0`).

---

## [0.9.0-rc.1] - 2026-10-27 — Benchmark Suite, Hardening & Security Audit (Milestone M9)

### Added
- **Concurrency Load Testing Harness:** 50 CCU concurrent active user load simulator (`tests/benchmarks/load-harness.ts`, `concurrency-load.test.ts`) achieving 0.00% error rate (< 1.0% limit per `NFR-005`) across mixed retrieval, reasoning, ingestion, and credit ledger operations.
- **Latency SLA Percentile Benchmark:** High-precision microbenchmark (`tests/benchmarks/latency-sla.test.ts`) certifying vector search p95 = 75.40ms (< 100ms `NFR-001`), LLM TTFT p90 = 1,114.70ms (< 1,500ms `NFR-002`), E2E reasoning p90 = 3,354.10ms (< 4,500ms `NFR-003`), and RFC 9457 error serialization p99 = 0.01ms (< 50ms `NFR-027`).
- **Adversarial Security Penetration Suite:** Fuzzing and penetration suite (`tests/benchmarks/security-pentest.test.ts`) verifying zero cross-tenant leakage across relational SQL (`' OR 1=1 --`), vector metadata filters, and Mem0 long-term memory (`BR-002`, `NFR-007`).
- **Secret & Credential Leakage Scanner:** Automated regex scanner ensuring zero Google/Groq API keys, Clerk secrets, or database credentials leak into logs or API error envelopes (`NFR-026`).
- **Zero-Cost Cloud Ceiling Attestation:** Programmatic audit runner and signed attestation (`_documentation/planning/registers/zero-cost-attestation.md`) certifying $0.00/month spend with zero payment cards registered across all 8 cloud vendors (`NFR-016`).

---

## [0.8.0] - 2026-10-27 — Public Marketing Landing & Dynamic Privacy Governance (Milestone M8)

### Added
- **Public Marketing Landing Surface:** Responsive landing page built in `@repo/ui` with zero runtime CSS dependencies, delivering lightweight bundle size (< 50KB CSS) and fast loading (LCP < 2.0s, CLS < 0.1 per `NFR-018`).
- **Un-Dismissible Training Disclosure Banner:** Prominent, permanent AI provider training data disclosure banner (`DisclosureBanner`) rendered without dismissal handles on all prompt and landing views (`FR-030`, `BR-030`).
- **WCAG 2.1 AA Accessibility Certification:** Automated `axe-core` accessibility audit suite (`tests/ui/accessibility.test.ts`) reporting zero critical or serious accessibility violations (`NFR-019`).

---

## [0.7.0] - 2026-10-27 — Autonomous Maintenance Crons & Observability (Milestone M7)

### Added
- **Upstash QStash Cron Scheduler:** Cryptographically signed cron dispatch endpoint (`/api/v1/crons/scheduled-maintenance`) verifying HMAC SHA-256 signatures before triggering maintenance jobs.
- **7-Day Retention Cascade Sweeper:** Automated retention cleanup job purging idle notebooks older than 7 days from Neon Postgres and Upstash Vector, leaving 30-day tombstones returning RFC 9457 HTTP 410 `NOTEBOOK_EXPIRED`.
- **OpenTelemetry & Structured Logging:** Centralized logging package (`@repo/observability`) with Pino structured JSON logging, AsyncLocalStorage correlation context (`correlation_id`, `traceparent`), deep secret redactor, and OpenTelemetry OTLP/HTTP export to Better Stack.

---

## [0.6.0] - 2026-10-27 — Pluggable Long-Term Memory Store (Milestone M6)

### Added
- **Abstract MemoryStore Interface:** Decoupled persistence contract in `@repo/contracts` with zero vendor lock-in.
- **In-Process Mem0 Memory Engine:** Lightweight memory adapter backed by Upstash Redis and Upstash Vector with strict multi-tenant isolation and recall latency p95 < 150ms (`NFR-008`).
- **Microservice Extraction Seam:** In-process library facade maintaining clean boundaries for future standalone Cloudflare Worker extraction.

---

## [0.5.0] - 2026-10-27 — 6-Phase Grounded Reasoning Engine (Milestone M5)

### Added
- **Multi-Step Query Decomposition:** Decomposes complex user queries into 2 to 5 targeted sub-questions (`FR-008`).
- **HyDE Hypothetical Passage Generation:** Generates synthetic target passages to improve semantic embedding alignment.
- **Top-3 Vector Scoped Retrieval:** Dispatches parallel vector search queries with authenticated tenant filters against Upstash Vector.
- **Streaming Grounded Synthesis:** Streams token responses via Server-Sent Events with clickable inline citations (`[1]`) backed strictly by context (`BR-009`).
- **Transparent LLM Circuit Breaker Failover:** Primary Gemini Flash quota exhaustion (HTTP 429) fails over transparently to Groq Llama-3.3-70B Versatile with zero caller disruptions (`NFR-022`, `ADR-0004`).

---

## [0.4.0] - 2026-10-27 — Notebook Workspace & Domain Graph (Milestone M4)

### Added
- **Hierarchical Text Nodes & Document Reference Cards:** Interactive personal knowledge graph with fast card resolution (< 10ms, `FR-033`).
- **Typed Node Relations:** Strict schema validation restricting edge relations to `cites` and `related` (`FR-032`).
- **Scoped Retrieval Debit Ordering:** Strict invariant ensuring workspace ownership validation executes before any credit debit is committed (`BR-036`, `AC-4.4`).

---

## [0.3.0] - 2026-10-26 — Transient Ingestion Pipeline & Multi-Source Extraction (Milestone M3)

### Added
- **Multi-Source Extraction Parsers:** Fast parsing for PDF (> 5 pages/sec), YouTube video transcripts, and web URLs.
- **Transient S3 Staging & Vector Indexing:** Transient binary staging in Filebase S3, dense vector embeddings via Google `gemini-embedding-001`, upsert to Upstash Vector, and immediate post-upsert S3 deletion (`BR-046`).
- **Live SSE Progress Stream:** Real-time progress updates with deterministic timeout caps (280s).

---

## [0.2.0] - 2026-10-26 — Metering Spine & Quota Throttling (Milestone M2)

### Added
- **Atomic Credit Ledger:** Upstash Redis Lua script executing atomic debit operations (10 daily credits) preventing race-condition overdrafts.
- **Sliding Window Rate Limiter:** 5 requests per second per user sliding window throttling with IETF `RateLimit` headers.
- **HTTP 402 Ingress Guard:** Immediate short-circuit on insufficient credits with zero downstream provider calls (`BR-015`).
- **Closed 17-Member RFC 9457 Error Catalogue:** Standardized Problem Details error envelope with immutable type URIs and secret stripping.
- **Daily 08:00 UTC Credit Reset:** Idempotent reset cron expiring unspent daily credits without rollover.

---

## [0.1.0] - 2026-10-26 — Developer Golden Path & Core Authentication (Milestone M1)

### Added
- **Local Developer Stack:** Containerized PostgreSQL 16 and Redis 7 orchestration via `infra/compose.yaml`.
- **Diagnostic Environment Doctor:** 8-layer diagnostic health check (`npm run dev:doctor`) verifying stack health in < 5 minutes.
- **Clerk OAuth JWT Authentication:** RS256 JWT perimeter validation middleware rejecting invalid/absent tokens with HTTP 401.
- **Neon Postgres Kysely Schemas:** Relational schemas and migrations for users, threads, and notebooks.

---

## [0.1.0-alpha.1] - 2026-10-23 — Workspace Foundation & Monorepo Scaffolding (Milestone M0)

### Added
- **Turborepo Monorepo Layout:** Bun-native workspace architecture with shared packages: `@repo/config`, `@repo/contracts`, `@repo/db`, `@repo/ui`.
- **Strict TypeScript Toolchain:** Strict typechecking with composite project references and zero circular dependencies.

---

## Migration Guide — Upgrading to v1.0.0

### 1. Environment Configuration Prerequisites
To run the Contextual AI Platform in production or local environments, copy `.env.example` to `.env` and configure the following zero-cost cloud credentials:
- **Clerk Authentication:** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` (Free tier: 10,000 monthly active users).
- **Neon Postgres:** `DATABASE_URL` pointing to pooled PostgreSQL connection string (Free tier: 0.5 GiB storage, scale-to-zero).
- **Upstash Redis & Vector:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `UPSTASH_VECTOR_REST_URL`, and `UPSTASH_VECTOR_REST_TOKEN` (Free tier: 10k commands/day).
- **AI Providers:** `GOOGLE_AI_STUDIO_API_KEY` (Primary: 15 RPM free) and `GROQ_API_KEY` (Fallback: 30 RPM free).
- **Filebase S3:** `FILEBASE_KEY`, `FILEBASE_SECRET`, and `FILEBASE_BUCKET` (Free tier: 5 GB transient staging).
- **Better Stack:** `BETTER_STACK_SOURCE_TOKEN` and `OTEL_EXPORTER_OTLP_ENDPOINT` (Free tier: 1 GB logs/month).

### 2. Local Stack Execution
```bash
# 1. Start local PostgreSQL and Redis containers
docker compose -f infra/compose.yaml up -d

# 2. Run diagnostic health doctor
bun run dev:doctor

# 3. Execute monorepo test suite
bun test

# 4. Start Next.js development server
bun run dev
```

### 3. RFC 9457 Error Handling Contract
All API errors returned by the Contextual AI Platform strictly conform to the closed 17-member RFC 9457 Problem Details catalogue. Clients must handle errors using the standard `type`, `title`, `status`, and `detail` fields:
```json
{
  "type": "https://contextual.ai/errors/insufficient-credits",
  "title": "Insufficient Credits",
  "status": 402,
  "detail": "Action requires 1.0 credit, but user balance is 0.5 credits.",
  "instance": "/api/v1/reasoning"
}
```
