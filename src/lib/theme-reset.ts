/**
 * One-time purge for the Horror / immersive theme experiment.
 * Does not touch auth, projects, credits, or generation state.
 */
import {
  DEFAULT_SCRIPTORA_APPEARANCE,
  SCRIPTORA_APPEARANCE_KEY,
  SCRIPTORA_APPEARANCE_LEGACY_KEY,
  SCRIPTORA_APPEARANCE_OLD_SETTINGS_KEY,
  saveScriptoraAppearance,
  type ScriptoraAppearanceSettings,
} from "@/lib/scriptora-appearance";

const ATMOSPHERE_PROFILE_KEY = "scriptora-atmosphere-profile-v1";
const BACKGROUND_SOURCE_KEY = "scriptora-background-source-v1";
const ATMOSPHERE_DATA_ATTR = "data-atmosphere-profile";

/** Backgrounds tied to the Horror / gothic experiment — reset to neutral on boot. */
const INVASIVE_APPEARANCE_BACKGROUNDS = new Set([
  "gothic-violet",
  "blood-moon",
  "gothic-manor",
]);

const SESSION_KEYS_TO_REMOVE = [
  "scriptora-gateway-genre-prefill",
  "scriptora-active-workspace-tool",
  "scriptora-immersive-mode",
];

const LOCAL_KEYS_TO_REMOVE = [
  ATMOSPHERE_PROFILE_KEY,
  BACKGROUND_SOURCE_KEY,
  "scriptora-workspace-theme",
  "scriptora-theme-mode",
  "scriptora-horror-room",
  "scriptora-gateway-state",
];

function removeStorageKeys(storage: Storage, keys: string[]): void {
  for (const key of keys) {
    try {
      storage.removeItem(key);
    } catch {
      /* private mode */
    }
  }
}

function scrubLegacyAtmosphereKeys(storage: Storage): void {
  const toRemove: string[] = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key) continue;
      if (
        key.startsWith("scriptora-atmosphere") ||
        key.startsWith("scriptora-gateway") ||
        key.startsWith("scriptora-immersive")
      ) {
        toRemove.push(key);
      }
    }
    removeStorageKeys(storage, toRemove);
  } catch {
    /* ignore */
  }
}

function resetInvasiveAppearance(): void {
  try {
    const raw =
      localStorage.getItem(SCRIPTORA_APPEARANCE_KEY) ||
      localStorage.getItem(SCRIPTORA_APPEARANCE_LEGACY_KEY) ||
      localStorage.getItem(SCRIPTORA_APPEARANCE_OLD_SETTINGS_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw) as Partial<ScriptoraAppearanceSettings>;
    if (!parsed?.backgroundId || !INVASIVE_APPEARANCE_BACKGROUNDS.has(parsed.backgroundId)) {
      return;
    }

    saveScriptoraAppearance({
      backgroundId: DEFAULT_SCRIPTORA_APPEARANCE.backgroundId,
      writingFont: parsed.writingFont ?? DEFAULT_SCRIPTORA_APPEARANCE.writingFont,
    });
  } catch {
    /* ignore malformed appearance */
  }
}

/** Strip immersive DOM hooks left by the atmosphere engine. */
function clearImmersiveDomState(): void {
  if (typeof document === "undefined") return;
  document.documentElement.removeAttribute(ATMOSPHERE_DATA_ATTR);
  document.documentElement.classList.remove(
    "scriptora-immersive-active",
    "scriptora-horror-room",
    "scriptora-gateway-active",
  );
}

/**
 * Disable the Horror / 5-theme immersive experiment and fall back to clean OS UI.
 * Safe to run on every boot — idempotent.
 */
export function purgeImmersiveThemeExperiment(): void {
  if (typeof window === "undefined") return;

  removeStorageKeys(sessionStorage, SESSION_KEYS_TO_REMOVE);
  removeStorageKeys(localStorage, LOCAL_KEYS_TO_REMOVE);
  scrubLegacyAtmosphereKeys(localStorage);
  scrubLegacyAtmosphereKeys(sessionStorage);

  const storedAtmosphere = localStorage.getItem(ATMOSPHERE_PROFILE_KEY);
  if (storedAtmosphere === "horror-gothic") {
    localStorage.removeItem(ATMOSPHERE_PROFILE_KEY);
  }

  resetInvasiveAppearance();
  clearImmersiveDomState();
}
