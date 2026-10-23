/**
 * Database Schema Definitions (Kysely Type Contracts)
 * Neon Postgres Schema Stubs
 * Reference: conventions.md §1/§2, FR-002, CV-001
 */

export interface UsersTable {
  readonly id: string; // UUIDv7
  readonly clerk_id: string;
  readonly email: string;
  readonly credits_balance: string; // numeric(10,2)
  readonly created_at: string;
  readonly updated_at: string;
}

export interface ThreadsTable {
  readonly id: string; // UUIDv7
  readonly user_id: string;
  readonly title: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface NotebooksTable {
  readonly id: string; // UUIDv7
  readonly user_id: string;
  readonly title: string;
  readonly description: string | null;
  readonly is_tombstoned: boolean;
  readonly created_at: string;
  readonly updated_at: string;
  readonly expires_at: string | null;
}

export interface Database {
  readonly users: UsersTable;
  readonly threads: ThreadsTable;
  readonly notebooks: NotebooksTable;
}
