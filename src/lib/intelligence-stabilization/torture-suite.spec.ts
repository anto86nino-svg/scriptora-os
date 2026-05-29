import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { runFullTortureSuite } from "./torture-suite";
import { buildIntelligenceWeaknessReport, formatWeaknessReportMarkdown } from "./confidence-report";

describe("Intelligence Stabilization Sprint — Torture Suite", () => {
  it("runs full benchmark suite and produces weakness report", () => {
    const results = runFullTortureSuite();
    const report = buildIntelligenceWeaknessReport(results);

    const outputDir = resolve(process.cwd(), "benchmark-logs");
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(
      resolve(outputDir, "intelligence-weakness-report.json"),
      JSON.stringify({ report, results }, null, 2),
      "utf8",
    );
    writeFileSync(
      resolve(outputDir, "intelligence-weakness-report.md"),
      formatWeaknessReportMarkdown(report),
      "utf8",
    );

    expect(results.length).toBe(11);
    expect(report.overallReliabilityScore).toBeGreaterThanOrEqual(50);

    const failed = results.filter(r => !r.passed);
    if (failed.length) {
      const details = failed
        .map(f => `${f.label}: ${f.assertions.filter(a => !a.passed).map(a => a.message).join("; ")}`)
        .join("\n");
      console.warn(`Torture suite failures (${failed.length}):\n${details}`);
    }

    expect(report.failedBenchmarks).toBeLessThanOrEqual(3);
    expect(report.overallReliabilityScore).toBeGreaterThanOrEqual(70);
  });
});
