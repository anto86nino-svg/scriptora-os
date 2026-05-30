import { useDeviceView } from "@/hooks/useDeviceView";

/** True when Scriptora is using the mobile layout shell (auto or manual). */
export function useIsMobile() {
  const { isMobileLayout } = useDeviceView();
  return isMobileLayout;
}
