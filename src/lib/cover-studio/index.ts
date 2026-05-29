export type {
  AudiobookAdaptationPrep,
  CoverArtDirection,
  CoverDirectionSuggestions,
  CoverEditInput,
  CoverGenerateInput,
  CoverIntelligenceInput,
  CoverMotif,
  CoverProvider,
  CoverProviderCapability,
  CoverProviderKind,
  CoverProviderResult,
  CoverReadinessFactor,
  CoverReadinessResult,
  CoverReadinessTier,
  CoverTemplateFamily,
  CoverUpscaleInput,
} from "./types";

export { COVER_STUDIO_ENGINE_V1, PLACEHOLDER_PROVIDER_IDS, READINESS_TIER_LABELS } from "./constants";

export { inferCoverArtDirection } from "./art-direction";
export { buildCoverDirectionSuggestions } from "./cover-intelligence";
export { evaluateCoverReadiness, type CoverReadinessInput } from "./cover-readiness-score";
export {
  COVER_TEMPLATE_FAMILIES,
  matchTemplateFamily,
  recommendedTemplateIndex,
} from "./template-families";
export { prepareAudiobookAdaptation, type AudiobookPrepInput } from "./audiobook-prep";
export {
  generateViaProvider,
  getActiveCoverProvider,
  listCoverProviders,
  placeholderProviders,
  scriptoraBuiltinProvider,
} from "./provider-registry";
