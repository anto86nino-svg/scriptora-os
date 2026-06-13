export type LoveResistance = "low" | "medium" | "high";
export type ConflictLevel = "low" | "medium" | "high";

export interface CharacterLiveMemory {
  name: string;
  role?: string;
  dominantFear: string;
  dominantDesire: string;
  wound: string;
  loveResistance: LoveResistance;
  speechStyle: string;
  recurringTics: string[];
  recurringGestures: string[];
  stressPattern: string;
  trustLevels: Record<string, number>;
  emotionalEvolution: string;
  secrets: string[];
  activeLies: string[];
  avoidancePatterns: string[];
  lastSeenChapter?: number;
}

export interface RelationshipMemory {
  pair: string;
  characterA: string;
  characterB: string;
  trust: number;
  sexualTension: number;
  emotionalOpenness: number;
  conflictLevel: ConflictLevel;
  fearOfVulnerability: ConflictLevel;
  lastInteractionChapter: number;
  statusNote: string;
}

export type StoryPromiseType = "mystery" | "question" | "payoff" | "object" | "symbol" | "tension";

export interface StoryPromiseItem {
  id: string;
  type: StoryPromiseType;
  description: string;
  chapterIntroduced: number;
  status: "open" | "partial" | "resolved";
  urgency: "low" | "medium" | "high";
}

export interface EmotionalContinuityBeat {
  chapter: number;
  character?: string;
  emotion: string;
  intensity: number;
  regressionRisk?: boolean;
}

export interface TensionMemoryState {
  genreMode: string;
  slowBurnActive: boolean;
  tensionLevel: number;
  frictionSignals: string[];
  distanceSignals: string[];
  ambivalenceSignals: string[];
  lastEscalationChapter?: number;
}

export interface CallbackAnchor {
  detail: string;
  chapterIntroduced: number;
  character?: string;
  type: "gesture" | "object" | "phrase" | "tic";
  suggestedReuse: string;
}

export interface MemoryConsistencyV25Snapshot {
  version: 25;
  updatedAt: string;
  chaptersIndexed: number;
  characterMemories: CharacterLiveMemory[];
  relationships: RelationshipMemory[];
  storyPromises: StoryPromiseItem[];
  emotionalContinuity: EmotionalContinuityBeat[];
  tensionMemory: TensionMemoryState;
  callbacks: CallbackAnchor[];
  compressedPromptSnapshot: string;
}

export type DevelopmentalIssueCategory =
  | "character"
  | "relationship"
  | "tension"
  | "payoff"
  | "conflict"
  | "emotion";

export interface DevelopmentalMemoryIssue {
  id: string;
  severity: "warning" | "critical";
  category: DevelopmentalIssueCategory;
  message: string;
  surgicalFix?: string;
}

export interface DevelopmentalMemoryReport {
  issues: DevelopmentalMemoryIssue[];
  score: number;
}
