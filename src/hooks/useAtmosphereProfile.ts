import { useCallback, useEffect, useState } from "react";
import {
  ATMOSPHERE_CHANGE_EVENT,
  applyVisualEnvironment,
  loadAtmosphereProfile,
  setAtmosphereProfile,
  type AtmosphereProfileId,
} from "@/lib/atmosphere-engine";

export function useAtmosphereProfile() {
  const [profileId, setProfileIdState] = useState<AtmosphereProfileId>(() => loadAtmosphereProfile());

  useEffect(() => {
    applyVisualEnvironment();
  }, [profileId]);

  useEffect(() => {
    const sync = () => setProfileIdState(loadAtmosphereProfile());
    window.addEventListener(ATMOSPHERE_CHANGE_EVENT, sync);
    return () => window.removeEventListener(ATMOSPHERE_CHANGE_EVENT, sync);
  }, []);

  const selectProfile = useCallback((next: AtmosphereProfileId) => {
    setAtmosphereProfile(next);
    setProfileIdState(next);
  }, []);

  return { profileId, selectProfile };
}
