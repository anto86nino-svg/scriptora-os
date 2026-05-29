/** Immersive Atmosphere Profile identifiers — Layer 1 (visual tokens only). */
export type AtmosphereProfileId =
  | "fantasy-realm"
  | "space-scifi"
  | "nature-calm"
  | "dark-luxury"
  | "horror-gothic";

export interface AtmosphereProfileMeta {
  id: AtmosphereProfileId;
  nameKey: string;
  descriptionKey: string;
  moodKey: string;
  /** Layer 1 profiles ship when true; future profiles stay preview-only. */
  available: boolean;
}

export interface AtmosphereEngineState {
  profileId: AtmosphereProfileId;
}

export const ATMOSPHERE_CHANGE_EVENT = "scriptora-atmosphere-change";
