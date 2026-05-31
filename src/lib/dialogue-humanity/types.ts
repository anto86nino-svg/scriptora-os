export type DialogueHumanityMetric = {
  perfectDialogueLines: number;
  therapistDialogueLines: number;
  overlyMatureLines: number;
  expositoryDialogueLines: number;
  interruptionBeats: number;
  evasionBeats: number;
  silenceBeats: number;
};

export type DialogueHumanityReport = {
  version: 1;
  chapterIndex: number;
  evaluatedAt: string;
  metrics: DialogueHumanityMetric;
  humanityScore: number;
  weakLines: string[];
  passesGate: boolean;
};
