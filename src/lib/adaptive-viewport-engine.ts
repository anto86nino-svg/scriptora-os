/** Adaptive Viewport Engine — layout self-healing across device classes. */

export type ViewportClass = "mobile-sm" | "mobile" | "tablet" | "laptop" | "desktop" | "ultrawide";

const CLASS_ATTR = "data-scriptora-viewport";

export function detectViewportClass(width = typeof window !== "undefined" ? window.innerWidth : 1280): ViewportClass {
  if (width < 380) return "mobile-sm";
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  if (width < 1440) return "laptop";
  if (width < 1920) return "desktop";
  return "ultrawide";
}

let viewportResizeBound = false;

function applyViewportClass(width?: number): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const cls = detectViewportClass(width);
  root.setAttribute(CLASS_ATTR, cls);
  root.dataset.scriptoraViewport = cls;
}

export function applyAdaptiveViewportBoot(): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  applyViewportClass();

  const coarse = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  if (coarse) document.documentElement.classList.add("scriptora-touch-device");

  if (!viewportResizeBound) {
    viewportResizeBound = true;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const runAudit = () => {
      applyViewportClass();
      detectHorizontalOverflowDev();
    };
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(runAudit, 120);
    });
    if (import.meta.env.DEV) {
      setTimeout(detectHorizontalOverflowDev, 1500);
    }
  }
}

export type OverflowOffender = {
  tag: string;
  className: string;
  scrollWidth: number;
  clientWidth: number;
};

function hasIntentionalHorizontalOverflow(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  return ["auto", "scroll", "hidden", "clip"].includes(style.overflowX);
}

/** Dev-only: log elements wider than their container. */
export function detectHorizontalOverflowDev(): OverflowOffender[] {
  if (!import.meta.env.DEV || typeof document === "undefined") return [];
  const offenders: OverflowOffender[] = [];
  document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
    if (el.clientWidth <= 0) return;
    if (el.scrollWidth <= el.clientWidth + 2) return;
    if (hasIntentionalHorizontalOverflow(el)) return;
    const cls = typeof el.className === "string" ? el.className.split(/\s+/).slice(0, 2).join(".") : "";
    offenders.push({
      tag: el.tagName.toLowerCase(),
      className: cls,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    });
  });
  if (offenders.length) {
    console.warn(
      `[scriptora-overflow] ${offenders.length} element(s) exceed viewport width`,
      offenders.slice(0, 25),
    );
  }
  return offenders;
}

/** Lightweight responsive audit — returns human-readable issues for dev overlay. */
export function auditViewportLayout(): string[] {
  if (typeof document === "undefined") return [];
  const issues: string[] = [];
  const docOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
  if (docOverflow) issues.push("document horizontal overflow");

  const overflowEls = document.querySelectorAll<HTMLElement>("body *");
  overflowEls.forEach((el) => {
    if (el.scrollWidth > el.clientWidth + 4 && el.clientWidth > 0) {
      if (hasIntentionalHorizontalOverflow(el)) return;
      const tag = `${el.tagName.toLowerCase()}${el.className ? `.${String(el.className).split(" ")[0]}` : ""}`;
      const key = `overflow: ${tag}`;
      if (!issues.includes(key)) issues.push(key);
    }
  });
  if (import.meta.env.DEV && issues.length) {
    console.debug("[scriptora-viewport-audit]", issues);
  }
  if (issues.length > 12) return issues.slice(0, 12).concat(["…altri overflow"]);
  return issues;
}
