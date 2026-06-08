import { describe, expect, it } from "vitest";
import {
  blueprintPlansSubchapters,
  getPlannedSubchapterCountForChapter,
  needsBlueprintSubchapterSync,
  resolveSubchapterCount,
  shouldEnforceSubchapterContent,
} from "./structure-settings";
import type { BookBlueprint, BookConfig } from "@/types/book";

function config(overrides: Partial<BookConfig> = {}): BookConfig {
  return {
    title: "Test",
    subtitle: "",
    tone: "direct",
    authorStyle: "",
    language: "English",
    genre: "horror",
    category: "Fiction",
    subcategory: "Horror",
    chapterLength: "medium",
    bookLength: "short",
    numberOfChapters: 3,
    subchaptersEnabled: true,
    subchaptersPerChapter: 3,
    ...overrides,
  };
}

function blueprint(withSubs = false): BookBlueprint {
  return {
    overview: "Overview",
    themes: [],
    emotionalArc: "Arc",
    chapterOutlines: [
      {
        title: "Ch 1",
        summary: "Summary",
        subchapters: withSubs
          ? [
              { title: "The Taste of Iron", summary: "Beat 1" },
              { title: "The Voice", summary: "Beat 2" },
            ]
          : undefined,
      },
      { title: "Ch 2", summary: "Summary 2" },
    ],
  };
}

describe("structure-settings", () => {
  it("does not enforce subchapters when blueprint has no sub plan", () => {
    expect(shouldEnforceSubchapterContent(config(), blueprint(false))).toBe(false);
    expect(getPlannedSubchapterCountForChapter(config(), blueprint(false), 0)).toBe(0);
    expect(needsBlueprintSubchapterSync(config(), blueprint(false))).toBe(true);
  });

  it("enforces subchapters when blueprint plans them", () => {
    expect(shouldEnforceSubchapterContent(config(), blueprint(true))).toBe(true);
    expect(getPlannedSubchapterCountForChapter(config(), blueprint(true), 0)).toBe(2);
    expect(blueprintPlansSubchapters(blueprint(true), config())).toBe(true);
  });

  it("returns zero sub count when disabled", () => {
    expect(resolveSubchapterCount(config({ subchaptersEnabled: false, structureMode: "chapter_only" }))).toBe(0);
  });

  it("resolves auto subchapter count by genre", () => {
    expect(resolveSubchapterCount(config({ subchaptersPerChapter: "auto", genre: "horror" }))).toBe(5);
  });
});
