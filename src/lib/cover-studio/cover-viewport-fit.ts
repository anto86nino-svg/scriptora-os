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
  layoutKind: "front" | "wrap" | "open-book" | "mockup-3d" | "thumbnail";
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
const MOBILE_FRONT_MAX_DVH = 0.62;
const MOBILE_WRAP_MAX_DVH = 0.56;

export type CoverViewportLayoutProfile = {
  kind: ViewportFitResult["layoutKind"];
  aspectRatio: number;
  maxWidthPx: number;
  minHeightPx: number;
  mobileFallback: "fit" | "landscape-workspace";
};

export function getCoverViewportLayoutProfile(input: {
  viewMode: CoverViewMode;
  spec: CoverSpecRects;
  containerWidth: number;
  containerHeight: number;
  isMobile?: boolean;
}): CoverViewportLayoutProfile {
  const { viewMode, spec, containerWidth, containerHeight, isMobile = false } = input;
  const frontAspect = spec.frontRect.w / spec.frontRect.h || 0.625;
  const fullAspect = spec.width / spec.height || 2.4;
  const kind: CoverViewportLayoutProfile["kind"] =
    viewMode === "thumbnail"
      ? "thumbnail"
      : viewMode === "mockup-3d"
        ? "mockup-3d"
      : viewMode === "paperback"
        ? "wrap"
        : viewMode === "open-book"
          ? "open-book"
          : "front";

  if (kind === "wrap") {
    return {
      kind,
      aspectRatio: Math.max(1.9, fullAspect),
      maxWidthPx: Math.min(Math.max(containerWidth, 1), 1400),
      minHeightPx: isMobile ? 320 : Math.min(620, Math.max(520, containerHeight * 0.62)),
      mobileFallback: isMobile && containerWidth < 760 ? "landscape-workspace" : "fit",
    };
  }

  if (kind === "open-book") {
    return {
      kind,
      aspectRatio: Math.max(1.45, Math.min(1.8, fullAspect)),
      maxWidthPx: Math.min(Math.max(containerWidth, 1), 1120),
      minHeightPx: isMobile ? 300 : Math.min(560, Math.max(460, containerHeight * 0.56)),
      mobileFallback: "fit",
    };
  }

  if (kind === "thumbnail") {
    return {
      kind,
      aspectRatio: frontAspect,
      maxWidthPx: Math.min(Math.max(containerWidth, 1), isMobile ? 260 : 360),
      minHeightPx: isMobile ? 240 : 320,
      mobileFallback: "fit",
    };
  }

  if (kind === "mockup-3d") {
    return {
      kind,
      aspectRatio: frontAspect,
      maxWidthPx: Math.min(Math.max(containerWidth, 1), 560),
      minHeightPx: isMobile ? 340 : Math.min(720, Math.max(560, containerHeight * 0.72)),
      mobileFallback: "fit",
    };
  }

  return {
    kind,
    aspectRatio: frontAspect,
    maxWidthPx: Math.min(Math.max(containerWidth, 1), 520),
    minHeightPx: isMobile ? 360 : Math.min(720, Math.max(560, containerHeight * 0.72)),
    mobileFallback: "fit",
  };
}

export function getMaxViewportHeight(
  isMobile: boolean,
  containerHeight: number,
  viewMode: CoverViewMode = "front",
): number {
  if (typeof window !== "undefined" && isMobile) {
    const cap =
      viewMode === "open-book" || viewMode === "paperback"
        ? MOBILE_WRAP_MAX_DVH
        : MOBILE_FRONT_MAX_DVH;
    return Math.min(containerHeight, window.innerHeight * cap);
  }
  if (typeof window !== "undefined") {
    return Math.min(containerHeight, window.innerHeight * DESKTOP_MAX_VH);
  }
  return containerHeight * (isMobile ? MOBILE_FRONT_MAX_DVH : DESKTOP_MAX_VH);
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
    return { displayWidth: 1, displayHeight: 1, userZoom: 1, panX: 0, panY: 0, baseScale: 1, layoutKind: "front" };
  }

  const maxH = getMaxViewportHeight(isMobile, containerHeight, viewMode);
  const profile = getCoverViewportLayoutProfile({ viewMode, spec, containerWidth, containerHeight, isMobile });
  const maxW = Math.min(containerWidth, profile.maxWidthPx);

  let focusRect = { x: 0, y: 0, w: canvasWidth, h: canvasHeight };

  if (spec.isPrint) {
    if (viewMode === "front" || viewMode === "thumbnail" || viewMode === "mockup-3d") {
      focusRect = spec.frontRect;
    } else if (viewMode === "back") {
      focusRect = getPanelRect(spec, "back");
    } else if (viewMode === "spine") {
      focusRect = getPanelRect(spec, "spine");
    } else if (viewMode === "open-book" || viewMode === "paperback") {
      focusRect = { x: 0, y: 0, w: canvasWidth, h: canvasHeight };
    }
  }

  const focusAspect = focusRect.w / focusRect.h;
  const wrapMode = profile.kind === "wrap";
  const openBookMode = profile.kind === "open-book";

  let displayWidth: number;
  let displayHeight: number;

  if (wrapMode && spec.isPrint) {
    const canvasAspect = canvasWidth / canvasHeight;
    displayWidth = Math.min(maxW, Math.max(760, maxW));
    displayHeight = displayWidth / canvasAspect;
    const targetHeight = Math.min(Math.max(profile.minHeightPx, displayHeight), Math.max(profile.minHeightPx, maxH));
    if (displayHeight < profile.minHeightPx && targetHeight <= maxH) {
      displayHeight = targetHeight;
      displayWidth = displayHeight * canvasAspect;
    }
    if (displayHeight > maxH && maxH >= 260) {
      displayHeight = Math.max(260, maxH);
      displayWidth = displayHeight * canvasAspect;
    }
  } else if (openBookMode && spec.isPrint) {
    displayWidth = maxW;
    displayHeight = displayWidth / profile.aspectRatio;
    if (displayHeight > maxH) {
      displayHeight = maxH;
      displayWidth = displayHeight * profile.aspectRatio;
    }
  } else {
    displayHeight = Math.min(maxH, Math.max(profile.minHeightPx, maxH));
    displayWidth = displayHeight * focusAspect;
    if (displayWidth > maxW) {
      displayWidth = maxW;
      displayHeight = displayWidth / focusAspect;
    }
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
    layoutKind: profile.kind,
  };
}

export function clampUserZoom(zoom: number): number {
  return Math.max(0.25, Math.min(2.5, zoom));
}
