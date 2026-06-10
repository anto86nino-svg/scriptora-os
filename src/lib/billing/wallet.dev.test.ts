import { beforeEach, describe, expect, it, vi } from "vitest";
import { enableDevMode, exitDevMode } from "@/lib/dev-mode";
import { setAuthSessionContext, clearAuthSessionContext } from "@/lib/auth/sessionContext";
import { loadCreditWallet, saveCreditWallet, seedDevWalletIfNeeded } from "./wallet";
import { commitCreditsAsync } from "./commit";

describe("dev owner wallet usability", () => {
  beforeEach(() => {
    exitDevMode();
    clearAuthSessionContext();
    localStorage.clear();
    vi.stubEnv("PROD", false);
  });

  it("seeds owner dev wallet once and debits real balance on commit", async () => {
    enableDevMode();
    setAuthSessionContext({
      id: "owner-wallet-1",
      email: "natasharomanoff1990anto@gmail.com",
    });

    const seeded = seedDevWalletIfNeeded();
    expect(seeded.balance).toBe(1_000_000);

    const result = await commitCreditsAsync("rewrite_chapter", { projectId: "p1" });
    expect(result.ok).toBe(true);
    expect(result.committed).toBe(true);
    expect(loadCreditWallet().balance).toBeLessThan(1_000_000);
  });

  it("does not auto-refill wallet after debits", async () => {
    enableDevMode();
    setAuthSessionContext({
      id: "owner-wallet-2",
      email: "natasharomanoff1990anto@gmail.com",
    });
    saveCreditWallet({ balance: 400, planId: "free", updatedAt: new Date().toISOString() });

    await commitCreditsAsync("rewrite_chapter", { projectId: "p1" });
    const after = loadCreditWallet().balance;
    expect(after).toBeLessThan(400);
    expect(loadCreditWallet().balance).toBe(after);
  });
});
