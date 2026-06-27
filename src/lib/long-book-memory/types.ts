export interface CharacterMemoryState {
  name: string;
  role?: string;
  traumaState: string;
  emotionalState: string;
  relationshipState: string;
  lastSeenChapter?: number;
}

export interface UnresolvedArc {
  id: string;
  description: string;
  introducedChapter: number;
  urgency: "low" | "medium" | "high";
  type: "mystery" | "relationship" | "conflict" | "promise" | "world-rule";
}

export interface ForeshadowSeed {
  seed: string;
  chapter: number;
  payoffStatus: "open" | "partial" | "paid";
}

export interface PromisePayoffTracker {
  id?: string;
  promise: string;
  chapterIntroduced: number;
  originChapter?: number;
  payoffExpectedBy?: number;
  importance?: "low" | "medium" | "high";
  expectedPayoff?: string;
  actualPayoff?: string;
  status: "open" | "developing" | "paid" | "overdue";
}

export interface GlobalRepetitionSignal {
  id: string;
  kind: "gesture" | "image" | "emotion" | "transition";
  phrase: string;
  count: number;
  chapters: number[];
}

export interface EmotionalProgressionBeat {
  chapter: number;
  title: string;
  dominantEmotion: string;
  intensity: number;
}

export interface WorldRuleLock {
  rule: string;
  source: "blueprint" | "chapter" | "config";
}

export interface LongBookMemorySnapshot {
  version: 2;
  updatedAt: string;
  chaptersIndexed: number;
  unresolvedArcs: UnresolvedArc[];
  characterStates: CharacterMemoryState[];
  /** Deep psychological profiles — Sprint V2 */
  characterPsychology?: import("@/lib/narrative-intelligence-v2/types").CharacterPsychologyProfile[];
  emotionalProgression: EmotionalProgressionBeat[];
  foreshadowing: ForeshadowSeed[];
  promisePayoffs: PromisePayoffTracker[];
  globalRepetitionSignals?: GlobalRepetitionSignal[];
  relationshipStates: string[];
  worldRules: WorldRuleLock[];
  continuityAnchors: string[];
  lastChapterEnding?: string;
  /** Memory & Consistency Engine V2.5 — living canon snapshot */
  memoryConsistencyV25?: import("@/lib/memory-consistency-v25/types").MemoryConsistencyV25Snapshot;
}
