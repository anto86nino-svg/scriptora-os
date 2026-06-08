import { describe, expect, it, vi } from "vitest";
import { logGenerationStart } from "./scriptora-logger";

describe("scriptora-logger", () => {
  it("logGenerationStart does not throw when meta is omitted", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(() => logGenerationStart("BLUEPRINT", "callBlueprintFast")).not.toThrow();
    spy.mockRestore();
  });

  it("logGenerationStart normalizes missing jwtPresent", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logGenerationStart("BLUEPRINT", "callBlueprintFast", { userId: "user-1" });
    expect(spy).toHaveBeenCalled();
    const payload = spy.mock.calls[0]?.[2] as { jwt?: string };
    expect(payload?.jwt).toBe("ABSENT (anon fallback)");
    spy.mockRestore();
  });
});
