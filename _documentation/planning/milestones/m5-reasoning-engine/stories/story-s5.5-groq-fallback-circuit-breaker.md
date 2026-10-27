---
doc_class: canonical
owner: sprint-agent
milestone: M5
story: S5.5
status: complete
risk_tier: HIGH
created: 2026-10-27
last_verified: 2026-10-27
related:
  - _documentation/planning/milestones/m5-reasoning-engine/sprint-status.yaml
  - _documentation/planning/milestones/m5-reasoning-engine/milestone.md
  - _documentation/planning/architecture/05-m5-grounded-reasoning-engine.md
  - _documentation/planning/decisions/adr-0004-unified-upstash-serverless-architecture.md
supersedes: []
regenerable: false
pinned: false
---

# S5.5 — Transparent Groq Llama-3.3-70B Fallback Circuit-Breaker on Gemini 429

> **Work Unit:** WU-M5-5 · **Effort:** 4 · **Priority:** p0 · **Risk Tier:** HIGH  
> **Owner:** `developer-agent` · **Depends on:** S5.4

```mermaid
graph TD
    PROMPT["Inference Request"] --> BREAKER["CircuitBreakerInterceptor"]
    BREAKER -->|Attempt 1| GEMINI["Google Gemini Flash"]
    GEMINI -.->|429 / Quota Error| FAILOVER["Failover Interceptor<br/>(< 50ms)"]
    FAILOVER --> GROQ["Groq Llama-3.3-70B"]
    GROQ --> STREAM["Output Stream<br/>x-fallback-provider: groq"]
    BREAKER --> TEST["tests/reasoning/<br/>circuit-breaker.test.ts"]

    classDef blue fill:#E8F0FE,stroke:#4285F4,stroke-width:1.5px,color:#174EA6;
    classDef green fill:#E6F4EA,stroke:#34A853,stroke-width:1.5px,color:#137333;
    classDef amber fill:#FEF7E0,stroke:#FBBC04,stroke-width:1.5px,color:#B06000;
    class PROMPT,STREAM blue;
    class BREAKER,GROQ,TEST green;
    class GEMINI,FAILOVER amber;
```

## Goal
Implement the resilient in-process circuit-breaker interceptor that detects Google AI Studio HTTP 429 / `RESOURCE_EXHAUSTED` quota errors and transparently fails over to Groq Llama-3.3-70B Versatile with zero user interruption (`NFR-022`, `ADR-0004`, AC-5.4).

## Acceptance Criteria
1. Implement `CircuitBreakerInterceptor` wrapping `InferenceProvider` calls.
2. Intercepts HTTP 429, `RESOURCE_EXHAUSTED`, or TTFT timeouts (> 3,000ms) on Gemini Flash and immediately routes the identical context envelope to Groq Llama-3.3-70B.
3. Injects response header or stream metadata `x-fallback-provider: groq`.
4. Zero 5xx errors thrown to the client during failover.
5. Ingests request `AbortSignal`; aborting the client connection immediately halts upstream generation (`FM-504`).
6. If both providers fail, surfaces HTTP 502 `UPSTREAM_PROVIDER_UNAVAILABLE` and triggers automatic 0.5 credit refund.

## Change Matrix (frozen)
| Class | Paths |
|---|---|
| **new_files** | `packages/reasoning/src/providers/groq.ts`, `packages/reasoning/src/circuit-breaker.ts`, `tests/reasoning/circuit-breaker.test.ts` |
| **allowed_files** | `packages/reasoning/**`, `tests/reasoning/**` |
| **forbidden_files** | `packages/metering/**`, `packages/auth/**`, `packages/ingestion/**`, `packages/config/**`, `packages/ui/**`, `packages/workspace/**`, `packages/db/**`, `tests/*.test.ts`, `infra/**`, `apps/**`, `_documentation/**` |

## Verification Hook
```bash
bun test tests/reasoning/circuit-breaker.test.ts && bun run typecheck
```

## Rollout / Compatibility
Expand-only. Secondary provider fallback layer completely contained inside `@repo/reasoning`.
