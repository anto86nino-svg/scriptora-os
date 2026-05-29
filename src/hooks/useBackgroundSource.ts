import { useCallback, useEffect, useState } from "react";
import {
  loadBackgroundSource,
  restoreRealmBackground,
  setBackgroundSource,
  VISUAL_ENVIRONMENT_CHANGE_EVENT,
  type BackgroundSource,
} from "@/lib/atmosphere-engine";

export function useBackgroundSource() {
  const [source, setSourceState] = useState<BackgroundSource>(() => loadBackgroundSource());

  useEffect(() => {
    const sync = () => setSourceState(loadBackgroundSource());
    window.addEventListener(VISUAL_ENVIRONMENT_CHANGE_EVENT, sync);
    return () => window.removeEventListener(VISUAL_ENVIRONMENT_CHANGE_EVENT, sync);
  }, []);

  const selectRealm = useCallback(() => {
    restoreRealmBackground();
    setSourceState("realm");
  }, []);

  const selectCustom = useCallback(() => {
    setBackgroundSource("custom");
    setSourceState("custom");
  }, []);

  return { source, selectRealm, selectCustom };
}
