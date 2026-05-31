import { describe, expect, it, vi, beforeEach } from "vitest";
import { buildLocalCreditWalletSnapshot, isCreditEnforcementActive } from "@/lib/billing/creditWallet";
import { getMonthlyCreditsForPlan } from "@/lib/billing/creditPolicy";

vi.mock("@/integrations/supabase/client", () => ({
  isSupabaseConfigured: vi.fn(() => false),
}));

vi.mock("@/lib/supabase-function-auth", () => ({
  invokeSupabaseFunction: vi.fn(async () => ({ data: null, error: new Error("offline") })),
}));

vi.mock("@/services/storageService", () => ({
  getCurrentUserId: vi.fn(() => "test-user"),
}));

describe("creditWallet", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it("buildLocalCreditWalletSnapshot returns plan allowance minus zero usage", () => {
    const wallet = buildLocalCreditWalletSnapshot("free");
    expect(wallet.source).toBe("local-fallback");
    expect(wallet.availableCredits).toBe(getMonthlyCreditsForPlan("free"));
    expect(wallet.monthlyAllowance).toBe(40);
  });

  it("loadCreditWallet falls back without throwing when edge function fails", async () => {
    const { loadCreditWallet } = await import("@/lib/billing/creditWallet");
    const wallet = await loadCreditWallet("pro");
    expect(wallet.source).toBe("local-fallback");
    expect(wallet.availableCredits).toBe(getMonthlyCreditsForPlan("pro"));
  });

  it("isCreditEnforcementActive is false unless env explicitly true", () => {
    expect(isCreditEnforcementActive()).toBe(false);
  });
});
