import { describe, expect, it } from "vitest";
import type { BookConfig } from "@/types/book";
import { buildScriptoraOmegaDirective } from "./generation";

function config(overrides: Partial<BookConfig> = {}): BookConfig {
  return {
    title: "Villa della Quercia",
    subtitle: "",
    tone: "gothic romantic suspense",
    authorStyle: "literary",
    language: "Italian",
    genre: "romance",
    category: "Fiction",
    subcategory: "Dark Romance Thriller",
    chapterLength: "medium",
    bookLength: "short",
    numberOfChapters: 8,
    subchaptersEnabled: true,
    matterOptions: {
      frontMatterEnabled: false,
      backMatterEnabled: false,
      acknowledgmentsEnabled: false,
      ctaEnabled: false,
      bibliographyEnabled: false,
    },
    ...overrides,
  };
}

describe("Scriptora Omega directive", () => {
  it("keeps the full editorial quality gate active for chapter generation", () => {
    const directive = buildScriptoraOmegaDirective(config(), { chapterIndex: 0, mode: "generation" });

    expect(directive).toContain("SCRIPTORA OMEGA DIRECTIVE");
    expect(directive).toContain("Book Configuration");
    expect(directive).toContain("Blueprint");
    expect(directive).toContain("Canon Memory");
    expect(directive).toContain("Long Book Memory");
    expect(directive).toContain("QUALITY CHECK");
  });

  it("activates genre-specific pressure for dark romance thriller", () => {
    const directive = buildScriptoraOmegaDirective(config(), { chapterIndex: 2, mode: "rewrite" });

    expect(directive).toContain("Romance: tension");
    expect(directive).toContain("Dark romance");
    expect(directive).toContain("Thriller/suspense");
  });

  it("marks subchapter generation as structurally binding", () => {
    const directive = buildScriptoraOmegaDirective(config({ genre: "self-help", subcategory: "Business" }), {
      chapterIndex: 1,
      mode: "subchapter",
    });

    expect(directive).toContain("subchapter generation");
    expect(directive).toContain("every chapter, subchapter, scene");
    expect(directive).toContain("Self-help");
    expect(directive).toContain("Business");
  });
});
