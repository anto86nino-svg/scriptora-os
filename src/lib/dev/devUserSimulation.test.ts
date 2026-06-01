import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __clearDevSimulationForTests,
  __writeDevSimulationStateForTests,
  buildSimulatedCreditWalletSnapshot,
  consumeDevSimulatedCredits,
  DEV_SIMULATION_CHANGE_EVENT,
  getSimulatedPlanTier,
  isDevUserSimulationActive,
  readDevSimulationState,
  setSimulationMode,
} from "./devUserSimulation";

vi.mock("@/lib/dev-mode", () => ({
  isDevMode: () => true,
}));

vi.mock("@/lib/app-environment", () => ({
  canUseDevTools: () => true,
}));

vi.mock("@/lib/dev-plan-override", () => ({
  getDevPlanOverride: () => "premium" as const,
}));

describe("devUserSimulation", () => {
  beforeEach(() => {
    __clearDevSimulationForTests();
    vi.stubEnv("DEV", true);
  });

  it("starts OFF by default", () => {
    expect(readDevSimulationState().mode).toBe("OFF");
    expect(isDevUserSimulationActive()).toBe(false);
  });

  it("FREE mode uses real monthly allowance and consumes real costs", () => {
    setSimulationMode("FREE");
    expect(isDevUserSimulationActive()).toBe(true);
    expect(getSimulatedPlanTier()).toBe("free");

    const walletBefore = buildSimulatedCreditWalletSnapshot();
    expect(walletBefore.monthlyAllowance).toBe(40);

    const check = consumeDevSimulatedCredits({ operation: "title_generation" });
    expect(check.allowed).toBe(true);
    expect(check.requiredCredits).toBeGreaterThanOrEqual(1);

    const walletAfter = buildSimulatedCreditWalletSnapshot();
    expect(walletAfter.usedCredits).toBe(walletBefore.usedCredits + check.requiredCredits);
    expect(walletAfter.availableCredits).toBe(walletBefore.availableCredits - check.requiredCredits);
  });

  it("blocks when credits exhausted using canRunCreditOperation", () => {
    __writeDevSimulationStateForTests({
      mode: "FREE",
      area: "full_os",
      usedCredits: 40,
      booksThisMonth: 0,
      bookLimitReached: false,
      subscriptionState: "active",
      flags: {
        realGatingEnabled: true,
        realPaywallEnabled: true,
        simulateExpiredPlan: false,
        simulateLowCredits: false,
        showLockedState: true,
      },
      periodStart: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`,
      updatedAt: new Date().toISOString(),
    });

    const check = consumeDevSimulatedCredits({ operation: "chapter_generation_standard" });
    expect(check.allowed).toBe(false);
    expect(check.missingCredits).toBeGreaterThan(0);
  });

  it("dispatches change event on mode switch", () => {
    const handler = vi.fn();
    window.addEventListener(DEV_SIMULATION_CHANGE_EVENT, handler);
    setSimulationMode("PRO");
    expect(handler).toHaveBeenCalled();
    window.removeEventListener(DEV_SIMULATION_CHANGE_EVENT, handler);
  });
});
