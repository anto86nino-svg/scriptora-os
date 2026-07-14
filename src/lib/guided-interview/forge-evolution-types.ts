import type { InterviewQuestion } from "./types";

export type ForgePhase =
  | "understanding"
  | "configuration"
  | "characters"
  | "decisions"
  | "title"
  | "copyright"
  | "review";

export type ForgeCharacterRole = "protagonist" | "antagonist" | "supporting" | "love_interest";

export type ForgeSceneRole = "opening" | "crisis" | "climax" | "closing";

export type ForgeScene = {
  id: string;
  role: ForgeSceneRole;
  title?: string;
  beat?: string;
  stakes?: string;
  emotion?: string;
};

export type NarrativeArcBeat = {
  id: string;
  act: "setup" | "pressure" | "break" | "fallout" | "finale";
  label: string;
  change?: string;
};

export type StoryEndingVision = {
  tone?: string;
  protagonistFate?: string;
  readerFeeling?: string;
  irreversibleChoice?: string;
};

export type StoryRoomState = {
  scenes: ForgeScene[];
  arcBeats: NarrativeArcBeat[];
  ending: StoryEndingVision;
};

export type StoryRoomSection = "characters" | "scenes" | "arcs" | "ending";

export type StoryRoomSectionStatus = {
  id: StoryRoomSection;
  label: string;
  emoji: string;
  complete: boolean;
  summary: string;
  missing: string[];
};

export type StoryRoomSnapshot = {
  visible: boolean;
  fiction: boolean;
  sections: StoryRoomSectionStatus[];
  completionPct: number;
  activeSection: StoryRoomSection | null;
  highlight?: string;
};

export type ForgeCharacter = {
  id: string;
  role: ForgeCharacterRole;
  name?: string;
  wound?: string;
  fear?: string;
  desire?: string;
  contradiction?: string;
  obsession?: string;
  secret?: string;
  arc?: string;
  emotionalTriggers?: string;
  dominantFlaw?: string;
  blindSpot?: string;
  vulnerability?: string;
  recurringBehavior?: string;
  personalLanguage?: string;
};

export type NarrativeDecisionRecord = {
  id: string;
  key: string;
  question: string;
  answer?: string;
  impact?: string;
};

export type StoryFutureState = {
  finalStatus?: string;
  betrayalArc?: boolean;
  endingTone?: string;
  kingdomFate?: string;
  transformationPace?: string;
  lastPageFeeling?: string;
  culpritRevealed?: boolean;
  hopeOrDread?: string;
};

export type CanonLayer = {
  facts: string[];
  locked: boolean;
};

export type CanonMaster = {
  world: CanonLayer;
  characters: CanonLayer;
  relationships: CanonLayer;
  story: CanonLayer;
  ending: CanonLayer;
  book: CanonLayer;
  version: number;
  lockedAt?: number;
};

export type BookPromises = {
  scene: string[];
  character: string[];
  emotional: string[];
  relationship: string[];
  plot: string[];
};

export type TitleIntelligence = {
  workingTitle?: string;
  definitiveTitle?: string;
  subtitle?: string;
  commercialHook?: string;
  commercialPromise?: string;
  approved?: boolean;
};

export type CopyrightConfig = {
  mode?: "standard" | "custom";
  holder?: string;
  year?: string;
  customText?: string;
};

export type ForgePhaseStatus = {
  phase: ForgePhase;
  complete: boolean;
  missing: string[];
};

export type ForgeEvolutionReport = {
  currentPhase: ForgePhase;
  phases: ForgePhaseStatus[];
  bookUnderstood: boolean;
  configurationComplete: boolean;
  charactersComplete: boolean;
  decisionsComplete: boolean;
  canonComplete: boolean;
  titleComplete: boolean;
  copyrightComplete: boolean;
  contradictionsResolved: boolean;
  repetitionClear: boolean;
  confidence: number;
  readyForBlueprint: boolean;
  readyForReview: boolean;
  blockedReasons: string[];
  nextQuestions: InterviewQuestion[];
};

export type FinalBookReviewField = {
  label: string;
  value: string;
  key?: string;
};

export type FinalBookReview = {
  title: string;
  subtitle: string;
  author: string;
  language: string;
  genre: string;
  subgenre: string;
  targetReader: string;
  promise: string;
  conflict: string;
  transformation: string;
  characters: string;
  scenes: string;
  arcs: string;
  ending: string;
  chapters: string;
  subchapters: string;
  frontMatter: string;
  backMatter: string;
  marketplace: string;
  copyright: string;
  commercialHook: string;
  fields: FinalBookReviewField[];
};
