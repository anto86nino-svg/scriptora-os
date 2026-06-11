import { describe, expect, it } from "vitest";
import { detectViewportClass } from "./adaptive-viewport-engine";

describe("AdaptiveViewportEngine", () => {
  it("classifies mobile-sm", () => {
    expect(detectViewportClass(360)).toBe("mobile-sm");
  });

  it("classifies tablet", () => {
    expect(detectViewportClass(900)).toBe("tablet");
  });

  it("classifies ultrawide", () => {
    expect(detectViewportClass(2560)).toBe("ultrawide");
  });
});
