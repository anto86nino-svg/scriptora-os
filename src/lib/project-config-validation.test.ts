import { describe, expect, it } from "vitest";
import type { BookConfig } from "@/types/book";
import {
  repairBookConfigBasics,
  validateBookConfig,
  validateProjectForGeneration,
} from "./project-config-validation";

function baseConfig(overrides: Partial<BookConfig> = {}): BookConfig {
  return {
    title: "Il mio libro",
    subtitle: "",
    tone: "warm",
    authorStyle: "literary",
    language: "Italian",
    genre: "romance",
    category: "Fiction",
    subcategory: "Romance",
    chapterLength: "medium",
    bookLength: "medium",
    numberOfChapters: 10,
    subchaptersEnabled: false,
    ...overrides,
  };
}

describe("project-config-validation", () => {
  it("passes a complete config", () => {
    expect(validateBookConfig(baseConfig())).toEqual([]);
  });

  it("flags missing title, language and genre", () => {
    const issues = validateBookConfig(baseConfig({ title: "", language: undefined as unknown as "Italian", genre: undefined as unknown as "romance" }));
    expect(issues.map((i) => i.id)).toEqual(expect.arrayContaining(["missing_title", "missing_language", "missing_genre"]));
  });

  it("flags unrecognized genre", () => {
    const issues = validateBookConfig(baseConfig({ genre: "not-a-real-genre" as "romance" }));
    expect(issues.some((i) => i.id === "unrecognized_genre")).toBe(true);
  });

  it("repairs empty category/subcategory before validating project", () => {
    const issues = validateProjectForGeneration({
      id: "p1",
      config: baseConfig({ category: "", subcategory: "" }),
      blueprint: null,
      frontMatter: null,
      chapters: [],
      backMatter: null,
      phase: "blueprint",
      createdAt: "",
      updatedAt: "",
    });
    expect(issues).toEqual([]);
  });

  it("repairs invalid chapter count", () => {
    const repaired = repairBookConfigBasics(baseConfig({ numberOfChapters: 0 }));
    expect(repaired.numberOfChapters).toBe(10);
    expect(validateBookConfig(repaired)).toEqual([]);
  });
});
