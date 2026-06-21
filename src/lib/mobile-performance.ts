/** Mobile boot optimizations — strip heavy visuals without removing features. */

export const SCRIPTORA_MOBILE_LITE_CLASS = "scriptora-mobile-lite";
export const SCRIPTORA_DESKTOP_MODE_KEY = "scriptora-desktop-mode";

export function isDesktopModeOverrideActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("desktop") === "1" || window.localStorage.getItem(SCRIPTORA_DESKTOP_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

export function enableDesktopModeOverride(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SCRIPTORA_DESKTOP_MODE_KEY, "1");
  } catch {
    // Non-blocking: the URL parameter fallback still works.
  }
}

export function disableDesktopModeOverride(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SCRIPTORA_DESKTOP_MODE_KEY);
  } catch {
    // Non-blocking.
  }
}

export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  const narrow = window.matchMedia("(max-width: 767px)").matches;
  const coarse = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  const shortViewport = window.matchMedia("(max-height: 500px) and (orientation: landscape)").matches;
  return narrow || coarse || shortViewport;
}

/**
 * Product-level Mobile Lite detection.
 * This intentionally avoids user-agent checks: Scriptora Lite is for compact,
 * touch-first surfaces, not for desktop browsers or large tablet workstations.
 */
export function isMobileLiteMode(): boolean {
  if (typeof window === "undefined") return false;
  if (isDesktopModeOverrideActive()) return false;

  const width = window.innerWidth || document.documentElement.clientWidth || 0;
  const height = window.innerHeight || document.documentElement.clientHeight || 0;
  const minSide = Math.min(width, height);
  const maxSide = Math.max(width, height);
  const coarsePointer = window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
    window.matchMedia("(pointer: coarse)").matches;

  const phoneViewport = width <= 767;
  const smallTouchTablet = coarsePointer && minSide <= 820 && maxSide <= 1180;
  const crampedTouchLandscape = coarsePointer && height <= 520 && width <= 1024;

  return phoneViewport || smallTouchTablet || crampedTouchLandscape;
}

/** Apply before first React paint (also called from main.tsx). */
export function applyMobilePerformanceBoot(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!isMobileLiteMode()) return;

  root.classList.add(SCRIPTORA_MOBILE_LITE_CLASS);
  root.dataset.scriptoraMobileLite = "1";
}
