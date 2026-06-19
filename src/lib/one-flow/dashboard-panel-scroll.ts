export type ControlledScrollOptions = {
  offsetPx?: number;
  behavior?: ScrollBehavior;
};

export const DASHBOARD_STICKY_SCROLL_OFFSET = 92;

export function getControlledScrollTop(
  rectTop: number,
  currentScrollY: number,
  offsetPx = DASHBOARD_STICKY_SCROLL_OFFSET,
): number {
  return Math.max(0, Math.round(rectTop + currentScrollY - offsetPx));
}

export function scrollElementIntoViewWithOffset(
  element: HTMLElement | null | undefined,
  options: ControlledScrollOptions = {},
): void {
  if (!element || typeof window === "undefined") return;
  const rect = element.getBoundingClientRect();
  const top = getControlledScrollTop(rect.top, window.scrollY || window.pageYOffset || 0, options.offsetPx);
  window.scrollTo({
    top,
    left: 0,
    behavior: options.behavior ?? "smooth",
  });
}

export function focusDashboardToolPanel(panelId: string): void {
  if (typeof document === "undefined") return;
  const selector = `[data-dashboard-tool-panel="${panelId}"]`;
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return;
  el.focus({ preventScroll: true });
}

export function focusDashboardToolPanelWhenReady(panelId: string): void {
  if (typeof requestAnimationFrame === "undefined") {
    focusDashboardToolPanel(panelId);
    return;
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => focusDashboardToolPanel(panelId));
  });
}
