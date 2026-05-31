export type DeviceKind = "phone" | "tablet" | "desktop";
export type LayoutPreference = "auto" | "mobile" | "desktop";
export type EffectiveLayout = "mobile" | "desktop" | "desktop_preview";

export const LAYOUT_PREFERENCE_KEY = "scriptora-layout-preference-v1";
export const DEVICE_VIEW_CHANGE_EVENT = "scriptora-device-view-change";

export const MOBILE_LAYOUT_MAX_WIDTH = 767;
export const TABLET_DESKTOP_MIN_WIDTH = 1024;
/** Tablets in auto mode use compact shell below this width (covers iPad landscape). */
export const TABLET_AUTO_DESKTOP_MIN_WIDTH = 1280;
export const DESKTOP_LAYOUT_MIN_WIDTH = 768;
/** Virtual canvas width for scaled desktop preview on phones / narrow tablets. */
export const DESKTOP_PREVIEW_CANVAS_WIDTH = 1180;
export const DESKTOP_PREVIEW_MIN_SCALE = 0.28;

export type DeviceViewState = {
  deviceKind: DeviceKind;
  preference: LayoutPreference;
  effectiveLayout: EffectiveLayout;
  viewportWidth: number;
  viewportHeight: number;
  isTouchDevice: boolean;
  /** Phone/tablet compact shell, or any effective mobile layout. */
  isCompactLayout: boolean;
  /** Scaled desktop preview active on a touch phone / narrow tablet. */
  isDesktopPreview: boolean;
  desktopPreviewScale: number;
};

export function readStoredPreference(): LayoutPreference {
  try {
    const raw = localStorage.getItem(LAYOUT_PREFERENCE_KEY);
    if (raw === "auto" || raw === "mobile" || raw === "desktop") {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return "auto";
}

export function saveLayoutPreference(preference: LayoutPreference) {
  try {
    localStorage.setItem(LAYOUT_PREFERENCE_KEY, preference);
  } catch {
    /* ignore */
  }
}

export function detectDeviceKind(viewportWidth = window.innerWidth): DeviceKind {
  const ua = navigator.userAgent || "";
  const maxTouch = navigator.maxTouchPoints || 0;
  const isIPad = /iPad/.test(ua) || (maxTouch > 1 && /Macintosh/.test(ua));
  const isPhoneUA =
    /iPhone|iPod|Android.*Mobile|webOS|BlackBerry|IEMobile|Opera Mini|Windows Phone/i.test(ua) &&
    !isIPad;
  const isAndroidTablet = /Android/i.test(ua) && !/Mobile/i.test(ua);

  if (isPhoneUA) return "phone";
  if (isIPad || isAndroidTablet) return "tablet";

  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const noHover = window.matchMedia("(hover: none)").matches;

  if ((coarsePointer || noHover) && maxTouch > 0 && viewportWidth < DESKTOP_LAYOUT_MIN_WIDTH) {
    return "phone";
  }
  if ((coarsePointer || noHover) && maxTouch > 0 && viewportWidth < TABLET_DESKTOP_MIN_WIDTH) {
    return "tablet";
  }

  return "desktop";
}

export function isTouchCapableDevice(): boolean {
  const maxTouch = navigator.maxTouchPoints || 0;
  return (
    maxTouch > 0 ||
    window.matchMedia("(pointer: coarse)").matches ||
    "ontouchstart" in window
  );
}

export function shouldUseDesktopPreview(
  preference: LayoutPreference,
  deviceKind: DeviceKind,
  viewportWidth: number,
): boolean {
  if (preference !== "desktop") return false;
  if (deviceKind === "phone") return true;
  if (deviceKind === "tablet" && viewportWidth < TABLET_DESKTOP_MIN_WIDTH) return true;
  return false;
}

export function resolveEffectiveLayout(
  preference: LayoutPreference,
  deviceKind: DeviceKind,
  viewportWidth: number,
): EffectiveLayout {
  if (preference === "mobile") return "mobile";
  if (preference === "desktop") {
    if (shouldUseDesktopPreview(preference, deviceKind, viewportWidth)) {
      return "desktop_preview";
    }
    return "desktop";
  }

  switch (deviceKind) {
    case "phone":
      return "mobile";
    case "tablet":
      return viewportWidth >= TABLET_AUTO_DESKTOP_MIN_WIDTH ? "desktop" : "mobile";
    default:
      return viewportWidth >= DESKTOP_LAYOUT_MIN_WIDTH ? "desktop" : "mobile";
  }
}

export function computeDesktopPreviewScale(
  viewportWidth: number,
  viewportHeight: number,
  canvasWidth = DESKTOP_PREVIEW_CANVAS_WIDTH,
): number {
  const widthScale = viewportWidth / canvasWidth;
  const heightScale = viewportHeight / 820;
  const scale = Math.min(widthScale, heightScale, 1);
  return Math.max(DESKTOP_PREVIEW_MIN_SCALE, Math.round(scale * 1000) / 1000);
}

export function applyDesktopPreviewMetrics(
  viewportWidth: number,
  viewportHeight: number,
  canvasWidth = DESKTOP_PREVIEW_CANVAS_WIDTH,
) {
  if (typeof document === "undefined") return computeDesktopPreviewScale(viewportWidth, viewportHeight, canvasWidth);
  const scale = computeDesktopPreviewScale(viewportWidth, viewportHeight, canvasWidth);
  const root = document.documentElement;
  const scaledWidth = canvasWidth * scale;
  const offsetX = Math.max(0, (viewportWidth - scaledWidth) / 2);
  root.style.setProperty("--scriptora-desktop-preview-scale", String(scale));
  root.style.setProperty("--scriptora-desktop-preview-width", `${canvasWidth}px`);
  root.style.setProperty("--scriptora-desktop-preview-offset-x", `${offsetX}px`);
  root.style.setProperty(
    "--scriptora-desktop-preview-canvas-height",
    `${Math.ceil(viewportHeight / scale)}px`,
  );
  return scale;
}

export function clearDesktopPreviewMetrics() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.removeProperty("--scriptora-desktop-preview-scale");
  root.style.removeProperty("--scriptora-desktop-preview-width");
  root.style.removeProperty("--scriptora-desktop-preview-offset-x");
  root.style.removeProperty("--scriptora-desktop-preview-canvas-height");
}

export function readViewportSize() {
  if (typeof window === "undefined") {
    return { width: 1280, height: 800 };
  }
  const vv = window.visualViewport;
  return {
    width: Math.round(vv?.width ?? window.innerWidth),
    height: Math.round(vv?.height ?? window.innerHeight),
  };
}

/** Sync live viewport metrics — keeps dvh-based shells accurate on iOS/Android. */
export function syncViewportMetrics(viewportWidth?: number, viewportHeight?: number) {
  if (typeof document === "undefined") return;
  const size = viewportWidth != null && viewportHeight != null
    ? { width: viewportWidth, height: viewportHeight }
    : readViewportSize();
  const root = document.documentElement;
  root.style.setProperty("--scriptora-vw", `${size.width}px`);
  root.style.setProperty("--scriptora-vh", `${size.height}px`);
  root.style.setProperty("--scriptora-vmin", `${Math.min(size.width, size.height)}px`);
  root.dataset.scriptoraViewportW = String(size.width);
  root.dataset.scriptoraViewportH = String(size.height);
}

export function getDeviceViewState(
  preference: LayoutPreference = readStoredPreference(),
  viewportWidth = readViewportSize().width,
): DeviceViewState {
  const viewportHeight = readViewportSize().height;
  const deviceKind = detectDeviceKind(viewportWidth);
  const effectiveLayout = resolveEffectiveLayout(preference, deviceKind, viewportWidth);
  const isTouchDevice = isTouchCapableDevice();
  const isDesktopPreview = effectiveLayout === "desktop_preview";
  const desktopPreviewScale = isDesktopPreview
    ? computeDesktopPreviewScale(viewportWidth, viewportHeight)
    : 1;
  return {
    deviceKind,
    preference,
    effectiveLayout,
    viewportWidth,
    viewportHeight,
    isTouchDevice,
    isCompactLayout: effectiveLayout === "mobile",
    isDesktopPreview,
    desktopPreviewScale,
  };
}

export function applyDeviceViewState(state: DeviceViewState) {
  const root = document.documentElement;

  root.dataset.scriptoraDevice = state.deviceKind;
  root.dataset.scriptoraLayoutPref = state.preference;
  root.dataset.scriptoraEffectiveLayout = state.effectiveLayout;

  root.classList.remove(
    "scriptora-layout-mobile",
    "scriptora-layout-desktop",
    "scriptora-layout-desktop-preview",
    "scriptora-device-phone",
    "scriptora-device-tablet",
    "scriptora-device-desktop",
    "scriptora-compact-layout",
    "scriptora-touch-device",
    "scriptora-mobile-desktop-preview",
  );

  if (state.effectiveLayout === "desktop_preview") {
    root.classList.add("scriptora-layout-desktop-preview", "scriptora-layout-desktop", "scriptora-mobile-desktop-preview");
  } else {
    root.classList.add(`scriptora-layout-${state.effectiveLayout}`);
  }

  root.classList.add(`scriptora-device-${state.deviceKind}`);

  root.classList.toggle("scriptora-touch-device", state.isTouchDevice);
  root.classList.toggle("scriptora-compact-layout", state.isCompactLayout);

  if (state.isDesktopPreview) {
    applyDesktopPreviewMetrics(state.viewportWidth, state.viewportHeight);
  } else {
    clearDesktopPreviewMetrics();
  }

  syncViewportMetrics(state.viewportWidth, state.viewportHeight);
}

export function applyDeviceView(preference?: LayoutPreference) {
  const pref = preference ?? readStoredPreference();
  const state = getDeviceViewState(pref);
  applyDeviceViewState(state);
  return state;
}

export function notifyDeviceViewChange() {
  window.dispatchEvent(new Event(DEVICE_VIEW_CHANGE_EVENT));
}

export function setLayoutPreference(preference: LayoutPreference) {
  saveLayoutPreference(preference);
  const state = applyDeviceView(preference);
  notifyDeviceViewChange();
  return state;
}

/** Inline boot — keep in sync with applyDeviceView (used from index.html). */
export function bootDeviceViewInline() {
  applyDeviceView();
}
