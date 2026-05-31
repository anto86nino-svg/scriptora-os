export const MASTERPIECE_ENGINE_VERSION = "scriptora-masterpiece-engine-v1";

export const MASTERPIECE_MAGIC_FLOOR = 75;

export type DraftLabel = "A" | "B" | "C";

export type DraftCandidate = {
  label: DraftLabel;
  content: string;
  compositeScore: number;
  tension: number;
  subtext: number;
  memorability: number;
  readerRetention: number;
  greatness: number;
};

export type MultiDraftReport = {
  candidates: DraftCandidate[];
  selected: DraftLabel;
  selectedScore: number;
  margin: number;
};

export type SceneVariant = {
  sceneIndex: number;
  original: string;
  selected: string;
  variantLabel: "original" | "tension" | "memorable";
  impactScore: number;
};

export type SceneCompetitionReport = {
  scenesEvaluated: number;
  variantsGenerated: number;
  winners: SceneVariant[];
  averageImpactGain: number;
};

export type EmotionalTone =
  | "shock"
  | "sadness"
  | "desire"
  | "nostalgia"
  | "relief"
  | "fear";

export type EmotionalImpactReport = {
  tones: Record<EmotionalTone, number>;
  dominantTone: EmotionalTone | "mixed";
  persistenceScore: number;
  lastingBeats: string[];
  passesGate: boolean;
};

export type BookTokMoment = {
  excerpt: string;
  type: "scene" | "quote" | "reveal" | "relationship";
  authenticityScore: number;
  sharePotential: number;
};

export type BookTokReport = {
  moments: BookTokMoment[];
  authenticCount: number;
  forcedRisk: number;
  passesGate: boolean;
};

export type QuoteCandidate = {
  sentence: string;
  highlightProbability: number;
  underlineProbability: number;
  shareProbability: number;
};

export type QuoteDetectorReport = {
  candidates: QuoteCandidate[];
  topQuote?: QuoteCandidate;
  averageHighlightProbability: number;
};

export type MasterpieceReviewLens = "developmental" | "line" | "beta" | "commercial";

export type MasterpieceSuggestion = {
  lens: MasterpieceReviewLens;
  message: string;
  microElevation?: string;
};

export type MasterpieceReviewReport = {
  suggestions: MasterpieceSuggestion[];
  idealGapScore: number;
  passesGate: boolean;
};

export type NarrativeMagicDimensions = {
  wonder: number;
  memorability: number;
  emotionalPersistence: number;
  readerObsession: number;
  quotePotential: number;
  narrativeMagic: number;
};

export type NarrativeMagicScore = {
  version: typeof MASTERPIECE_ENGINE_VERSION;
  composite: number;
  dimensions: NarrativeMagicDimensions;
  passesMasterpiece: boolean;
  warnings: string[];
};

export type MasterpieceAnalysisSnapshot = {
  version: typeof MASTERPIECE_ENGINE_VERSION;
  evaluatedAt: string;
  multiDraft: MultiDraftReport;
  sceneCompetition: SceneCompetitionReport;
  emotionalImpact: EmotionalImpactReport;
  bookTok: BookTokReport;
  quoteDetector: QuoteDetectorReport;
  reviewer: MasterpieceReviewReport;
  narrativeMagic: NarrativeMagicScore;
};

export type MasterpiecePassResult = {
  content: string;
  rewritten: boolean;
  selectedDraft: DraftLabel;
  microElevationsApplied: number;
  beforeMagic: number;
  afterMagic: number;
  analysis: MasterpieceAnalysisSnapshot;
};
