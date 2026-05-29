import {
  DEFAULT_SCRIPTORA_APPEARANCE,
  loadScriptoraAppearance,
} from "@/lib/scriptora-appearance";

export type BackgroundSource = "realm" | "custom";

export const BACKGROUND_SOURCE_KEY = "scriptora-background-source-v1";

export function loadBackgroundSource(): BackgroundSource {
  try {
    const raw = localStorage.getItem(BACKGROUND_SOURCE_KEY);
    if (raw === "realm" || raw === "custom") {
      return raw;
    }

    // Backward compatibility: users who already picked a custom background keep it.
    const appearance = loadScriptoraAppearance();
    if (appearance.backgroundId !== DEFAULT_SCRIPTORA_APPEARANCE.backgroundId) {
      return "custom";
    }
  } catch {
    // ignore storage errors
  }
  return "realm";
}

export function saveBackgroundSource(source: BackgroundSource): BackgroundSource {
  try {
    localStorage.setItem(BACKGROUND_SOURCE_KEY, source);
  } catch {
    // ignore storage errors
  }
  return source;
}
