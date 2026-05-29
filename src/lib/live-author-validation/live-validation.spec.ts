import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { runLiveAuthorValidation } from "./validation-runner";
import { buildRealWorldBenchmarkCorpus, REAL_WORLD_BENCHMARK_STATS } from "./corpus/real-world-projects";

describe("Live Author Validation Sprint", () => {
  it("runs full real-world benchmark and writes LIVE VALIDATION REPORT", () => {
    const corpus = buildRealWorldBenchmarkCorpus();
    expect(corpus.length).toBe(REAL_WORLD_BENCHMARK_STATS.totalProjects);

    const { report, markdown } = runLiveAuthorValidation({ longBookChapters: 28 });

    const outputDir = resolve(process.cwd(), "benchmark-logs");
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(resolve(outputDir, "scriptora-live-validation-report.json"), JSON.stringify(report, null, 2), "utf8");
    writeFileSync(resolve(outputDir, "scriptora-live-validation-report.md"), markdown, "utf8");

    expect(report.overallScore).toBeGreaterThanOrEqual(50);
    expect(report.vsChatGPT.avgMargin).toBeGreaterThan(0);
    expect(report.longBook.totalChapters).toBeGreaterThanOrEqual(20);
    expect(report.ctoVerdict.length).toBeGreaterThan(40);

    if (!report.measurablyBetterThanGenericAI) {
      console.warn("LIVE VALIDATION: Not yet measurably better than generic AI offline");
    }
    if (report.failurePoints.length) {
      console.warn("Failure points:", report.failurePoints.join("; "));
    }

    expect(report.vsChatGPT.winRate).toBeGreaterThanOrEqual(55);
    expect(report.longBook.passed).toBe(true);
  });
});
