import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SCRIPTORA_DESKTOP_MODE_KEY,
  SCRIPTORA_MOBILE_LITE_CLASS,
  disableDesktopModeOverride,
  enableDesktopModeOverride,
  isMobileLiteMode,
} from "./mobile-performance";

function setViewport(width: number, height: number, coarse = false) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches:
      (query.includes("max-width: 767px") && width <= 767) ||
      (query.includes("max-height: 500px") && height <= 500) ||
      (query.includes("pointer: coarse") && coarse) ||
      (query.includes("hover: none") && coarse),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe("mobile performance boot", () => {
  afterEach(() => {
    disableDesktopModeOverride();
    vi.unstubAllGlobals();
  });

  it("exports mobile lite class name for CSS hook", () => {
    expect(SCRIPTORA_MOBILE_LITE_CLASS).toBe("scriptora-mobile-lite");
  });

  it("enables Mobile Lite on phone-sized viewports", () => {
    setViewport(390, 844, true);
    expect(isMobileLiteMode()).toBe(true);
  });

  it("enables Mobile Lite on small touch tablets", () => {
    setViewport(1024, 768, true);
    expect(isMobileLiteMode()).toBe(true);
  });

  it("does not enable Mobile Lite on desktop-sized screens", () => {
    setViewport(1440, 900, false);
    expect(isMobileLiteMode()).toBe(false);
  });

  it("does not treat large touch workstations as Mobile Lite", () => {
    setViewport(1366, 900, true);
    expect(isMobileLiteMode()).toBe(false);
  });

  it("lets mobile users continue in full desktop mode explicitly", () => {
    setViewport(390, 844, true);
    expect(isMobileLiteMode()).toBe(true);

    enableDesktopModeOverride();

    expect(window.localStorage.getItem(SCRIPTORA_DESKTOP_MODE_KEY)).toBe("1");
    expect(isMobileLiteMode()).toBe(false);
  });
});
