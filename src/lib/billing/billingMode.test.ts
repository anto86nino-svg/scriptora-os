import { beforeEach, describe, expect, it, vi } from "vitest";
import { enableDevMode, exitDevMode } from "@/lib/dev-mode";
import { setAuthSessionContext, clearAuthSessionContext } from "@/lib/auth/sessionContext";
import { getBillingExecutionMode } from "./billingMode";

describe("billing execution mode", () => {
  beforeEach(() => {
    exitDevMode();
    clearAuthSessionContext();
  });

  it("uses server mode in production", () => {
    vi.stubEnv("PROD", true);
    enableDevMode();
    setAuthSessionContext({
      id: "owner-1",
      email: "natasharomanoff1990anto@gmail.com",
    });
    expect(getBillingExecutionMode()).toBe("server");
  });

  it("uses local_dev for owner in dev mode (non-prod)", () => {
    vi.stubEnv("PROD", false);
    enableDevMode();
    setAuthSessionContext({
      id: "owner-1",
      email: "natasharomanoff1990anto@gmail.com",
    });
    expect(getBillingExecutionMode()).toBe("local_dev");
  });

  it("uses server for non-owner even in vite dev", () => {
    vi.stubEnv("PROD", false);
    enableDevMode();
    setAuthSessionContext({ id: "user-1", email: "guest@example.com" });
    expect(getBillingExecutionMode()).toBe("server");
  });
});
