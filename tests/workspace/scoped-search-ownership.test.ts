import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { Kysely } from "kysely";
import { getKyselyDb, closeKyselyDb } from "../../packages/db/src/index.js";
import { WorkspaceRepository } from "../../packages/workspace/src/repository.js";
import { scopedSearch, type VectorClientLike, type CreditLedgerLike } from "../../packages/workspace/src/search.js";
import { AppProblemError } from "../../packages/contracts/src/errors.js";
import { WorkspaceValidationError } from "../../packages/workspace/src/types.js";
import { v4 as uuidv4 } from "uuid";

describe("Milestone M4 — Story S4.5: Scoped Retrieval Ownership First (AC-4.4, FR-034, BR-036)", () => {
  let db: Kysely<any>;
  let repo: WorkspaceRepository;

  beforeAll(async () => {
    db = getKyselyDb("postgresql://contextual:contextual_local_only@127.0.0.1:5432/contextual");
    repo = new WorkspaceRepository(db);
  });

  afterAll(async () => {
    await closeKyselyDb();
  });

  test("TC-S4.5.1: malformed scope_kind returns HTTP 400 before any other work", async () => {
    let debitCalled = false;
    let vectorCalled = false;

    const dummyLedger: CreditLedgerLike = {
      debitCredits: async () => {
        debitCalled = true;
        return { success: true, remaining: 9.5, debited: 0.5 };
      },
    };

    const dummyVector: VectorClientLike = {
      query: async () => {
        vectorCalled = true;
        return [];
      },
    };

    try {
      await scopedSearch(
        { repository: repo, creditLedger: dummyLedger, vectorClient: dummyVector },
        "user-test",
        uuidv4(),
        { scope_kind: "invalid-scope" as any, scope_id: uuidv4(), query: "hello" }
      );
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(WorkspaceValidationError);
      expect((err as WorkspaceValidationError).issues[0].field).toBe("scope_kind");
      expect(debitCalled).toBe(false);
      expect(vectorCalled).toBe(false);
    }
  });

  test("TC-S4.5.2: unowned notebook returns 404, balance unchanged, and 0 vector calls (AC-4.4, FM-403)", async () => {
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
      title: "User A Notebook",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).execute();

    let initialBalance = 10.0;
    let currentBalance = initialBalance;
    let debitCallCount = 0;
    let vectorCallCount = 0;

    const mockLedger: CreditLedgerLike = {
      debitCredits: async (_userId, cost) => {
        debitCallCount++;
        currentBalance -= cost;
        return { success: true, remaining: currentBalance, debited: cost };
      },
    };

    const mockVector: VectorClientLike = {
      query: async () => {
        vectorCallCount++;
        return [];
      },
    };

    // User B attempts to query User A's notebook
    try {
      await scopedSearch(
        { repository: repo, creditLedger: mockLedger, vectorClient: mockVector },
        userB, // authenticated caller is User B
        notebookA, // target is notebookA (owned by User A)
        { scope_kind: "notebook", scope_id: notebookA, query: "quantum computing" }
      );
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(AppProblemError);
      const prob = err as AppProblemError;
      expect(prob.key).toBe("NOTEBOOK_NOT_FOUND");
      expect(prob.toProblemDocument().status).toBe(404);

      // Crucial AC-4.4 assertions:
      // 1. Balance unchanged
      expect(currentBalance).toBe(initialBalance);
      // 2. Debit calls = 0
      expect(debitCallCount).toBe(0);
      // 3. Vector client calls = 0
      expect(vectorCallCount).toBe(0);
    }
  });

  test("TC-S4.5.3: unowned node returns 404 with 0 debits and 0 vector calls", async () => {
    const userA = `user-${uuidv4()}`;
    const userB = `user-${uuidv4()}`;
    const notebookA = uuidv4();
    const foreignNodeId = uuidv4();

    await db.insertInto("users").values([
      { id: userA, email: `${userA}@example.com` },
      { id: userB, email: `${userB}@example.com` },
    ]).execute();

    await db.insertInto("notebooks").values({
      id: notebookA,
      user_id: userA,
      title: "User A Notebook",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).execute();

    let debitCallCount = 0;
    let vectorCallCount = 0;

    const mockLedger: CreditLedgerLike = {
      debitCredits: async (_userId, cost) => {
        debitCallCount++;
        return { success: true, remaining: 9.5, debited: cost };
      },
    };

    const mockVector: VectorClientLike = {
      query: async () => {
        vectorCallCount++;
        return [];
      },
    };

    try {
      await scopedSearch(
        { repository: repo, creditLedger: mockLedger, vectorClient: mockVector },
        userA,
        notebookA,
        { scope_kind: "node", scope_id: foreignNodeId, query: "search test" }
      );
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(AppProblemError);
      expect((err as AppProblemError).key).toBe("NOTEBOOK_NOT_FOUND");
      expect(debitCallCount).toBe(0);
      expect(vectorCallCount).toBe(0);
    }
  });
});
