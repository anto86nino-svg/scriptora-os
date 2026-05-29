import type { RubricScores } from "@/lib/live-author-validation/rubric";
import type { RealWorldProject } from "@/lib/live-author-validation/corpus/real-world-projects";
import type { BlindComparisonResult } from "@/lib/live-author-validation/blind-compare";
import type {
  AuthorIdentityValidationResult,
  ChapterDoctorBlindResult,
  LongBookStressResult,
} from "@/lib/live-author-validation/long-book-stress";

export type LiveVariant = "scriptora" | "chatgpt" | "claude";

export interface LiveBenchmarkEnvStatus {
  deepseek: boolean;
  openai: boolean;
  anthropic: boolean;
  ready: boolean;
  mode: "live" | "offline";
}

export interface LiveGenerationRequest {
  variant: LiveVariant;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LiveGenerationResult {
  variant: LiveVariant;
  content: string;
  model: string;
  tokensUsed?: number;
  cached: boolean;
  error?: string;
}

export interface LiveProjectRun {
  project: RealWorldProject;
  chaptersByVariant: Record<LiveVariant, string[]>;
  blindResult: BlindComparisonResult;
  continuityByVariant: Record<LiveVariant, number>;
}

export interface LiveLongBookVariantResult {
  variant: LiveVariant;
  totalChapters: number;
  checkpoints: Array<{
    chapter: number;
    continuityProxy: number;
    driftScore: number;
    issues: string[];
  }>;
  survived: boolean;
  collapsedAfterChapter15: boolean;
}

export interface LiveAuthorIdentityResult {
  scriptoraAntoninoVoice: number;
  scriptoraLiviaVoice: number;
  chatgptGenericVoice: number;
  claudeGenericVoice: number;
  scriptoraPreservesIdentity: boolean;
  competitorsGeneric: boolean;
  passed: boolean;
  issues: string[];
}

export interface LiveChapterDoctorResult extends ChapterDoctorBlindResult {
  scriptoraDoctorChosen: boolean;
  claudeRevisionChosen: boolean;
  competitorBaseline: "chatgpt";
}

export interface RealAuthorPassReport {
  generatedAt: string;
  mode: "live" | "offline-blocked" | "offline-partial";
  env: LiveBenchmarkEnvStatus;
  smoke: boolean;
  projectsTested: number;
  chaptersPerProject: number;
  longBookChapters: number;
  overallScore: number;
  ctoVerdict: string;
  wouldAuthorsPreferScriptora: boolean;
  measurablySuperiorLongForm: boolean;
  vsChatGPT: { wins: number; losses: number; ties: number; winRate: number; avgMargin: number; verdict: string };
  vsClaude: { wins: number; losses: number; ties: number; winRate: number; avgMargin: number; verdict: string };
  winLossByGenre: Array<{ category: string; scriptoraWins: number; total: number; avgMarginVsChatGPT: number }>;
  longBook: LiveLongBookVariantResult[];
  authorIdentity: LiveAuthorIdentityResult;
  chapterDoctor: LiveChapterDoctorResult;
  strongestMoat: string[];
  weakestAreas: string[];
  failurePoints: string[];
  blindResults: BlindComparisonResult[];
  markdown: string;
}

export interface LiveBenchmarkRunOptions {
  smoke?: boolean;
  useCache?: boolean;
  chaptersPerProject?: number;
  longBookChapters?: number;
  projectsPerCategory?: number;
}

export interface ScoredLiveSample {
  variant: LiveVariant;
  content: string;
  scores: RubricScores;
  continuityProxy: number;
  voiceProxy: number;
}

export type LongBookStressResultLegacy = LongBookStressResult;
