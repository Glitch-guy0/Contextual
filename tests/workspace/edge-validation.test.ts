import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { Kysely } from "kysely";
import { getKyselyDb, closeKyselyDb } from "../../packages/db/src/index.js";
import { WorkspaceRepository } from "../../packages/workspace/src/repository.js";
import {
  EdgeType,
  validateEdgeType,
  createEdge,
  canCreateEdge,
  listEdgesForNotebook,
} from "../../packages/workspace/src/edges.js";
import { AppProblemError } from "../../packages/contracts/src/errors.js";
import { notFound } from "../../packages/workspace/src/types.js";
import { v4 as uuidv4 } from "uuid";

describe("Milestone M4 — Story S4.3: Typed Edge Write Path & Relation Validation", () => {
  let db: Kysely<any>;
  let repo: WorkspaceRepository;

  beforeAll(async () => {
    db = getKyselyDb("postgresql://contextual:contextual_local_only@127.0.0.1:5432/contextual");
    repo = new WorkspaceRepository(db);
  });

  afterAll(async () => {
    await closeKyselyDb();
  });

  async function createTestFixture() {
    const userId = `user-${uuidv4()}`;
    const notebookId = uuidv4();

    await db.insertInto("users").values({
      id: userId,
      email: `${userId}@example.com`,
    }).execute();

    await db.insertInto("notebooks").values({
      id: notebookId,
      user_id: userId,
      title: "Edge Test Notebook",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).execute();

    const node1 = await repo.insertNode(userId, {
      notebook_id: notebookId,
      parent_id: null,
      kind: "text",
      title: "Source Node",
      content: "source",
      document_id: null,
      position: 0,
    });

    const node2 = await repo.insertNode(userId, {
      notebook_id: notebookId,
      parent_id: null,
      kind: "text",
      title: "Target Node",
      content: "target",
      document_id: null,
      position: 1,
    });

    return { userId, notebookId, node1, node2 };
  }

  test("TC-S4.3.1: validateEdgeType rejects invalid types", () => {
    const result = validateEdgeType("author_of");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("invalid_edge_type");
    expect(result.issues![0].field).toBe("edge_type");
  });

  test("TC-S4.3.2: validateEdgeType accepts 'cites'", () => {
    const result = validateEdgeType("cites");
    expect(result.ok).toBe(true);
  });

  test("TC-S4.3.3: validateEdgeType accepts 'related'", () => {
    const result = validateEdgeType("related");
    expect(result.ok).toBe(true);
  });

  test("TC-S4.3.4: createEdge validates type before DB round trip - invalid type throws 400 invalid-node-relation", async () => {
    // Calling createEdge with invalid type throws AppProblemError before any query
    const dummyRepo = {} as WorkspaceRepository; // No DB calls will be made
    try {
      await createEdge(dummyRepo, "user-x", "notebook-x", "node-1", "node-2", "author_of");
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(AppProblemError);
      const prob = err as AppProblemError;
      expect(prob.key).toBe("INVALID_NODE_RELATION");
      expect(prob.toProblemDocument().status).toBe(400);
    }
  });

  test("TC-S4.3.5: createEdge with valid 'cites' type succeeds", async () => {
    const { userId, notebookId, node1, node2 } = await createTestFixture();

    const edge = await createEdge(repo, userId, notebookId, node1.id, node2.id, "cites");
    expect(edge).not.toBeNull();
    expect(edge.edge_type).toBe("cites");
    expect(edge.source_id).toBe(node1.id);
    expect(edge.target_id).toBe(node2.id);
  });

  test("TC-S4.3.6: createEdge with valid 'related' type succeeds", async () => {
    const { userId, notebookId, node1, node2 } = await createTestFixture();

    const edge = await createEdge(repo, userId, notebookId, node1.id, node2.id, "related");
    expect(edge).not.toBeNull();
    expect(edge.edge_type).toBe("related");
  });

  test("TC-S4.3.7: createEdge rejects self-edges", async () => {
    const { userId, notebookId, node1 } = await createTestFixture();

    await expect(
      createEdge(repo, userId, notebookId, node1.id, node1.id, "cites")
    ).rejects.toThrow(AppProblemError);
  });

  test("TC-S4.3.8: createEdge rejects duplicate edges", async () => {
    const { userId, notebookId, node1, node2 } = await createTestFixture();

    await createEdge(repo, userId, notebookId, node1.id, node2.id, "cites");

    await expect(
      createEdge(repo, userId, notebookId, node1.id, node2.id, "cites")
    ).rejects.toThrow(AppProblemError);
  });

  test("TC-S4.3.9: listEdgesForNotebook filters by type", async () => {
    const { userId, notebookId, node1, node2 } = await createTestFixture();

    const node3 = await repo.insertNode(userId, {
      notebook_id: notebookId,
      parent_id: null,
      kind: "text",
      title: "Node 3",
      content: "3",
      document_id: null,
      position: 2,
    });

    await createEdge(repo, userId, notebookId, node1.id, node2.id, "cites");
    await createEdge(repo, userId, notebookId, node2.id, node3.id, "related");

    const citesEdges = await listEdgesForNotebook(repo, userId, notebookId, "cites");
    expect(citesEdges.length).toBe(1);
    expect(citesEdges[0].edge_type).toBe("cites");

    const relatedEdges = await listEdgesForNotebook(repo, userId, notebookId, "related");
    expect(relatedEdges.length).toBe(1);
    expect(relatedEdges[0].edge_type).toBe("related");

    const allEdges = await listEdgesForNotebook(repo, userId, notebookId);
    expect(allEdges.length).toBe(2);
  });

  test("TC-S4.3.10: canCreateEdge validates before DB calls", async () => {
    const { userId, notebookId, node1 } = await createTestFixture();

    const result1 = await canCreateEdge(repo, userId, notebookId, node1.id, node1.id, "cites");
    expect(result1.ok).toBe(false);
    expect(result1.reason).toContain("self-edges");

    const result2 = await canCreateEdge(repo, userId, notebookId, node1.id, "other-id", "author_of" as EdgeType);
    expect(result2.ok).toBe(false);
    expect(result2.reason).toContain("invalid_edge_type");
  });
});