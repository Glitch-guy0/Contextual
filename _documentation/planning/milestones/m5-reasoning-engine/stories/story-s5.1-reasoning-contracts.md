---
doc_class: canonical
owner: sprint-agent
milestone: M5
story: S5.1
status: complete
risk_tier: LOW
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

# S5.1 — Shared Reasoning Contracts, DTO Types & Streaming Envelopes

> **Work Unit:** WU-M5-1 · **Effort:** 3 · **Priority:** p0 · **Risk Tier:** LOW  
> **Owner:** `developer-agent` · **Depends on:** — (sprint entry point)

```mermaid
graph TD
    TYPES["@repo/contracts<br/>ReasoningPhase, SubQuestion, HydePassage"] --> STREAM["StreamReasoningChunk<br/>SSE event payload"]
    STREAM --> DTO["ChatSynthesisRequest<br/>ChatSynthesisResult"]
    DTO --> TEST["tests/reasoning/<br/>contracts.test.ts"]

    classDef blue fill:#E8F0FE,stroke:#4285F4,stroke-width:1.5px,color:#174EA6;
    classDef green fill:#E6F4EA,stroke:#34A853,stroke-width:1.5px,color:#137333;
    class TYPES,STREAM blue;
    class DTO,TEST green;
```

## Goal
Establish the shared TypeScript contract types and streaming event schemas for the 6-phase grounded reasoning engine under `@repo/contracts`.

## Acceptance Criteria
1. Export the closed union `ReasoningPhase`: `"decomposition" | "hyde" | "embedding" | "retrieval" | "assembly" | "synthesis"`.
2. Export `SubQuestion`, `HydePassage`, `RetrievedContextChunk`, `CitationAnchor`, `UnavailableSourceInfo`, `ChatSynthesisRequest`, `ChatSynthesisResult`, and `InferenceProviderType`.
3. Export `StreamReasoningEventType` supporting `"phase_start" | "sub_questions" | "citations" | "token" | "unavailable_sources" | "done" | "error"`.
4. Validate `ChatSynthesisRequest` (minLength: 3, maxLength: 2000, valid UUID `notebook_id`).
5. Ensure the closed 17-member RFC 9457 error catalogue remains exactly 17 entries with zero modifications.

## Change Matrix (frozen)
| Class | Paths |
|---|---|
| **new_files** | `packages/contracts/src/reasoning.ts`, `tests/reasoning/contracts.test.ts` |
| **allowed_files** | `packages/contracts/src/**`, `tests/reasoning/**` |
| **forbidden_files** | `packages/metering/**`, `packages/auth/**`, `packages/ingestion/**`, `packages/config/**`, `packages/ui/**`, `packages/workspace/**`, `packages/db/**`, `packages/reasoning/**`, `tests/*.test.ts`, `infra/**`, `apps/**`, `_documentation/**` |

## Verification Hook
```bash
bun test tests/reasoning/contracts.test.ts && bun test packages/contracts/tests/errors.test.ts && bun run typecheck
```

## Rollout / Compatibility
Expand-only. Adds new types to `@repo/contracts` without altering any existing interfaces or schemas.
