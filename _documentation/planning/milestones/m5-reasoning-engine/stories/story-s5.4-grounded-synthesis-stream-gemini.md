---
doc_class: canonical
owner: sprint-agent
milestone: M5
story: S5.4
status: complete
risk_tier: HIGH
created: 2026-10-27
last_verified: 2026-10-27
related:
  - _documentation/planning/milestones/m5-reasoning-engine/sprint-status.yaml
  - _documentation/planning/milestones/m5-reasoning-engine/milestone.md
  - _documentation/planning/architecture/05-m5-grounded-reasoning-engine.md
supersedes: []
regenerable: false
pinned: false
---

# S5.4 — Grounded Synthesis Streaming via Google Gemini Flash (Phase 6)

> **Work Unit:** WU-M5-4 · **Effort:** 5 · **Priority:** p0 · **Risk Tier:** HIGH  
> **Owner:** `developer-agent` · **Depends on:** S5.3

```mermaid
graph TD
    CTX["Assembled Context + Citations"] --> GUARD["Metering Guard<br/>Debit 0.5 Credit"]
    GUARD --> GEMINI["Google Gemini Flash<br/>Grounded Prompt Envelope"]
    GEMINI --> STREAM["SSE Stream<br/>Tokens + Citations"]
    STREAM --> TEST["tests/reasoning/<br/>synthesis-stream.test.ts"]

    classDef blue fill:#E8F0FE,stroke:#4285F4,stroke-width:1.5px,color:#174EA6;
    classDef green fill:#E6F4EA,stroke:#34A853,stroke-width:1.5px,color:#137333;
    class CTX,STREAM blue;
    class GUARD,GEMINI,TEST green;
```

## Goal
Implement Phase 6 (grounded LLM synthesis streaming via Google Gemini Flash with clickable inline citations `[1]`, `[2]`, zero hallucination outside retrieved context, and atomic 0.5 credit metering debit).

## Acceptance Criteria
1. Grounded prompt envelope strictly binds model to retrieved context; asserts zero hallucination (`BR-009`, AC-5.3).
2. If context is empty, outputs deterministic notice: `"Insufficient context available in your notes to answer this question."` (`BR-009`).
3. Synthesized text streams token-by-token with clickable citation anchors `[1]`, `[2]`.
4. Time-to-First-Token completes within p90 < 1,500ms (`NFR-002`).
5. Atomically debits 0.5 credits via `@repo/metering` Lua script before synthesis begins; balance < 0.5 short-circuits with HTTP 402 (`BR-014`, `BR-015`).

## Change Matrix (frozen)
| Class | Paths |
|---|---|
| **new_files** | `packages/reasoning/src/providers/gemini.ts`, `packages/reasoning/src/synthesis.ts`, `tests/reasoning/synthesis-stream.test.ts`, `tests/reasoning/reasoning-metering.test.ts` |
| **allowed_files** | `packages/reasoning/**`, `tests/reasoning/**` |
| **forbidden_files** | `packages/metering/**`, `packages/auth/**`, `packages/ingestion/**`, `packages/config/**`, `packages/ui/**`, `packages/workspace/**`, `packages/db/**`, `tests/*.test.ts`, `infra/**`, `apps/**`, `_documentation/**` |

## Verification Hook
```bash
bun test tests/reasoning/synthesis-stream.test.ts && bun test tests/reasoning/reasoning-metering.test.ts && bun run typecheck
```

## Rollout / Compatibility
Expand-only. Implements the primary inference path behind the `InferenceProvider` interface.
