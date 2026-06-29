/** Reset scroll and dashboard overlay residue before/after route navigation. */
export function resetRouteScroll(): void {
  try {
    document.body.classList.remove("scriptora-dashboard-tool-open");
    document.documentElement.classList.remove("scriptora-route-changing");
    // Clear inline locks left by useMobileForgeBodyLock (Cover Studio, mobile forge, etc.)
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.width = "";
    document.body.style.top = "";
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch {
      /* jsdom / restricted embed */
    }
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        } catch {
          /* noop */
        }
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      });
    });
  } catch {
    /* noop */
  }
}
