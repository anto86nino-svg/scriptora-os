import { useCallback, useEffect, useState } from "react";
import {
  applyDeviceView,
  DEVICE_VIEW_CHANGE_EVENT,
  getDeviceViewState,
  readStoredPreference,
  setLayoutPreference,
  type DeviceViewState,
  type LayoutPreference,
} from "@/lib/device-view";

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

    const onResize = () => sync();
    const onChange = () => sync();

    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onResize);
    window.addEventListener(DEVICE_VIEW_CHANGE_EVENT, onChange);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.removeEventListener(DEVICE_VIEW_CHANGE_EVENT, onChange);
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
