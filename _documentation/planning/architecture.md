---
doc_class: canonical
owner: architect-agent
status: active
created: 2026-10-23
last_verified: 2026-10-23
review_cadence_days: 90
code_refs: []
related:
  - _documentation/index.md
  - _documentation/project-details.md
  - _documentation/planning/project-brief.md
  - _documentation/planning/prd.md
  - _documentation/planning/conventions.md
  - _documentation/planning/decisions/adr-0004-unified-upstash-serverless-architecture.md
  - _documentation/planning/architecture/04-tech-stack.md
supersedes: []
regenerable: false
pinned: false
---

# Contextual AI Platform — Architecture Narrative (arc42)

> **Project:** Contextual AI Platform (`contextual`)  
> **Author:** architect-agent (Stage 3 Owner) · **Status:** Active Canonical Architecture  
> **Framework:** arc42 Standard Architecture Structure (§1–§12) · **Target Version:** v0.1.0 to v1.0.0  
> **Key Decision:** ADR-0004 Unified Upstash Serverless Architecture (Redis, Vector, QStash) & Groq Fallback  

```mermaid
graph TD
    USER["User / Browser Client"] --> CLERK["Clerk Auth<br/>(OAuth JWT)"]
    USER --> NEXT["Next.js 15 Platform Monolith<br/>(Vercel Hobby Serverless)"]
    
    subgraph "Ingress & Metering Layer"
        NEXT --> RL["Upstash Redis<br/>(Sliding 5 RPS Limiter & Lua Credits)"]
    end

    subgraph "Async Processing & Vector Layer"
        NEXT --> QSTASH["Upstash QStash<br/>(Serverless HTTP Task Queue)"]
        QSTASH --> INGEST["Ingestion Route Handler<br/>(PDF, YouTube, Web)"]
        INGEST --> STAGE["Filebase S3 Staging<br/>(Transient Object <= 5MB)"]
        INGEST --> VEC["Upstash Vector Index<br/>(10k ops/day, Never Suspends)"]
        INGEST --> PURGE["Delete S3 Object<br/>(Storage near 0 MB)"]
    end

    subgraph "Reasoning & Inference Layer"
        NEXT --> DECOMP["Query Decomposition<br/>(2-5 Sub-Questions)"]
        DECOMP --> HYDE["HyDE Generation & Top-3 Vector Retrieval"]
        HYDE --> GEMINI["Google Gemini Flash<br/>(Primary LLM & Embeddings)"]
        GEMINI -.->|429 Circuit Breaker| GROQ["Groq Llama-3.3-70B<br/>(Ultra-Fast Fallback)"]
    end

    subgraph "Persistence Layer"
        NEXT --> NEON["Neon Postgres 16<br/>(Users, Notebooks, Edges, Threads)"]
        NEXT --> MEM0["Mem0 Long-Term Memory<br/>(Upstash Redis & Vector Backed)"]
    end

    classDef blue fill:#E8F0FE,stroke:#4285F4,stroke-width:1.5px,color:#174EA6;
    classDef green fill:#E6F4EA,stroke:#34A853,stroke-width:1.5px,color:#137333;
    classDef amber fill:#FEF7E0,stroke:#FBBC04,stroke-width:1.5px,color:#B06000;

    class USER,CLERK,NEXT blue;
    class RL,QSTASH,INGEST,STAGE,VEC,PURGE green;
    class DECOMP,HYDE,GEMINI,GROQ,NEON,MEM0 amber;
```

---

## Section Stewards

| § | Section | Steward (writes it) | Contributors |
|---|---|---|---|
| 1 | Introduction and Goals | `architect-agent` | `analyst-agent` (requirements), `pm-agent` (goals) |
| 2 | Constraints | `architect-agent` | `pm-agent` (`conventions.md`), `governance-specialist` |
| 3 | Context and Scope | `architect-agent` | `research-specialist` (integration dossiers) |
| 4 | Solution Strategy | `architect-agent` | `data-architect` (Kysely), `research-specialist` (Upstash) |
| 5 | Building Block View | `architect-agent` | `system-decomposition-architect`, `data-architect`, `ux-specialist` |
| 6 | Runtime View | `architect-agent` | `failure-mode-specialist`, `capacity-planning-specialist` |
| 7 | Deployment View | `deployment-agent` | `networking-specialist` |
| 8 | Crosscutting Concepts | `architect-agent` | `security-architect`, `observability-specialist` |
| 9 | Architecture Decisions | `architect-agent` (the table) | `editorial-documentation` (ADR register) |
| 10 | Quality Requirements | `architect-agent` | `test-agent` (verification matrix) |
| 11 | Risks and Technical Debt | `architect-agent` | `code-maintenance-specialist`, `failure-mode-specialist` |
| 12 | Glossary | `architect-agent` | `analyst-agent` (domain glossary) |

---

## 1. Introduction and Goals

The Contextual AI Platform is an enterprise-grade conversational research workspace operating strictly within a **$0.00/month infrastructure ceiling** (`NFR-016`). It enables authenticated users to ingest heterogeneous sources (PDFs, YouTube transcripts, and web pages), index them into a serverless vector store, and perform multi-step synthesized question-answering with inline citations.

### Top Quality Goals
1. **Zero-Dollar Operational Ceiling (`NFR-016`):** All components operate permanently within free tiers with zero stored credit cards.
2. **Deep Semantic Synthesis (`FR-008`–`FR-011`):** Multi-hop reasoning combining query decomposition, HyDE passage generation, and top-3 vector retrieval.
3. **Multi-Tenant Data Isolation (`NFR-007`, `BR-002`):** Zero cross-tenant leakage across SQL queries, vector search, and long-term memory.
4. **Resilience & Fallback Headroom (`NFR-022`, `ADR-0004`):** Transparent failover from Google Gemini to Groq Llama-3.3-70B under quota exhaustion.

Detail: [`planning/project-brief.md`](project-brief.md) §1–§3 · [`planning/prd.md`](prd.md)

---

## 2. Constraints

- **Strict Cost Ceiling:** $0.00/month across all vendors; no payment card registered (`NFR-016`).
- **Data Governance Notice:** Mandatory un-dismissible UI disclosure on all prompt surfaces warning that queries travel to Google AI Studio under free-tier training policies (`FR-030`, `CV-041`).
- **Serverless Execution Limits:** Vercel Hobby serverless functions have a 10s default execution limit. Heavy parsing jobs must be dispatched asynchronously via Upstash QStash (`ADR-0004`).
- **File Upload Limits:** Binary uploads capped at 5 MB (`BR-045`), staged directly to Filebase S3, and deleted immediately post-ingest (`BR-046`).
- **Coding Conventions:** Strict TypeScript strict mode, Turborepo `@repo/*` monorepo boundaries, and closed 17-member RFC 9457 error catalogue.

Detail: [`planning/conventions.md`](conventions.md)

---

## 3. Context and Scope

The system interacts with external actors through defined, typed boundaries:

```mermaid
graph TD
    USER["Knowledge Worker / Researcher"] -->|"HTTPS / Next.js UI"| CTX["Contextual AI Platform"]
    CTX -->|"OAuth RS256 JWT"| CLERK["Clerk Identity Provider"]
    CTX -->|"HTTP REST EVALSHA"| UP_REDIS["Upstash Redis (Metering & Limiting)"]
    CTX -->|"HTTP REST Vector API"| UP_VEC["Upstash Vector (Semantic Embeddings)"]
    CTX -->|"HTTP Webhook Tasks"| QSTASH["Upstash QStash (Async Queue & Crons)"]
    CTX -->|"Direct Pre-signed S3"| FILEBASE["Filebase S3 (Transient Staging)"]
    CTX -->|"HTTPS REST API"| GEMINI["Google AI Studio (Gemini Flash & Embeddings)"]
    CTX -->|"HTTPS REST Fallback"| GROQ["Groq (Llama-3.3-70B Versatile)"]
    CTX -->|"Serverless SQL"| NEON["Neon Postgres (Relational Metadata)"]
    CTX -->|"OTLP Spans / HTTP"| BETTER_STACK["Better Stack (Telemetry & Uptime)"]

    classDef blue fill:#E8F0FE,stroke:#4285F4,stroke-width:1.5px,color:#174EA6;
    classDef green fill:#E6F4EA,stroke:#34A853,stroke-width:1.5px,color:#137333;

    class USER blue;
    class CTX,CLERK,UP_REDIS,UP_VEC,QSTASH,FILEBASE,GEMINI,GROQ,NEON,BETTER_STACK green;
```

Detail: [`planning/contracts/component-catalog.yaml`](contracts/component-catalog.yaml) · [`planning/contracts/api-contract.openapi.yaml`](contracts/api-contract.openapi.yaml)

---

## 4. Solution Strategy

The technical foundation is a **modular monolith on Next.js 15 App Router** deployed to Vercel Hobby, supported by a unified serverless cloud data layer:
- **Persistence & Vectors:** Neon Postgres 16 (metadata) via Kysely ORM, Upstash Redis (rate limiting & credits), and Upstash Vector (semantic search).
- **Asynchronous Execution:** Upstash QStash serverless message queue dispatches long-running ingestion and maintenance tasks via signed webhooks.
- **Inference Dual-Stack:** Google Gemini 1.5/2.0 Flash primary with Groq Llama-3.3-70B fallback circuit-breaker (`ADR-0004`).
- **Transient Storage:** Filebase S3 holds uploads temporarily; binaries are permanently purged once vector upserts commit (`ADR-0003`).

Detail: [`planning/architecture/04-tech-stack.md`](architecture/04-tech-stack.md) · [`planning/decisions/adr-0004-unified-upstash-serverless-architecture.md`](decisions/adr-0004-unified-upstash-serverless-architecture.md)

---

## 5. Building Block View

```mermaid
graph TD
    subgraph "apps/platform"
        APP_ROUTER["Next.js App Router & Server Components"]
        API_ROUTES["Route Handlers (/api/v1/*)"]
    end

    subgraph "Core Domain Packages"
        PKG_METER["@repo/metering<br/>(Upstash Lua & Rate Limiter)"]
        PKG_INGEST["@repo/ingestion<br/>(Parsers & QStash Task Handlers)"]
        PKG_REASON["@repo/reasoning<br/>(Decomp, HyDE, Gemini & Groq)"]
        PKG_MEM["@repo/memory<br/>(Mem0 in-process Adapter)"]
        PKG_DB["@repo/db<br/>(Kysely & Neon Schema)"]
        PKG_CONTRACTS["@repo/contracts<br/>(Zod & RFC 9457 Catalogue)"]
    end

    API_ROUTES --> PKG_METER
    API_ROUTES --> PKG_INGEST
    API_ROUTES --> PKG_REASON
    API_ROUTES --> PKG_MEM
    PKG_REASON --> PKG_DB
    PKG_METER --> PKG_CONTRACTS
```

### Building Block Responsibilities
1. **`@repo/metering`**: Evaluates 5 RPS sliding window and executes single-roundtrip Redis Lua script for credit debit (10 daily grant) and daily 08:00 UTC resets.
2. **`@repo/ingestion`**: Handles PDF/YouTube/Web extraction, generates embeddings, upserts to Upstash Vector, and purges transient Filebase staging files.
3. **`@repo/reasoning`**: Coordinates query decomposition into 2–5 sub-questions, generates HyDE summaries, queries Upstash Vector, and streams grounded citations via Gemini Flash or Groq fallback.
4. **`@repo/memory`**: Implements `MemoryStore` interface using in-process Mem0 backed by Upstash Redis and Upstash Vector.
5. **`@repo/db`**: Manages Kysely database schema, migrations, and typed queries for Neon Postgres.
6. **`@repo/contracts`**: Exports shared Zod schemas, OpenAPI types, and the closed 17-member RFC 9457 problem catalogue.

Detail: [`planning/contracts/component-catalog.yaml`](contracts/component-catalog.yaml)

---

## 6. Runtime View

### Primary Scenario 1: Metered Grounded Synthesis Flow
1. User submits question to `/api/v1/chat`.
2. Middleware verifies Clerk JWT and extracts `user_id` (`FR-001`, `BR-001`).
3. Limiter calls Upstash Redis Lua script: checks 5 RPS rate window and debits 0.5 credits atomically (`BR-014`).
   - If balance < 0.5: returns HTTP 402 `INSUFFICIENT_CREDITS` immediately (`BR-015`).
   - If rate exceeded: returns HTTP 429 with `Retry-After: 1` (`BR-016`).
4. Reasoning engine decomposes prompt into 2–3 sub-questions and generates HyDE summaries (`FR-008`, `FR-009`).
5. Generates embeddings via Google `gemini-embedding-001` and retrieves top-3 vectors per question from Upstash Vector with `{ user_id }` filter (`FR-010`, `BR-008`).
6. Assembles context and streams response with inline citations via Google Gemini Flash (`FR-011`).
   - If Gemini returns 429 `RESOURCE_EXHAUSTED`, seamlessly fails over to Groq Llama-3.3-70B (`NFR-022`, `ADR-0004`).

### Primary Scenario 2: Asynchronous Transient Ingestion Flow
1. Client requests pre-signed S3 URL from `/api/v1/ingestions/presign` and uploads PDF (≤ 5MB) directly to Filebase.
2. Client posts `file_key` to `/api/v1/ingestions`; route debits 1.0 credit via Redis Lua and dispatches job to Upstash QStash.
3. QStash invokes `/api/v1/ingestions/process` with cryptographic signature verification.
4. Worker parses text, computes dense embeddings, and upserts vector points to Upstash Vector with tenant metadata.
5. Worker immediately calls S3 `DeleteObjectCommand` on Filebase, purging binary (`BR-046`).
6. Worker emits final SSE progress event (`progress: 100%`).
   - If parsing terminally fails, atomic Redis Lua script reverses debited credit (`FR-037`, `BR-033`).

---

## 7. Deployment View

The platform deploys as a serverless monorepo on **Vercel Hobby** (`$0.00/month`):
- **Web & Route Handlers:** Vercel Serverless Functions (Node.js 22 LTS, region `iad1` / US East).
- **Database:** Neon Serverless Postgres (Scale-to-zero compute, region `us-east-1`).
- **Caching & State:** Upstash Serverless Redis (region `us-east-1`).
- **Vector Search:** Upstash Vector (region `us-east-1`, cosine metric).
- **Task Queue & Crons:** Upstash QStash (dispatching HTTP webhooks to Vercel API endpoints).
- **Object Storage:** Filebase S3 (`s3.filebase.io`).
- **Telemetry:** OpenTelemetry OTLP pushed directly to Better Stack.

Detail: [`planning/architecture/04-tech-stack.md`](architecture/04-tech-stack.md)

---

## 8. Crosscutting Concepts

### 8.1 Centralized Logging & Telemetry Architecture (CP3 Gate Item)
- **Mechanism:** Structured JSON logging via Pino integrated with `@opentelemetry/sdk-node` (`NFR-009`, `BR-010`).
- **Severity Levels:**
  - `DEBUG`: Internal chunk boundaries, raw tokens, cache hits.
  - `INFO`: User actions, debit commits, completed ingestions, QStash dispatches.
  - `WARN`: Throttling events (429), provider failovers (Gemini → Groq), retry attempts.
  - `ERROR`: Terminal job failures, database connection aborts, upstream 5xx errors.
  - `CRITICAL`: Unhandled exceptions, data corruption alerts.
- **Contextual Metadata:** Every log entry carries `{ timestamp, level, correlation_id, service, event, payload }`. Trace context conforms to W3C `traceparent`.
- **Redaction Policy:** All logged strings pass through a strict regex sanitizer stripping API keys, JWT tokens, Bearer headers, database connection strings, and personal PII before stdout emission (`NFR-026`, `BR-012`).

### 8.2 Security & Tenant Isolation
- Cryptographic RS256 offline JWT session verification via Clerk on all `/api/v1/*` routes except public landing.
- Mandatory tenant payload filter `{ user_id, document_id, notebook_id }` enforced on all Upstash Vector searches (`BR-002`, `BR-004`).
- Upstash QStash webhook endpoints verify cryptographic `Upstash-Signature` headers to reject unauthorized invocations.

---

## 9. Architecture Decisions

| ADR | Decision | Status | Sections Affected |
|---|---|---|---|
| [ADR-0001](decisions/adr-0001-hosting-and-storage.md) | Vercel Hobby, Qdrant Free, 7-day cascade | Superseded by ADR-0004 | §4, §5, §7 |
| [ADR-0002](decisions/adr-0002-runtime-and-orm.md) | Bun Toolchain + Node 22 Runtime + Kysely ORM | Accepted | §4, §5 |
| [ADR-0003](decisions/adr-0003-transient-filebase-staging.md) | Filebase S3 transient staging with immediate post-ingest deletion | Accepted | §4, §5, §6 |
| [ADR-0004](decisions/adr-0004-unified-upstash-serverless-architecture.md) | Unified Upstash Serverless Architecture (Redis, Vector, QStash) & Groq Fallback | Accepted | §1, §3, §4, §5, §6, §7 |

---

## 10. Quality Requirements

| Quality Category | Scenario & Measurable SLA | Verification Method |
|---|---|---|
| **Vector Search Latency** | p95 < 100 ms for top-3 query on ≤ 25k points | k6 load test script (`NFR-001`) |
| **LLM Time-to-First-Token**| p90 < 1,500 ms for streaming responses | Streaming latency benchmark (`NFR-002`) |
| **Pipeline Latency** | p90 < 4,500 ms for complete 6-stage reasoning pipeline | Synthetic E2E test (`NFR-003`) |
| **Zero Cost Ceiling** | Strictly $0.00/month cloud spend across all accounts | Account billing audit (`NFR-016`) |
| **Concurrency Under Load** | ≥ 50 concurrent active users with < 1% error rate | k6 multi-user scenario (`NFR-005`) |

Detail: [`planning/quality/verification.md`](quality/verification.md)

---

## 11. Risks and Technical Debt

| Risk | Severity | Owner | Mitigation Strategy |
|---|---|---|---|
| Upstash QStash 500 msgs/day free limit | Medium | `architect-agent` | Ingestion jobs batch pages into single task payloads; crons run daily/weekly. |
| Google AI Studio content training terms | High | `pm-agent` | Prominent un-dismissible frontend training disclosure banner (`FR-030`, `CV-041`). |
| Upstash Vector 1,536 dimension ceiling | Low | `data-architect` | Bounded to Google 768-dim embeddings or BGE-small 384-dim embeddings. |

---

## 12. Glossary

Domain terms are defined once in [`planning/project-brief.md`](project-brief.md) §12 Glossary; link to it rather than repeating them.

| Technical Term | Definition |
|---|---|
| **QStash Webhook** | A cryptographically signed HTTP POST message dispatched by Upstash to invoke serverless functions asynchronously. |
| **EVALSHA** | A Redis command executing a server-cached Lua script by its SHA1 digest in a single atomic roundtrip. |
| **Cosine Similarity** | A metric measuring the angle between two dense vector embeddings to calculate semantic closeness. |
| **HyDE Passage** | A hypothetical synthetic answer generated by the LLM before search to bridge semantic gap with documents. |
| **RFC 9457** | An IETF specification defining `application/problem+json` standard error serialization for HTTP APIs. |

---
*Sealed by architect-agent at Checkpoint 3 (Gate G4).*
