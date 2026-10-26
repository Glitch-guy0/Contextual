import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { Kysely } from "kysely";
import { getKyselyDb, closeKyselyDb } from "../../packages/db/src/index.js";
import { WorkspaceRepository } from "../../packages/workspace/src/repository.js";
import {
  createEdge,
  listEdgesForNotebook,
} from "../../packages/workspace/src/edges.js";
import { AppProblemError } from "../../packages/contracts/src/errors.js";
import { notFound } from "../../packages/workspace/src/types.js";
import { v4 as uuidv4 } from "uuid";

describe("Milestone M4 — Story S4.3: Edge Tenant Isolation (AC-4.2, AC-4.3)", () => {
  let db: Kysely<any>;
  let repo: WorkspaceRepository;

  beforeAll(async () => {
    db = getKyselyDb("postgresql://contextual:contextual_local_only@127.0.0.1:5432/contextual");
    repo = new WorkspaceRepository(db);
  });

  afterAll(async () => {
    await closeKyselyDb();
  });

  test("TC-S4.3.11: foreign source node returns 404 NOTEBOOK_NOT_FOUND", async () => {
    const userA = `user-${uuidv4()}`;
    const userB = `user-${uuidv4()}`;
    const notebookA = uuidv4();
    const notebookB = uuidv4();

    await db.insertInto("users").values([
      { id: userA, email: `${userA}@example.com` },
      { id: userB, email: `${userB}@example.com` },
    ]).execute();

    await db.insertInto("notebooks").values([
      { id: notebookA, user_id: userA, title: "Notebook A", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: notebookB, user_id: userB, title: "Notebook B", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ]).execute();

    const nodeA = await repo.insertNode(userA, {
      notebook_id: notebookA,
      parent_id: null,
      kind: "text",
      title: "Node in A",
      content: "content a",
      document_id: null,
      position: 0,
    });

    const nodeB = await repo.insertNode(userB, {
      notebook_id: notebookB,
      parent_id: null,
      kind: "text",
      title: "Node in B",
      content: "content b",
      document_id: null,
      position: 0,
    });

    // User A tries to link nodeB (foreign node) to nodeA -> throws 404 NOTEBOOK_NOT_FOUND
    try {
      await createEdge(repo, userA, notebookA, nodeA.id, nodeB.id, "cites");
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(AppProblemError);
      const prob = err as AppProblemError;
      expect(prob.key).toBe("NOTEBOOK_NOT_FOUND");
      expect(prob.toProblemDocument().status).toBe(404);
    }
  });

  test("TC-S4.3.12: listing edges for foreign notebook returns zero rows (AC-4.3)", async () => {
    const userA = `user-${uuidv4()}`;
    const userB = `user-${uuidv4()}`;
    const notebookA = uuidv4();

    await db.insertInto("users").values([
      { id: userA, email: `${userA}@example.com` },
      { id: userB, email: `${userB}@example.com` },
    ]).execute();

    await db.insertInto("notebooks").values({
      id: notebookA,
      user_id: userA,
      title: "Notebook A",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).execute();

    const node1 = await repo.insertNode(userA, {
      notebook_id: notebookA,
      parent_id: null,
      kind: "text",
      title: "Node 1",
      content: "content 1",
      document_id: null,
      position: 0,
    });

    const node2 = await repo.insertNode(userA, {
      notebook_id: notebookA,
      parent_id: null,
      kind: "text",
      title: "Node 2",
      content: "content 2",
      document_id: null,
      position: 1,
    });

    await createEdge(repo, userA, notebookA, node1.id, node2.id, "cites");

    // User A sees 1 edge
    const edgesA = await listEdgesForNotebook(repo, userA, notebookA);
    expect(edgesA.length).toBe(1);

    // User B querying User A's notebook gets 0 rows (zero cross-tenant data leakage, AC-4.3)
    const edgesB = await listEdgesForNotebook(repo, userB, notebookA);
    expect(edgesB.length).toBe(0);
  });
});
