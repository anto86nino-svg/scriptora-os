/** Scriptora Memory Graph — unified narrative memory model (v1). */

export type MemoryGraphVersion = 1;

export type PromiseStatus = "open" | "partial" | "resolved" | "broken";
export type MysteryStatus = "open" | "partial" | "resolved" | "abandoned";
export type ForeshadowStatus = "seeded" | "echoed" | "paid" | "broken";
export type ObjectStatus = "active" | "lost" | "destroyed" | "resolved";
export type ArcStage = "setup" | "rising" | "crisis" | "climax" | "resolution" | "unknown";

export type RelationshipAxis =
  | "love"
  | "trust"
  | "fear"
  | "conflict"
  | "dependency"
  | "obsession"
  | "respect";

export type CharacterGraphNode = {
  id: string;
  name: string;
  role?: string;
  coreWound: string;
  coreDesire: string;
  coreFear: string;
  coreNeed: string;
  dominantFlaw: string;
  blindSpot: string;
  greatestSecret: string;
  speechPattern: string;
  behaviorSignature: string;
  emotionalTrigger: string;
  currentArc: string;
  arcStage: ArcStage;
  lastUpdatedChapter?: number;
};

export type RelationshipGraphEdge = {
  id: string;
  characterAId: string;
  characterBId: string;
  characterA: string;
  characterB: string;
  love: number;
  trust: number;
  fear: number;
  conflict: number;
  dependency: number;
  obsession: number;
  respect: number;
  statusNote: string;
  lastChangedChapter?: number;
  history: Array<{ chapter: number; axis: RelationshipAxis; delta: number; note?: string }>;
};

export type PromiseGraphNode = {
  id: string;
  label: string;
  description: string;
  introducedIn: number;
  importance: "low" | "medium" | "high" | "critical";
  status: PromiseStatus;
  expectedPayoffChapter?: number;
};

export type MysteryGraphNode = {
  id: string;
  label: string;
  description: string;
  status: MysteryStatus;
  introducedIn: number;
  clues: string[];
  suspects: string[];
  redHerrings: string[];
};

export type WorldGraphNode = {
  id: string;
  kind: "location" | "timeline" | "rule" | "organization" | "event" | "magic" | "technology";
  label: string;
  description: string;
  introducedIn?: number;
  constraints?: string[];
};

export type ObjectGraphNode = {
  id: string;
  label: string;
  meaning: string;
  owners: string[];
  status: ObjectStatus;
  introducedIn: number;
};

export type ForeshadowGraphNode = {
  id: string;
  seed: string;
  importance: "low" | "medium" | "high";
  introducedIn: number;
  expectedPayoff?: string;
  status: ForeshadowStatus;
};

export type CharacterEvolutionNode = {
  characterId: string;
  characterName: string;
  initialState: string;
  currentState: string;
  growth: string[];
  regressions: string[];
  keyEvents: Array<{ chapter: number; event: string }>;
};

export type StoryDebtGraph = {
  unresolvedPromises: string[];
  unresolvedMysteries: string[];
  unresolvedRelationships: string[];
  unresolvedObjects: string[];
  unresolvedArcs: string[];
  narrativeDebtScore: number;
};

export type CanonDriftSeverity = "info" | "warning" | "critical";

export type CanonDriftIssue = {
  id: string;
  severity: CanonDriftSeverity;
  category:
    | "character"
    | "relationship"
    | "timeline"
    | "mystery"
    | "promise"
    | "world"
    | "object"
    | "foreshadow";
  message: string;
  chapterIndex?: number;
  suggestedFix?: string;
};

export type CanonDriftReport = {
  issues: CanonDriftIssue[];
  driftScore: number;
  status: "clean" | "canon_warning" | "critical";
};

export type MemoryGraphMode = "full" | "degraded";

export type MemoryGraphSnapshot = {
  version: MemoryGraphVersion;
  projectId: string;
  updatedAt: string;
  chaptersIndexed: number;
  mode: MemoryGraphMode;
  characters: CharacterGraphNode[];
  relationships: RelationshipGraphEdge[];
  promises: PromiseGraphNode[];
  mysteries: MysteryGraphNode[];
  world: WorldGraphNode[];
  objects: ObjectGraphNode[];
  foreshadows: ForeshadowGraphNode[];
  characterEvolution: CharacterEvolutionNode[];
  storyDebt: StoryDebtGraph;
  lastCanonDrift?: CanonDriftReport;
};

export type PreChapterMemoryContext = {
  snapshot: MemoryGraphSnapshot;
  writerContextBlock: string;
  driftReport: CanonDriftReport;
  mode: MemoryGraphMode;
  warnings: string[];
};

export type PostChapterMemoryUpdateResult = {
  snapshot: MemoryGraphSnapshot;
  driftReport: CanonDriftReport;
  debtScore: number;
  updatedNodeCounts: Record<string, number>;
};
