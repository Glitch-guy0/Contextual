import type { Kysely } from "kysely";
import {
  Migrator,
  FileMigrationProvider,
  type MigrationResultSet,
  type MigrationProvider,
  type Migration,
} from "kysely/migration";
import * as path from "node:path";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import * as migration001 from "./migrations/001_initial_auth_and_notebooks.js";
import * as migration002 from "./migrations/002_notebook_graph.js";

/**
 * Static migration registry for deterministic environments and bundlers
 */
export const STATIC_MIGRATIONS: Record<string, Migration> = {
  "001_initial_auth_and_notebooks": migration001,
  "002_notebook_graph": migration002,
};

export class StaticMigrationProvider implements MigrationProvider {
  async getMigrations(): Promise<Record<string, Migration>> {
    return STATIC_MIGRATIONS;
  }
}

export interface MigratorOptions {
  migrationFolder?: string;
  useStaticProvider?: boolean;
}

/**
 * Creates a Kysely Migrator instance configured with FileMigrationProvider or StaticMigrationProvider.
 */
export function getMigrator(db: Kysely<unknown>, options?: MigratorOptions): Migrator {
  if (options?.useStaticProvider) {
    return new Migrator({
      db,
      provider: new StaticMigrationProvider(),
    });
  }

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const folder = options?.migrationFolder ?? path.join(currentDir, "migrations");

  return new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: folder,
    }),
  });
}

/**
 * Executes all pending migrations up to latest
 */
export async function runMigrationsUp(
  db: Kysely<unknown>,
  options?: MigratorOptions
): Promise<MigrationResultSet> {
  const migrator = getMigrator(db, options);

  if (process.env.NODE_ENV !== "test") {
    console.info(
      JSON.stringify({
        event: "db.migration.started",
        direction: "up",
        timestamp: new Date().toISOString(),
      })
    );
  }

  const result = await migrator.migrateToLatest();

  if (process.env.NODE_ENV !== "test") {
    console.info(
      JSON.stringify({
        event: "db.migration.completed",
        direction: "up",
        applied: result.results?.map((r) => ({ name: r.migrationName, status: r.status })),
        error: result.error ? String(result.error) : undefined,
        timestamp: new Date().toISOString(),
      })
    );
  }

  return result;
}

/**
 * Reverts the most recent migration step
 */
export async function runMigrationsDown(
  db: Kysely<unknown>,
  options?: MigratorOptions
): Promise<MigrationResultSet> {
  const migrator = getMigrator(db, options);

  if (process.env.NODE_ENV !== "test") {
    console.info(
      JSON.stringify({
        event: "db.migration.started",
        direction: "down",
        timestamp: new Date().toISOString(),
      })
    );
  }

  const result = await migrator.migrateDown();

  if (process.env.NODE_ENV !== "test") {
    console.info(
      JSON.stringify({
        event: "db.migration.completed",
        direction: "down",
        applied: result.results?.map((r) => ({ name: r.migrationName, status: r.status })),
        error: result.error ? String(result.error) : undefined,
        timestamp: new Date().toISOString(),
      })
    );
  }

  return result;
}
