# Party-Mode Collaboration Log

> Sessions are appended chronologically. **Session 1** is the M3 sprint approval; **Session 2** is the M4 planning round-table.

## Session Meta
- **Date:** 2026-10-26T09:45:00.000Z
- **Topic / Feature:** Milestone M3 Sprint Board Approval — PM Agent + Sprint Agent
- **Mode:** Approval & Sprint Board Certification
- **Session Chairs:** `pm-agent` (Stage 2 Owner) & `sprint-agent` (Board Owner)
- **Current Workspace State:**
  - M0/M1/M2 verified completed in docs and board (`bun test` 50/50, 6/6 build, 6/6 typecheck).
  - M3 architecture finalized in `05-m3-transient-ingestion-pipeline.md` (Gate G4 PASS).
  - M3 sprint board drafted in `m3-transient-ingestion/sprint-status.yaml` with six stories S3.1..S3.6 and frozen Change Matrices.
  - M3 implementation still absent from workspace; this session is an approval/certification step for the plan, not an implementation step.

## Participants
- `pm-agent` (Stage 2 Owner: product intent, sprint board governance, milestone approval)
- `sprint-agent` (Board author and governor: sprint-status.yaml schema and structure)
- `architect-agent` (referenced for design fidelity; not convened live here)
- `test-agent` (referenced for verification binding; not convened live here)

## Agenda
1. Confirm entry conditions for M3 sprint approval.
2. Review sprint board contents against M3 charter and M3 design.
3. Decide whether the board is approved for developer handoff.
4. Record the approval posture and the exact next step into the party-mode log.

## Round 1: Entry Conditions and Board Readiness
- **PM Agent position:**
  - The board exists. The question is whether it is coherent enough to approve and hand off.
  - Approval should be about coherence, consistency, and change-matrix discipline, not about code presence.
  - The plan must still be testable later through the same unified gate used for M0–M2.
- **Sprint Agent position:**
  - The board is drafted with six stories, each carrying Change Matrices and stories grouped under `sprint_board.todo`.
  - The board is still `drafting`; approval would move it toward a certified handoff state.
  - Story S3.6 is the natural closing story because it includes M3 verification evidence.
- **Architect Agent reference position:**
  - The board aligns with the M3 design's component list and the six verification hooks in the design §6.
  - Approval is reasonable if stories stay inside the design's ownership boundaries and do not invent new interfaces.
- **Test Agent reference position:**
  - The board is acceptable if the closing story creates M3 evidence that lives inside the existing `bun test` gate.

## Round 2: Trade-offs in Approval Timing
- **Trade-off 1: Approve now vs approve after story cards are separated out**
  - **Option A:** Approve the board as drafted with stories represented inline in sprint-status.yaml.
    - *Pros:* Faster approval; fewer document artifacts to maintain right now.
    - *Cons:* Slightly less visible story-level history if someone later wants to inspect the frozen brief for one story alone.
  - **Option B:** Split stories into separate `stories/S3.1`..`stories/S3.6` cards before approval.
    - *Pros:* Stronger story-level provenance; easier to attach per-story approval notes.
    - *Cons:* More files and more ceremony before the first implementation story starts.
  - **Consensus:** Approve Option A for this session, because the sprint board already contains the frozen Change Matrices and acceptance notes inline. Story cards can be separated later if traceability demand increases.

- **Trade-off 2: Approval scope**
  - **Option A:** Approve the entire M3 sprint at once.
    - *Pros:* Clean handoff package; matches a single PM decision.
    - *Cons:* Masks the fact that S3.1 is the real gating story for code start.
  - **Option B:** Approve only S3.1 for start, with the rest conditionally approved pending S3.1 completion.
    - *Pros:* Smaller blast radius; clearer “first code” checkpoint.
    - *Cons:* More approval churn if each story needs its own micro-decision.
  - **Consensus:** Approve the sprint plan overall, but make the explicit implementation rule that **S3.1 is the first coded story** and later stories proceed in dependency order. That preserves a single approval while still protecting implementation sequence.

- **Trade-off 3: What “approval” commits to**
  - **Option A:** Approval means code may start immediately against the current Change Matrices.
    - *Pros:* Clear signal; reduces ambiguity.
    - *Cons:* Assumes contracts and design are not going to change again.
  - **Option B:** Approval means the plan is certified for handoff, but implementation still needs per-story verification before closure.
    - *Pros:* Keeps the PM approval distinct from implementation sign-off.
    - *Cons:* Slightly more explicit sequencing to remember later.
  - **Consensus:** Option B. PM approval certifies the sprint plan and Change Matrices; it does not replace story-level verification.

## Round 3: Consensus and Approval Posture
- **Consensus:**
  1. The M3 sprint board is coherent with M3 charter and M3 design.
  2. The frozen Change Matrices are acceptable for handoff in their current form.
  3. PM approval is granted for the sprint plan as a handoff package, not as a code-complete sign-off.
  4. Implementation must start with S3.1 and then proceed through the dependency order S3.2, S3.3, S3.4, S3.5, S3.6.
- **Rejected alternatives:**
  - Holding approval until separate story files are written. Rejected because the board already carries the required frozen matrix and acceptance info.
  - Approving only after implementation evidence exists. Rejected because that is a different gate; this session is about plan approval.
- **Approval verdict:**
  - `pm-agent` approves the M3 sprint plan for handoff.
  - `sprint-agent` certifies the board as ready for developer handoff with the explicit caveat that implementation starts at S3.1 and verification still runs through the unified `bun test` gate.

## Sealed Decision Register

| Decision ID | Summary | Owner | Sealed State |
|---|---|---|---|
| **D-PTY-M3-07** | M3 sprint board approved for handoff as a plan, not as implementation sign-off | `pm-agent` | Sealed |
| **D-PTY-M3-08** | Approval accepted with inline story representation for now; separate story cards optional later | `sprint-agent` | Sealed |
| **D-PTY-M3-09** | First implementation story is S3.1; later stories proceed in dependency order | `sprint-agent` | Sealed |
| **D-PTY-M3-10** | Story closure still requires unified `bun test` evidence; PM approval does not replace verification | `pm-agent` | Sealed |

## Handoff & Next Steps
1. `developer-agent` may start M3 implementation from the approved sprint plan.
2. First story implemented should be S3.1 within its Change Matrix.
3. Sprint-agent retains sprint tracking and later re-verification after developer-agent completes stories.
4. PM agent and sprint-agent treat this session as the approval record; durable promotion happens through the sprint board and milestone-status artifacts.

## Implementation note
This is a DBW documentation and coordination record. The approval is represented through workspace artifacts; downstream agent work still proceeds from those artifacts rather than from this chat turn.

---

# Session 2 — M4 Planning Round-Table (PM · Architect · Sprint)

## Session Meta
- **Date:** 2026-10-26T15:30:00.000Z
- **State:** Phase 4 (Milestone Detail) → Phase 5 (Implementation Planning)
- **Task:** Plan M4 Notebook Workspace for implementation; produce the design blueprint and sprint board with a developer handoff; then PM verify and approve.
- **Mode:** Planning → Design → Board → Approval
- **Session Chairs:** `pm-agent` (Stage 2 Owner), `architect-agent` (Stage 3 Owner), `sprint-agent` (Board Owner)
- **Log:** this file · **Dispatches:** DSP-016..DSP-020 · **Handoff:** `handoff-012-sprint-to-developer-m4`

## Participants
- `pm-agent` — charter, grounding, risk tier, approval authority
- `architect-agent` — design blueprint, arc42 deltas, OpenAPI surface
- `sprint-agent` — story slicing, frozen Change Matrices, sprint board
- `data-architect`, `security-architect`, `failure-mode-specialist` — convened for schema, isolation ordering, and FMEA (DSP-017, DSP-018, DSP-019)

## Round 1: Positions
- **PM:** the M4 charter's grounding line is drifted — it cites `FR-013` (M9), `FR-019`/`FR-020` (M6), and mislabels `BR-021`/`BR-022`/`BR-038`/`BR-039`/`NFR-015`. The correct set is `FR-031..FR-034, BR-002, BR-036, NFR-007`. There is also a live contradiction: `milestone.md` AC-4.4 says 404, `epic-004` AC-3 says 403, for the same condition.
- **Architect:** the graph belongs in the already-shipped Neon/Kysely stack. Tenancy should be a predicate on the reading statement, not a separate probe. Edge typing needs enforcement at two layers. Scoped retrieval is the only place the graph meets metering, so it is the only HIGH-tier unit.
- **Sprint:** six single-session stories fall out cleanly: `S4.1 → S4.2 → {S4.3, S4.4, S4.5} → S4.6`. The repository has no `apps/` directory, so no story may claim an HTTP route path — the status-code acceptance criteria bind at the service layer through the typed result contract.

## Round 2: Trade-offs & Deliberation
- **Trade-off 1: 403 vs 404 for a foreign notebook**
  - *403 `forbidden-tenant-access`:* explicit and self-documenting for an audit reader. *Cost:* confirms to the caller that another tenant's notebook id exists — an enumeration oracle directly against `BR-002`/`NFR-007`, and it contradicts the live `/notebooks/{notebookId}` 404 contract.
  - *404 `notebook-not-found`:* enumeration-resistant and contract-consistent. *Cost:* slightly less self-explanatory to a reader who did not see the decision.
  - **Consensus:** 404. 403 is retained only for tenant-scope violations carrying **no** resource identifier (e.g. a foreign `document_id` in an edge payload).
- **Trade-off 2: dedicated graph DB vs adjacency list**
  - *Neo4j:* native traversal primitives. *Cost:* new vendor, new free-tier ceiling, new operational surface, threatens the `NFR-016` $0.00 invariant, breaks the ADR-0004 unified-serverless posture.
  - *Adjacency list in Neon:* reuses everything shipped, ACID joins, composite tenant index. *Cost:* recursive CTEs for deep branch traversal.
  - **Consensus:** adjacency list. M4 does not need the depth where a graph DB pays for itself.
- **Trade-off 3: separate ownership probe vs predicate**
  - *Two-step probe:* readable. *Cost:* two round trips **and** a TOCTOU window between check and use.
  - *Predicate on the reading statement:* one round trip, no window. *Cost:* marginally less obvious control flow.
  - **Consensus:** predicate (DSP-018).
- **Trade-off 4: approve now vs repair the red baseline first**
  - *Repair first:* simplest starting point. *Cost:* holds an already-passing design review hostage to work that is unambiguously `developer-agent`'s under M3's own matrices.
  - *Approve and proceed regardless:* fastest. *Cost:* `bun test`/`build`/`typecheck` exit codes are already non-zero for unrelated reasons, so **no** M4 story could be honestly certified.
  - **Consensus:** approve the plan, gate implementation on blocking precondition **P-1**.

## Round 3: Consensus & Decision
1. M4 charter grounding corrected to `FR-031..FR-034, BR-002, BR-036, NFR-007`; scope unchanged.
2. Design blueprint `05-m4-notebook-workspace-and-domain-graph.md` sealed, with arc42 §5/§6/§11 deltas, five new OpenAPI paths, `comp-workspace` in the catalog, and FM-401..FM-404 in the register.
3. Sprint board `M4-S1` sealed with six stories, frozen Change Matrices, risk tiers, `build_vs_buy_ref`/`tests`/`observability` on every story, and a verified DAG.
4. **PM approves the M4 plan for implementation, conditional on P-1.**
5. Two pre-existing defects (`B-1` stale tracked `.js` artifacts, `B-2` 187 TS errors in `@repo/ingestion`) are captured as `DRIFT-AUDIT-002` — the M3 close-out recorded `6/6 build; 6/6 typecheck`, which the repository does not support.

## Sealed Decision Register

| Decision ID | Summary | Owner | Sealed State |
|---|---|---|---|
| **M4-PM-001** | Foreign/unowned notebook → HTTP 404, 0 credits debited; supersedes `epic-004` AC-3's 403 | `pm-agent` | Sealed |
| **M4-PM-002** | Approve M4 plan with blocking precondition P-1 on baseline repair | `pm-agent` | Sealed |
| **M4-PM-003** | Charter grounding corrected to FR-031..034 / BR-002 / BR-036 / NFR-007 | `pm-agent` | Sealed |
| **M4-ARCH-001** | Adjacency-list graph in Neon/Kysely over a dedicated graph DB | `architect-agent` | Sealed |
| **M4-ARCH-002** | Ownership is a predicate on the reading statement, not a separate probe | `architect-agent` | Sealed |
| **M4-ARCH-003** | Edge type enforced twice: API union **and** DB `CHECK` | `architect-agent` | Sealed |
| **M4-SPR-001** | Six stories, DAG `S4.1 → S4.2 → {S4.3,S4.4,S4.5} → S4.6` | `sprint-agent` | Sealed |
| **M4-SPR-002** | No story claims an `apps/` path; status codes bind at the service layer | `sprint-agent` | Sealed |

## Rejected Alternatives (strongest argument, and why it lost)
- **Neo4j** — elegance of traversal primitives; lost because it trades the `NFR-016` $0.00/month ceiling for traversal depth M4 never uses.
- **403 for foreign notebooks** — explicitness for audit readers; lost because it is an existence oracle and contradicts a live contract.
- **Approve-and-ignore the red baseline** — speed; lost because it would make every M4 verification result unattributable.
- **Repair-first, approve-later** — cleanest tree; lost because it blocks design work that has already passed on work owned elsewhere.

## Handoff & Next Steps
1. `developer-agent` clears **P-1** (delete stale `packages/contracts/src/{ingestion,metering}.js`, repair `@repo/ingestion` typecheck/build, re-record M3 evidence).
2. Then `developer-agent` starts **S4.1** and proceeds in dependency order.
3. `test-agent` certifies story closure — this approval does not substitute for verification.
4. `sprint-agent` reconciles board rows from evidence as stories complete.
5. `hygiene-agent` owns the outstanding `index.md` and `workflow-context.yaml` rows.

## Implementation note
This is a DBW documentation and coordination record. All approvals are represented through workspace artifacts; downstream agent work proceeds from those artifacts rather than from this chat turn.

---

# Session 3 — M5 Planning Round-Table: 6-Phase Grounded Reasoning Engine (PM · Architect · Sprint)

## Session Meta
- **Date:** 2026-10-27T08:00:00.000Z
- **State:** Phase 4 (Milestone Detail) → Phase 5 (Implementation Planning)
- **Task:** Plan M5 6-Phase Grounded Reasoning Engine & Dual-Provider Inference (`v0.5.0`) for implementation; author architecture blueprint, shared contracts, and sprint board with frozen Change Matrices; then verify and seal PM approval.
- **Mode:** Planning → Design → Board → Approval
- **Session Chairs:** `pm-agent` (Stage 2 Owner), `architect-agent` (Stage 3 Owner), `sprint-agent` (Board Owner)
- **Log:** this file · **Dispatches:** DSP-021..DSP-025 · **Handoff:** `handoff-014-sprint-to-developer-m5`

## Participants
- `pm-agent` — requirements governance, grounding validation, risk-tier classification, approval authority
- `architect-agent` — 6-phase reasoning pipeline design, dual-provider circuit breaker architecture, OpenAPI contract, component catalog
- `sprint-agent` — epic slicing, frozen Change Matrices, sprint board authoring (`sprint-status.yaml`), story cards
- `data-architect` — Upstash Vector top-3 multi-vector query structure, cosine similarity thresholding, tenant filtering
- `security-architect` — zero-hallucination prompt boundaries, tenant context isolation, secret redaction in streaming logs
- `failure-mode-specialist` — bottom-up FMEA sweep for LLM quota exhaustion, stream dropouts, and circuit-breaker failover (FM-501..FM-505)

## Round 1: Positions
- **PM Agent position:**
  - Milestone M5 delivers the core reasoning spine (`v0.5.0`) bridging user prompts with ingested knowledge.
  - Grounding is anchored in `project-brief.md` (`FR-008..FR-011`, `FR-039`, `BR-002`, `BR-007..BR-009`, `BR-027`, `NFR-001..NFR-003`, `NFR-022`) and `ADR-0004` (Unified Upstash Serverless & Groq Fallback).
  - Non-negotiable requirements:
    1. Query decomposition into 2 to 5 targeted sub-questions (`FR-008`, `BR-007`).
    2. HyDE hypothetical passage generation per sub-question (`FR-009`).
    3. Multi-vector search retrieving at most top-3 chunks per sub-question with tenant payload filter (`FR-010`, `BR-008`).
    4. Grounded synthesis with clickable inline citations `[1]`, `[2]` linking directly to document chunk previews (`FR-011`, `BR-009`).
    5. Primary Google Gemini 1.5/2.0 Flash with automatic, transparent circuit-breaker fallback to Groq Llama-3.3-70B Versatile on HTTP 429 quota exhaustion (`NFR-022`, `ADR-0004`).
    6. Unavailable or still-processing source documents explicitly enumerated in the answer footer (`FR-039`).
    7. Overall pipeline latency SLA: p90 < 4,500ms (`NFR-003`), vector retrieval p95 < 100ms (`NFR-001`), TTFT p90 < 1,500ms (`NFR-002`).
  - Baseline health: clean workspace, 101/101 tests pass, 8/8 packages build and typecheck cleanly. No blocking precondition needed.
- **Architect Agent position:**
  - Reasoning logic belongs in a new workspace package `@repo/reasoning`, consuming `@repo/contracts`, `@repo/config`, and `@repo/metering`.
  - The 6-phase pipeline structure:
    1. Phase 1: Query Decomposition (heuristic + few-shot prompt producing 2-5 sub-questions).
    2. Phase 2: HyDE Synthesis (concise synthetic answers bridging vocabulary mismatch).
    3. Phase 3: Query & HyDE Embeddings (Google `gemini-embedding-001` with in-process ONNX fallback from `@repo/ingestion`).
    4. Phase 4: Top-3 Scoped Vector Retrieval (`@upstash/vector` query with mandatory `{ user_id }` tenant filter).
    5. Phase 5: Context Assembly & Citation Deduplication (group by document, build deterministic numeric citation tags `[1]`, `[2]`, prune duplicate spans).
    6. Phase 6: Grounded Synthesis & Streaming (primary Google Gemini Flash via `@google/genai` or REST stream; intercept 429 / rate limit errors and transparently fail over to Groq Llama-3.3-70B via `groq-sdk` with header `x-fallback-provider: groq`).
  - Strict separation of concern: Provider clients reside behind adapter ports (`InferenceProvider` interface) so LLM swap and test mocking require zero changes to the orchestration pipeline.
  - No database migration required for M5 (pure stateless reasoning execution; conversation message persistence is handled by existing M1 schemas).
- **Sprint Agent position:**
  - EPIC-005 breaks into six atomic, single-session stories (S5.1 to S5.6):
    - `S5.1`: Shared reasoning contracts, DTO types, and streaming event envelopes in `@repo/contracts`.
    - `S5.2`: Query decomposition (Phase 1) and HyDE synthetic passage generator (Phase 2).
    - `S5.3`: Multi-vector top-3 retrieval, parallel execution, and context deduplication/assembly (Phase 3..5).
    - `S5.4`: Grounded synthesis streaming via Google Gemini Flash with clickable inline citations and unavailable sources footer (Phase 6).
    - `S5.5`: Transparent Groq Llama-3.3-70B fallback circuit-breaker on Gemini 429 quota exhaustion.
    - `S5.6`: End-to-end integration test harness, latency benchmark verification, and documentation sync.
  - Dependency graph forms a clean DAG: `S5.1 → S5.2 → S5.3 → S5.4 → S5.5 → S5.6`.
  - All stories conform strictly to the Two-Floor boundary (no root files in `allowed_files`).

## Round 2: Trade-offs & Deliberation
- **Trade-off 1: Dual-Provider Fallback Orchestration — In-Process Circuit Breaker vs External Gateway/Proxy**
  - *Option A (External Gateway / Proxy e.g. Portkey, LiteLLM):* Unified external URL. *Cost:* Introduces a 5th external vendor/service, potential latency overhead, breaks the zero-cost $0.00/month architectural ceiling (`NFR-016`), and violates `ADR-0004`.
  - *Option B (In-Process Adaptive Circuit Breaker):* Lightweight TypeScript retry and fallback interceptor wrapping SDK calls with typed error detection (`429 RESOURCE_EXHAUSTED` / `quota_exceeded`).
  - *Synthesis & Consensus:* Option B adopted. Zero additional infrastructure costs, sub-millisecond switching overhead, and deterministic unit-testability using mock providers.
- **Trade-off 2: Sub-Question & HyDE Generation — Sequential vs Parallel Execution**
  - *Option A (Sequential):* Generate sub-questions, then sequentially generate HyDE passages for each. *Cost:* 3 sub-questions × 800ms = 2,400ms alone, exhausting >50% of the 4,500ms E2E latency budget (`NFR-003`).
  - *Option B (Batched / Parallel Generation):* Single structured decomposition prompt returning `{ sub_questions: [{ text, hyde_passage }] }` or generating sub-questions and dispatching `Promise.all` for HyDE passages.
  - *Synthesis & Consensus:* Option B adopted. A unified single-prompt decomposition and HyDE generation or concurrent `Promise.all` execution completes within < 1,200ms, preserving headroom for vector retrieval and token streaming.
- **Trade-off 3: Vector Retrieval Concurrency across Sub-Questions**
  - *Option A (Serial Queries):* Query Upstash Vector sequentially for each sub-question. *Cost:* 3 to 5 HTTP round trips × 40ms = 120–200ms; breaches `NFR-001` p95 < 100ms budget.
  - *Option B (Parallel `Promise.all` Queries):* Dispatch vector queries concurrently with individual tenant filter payload `{ user_id }` and `top_k: 3`.
  - *Synthesis & Consensus:* Option B adopted. Upstash Vector handles concurrent REST queries cleanly; parallel execution resolves in ~45ms p95, easily satisfying `NFR-001`.
- **Trade-off 4: Citation Format & Frontend Anchoring Protocol**
  - *Option A (Raw Markdown Footnotes `[^doc_1_chunk_2]`):* Standard markdown syntax. *Cost:* Parsing and mapping footnotes on streaming tokens in real time requires buffering or complex regex lookaheads on the client.
  - *Option B (Structured Inline Anchors `[1]`, `[2]` paired with a Citation Reference Manifest):* Stream tokens contain numeric anchors `[1]`, `[2]`; the initial metadata event or concluding event emits `citations: [{ index: 1, document_id, document_title, snippet, chunk_id }]`.
  - *Synthesis & Consensus:* Option B adopted. Enables instant clickable card previews in the UI, conforms to `FR-011` / `FR-033`, and simplifies parsing.
- **Trade-off 5: Unavailable Sources Disclosure Protocol (`FR-039`)**
  - *Option A (Silent Omission):* Only retrieve from indexed documents; ignore pending/failed sources. *Cost:* Directly violates `FR-039` and creates user confusion when an uploaded document produces no answers.
  - *Option B (Explicit Footer Enumeration):* During context assembly, check the notebook's documents state from `@repo/db`; if any document has status `queued`, `processing`, or `failed`, append an informational footer: `"Sources currently unavailable or processing: [Doc Title (processing)]"`.
  - *Synthesis & Consensus:* Option B adopted. Fully satisfies `FR-039` without penalizing synthesis quality.

## Round 3: Consensus & Decisions
1. **Charter & Grounding Confirmed:** Milestone M5 scope encompasses `FR-008..FR-011`, `FR-039`, `BR-002`, `BR-007..BR-009`, `BR-027`, `NFR-001..NFR-003`, `NFR-022`. Risk tier classified as **HIGH** due to dual-provider external inference, circuit-breaker failover, and strict latency SLAs.
2. **Architecture Blueprint Sealed:** `05-m5-grounded-reasoning-engine.md` authored and approved, detailing the 6-phase pipeline, adapter contracts, Upstash Vector retrieval, Gemini Flash primary, Groq Llama-3.3 fallback, and citation streaming.
3. **Sprint Board Certified:** Board `M5-S1` authored in `m5-reasoning-engine/sprint-status.yaml` with six stories (`S5.1` to `S5.6`), explicit Change Matrices, and verified DAG.
4. **PM Approval Granted:** `pm-agent` approves the M5 sprint plan for developer handoff. Because the workspace baseline is 100% green (101/101 pass, 8/8 build/typecheck pass), approval is **unconditional**.

## Sealed Decision Register

| Decision ID | Summary | Owner | Sealed State |
|---|---|---|---|
| **M5-PM-001** | Scope grounded in FR-008..011, FR-039, BR-002, BR-007..009, BR-027, NFR-001..003, NFR-022; classified HIGH risk | `pm-agent` | Sealed |
| **M5-PM-002** | Unconditional PM approval for M5 sprint plan handoff to developer-agent | `pm-agent` | Sealed |
| **M5-ARCH-001** | In-process reasoning package `@repo/reasoning` with adapter interfaces for Google and Groq | `architect-agent` | Sealed |
| **M5-ARCH-002** | In-process circuit-breaker: transparent Groq Llama-3.3-70B failover on Gemini 429 quota exhaustion with `x-fallback-provider` header | `architect-agent` | Sealed |
| **M5-ARCH-003** | Parallel sub-question decomposition and concurrent Upstash Vector queries (< 100ms p95) | `architect-agent` | Sealed |
| **M5-ARCH-004** | Structured inline citation anchors `[1]`, `[2]` with document preview manifest and FR-039 unavailable sources footer | `architect-agent` | Sealed |
| **M5-SPR-001** | Six single-session stories `S5.1 → S5.2 → S5.3 → S5.4 → S5.5 → S5.6` with frozen Change Matrices | `sprint-agent` | Sealed |
| **M5-SPR-002** | Mock provider harnesses built in tests to enable deterministic CI testing of Gemini 429 failover without consuming live quotas | `sprint-agent` | Sealed |

## Rejected Alternatives (strongest argument, and why it lost)
- **External AI Gateway (Portkey / LiteLLM)** — unified dashboard and routing; lost because it adds an external cloud dependency, latency, and operational cost threatening the $0.00/month invariant (`NFR-016`).
- **Sequential Decomposition & HyDE** — simplicity of single-threaded code; lost because it consumes > 2,400ms, violating the 4,500ms pipeline SLA (`NFR-003`).
- **Footnote-based Citations (`[^1]`)** — standard markdown; lost because streaming token parsing on client requires complex buffering, whereas numeric anchors `[1]` with an accompanying manifest render immediately.
- **Silent Omission of Unavailable Documents** — reduces token count in prompt; lost because it breaches explicit requirement `FR-039` and creates opaque failure modes for users.

## Handoff & Next Steps
1. Hand off to `developer-agent` via `handoff-014-sprint-to-developer-m5.md`.
2. `developer-agent` starts with **S5.1** (shared reasoning contracts in `@repo/contracts`) and proceeds sequentially through **S5.6**.
3. `test-agent` verifies each story against acceptance criteria and certifies closure.
4. `sprint-agent` maintains board progress in `m5-reasoning-engine/sprint-status.yaml`.

## Implementation note
This is a DBW documentation and coordination record. All approvals are represented through workspace artifacts; downstream agent work proceeds from those artifacts rather than from this chat turn.
