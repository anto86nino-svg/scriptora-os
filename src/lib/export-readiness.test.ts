import { describe, expect, it } from "vitest";
import { analyzeExportReadiness } from "./export-readiness";
import type { BookProject } from "@/types/book";

function baseProject(overrides: Partial<BookProject> = {}): BookProject {
  return {
    id: "p1",
    config: {
      title: "Roma",
      subtitle: "Breve storia",
      genre: "historical",
      category: "History",
      subcategory: "Ancient",
      language: "Italian",
      tone: "direct",
      bookLength: "short",
      chapterLength: "medium",
      numberOfChapters: 2,
      subchaptersEnabled: false,
      authorName: "Test",
      author: "Test",
      writerName: "Test",
    },
    blueprint: {
      overview: "Overview",
      themes: ["Tema"],
      emotionalArc: "Arc",
      chapterOutlines: [
        { title: "Cap 1", summary: "Summary 1" },
        { title: "Cap 2", summary: "Summary 2" },
      ],
    },
    chapters: [
      { title: "Cap 1", content: "x".repeat(80), subchapters: [], status: "completed" },
      { title: "Cap 2", content: "y".repeat(80), subchapters: [], status: "completed" },
    ],
    frontMatter: null,
    backMatter: null,
    phase: "complete",
    messages: [],
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as BookProject;
}

describe("export-readiness", () => {
  it("allows export when chapters are complete and subchapters are off", () => {
    const result = analyzeExportReadiness(baseProject(), { hasCover: true });
    expect(result.canExport).toBe(true);
    expect(result.blockers.some((i) => i.id.startsWith("missing-sub"))).toBe(false);
  });

  it("does not block export when subchapters enabled but blueprint has no sub plan", () => {
    const project = baseProject({
      config: {
        ...baseProject().config,
        subchaptersEnabled: true,
        subchaptersPerChapter: 2,
      },
    });
    const result = analyzeExportReadiness(project, { hasCover: true });
    expect(result.canExport).toBe(true);
    expect(result.blockers.some((i) => i.id.startsWith("missing-sub"))).toBe(false);
    expect(result.warnings.some((i) => i.id === "blueprint-missing-sub-structure")).toBe(true);
  });

  it("blocks export when blueprint plans subchapters but content is missing", () => {
    const project = baseProject({
      config: {
        ...baseProject().config,
        subchaptersEnabled: true,
        subchaptersPerChapter: 2,
      },
      blueprint: {
        overview: "Overview",
        themes: ["Tema"],
        emotionalArc: "Arc",
        chapterOutlines: [
          {
            title: "Cap 1",
            summary: "Summary 1",
            subchapters: [
              { title: "The Taste of Iron", summary: "Beat 1" },
              { title: "The Voice", summary: "Beat 2" },
            ],
          },
          { title: "Cap 2", summary: "Summary 2" },
        ],
      },
    });
    const result = analyzeExportReadiness(project, { hasCover: true });
    expect(result.canExport).toBe(false);
    expect(result.blockers.some((i) => i.id.startsWith("missing-sub"))).toBe(true);
  });

  it("treats missing cover as warning not blocker", () => {
    const result = analyzeExportReadiness(baseProject(), { hasCover: false });
    expect(result.canExport).toBe(true);
    expect(result.warnings.some((i) => i.id === "missing-cover")).toBe(true);
  });
});
