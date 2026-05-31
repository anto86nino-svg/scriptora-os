import { useEffect } from "react";

/** Body scroll lock while full-screen overlays are open. */
export function lockViewportScroll() {
  if (typeof document === "undefined") return;
  document.body.classList.add("scriptora-mobile-overlay-open");
}

export function unlockViewportScroll() {
  if (typeof document === "undefined") return;
  document.body.classList.remove("scriptora-mobile-overlay-open");
}

/** Call from modal/dialog components when `open` is true. */
export function useScriptoraModalScrollLock(open: boolean): void {
  useEffect(() => {
    if (!open) return;
    lockViewportScroll();
    return () => unlockViewportScroll();
  }, [open]);
}

/** Attach visualViewport listeners — returns cleanup. */
export function bindViewportResize(onChange: () => void) {
  if (typeof window === "undefined") return () => undefined;

  const handler = () => onChange();
  window.addEventListener("resize", handler, { passive: true });
  window.addEventListener("orientationchange", handler);
  window.visualViewport?.addEventListener("resize", handler);
  window.visualViewport?.addEventListener("scroll", handler);

  return () => {
    window.removeEventListener("resize", handler);
    window.removeEventListener("orientationchange", handler);
    window.visualViewport?.removeEventListener("resize", handler);
    window.visualViewport?.removeEventListener("scroll", handler);
  };
}
