export type ValidationGenre = "romance" | "thriller" | "fantasy" | "self-help";

export type ChapterProblemCounts = {
  missingPayoffs: number;
  cliches: number;
  explainedEmotions: number;
  characterIncoherences: number;
  forgottenPromises: number;
  artificialDialogue: number;
};

export type ChapterValidationMetrics = {
  genre: ValidationGenre;
  chapterIndex: number;
  title: string;
  wordCount: number;
  supremeComposite: number;
  chapterDoctorScore: number;
  criticalIssues: number;
  optionalIssues: number;
  readerCuriosity: number;
  readerRetention: number;
  characterConsistency: number;
  narrativeMemoryHealth: number;
  canonProtectionPass: boolean;
  clicheDensity: number;
  problems: ChapterProblemCounts;
  passesPreDelivery: boolean;
  greatnessComposite: number;
  greatnessMemorability: number;
  greatnessBingeability: number;
  greatnessHookIntensity: number;
  narrativeMagicComposite: number;
  narrativeMagicWonder: number;
  narrativeMagicQuotePotential: number;
};

export type GenreValidationAggregate = {
  genre: ValidationGenre;
  chapterCount: number;
  avgSupremeComposite: number;
  avgChapterDoctorScore: number;
  totalCriticalIssues: number;
  totalOptionalIssues: number;
  avgReaderCuriosity: number;
  avgReaderRetention: number;
  avgCharacterConsistency: number;
  avgNarrativeMemoryHealth: number;
  canonPassRate: number;
  avgClicheDensity: number;
  preDeliveryPassRate: number;
  avgGreatnessComposite: number;
  avgGreatnessMemorability: number;
  avgGreatnessBingeability: number;
  avgGreatnessHookIntensity: number;
  avgNarrativeMagicComposite: number;
  avgNarrativeMagicWonder: number;
  avgNarrativeMagicQuotePotential: number;
  problems: ChapterProblemCounts;
};

export type ValidationSuiteReport = {
  version: 1;
  generatedAt: string;
  label: "baseline-pre-abcd" | "current-orchestrator";
  genres: GenreValidationAggregate[];
  totals: GenreValidationAggregate;
  chapters: ChapterValidationMetrics[];
};

export type ComparativeValidationReport = {
  version: 1;
  generatedAt: string;
  baseline: ValidationSuiteReport;
  current: ValidationSuiteReport;
  improvements: {
    criticalIssuesDelta: number;
    criticalIssuesPct: number;
    missingPayoffsDelta: number;
    clichesDelta: number;
    explainedEmotionsDelta: number;
    characterIncoherencesDelta: number;
    forgottenPromisesDelta: number;
    artificialDialogueDelta: number;
    supremeCompositeDelta: number;
    chapterDoctorScoreDelta: number;
    narrativeMemoryHealthDelta: number;
    preDeliveryPassRateDelta: number;
    greatnessCompositeDelta: number;
    avgGreatnessComposite: number;
    narrativeMagicCompositeDelta: number;
    avgNarrativeMagicComposite: number;
  };
  markdown: string;
};
