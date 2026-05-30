export type DeviceKind = "phone" | "tablet" | "desktop";
export type LayoutPreference = "auto" | "mobile" | "desktop";
export type EffectiveLayout = "mobile" | "desktop";

export const LAYOUT_PREFERENCE_KEY = "scriptora-layout-preference-v1";
export const DEVICE_VIEW_CHANGE_EVENT = "scriptora-device-view-change";

export const MOBILE_LAYOUT_MAX_WIDTH = 767;
export const TABLET_DESKTOP_MIN_WIDTH = 1024;
export const DESKTOP_LAYOUT_MIN_WIDTH = 768;

export type DeviceViewState = {
  deviceKind: DeviceKind;
  preference: LayoutPreference;
  effectiveLayout: EffectiveLayout;
  viewportWidth: number;
  isTouchDevice: boolean;
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

export function resolveEffectiveLayout(
  preference: LayoutPreference,
  deviceKind: DeviceKind,
  viewportWidth: number,
): EffectiveLayout {
  if (preference === "mobile") return "mobile";
  if (preference === "desktop") return "desktop";

  switch (deviceKind) {
    case "phone":
      return "mobile";
    case "tablet":
      return viewportWidth >= TABLET_DESKTOP_MIN_WIDTH ? "desktop" : "mobile";
    default:
      return viewportWidth >= DESKTOP_LAYOUT_MIN_WIDTH ? "desktop" : "mobile";
  }
}

export function getDeviceViewState(
  preference: LayoutPreference = readStoredPreference(),
  viewportWidth = window.innerWidth,
): DeviceViewState {
  const deviceKind = detectDeviceKind(viewportWidth);
  return {
    deviceKind,
    preference,
    effectiveLayout: resolveEffectiveLayout(preference, deviceKind, viewportWidth),
    viewportWidth,
    isTouchDevice: isTouchCapableDevice(),
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
    "scriptora-device-phone",
    "scriptora-device-tablet",
    "scriptora-device-desktop",
  );

  root.classList.add(`scriptora-layout-${state.effectiveLayout}`);
  root.classList.add(`scriptora-device-${state.deviceKind}`);
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
