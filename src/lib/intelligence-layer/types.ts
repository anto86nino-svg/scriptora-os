import type { BookConfig, BookProject } from "@/types/book";
import type { BookDnaLock } from "@/lib/guided-interview/dna-lock";
import type {
  CanonMaster,
  ForgeCharacter,
  StoryRoomState,
  TitleIntelligence,
} from "@/lib/guided-interview/forge-evolution-types";
import type { ForgeInterviewSeed } from "@/lib/guided-interview/forge-blueprint-handoff";
import type { GuidedInterviewState } from "@/lib/guided-interview/types";
import type { BrainInsight } from "@/lib/guided-interview/forge-orchestrator";
import type { PostForgeManuscriptReport } from "@/lib/guided-interview/post-forge-orchestrator";

export type ContextSource =
  | "project"
  | "forge-state"
  | "forge-session"
  | "kdp-session"
  | "title-domination"
  | "cover";

export type ContextCompleteness = "full" | "partial" | "minimal";

export type AdvisorySignal = {
  module:
    | "editorial"
    | "narrative"
    | "market"
    | "canon"
    | "character"
    | "genre"
    | "commercial";
  severity: "info" | "warn" | "note";
  message: string;
};

export type CharacterProfileSlice = {
  characters: ForgeCharacter[];
  bibleText?: string;
  deepPsychologyAvailable: boolean;
};

export type CanonSnapshotSlice = {
  facts: string[];
  brief?: string;
  architecture?: string;
  antiDriftRules: string[];
  master?: CanonMaster;
  locked: boolean;
  warnings: string[];
};

export type NarrativeSlice = {
  blueprintOverview?: string;
  blueprintText?: string;
  storyArchitecture?: string;
  firstChapterExcerpt?: string;
  genre?: string;
  tone?: string;
};

export type PublishingSlice = {
  title: string;
  subtitle: string;
  idea: string;
  genre: string;
  language: string;
  targetReader?: string;
  packagingPromise: string;
  titleIntelligence?: TitleIntelligence;
};

export type MarketSlice = {
  commercialNotes: string[];
  bookTokPotential?: number | null;
  genreAlignmentNote?: string;
};

export type UnifiedBookContext = {
  version: 1;
  resolvedAt: string;
  sources: ContextSource[];
  completeness: ContextCompleteness;
  projectId?: string;
  dnaLock?: BookDnaLock;
  publishing: PublishingSlice;
  characters: CharacterProfileSlice;
  canon: CanonSnapshotSlice;
  storyRoom?: StoryRoomState;
  narrative: NarrativeSlice;
  editorialSignals: AdvisorySignal[];
  narrativeSignals: AdvisorySignal[];
  marketSignals: AdvisorySignal[];
  forgeSeed?: ForgeInterviewSeed;
  writerContextBlock?: string;
};

export type ResolveBookContextInput = {
  project?: BookProject | null;
  forgeState?: GuidedInterviewState | null;
  includeSignals?: boolean;
  chapterIndex?: number;
  chapterText?: string;
};

export type IntelligenceLayerResult = {
  context: UnifiedBookContext;
  forgeInsights: BrainInsight[];
  manuscriptReport?: PostForgeManuscriptReport;
};

export type WriterEngineContext = {
  consolidatedBlock: string;
  canonWarnings: string[];
  context: UnifiedBookContext;
};

export type CoverStudioContext = {
  title: string;
  subtitle: string;
  genre: string;
  language: string;
  overview: string;
  authorName: string;
  marketAngle: string;
  visualTone: string;
  context: UnifiedBookContext;
};

export type KdpLaunchContext = {
  idea: string;
  genre: string;
  language: string;
  chosenTitle: string;
  chosenSubtitle: string;
  packagingPromise: string;
  commercialNotes: string[];
  context: UnifiedBookContext;
};

export type RadarContext = {
  effectiveTitle: string;
  effectiveGenre: string;
  packagingPromise: string;
  blueprintText: string;
  firstChapterText: string;
  hasCover: boolean;
  context: UnifiedBookContext;
};

export type ForgeModuleContext = {
  context: UnifiedBookContext;
  brainInsights: BrainInsight[];
};

export type BookConfigSlice = Pick<
  BookConfig,
  | "title"
  | "subtitle"
  | "idea"
  | "genre"
  | "language"
  | "targetReader"
  | "tone"
  | "characterBibleText"
  | "forgeCanonBrief"
  | "forgeStoryArchitecture"
  | "forgeAntiDriftRules"
  | "characters"
>;
