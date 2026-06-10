import { describe, expect, it, beforeEach } from "vitest";
import { loadCreditWallet, saveCreditWallet } from "./wallet";
import { syncWalletBalanceFromServer } from "./syncWallet";

describe("syncWallet", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("aligns local cache with server balance after failed commit", () => {
    saveCreditWallet({ balance: 5000, planId: "free", updatedAt: new Date().toISOString() });
    syncWalletBalanceFromServer(120);
    expect(loadCreditWallet().balance).toBe(120);
  });
});
