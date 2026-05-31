export { GENRE_BRAIN_SUPREME_VERSION, type SupremeGenreId, type SupremeGenreProfile, type SupremeGenreRuleSet } from "./types";
export { SUPREME_GENRE_PROFILES } from "./profiles";
export {
  getSupremeGenreProfile,
  resolveSupremeGenreId,
  resolveSupremeGenreIdFromConfig,
  LEGACY_GENRE_SOURCES_SUPERSEDED,
} from "./resolver";
export { buildSupremeGenrePromptBlock, supremeMarketRules, supremeRulesAsFlatList } from "./prompt";
export { adaptSupremeToGenreBrainProfile } from "./legacy-adapter";
