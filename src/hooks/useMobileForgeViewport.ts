import { useEffect, useState } from "react";

/** Lock document scroll while Book Forge fullscreen is open (avoids dashboard bleed-through). */
export function useMobileForgeBodyLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyWidth = body.style.width;
    const scrollY = window.scrollY;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.width = "100%";
    body.style.top = `-${scrollY}px`;

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.position = prevBodyPosition;
      body.style.width = prevBodyWidth;
      body.style.top = "";
      window.scrollTo(0, scrollY);
    };
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
