export type BehavioralViolationType =
  | "value_contradiction"
  | "trait_reversal"
  | "speech_shift"
  | "emotional_teleport"
  | "relationship_jump";

export type BehavioralViolation = {
  character: string;
  type: BehavioralViolationType;
  severity: "critical" | "optional";
  message: string;
  priorEvidence?: string;
  currentEvidence?: string;
};

export type BehavioralConsistencyReport = {
  version: 1;
  chapterIndex: number;
  evaluatedAt: string;
  violations: BehavioralViolation[];
  consistencyScore: number;
  passesGate: boolean;
};
