import type { BaselineGenreId, NarrativeBaselineMetrics } from "./types";

/** Frozen minimum thresholds for Narrative Baseline v1. */
export const NARRATIVE_BASELINE_V1_TAG = "scriptora-narrative-baseline-v1" as const;

export const NARRATIVE_BASELINE_V1_THRESHOLDS: Record<
  BaselineGenreId,
  Pick<NarrativeBaselineMetrics, "composite" | "aiSmell" | "therapySpeech" | "genreAlignment" | "hookStrength">
> = {
  "gothic-thriller": { composite: 58, aiSmell: 55, therapySpeech: 70, genreAlignment: 55, hookStrength: 55 },
  "romance-slow-burn": { composite: 56, aiSmell: 55, therapySpeech: 72, genreAlignment: 52, hookStrength: 50 },
  fantasy: { composite: 56, aiSmell: 55, therapySpeech: 70, genreAlignment: 52, hookStrength: 52 },
  thriller: { composite: 58, aiSmell: 55, therapySpeech: 70, genreAlignment: 55, hookStrength: 55 },
  "self-help": { composite: 54, aiSmell: 50, therapySpeech: 75, genreAlignment: 58, hookStrength: 52 },
  "study-book": { composite: 52, aiSmell: 50, therapySpeech: 78, genreAlignment: 58, hookStrength: 45 },
  manual: { composite: 52, aiSmell: 50, therapySpeech: 80, genreAlignment: 60, hookStrength: 42 },
  memoir: { composite: 54, aiSmell: 55, therapySpeech: 72, genreAlignment: 50, hookStrength: 48 },
};

export function meetsBaselineV1(genre: BaselineGenreId, metrics: NarrativeBaselineMetrics): boolean {
  const threshold = NARRATIVE_BASELINE_V1_THRESHOLDS[genre];
  return (
    metrics.composite >= threshold.composite &&
    metrics.aiSmell >= threshold.aiSmell &&
    metrics.therapySpeech >= threshold.therapySpeech &&
    metrics.genreAlignment >= threshold.genreAlignment &&
    metrics.hookStrength >= threshold.hookStrength
  );
}
