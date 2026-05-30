import type { AtmosphereProfileId, AtmosphereProfileMeta } from "./types";

export const DEFAULT_ATMOSPHERE_PROFILE: AtmosphereProfileId = "fantasy-realm";

export const ATMOSPHERE_PROFILES: AtmosphereProfileMeta[] = [
  {
    id: "fantasy-realm",
    nameKey: "atmo_fantasy_name",
    descriptionKey: "atmo_fantasy_desc",
    moodKey: "atmo_fantasy_mood",
    available: true,
  },
  {
    id: "dark-luxury",
    nameKey: "atmo_luxury_name",
    descriptionKey: "atmo_luxury_desc",
    moodKey: "atmo_luxury_mood",
    available: true,
  },
  {
    id: "space-scifi",
    nameKey: "atmo_space_name",
    descriptionKey: "atmo_space_desc",
    moodKey: "atmo_space_mood",
    available: true,
  },
  {
    id: "nature-calm",
    nameKey: "atmo_nature_name",
    descriptionKey: "atmo_nature_desc",
    moodKey: "atmo_nature_mood",
    available: true,
  },
  {
    id: "horror-gothic",
    nameKey: "atmo_gothic_name",
    descriptionKey: "atmo_gothic_desc",
    moodKey: "atmo_gothic_mood",
    available: true,
  },
  {
    id: "ancient-manuscript",
    nameKey: "atmo_manuscript_name",
    descriptionKey: "atmo_manuscript_desc",
    moodKey: "atmo_manuscript_mood",
    available: true,
  },
  {
    id: "cyber-author",
    nameKey: "atmo_cyber_name",
    descriptionKey: "atmo_cyber_desc",
    moodKey: "atmo_cyber_mood",
    available: true,
  },
  {
    id: "booktok-romance",
    nameKey: "atmo_romance_name",
    descriptionKey: "atmo_romance_desc",
    moodKey: "atmo_romance_mood",
    available: true,
  },
  {
    id: "thriller-investigation",
    nameKey: "atmo_thriller_name",
    descriptionKey: "atmo_thriller_desc",
    moodKey: "atmo_thriller_mood",
    available: true,
  },
  {
    id: "epic-story-forge",
    nameKey: "atmo_epic_name",
    descriptionKey: "atmo_epic_desc",
    moodKey: "atmo_epic_mood",
    available: true,
  },
];

export function isAtmosphereProfileId(value: string): value is AtmosphereProfileId {
  return ATMOSPHERE_PROFILES.some((profile) => profile.id === value);
}

export function getAtmosphereProfile(id: AtmosphereProfileId): AtmosphereProfileMeta {
  return ATMOSPHERE_PROFILES.find((profile) => profile.id === id) ?? ATMOSPHERE_PROFILES[0];
}
