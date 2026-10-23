import { type Kysely, sql } from "kysely";

/**
 * Migration 001: Initial Auth and Notebooks Schema
 * Creates core tables: users, conversation_threads, conversation_messages, notebooks
 * Reference: Architecture §3.7, FR-002, FR-022, BR-002
 */

export async function up(db: Kysely<unknown>): Promise<void> {
  // 1. users table (Clerk user identities)
  await db.schema
    .createTable("users")
    .ifNotExists()
    .addColumn("id", "varchar(128)", (col) => col.primaryKey())
    .addColumn("email", "varchar(255)", (col) => col.notNull().unique())
    .addColumn("display_name", "varchar(255)")
    .addColumn("avatar_url", "text")
    .addColumn("credits_balance", "numeric(10, 2)", (col) => col.notNull().defaultTo("0.00"))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // 2. conversation_threads table
  await db.schema
    .createTable("conversation_threads")
    .ifNotExists()
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("user_id", "varchar(128)", (col) =>
      col.notNull().references("users.id").onDelete("cascade")
    )
    .addColumn("title", "varchar(255)", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // Index on conversation_threads(user_id)
  await db.schema
    .createIndex("idx_threads_user_id")
    .ifNotExists()
    .on("conversation_threads")
    .column("user_id")
    .execute();

  // 3. conversation_messages table
  await db.schema
    .createTable("conversation_messages")
    .ifNotExists()
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("thread_id", "uuid", (col) =>
      col.notNull().references("conversation_threads.id").onDelete("cascade")
    )
    .addColumn("user_id", "varchar(128)", (col) =>
      col.notNull().references("users.id").onDelete("cascade")
    )
    .addColumn("role", "varchar(32)", (col) => col.notNull())
    .addColumn("content", "text", (col) => col.notNull())
    .addColumn("tokens", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("metadata", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // Compound index on conversation_messages(thread_id, user_id)
  await db.schema
    .createIndex("idx_messages_thread_user")
    .ifNotExists()
    .on("conversation_messages")
    .columns(["thread_id", "user_id"])
    .execute();

  // 4. notebooks table
  await db.schema
    .createTable("notebooks")
    .ifNotExists()
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("user_id", "varchar(128)", (col) =>
      col.notNull().references("users.id").onDelete("cascade")
    )
    .addColumn("title", "varchar(255)", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("idle_since", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("deleted_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // Index on notebooks(user_id)
  await db.schema
    .createIndex("idx_notebooks_user_id")
    .ifNotExists()
    .on("notebooks")
    .column("user_id")
    .execute();

  // Index on notebooks(idle_since) for TTL / tombstoning
  await db.schema
    .createIndex("idx_notebooks_idle")
    .ifNotExists()
    .on("notebooks")
    .column("idle_since")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Drop in reverse dependency order
  await db.schema.dropIndex("idx_notebooks_idle").ifExists().execute();
  await db.schema.dropIndex("idx_notebooks_user_id").ifExists().execute();
  await db.schema.dropTable("notebooks").ifExists().cascade().execute();

  await db.schema.dropIndex("idx_messages_thread_user").ifExists().execute();
  await db.schema.dropTable("conversation_messages").ifExists().cascade().execute();

  await db.schema.dropIndex("idx_threads_user_id").ifExists().execute();
  await db.schema.dropTable("conversation_threads").ifExists().cascade().execute();

  await db.schema.dropTable("users").ifExists().cascade().execute();
}
