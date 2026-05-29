import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { runAuthorBrainHardeningSuite, summarizeAuthorBrainHardening } from "./hardening-suite";

describe("Author Brain V6 — Hardening Suite", () => {
  it("passes signal, isolation, export, and guardrail checks", () => {
    const results = runAuthorBrainHardeningSuite();
    const summary = summarizeAuthorBrainHardening(results);

    const outputDir = resolve(process.cwd(), "benchmark-logs");
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(
      resolve(outputDir, "scriptora-author-brain-v6-hardening.json"),
      JSON.stringify({ summary, results }, null, 2),
      "utf8",
    );

    const failed = results.filter((r) => !r.passed);
    if (failed.length) {
      const details = failed
        .map((f) => `${f.label}: ${f.assertions.filter((a) => !a.passed).map((a) => a.message).join("; ")}`)
        .join("\n");
      console.warn(`Author Brain hardening failures (${failed.length}):\n${details}`);
    }

    expect(summary.failedAssertions).toBe(0);
    expect(summary.passed).toBe(true);
    expect(results.length).toBe(5);
  });
});
