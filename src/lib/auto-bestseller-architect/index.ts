export type {
  ArchitectPhaseId,
  AutoBestsellerArchitectResult,
  AutoBestsellerHandoffPack,
  IdeaIntelligenceResult,
  MarketPositioningResult,
  TitleConcept,
} from "./types";

export {
  AUTO_BESTSELLER_PACK_KEY,
  SETUP_ORIGIN_KEY,
} from "./types";

export {
  getArchitectPhaseLabels,
  getArchitectFlowCopy,
  getArchitectPageCopy,
  normalizeArchitectLang,
  ARCHITECT_PHASE_LABELS,
} from "./localized-copy";

export { inferIdeaIntelligence } from "./idea-intelligence";
export { buildMarketPositioning } from "./market-positioning";
export { buildTitleConcepts } from "./titles";
export { buildArchitectBookConfig } from "./config-builder";

export {
  persistAutoBestsellerHandoff,
  peekAutoBestsellerHandoffPack,
  consumeAutoBestsellerHandoffPack,
  clearAutoBestsellerHandoffPack,
} from "./handoff";

export {
  runAutoBestsellerArchitect,
  buildHandoffPack,
  type ArchitectProgressCallback,
} from "./orchestrator";
