import { describe, expect, it } from "vitest";
import { getExportBlockers } from "./export-readiness";
import { isPlaceholderExportAuthor } from "./export-author";
import type { BookProject } from "@/types/book";

function mockCompleteProject(authorName = ""): BookProject {
  return {
    id: "test-project",
    config: {
      title: "Romance Test",
      language: "Italian",
      numberOfChapters: 2,
      authorName,
      genre: "romance",
      subcategory: "Contemporary",
      tone: "warm",
      chapterLength: "medium",
      bookLength: "short",
    } as BookProject["config"],
    blueprint: {
      overview: "Overview",
      emotionalArc: "Arc",
      themes: ["love"],
      chapterOutlines: [
        { title: "Cap 1", summary: "Valid summary with enough detail." },
        { title: "Cap 2", summary: "Second valid summary with detail." },
      ],
    },
    chapters: [
      { title: "Cap 1", content: "word ".repeat(80), status: "done", subchapters: [] },
      { title: "Cap 2", content: "word ".repeat(80), status: "done", subchapters: [] },
    ],
    frontMatter: {
      titlePage: "Romance Test",
      copyright: "Copyright 2026",
      dedication: "",
      aboutAuthor: "Bio",
      howToUse: "Guide",
      letterToReader: "Letter",
    },
    backMatter: {
      conclusion: "Fine",
      authorNote: "Note",
      callToAction: "CTA",
      reviewRequest: "Review",
      otherBooks: "",
    },
    phase: "complete",
    messages: [],
    updatedAt: new Date().toISOString(),
  };
}

describe("export-readiness trust gate", () => {
  it("blocks export when author is placeholder or missing", () => {
    expect(isPlaceholderExportAuthor("Antonino Campanella")).toBe(true);
    const blockers = getExportBlockers(mockCompleteProject(""));
    expect(blockers.some((b) => b.id === "author")).toBe(true);
  });

  it("allows export when author and manuscript are valid", () => {
    const blockers = getExportBlockers(mockCompleteProject("Livia Noir"));
    expect(blockers).toHaveLength(0);
  });

  it("does not block chapter-only blueprints because of legacy subchapter config", () => {
    const project = mockCompleteProject("Livia Noir");
    project.config.subchaptersEnabled = true;
    project.config.subchaptersPerChapter = 3;

    const blockers = getExportBlockers(project);

    expect(blockers.some((b) => b.id === "subchapters")).toBe(false);
    expect(blockers).toHaveLength(0);
  });

  it("blocks only when the active blueprint really requires missing subchapters", () => {
    const project = mockCompleteProject("Livia Noir");
    project.config.subchaptersEnabled = false;
    project.blueprint!.chapterOutlines = project.blueprint!.chapterOutlines.map((outline) => ({
      ...outline,
      subchapters: [
        { title: "Scena A", summary: "Primo beat narrativo." },
        { title: "Scena B", summary: "Secondo beat narrativo." },
      ],
    }));
    project.chapters[0].subchapters = [{ title: "Scena A", content: "word ".repeat(80) }];
    project.chapters[1].subchapters = [
      { title: "Scena A", content: "word ".repeat(80) },
      { title: "Scena B", content: "word ".repeat(80) },
    ];

    const blockers = getExportBlockers(project);

    expect(blockers.some((b) => b.id === "subchapters")).toBe(true);

    project.chapters[0].subchapters.push({ title: "Scena B", content: "word ".repeat(80) });
    expect(getExportBlockers(project)).toHaveLength(0);
  });
});
