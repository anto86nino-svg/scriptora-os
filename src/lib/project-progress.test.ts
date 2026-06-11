import { describe, expect, it } from "vitest";
import { computeProjectProgressPercent, areChaptersComplete } from "./project-progress";
import { isProjectComplete } from "./project-status";
import type { BookProject } from "@/types/book";

function baseProject(overrides: Partial<BookProject> = {}): BookProject {
  return {
    id: "p1",
    config: {
      title: "Test",
      genre: "thriller",
      language: "Italian",
      numberOfChapters: 2,
      matterOptions: {
        frontMatterEnabled: true,
        backMatterEnabled: false,
        acknowledgmentsEnabled: true,
        ctaEnabled: true,
        bibliographyEnabled: false,
      },
    } as BookProject["config"],
    blueprint: { overview: "o", themes: [], emotionalArc: "a", chapterOutlines: [{ title: "1", summary: "s" }, { title: "2", summary: "s" }] },
    frontMatter: { titlePage: "t", copyright: "c", dedication: "", aboutAuthor: "a", howToUse: "h", letterToReader: "l" },
    chapters: [
      { title: "1", content: "word ".repeat(60), subchapters: [] },
      { title: "2", content: "word ".repeat(60), subchapters: [] },
    ],
    backMatter: null,
    frontMatterStatus: undefined,
    phase: "chapters",
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("project-progress", () => {
  it("counts progress with matter options", () => {
    const p = baseProject();
    expect(computeProjectProgressPercent(p)).toBe(100);
    expect(isProjectComplete(p)).toBe(true);
  });

  it("requires front matter when enabled", () => {
    const p = baseProject({ frontMatter: null });
    expect(areChaptersComplete(p)).toBe(true);
    expect(isProjectComplete(p)).toBe(false);
    expect(computeProjectProgressPercent(p)).toBeLessThan(100);
  });

  it("skips back matter when disabled", () => {
    const p = baseProject({ phase: "complete" });
    expect(isProjectComplete(p)).toBe(true);
  });
});
