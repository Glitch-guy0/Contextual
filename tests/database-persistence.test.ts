import { describe, expect, test, afterAll } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  getKyselyDb,
  closeKyselyDb,
  redactConnectionString,
  getMigrator,
  STATIC_MIGRATIONS,
  type Database,
} from "../packages/db/src/index.js";
import * as initialMigration from "../packages/db/src/migrations/001_initial_auth_and_notebooks.js";

describe("Milestone M1 — Story S1.3: Kysely Relational Persistence Schemas, Indexes & Migration Runner", () => {
  const rootDir = process.cwd();

  afterAll(async () => {
    await closeKyselyDb();
  });

  test("TC-1.3.1: Database schema exports typed table interfaces for users, conversation_threads, conversation_messages, notebooks", () => {
    const schemaPath = join(rootDir, "packages/db/src/schema.ts");
    expect(existsSync(schemaPath)).toBe(true);

    const schemaContent = readFileSync(schemaPath, "utf-8");
    expect(schemaContent).toContain("export interface UsersTable");
    expect(schemaContent).toContain("export interface ConversationThreadsTable");
    expect(schemaContent).toContain("export interface ConversationMessagesTable");
    expect(schemaContent).toContain("export interface NotebooksTable");
    expect(schemaContent).toContain("export interface Database");

    // Also assert backward compatibility alias
    expect(schemaContent).toContain("export type ThreadsTable = ConversationThreadsTable");

    // Static type validation assertion
    const dummyDb: Partial<Database> = {
      users: {
        id: "user_2test123",
        email: "test@example.com",
        display_name: "Test User",
        avatar_url: null,
        credits_balance: "10.00",
        created_at: "2026-10-23T00:00:00.000Z" as any,
        updated_at: "2026-10-23T00:00:00.000Z" as any,
      },
    };
    expect(dummyDb.users?.id).toBe("user_2test123");
    expect(dummyDb.users?.email).toBe("test@example.com");
  });

  test("TC-1.3.2: Initial migration script defines correct primary keys, UUID generators, and foreign keys with ON DELETE CASCADE", () => {
    const migrationPath = join(
      rootDir,
      "packages/db/src/migrations/001_initial_auth_and_notebooks.ts"
    );
    expect(existsSync(migrationPath)).toBe(true);

    const content = readFileSync(migrationPath, "utf-8");

    // Primary keys
    expect(content).toContain('.addColumn("id", "varchar(128)", (col) => col.primaryKey())');
    expect(content).toContain('.addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`');

    // Foreign keys with ON DELETE CASCADE
    expect(content).toContain('references("users.id").onDelete("cascade")');
    expect(content).toContain('references("conversation_threads.id").onDelete("cascade")');

    // Check export functions up and down
    expect(typeof initialMigration.up).toBe("function");
    expect(typeof initialMigration.down).toBe("function");
  });

  test("TC-1.3.3: Tenant indexes on user_id and idle_since are present in migration DDL", () => {
    const migrationPath = join(
      rootDir,
      "packages/db/src/migrations/001_initial_auth_and_notebooks.ts"
    );
    const content = readFileSync(migrationPath, "utf-8");

    // Tenant and lifecycle indexes
    expect(content).toContain('createIndex("idx_threads_user_id")');
    expect(content).toContain('.column("user_id")');

    expect(content).toContain('createIndex("idx_messages_thread_user")');
    expect(content).toContain('.columns(["thread_id", "user_id"])');

    expect(content).toContain('createIndex("idx_notebooks_user_id")');

    expect(content).toContain('createIndex("idx_notebooks_idle")');
    expect(content).toContain('.column("idle_since")');
  });

  test("TC-1.3.4: Kysely client initializes connection pool and migrator provider successfully", async () => {
    // Test URL redaction utility
    const rawUrl = "postgresql://myuser:secretpassword123@db.example.com:5432/contextual_dev";
    const redacted = redactConnectionString(rawUrl);
    expect(redacted).not.toContain("secretpassword123");
    expect(redacted).toContain("REDACTED");
    expect(redacted).toContain("myuser");

    // Test client factory
    const testDb = getKyselyDb("postgresql://postgres:postgrespassword@127.0.0.1:5432/contextual_test");
    expect(testDb).toBeDefined();
    expect(testDb.schema).toBeDefined();
    expect(typeof testDb.selectFrom).toBe("function");

    // Test migrator provider
    const migrator = getMigrator(testDb, { useStaticProvider: true });
    expect(migrator).toBeDefined();

    const migrations = await STATIC_MIGRATIONS;
    expect(Object.keys(migrations)).toContain("001_initial_auth_and_notebooks");
    expect(typeof migrations["001_initial_auth_and_notebooks"].up).toBe("function");
    expect(typeof migrations["001_initial_auth_and_notebooks"].down).toBe("function");

    await closeKyselyDb(testDb);
  });
});
