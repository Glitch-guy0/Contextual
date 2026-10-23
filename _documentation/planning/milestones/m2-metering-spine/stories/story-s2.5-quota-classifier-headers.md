---
id: S2.5
epic: EPIC-002
milestone: M2
target_version: v0.2.0
status: not-started
owner: developer-agent
---

# Story S2.5: Upstream Provider Quota Classifier & RateLimit Headers

## Outcome
Upstream errors from Google AI Studio, Groq, and Upstash are inspected by a typed classifier that distinguishes between transient outages (502/503) and true quota exhaustion (402 `SERVICE_LIMIT_REACHED`). HTTP responses inject standardized `RateLimit`, `RateLimit-Policy`, and `Retry-After` headers (`FR-026`, `FR-028`, `FR-029`, `BR-028`..`BR-030`).

## Change Matrix
- **`new_files`:**
  - `packages/metering/src/quota-classifier.ts`
  - `packages/metering/src/headers.ts`
  - `packages/metering/tests/quota-classifier.test.ts`
- **`allowed_files`:**
  - `packages/metering/src/index.ts`
  - `packages/contracts/src/errors.ts`
- **`forbidden_files`:**
  - `apps/**`

## Acceptance Criteria
1. Google AI Studio error matching `RESOURCE_EXHAUSTED` (429) maps to RFC 9457 type `service-limit-reached` (402) with `service: "google-ai-studio"` and `quota_period: "daily"`.
2. Generic 500 errors from upstream providers map to `upstream-provider-unavailable` (502) and never emit `service-limit-reached` (`BR-028`).
3. Standardized `RateLimit` headers (`r=remaining, t=reset_seconds`) and `RateLimit-Policy` are appended to HTTP response headers.

## Verification
- **Command:** `bun test packages/metering/tests/quota-classifier.test.ts`
- **Expected:** All 3 test scenarios pass with 0 failures.
