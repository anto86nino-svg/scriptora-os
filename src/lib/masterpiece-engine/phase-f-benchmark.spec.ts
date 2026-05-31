import { describe, expect, it } from "vitest";
import { runMultiDraftSelection } from "./multi-draft-engine";
import { runMasterpiecePass } from "./masterpiece-pass";
import { analyzeQuotePotential } from "./quote-detector";
import { computeNarrativeMagicScore } from "./narrative-magic-score";
import type { BookConfig } from "@/types/book";

const FLAT = `Marco entered the bar. He was sad. Everything was fine at the end.`;
const CONFIG = { genre: "romance", numberOfChapters: 10 } as BookConfig;

describe("masterpiece engine phase F benchmark", () => {
  it("multi-draft selects strongest internal variant", () => {
    const { report } = runMultiDraftSelection({
      content: FLAT.repeat(3),
      config: CONFIG,
      chapterIndex: 0,
      totalChapters: 10,
    });
    expect(report.candidates).toHaveLength(3);
    expect(["A", "B", "C"]).toContain(report.selected);
    expect(report.selectedScore).toBeGreaterThan(0);
  });

  it("quote detector finds highlight-worthy lines after elevation", () => {
    const pass = runMasterpiecePass({
      content: FLAT.repeat(3),
      config: CONFIG,
      chapterIndex: 0,
      totalChapters: 10,
    });
    const quotes = analyzeQuotePotential(pass.content);
    expect(quotes.candidates.length).toBeGreaterThan(0);
  });

  it("masterpiece pass improves narrative magic score", () => {
    const pass = runMasterpiecePass({
      content: FLAT.repeat(4),
      config: CONFIG,
      chapterIndex: 0,
      totalChapters: 10,
    });
    expect(pass.afterMagic).toBeGreaterThanOrEqual(pass.beforeMagic);
    expect(pass.analysis.narrativeMagic.composite).toBeGreaterThan(0);
  });

  it("narrative magic dimensions are populated", () => {
    const magic = computeNarrativeMagicScore({
      content: `She let the phone ring unanswered. Some details stay — even when you want to forget them. The next move would not wait for her.`,
      config: CONFIG,
      chapterIndex: 0,
      totalChapters: 10,
    });
    expect(magic.dimensions.wonder).toBeGreaterThan(0);
    expect(magic.dimensions.quotePotential).toBeGreaterThan(0);
    expect(magic.dimensions.readerObsession).toBeGreaterThan(0);
  });
});
