import { describe, expect, it } from "vitest";
import type { BookProject } from "@/types/book";
import { resolveInitialExportProjectId } from "./HomeExportDialog";

function project(id: string, complete = true): BookProject {
  return {
    id,
    config: {
      title: id,
      subtitle: "",
      tone: "cinematic",
      authorStyle: "clean",
      language: "Italian",
      genre: "romance",
      category: "Fiction",
      subcategory: "Romance",
      chapterLength: "medium",
      bookLength: "short",
      numberOfChapters: 1,
      subchaptersEnabled: false,
      matterOptions: {
        frontMatterEnabled: false,
        backMatterEnabled: false,
        acknowledgmentsEnabled: false,
        ctaEnabled: false,
        bibliographyEnabled: false,
      },
    },
    blueprint: {
      overview: "Overview",
      themes: ["tema"],
      emotionalArc: "Arc",
      chapterOutlines: [{ title: "Capitolo", summary: "Una sintesi abbastanza solida." }],
    },
    chapters: complete
      ? [{ title: "Capitolo", content: "testo ".repeat(80), subchapters: [], status: "completed" }]
      : [],
    frontMatter: null,
    backMatter: null,
    phase: complete ? "complete" : "chapters",
    createdAt: "2026-06-15T00:00:00.000Z",
    updatedAt: "2026-06-15T00:00:00.000Z",
  };
}

describe("HomeExportDialog project selection", () => {
  it("prefers the project passed by the calling flow when it is export-ready", () => {
    expect(resolveInitialExportProjectId([project("a"), project("b")], "", "b")).toBe("b");
  });

  it("falls back to the current selection, then the first ready project", () => {
    expect(resolveInitialExportProjectId([project("a"), project("b")], "b", "missing")).toBe("b");
    expect(resolveInitialExportProjectId([project("a"), project("b")], "", "missing")).toBe("a");
  });

  it("does not select incomplete projects", () => {
    expect(resolveInitialExportProjectId([project("draft", false), project("ready")], "", "draft")).toBe("ready");
  });
});
