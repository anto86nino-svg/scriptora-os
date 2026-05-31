import { useDeviceView } from "@/hooks/useDeviceView";

/** True when Scriptora uses the compact/mobile layout shell (phones + most tablets, auto-detected). */
export function useIsMobile() {
  const { isCompactLayout } = useDeviceView();
  return isCompactLayout;
}

/** Full device context for responsive UI decisions. */
export function useResponsiveShell() {
  const view = useDeviceView();
  return {
    ...view,
    /** Prefer this over isMobileLayout — same value, clearer intent. */
    isCompact: view.isCompactLayout,
  };
}
