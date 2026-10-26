---
doc_class: intermediate
milestone: M3
story: S3.1..S3.6
status: draft
created: 2026-10-26T09:50:00.000Z
---

# M3 Dev Plan

- **Scope:** implement M3 sprint stories S3.1..S3.6 exactly within their Change Matrices
- **First story:** S3.1
- **Story order:** S3.1 → S3.2 → S3.3 → S3.4 → S3.5 → S3.6
- **Verification gate:** `bun test` folded into the unified monorepo gate
- **Constraint:** forbidden files in every story must stay untouched

## Task list

1. Scaffold `@repo/ingestion` package under workspace conventions.
2. Add M3 ingestion types and DTOs to `@repo/contracts` without breaking existing M0–M2 exports.
3. Add ingestion path shapes to `api-contract.openapi.yaml` as additive endpoints.
4. Update `component-catalog.yaml` and `config-schema.yaml` for Filebase, QStash, Vector, Google AI Studio.
5. Implement S3 presign and purge logic against the Filebase endpoint.
6. Implement QStash dispatch and signature verification seam.
7. Implement PDF, YouTube, and web extractors with the failure taxonomy from the design.
8. Implement text chunking with tenant metadata payload.
9. Implement embedding with Google primary and local ONNX fallback hook.
10. Implement Upstash Vector upsert with mandatory tenant payload.
11. Implement SSE progress stream with 280s ceiling and Last-Event-ID replay.
12. Implement credit refund Lua compensation and non-debiting retry seam.
13. Wire M3 verification evidence into the test tree so it runs under `bun test`.
14. Run full monorepo gate and record result.
15. Update sprint and milestone status docs to reflect completed implementation state.

## Notes

- This plan is a coordination scratchpad, not production code.
- No forbidden package trees are to be edited in any story.
