import { describe, expect, it } from "vitest";
import {
  assessNarrativeReadiness,
  BASELINE_GENRE_FIXTURES,
  buildBaselineSnapshot,
  computeBaselineScoreboard,
  detectOverOptimization,
  evaluateLongFormStability,
  buildLongFormSimulationCorpus,
  getBaselineFixture,
  getGreatnessMode,
  isGreatnessPromptActive,
  meetsBaselineV1,
  NARRATIVE_BASELINE_V1_TAG,
  runBaselineRegressionSuite,
  scoreNarrativeBaseline,
  validateCrossGenreStability,
} from "@/lib/narrative-baseline-lock";
import { buildGreatnessEngineBlock } from "@/lib/greatness-engine";
import { buildPremiumWritingBlock } from "@/lib/premium-writing";

describe("Narrative Baseline Lock V1", () => {
  it("defaults greatness to passive safe mode", () => {
    expect(getGreatnessMode()).toBe("passive");
    expect(isGreatnessPromptActive()).toBe(false);
  });

  it("does not inject greatness prompts in passive mode", () => {
    const block = buildGreatnessEngineBlock({
      config: getBaselineFixture("gothic-thriller").config,
      previousChapters: [],
      chapterIndex: 0,
    });
    expect(block).toBe("");
  });

  it("runs cross-genre regression suite for 8 genres", () => {
    const suite = runBaselineRegressionSuite();
    const failures = BASELINE_GENRE_FIXTURES.map((fixture) => {
      const strong = suite.snapshots.find((s) => s.genre === fixture.id)!.metrics.composite;
      const weak = scoreNarrativeBaseline(fixture.weakText, fixture.config).composite;
      return { genre: fixture.id, strong, weak, delta: strong - weak };
    }).filter((entry) => entry.delta < 2);

    expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
    expect(suite.snapshots).toHaveLength(8);
    expect(BASELINE_GENRE_FIXTURES.map((f) => f.id)).toEqual(suite.snapshots.map((s) => s.genre));
    expect(suite.weakBeatsStrong).toBe(true);
    expect(suite.allPass).toBe(true);
  });

  it("saves baseline score per genre above v1 thresholds", () => {
    const board = computeBaselineScoreboard();
    for (const fixture of BASELINE_GENRE_FIXTURES) {
      const snapshot = buildBaselineSnapshot(fixture.id, fixture.sampleText, fixture.config);
      expect(meetsBaselineV1(fixture.id, snapshot.metrics)).toBe(true);
      expect(board[fixture.id]).toBeGreaterThanOrEqual(snapshot.metrics.composite - 2);
    }
  });

  it("protects cross-genre stability when romance rules do not hurt thriller", () => {
    const board = computeBaselineScoreboard();
    const romanceBoost = { ...board, "romance-slow-burn": board["romance-slow-burn"] + 5 };
    const report = validateCrossGenreStability(romanceBoost, board, 8);
    expect(report.stable).toBe(true);
    expect(report.regressions).toHaveLength(0);
  });

  it("detects over-optimization cliffhanger spam", () => {
    const spam = `Tomorrow she would learn the truth. Before dawn someone would pay.
If she survived the night, tomorrow would hurt again. Before dawn the key would matter.
Tomorrow. Before dawn. If she survived.`;
    const report = detectOverOptimization(spam);
    expect(report.blocked).toBe(true);
    expect(report.findings.some((finding) => finding.id === "cliff-spam")).toBe(true);
  });

  it("simulates 15-chapter long-form stability", () => {
    const fixture = getBaselineFixture("gothic-thriller");
    const chapters = buildLongFormSimulationCorpus(fixture.config, 15);
    const report = evaluateLongFormStability(fixture.config, chapters);
    expect(report.chaptersSimulated).toBe(15);
    expect(report.stable).toBe(true);
  });

  it("injects baseline guards in premium writing without greatness active prompts", () => {
    const premium = buildPremiumWritingBlock({
      config: getBaselineFixture("thriller").config,
      previousChapters: [],
      chapterIndex: 1,
    });
    expect(premium).toContain("OVER-OPTIMIZATION GUARD");
    expect(premium).toContain("CROSS-GENRE STABILITY LOCK");
    expect(premium).not.toContain("SCRIPTORA GREATNESS ENGINE");
  });

  it("reports narrative readiness with baseline v1 tag", () => {
    const readiness = assessNarrativeReadiness();
    expect(readiness.baselineTag).toBe(NARRATIVE_BASELINE_V1_TAG);
    expect(readiness.greatnessMode).toBe("passive");
    expect(["frozen", "stable", "at-risk", "unstable"]).toContain(readiness.level);
    if (readiness.regressionPass) {
      expect(readiness.level).not.toBe("unstable");
    }
  });
});
