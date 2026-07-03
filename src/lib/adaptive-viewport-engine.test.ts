import { afterEach, describe, expect, it, vi } from "vitest";
import { detectHorizontalOverflowDev, detectViewportClass } from "./adaptive-viewport-engine";

function setElementWidth(el: HTMLElement, clientWidth: number, scrollWidth: number) {
  Object.defineProperty(el, "clientWidth", { configurable: true, value: clientWidth });
  Object.defineProperty(el, "scrollWidth", { configurable: true, value: scrollWidth });
}

describe("AdaptiveViewportEngine", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("classifies mobile-sm", () => {
    expect(detectViewportClass(360)).toBe("mobile-sm");
  });

  it("classifies tablet", () => {
    expect(detectViewportClass(900)).toBe("tablet");
  });

  it("classifies ultrawide", () => {
    expect(detectViewportClass(2560)).toBe("ultrawide");
  });

  it("ignores intentional horizontal scroll containers", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const rail = document.createElement("div");
    rail.style.overflowX = "auto";
    setElementWidth(rail, 320, 640);
    document.body.appendChild(rail);

    expect(detectHorizontalOverflowDev()).toEqual([]);
  });

  it("reports non-intentional horizontal overflow", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const wide = document.createElement("div");
    setElementWidth(wide, 320, 640);
    document.body.appendChild(wide);

    expect(detectHorizontalOverflowDev()).toEqual([
      expect.objectContaining({ tag: "div", clientWidth: 320, scrollWidth: 640 }),
    ]);
  });
});
