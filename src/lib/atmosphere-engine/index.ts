export * from "./apply";
export * from "./background-source";
export * from "./profiles";
export * from "./realm-backgrounds";
export * from "./storage";
export * from "./types";
export * from "./visual-environment";

import { saveBackgroundSource, type BackgroundSource } from "./background-source";
import { saveAtmosphereProfile } from "./storage";
import { ATMOSPHERE_CHANGE_EVENT, type AtmosphereProfileId } from "./types";
import { applyVisualEnvironment, notifyVisualEnvironmentChange } from "./visual-environment";

export function setAtmosphereProfile(profileId: AtmosphereProfileId) {
  saveAtmosphereProfile(profileId);
  applyVisualEnvironment();
  window.dispatchEvent(new Event(ATMOSPHERE_CHANGE_EVENT));
  notifyVisualEnvironmentChange();
}

export function setBackgroundSource(source: BackgroundSource) {
  saveBackgroundSource(source);
  applyVisualEnvironment();
  notifyVisualEnvironmentChange();
}

/** Instantly restore the active Realm background image. Realm palette + mood stay active. */
export function restoreRealmBackground() {
  setBackgroundSource("realm");
}
