import { beforeEach, describe, expect, it, vi } from "vitest";
import { isMollyBrainOsEnabled, setMollyBrainOsEnabled } from "./flags";

describe("molly brain flags", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("innerWidth", 390);
  });

  it("is off by default on mobile unless explicitly enabled", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("767px") || query.includes("pointer: coarse"),
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    expect(isMollyBrainOsEnabled()).toBe(false);
    setMollyBrainOsEnabled(true);
    expect(isMollyBrainOsEnabled()).toBe(true);
  });
});
