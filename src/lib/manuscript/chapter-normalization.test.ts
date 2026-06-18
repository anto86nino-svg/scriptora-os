import { describe, expect, it } from "vitest";
import {
  normalizeChapterForGeneration,
  normalizeProjectChapters,
  safeSubchapters,
} from "./chapter-normalization";
import type { BookProject } from "@/types/book";

describe("chapter-normalization", () => {
  it("safeSubchapters returns [] when undefined", () => {
    expect(safeSubchapters(undefined)).toEqual([]);
    expect(safeSubchapters({ title: "A", content: "x" } as any)).toEqual([]);
  });

  it("normalizeChapterForGeneration always includes subchapters array", () => {
    const chapter = normalizeChapterForGeneration(undefined, 0, {
      title: "Libro",
      numberOfChapters: 3,
      subchaptersEnabled: false,
    } as BookProject["config"]);
    expect(chapter.subchapters).toEqual([]);
    expect(chapter.title.length).toBeGreaterThan(0);
  });

  it("subchaptersEnabled false forces empty subchapters", () => {
    const chapter = normalizeChapterForGeneration(
      { title: "Cap 1", content: "testo", subchapters: [{ title: "S", content: "x" }] },
      0,
      { subchaptersEnabled: false } as BookProject["config"],
    );
    expect(chapter.subchapters).toEqual([]);
  });

  it("normalizeProjectChapters fills missing chapter slots", () => {
    const project: BookProject = {
      id: "p1",
      config: {
        title: "Test",
        numberOfChapters: 2,
        subchaptersEnabled: false,
      } as BookProject["config"],
      blueprint: {
        chapterOutlines: [
          { title: "Apertura", summary: "Hook" },
          { title: "Svolta", summary: "Midpoint" },
        ],
      } as BookProject["blueprint"],
      chapters: [{ title: "Apertura", content: "abc" } as any],
      frontMatter: null,
      backMatter: null,
      phase: "chapters",
      createdAt: "",
      updatedAt: "",
    };
    const normalized = normalizeProjectChapters(project);
    expect(normalized.chapters).toHaveLength(2);
    expect(normalized.chapters[0]!.subchapters).toEqual([]);
    expect(normalized.chapters[1]!.subchapters).toEqual([]);
  });

  it("first generation path does not throw on undefined subchapters", () => {
    expect(() => {
      const ch = normalizeChapterForGeneration(
        { title: "Capitolo 1", content: "" } as any,
        0,
        { subchaptersEnabled: true, numberOfChapters: 1 } as BookProject["config"],
      );
      ch.subchapters.map(() => null);
    }).not.toThrow();
  });
});
