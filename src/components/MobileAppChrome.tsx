import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { isMobileDevice } from "@/lib/mobile-performance";
import { useDevMode } from "@/lib/dev-mode";
import GlobalCuriosity from "./GlobalCuriosity";
import { DevModeBadge } from "./DevModeBadge";
import { ScriptoraFloatingDock, FloatingDockSlot } from "./floating/ScriptoraFloatingDock";
import { ResponsiveAuditPanel } from "./ResponsiveAuditOverlay";

/**
 * Non-critical floating UI (studio and dev tools) — unified dock.
 * On mobile we mount after idle so the first route paints faster.
 */
export function MobileAppChrome() {
  const location = useLocation();
  const devMode = useDevMode();
  const [ready, setReady] = useState(() => !isMobileDevice());
  const writerStudioVisible = location.pathname === "/app";

  const dockDenseRoute = location.pathname === "/app";

  useEffect(() => {
    if (dockDenseRoute) {
      document.body.dataset.scriptoraDockDense = "1";
    } else {
      delete document.body.dataset.scriptoraDockDense;
    }
    return () => {
      delete document.body.dataset.scriptoraDockDense;
    };
  }, [dockDenseRoute]);

  useEffect(() => {
    if (!isMobileDevice()) return;

    const mount = () => setReady(true);
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(mount, { timeout: 1200 });
      return () => cancelIdleCallback(id);
    }
    const timer = window.setTimeout(mount, 350);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready || (!writerStudioVisible && !devMode)) return null;

  return (
    <ScriptoraFloatingDock devSlot={import.meta.env.DEV ? <ResponsiveAuditPanel /> : undefined}>
      <FloatingDockSlot>
        <DevModeBadge docked />
      </FloatingDockSlot>
      <FloatingDockSlot>
        <GlobalCuriosity docked />
      </FloatingDockSlot>
    </ScriptoraFloatingDock>
  );
}
