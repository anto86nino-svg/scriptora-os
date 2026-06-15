import { describe, expect, it } from "vitest";
import {
  getBookStructureTruth,
  getMissingActiveSubchapterRefs,
  isNarrativeFictionProject,
  isStructuralSubchapterProject,
  shouldRequireStructuralSubchapters,
} from "./book-structure-truth";

const content = "testo ".repeat(90);

function blueprintWithSubs(count = 2) {
  return {
    chapterOutlines: [
      {
        title: "Cap 1",
        summary: "Una scena narrativa completa.",
        subchapters: Array.from({ length: count }, (_, index) => ({
          title: `Scena ${index + 1}`,
          summary: `Beat narrativo ${index + 1}`,
        })),
      },
    ],
  };
}

describe("book structure truth — fiction export subchapter blocker", () => {
  it("does not require structural subchapters for dark romance fiction even when blueprint contains subchapters", () => {
    const project: any = {
      config: {
        title: "Salvezza Pericolosa",
        genre: "Dark Romance",
        category: "Fiction",
        niche: "small town",
        numberOfChapters: 1,
        subchaptersEnabled: true,
        subchaptersPerChapter: 3,
      },
      blueprint: blueprintWithSubs(3),
      chapters: [{ title: "Cap 1", content, subchapters: [], status: "completed" }],
    };

    expect(isNarrativeFictionProject(project)).toBe(true);
    expect(shouldRequireStructuralSubchapters(project)).toBe(false);
    expect(getMissingActiveSubchapterRefs(project)).toEqual([]);

    const truth = getBookStructureTruth(project);
    expect(truth.blueprintHasSubchapters).toBe(true);
    expect(truth.diagnostics.join(" ")).toMatch(/export consentito/i);
  });

  it("keeps structural subchapters mandatory for educational/manual projects", () => {
    const project: any = {
      config: {
        title: "Manuale di Studio",
        genre: "Manuale",
        category: "Educational",
        bookType: "study",
        numberOfChapters: 1,
        subchaptersEnabled: true,
        subchaptersPerChapter: 2,
      },
      blueprint: blueprintWithSubs(2),
      chapters: [{ title: "Cap 1", content, subchapters: [], status: "completed" }],
    };

    expect(isStructuralSubchapterProject(project)).toBe(true);
    expect(shouldRequireStructuralSubchapters(project)).toBe(true);
    expect(getMissingActiveSubchapterRefs(project)).toEqual([
      { chapterIndex: 0, subIndex: 0 },
      { chapterIndex: 0, subIndex: 1 },
    ]);
  });

  it("does not let the word nonfiction be misread as fiction", () => {
    const project: any = {
      config: {
        title: "Business Nonfiction",
        genre: "Nonfiction",
        category: "Business",
        numberOfChapters: 1,
        subchaptersEnabled: true,
        subchaptersPerChapter: 2,
      },
      blueprint: blueprintWithSubs(2),
      chapters: [{ title: "Cap 1", content, subchapters: [], status: "completed" }],
    };

    expect(isNarrativeFictionProject(project)).toBe(false);
    expect(isStructuralSubchapterProject(project)).toBe(true);
    expect(shouldRequireStructuralSubchapters(project)).toBe(true);
  });
});
