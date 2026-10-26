import { describe, expect, test, afterAll } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  closeKyselyDb,
  STATIC_MIGRATIONS,
  type Database,
  type NotebookNodesTable,
  type NotebookEdgesTable,
} from "../../packages/db/src/index.js";
import * as graphMigration from "../../packages/db/src/migrations/002_notebook_graph.js";
import { EDGE_TYPES, isEdgeType, isNodeKind, type EdgeType } from "../../packages/contracts/src/workspace.js";

describe("Milestone M4 — Story S4.1: Graph Contracts, Schema Types & Expand Migration", () => {
  const rootDir = process.cwd();

  afterAll(async () => {
    await closeKyselyDb();
  });

  test("TC-S4.1.1: EdgeType is the closed union cites|related and rejects anything else", () => {
    expect(EDGE_TYPES).toEqual(["cites", "related"]);

    const narrowed: EdgeType[] = [];
    for (const candidate of ["cites", "related", "author_of", ""])
      if (isEdgeType(candidate)) narrowed.push(candidate);

    expect(narrowed).toEqual(["cites", "related"]);
    expect(isEdgeType("author_of")).toBe(false);
    expect(isNodeKind("document")).toBe(true);
    expect(isNodeKind("graph")).toBe(false);
  });

  test("TC-S4.1.2: schema.ts declares notebook_nodes and notebook_edges and registers both on Database", () => {
    const schemaContent = readFileSync(join(rootDir, "packages/db/src/schema.ts"), "utf-8");

    expect(schemaContent).toContain("export interface NotebookNodesTable");
    expect(schemaContent).toContain("export interface NotebookEdgesTable");
    expect(schemaContent).toContain("readonly notebook_nodes: NotebookNodesTable;");
    expect(schemaContent).toContain("readonly notebook_edges: NotebookEdgesTable;");

    const db: Partial<Database> = {
      notebook_nodes: {
        id: "n1",
        user_id: "user_1",
        notebook_id: "nb1",
        parent_id: null,
        kind: "text",
        title: "Note",
        content: "body",
        document_id: null,
        position: 0,
        created_at: "2026-10-26T00:00:00.000Z" as never,
        updated_at: "2026-10-26T00:00:00.000Z" as never,
      },
      notebook_edges: {
        id: "e1",
        user_id: "user_1",
        notebook_id: "nb1",
        source_id: "n1",
        target_id: "n2",
        edge_type: "cites",
        created_at: "2026-10-26T00:00:00.000Z" as never,
      },
    } satisfies Partial<Database>;

    expect(db.notebook_nodes?.kind).toBe("text");
    expect(db.notebook_edges?.edge_type).toBe("cites");

    const node: NotebookNodesTable | undefined = db.notebook_nodes;
    const edge: NotebookEdgesTable | undefined = db.notebook_edges;
    expect(node?.user_id).toBe("user_1");
    expect(edge?.source_id).toBe("n1");
  });

  test("TC-S4.1.3: migration 002 defines tenant-prefixed composite indexes and CASCADE foreign keys", () => {
    const migrationPath = join(
      rootDir,
      "packages/db/src/migrations/002_notebook_graph.ts"
    );
    expect(existsSync(migrationPath)).toBe(true);

    const content = readFileSync(migrationPath, "utf-8");

    // Composite tenant indexes (AC-4.3 / design §3.3)
    expect(content).toContain('createIndex("idx_nodes_tenant")');
    expect(content).toContain('createIndex("idx_edges_tenant")');
    expect(content).toContain('.columns(["user_id", "notebook_id"])');

    // Cascade so a node deletion can never strand an edge (FM-401)
    expect(content).toContain('createTable("notebook_nodes")');
    expect(content).toContain('createTable("notebook_edges")');
    expect(content).toContain('references("notebooks.id").onDelete("cascade")');
    expect(content).toContain('references("notebook_nodes.id").onDelete("cascade")');
    expect(content).toContain('references("users.id").onDelete("cascade")');

    expect(typeof graphMigration.up).toBe("function");
    expect(typeof graphMigration.down).toBe("function");
  });

  test("TC-S4.1.4: edge_type CHECK mirrors the API union and self-edges are rejected (FR-032)", () => {
    const content = readFileSync(
      join(rootDir, "packages/db/src/migrations/002_notebook_graph.ts"),
      "utf-8"
    );

    expect(content).toContain("edge_type IN ('cites', 'related')");
    expect(content).toContain("source_id <> target_id");
    expect(content).toContain("uq_notebook_edges_triple");
    expect(content).toContain("kind IN ('text', 'document')");
    expect(content).toContain("document_id IS NOT NULL");

    // Expand-only: no ALTER/DROP of an existing column anywhere in the file
    expect(content).not.toContain("dropColumn");
    expect(content).not.toContain("alterColumn");
  });

  test("TC-S4.1.5: migration 002 is registered in the static registry (deterministic migrator)", () => {
    expect(Object.keys(STATIC_MIGRATIONS)).toContain("002_notebook_graph");
    expect(typeof STATIC_MIGRATIONS["002_notebook_graph"]?.up).toBe("function");
    expect(typeof STATIC_MIGRATIONS["002_notebook_graph"]?.down).toBe("function");
  });

  test("TC-S4.1.6: graph contract surface is exported from @repo/contracts", () => {
    const indexContent = readFileSync(
      join(rootDir, "packages/contracts/src/index.ts"),
      "utf-8"
    );
    expect(indexContent).toContain('export * from "./workspace.js"');
    expect(existsSync(join(rootDir, "packages/contracts/src/workspace.ts"))).toBe(true);
  });
});