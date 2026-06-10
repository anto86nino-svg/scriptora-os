import { beforeEach, describe, expect, it, vi } from "vitest";
import { enableDevMode, exitDevMode } from "@/lib/dev-mode";
import { setAuthSessionContext, clearAuthSessionContext } from "./sessionContext";
import {
  canDevSimulateCreditPurchase,
  isAuthorizedDevWalletUser,
} from "./devWalletAccess";

describe("dev wallet access", () => {
  beforeEach(() => {
    exitDevMode();
    clearAuthSessionContext();
    vi.stubEnv("PROD", false);
  });

  it("allows simulated purchase for owner in dev mode (non-prod)", () => {
    enableDevMode();
    setAuthSessionContext({
      id: "owner-1",
      email: "natasharomanoff1990anto@gmail.com",
    });
    expect(isAuthorizedDevWalletUser()).toBe(true);
    expect(canDevSimulateCreditPurchase()).toBe(true);
  });

  it("blocks simulated purchase for non-owner", () => {
    enableDevMode();
    setAuthSessionContext({ id: "user-2", email: "user@example.com" });
    expect(isAuthorizedDevWalletUser()).toBe(false);
    expect(canDevSimulateCreditPurchase()).toBe(false);
  });

  it("blocks simulated purchase in production but keeps local dev wallet for owner", () => {
    vi.stubEnv("PROD", true);
    enableDevMode();
    setAuthSessionContext({
      id: "owner-1",
      email: "natasharomanoff1990anto@gmail.com",
    });
    expect(isAuthorizedDevWalletUser()).toBe(true);
    expect(canDevSimulateCreditPurchase()).toBe(false);
  });
});
