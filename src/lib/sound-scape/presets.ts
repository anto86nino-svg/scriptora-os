import type { SoundScapePresetMeta } from "./types";

/** Registry for Phase 5 — playback wired in a future sprint. */
export const SOUNDSCAPE_PRESETS: SoundScapePresetMeta[] = [
  {
    id: "rain",
    labelKey: "soundscape_rain",
    descriptionKey: "soundscape_rain_desc",
    atmosphereAffinity: ["horror-gothic", "thriller-investigation", "writer-sanctuary"],
    loop: true,
    defaultVolume: 0.35,
  },
  {
    id: "library",
    labelKey: "soundscape_library",
    descriptionKey: "soundscape_library_desc",
    atmosphereAffinity: ["gothic-library", "ancient-manuscript", "writer-sanctuary"],
    loop: true,
    defaultVolume: 0.3,
  },
  {
    id: "fireplace",
    labelKey: "soundscape_fire",
    descriptionKey: "soundscape_fire_desc",
    atmosphereAffinity: ["dark-luxury", "writer-sanctuary", "ancient-manuscript"],
    loop: true,
    defaultVolume: 0.32,
  },
  {
    id: "night-city",
    labelKey: "soundscape_night_city",
    descriptionKey: "soundscape_night_city_desc",
    atmosphereAffinity: ["cyber-author", "thriller-investigation", "dark-luxury"],
    loop: true,
    defaultVolume: 0.28,
  },
  {
    id: "ocean",
    labelKey: "soundscape_ocean",
    descriptionKey: "soundscape_ocean_desc",
    atmosphereAffinity: ["writer-sanctuary", "booktok-romance"],
    loop: true,
    defaultVolume: 0.3,
  },
  {
    id: "space",
    labelKey: "soundscape_space",
    descriptionKey: "soundscape_space_desc",
    atmosphereAffinity: ["space-intelligence", "cyber-author", "epic-story-forge"],
    loop: true,
    defaultVolume: 0.25,
  },
];
