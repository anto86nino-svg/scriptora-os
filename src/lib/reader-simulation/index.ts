export type { ReaderAbandonmentRisk, ReaderPaceSignal, ReaderSimulationInput, ReaderSimulationSnapshot } from "./types";
export { simulateReaderInLoop } from "./engine";
export { applyMicroReaderRewrite } from "./micro-rewrite";
export { applyNarrativePullRewrite, applyEngagementTargetRewrite } from "./narrative-pull";
