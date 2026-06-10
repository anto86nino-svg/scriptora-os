/** Mobile boot optimizations — strip heavy visuals without removing features. */

export const SCRIPTORA_MOBILE_LITE_CLASS = "scriptora-mobile-lite";

export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  const narrow = window.matchMedia("(max-width: 767px)").matches;
  const coarse = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  const shortViewport = window.matchMedia("(max-height: 500px) and (orientation: landscape)").matches;
  return narrow || coarse || shortViewport;
}

/** Apply before first React paint (also called from main.tsx). */
export function applyMobilePerformanceBoot(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!isMobileDevice()) return;

  root.classList.add(SCRIPTORA_MOBILE_LITE_CLASS);
  root.dataset.scriptoraMobileLite = "1";
}
