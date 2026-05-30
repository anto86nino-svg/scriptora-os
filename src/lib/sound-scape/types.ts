/** Future ambient soundscape — architecture only (no audio in V1). */

export type SoundScapePresetId =
  | "rain"
  | "library"
  | "fireplace"
  | "night-city"
  | "ocean"
  | "space";

export interface SoundScapePresetMeta {
  id: SoundScapePresetId;
  labelKey: string;
  descriptionKey: string;
  /** Matches atmosphere profiles for auto-suggest (future). */
  atmosphereAffinity?: string[];
  /** Reserved for Web Audio / Howler integration. */
  assetPath?: string;
  loop: boolean;
  defaultVolume: number;
}

export interface SoundScapeState {
  enabled: boolean;
  presetId: SoundScapePresetId | null;
  volume: number;
}

export const SOUNDSCAPE_STORAGE_KEY = "scriptora-soundscape-v1";
