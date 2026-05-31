export type TensionArcViolation =
  | "premature_payoff"
  | "premature_confession"
  | "premature_reconciliation"
  | "attraction_to_payoff_skip"
  | "mystery_resolved_early";

export type TensionEngineV2Snapshot = {
  version: 1;
  chapterIndex: number;
  evaluatedAt: string;
  narrativeTension: number;
  emotionalTension: number;
  relationshipTension: number;
  mysteryTension: number;
  violations: TensionArcViolation[];
  warnings: string[];
  passesGate: boolean;
};
