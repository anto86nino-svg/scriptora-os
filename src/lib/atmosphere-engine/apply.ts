import { getAtmosphereProfile } from "./profiles";
import { loadAtmosphereProfile } from "./storage";
import type { AtmosphereProfileId } from "./types";

const DATA_ATTR = "data-atmosphere-profile";

/**
 * Applies Layer 1 atmosphere tokens to `<html>`.
 * Components inherit via CSS variables — no layout or UX changes.
 */
export function applyAtmosphereProfile(profileId: AtmosphereProfileId = loadAtmosphereProfile()) {
  const profile = getAtmosphereProfile(profileId);
  const root = document.documentElement;

  if (profile.available) {
    root.setAttribute(DATA_ATTR, profile.id);
  } else {
    root.setAttribute(DATA_ATTR, "fantasy-realm");
  }
}

export function clearAtmosphereProfile() {
  document.documentElement.removeAttribute(DATA_ATTR);
}
