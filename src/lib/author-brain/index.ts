export type { AuthorBrainFoundation, AuthorBrainFutureAutomation, ExpandAuthorBioInput, ExpandAuthorBioResult, AuthorPlatform, AuthorPublishedBook, AuthorPublishedBookLinks } from "./types";
export { expandAuthorBio, expandAuthorBioFromIdentity, validateAuthorBrainSeed } from "./expand-bio";
export {
  createBlankPublishedBook,
  normalizeAuthorPlatform,
  normalizePublishedBook,
  normalizePublishedBooks,
  authorEcosystemMemorySnapshot,
  hasAuthorPlatformValues,
} from "./ecosystem";
export {
  applyAuthorBrainToBackMatter,
  applyAuthorBrainToFrontMatter,
  authorBrainInjectedFieldKeys,
  authorBrainProfileHasInjectionData,
  buildAboutAuthorInjection,
  buildAuthorBrainInjectionSnapshot,
  buildFollowAuthorInjection,
  buildOtherBooksInjection,
  filterCatalogueBooks,
  isSameBookTitle,
} from "./injection";
export {
  AUTHOR_PRESENCE_OPTIONS,
  READER_EMOTIONAL_GOAL_OPTIONS,
  hasAuthorVoiceMemory,
  normalizeAuthorPresence,
  normalizeReaderEmotionalGoals,
  toggleChipSelection,
} from "./voice-memory";
export type { AuthorPresenceId, ReaderEmotionalGoalId } from "./voice-memory";
export {
  applyPassiveMarketCopyTone,
  applyAboutAuthorCadence,
  buildExpandBioPassiveContext,
  buildPassiveFollowHeading,
  buildPassiveOtherBooksHeading,
  hasPassiveAuthorIntelligence,
  resolvePassiveAuthorTone,
  stripAuthorBrainCliches,
  PASSIVE_INFLUENCE_CAP,
} from "./passive-intelligence";
export type { PassiveAuthorTone } from "./passive-intelligence";
/** Author Brain V1–V6 — FROZEN. Hardening-only changes beyond this point require explicit unfreeze. */
export {
  dampPassiveToneByConsistency,
  PASSIVE_CONSISTENCY_FLOOR,
  PASSIVE_CONSISTENCY_MODERATE,
  PASSIVE_CONSISTENCY_SOFT,
  signalConsistencyScore,
  stripOverfitBrandLanguage,
  validateAuthorBrainExportBlock,
} from "./hardening";
export { runAuthorBrainHardeningSuite, summarizeAuthorBrainHardening } from "./hardening-suite";
export type { AuthorBrainHardeningAssertion, AuthorBrainHardeningResult } from "./hardening-suite";
