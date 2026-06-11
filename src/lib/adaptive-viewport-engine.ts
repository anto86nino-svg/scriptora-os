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
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => applyViewportClass(), 120);
    });
  }
}

/** Lightweight responsive audit — returns human-readable issues for dev overlay. */
export function auditViewportLayout(): string[] {
  if (typeof document === "undefined") return [];
  const issues: string[] = [];
  const overflowEls = document.querySelectorAll<HTMLElement>("body *");
  overflowEls.forEach((el) => {
    if (el.scrollWidth > el.clientWidth + 4 && el.clientWidth > 0) {
      const tag = `${el.tagName.toLowerCase()}${el.className ? `.${String(el.className).split(" ")[0]}` : ""}`;
      if (!issues.includes(`overflow: ${tag}`)) issues.push(`overflow: ${tag}`);
    }
  });
  if (issues.length > 12) return issues.slice(0, 12).concat(["…altri overflow"]);
  return issues;
}
