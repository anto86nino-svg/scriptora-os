import { beforeEach, describe, expect, it, vi } from "vitest";
import { enableDevMode, exitDevMode } from "@/lib/dev-mode";
import { setAuthSessionContext, clearAuthSessionContext } from "@/lib/auth/sessionContext";
import { loadCreditWallet } from "./wallet";
import { purchaseCreditsSimulator } from "./devPurchase";

describe("devPurchase simulator", () => {
  beforeEach(() => {
    exitDevMode();
    clearAuthSessionContext();
    vi.stubEnv("PROD", false);
    localStorage.clear();
  });

  it("adds credits to scoped local wallet for owner dev session", async () => {
    enableDevMode();
    setAuthSessionContext({
      id: "owner-wallet-1",
      email: "natasharomanoff1990anto@gmail.com",
    });

    const before = loadCreditWallet().balance;
    const result = await purchaseCreditsSimulator(5_000);

    expect(result.ok).toBe(true);
    expect(result.creditsAdded).toBe(5_000);
    expect(loadCreditWallet().balance).toBe(before + 5_000);
  });

  it("rejects purchase for non-owner", async () => {
    enableDevMode();
    setAuthSessionContext({ id: "other-1", email: "other@example.com" });

    const result = await purchaseCreditsSimulator(1_000);
    expect(result.ok).toBe(false);
  });
});
