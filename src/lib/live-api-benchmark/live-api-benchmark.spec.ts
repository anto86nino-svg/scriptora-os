import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildFairPromptBundle,
  buildLiveTestMatrix,
  LIVE_TEST_MATRIX_STATS,
  readLiveBenchmarkEnv,
  runLiveApiBenchmark,
} from "./index";

describe("Live API Benchmark Harness — Real Author Pass", () => {
  it("builds fair comparison prompts (Scriptora stack vs neutral competitor)", () => {
    const matrix = buildLiveTestMatrix({ smoke: true });
    expect(matrix.length).toBe(LIVE_TEST_MATRIX_STATS.categories);

    const prompts = buildFairPromptBundle({
      project: matrix[0],
      chapterIndex: 0,
      previousChapters: [],
      smoke: true,
    });

    expect(prompts.userPrompt).toContain("CHAPTER GOAL");
    expect(prompts.competitorSystemPrompt.length).toBeLessThan(500);
    expect(prompts.scriptoraSystemPrompt.length).toBeGreaterThan(prompts.competitorSystemPrompt.length * 3);
    expect(prompts.scriptoraSystemPrompt).toMatch(/SCRIPTORA|NARRATIVE MEMORY|BOOK INTELLIGENCE/i);
  });

  it("builds full test matrix with minimum 3 projects per category", () => {
    const matrix = buildLiveTestMatrix({ projectsPerCategory: 3, smoke: false });
    expect(matrix.length).toBe(LIVE_TEST_MATRIX_STATS.categories * 3);
  });

  it("writes REAL AUTHOR PASS REPORT (live or blocked)", async () => {
    const env = readLiveBenchmarkEnv();
    const report = await runLiveApiBenchmark({ smoke: true, useCache: true });

    const outputDir = resolve(process.cwd(), "benchmark-logs");
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(resolve(outputDir, "scriptora-real-author-pass-report.json"), JSON.stringify(report, null, 2), "utf8");
    writeFileSync(resolve(outputDir, "scriptora-real-author-pass-report.md"), report.markdown, "utf8");

    expect(report.markdown).toContain("Scriptora Real Author Pass Report");
    expect(report.ctoVerdict.length).toBeGreaterThan(20);

    if (!env.ready) {
      expect(report.mode).toBe("offline-blocked");
      expect(report.overallScore).toBe(0);
      console.warn("LIVE API BENCHMARK BLOCKED:", report.failurePoints[0]);
      return;
    }

    expect(report.mode).toBe("live");
    expect(report.projectsTested).toBeGreaterThanOrEqual(7);
    expect(report.blindResults.length).toBeGreaterThan(0);
    expect(report.longBook.length).toBe(3);

    if (!report.measurablySuperiorLongForm) {
      console.warn("REAL AUTHOR PASS: Superiority not proven —", report.failurePoints.join("; "));
    }
  }, 900_000);
});
