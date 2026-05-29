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
  promise: string;
  chapterIntroduced: number;
  payoffExpectedBy?: number;
  status: "open" | "paid" | "overdue";
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
  relationshipStates: string[];
  worldRules: WorldRuleLock[];
  continuityAnchors: string[];
  lastChapterEnding?: string;
}
