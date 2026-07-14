import { useEffect, useState } from "react";

const MOBILE_SCROLL_LOCK_CLASS = "scriptora-mobile-scroll-locked";

type ScrollLockSnapshot = {
  scrollY: number;
  htmlOverflow: string;
  bodyOverflow: string;
  bodyPosition: string;
  bodyWidth: string;
  bodyTop: string;
  htmlHadClass: boolean;
  bodyHadClass: boolean;
};

let scrollLockCount = 0;
let scrollLockSnapshot: ScrollLockSnapshot | null = null;

function acquireDocumentScrollLock(): void {
  const html = document.documentElement;
  const body = document.body;

  scrollLockCount += 1;
  if (scrollLockCount > 1) return;

  const scrollY = window.scrollY;
  scrollLockSnapshot = {
    scrollY,
    htmlOverflow: html.style.overflow,
    bodyOverflow: body.style.overflow,
    bodyPosition: body.style.position,
    bodyWidth: body.style.width,
    bodyTop: body.style.top,
    htmlHadClass: html.classList.contains(MOBILE_SCROLL_LOCK_CLASS),
    bodyHadClass: body.classList.contains(MOBILE_SCROLL_LOCK_CLASS),
  };

  html.classList.add(MOBILE_SCROLL_LOCK_CLASS);
  body.classList.add(MOBILE_SCROLL_LOCK_CLASS);
  html.style.overflow = "hidden";
  body.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.width = "100%";
  body.style.top = `-${scrollY}px`;
}

function releaseDocumentScrollLock(): void {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount > 0) return;

  const snapshot = scrollLockSnapshot;
  scrollLockSnapshot = null;
  if (!snapshot) return;

  const html = document.documentElement;
  const body = document.body;
  html.style.overflow = snapshot.htmlOverflow;
  body.style.overflow = snapshot.bodyOverflow;
  body.style.position = snapshot.bodyPosition;
  body.style.width = snapshot.bodyWidth;
  body.style.top = snapshot.bodyTop;
  if (!snapshot.htmlHadClass) html.classList.remove(MOBILE_SCROLL_LOCK_CLASS);
  if (!snapshot.bodyHadClass) body.classList.remove(MOBILE_SCROLL_LOCK_CLASS);

  const isJsdom = typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("jsdom");
  if (import.meta.env.MODE === "test" || isJsdom) return;
  try {
    window.scrollTo(0, snapshot.scrollY);
  } catch {
    // jsdom exposes scrollTo but does not implement it.
  }
}

/** Lock document scroll while Book Forge fullscreen is open (avoids dashboard bleed-through). */
export function useMobileForgeBodyLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;

    acquireDocumentScrollLock();
    return releaseDocumentScrollLock;
  }, [active]);
}

/**
 * Offset for on-screen keyboard (iOS/Android visualViewport).
 * Returns extra bottom padding so sticky input stays above keyboard.
 */
export function useMobileForgeKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const keyboardGap = window.innerHeight - vv.height - vv.offsetTop;
      setInset(keyboardGap > 48 ? Math.round(keyboardGap) : 0);
    };

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("orientationchange", update);
    update();

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return inset;
}
