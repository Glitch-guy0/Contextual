import { describe, expect, it } from "bun:test";
import { CreditLedgerService, InMemoryRedis } from "../src/credit-ledger";

describe("Milestone M2 — Story S2.1: Atomic Upstash Redis Lua Credit Ledger Service", () => {
  it("TC-2.1.1: Default account initialized with 10.0 credits", async () => {
    const ledger = new CreditLedgerService();
    const balance = await ledger.getBalance("usr_test_init_01");

    expect(balance).toBe(10.0);
  });

  it("TC-2.1.2: Atomic Lua script debits 0.5 or 1.0 credits and returns balance", async () => {
    const ledger = new CreditLedgerService();
    const userId = "usr_test_debit_02";

    // First debit: 0.5
    const res1 = await ledger.debitCredits(userId, 0.5, "llm_action");
    expect(res1.success).toBe(true);
    expect(res1.debited).toBe(0.5);
    expect(res1.remaining).toBe(9.5);

    // Second debit: 1.0
    const res2 = await ledger.debitCredits(userId, 1.0, "doc_process");
    expect(res2.success).toBe(true);
    expect(res2.debited).toBe(1.0);
    expect(res2.remaining).toBe(8.5);

    // Verify balance query matches
    const current = await ledger.getBalance(userId);
    expect(current).toBe(8.5);
  });

  it("TC-2.1.3: 100 concurrent debits against 10.0 balance results in zero negative balance", async () => {
    const ledger = new CreditLedgerService();
    const userId = "usr_test_concurrency_03";

    // 100 parallel debits of 0.5 credits each against an initial 10.0 balance
    // Exactly 20 debits should succeed (20 * 0.5 = 10.0), and 80 should fail
    const promises = Array.from({ length: 100 }, () =>
      ledger.debitCredits(userId, 0.5, "concurrent_action")
    );

    const results = await Promise.all(promises);

    const successes = results.filter((r) => r.success);
    const failures = results.filter((r) => !r.success);

    expect(successes.length).toBe(20);
    expect(failures.length).toBe(80);

    // None of the results should ever report a negative remaining balance
    for (const res of results) {
      expect(res.remaining).toBeGreaterThanOrEqual(0.0);
    }

    const finalBalance = await ledger.getBalance(userId);
    expect(finalBalance).toBe(0.0);

    // Subsequent debit must also fail
    const overDebit = await ledger.debitCredits(userId, 0.5, "over_quota");
    expect(overDebit.success).toBe(false);
    expect(overDebit.remaining).toBe(0.0);
  });

  it("EVALSHA handles NOSCRIPT and reloads seamlessly", async () => {
    const redis = new InMemoryRedis();
    const ledger = new CreditLedgerService({ redisClient: redis });

    const res = await ledger.debitCredits("usr_noscript_test", 0.5);
    expect(res.success).toBe(true);
    expect(res.remaining).toBe(9.5);
  });
});
