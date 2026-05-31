import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { runScriptoraValidationSuite } from "./run-validation-suite";

const LOG_DIR = path.resolve(process.cwd(), "benchmark-logs");

describe("Scriptora Validation Suite — 40 capitoli × 4 generi", () => {
  it("confronta baseline pre A+B+C+D vs orchestrator corrente e produce report", () => {
    const report = runScriptoraValidationSuite();

    expect(report.baseline.chapters).toHaveLength(40);
    expect(report.current.chapters).toHaveLength(40);
    expect(report.baseline.genres).toHaveLength(4);
    expect(report.current.genres).toHaveLength(4);

    // Phase F targets: Supreme > 75, Greatness > 80, Narrative Magic > 75
    expect(report.current.totals.avgSupremeComposite).toBeGreaterThanOrEqual(75);
    expect(report.current.totals.avgGreatnessComposite).toBeGreaterThanOrEqual(80);
    expect(report.current.totals.avgNarrativeMagicComposite).toBeGreaterThanOrEqual(75);
    expect(report.improvements.greatnessCompositeDelta).toBeGreaterThan(0);
    expect(report.improvements.narrativeMagicCompositeDelta).toBeGreaterThan(0);
    expect(report.improvements.criticalIssuesDelta).toBeGreaterThanOrEqual(0);
    expect(report.current.totals.preDeliveryPassRate).toBeGreaterThanOrEqual(
      report.baseline.totals.preDeliveryPassRate,
    );

    fs.mkdirSync(LOG_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const jsonPath = path.join(LOG_DIR, `scriptora-validation-suite-${stamp}.json`);
    const mdPath = path.join(LOG_DIR, "scriptora-validation-suite-report.md");

    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");
    fs.writeFileSync(mdPath, report.markdown, "utf8");

    // eslint-disable-next-line no-console
    console.log("\n" + report.markdown);
    // eslint-disable-next-line no-console
    console.log(`\nReport JSON: ${jsonPath}`);
    // eslint-disable-next-line no-console
    console.log(`Report MD: ${mdPath}`);
  }, 120_000);
});
