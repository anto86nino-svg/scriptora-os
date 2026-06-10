import { describe, expect, it } from "vitest";
import type { BookProject } from "@/types/book";
import {
  assertProjectReadyForGeneration,
  buildEditorialChapterPreview,
  ProjectGenerationBlockedError,
  sanitizeEditorialSummary,
  validateProjectGenerationReadiness,
} from "./project-generation-readiness";
import { resolveChapterTitle } from "./chapter-titles";

function baseProject(overrides: Partial<BookProject> = {}): BookProject {
  return {
    id: "p1",
    config: {
      title: "Il libro",
      subtitle: "",
      tone: "calm",
      authorStyle: "narrative",
      language: "Italian",
      genre: "romance",
      category: "Fiction",
      subcategory: "Romance",
      chapterLength: "medium",
      bookLength: "medium",
      numberOfChapters: 2,
      subchaptersEnabled: false,
    },
    blueprint: {
      overview: "Overview",
      themes: ["amore"],
      emotionalArc: "crescita",
      chapterOutlines: [
        { title: "L'incontro", summary: "Due protagonisti si incontrano in una sera di pioggia a Milano." },
        { title: "La scelta", summary: "Una decisione difficile mette alla prova il legame appena nato." },
      ],
    },
    frontMatter: null,
    chapters: [],
    backMatter: null,
    phase: "chapters",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("project generation readiness", () => {
  it("blocks when genre or blueprint are missing", () => {
    const issues = validateProjectGenerationReadiness(baseProject({
      config: { ...baseProject().config, genre: "" as any, language: "" as any },
      blueprint: null,
    }));
    expect(issues.some((issue) => issue.id === "genre")).toBe(true);
    expect(issues.some((issue) => issue.id === "language")).toBe(true);
    expect(issues.some((issue) => issue.id === "blueprint")).toBe(true);
  });

  it("throws ProjectGenerationBlockedError for weak blueprint", () => {
    expect(() => assertProjectReadyForGeneration(baseProject({
      blueprint: {
        overview: "x",
        themes: ["y"],
        emotionalArc: "z",
        chapterOutlines: [
          { title: "To", summary: "To be generated" },
          { title: "Cap 2", summary: "To be generated" },
        ],
      },
    }), 0)).toThrow(ProjectGenerationBlockedError);
  });

  it("sanitizes technical summaries and previews", () => {
    const clean = sanitizeEditorialSummary("To be generated", 0, "Italian");
    expect(clean).toContain("capitolo 1");
    expect(buildEditorialChapterPreview("To be generated", 0, "Italian")).not.toMatch(/to be generated/i);
  });

  it("rejects placeholder chapter titles like To", () => {
    const title = resolveChapterTitle("To", 0, {
      language: "Italian",
      summary: "Due protagonisti si incontrano in una sera di pioggia.",
    });
    expect(title.toLowerCase()).not.toBe("to");
    expect(title.length).toBeGreaterThan(2);
  });
});
