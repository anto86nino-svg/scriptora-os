import { SOUNDSCAPE_PRESETS } from "./presets";
import type { SoundScapePresetId, SoundScapeState } from "./types";
import { SOUNDSCAPE_STORAGE_KEY } from "./types";

const DEFAULT: SoundScapeState = {
  enabled: false,
  presetId: null,
  volume: 0.3,
};

export function loadSoundScapeState(): SoundScapeState {
  try {
    const raw = localStorage.getItem(SOUNDSCAPE_STORAGE_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<SoundScapeState>;
    const presetOk =
      parsed.presetId == null ||
      SOUNDSCAPE_PRESETS.some((p) => p.id === parsed.presetId);
    if (!presetOk) return DEFAULT;
    return {
      enabled: Boolean(parsed.enabled),
      presetId: (parsed.presetId as SoundScapePresetId | null) ?? null,
      volume: typeof parsed.volume === "number" ? Math.min(1, Math.max(0, parsed.volume)) : DEFAULT.volume,
    };
  } catch {
    return DEFAULT;
  }
}

export function saveSoundScapeState(state: SoundScapeState): void {
  try {
    localStorage.setItem(SOUNDSCAPE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* noop */
  }
}

/** Future: SoundScapeEngine.play(presetId) — not implemented in V1. */
export function isSoundScapePlaybackAvailable(): boolean {
  return false;
}
