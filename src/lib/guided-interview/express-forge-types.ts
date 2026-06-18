import type { GuidedInterviewState } from "./types";
import type { ForgeInterviewMemory } from "./interview-memory";
import type { BlueprintScenario } from "./blueprint-scenarios";

export type ExpressTitleMode = "provided" | "provisional" | "suggest";
export type ExpressControlLevel = "auto" | "scenarios" | "minimal";

export type ExpressForgeInput = {
  genre: string;
  language: string;
  titleMode: ExpressTitleMode;
  title?: string;
  protagonistSeed: string;
  tone: string;
  length: "breve" | "medio" | "lungo" | "pro";
  controlLevel: ExpressControlLevel;
};

export type ForgeFieldProvenance = {
  value: string;
  source: "user" | "auto" | "inferred";
  confidence: number;
};

export type ExpressForgeResult = {
  state: GuidedInterviewState;
  memory: ForgeInterviewMemory;
  candidateBlueprintScenarios: BlueprintScenario[];
  missingCriticalFields: string[];
  autoFilledFields: string[];
  provenance: Record<string, ForgeFieldProvenance>;
};
