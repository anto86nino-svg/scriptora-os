export type {
  AdvisorySignal,
  BookConfigSlice,
  ContextCompleteness,
  ContextSource,
  CoverStudioContext,
  ForgeModuleContext,
  IntelligenceLayerResult,
  KdpLaunchContext,
  RadarContext,
  ResolveBookContextInput,
  UnifiedBookContext,
  WriterEngineContext,
} from "./types";

export {
  resolveBookContext,
  resolveBookContextFromForge,
  resolveBookContextFromProject,
} from "./resolve-book-context";

export {
  consultIntelligenceLayer,
  formatContextSummary,
  getCoverStudioContext,
  getForgeModuleContext,
  getKdpLaunchContext,
  getRadarContext,
  getWriterEngineContext,
} from "./orchestrate";

export {
  flattenCanonFacts,
  mergeCanonSlices,
  selectCanonFromConfig,
  selectCanonFromForgeState,
  selectCanonFromProject,
  selectCanonFromSeed,
} from "./selectors/canon";

export {
  bookCharactersFromSeed,
  selectCharactersFromConfig,
  selectCharactersFromForgeState,
  selectCharactersFromSeed,
} from "./selectors/characters";

export {
  buildEditorialSignals,
  buildMarketSignals,
  buildNarrativeSignals,
  buildProjectPitch,
} from "./selectors/signals";
