import type { CoverPanel, CoverSpecRects, CoverViewMode } from "./cover-view-modes";
import { getPanelRect } from "./cover-view-modes";

export type ViewportFitResult = {
  /** CSS display width of canvas (px) */
  displayWidth: number;
  /** CSS display height of canvas (px) */
  displayHeight: number;
  /** Extra scale from user zoom (1 = fit) */
  userZoom: number;
  /** Pan offset in px (applied after scale, centers panel focus) */
  panX: number;
  panY: number;
  baseScale: number;
};

export type ViewportFitInput = {
  containerWidth: number;
  containerHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  viewMode: CoverViewMode;
  spec: CoverSpecRects;
  activePanel?: CoverPanel;
  userZoom?: number;
  isMobile?: boolean;
};

const DESKTOP_MAX_VH = 0.88;
const MOBILE_MAX_DVH = 0.48;

export function getMaxViewportHeight(isMobile: boolean, containerHeight: number): number {
  if (typeof window !== "undefined" && isMobile) {
    return Math.min(containerHeight, window.innerHeight * MOBILE_MAX_DVH);
  }
  if (typeof window !== "undefined") {
    return Math.min(containerHeight, window.innerHeight * DESKTOP_MAX_VH);
  }
  return containerHeight * (isMobile ? MOBILE_MAX_DVH : DESKTOP_MAX_VH);
}

/** Compute fit-to-container display size + panel-focus pan. */
export function computeViewportFit(input: ViewportFitInput): ViewportFitResult {
  const {
    containerWidth,
    containerHeight,
    canvasWidth,
    canvasHeight,
    viewMode,
    spec,
    activePanel = "front",
    userZoom = 1,
    isMobile = false,
  } = input;

  if (containerWidth <= 0 || containerHeight <= 0 || canvasWidth <= 0 || canvasHeight <= 0) {
    return { displayWidth: 1, displayHeight: 1, userZoom: 1, panX: 0, panY: 0, baseScale: 1 };
  }

  const maxH = getMaxViewportHeight(isMobile, containerHeight);
  const maxW = containerWidth;

  let focusRect = { x: 0, y: 0, w: canvasWidth, h: canvasHeight };

  if (spec.isPrint) {
    if (viewMode === "front" || viewMode === "thumbnail") {
      focusRect = spec.frontRect;
    } else if (viewMode === "open-book" || viewMode === "paperback") {
      focusRect = { x: 0, y: 0, w: canvasWidth, h: canvasHeight };
    }
  }

  const aspect = focusRect.w / focusRect.h;
  let displayHeight = maxH;
  let displayWidth = displayHeight * aspect;

  if (displayWidth > maxW) {
    displayWidth = maxW;
    displayHeight = displayWidth / aspect;
  }

  const baseScale = displayWidth / canvasWidth;
  const zoom = Math.max(0.25, Math.min(2.5, userZoom));

  let panX = 0;
  let panY = 0;

  if (
    spec.isPrint &&
    (viewMode === "open-book" || viewMode === "paperback") &&
    activePanel &&
    displayWidth > 0
  ) {
    const panel = getPanelRect(spec, activePanel);
    const panelCenterX = (panel.x + panel.w / 2) / canvasWidth;
    const canvasCenterX = 0.5;
    const offsetFrac = canvasCenterX - panelCenterX;
    panX = offsetFrac * displayWidth * zoom * 0.85;
  }

  if (viewMode === "thumbnail") {
    displayWidth = Math.min(maxW, maxH * (focusRect.w / focusRect.h) * 0.85);
    displayHeight = displayWidth / (focusRect.w / focusRect.h);
  }

  return {
    displayWidth: Math.round(displayWidth * zoom),
    displayHeight: Math.round(displayHeight * zoom),
    userZoom: zoom,
    panX,
    panY: 0,
    baseScale: baseScale * zoom,
  };
}

export function clampUserZoom(zoom: number): number {
  return Math.max(0.25, Math.min(2.5, zoom));
}
