import { beforeEach, describe, expect, it, vi } from "vitest";
import { enableDevMode, exitDevMode } from "@/lib/dev-mode";
import { setAuthSessionContext, clearAuthSessionContext } from "@/lib/auth/sessionContext";
import { setDevUnlimitedCredits } from "./devMode";
import { loadCreditWallet, saveCreditWallet } from "./wallet";
import { appendLedgerEntry } from "./ledger";
import { commitCreditsAsync } from "./commit";

describe("commit credits in dev wallet", () => {
  beforeEach(() => {
    exitDevMode();
    clearAuthSessionContext();
    localStorage.clear();
    vi.stubEnv("PROD", false);
    setDevUnlimitedCredits(false);
  });

  it("deducts credits when unlimited mode is off", async () => {
    enableDevMode();
    setAuthSessionContext({
      id: "owner-commit-1",
      email: "natasharomanoff1990anto@gmail.com",
    });
    saveCreditWallet({ balance: 500, planId: "free", updatedAt: new Date().toISOString() });

    const result = await commitCreditsAsync("rewrite_chapter", { projectId: "p1" });
    expect(result.ok).toBe(true);
    expect(result.committed).toBe(true);
    expect(loadCreditWallet().balance).toBeLessThan(500);
  });

  it("skips debit when unlimited dev credits are on", async () => {
    enableDevMode();
    setAuthSessionContext({
      id: "owner-commit-2",
      email: "natasharomanoff1990anto@gmail.com",
    });
    saveCreditWallet({ balance: 100, planId: "free", updatedAt: new Date().toISOString() });
    setDevUnlimitedCredits(true);

    const result = await commitCreditsAsync("rewrite_chapter", { projectId: "p1" });
    expect(result.ok).toBe(true);
    expect(result.simulated).toBe(true);
    expect(loadCreditWallet().balance).toBe(100);
  });

  it("blocks when balance is insufficient", async () => {
    enableDevMode();
    setAuthSessionContext({
      id: "owner-commit-3",
      email: "natasharomanoff1990anto@gmail.com",
    });
    saveCreditWallet({ balance: 0, planId: "free", updatedAt: new Date().toISOString() });
    appendLedgerEntry({
      operation: "rewrite_chapter",
      amount: -500,
      balanceAfter: 0,
      metadata: { test: "spent_all" },
      simulated: false,
    });

    const result = await commitCreditsAsync("rewrite_chapter", { projectId: "p1" });
    expect(result.ok).toBe(false);
    expect(result.balanceAfter).toBe(0);
  });
});
