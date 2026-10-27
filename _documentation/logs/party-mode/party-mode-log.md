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

---

# Session 4 — M6 Planning Round-Table: Pluggable Long-Term Memory Store (PM · Architect · Sprint)

## Session Meta
- **Date:** 2026-10-27T09:15:00.000Z
- **State:** Phase 4 (Milestone Detail) → Phase 5 (Implementation Planning)
- **Task:** Plan M6 Pluggable Long-Term Memory Store (`v0.6.0`) for implementation; author architecture blueprint, shared contracts, and sprint board with frozen Change Matrices; then verify and seal PM approval.
- **Mode:** Planning → Design → Board → Approval
- **Session Chairs:** `pm-agent` (Stage 2 Owner), `architect-agent` (Stage 3 Owner), `sprint-agent` (Board Owner)
- **Log:** this file · **Dispatches:** DSP-026..DSP-030 · **Handoff:** `handoff-015-sprint-to-developer-m6`

## Participants
- `pm-agent` — requirements governance, grounding validation, risk-tier classification, approval authority
- `architect-agent` — hexagonal MemoryStore architecture, in-process Mem0 adapter design, extraction seam, OpenAPI contract, component catalog
- `sprint-agent` — epic slicing, frozen Change Matrices, sprint board authoring (`sprint-status.yaml`), story cards
- `data-architect` — Upstash Redis key topology, Upstash Vector semantic memory payload and namespace filtering
- `security-architect` — cross-tenant isolation enforcement (`BR-002`, `BR-019`), user memory purge cascades, prompt injection hygiene
- `failure-mode-specialist` — FMEA sweep for memory store degradation, embedding latency, and cold-start fallback (FM-601..FM-604)

## Round 1: Positions
- **PM Agent position:**
  - Milestone M6 introduces persistent cross-session memory (`v0.6.0`), allowing Contextual to remember salient user preferences, previous research themes, and domain constraints across sessions.
  - Grounding is anchored in `project-brief.md` (`FR-019`, `FR-020`, `FR-023`, `BR-002`, `BR-018`, `BR-019`, `BR-020`, `NFR-008`, `NFR-014`, `NFR-016`, `NFR-019`) and `ADR-0004` (Unified Upstash Serverless Ecosystem).
  - Non-negotiable requirements:
    1. 100% of memory interactions route exclusively through abstract `MemoryStore` interface; domain modules MUST NEVER import vendor memory SDKs directly (`FR-019`, `BR-018`).
    2. Strict multi-tenant isolation: User B must never retrieve or mutate User A's memories; foreign queries return empty set or 404 (`BR-002`, `BR-019`, `AC-6.4`).
    3. Zero vendor memory fees: $0.00/month infrastructure ceiling strictly maintained with zero credit cards (`NFR-014`, `NFR-016`, `BR-020`).
    4. Memory search latency SLA: p95 query latency < 150ms (`NFR-008`, `AC-6.3`).
    5. Modular monolith extraction seam: caller routes interact with the identical `MemoryStore` interface regardless of whether running `in-process` or via a standalone worker (`FR-020`, `NFR-019`).
    6. Complete user memory purge: `deleteUserMemories(userId)` purges all episodic vectors and entity graph keys idempotently.
  - Baseline health: Green runway. 154/154 tests pass, 9/9 packages build and typecheck cleanly. No blocking precondition needed.
- **Architect Agent position:**
  - Memory capabilities belong in a new internal workspace package `@repo/memory`, consuming `@repo/contracts` and `@repo/config`.
  - Core hexagonal architecture:
    1. Port: `MemoryStore` interface exported from `@repo/contracts/src/memory.ts`.
    2. Primary Adapter: `InProcessMem0Store` in `@repo/memory` combining `@upstash/redis` (for user entity graph and session KV associations) and `@upstash/vector` (for semantic vector similarity search).
    3. Seam Adapter: `WorkerMemoryStore` in `@repo/memory` providing an HTTP-based seam client targeting a standalone worker endpoint without altering caller call sites (`FR-020`).
    4. Factory: `createMemoryStore(config)` dynamically instantiates the appropriate adapter based on environment variable `MEMORY_STORE_MODE` (`"in-process"` vs `"worker"`).
    5. Embeddings: Uses Google `gemini-embedding-001` (1,500 RPD free) with in-process `@huggingface/transformers` ONNX fallback, standardizing on 768-dim embeddings matching M3 and M5.
    6. Integration Hook: `@repo/reasoning` consumes `MemoryStore` via a pre-synthesis recall hook, appending recalled memories into LLM prompt context as user preferences.
  - OpenAPI & Catalog: Add `/users/me/memories` CRUD/search endpoints in `api-contract.openapi.yaml` and update `comp-memory` in `component-catalog.yaml`.
- **Sprint Agent position:**
  - EPIC-006 breaks into six atomic, single-session stories (S6.1 to S6.6):
    - `S6.1`: Shared memory contracts, DTO types, and `MemoryStore` interface in `@repo/contracts`.
    - `S6.2`: `@repo/memory` package scaffolding, configuration, and seam factory.
    - `S6.3`: In-process Upstash Redis entity and working memory store adapter.
    - `S6.4`: In-process Upstash Vector semantic memory retrieval adapter with tenant filtering.
    - `S6.5`: Unified in-process Mem0 memory engine adapter and standalone worker HTTP extraction seam adapter.
    - `S6.6`: Reasoning engine memory integration hook, multi-tenant isolation suite, and latency SLA benchmark.
  - Clean sequential DAG: `S6.1 → S6.2 → S6.3 → S6.4 → S6.5 → S6.6`.
  - All stories conform strictly to the Two-Floor boundary (no root files in `allowed_files`).

## Round 2: Trade-offs & Deliberation
- **Trade-off 1: Memory Persistence Engine — In-Process Upstash Stack vs Managed Mem0 Cloud SaaS vs Local SQLite**
  - *Option A (Managed Mem0 Cloud SaaS):* Hosted managed platform. *Cost:* Incurs recurring monthly vendor fees ($19–$99/month), requiring credit cards and violating the $0.00/month infrastructure ceiling (`NFR-014`, `NFR-016`).
  - *Option B (Local SQLite / LibSQL):* File-backed local storage. *Cost:* Serverless edge/ephemeral functions on Vercel Hobby lose local file storage on spin-down; cross-instance memory requires distributed storage.
  - *Option C (In-Process Mem0 Adapter backed by Upstash Redis & Upstash Vector):* Unified serverless persistence using existing free Upstash infrastructure per `ADR-0004`.
  - *Synthesis & Consensus:* Option C adopted. Strictly satisfies $0.00/month ceiling, serverless stateless runtime compatibility, and sub-150ms latency SLA.
- **Trade-off 2: Extraction Seam Architecture — Dynamic Factory vs Compile-Time Hardcoded Import**
  - *Option A (Hardcoded Monolith Import):* Directly instantiate `InProcessMem0Store` in callers. *Cost:* Violates `FR-020` and `NFR-019`, making extraction to a standalone worker require invasive refactoring across callers.
  - *Option B (Polymorphic Factory with Seam Adapter):* `createMemoryStore()` instantiates either `InProcessMem0Store` or `WorkerMemoryStore` based on config.
  - *Synthesis & Consensus:* Option B adopted. Callers only import `MemoryStore` interface from `@repo/contracts`, ensuring complete extraction seam portability with zero code changes (`AC-6.1`).
- **Trade-off 3: Memory Semantic Embeddings — Reusing Gemini Embeddings vs Secondary Provider**
  - *Option A (Separate Cloudflare Workers AI Embeddings):* Dedicated embedding endpoint. *Cost:* Re-introduces Cloudflare Workers AI free quota friction (10k Neurons/day) superseded by `ADR-0004`.
  - *Option B (Google `gemini-embedding-001` with In-Process ONNX Fallback):* Unified embedding pipeline matching M3/M5.
  - *Synthesis & Consensus:* Option B adopted. 768-dim embeddings integrate natively with Upstash Vector index without schema divergence.
- **Trade-off 4: Reasoning Integration Lifecycle — Asynchronous Post-Synthesis Ingestion vs Synchronous In-Line Ingestion**
  - *Option A (Synchronous In-Line Ingestion):* Extract and index memories during token generation stream. *Cost:* Incurs 500–1200ms of LLM extraction and vector upsert latency during user streaming, degrading TTFT and E2E latency.
  - *Option B (Pre-Synthesis Recall + Asynchronous Post-Response Ingestion):* Query memory before synthesis (p95 < 150ms); dispatch memory extraction and upsert asynchronously post-response via non-blocking promise or QStash.
  - *Synthesis & Consensus:* Option B adopted. Preserves streaming response responsiveness while guaranteeing cross-session persistence.
- **Trade-off 5: Tenant Memory Deletion Cascade (`BR-002`, `BR-019`)**
  - *Option A (Soft-Delete Flag Only):* Set `deleted: true` on Redis entities. *Cost:* Leaves vectors searchable in Upstash Vector unless complex filters are applied; risks data leakage.
  - *Option B (Atomic Cascade Purge):* `deleteUserMemories(userId)` queries user vector IDs and issues parallel delete in Upstash Vector, while deleting Redis keys and index sets atomically.
  - *Synthesis & Consensus:* Option B adopted. Guarantees complete data sanitization and verifiable multi-tenant isolation.

## Round 3: Consensus & Decisions
1. **Charter & Grounding Confirmed:** Milestone M6 scope encompasses `FR-019`, `FR-020`, `FR-023`, `BR-002`, `BR-018`, `BR-019`, `BR-020`, `NFR-008`, `NFR-014`, `NFR-016`, `NFR-019`. Risk tier classified as **MEDIUM**.
2. **Architecture Blueprint Sealed:** `05-m6-pluggable-long-term-memory-store.md` authored and approved, detailing the hexagonal MemoryStore architecture, in-process Mem0 Upstash adapter, extraction seam, and reasoning integration.
3. **Sprint Board Certified:** Board `M6-S1` authored in `m6-pluggable-memory/sprint-status.yaml` with six stories (`S6.1` to `S6.6`), explicit Change Matrices, and verified DAG.
4. **PM Approval Granted:** `pm-agent` approves the M6 sprint plan for developer handoff. Because the workspace baseline is 100% green (154/154 pass, 9/9 build/typecheck pass), approval is **unconditional**.

## Sealed Decision Register

| Decision ID | Summary | Owner | Sealed State |
|---|---|---|---|
| **M6-PM-001** | Scope grounded in FR-019, FR-020, FR-023, BR-002, BR-018..020, NFR-008, NFR-014, NFR-016, NFR-019; classified MEDIUM risk | `pm-agent` | Sealed |
| **M6-PM-002** | Unconditional PM approval for M6 sprint plan handoff to developer-agent | `pm-agent` | Sealed |
| **M6-ARCH-001** | Hexagonal `MemoryStore` interface in `@repo/contracts` with in-process `@repo/memory` package | `architect-agent` | Sealed |
| **M6-ARCH-002** | In-process Mem0 engine backed by Upstash Redis (entity graph/KV) and Upstash Vector (768-dim semantic search) | `architect-agent` | Sealed |
| **M6-ARCH-003** | Configurable extraction seam: dynamic factory instantiating `InProcessMem0Store` or `WorkerMemoryStore` with zero caller changes | `architect-agent` | Sealed |
| **M6-ARCH-004** | Pre-synthesis memory recall hook injecting user context into prompt + asynchronous post-response memory extraction | `architect-agent` | Sealed |
| **M6-SPR-001** | Six single-session stories `S6.1 → S6.2 → S6.3 → S6.4 → S6.5 → S6.6` with frozen Change Matrices | `sprint-agent` | Sealed |
| **M6-SPR-002** | Multi-tenant isolation test harness verifying zero cross-user memory leakage and p95 < 150ms search latency SLA | `sprint-agent` | Sealed |

## Rejected Alternatives (strongest argument, and why it lost)
- **Managed Mem0 Cloud SaaS** — effortless setup and fully hosted dashboard; lost because recurring monthly subscription fees ($19+/mo) violate the non-negotiable $0.00/month infrastructure ceiling (`NFR-014`, `NFR-016`).
- **Hardcoded In-Process Monolith Imports** — faster initial implementation; lost because it violates modular extraction seam requirements (`FR-020`, `NFR-019`), creating severe technical debt for future worker decoupling.
- **Synchronous In-Line Memory Upsert** — ensures immediate consistency before streaming starts; lost because it adds 500–1200ms latency to the user's chat response stream, violating interactive performance budgets.
- **Soft-Delete Only for User Memories** — faster deletion operations; lost because leaving vectors in Upstash Vector introduces cross-tenant leakage risks and violates complete data erasure invariants (`BR-002`, `BR-019`).

## Handoff & Next Steps
1. Hand off to `developer-agent` via `handoff-015-sprint-to-developer-m6.md`.
2. `developer-agent` starts with **S6.1** (shared memory contracts in `@repo/contracts`) and proceeds sequentially through **S6.6**.
3. `test-agent` verifies each story against acceptance criteria and certifies closure.
4. `sprint-agent` maintains board progress in `m6-pluggable-memory/sprint-status.yaml`.

## Implementation note
This is a DBW documentation and coordination record. All approvals are represented through workspace artifacts; downstream agent work proceeds from those artifacts rather than from this chat turn.

---

# Session 5 — M7 Planning Round-Table: Autonomous Maintenance Crons & Observability (PM · Architect · Sprint)

## Session Meta
- **Date:** 2026-10-27T10:45:00.000Z
- **State:** Phase 4 (Milestone Detail) → Phase 5 (Implementation Planning)
- **Task:** Plan M7 Autonomous Maintenance Crons & Observability (`v0.7.0`) for implementation; author architecture blueprint, contracts, and sprint board with frozen Change Matrices; then verify and seal PM approval.
- **Mode:** Planning → Design → Board → Approval
- **Session Chairs:** `pm-agent` (Stage 2 Owner), `architect-agent` (Stage 3 Owner), `sprint-agent` (Board Owner)
- **Log:** this file · **Dispatches:** DSP-031..DSP-035 · **Handoff:** `handoff-017-sprint-to-developer-m7`

## Participants
- `pm-agent` — requirements governance, grounding validation, risk-tier classification, approval authority
- `architect-agent` — scheduled maintenance crons architecture, Upstash QStash webhook receiver, retention sweeper, 30-day tombstone HTTP 410 design, Pino structured logging, secret redaction, and OpenTelemetry OTLP pipeline
- `sprint-agent` — epic slicing, frozen Change Matrices, sprint board authoring (`sprint-status.yaml`), story cards (S7.1 to S7.6)
- `observability-specialist` — structured JSON logging schema, W3C `traceparent` context propagation, Better Stack OTLP export, heartbeat health probe
- `security-architect` — QStash webhook signature verification (`Upstash-Signature`), PII & credential redaction regex filters (`NFR-026`, `BR-012`), tenant data isolation during retention purge (`BR-002`)
- `data-architect` — Neon PostgreSQL retention sweeper queries, `notebooks` table tombstone transition, Upstash Vector vector point deletion cascade, 30-day hard purge TTL
- `failure-mode-specialist` — FMEA sweep for QStash signature spoofing, partial retention purge failure, log-flooding, Better Stack OTLP timeout/quota exhaustion (FM-701..FM-705)

## Round 1: Positions
- **PM Agent position:**
  - Milestone M7 introduces production-grade autonomous maintenance crons and centralized observability (`v0.7.0`).
  - Grounding is anchored in `project-brief.md` (`FR-015`, `FR-040..FR-042`, `BR-010..BR-012`, `BR-025..BR-027`, `BR-037..BR-040`, `BR-044`, `NFR-009`, `NFR-017`, `NFR-026`, `NFR-031`, `NFR-032`) and `ADR-0004` (Unified Upstash Serverless Ecosystem).
  - Non-negotiable requirements:
    1. Daily 08:00 UTC credit reset executed via QStash HTTP trigger and idempotent Redis Lua script (`BR-025`, `BR-026`).
    2. Weekly retention cascade sweeper identifying notebooks idle for ≥ 7 days (`FR-041`, `BR-037`).
    3. Idempotent all-or-nothing cascade deletion: deletes Upstash Vector embeddings, purges child nodes/edges in Postgres, and sets a 30-day tombstone (`BR-039`, `BR-040`, `BR-044`).
    4. Tombstone access protocol: requests to expired/tombstoned notebooks return HTTP 410 `NOTEBOOK_EXPIRED` (RFC 9457 Problem Details) with deletion timestamp (`BR-044`, `AC-7.2`). Hard deletion executes after 30 days.
    5. Structured JSON logging via Pino: 100% of logs tagged with `correlation_id` and W3C `traceparent` (`FR-042`, `NFR-009`, `BR-010`).
    6. Strict credential and PII redaction: regex-based sanitizer stripping Bearer tokens, Clerk JWTs/keys, Upstash/Google API keys, and connection strings before stdout emission (`NFR-026`, `BR-012`).
    7. OpenTelemetry OTLP export: export telemetry spans to Better Stack's free tier via OTLP/HTTP within $0.00/month infrastructure ceiling (`NFR-009`, `NFR-016`).
    8. Deprecation note: Per `ADR-0004`, Upstash Vector never suspends from inactivity; the artificial 48-hour Qdrant keepalive probe is officially deprecated.
  - Baseline health: Monorepo test suite has 204 pass, 0 fail across 41 files; 10/10 packages build and typecheck cleanly. No blocking precondition needed.
- **Architect Agent position:**
  - Observability and maintenance capabilities belong in a dedicated internal workspace package `@repo/observability`, consuming `@repo/contracts`, `@repo/config`, `@repo/db`, and `@repo/metering`.
  - Architecture breakdown:
    1. **Core Logging & Redaction (`@repo/observability`):** Pino logger initialized with ISO timestamp, level, and metadata; Node `AsyncLocalStorage` correlation context automatically injecting `correlation_id` into all log calls; deep redaction transformer replacing secrets and PII with `[REDACTED]`.
    2. **OpenTelemetry Telemetry (`@repo/observability`):** OpenTelemetry Node SDK tracer provider exporting spans to Better Stack via OTLP HTTP (`OTEL_EXPORTER_OTLP_ENDPOINT`, `BETTER_STACK_SOURCE_TOKEN`); heartbeat emitter recording cron liveness (`NFR-031`).
    3. **QStash Webhook Security (`@repo/observability`):** Webhook receiver verifying `Upstash-Signature` header using `QSTASH_CURRENT_SIGNING_KEY` / `QSTASH_NEXT_SIGNING_KEY` to reject unauthorized external invocations with HTTP 401.
    4. **Retention Cascade & Tombstone Engine (`@repo/db` & `@repo/observability`):** Kysely retention queries selecting notebooks with `updated_at < NOW() - 7 days`; atomic deletion helper purging vector points from Upstash Vector by `notebook_id` and dropping relational nodes/edges; updates `deleted_at = NOW()` and `expires_at = NOW() + 30 days`; route handler responds with RFC 9457 HTTP 410 `NOTEBOOK_EXPIRED`.
    5. **Hard Tombstone Purge:** Sweeper identifies notebooks with `deleted_at < NOW() - 30 days` and hard-deletes the notebook record permanently.
- **Sprint Agent position:**
  - EPIC-007 breaks into six atomic, single-session stories (S7.1 to S7.6):
    - `S7.1`: Shared maintenance & observability contracts, DTO types, and RFC 9457 error catalogue verification in `@repo/contracts`.
    - `S7.2`: Package scaffolding `@repo/observability`, AsyncLocalStorage correlation context, Pino structured JSON logger, and secret/PII redaction engine.
    - `S7.3`: OpenTelemetry tracing provider, W3C `traceparent` context propagator, Better Stack OTLP exporter, and heartbeat liveness monitor.
    - `S7.4`: QStash webhook receiver with cryptographic signature verification and idempotent scheduled crons driver (daily credit reset trigger).
    - `S7.5`: 7-day retention cascade sweeper, Upstash Vector point purge, Neon PostgreSQL cascade, and 30-day tombstone HTTP 410 engine.
    - `S7.6`: End-to-end integration test suite, latency/throughput verification, and documentation synchronization across contracts and roadmap.
  - Dependency graph forms a clean DAG: `S7.1 → S7.2 → S7.3 → S7.4 → S7.5 → S7.6`.
  - All stories conform strictly to the Two-Floor boundary (no root files in `allowed_files`).

## Round 2: Trade-offs & Deliberation
- **Trade-off 1: Scheduled Cron Execution Engine — Upstash QStash HTTP Webhooks vs Vercel Cron Jobs vs Node-cron / BullMQ**
  - *Option A (Self-Hosted Node-cron / BullMQ process):* Requires a persistent, long-running Node container. *Cost:* Incompatible with Vercel Hobby serverless deployment and violates `ADR-0004`.
  - *Option B (Vercel Cron Jobs):* Native Vercel hobby feature. *Cost:* Hobby plan permits only 1 cron job per day; cannot support both daily credit reset (08:00 UTC) and weekly retention cascade, plus lacks signature verification.
  - *Option C (Upstash QStash Scheduled HTTP Webhooks):* Native serverless scheduled HTTP triggers signed with HMAC SHA-256 (`Upstash-Signature`).
  - *Synthesis & Consensus:* Option C adopted per `ADR-0004`. Supports unlimited schedules within 500 msgs/day free tier, signed webhook verification, automatic retries with exponential backoff, and zero persistent infrastructure costs.
- **Trade-off 2: Retention Cascade Purge Strategy — Atomic Vector + DB Cascade with 30-Day Tombstone vs Hard Immediate Delete vs Soft-Delete Only**
  - *Option A (Hard Immediate Deletion):* Instantly wipe all DB records and vectors with zero tombstone. *Cost:* Breaches `BR-044`; client requests return generic 404 rather than explaining that the personal notebook expired due to 7 days of inactivity.
  - *Option B (Soft-Delete Flag Only):* Set `is_deleted = true` without deleting vectors or stage files. *Cost:* Violates zero-cost and privacy guarantees; orphan vector embeddings persist indefinitely in Upstash Vector, wasting index quota and risking cross-tenant leakage (`BR-002`, `BR-039`).
  - *Option C (Two-Tier Cascade: Immediate Vector/Node Purge + 30-Day Tombstone Row):* Immediately purge all vector embeddings from Upstash Vector and cascade-delete relational nodes/edges; retain only a minimal tombstone record on `notebooks` (`deleted_at = NOW()`, `expires_at = NOW() + 30 days`) returning HTTP 410 `NOTEBOOK_EXPIRED`. Hard purge executes after 30 days.
  - *Synthesis & Consensus:* Option C adopted. Strictly satisfies `FR-041`, `BR-037..BR-040`, `BR-044`, and guarantees zero orphaned vector storage while giving users deterministic expiry notices.
- **Trade-off 3: Logging Framework & Redaction Architecture — Pino with AsyncLocalStorage vs Console.log Wrappers vs Winston**
  - *Option A (Console.log Wrapper):* Simple monkey-patching of `console.log`. *Cost:* Lacks structured JSON fields, high serialization overhead, poor performance under concurrency, and high risk of leaking nested secrets.
  - *Option B (Winston with Transports):* Heavy logging framework with file and remote transports. *Cost:* Heavy bundle footprint, slower JSON serialization than Pino, complex transport configuration for serverless functions.
  - *Option C (Pino Logger with AsyncLocalStorage Context & Deep Redaction):* Fast JSON logger (5x faster than Winston) paired with Node `AsyncLocalStorage` for transparent correlation ID propagation and regex-based redaction of Bearer tokens, API keys, and connection strings.
  - *Synthesis & Consensus:* Option C adopted. Delivers sub-millisecond logging overhead, enforces strict JSON schema (`{ timestamp, level, correlation_id, event, payload }`), and guarantees secret sanitization (`NFR-026`).
- **Trade-off 4: Telemetry & Tracing Integration — Standard OpenTelemetry SDK with HTTP OTLP Exporter vs Proprietary Better Stack SDK**
  - *Option A (Proprietary Better Stack Logtail SDK):* Directly use `@logtail/node`. *Cost:* Vendor lock-in; violates vendor-neutral telemetry standards (`FR-023`, `NFR-009`) and complicates multi-cloud tracing.
  - *Option B (Standard OpenTelemetry Node SDK with OTLP/HTTP Exporter targeting Better Stack):* Instrument using standard `@opentelemetry/api` and `@opentelemetry/exporter-trace-otlp-http` pointing to Better Stack OTLP ingest endpoint.
  - *Synthesis & Consensus:* Option B adopted. Fully compliant with OpenTelemetry and W3C trace context standards (`NFR-009`); operates seamlessly within Better Stack free tier quotas ($0.00/month).
- **Trade-off 5: 30-Day Tombstone Client HTTP Protocol — HTTP 410 NOTEBOOK_EXPIRED vs HTTP 404 NOT_FOUND**
  - *Option A (Return 404 Not Found):* Treat expired notebooks identically to non-existent ones. *Cost:* Ambiguous to user; fails `BR-044` and `AC-7.2`, which explicitly require distinguishable expiration feedback.
  - *Option B (Return HTTP 410 NOTEBOOK_EXPIRED via RFC 9457 Problem Details):* Distinct status indicating permanent resource expiration with deletion timestamp and retention policy explanation.
  - *Synthesis & Consensus:* Option B adopted. Conforms to HTTP RFC specifications (410 Gone) and uses existing member #13 in the closed 17-member RFC 9457 catalogue (`packages/contracts/src/error-catalog.ts`), requiring zero modifications to the error catalogue.

## Round 3: Consensus & Decisions
1. **Charter & Grounding Confirmed:** Milestone M7 scope encompasses `FR-015`, `FR-040..FR-042`, `BR-010..BR-012`, `BR-025..BR-027`, `BR-037..BR-040`, `BR-044`, `NFR-009`, `NFR-017`, `NFR-026`, `NFR-031`, `NFR-032`. Risk tier classified as **HIGH** due to automated data deletion, webhook cryptography, and platform-wide telemetry.
2. **Architecture Blueprint Sealed:** `05-m7-autonomous-maintenance-and-observability.md` authored and approved, detailing QStash crons, retention cascade sweeper, 30-day tombstone HTTP 410, Pino logger, secret redactor, and OpenTelemetry OTLP pipeline.
3. **Sprint Board Certified:** Board `M7-S1` authored in `m7-maintenance-observability/sprint-status.yaml` with six stories (`S7.1` to `S7.6`), explicit Change Matrices, and verified DAG.
4. **PM Approval Granted:** `pm-agent` approves the M7 sprint plan for developer handoff. Because the workspace baseline is 100% green (204/204 pass across 41 test files, 10/10 build/typecheck pass), approval is **unconditional**.

## Sealed Decision Register

| Decision ID | Summary | Owner | Sealed State |
|---|---|---|---|
| **M7-PM-001** | Scope grounded in FR-015, FR-040..042, BR-010..012, BR-025..027, BR-037..040, BR-044, NFR-009, NFR-017, NFR-026, NFR-031, NFR-032; classified HIGH risk | `pm-agent` | Sealed |
| **M7-PM-002** | Unconditional PM approval for M7 sprint plan handoff to developer-agent | `pm-agent` | Sealed |
| **M7-ARCH-001** | Dedicated first-floor package `@repo/observability` encapsulating Pino logger, AsyncLocalStorage correlation context, secret redactor, and OpenTelemetry OTLP tracing | `architect-agent` | Sealed |
| **M7-ARCH-002** | QStash webhook receiver with cryptographic `Upstash-Signature` verification guarding crons `/api/v1/crons/reset-credits` and `/api/v1/crons/retention-sweep` | `architect-agent` | Sealed |
| **M7-ARCH-003** | 7-day retention cascade sweeper purging Upstash Vector points and relational child nodes, setting 30-day tombstone returning HTTP 410 `NOTEBOOK_EXPIRED` | `architect-agent` | Sealed |
| **M7-ARCH-004** | Deep secret and PII redactor sanitizing Bearer tokens, Clerk keys, database URIs, and API tokens before log emission | `architect-agent` | Sealed |
| **M7-SPR-001** | Six single-session stories `S7.1 → S7.2 → S7.3 → S7.4 → S7.5 → S7.6` with frozen Change Matrices | `sprint-agent` | Sealed |
| **M7-SPR-002** | Comprehensive E2E test harness verifying QStash webhook verification, daily reset, retention purge, tombstone HTTP 410, and secret redaction without requiring live cloud connectivity | `sprint-agent` | Sealed |

## Rejected Alternatives (strongest argument, and why it lost)
- **Self-Hosted BullMQ / Node-cron Worker Container** — offers fine-grained queue control; lost because it requires persistent long-running infrastructure incompatible with Vercel Hobby serverless runtime and threatens the $0.00/month operational ceiling.
- **Immediate Hard Wipe of Idle Notebooks** — eliminates database rows faster; lost because it breaches explicit requirement `BR-044` and returns confusing generic 404 errors instead of informing users of expiration policy.
- **Proprietary Better Stack Logtail SDK** — fast proprietary library; lost because standard OpenTelemetry Node SDK ensures vendor-neutral W3C trace context propagation across all services (`NFR-009`).
- **Soft-Delete Only without Vector Purge** — simpler database-only update; lost because leaving orphaned vectors in Upstash Vector wastes free-tier quota and creates severe multi-tenant data leakage risks (`BR-002`, `BR-039`).

## Handoff & Next Steps
1. Hand off to `developer-agent` via `handoff-017-sprint-to-developer-m7.md`.
2. `developer-agent` starts with **S7.1** (shared observability contracts in `@repo/contracts`) and proceeds sequentially through **S7.6**.
3. `test-agent` verifies each story against acceptance criteria and certifies closure.
4. `sprint-agent` maintains board progress in `m7-maintenance-observability/sprint-status.yaml`.

## Implementation note
This is a DBW documentation and coordination record. All approvals are represented through workspace artifacts; downstream agent work proceeds from those artifacts rather than from this chat turn.


