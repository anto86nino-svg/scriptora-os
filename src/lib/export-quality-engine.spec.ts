import { describe, expect, it } from "vitest";
import type { BookProject } from "@/types/book";
import {
  analyzeExportPreflight,
  assertExportTextClean,
  generateMarkdownExport,
  generatePlainTextExport,
  prepareExportProject,
} from "./export-quality-engine";

function sampleProject(overrides: Partial<BookProject> = {}): BookProject {
  const chapters = Array.from({ length: 10 }, (_, i) => ({
    title: `Chapter ${i + 1}`,
    content:
      `This is chapter ${i + 1}. It explores tension, choice, and consequence with enough prose to read like a real draft.\n\n` +
      "Someone waited. The question lingered — but the answer was not where anyone looked.",
    subchapters: [],
  }));

  const baseConfig = {
    title: "Salt Bridge",
    subtitle: "A Novel",
    authorName: "Lyra Vale",
    language: "English" as const,
    genre: "romance" as const,
    numberOfChapters: 10,
    tone: "literary",
    authorStyle: "precise",
    category: "Fiction",
    subcategory: "Romance",
    chapterLength: "medium" as const,
    bookLength: "medium" as const,
    subchaptersEnabled: false,
  };

  return {
    id: "test-book",
    config: baseConfig,
    chapters,
    frontMatter: {
      copyright: "© 2026 Lyra Vale. All rights reserved.",
      dedication: "For the ones who stayed.",
      aboutAuthor: "Lyra Vale writes literary romance.",
      howToUse: "",
      letterToReader: "Thank you for reading.",
    },
    backMatter: {
      conclusion: "The bridge held.",
      authorNote: "Notes from the author.",
      callToAction: "Read the next book.",
      reviewRequest: "If this moved you, leave a review.",
      otherBooks: "Other titles by Lyra Vale.",
      followAuthor: "Follow @lyravale",
    },
    blueprint: { chapterOutlines: chapters.map((ch, i) => ({ title: ch.title, summary: `Outline ${i + 1}` })) },
    ...overrides,
  } as BookProject;
}

describe("export-quality-engine", () => {
  it("prepares romance project without technical junk", () => {
    const prepared = prepareExportProject(
      sampleProject({
        chapters: [{
          title: "Chapter 1",
          content: "Hello undefined world with [missing] data.",
          subchapters: [],
        }],
      }),
    );
    expect(prepared.chapters[0].content).not.toMatch(/undefined|\[missing\]/);
    expect(assertExportTextClean(prepared.chapters[0].content)).toEqual([]);
  });

  it("scores self-help style project with front/back matter", () => {
    const report = analyzeExportPreflight(
      sampleProject({
        config: {
          ...sampleProject().config,
          genre: "self-help",
          title: "Small Steps",
        },
      }),
      { format: "pdf", hasCover: true },
    );
    expect(report.score).toBeGreaterThanOrEqual(75);
  });

  it("exports without author using clean fallback", () => {
    const project = sampleProject({
      config: { ...sampleProject().config, authorName: "", author: "", writerName: "" },
    });
    const text = generatePlainTextExport(project, { profileAuthorName: "Scriptora Author" });
    expect(text).toContain("Scriptora Author");
    expect(assertExportTextClean(text)).toEqual([]);
  });

  it("exports long chapters without undefined/null leaks", () => {
    const long = "word ".repeat(1200);
    const text = generateMarkdownExport(
      sampleProject({
        chapters: [{ title: "Long Chapter", content: long, subchapters: [] }],
      }),
    );
    expect(text.length).toBeGreaterThan(5000);
    expect(assertExportTextClean(text)).toEqual([]);
  });

  it("warns when cover is missing for epub", () => {
    const report = analyzeExportPreflight(sampleProject(), { format: "epub", hasCover: false });
    expect(report.warnings.some(w => /cover/i.test(w))).toBe(true);
  });

  it("handles markdown-heavy chapter content", () => {
    const text = generatePlainTextExport(
      sampleProject({
        chapters: [{
          title: "Dirty Markdown",
          content: "## Scene\n\n**Bold move** — but *why*?\n\n- one\n- two",
          subchapters: [],
        }],
      }),
    );
    expect(text).toContain("Bold move");
    expect(text).not.toContain("**");
    expect(assertExportTextClean(text)).toEqual([]);
  });
});
