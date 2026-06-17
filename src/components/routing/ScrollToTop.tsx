import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function scrollWindowToTop(): void {
  try {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  } catch {
    /* noop */
  }
}

/** Reset scroll position on every route change. */
export function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    scrollWindowToTop();
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollWindowToTop);
    });
  }, [location.pathname, location.search]);

  return null;
}
