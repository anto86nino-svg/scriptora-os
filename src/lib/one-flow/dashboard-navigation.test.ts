import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { resetRouteScroll } from "./dashboard-navigation";

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

describe("resetRouteScroll", () => {
  beforeEach(() => {
    document.body.classList.add("scriptora-dashboard-tool-open");
    document.documentElement.classList.add("scriptora-route-changing");
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.top = "-120px";
  });

  afterEach(() => {
    document.body.className = "";
    document.documentElement.className = "";
    document.body.removeAttribute("style");
    document.documentElement.removeAttribute("style");
  });

  it("clears dashboard overlay classes and inline body scroll locks", () => {
    resetRouteScroll();

    expect(document.body.classList.contains("scriptora-dashboard-tool-open")).toBe(false);
    expect(document.documentElement.classList.contains("scriptora-route-changing")).toBe(false);
    expect(document.body.style.overflow).toBe("");
    expect(document.body.style.position).toBe("");
    expect(document.body.style.width).toBe("");
    expect(document.body.style.top).toBe("");
  });

  it("avoids jsdom scrollTo noise while still resetting scroll positions", async () => {
    const originalScrollTo = window.scrollTo;
    const scrollTo = vi.fn();
    Object.defineProperty(window, "scrollTo", { value: scrollTo, configurable: true });

    try {
      document.documentElement.scrollTop = 140;
      document.body.scrollTop = 80;

      resetRouteScroll();
      await nextFrame();
      await nextFrame();

      expect(scrollTo).not.toHaveBeenCalled();
      expect(document.documentElement.scrollTop).toBe(0);
      expect(document.body.scrollTop).toBe(0);
    } finally {
      Object.defineProperty(window, "scrollTo", { value: originalScrollTo, configurable: true });
    }
  });
});
