import type { GuidedInterviewState } from "./types";
import type { ForgeInterviewMemory } from "./interview-memory";
import type { ExpressBookScenario } from "./express-book-package";

export type ExpressTitleMode = "provided" | "provisional" | "suggest";
export type ExpressControlLevel = "auto" | "scenarios" | "minimal";

export type ExpressBookFormat =
  | "novel"
  | "novella"
  | "poetry_collection"
  | "short_story_collection"
  | "cookbook"
  | "essay"
  | "memoir"
  | "self_help"
  | "study_material"
  | "workbook"
  | "children_book"
  | "mixed_or_unknown";

export type ExpressForgeInput = {
  bookFormat: ExpressBookFormat;
  genre: string;
  language: string;
  titleMode: ExpressTitleMode;
  title?: string;
  subtitle?: string;
  /** Idea breve, protagonista, atmosfera — input principale Express */
  ideaSeed: string;
  /** @deprecated use ideaSeed */
  protagonistSeed?: string;
  tone: string;
  length: "breve" | "medio" | "lungo" | "epico" | "pro";
  controlLevel: ExpressControlLevel;
  /** Author confirmed format/genre — skip idea-based inference. */
  authorFormatLocked?: boolean;
};

export type ForgeFieldProvenance = {
  value: string;
  source: "user" | "auto" | "inferred";
  confidence: number;
};

export type ExpressForgeResult = {
  state: GuidedInterviewState;
  memory: ForgeInterviewMemory;
  candidateBlueprintScenarios: ExpressBookScenario[];
  missingCriticalFields: string[];
  autoFilledFields: string[];
  provenance: Record<string, ForgeFieldProvenance>;
  packages: ExpressBookScenario[];
};
