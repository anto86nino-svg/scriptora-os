export type ReaderAbandonmentRisk = "low" | "medium" | "high";
export type ReaderPaceSignal = "too_fast" | "steady" | "skimming";

export type ReaderSimulationSnapshot = {
  version: 1;
  chapterIndex: number;
  evaluatedAt: string;
  curiosity: number;
  emotion: number;
  trust: number;
  confusion: number;
  fatigue: number;
  retention: number;
  wouldContinue: boolean;
  abandonmentRisk: ReaderAbandonmentRisk;
  readingPace: ReaderPaceSignal;
  predictabilityRisk: number;
  earlyPayoffRisk: boolean;
  failedChecks: string[];
  passesGate: boolean;
};

export type ReaderSimulationInput = {
  content: string;
  chapterIndex: number;
  config?: import("@/types/book").BookConfig;
  totalChapters?: number;
  scenePurpose?: import("@/lib/narrative-intelligence-v2/types").ChapterScenePurposeSnapshot;
};
