import { describe, expect, it } from "vitest";
import { planChapterScenes, autoSceneCountForGenre } from "./scene-planner";
import { ensureBlueprintStructure, chapterNeedsStructureSync } from "./ensure-blueprint-structure";
import { resolveEffectiveStructureMode } from "./structure-settings";
import type { BookBlueprint, BookConfig } from "@/types/book";

function config(overrides: Partial<BookConfig> = {}): BookConfig {
  return {
    title: "Test",
    subtitle: "",
    tone: "dark",
    authorStyle: "",
    language: "English",
    genre: "horror",
    category: "Fiction",
    subcategory: "Horror",
    chapterLength: "medium",
    bookLength: "short",
    numberOfChapters: 2,
    subchaptersEnabled: true,
    structureMode: "scene_based",
    subchaptersPerChapter: "auto",
    ...overrides,
  };
}

describe("scene-planner", () => {
  it("plans horror scenes with distinct purposes", () => {
    const scenes = planChapterScenes("The Voice in the Milk", "A child hears whispers.", 0, 5, config());
    expect(scenes).toHaveLength(5);
    expect(scenes[0].purpose).toBeTruthy();
    expect(scenes[0].title.toLowerCase()).not.toMatch(/subchapter|section/i);
    expect(new Set(scenes.map((s) => s.purpose)).size).toBeGreaterThan(1);
  });

  it("auto_intelligent picks scene_based for horror", () => {
    expect(resolveEffectiveStructureMode(config({ structureMode: "auto_intelligent", genre: "horror" }))).toBe("scene_based");
    expect(resolveEffectiveStructureMode(config({ structureMode: "auto_intelligent", genre: "self-help" }))).toBe("chapter_subchapter");
  });

  it("ensureBlueprintStructure syncs single chapter with scenes", () => {
    const blueprint: BookBlueprint = {
      overview: "O",
      themes: [],
      emotionalArc: "A",
      chapterOutlines: [{ title: "Ch 1", summary: "Summary" }],
    };
    expect(chapterNeedsStructureSync(config(), blueprint, 0)).toBe(true);
    const synced = ensureBlueprintStructure(blueprint, config(), 0);
    expect(synced.chapterOutlines[0].subchapters?.length).toBe(autoSceneCountForGenre("horror"));
    expect(chapterNeedsStructureSync(config(), synced, 0)).toBe(false);
  });
});
