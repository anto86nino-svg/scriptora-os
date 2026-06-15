import { describe, expect, it } from "vitest";
import type { BookProject } from "@/types/book";
import {
  getActiveSubchaptersPerChapter,
  getBookStructureTruth,
  getMissingActiveSubchapterRefs,
} from "./book-structure-truth";

function baseProject(overrides: Partial<BookProject> = {}): BookProject {
  return {
    id: "structure-test",
    config: {
      title: "Test",
      subtitle: "",
      tone: "intenso",
      authorStyle: "cinematic",
      language: "Italian",
      genre: "romance",
      category: "Fiction",
      subcategory: "Romance",
      chapterLength: "medium",
      bookLength: "short",
      numberOfChapters: 2,
      subchaptersEnabled: false,
    },
    blueprint: {
      overview: "Overview",
      themes: ["fiducia"],
      emotionalArc: "Arc",
      chapterOutlines: [
        { title: "Cap 1", summary: "Prima svolta emotiva concreta." },
        { title: "Cap 2", summary: "Seconda conseguenza narrativa." },
      ],
    },
    chapters: [
      { title: "Cap 1", content: "testo ".repeat(80), subchapters: [], status: "completed" },
      { title: "Cap 2", content: "testo ".repeat(80), subchapters: [], status: "completed" },
    ],
    frontMatter: null,
    backMatter: null,
    phase: "chapters",
    messages: [],
    createdAt: "2026-06-15T00:00:00.000Z",
    updatedAt: "2026-06-15T00:00:00.000Z",
    ...overrides,
  };
}

describe("book structure truth", () => {
  it("ignores ghost subchapter config when the active blueprint is chapter-only", () => {
    const project = baseProject({
      config: {
        ...baseProject().config,
        subchaptersEnabled: true,
        subchaptersPerChapter: 3,
      },
    });

    const truth = getBookStructureTruth(project);

    expect(truth.requiresSubchapters).toBe(false);
    expect(truth.reason).toBe("active-blueprint-chapter-only");
    expect(getActiveSubchaptersPerChapter(project)).toBe(0);
    expect(getMissingActiveSubchapterRefs(project)).toEqual([]);
    expect(truth.diagnostics[0]).toContain("stato fantasma");
  });

  it("requires only subchapters declared by the active blueprint", () => {
    const project = baseProject({
      config: {
        ...baseProject().config,
        genre: "thriller",
        subchaptersEnabled: false,
      },
      blueprint: {
        overview: "Overview",
        themes: ["sospetto"],
        emotionalArc: "Escalation",
        chapterOutlines: [
          {
            title: "Cap 1",
            summary: "Indizio iniziale.",
            subchapters: [
              { title: "Scena A", summary: "Primo indizio." },
              { title: "Scena B", summary: "Prima minaccia." },
            ],
          },
          {
            title: "Cap 2",
            summary: "Pressione crescente.",
            subchapters: [
              { title: "Scena A", summary: "Falso lead." },
              { title: "Scena B", summary: "Conseguenza." },
            ],
          },
        ],
      },
      chapters: [
        {
          title: "Cap 1",
          content: "testo ".repeat(80),
          status: "completed",
          subchapters: [{ title: "Scena A", content: "testo ".repeat(80) }],
        },
        {
          title: "Cap 2",
          content: "testo ".repeat(80),
          status: "completed",
          subchapters: [
            { title: "Scena A", content: "testo ".repeat(80) },
            { title: "Scena B", content: "testo ".repeat(80) },
          ],
        },
      ],
    });

    const truth = getBookStructureTruth(project);
    const missing = getMissingActiveSubchapterRefs(project);

    expect(truth.requiresSubchapters).toBe(true);
    expect(truth.reason).toBe("active-blueprint-subchapters");
    expect(getActiveSubchaptersPerChapter(project)).toBe(2);
    expect(missing).toEqual([{ chapterIndex: 0, subIndex: 1 }]);
  });
});
