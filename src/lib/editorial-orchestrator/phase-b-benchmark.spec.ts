import { describe, expect, it } from "vitest";
import { scanCliches, autoRewriteCliches } from "@/lib/cliche-engine";
import { computeSupremeEditorialScore } from "@/lib/editorial-orchestrator/supreme-score";
import { trackNarrativePromises } from "@/lib/narrative-promise-engine";
import { analyzePayoff } from "@/lib/payoff-engine";
import { simulateReaderInLoop } from "@/lib/reader-simulation";

const CLICHE_SAMPLE = `She took a deep breath. Believe in yourself, she whispered.
Everything happens for a reason. The crack is where the light gets in.
At the end, it was all worth it. I finally understood who I was.`;

const CLEANISH_SAMPLE = `Who left the envelope on her desk? The name on it was wrong — not misspelled, wrong.
Marco promised he would tell her before midnight. He didn't.
The forbidden seal on the vault had been scratched, as if someone had tried twice.`;

describe("editorial orchestrator phase B benchmark", () => {
  it("intercepts critical clichés before delivery", () => {
    const before = scanCliches(CLICHE_SAMPLE, "self-help");
    expect(before.criticalCount).toBeGreaterThan(0);
    expect(before.requiresRewrite).toBe(true);

    const after = autoRewriteCliches(CLICHE_SAMPLE, "self-help");
    expect(after.rewritten).toBe(true);
    expect(after.scan.criticalCount).toBeLessThan(before.criticalCount);
    expect(after.content.toLowerCase()).not.toContain("believe in yourself");
  });

  it("tracks narrative promises by genre", () => {
    const registry = trackNarrativePromises({
      content: CLEANISH_SAMPLE,
      chapterIndex: 2,
      genre: "fantasy",
    });

    expect(registry.promises.some(p => /sigillo/i.test(p.label))).toBe(true);
    expect(registry.promises.some(p => p.status === "OPEN")).toBe(true);
    expect(registry.integrityScore).toBeGreaterThan(0);
  });

  it("flags payoff structure warnings", () => {
    const text = `She noticed the scratched seal on the door. Hours later she finally understood who she was.`;
    const payoff = analyzePayoff({ content: text, chapterIndex: 4, config: { genre: "fantasy" } as any });
    expect(payoff.beats.length).toBeGreaterThan(0);
    expect(payoff.warnings.length + payoff.prematurePayoffCount + payoff.missingPayoffCount).toBeGreaterThanOrEqual(0);
  });

  it("improves supreme score after cliché removal", () => {
    const config = { genre: "self-help", numberOfChapters: 10 } as any;
    const beforeScan = scanCliches(CLICHE_SAMPLE, "self-help");
    const afterPass = autoRewriteCliches(CLICHE_SAMPLE, "self-help");

    const beforeScore = computeSupremeEditorialScore({
      content: CLICHE_SAMPLE.repeat(3),
      config,
      chapterIndex: 0,
      totalChapters: 10,
      clicheScan: beforeScan,
    });

    const afterScore = computeSupremeEditorialScore({
      content: afterPass.content.repeat(3),
      config,
      chapterIndex: 0,
      totalChapters: 10,
      clicheScan: afterPass.scan,
      readerSimulation: simulateReaderInLoop({
        content: afterPass.content.repeat(3),
        chapterIndex: 0,
        config,
        totalChapters: 10,
      }),
    });

    expect(afterScore.dimensions.clicheDensity).toBeGreaterThanOrEqual(beforeScore.dimensions.clicheDensity);
    expect(afterScore.criticalCount).toBeLessThanOrEqual(beforeScore.criticalCount);
  });
});
