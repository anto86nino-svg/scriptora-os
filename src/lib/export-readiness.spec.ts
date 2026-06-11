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
});
