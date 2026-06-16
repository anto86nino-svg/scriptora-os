import { describe, expect, it } from "vitest";
import type { BookProject } from "@/types/book";
import { scaffoldMatterForApprovedBlueprint, scaffoldFrontMatter, scaffoldBackMatter } from "./matter-scaffold";

const baseProject = {
  config: {
    title: "Salvezza Pericolosa",
    author: "Test Author",
    authorName: "Test Author",
    language: "Italian",
    genre: "romance",
    numberOfChapters: 18,
    matterOptions: { frontMatterEnabled: true, backMatterEnabled: true },
  },
  frontMatter: null,
  backMatter: null,
  blueprint: { chapterOutlines: Array.from({ length: 18 }, (_, i) => ({ title: `Cap ${i + 1}`, summary: "x" })) },
  chapters: [],
} as unknown as BookProject;

describe("matter-scaffold", () => {
  it("scaffolds front matter with title page and copyright", () => {
    const fm = scaffoldFrontMatter(baseProject);
    expect(fm?.titlePage).toContain("Salvezza Pericolosa");
    expect(fm?.copyright).toMatch(/Copyright/);
  });

  it("scaffolds back matter with author note and review request", () => {
    const bm = scaffoldBackMatter(baseProject);
    expect(bm?.authorNote).toContain("Test Author");
    expect(bm?.reviewRequest).toBeTruthy();
  });

  it("returns patch when approving blueprint without matter", () => {
    const patch = scaffoldMatterForApprovedBlueprint(baseProject);
    expect(patch.frontMatter).toBeTruthy();
    expect(patch.backMatter).toBeTruthy();
    expect(patch.frontMatterStatus).toBe("completed");
  });

  it("does not overwrite existing matter", () => {
    const withMatter = {
      ...baseProject,
      frontMatter: { titlePage: "Existing", copyright: "", dedication: "", aboutAuthor: "", howToUse: "", letterToReader: "" },
      backMatter: { conclusion: "", authorNote: "Existing", callToAction: "", reviewRequest: "", otherBooks: "" },
    } as BookProject;
    const patch = scaffoldMatterForApprovedBlueprint(withMatter);
    expect(patch.frontMatter).toBeUndefined();
    expect(patch.backMatter).toBeUndefined();
  });
});
