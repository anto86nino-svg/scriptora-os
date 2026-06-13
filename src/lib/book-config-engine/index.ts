export type { Level1BookType, GenreDnaProfile, ConfigFix, SanitizeResult, CoherenceReport, CoherenceDimension } from "./types";

export {
  LEVEL1_REGISTRY,
  resolveLevel1FromBookTypeId,
  inferLevel1FromConfig,
  getLevel1Definition,
  isBookTypeAllowedForLevel1,
  defaultBookTypeIdForLevel1,
  subcategoryMatchesBlockedToken,
} from "./level1-lock";

export {
  GENRE_DNA_PROFILES,
  resolveGenreDnaProfile,
  buildGenreDnaPromptBlock,
} from "./genre-dna";

export {
  sanitizeBookConfiguration,
  resetConfigForLevel1Change,
} from "./sanitize";

export { validateConfigCoherence } from "./coherence";
export { buildPromptFromCanonicalConfig } from "./prompt-builder";

export { filterStudioGenresForLevel1, getVisibleBookTypesForLevel1 } from "./studio-filter";
