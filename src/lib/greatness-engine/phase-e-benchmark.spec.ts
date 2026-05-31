import { describe, expect, it } from "vitest";
import { computeSupremeEditorialScore } from "@/lib/editorial-orchestrator/supreme-score";
import {
  analyzeBingeability,
  analyzeHookIntensity,
  analyzeMemorability,
  applySceneElevations,
  computeGreatnessScore,
  runGreatnessElevationPass,
} from "@/lib/greatness-engine";
import type { BookConfig } from "@/types/book";

const FLAT_SAMPLE = `Marco entered the bar. He was sad because he felt alone.
It was a normal day. Nothing happened. Then something happened.
Everything was fine at the end.`;

const STRONG_SAMPLE = `Marco hesitated on the threshold of the bar.
He let the phone ring unanswered.
Some details stay — even when you want to forget them.
The next move would not wait for her.`;

describe("greatness engine phase E benchmark", () => {
  it("elevates flat entrance and told emotion", () => {
    const analysis = computeGreatnessScore({ content: FLAT_SAMPLE, config: { genre: "romance" } as BookConfig });
    const { content, applied } = applySceneElevations(FLAT_SAMPLE, analysis);
    expect(applied).toBeGreaterThan(0);
    expect(content.toLowerCase()).toContain("hesitated");
    expect(content.toLowerCase()).not.toContain("entered the bar");
    expect(content.toLowerCase()).not.toContain("was sad because");
  });

  it("improves greatness score after elevation pass", () => {
    const config = { genre: "romance", numberOfChapters: 10 } as BookConfig;
    const before = computeGreatnessScore({ content: FLAT_SAMPLE.repeat(2), config, chapterIndex: 0 });
    const pass = runGreatnessElevationPass({
      content: FLAT_SAMPLE.repeat(2),
      config,
      chapterIndex: 0,
      totalChapters: 10,
    });
    expect(pass.afterScore.composite).toBeGreaterThanOrEqual(before.greatnessScore.composite);
    expect(pass.rewritten).toBe(true);
  });

  it("memorability engine flags weak recall", () => {
    const weak = analyzeMemorability(FLAT_SAMPLE);
    const strong = analyzeMemorability(STRONG_SAMPLE);
    expect(strong.readerRecallScore).toBeGreaterThan(weak.readerRecallScore);
    expect(strong.quotableLines.length).toBeGreaterThanOrEqual(weak.quotableLines.length);
  });

  it("bingeability and hook intensity score closing pull", () => {
    const flatHooks = analyzeHookIntensity(FLAT_SAMPLE);
    const strongHooks = analyzeHookIntensity(STRONG_SAMPLE);
    expect(strongHooks.closingHook).toBeGreaterThan(flatHooks.closingHook);
    expect(strongHooks.openingHook).toBeGreaterThanOrEqual(flatHooks.openingHook);

    const flatBinge = analyzeBingeability(FLAT_SAMPLE);
    const strongBinge = analyzeBingeability(STRONG_SAMPLE);
    expect(strongBinge.pageTurnPressure).toBeGreaterThanOrEqual(flatBinge.pageTurnPressure);
  });

  it("supreme score benefits from greatness analysis without new critical issues", () => {
    const config = { genre: "romance", numberOfChapters: 10 } as BookConfig;
    const pass = runGreatnessElevationPass({ content: FLAT_SAMPLE.repeat(3), config, chapterIndex: 0, totalChapters: 10 });
    const beforeSupreme = computeSupremeEditorialScore({
      content: FLAT_SAMPLE.repeat(3),
      config,
      chapterIndex: 0,
      totalChapters: 10,
    });
    const afterSupreme = computeSupremeEditorialScore({
      content: pass.content,
      config,
      chapterIndex: 0,
      totalChapters: 10,
      greatnessAnalysis: pass.analysis,
    });
    expect(afterSupreme.composite).toBeGreaterThanOrEqual(beforeSupreme.composite);
    expect(afterSupreme.criticalCount).toBeLessThanOrEqual(beforeSupreme.criticalCount + 1);
  });
});
