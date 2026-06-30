import { describe, expect, it } from "vitest";
import {
  applyNarrativeCleanupPass,
  applyNarrativeCleanupToChapter,
  detectNarrativeCorruption,
} from "./narrative-cleanup-pass";

const BEACH_ROMANCE_CONTEXT = {
  language: "Italian",
  genre: "romance",
  chapterTitle: "Sulla spiaggia al tramonto",
  settingKeywords: ["spiaggia", "mare", "sabbia"],
};

describe("narrative-cleanup-pass", () => {
  it("detects user-reported corruption patterns", () => {
    const sample = [
      "Perché Non rispose. Non subito..",
      "La poluzione le pizzico la gola.",
      "Ma Le mani non trovarono nulla da fare..",
      "La cattedrale cadeva a pezzi.",
    ].join(" ");

    const issues = detectNarrativeCorruption(sample, BEACH_ROMANCE_CONTEXT);
    expect(issues.some((i) => i.kind === "broken_sentence_start" || i.kind === "mid_sentence_capital")).toBe(true);
    expect(issues.some((i) => i.kind === "double_punctuation")).toBe(true);
    expect(issues.some((i) => i.kind === "nonsense_fragment" || i.kind === "typo_artifact")).toBe(true);
    expect(issues.some((i) => i.kind === "out_of_context")).toBe(true);
  });

  it("fixes broken starts, typos, double punctuation, and duplicate clichés", () => {
    const input = [
      "Sulla sabbia calda camminarono in silenzio.",
      "Perché Non rispose. Non subito..",
      "La poluzione le pizzico la gola.",
      "Le mani non trovarono nulla da fare.",
      "Ma Le mani non trovarono nulla da fare..",
      "La cattedrale cadeva a pezzi.",
    ].join(" ");

    const cleaned = applyNarrativeCleanupPass(input, BEACH_ROMANCE_CONTEXT);
    expect(cleaned.text).toContain("Perché non rispose");
    expect(cleaned.text).not.toMatch(/Non subito\.\./);
    expect(cleaned.text).toContain("pizzicò la gola");
    expect(cleaned.text).not.toContain("La cattedrale cadeva a pezzi");
    expect((cleaned.text.match(/Le mani non trovarono nulla da fare/gi) || []).length).toBeLessThanOrEqual(1);
    expect(cleaned.fixesApplied).toBeGreaterThan(0);
  });

  it("cleans all subchapters when applied to chapter", () => {
    const chapter = applyNarrativeCleanupToChapter(
      {
        title: "Capitolo 4",
        content: "",
        subchapters: [
          { title: "4.1", content: "Perché Non rispose. Non subito.." },
          { title: "4.2", content: "La cattedrale cadeva a pezzi. Sul mare la brezza era tiepida." },
        ],
      },
      BEACH_ROMANCE_CONTEXT,
    );

    expect(chapter.subchapters?.[0]?.content).toContain("Perché non rispose");
    expect(chapter.content).not.toContain("La cattedrale cadeva a pezzi");
    expect(chapter.content).toContain("Sul mare");
  });
});
