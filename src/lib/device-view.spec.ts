import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  computeDesktopPreviewScale,
  getDeviceViewState,
  resolveEffectiveLayout,
  shouldUseDesktopPreview,
} from "./device-view";

describe("device-view desktop preview", () => {
  const originalUa = navigator.userAgent;
  const originalTouch = navigator.maxTouchPoints;

  beforeEach(() => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });
    Object.defineProperty(navigator, "maxTouchPoints", {
      configurable: true,
      value: 5,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: originalUa,
    });
    Object.defineProperty(navigator, "maxTouchPoints", {
      configurable: true,
      value: originalTouch,
    });
  });
  it("uses desktop_preview on phone when desktop is forced", () => {
    expect(resolveEffectiveLayout("desktop", "phone", 390)).toBe("desktop_preview");
    expect(shouldUseDesktopPreview("desktop", "phone", 390)).toBe(true);
  });

  it("does not use raw desktop layout on phone", () => {
    const state = getDeviceViewState("desktop", 390);
    expect(state.effectiveLayout).toBe("desktop_preview");
    expect(state.isDesktopPreview).toBe(true);
    expect(state.isCompactLayout).toBe(false);
  });

  it("computes scale without exceeding 1", () => {
    expect(computeDesktopPreviewScale(390, 844)).toBeLessThanOrEqual(1);
    expect(computeDesktopPreviewScale(390, 844)).toBeGreaterThan(0.28);
  });

  it("restores compact mobile when preference is mobile", () => {
    const state = getDeviceViewState("mobile", 390);
    expect(state.effectiveLayout).toBe("mobile");
    expect(state.isCompactLayout).toBe(true);
    expect(state.isDesktopPreview).toBe(false);
  });

  it("toggle path: desktop_preview is distinct from desktop", () => {
    expect(resolveEffectiveLayout("desktop", "desktop", 1440)).toBe("desktop");
    expect(resolveEffectiveLayout("desktop", "tablet", 800)).toBe("desktop_preview");
  });
});
