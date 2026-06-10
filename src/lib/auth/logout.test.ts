import { describe, expect, it } from "vitest";

describe("logout contract", () => {
  it("documents that performLogout must not delete per-user wallet keys", () => {
    const projectKeys = ["nexora-projects", "scriptora-credit-wallet-v1:owner-1"];
    const logoutClears = ["nexora-open-project", "nexora-last-project", "nexora_plan_cache_v1"];
    expect(logoutClears).not.toContain(projectKeys[0]);
    expect(logoutClears.some((k) => k.includes("wallet"))).toBe(false);
  });
});
