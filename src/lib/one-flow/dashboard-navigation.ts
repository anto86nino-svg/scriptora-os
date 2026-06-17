/** Reset scroll and dashboard overlay residue before/after route navigation. */
export function resetRouteScroll(): void {
  try {
    document.body.classList.remove("scriptora-dashboard-tool-open");
    document.documentElement.classList.remove("scriptora-route-changing");
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      });
    });
  } catch {
    /* noop */
  }
}
