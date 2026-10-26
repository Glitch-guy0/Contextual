import type { Generated, ColumnType } from "kysely";

/**
 * Database Schema Definitions (Kysely Type Contracts)
 * Neon Postgres & Local PostgreSQL Relational Schema
 * Reference: conventions.md §1/§2, architecture §3.7, FR-002, FR-022, BR-002
 */

export interface UsersTable {
  readonly id: string; // Clerk userId (e.g., 'user_2...') or UUIDv7
  readonly clerk_id?: string; // Backward compatibility alias
  readonly email: string;
  readonly display_name: string | null;
  readonly avatar_url: string | null;
  readonly credits_balance: ColumnType<string, string | undefined, string>; // numeric(10,2)
  readonly created_at: Generated<string>;
  readonly updated_at: Generated<string>;
}

export interface ConversationThreadsTable {
  readonly id: Generated<string>; // UUID PRIMARY KEY DEFAULT gen_random_uuid()
  readonly user_id: string; // Foreign key to users.id
  readonly title: string;
  readonly created_at: Generated<string>;
  readonly updated_at: Generated<string>;
}

// Backward compatibility alias for M0 interface
export type ThreadsTable = ConversationThreadsTable;

export interface ConversationMessagesTable {
  readonly id: Generated<string>; // UUID PRIMARY KEY DEFAULT gen_random_uuid()
  readonly thread_id: string; // Foreign key to conversation_threads.id
  readonly user_id: string; // Foreign key to users.id
  readonly role: "user" | "assistant" | "system";
  readonly content: string;
  readonly tokens: ColumnType<number, number | undefined, number>;
  readonly metadata: ColumnType<Record<string, unknown>, Record<string, unknown> | undefined, Record<string, unknown>>;
  readonly created_at: Generated<string>;
}

export interface NotebooksTable {
  readonly id: Generated<string>; // UUID PRIMARY KEY DEFAULT gen_random_uuid()
  readonly user_id: string; // Foreign key to users.id
  readonly title: string;
  readonly description: string | null;
  readonly idle_since: Generated<string>;
  readonly deleted_at: string | null;
  readonly is_tombstoned?: boolean; // Backward compatibility flag
  readonly expires_at?: string | null; // Backward compatibility flag
  readonly created_at: Generated<string>;
  readonly updated_at: Generated<string>;
}

export interface NotebookNodesTable {
  readonly id: Generated<string>; // UUID PRIMARY KEY DEFAULT gen_random_uuid()
  readonly user_id: string; // Denormalized tenant guard (M4-PM-001 / AC-4.3)
  readonly notebook_id: string; // FK -> notebooks.id ON DELETE CASCADE
  readonly parent_id: string | null; // Self-reference for branch scope
  readonly kind: "text" | "document";
  readonly title: string;
  readonly content: string | null;
  readonly document_id: string | null; // Required when kind = 'document' (CHECK enforced)
  readonly position: ColumnType<number, number | undefined, number>;
  readonly created_at: Generated<string>;
  readonly updated_at: Generated<string>;
}

export interface NotebookEdgesTable {
  readonly id: Generated<string>; // UUID PRIMARY KEY DEFAULT gen_random_uuid()
  readonly user_id: string; // Denormalized tenant guard (AC-4.3)
  readonly notebook_id: string; // FK -> notebooks.id ON DELETE CASCADE
  readonly source_id: string; // FK -> notebook_nodes.id ON DELETE CASCADE
  readonly target_id: string; // FK -> notebook_nodes.id ON DELETE CASCADE
  readonly edge_type: "cites" | "related"; // CHECK constraint mirrors this union (FR-032)
  readonly created_at: Generated<string>;
}

export interface Database {
  readonly users: UsersTable;
  readonly conversation_threads: ConversationThreadsTable;
  readonly threads: ConversationThreadsTable; // Alias for backward compatibility
  readonly conversation_messages: ConversationMessagesTable;
  readonly notebooks: NotebooksTable;
  readonly notebook_nodes: NotebookNodesTable;
  readonly notebook_edges: NotebookEdgesTable;
}
