import { beforeEach, describe, expect, it, vi } from "vitest";
import { enableDevMode, exitDevMode, isDevMode } from "./dev-mode";

describe("dev mode resolver", () => {
  beforeEach(() => {
    exitDevMode();
    vi.unstubAllEnvs();
  });

  it("uses the explicit session unlock", () => {
    expect(isDevMode()).toBe(false);
    enableDevMode();
    expect(isDevMode()).toBe(true);
  });

  it("supports VITE_SCRIPTORA_DEV_MODE for local diagnostic bypass", () => {
    vi.stubEnv("VITE_SCRIPTORA_DEV_MODE", "true");
    expect(isDevMode()).toBe(true);
  });
});
