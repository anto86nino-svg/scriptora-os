/** Immersive Atmosphere Profile identifiers — visual tokens only. */
export type AtmosphereProfileId =
  | "fantasy-realm"
  | "dark-luxury"
  | "space-scifi"
  | "nature-calm"
  | "horror-gothic"
  | "ancient-manuscript"
  | "cyber-author"
  | "booktok-romance"
  | "thriller-investigation"
  | "epic-story-forge";

export interface AtmosphereProfileMeta {
  id: AtmosphereProfileId;
  nameKey: string;
  descriptionKey: string;
  moodKey: string;
  available: boolean;
}

export interface AtmosphereEngineState {
  profileId: AtmosphereProfileId;
}

export const ATMOSPHERE_CHANGE_EVENT = "scriptora-atmosphere-change";
