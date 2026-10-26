import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { Kysely } from "kysely";
import { getKyselyDb, closeKyselyDb } from "../../packages/db/src/index.js";
import { WorkspaceRepository } from "../../packages/workspace/src/repository.js";
import { scopedSearch, type VectorClientLike, type CreditLedgerLike } from "../../packages/workspace/src/search.js";
import { AppProblemError } from "../../packages/contracts/src/errors.js";
import { v4 as uuidv4 } from "uuid";

describe("Milestone M4 — Story S4.5: Scoped Search Metering & Compensation", () => {
  let db: Kysely<any>;
  let repo: WorkspaceRepository;

  beforeAll(async () => {
    db = getKyselyDb("postgresql://contextual:contextual_local_only@127.0.0.1:5432/contextual");
    repo = new WorkspaceRepository(db);
  });

  afterAll(async () => {
    await closeKyselyDb();
  });

  async function createOwnedFixture() {
    const userId = `user-${uuidv4()}`;
    const notebookId = uuidv4();

    await db.insertInto("users").values({
      id: userId,
      email: `${userId}@example.com`,
    }).execute();

    await db.insertInto("notebooks").values({
      id: notebookId,
      user_id: userId,
      title: "Search Notebook",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).execute();

    const node = await repo.insertNode(userId, {
      notebook_id: notebookId,
      parent_id: null,
      kind: "text",
      title: "Grounded Note",
      content: "Deep learning transformer architecture",
      document_id: null,
      position: 0,
    });

    return { userId, notebookId, node };
  }

  test("TC-S4.5.4: owned scope debits once and queries vector store with user_id filter (NFR-007)", async () => {
    const { userId, notebookId } = await createOwnedFixture();

    let debitCallCount = 0;
    let debitedAmount = 0;
    let vectorFilter: any = null;

    const mockLedger: CreditLedgerLike = {
      debitCredits: async (_uid, cost) => {
        debitCallCount++;
        debitedAmount += cost;
        return { success: true, remaining: 9.5, debited: cost };
      },
    };

    const mockVector: VectorClientLike = {
      query: async (opts) => {
        vectorFilter = opts.filter;
        return [
          {
            id: "match-1",
            score: 0.92,
            metadata: {
              node_id: "node-1",
              title: "Result Title",
              text: "Matched snippet content",
            },
          },
        ];
      },
    };

    const response = await scopedSearch(
      { repository: repo, creditLedger: mockLedger, vectorClient: mockVector },
      userId,
      notebookId,
      { scope_kind: "notebook", scope_id: notebookId, query: "transformer" }
    );

    expect(debitCallCount).toBe(1);
    expect(debitedAmount).toBe(0.5);
    expect(response.credits_debited).toBe(0.5);
    expect(response.results.length).toBe(1);
    expect(response.results[0].title).toBe("Result Title");

    // Assert mandatory tenant isolation filter on vector query
    expect(vectorFilter).not.toBeNull();
    expect(vectorFilter.user_id).toBe(userId);
    expect(vectorFilter.notebook_id).toBe(notebookId);
  });

  test("TC-S4.5.5: insufficient balance returns HTTP 402 with zero vector calls", async () => {
    const { userId, notebookId } = await createOwnedFixture();

    let vectorCallCount = 0;

    const poorLedger: CreditLedgerLike = {
      debitCredits: async () => {
        return { success: false, remaining: 0.1, debited: 0 };
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
        { repository: repo, creditLedger: poorLedger, vectorClient: mockVector },
        userId,
        notebookId,
        { scope_kind: "notebook", scope_id: notebookId, query: "expensive query" }
      );
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(AppProblemError);
      const prob = err as AppProblemError;
      expect(prob.key).toBe("INSUFFICIENT_CREDITS");
      expect(prob.toProblemDocument().status).toBe(402);
      expect(vectorCallCount).toBe(0);
    }
  });

  test("TC-S4.5.6: vector provider failure triggers credit refund compensation and returns 502", async () => {
    const { userId, notebookId } = await createOwnedFixture();

    let refundCalledWith: number | null = null;

    const mockLedger: CreditLedgerLike = {
      debitCredits: async () => ({ success: true, remaining: 9.5, debited: 0.5 }),
      refundCredits: async (_uid, amount) => {
        refundCalledWith = amount;
      },
    };

    const failingVector: VectorClientLike = {
      query: async () => {
        throw new Error("Upstash Vector 503 Service Unavailable");
      },
    };

    try {
      await scopedSearch(
        { repository: repo, creditLedger: mockLedger, vectorClient: failingVector },
        userId,
        notebookId,
        { scope_kind: "notebook", scope_id: notebookId, query: "test failure" }
      );
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(AppProblemError);
      const prob = err as AppProblemError;
      expect(prob.key).toBe("UPSTREAM_PROVIDER_UNAVAILABLE");
      expect(prob.toProblemDocument().status).toBe(502);
      expect(refundCalledWith).toBe(0.5);
    }
  });
});
