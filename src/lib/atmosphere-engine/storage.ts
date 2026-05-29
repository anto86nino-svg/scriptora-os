import { DEFAULT_ATMOSPHERE_PROFILE, isAtmosphereProfileId } from "./profiles";
import type { AtmosphereEngineState, AtmosphereProfileId } from "./types";

export const ATMOSPHERE_STORAGE_KEY = "scriptora-atmosphere-profile-v1";

export function loadAtmosphereProfile(): AtmosphereProfileId {
  try {
    const raw = localStorage.getItem(ATMOSPHERE_STORAGE_KEY);
    if (raw && isAtmosphereProfileId(raw)) {
      return raw;
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_ATMOSPHERE_PROFILE;
}

export function saveAtmosphereProfile(profileId: AtmosphereProfileId): AtmosphereEngineState {
  try {
    localStorage.setItem(ATMOSPHERE_STORAGE_KEY, profileId);
  } catch {
    // ignore storage errors
  }
  return { profileId };
}
