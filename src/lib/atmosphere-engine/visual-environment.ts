import {
  applyScriptoraCustomBackground,
  applyScriptoraWritingFont,
} from "@/lib/scriptora-appearance";
import { applyAtmosphereProfile } from "./apply";
import { loadBackgroundSource, type BackgroundSource } from "./background-source";
import { getRealmBackgroundLayers } from "./realm-backgrounds";
import { loadAtmosphereProfile } from "./storage";

export const VISUAL_ENVIRONMENT_CHANGE_EVENT = "scriptora-visual-environment-change";

const BACKGROUND_SOURCE_ATTR = "data-background-source";

/**
 * Applies realm atmosphere (always) + background source (realm image vs custom picker).
 */
export function applyVisualEnvironment() {
  const profileId = loadAtmosphereProfile();
  applyAtmosphereProfile(profileId);

  const source = loadBackgroundSource();
  const root = document.documentElement;
  root.setAttribute(BACKGROUND_SOURCE_ATTR, source);

  const realmLayers = getRealmBackgroundLayers(profileId);
  root.style.setProperty("--atmosphere-realm-bg", realmLayers.background);
  root.style.removeProperty("--atmosphere-realm-image");
  root.style.removeProperty("--atmosphere-realm-overlay");

  applyScriptoraWritingFont();

  if (source === "custom") {
    applyScriptoraCustomBackground();
  } else {
    root.style.removeProperty("--scriptora-app-bg");
  }
}

export function notifyVisualEnvironmentChange() {
  window.dispatchEvent(new Event(VISUAL_ENVIRONMENT_CHANGE_EVENT));
}
