import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { Kysely, sql } from "kysely";
import { getKyselyDb, closeKyselyDb } from "../../packages/db/src/index.js";
import { WorkspaceRepository } from "../../packages/workspace/src/repository.js";
import { NodeService } from "../../packages/workspace/src/nodes.js";
import { notFound } from "../../packages/workspace/src/types.js";
import { v4 as uuidv4 } from "uuid";

describe("Milestone M4 — Story S4.2: Node CRUD (tenant-scoped)", () => {
  let db: Kysely<any>;
  let repo: WorkspaceRepository;
  let service: NodeService;

  beforeAll(async () => {
    db = getKyselyDb("postgresql://contextual:contextual_local_only@127.0.0.1:5432/contextual");
    repo = new WorkspaceRepository(db);
    service = new NodeService(repo);
  });

  afterAll(async () => {
    await closeKyselyDb();
  });

  test("TC-S4.2.8: create a text node in own notebook", async () => {
    const userId = `user-${uuidv4()}`;
    const notebookId = uuidv4();

    await db.insertInto("users").values({
      id: userId,
      email: `${userId}@example.com`,
    }).execute();

    await db
      .insertInto("notebooks")
      .values({ id: notebookId, user_id: userId, title: "Test Notebook", created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .execute();

    const row = await repo.insertNode(userId, {
      notebook_id: notebookId,
      parent_id: null,
      kind: "text",
      title: "My Note",
      content: "Hello world",
      document_id: null,
      position: 0,
    });

    expect(row).not.toBeNull();
    expect(row.id).toBeDefined();
    expect(row.title).toBe("My Note");
    expect(row.kind).toBe("text");
  });

  test("TC-S4.2.9: create a document node in own notebook", async () => {
    const userId = `user-${uuidv4()}`;
    const notebookId = uuidv4();
    const documentId = uuidv4();

    await db.insertInto("users").values({
      id: userId,
      email: `${userId}@example.com`,
    }).execute();

    await db
      .insertInto("notebooks")
      .values({ id: notebookId, user_id: userId, title: "Doc Notebook", created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .execute();

    const row = await repo.insertNode(userId, {
      notebook_id: notebookId,
      parent_id: null,
      kind: "document",
      title: "My Paper",
      content: null,
      document_id: documentId,
      position: 0,
    });

    expect(row).not.toBeNull();
    expect(row.id).toBeDefined();
    expect(row.title).toBe("My Paper");
    expect(row.kind).toBe("document");
    expect(row.document_id).toBe(documentId);
  });

  test("TC-S4.2.10: reading another tenant's notebook returns NOTEBOOK_NOT_FOUND", async () => {
    const user1 = `user-${uuidv4()}`;
    const user2 = `user-${uuidv4()}`;
    const notebookId = uuidv4();

    await db.insertInto("users").values([
      { id: user1, email: `${user1}@example.com` },
      { id: user2, email: `${user2}@example.com` },
    ]).execute();

    await db
      .insertInto("notebooks")
      .values({ id: notebookId, user_id: user1, title: "User 1 Notebook", created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .execute();

    const node = await repo.insertNode(user1, {
      notebook_id: notebookId,
      parent_id: null,
      kind: "text",
      title: "Private Note",
      content: "secret",
      document_id: null,
      position: 0,
    });

    // Foreign tenant read on repo returns undefined (0 rows, AC-4.3)
    const foreignFind = await repo.findNode(user2, notebookId, node.id);
    expect(foreignFind).toBeUndefined();

    // Foreign tenant list on repo returns empty array (0 rows)
    const foreignList = await repo.listNodes(user2, notebookId);
    expect(foreignList).toEqual([]);

    // Service read for foreign tenant throws NOTEBOOK_NOT_FOUND (M4-PM-001)
    await expect(service.get(user2, notebookId, node.id)).rejects.toThrow();
    await expect(service.list(user2, notebookId)).rejects.toThrow();
  });

  test("TC-S4.2.11: deleting a node removes its edges in the same transaction", async () => {
    const userId = `user-${uuidv4()}`;
    const notebookId = uuidv4();

    await db.insertInto("users").values({
      id: userId,
      email: `${userId}@example.com`,
    }).execute();

    await db
      .insertInto("notebooks")
      .values({ id: notebookId, user_id: userId, title: "Test", created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .execute();

    // Create two nodes
    const node1 = await repo.insertNode(userId, {
      notebook_id: notebookId,
      parent_id: null,
      kind: "text",
      title: "Node 1",
      content: "delete me",
      document_id: null,
      position: 0,
    });

    const node2 = await repo.insertNode(userId, {
      notebook_id: notebookId,
      parent_id: null,
      kind: "text",
      title: "Node 2",
      content: "target",
      document_id: null,
      position: 1,
    });

    // Create an edge from node1 to node2
    await repo.insertEdge(userId, {
      notebook_id: notebookId,
      source_id: node1.id,
      target_id: node2.id,
      edge_type: "cites",
    });

    // Count edges before deletion
    const edgesBefore = await repo.countEdgesForNode(userId, notebookId, node1.id);
    expect(edgesBefore).toBe(1);

    // Delete node1 via service
    const removeResult = await service.remove(userId, notebookId, node1.id);
    expect(removeResult.edges_removed).toBe(1);

    // Verify edges count after deletion is 0 (FM-401)
    const edgesAfter = await repo.countEdgesForNode(userId, notebookId, node1.id);
    expect(edgesAfter).toBe(0);
  });

  test("TC-S4.2.12: listing nodes for own notebook works", async () => {
    const userId = `user-${uuidv4()}`;
    const notebookId = uuidv4();

    await db.insertInto("users").values({
      id: userId,
      email: `${userId}@example.com`,
    }).execute();

    await db
      .insertInto("notebooks")
      .values({ id: notebookId, user_id: userId, title: "Test", created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .execute();

    // Create two nodes
    await repo.insertNode(userId, {
      notebook_id: notebookId,
      parent_id: null,
      kind: "text",
      title: "Note 1",
      content: "first",
      document_id: null,
      position: 0,
    });
    await repo.insertNode(userId, {
      notebook_id: notebookId,
      parent_id: null,
      kind: "text",
      title: "Note 2",
      content: "second",
      document_id: null,
      position: 1,
    });

    const nodes = await repo.listNodes(userId, notebookId, null);
    expect(nodes.length).toBe(2);
  });

  test("TC-S4.2.13: write to deleted notebook aborts with not-found (FM-404)", async () => {
    const userId = `user-${uuidv4()}`;
    const notebookId = uuidv4();

    await db.insertInto("users").values({
      id: userId,
      email: `${userId}@example.com`,
    }).execute();

    // Soft-deleted notebook (deleted_at is set)
    await db
      .insertInto("notebooks")
      .values({
        id: notebookId,
        user_id: userId,
        title: "Deleted Notebook",
        deleted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .execute();

    // Writing to a deleted notebook must reject with notFound
    await expect(
      service.create(userId, {
        notebook_id: notebookId,
        kind: "text",
        title: "Orphan Attempt",
        content: "should not be created",
      })
    ).rejects.toThrow();
  });
});