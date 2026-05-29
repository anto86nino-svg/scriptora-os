import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { runSurgicalEditHardeningSuite, summarizeSurgicalHardening } from "./hardening-suite";

describe("Surgical Edit Engine V1 — Hardening Suite", () => {
  it("passes action, voice, genre, and patch validation checks", () => {
    const results = runSurgicalEditHardeningSuite();
    const summary = summarizeSurgicalHardening(results);

    const outputDir = resolve(process.cwd(), "benchmark-logs");
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(
      resolve(outputDir, "scriptora-surgical-edit-engine-v1-hardening.json"),
      JSON.stringify({ summary, results }, null, 2),
      "utf8",
    );

    expect(summary.failedAssertions).toBe(0);
    expect(summary.passed).toBe(true);
    expect(results.length).toBe(4);
  });
});
