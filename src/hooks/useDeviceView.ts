import { useCallback, useEffect, useState } from "react";
import {
  applyDeviceView,
  DEVICE_VIEW_CHANGE_EVENT,
  getDeviceViewState,
  readStoredPreference,
  setLayoutPreference,
  syncViewportMetrics,
  type DeviceViewState,
  type LayoutPreference,
} from "@/lib/device-view";
import { bindViewportResize } from "@/lib/viewport-safe";

function readPreference(): LayoutPreference {
  if (typeof window === "undefined") return "auto";
  return readStoredPreference();
}

export function useDeviceView() {
  const [state, setState] = useState<DeviceViewState>(() =>
    typeof window !== "undefined" ? getDeviceViewState(readPreference()) : getDeviceViewState("auto", 1280),
  );

  const sync = useCallback(() => {
    setState(applyDeviceView());
  }, []);

  useEffect(() => {
    sync();

    const onResize = () => {
      syncViewportMetrics();
      sync();
    };

    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onResize);
    window.addEventListener(DEVICE_VIEW_CHANGE_EVENT, sync);

    const unbindViewport = bindViewportResize(onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.removeEventListener(DEVICE_VIEW_CHANGE_EVENT, sync);
      unbindViewport();
    };
  }, [sync]);

  const setPreference = useCallback((preference: LayoutPreference) => {
    setState(setLayoutPreference(preference));
  }, []);

  const toggleLayout = useCallback(() => {
    const next: LayoutPreference = state.effectiveLayout === "mobile" ? "desktop" : "mobile";
    setPreference(next);
  }, [setPreference, state.effectiveLayout]);

  return {
    ...state,
    isMobileLayout: state.effectiveLayout === "mobile",
    isDesktopLayout: state.effectiveLayout === "desktop",
    isCompactLayout: state.isCompactLayout,
    isPhone: state.deviceKind === "phone",
    isTablet: state.deviceKind === "tablet",
    setPreference,
    toggleLayout,
    resetToAuto: () => setPreference("auto"),
  };
}

/** Mount once near app root — keeps `<html>` layout classes in sync. */
export function DeviceViewSync() {
  useDeviceView();
  return null;
}
