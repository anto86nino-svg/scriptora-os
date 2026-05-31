export type PayoffBeatStatus =
  | "complete"
  | "missing_payoff"
  | "premature_payoff"
  | "unsetup_payoff";

export type SetupPayoffBeat = {
  id: string;
  setup: string;
  development?: string;
  payoff?: string;
  status: PayoffBeatStatus;
  chapterIndex: number;
  warning?: string;
};

export type PayoffAnalysis = {
  version: 1;
  chapterIndex: number;
  evaluatedAt: string;
  beats: SetupPayoffBeat[];
  strengthScore: number;
  missingPayoffCount: number;
  prematurePayoffCount: number;
  warnings: string[];
};
