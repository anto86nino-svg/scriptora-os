/**
 * narrative-intelligence — safe stub
 *
 * The real telemetry engine was never shipped in this codebase.
 * scorer.ts and reader-emotion.ts both import `getNarrativeTelemetrySnapshot`
 * from this module. Without it Vite resolves the import to `undefined` at
 * runtime, causing every telemetry-gated score branch to silently degrade.
 *
 * This stub returns a zero-risk neutral snapshot so all downstream consumers
 * behave correctly without crashing.  Replace this file with the real engine
 * whenever it's ready — the return shape is fully compatible.
 */

export interface NarrativeTelemetryScores {
  /** 0-100: estimated reader drop-off risk */
  readerDropRiskEstimate: number;
  /** 0-100: commercial momentum metric */
  commercialMomentumScore: number;
  /** 0-100: AI-pattern detectability risk */
  aiRiskScore: number;
  /** 0-100: subtext / implication density */
  subtextDensity: number;
  /** 0-100: emotional realism score */
  emotionalRealismScore: number;
  /** 0-100: pacing pressure signal */
  pacingPressure: number;
  /** 0-100: tension level */
  tensionScore: number;
}

export interface NarrativeTelemetryFlags {
  pacingCollapseRisk: boolean;
  weakHookRisk: boolean;
  earlyPayoffRisk: boolean;
}

export interface NarrativeTelemetrySnapshot {
  scores: NarrativeTelemetryScores;
  flags: NarrativeTelemetryFlags;
}

export interface NarrativeTelemetryInput {
  config?: {
    genre?: string;
    bookIntelligence?: unknown;
  };
  currentText?: string;
  content?: string;
  chapterIndex?: number;
  totalChapters?: number;
  genre?: string;
  bookIntelligence?: unknown;
}

/**
 * Returns a neutral telemetry snapshot.
 * All scores default to values that produce zero bonus/penalty in every
 * downstream scoring function — no false positives, no false negatives.
 */
export function getNarrativeTelemetrySnapshot(
  _input?: NarrativeTelemetryInput,
): NarrativeTelemetrySnapshot {
  return {
    scores: {
      readerDropRiskEstimate: 50,   // → retention score = 100 - 50 = 50 (neutral)
      commercialMomentumScore: 0,   // stays below 72 → no false "strong momentum" strength
      aiRiskScore: 0,               // stays below 55 → no AI-risk penalty in compulsive readability
      subtextDensity: 0,            // stays below 8 → no subtext bonus
      emotionalRealismScore: 0,     // stays below 70 → no emotional realism bonus
      pacingPressure: 50,           // neutral pacing commercial score
      tensionScore: 0,              // stays below 65 → no tension bonus
    },
    flags: {
      pacingCollapseRisk: false,
      weakHookRisk: false,
      earlyPayoffRisk: false,
    },
  };
}
