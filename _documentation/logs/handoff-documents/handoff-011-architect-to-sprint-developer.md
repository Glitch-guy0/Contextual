# Agent Stage Handoff Document — Stage 3 Architecture Design to Stage 4 Sprint Breakdown & Implementation

> **Handoff ID:** `handoff-011-architect-to-sprint-developer`  
> **From:** `architect-agent` (Stage 3 Owner · System Designer & C4 Modeler)  
> **To:** `sprint-agent` / `developer-agent` (Stage 4 Owners · Sprint Governor & Downstream Builder)  
> **Timestamp:** 2026-10-23T19:30:00Z  
> **Workflow ID:** `wf-contextual-001` · **Delivery Mode:** Balanced · **Target Maturity:** MVP  
> **Milestone:** M3 — Transient Ingestion Pipeline & Multi-Source Extraction (`v0.3.0`)  

---

## 1. Handoff Field Block

```text
From -> To: architect-agent → sprint-agent / developer-agent
Objective: Deliver complete, validated technical architecture for Milestone M3 (Transient Ingestion Pipeline & Multi-Source Extraction) for Sprint story ratification and clean-session implementation across stories S3.1 through S3.6.
Status: READY_FOR_HANDOFF
Risk tier: HIGH
Accepted criteria: Checkpoint 3 (CP3) satisfied: Detailed architectural design document authored (05-m3-transient-ingestion-pipeline.md) with C4 models, direct-to-S3 transient staging (<= 5MB ceiling, 0 MB idle storage invariant), Upstash QStash webhook asynchronous processing, heterogeneous parsers (PDF > 5 pages/sec, YouTube < 30s, Web Readability), recursive character chunking (800 chars, 100 overlap), Google gemini-embedding-001 dual-stack with in-process ONNX fallback, Upstash Vector REST indexing with tenant metadata, deterministic SSE progress stream (capped at 280s), and atomic Lua credit refund compensation (refund-credits.lua); OpenAPI 3.1 specification updated (/ingestions/presign, /ingestions, /ingestions/process, /ingestions/{jobId}/progress, /ingestions/{jobId}/retry); component catalog (component-catalog.yaml) enriched with @repo/ingestion; configuration schema (config-schema.yaml) updated with Filebase S3, QStash, Upstash Vector, and Google AI Studio variables; package dependency plan (package-dependency-plan.md) updated with @repo/ingestion; failure mode register (failure-mode-register.md) updated with M3 FMEA sweep (FM-301..FM-308, FT-03); planning dispatch log (planning-dispatch-log.md) recorded with status ACCEPTED across all 5 M3 specialist consultations (DSP-011..DSP-015); milestone-status.yaml updated to Gate G4 PASS.
Artifacts:
  - _documentation/planning/architecture/05-m3-transient-ingestion-pipeline.md (created, final)
  - _documentation/planning/architecture.md (updated, final)
  - _documentation/planning/contracts/component-catalog.yaml (updated, final)
  - _documentation/planning/contracts/api-contract.openapi.yaml (updated, final)
  - _documentation/planning/contracts/config-schema.yaml (updated, final)
  - _documentation/planning/registers/package-dependency-plan.md (updated, final)
  - _documentation/planning/registers/failure-mode-register.md (updated, final)
  - _documentation/logs/handoff-documents/planning-dispatch-log.md (updated, final)
  - _documentation/planning/milestones/milestone-status.yaml (updated, G4 PASS)
  - _documentation/planning/milestones/m3-transient-ingestion/milestone.md (updated, architecture-finalized)
  - _documentation/system/workflow-context.yaml (updated, active milestone M3)
  - _documentation/index.md (updated, routed)
Dependencies and risks:
  - Filebase S3 direct-to-storage upload: Mitigated by generating 300s pre-signed PUT URLs scoped strictly to tenant staging prefix, capped at 5 MB (BR-045).
  - Vercel Serverless Function 10s default execution timeout: Mitigated by offloading extraction and embedding to Upstash QStash asynchronous signed webhooks (ADR-0004).
  - Google AI Studio 1,500 RPD free tier quota exhaustion: Mitigated by in-process circuit breaker fallback to @huggingface/transformers (bge-small-en-v1.5 / ONNX) on HTTP 429.
  - S3 transient storage accumulation: Mitigated by immediate DeleteObjectCommand in worker finally handler and secondary hourly lifecycle sweeper (BR-046).
  - SSE connection timeouts on serverless edge: Mitigated by hard capping stream lifetime at 280 seconds (BR-034) and supporting Last-Event-ID recovery.
  - Ingestion billing fairness: Mitigated by atomic Lua script (refund-credits.lua) refunding 1.0 credit on terminal failure (BR-033), and allowing non-debiting retries via original job_id (FR-040).
Assumptions made:
  - Decision: Direct browser-to-S3 pre-signed upload chosen over server buffering to prevent memory exhaustion and function timeouts on Vercel Hobby.
  - Decision: Upstash QStash HTTP webhooks chosen over BullMQ to avoid requiring long-running Node.js worker containers, preserving 100% serverless topology ($0.00/month).
  - Decision: Upstash Vector REST client chosen over Qdrant Cloud Free, eliminating the 48-hour keepalive probe and cluster idle suspension risks (ADR-0004).
  - Decision: Text chunk bodies stored solely in vector metadata; zero raw text chunks stored in Neon PostgreSQL (BR-047).
Open issues: None blocking. Zero unresolved architectural ambiguities.
Verification:
  - Architecture Review: Verified all 12 arc42 headings and Section Stewards in architecture.md -> PASS
  - C4 Context & Mermaid: Validated vertical graph TD pastel formatting and node syntax in 05-m3-transient-ingestion-pipeline.md -> PASS
  - Contract Synchronization: Validated component-catalog.yaml, api-contract.openapi.yaml, and config-schema.yaml against M3 specifications -> PASS
  - Specialist Dispatches: All 5 M3 dispatches (DSP-011..015) marked ACCEPTED in planning-dispatch-log.md -> PASS
  - Code Execution: Production code implementation and live extractor tests deferred to Stage 4 (developer-agent) -> NOT_VERIFIED (Stage 4 responsibility)
Resume condition: sprint-agent confirms sprint board (m3-transient-ingestion/sprint-status.yaml) and developer-agent implements stories S3.1 through S3.6 strictly adhering to frozen Change Matrices.
Documentation impact:
  - _documentation/planning/architecture/05-m3-transient-ingestion-pipeline.md — CREATED
  - _documentation/planning/architecture.md — UPDATED
  - _documentation/planning/contracts/component-catalog.yaml — UPDATED
  - _documentation/planning/contracts/api-contract.openapi.yaml — UPDATED
  - _documentation/planning/contracts/config-schema.yaml — UPDATED
  - _documentation/planning/registers/package-dependency-plan.md — UPDATED
  - _documentation/planning/registers/failure-mode-register.md — UPDATED
  - _documentation/logs/handoff-documents/planning-dispatch-log.md — UPDATED
  - _documentation/planning/milestones/milestone-status.yaml — UPDATED
  - _documentation/planning/milestones/m3-transient-ingestion/milestone.md — UPDATED
  - _documentation/system/workflow-context.yaml — UPDATED
  - _documentation/index.md — UPDATED
```

---

## 2. Handoff Metadata
- **From Agent:** `architect-agent`
- **Sequence:** 011
- **Timestamp:** 2026-10-23T19:30:00Z
- **Active Workflow ID:** `wf-contextual-001`
- **Delivery Mode:** `balanced`
- **Target Maturity:** `mvp`

---

## 3. Executive Context Digest
Stage 3 Architecture Planning for Milestone M3 (Transient Ingestion Pipeline & Multi-Source Extraction, `v0.3.0`) is complete. The system architecture establishes:
1. **Direct-to-Storage Staging & S3 Hygiene (`packages/ingestion/src/s3-staging.ts`):** Client requests pre-signed PUT URLs for Filebase S3 (`/api/v1/ingestions/presign`), capping uploads strictly at 5 MB (`BR-045`). Staged objects are permanently purged via `DeleteObjectCommand` immediately upon vector commit (`BR-046`), maintaining 0 MB idle storage.
2. **Serverless Asynchronous Queue Integration (`packages/ingestion/src/qstash-handler.ts`):** Ingestion runs off the HTTP cycle via Upstash QStash signed HTTP webhooks (`/api/v1/ingestions/process`) with cryptographic `Upstash-Signature` verification and exponential retry (3 attempts max).
3. **Heterogeneous Extractor Suite (`packages/ingestion/src/parsers/`):** Stream text PDF parser parsing 35-page text PDFs at > 5 pages/sec (`NFR-004`); YouTube subtitle extractor fetching timestamped cues in < 30s; and Web reader stripping boilerplate via `@mozilla/readability`.
4. **Semantic Recursive Chunking (`packages/ingestion/src/chunker.ts`):** Splits text into 800-character semantic segments with 100-character overlaps; injects mandatory tenant payload metadata `{ user_id, document_id, notebook_id, source_type, title, chunk_index, char_start, char_end }` (`BR-004`).
5. **Dual-Stack Dense Embeddings & Vector Indexing (`packages/ingestion/src/embedding-service.ts`, `vector-indexer.ts`):** Generates 768-dim embeddings via Google AI Studio (`gemini-embedding-001`), falling back in-process to `@huggingface/transformers` (`bge-small-en-v1.5` / ONNX) on Google 429 quota exhaustion. Upserts points into Upstash Vector via REST API (`ADR-0004`).
6. **Deterministic SSE Progress Streaming (`packages/ingestion/src/progress-stream.ts`):** Streams live ingestion status over Server-Sent Events (`/api/v1/ingestions/{jobId}/progress`), providing deterministic percentages based on real denominators (PDF pages processed), capped at 280 seconds (`BR-034`) with `Last-Event-ID` recovery.
7. **Atomic Credit Compensation & Non-Debiting Retry (`packages/ingestion/src/compensation.ts`, `lua/refund-credits.lua`):** If an ingestion job fails terminally (`PASSWORD_PROTECTED`, `NO_TEXT_LAYER`, etc.), an atomic Redis Lua script restores the 1.0 credit debit (`FR-037`, `BR-033`). Users can retry failed jobs via `/api/v1/ingestions/{jobId}/retry` without paying credits a second time (`FR-040`).

---

## 4. Suggested Next Contributors

### `sprint-agent`
- **Why:** Author Milestone M3 sprint board (`_documentation/planning/milestones/m3-transient-ingestion/sprint-status.yaml`) and decompose PRD Epic 3 into atomic implementation stories S3.1 through S3.6 with frozen Change Matrices.
- **Could help with:** Validate story atomicity checks, change matrices (`new_files`, `allowed_files`, `forbidden_files`), and verification scenarios.

### `developer-agent`
- **Why:** Implement stories S3.1 through S3.6 in clean sessions adhering strictly to frozen Change Matrices in `packages/ingestion`, `packages/contracts`, and `apps/platform`.
- **Could help with:** Author extractors, S3 staging service, QStash webhook handler, chunker, embedding service, and unit/integration test suites.

### `test-agent`
- **Why:** Validate OpenAPI contracts and execute independent verification gate certification (Checkpoint 4 / Gate G6) once developer implementation completes.

---
*Sealed by architect-agent at Stage 3 completion (Gate G4 PASS / Checkpoint 3 Certified).*
