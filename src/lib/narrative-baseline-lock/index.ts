import type { BaselineGenreId, NarrativeReadinessLevel } from "./types";
import { BASELINE_GENRE_FIXTURES, getBaselineFixture } from "./fixtures";
import { scoreNarrativeBaseline, buildBaselineSnapshot } from "./baseline-scorer";
import { meetsBaselineV1, NARRATIVE_BASELINE_V1_TAG } from "./baseline-v1";
import { validateCrossGenreStability } from "./cross-genre-guard";
import { detectOverOptimization, buildOverOptimizationGuardBlock } from "./over-optimization-guard";
import { evaluateLongFormStability, buildLongFormSimulationCorpus } from "./long-form-stability";
import {
  getGreatnessMode,
  isGreatnessDiagnosticsEnabled,
  isGreatnessPromptActive,
  setGreatnessMode,
  type GreatnessMode,
} from "./greatness-mode";

export function runBaselineRegressionSuite(): {
  snapshots: ReturnType<typeof buildBaselineSnapshot>[];
  allPass: boolean;
  weakBeatsStrong: boolean;
} {
  const snapshots = BASELINE_GENRE_FIXTURES.map((fixture) =>
    buildBaselineSnapshot(fixture.id, fixture.sampleText, fixture.config),
  );

  const allPass = snapshots.every((snapshot) => meetsBaselineV1(snapshot.genre, snapshot.metrics));

  const weakBeatsStrong = BASELINE_GENRE_FIXTURES.every((fixture) => {
    const strong = scoreNarrativeBaseline(fixture.sampleText, fixture.config).composite;
    const weak = scoreNarrativeBaseline(fixture.weakText, fixture.config).composite;
    return strong >= weak + 2;
  });

  return { snapshots, allPass, weakBeatsStrong };
}

export function computeBaselineScoreboard(): Record<BaselineGenreId, number> {
  const board = {} as Record<BaselineGenreId, number>;
  for (const fixture of BASELINE_GENRE_FIXTURES) {
    board[fixture.id] = scoreNarrativeBaseline(fixture.sampleText, fixture.config).composite;
  }
  return board;
}

export function assessNarrativeReadiness(): {
  level: NarrativeReadinessLevel;
  baselineTag: typeof NARRATIVE_BASELINE_V1_TAG;
  greatnessMode: GreatnessMode;
  regressionPass: boolean;
  crossGenreStable: boolean;
  longFormStable: boolean;
  risks: string[];
} {
  const suite = runBaselineRegressionSuite();
  const scoreboard = computeBaselineScoreboard();
  const cross = validateCrossGenreStability(scoreboard, scoreboard, 0);
  const longForm = evaluateLongFormStability(
    getBaselineFixture("gothic-thriller").config,
    buildLongFormSimulationCorpus(getBaselineFixture("gothic-thriller").config, 15),
  );

  const risks: string[] = [];
  if (!suite.allPass) risks.push("One or more genre baselines below v1 threshold");
  if (!suite.weakBeatsStrong) risks.push("Weak samples score too close to strong samples");
  if (!longForm.stable) risks.push(...longForm.issues);

  let level: NarrativeReadinessLevel = "unstable";
  if (suite.allPass && suite.weakBeatsStrong && cross.stable && longForm.stable) {
    level = getGreatnessMode() === "active" ? "stable" : "frozen";
  } else if (suite.allPass && suite.weakBeatsStrong) {
    level = "stable";
  } else if (suite.weakBeatsStrong) {
    level = "at-risk";
  }

  return {
    level,
    baselineTag: NARRATIVE_BASELINE_V1_TAG,
    greatnessMode: getGreatnessMode(),
    regressionPass: suite.allPass && suite.weakBeatsStrong,
    crossGenreStable: cross.stable,
    longFormStable: longForm.stable,
    risks,
  };
}

export {
  getGreatnessMode,
  isGreatnessDiagnosticsEnabled,
  isGreatnessPromptActive,
  setGreatnessMode,
  type GreatnessMode,
};
export { BASELINE_GENRE_FIXTURES, getBaselineFixture } from "./fixtures";
export { scoreNarrativeBaseline, buildBaselineSnapshot } from "./baseline-scorer";
export { NARRATIVE_BASELINE_V1_TAG, NARRATIVE_BASELINE_V1_THRESHOLDS, meetsBaselineV1 } from "./baseline-v1";
export { buildCrossGenreProtectionBlock, validateCrossGenreStability } from "./cross-genre-guard";
export { detectOverOptimization, buildOverOptimizationGuardBlock } from "./over-optimization-guard";
export { evaluateLongFormStability, buildLongFormSimulationCorpus, evaluateProjectLongFormStability } from "./long-form-stability";
