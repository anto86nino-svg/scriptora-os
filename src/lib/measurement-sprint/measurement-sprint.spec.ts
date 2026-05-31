import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { runMeasurementSprint } from "./run-measurement-sprint";

const LOG_DIR = path.resolve(process.cwd(), "benchmark-logs");

describe("Scriptora Measurement Sprint — 2 week validation program", () => {
  it("runs all 10 pillars and produces weakness discovery report", () => {
    const report = runMeasurementSprint();

    expect(report.realBookBenchmark.length).toBeGreaterThanOrEqual(30);
    expect(report.blindTest.total).toBeGreaterThanOrEqual(30);
    expect(report.bestsellerComparison.length).toBe(7);
    expect(report.readerRetention.length).toBeGreaterThan(0);
    expect(report.editorialExpert.length).toBeGreaterThan(0);
    expect(report.genreStress).toHaveLength(4);
    expect(report.genreStress.map(g => g.genre)).toEqual(
      expect.arrayContaining(["romance", "thriller", "fantasy", "self-help"]),
    );
    expect(report.weaknesses.length).toBeGreaterThanOrEqual(0);
    if (report.weaknesses.length > 0) {
      expect(report.weaknessSummary.topAreas.length).toBeGreaterThan(0);
    }
    expect(report.markdown).toContain("Weakness Discovery Report");

    fs.mkdirSync(LOG_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const jsonPath = path.join(LOG_DIR, `measurement-sprint-${stamp}.json`);
    const mdPath = path.join(LOG_DIR, "measurement-sprint-report.md");
    const weaknessesPath = path.join(LOG_DIR, "weakness-discovery-report.md");

    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");
    fs.writeFileSync(mdPath, report.markdown, "utf8");
    fs.writeFileSync(
      weaknessesPath,
      report.markdown.split("## Top weaknesses")[1]
        ? `# Weakness Discovery\n\n${report.markdown.split("## Top weaknesses")[1]}`
        : report.markdown,
      "utf8",
    );

    // eslint-disable-next-line no-console
    console.log("\n" + report.markdown.slice(0, 2800));
    // eslint-disable-next-line no-console
    console.log(`\nWeaknesses found: ${report.weaknesses.length} (critical: ${report.weaknessSummary.critical})`);
    // eslint-disable-next-line no-console
    console.log(`Report: ${mdPath}`);
  }, 300_000);
});
