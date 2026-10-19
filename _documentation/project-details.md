# Project Details & Master Context Dashboard

> **First Entry Point for Agents & Developers**
> Check this file first to understand project context, folder traversal, conventions, and engineering standards.

## 1. System Navigation & Two-Floor Layout
- **Floor 1 (Helper Floor / Planning & Invariants):** Root workspace and `_documentation/`
  - `_documentation/planning-artifacts/`: arc42 architecture (§01–§12), PRDs, research, logs, and shared questionnaire.
  - `_documentation/planning-artifacts/milestones/milestone-status.yaml`: milestone roadmap and lifecycle status board.
  - `_documentation/implementation-artifacts/sprint-status.yaml`: story-level handoff board and dev progress tracking.
- **Floor 2 (Product Floor / Implementation):** `src/`
  - All application code lives inside `src/`. The Developer Agent is bounded exclusively to this floor.

## 2. Shared Communication Bus (Questionnaire)
- Shared scratchpad: `_documentation/planning-artifacts/questionnaire.yaml`
- High-value questions only (15-year-old explanation level with analogies).
- Maximum 1 blocker question per round. Sealed decisions are permanent.
- Answer lifecycle: the user is the only owner of `questionnaire.yaml`; they fill in `user_answer` and hand the file back -> the owning agent infers the consequence, writes it into its own planning artifact with a `[Q-00N]` trace, and clears the answered question, leaving `questions: []`. The file is never archived.

## 3. The 6-Phase Pipeline & Quality Gates
- **Gate G1 (Requirements):** Analyst seals validated requirements (`01-introduction-and-goals/requirements.md`) & domain glossary (`12-glossary/glossary.md`).
- **Gate G2 (PM Standards):** PM seals conventions (`04-solution-strategy/conventions.md`) & milestones (`milestones/overview.md` + `milestone-status.yaml`).
- **Gate G3 (Strategic Alignment):** Party-Mode consensus sealed in `planning-artifacts/logs/party-mode-log.md`.
- **Gate G4 (Milestone Architecture):** Architect seals OpenAPI contracts (`05-building-blocks/contracts/`) & DB schemas.
- **Gate G5 (Implementation Ready):** Stories with Change Matrices, test Truth Tables, and `sprint-status.yaml` ready for dev.
- **Gate G6 (Verified Code):** Developer passes all tests within Change Matrix limits; story closed.
