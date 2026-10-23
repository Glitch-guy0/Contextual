---
id: S1.3
epic: EPIC-001
milestone: M1
target_version: v0.1.0
status: not-started
owner: developer-agent
---

# Story S1.3: Kysely Relational Persistence Schemas, Indexes & Migration Runner (@repo/db)

## Outcome
The project establishes typed relational persistence in Neon PostgreSQL using Kysely. It defines core table schemas (`users`, `conversation_threads`, `conversation_messages`, `notebooks`), strictly enforces foreign keys and tenant indexes on `user_id`, and delivers an automated Kysely migration runner (`FR-002`, `FR-022`, `BR-002`).

## Change Matrix
- **`new_files`:**
  - `packages/db/src/client.ts`
  - `packages/db/src/migrator.ts`
  - `packages/db/src/migrations/001_initial_auth_and_notebooks.ts`
  - `tests/database-persistence.test.ts`
- **`allowed_files`:**
  - `packages/db/package.json`
  - `packages/db/src/index.ts`
  - `packages/db/src/schema.ts`
- **`forbidden_files`:**
  - `packages/auth/**`
  - `packages/config/**`
  - `packages/ui/**`
  - `apps/**`

## Acceptance Criteria
1. `packages/db/src/schema.ts` exports typed TypeScript interfaces for `UsersTable`, `ConversationThreadsTable`, `ConversationMessagesTable`, and `NotebooksTable`.
2. `packages/db/src/client.ts` exports `getKyselyDb()` with connection pooling supporting local PostgreSQL and serverless Neon connections.
3. `packages/db/src/migrations/001_initial_auth_and_notebooks.ts` creates all 4 tables with UUID primary keys, foreign key constraints (`ON DELETE CASCADE`), and tenant indexes (`idx_threads_user_id`, `idx_messages_thread_user`, `idx_notebooks_user_id`, `idx_notebooks_idle`).
4. `packages/db/src/migrator.ts` executes up/down migrations using Kysely's `Migrator` and `FileMigrationProvider`.

## Verification
- **Command:** `bun test tests/database-persistence.test.ts`
- **Expected:** All 4 persistence and schema verification scenarios pass with 0 failures.
