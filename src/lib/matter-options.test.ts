import { describe, expect, it } from "vitest";
import {
  filterBackMatterTemplateSections,
  filterFrontMatterTemplateSections,
  initialPhaseAfterBlueprint,
  isBackMatterEnabled,
  isFrontMatterEnabled,
  phaseAfterAllChapters,
} from "./matter-options";
import type { BookConfig } from "@/types/book";

const baseConfig = {
  title: "Test",
  genre: "thriller",
  language: "Italian",
  numberOfChapters: 10,
} as BookConfig;

describe("matter-options", () => {
  it("respects front matter disabled", () => {
    const config = { ...baseConfig, matterOptions: { frontMatterEnabled: false, backMatterEnabled: true, acknowledgmentsEnabled: true, ctaEnabled: true, bibliographyEnabled: false } };
    expect(isFrontMatterEnabled(config)).toBe(false);
    expect(initialPhaseAfterBlueprint(config)).toBe("chapters");
  });

  it("respects back matter disabled", () => {
    const config = { ...baseConfig, matterOptions: { frontMatterEnabled: true, backMatterEnabled: false, acknowledgmentsEnabled: true, ctaEnabled: true, bibliographyEnabled: false } };
    expect(isBackMatterEnabled(config)).toBe(false);
    expect(phaseAfterAllChapters(config)).toBe("complete");
  });

  it("filters dedication when acknowledgments disabled", () => {
    const sections = filterFrontMatterTemplateSections(["Copyright", "Dedica", "Lettera al lettore"], {
      frontMatterEnabled: true,
      backMatterEnabled: true,
      acknowledgmentsEnabled: false,
      ctaEnabled: true,
      bibliographyEnabled: false,
    });
    expect(sections).not.toContain("Dedica");
  });

  it("filters CTA sections when disabled", () => {
    const sections = filterBackMatterTemplateSections(["Conclusione", "Prossimo passo", "Bibliografia"], {
      frontMatterEnabled: true,
      backMatterEnabled: true,
      acknowledgmentsEnabled: true,
      ctaEnabled: false,
      bibliographyEnabled: false,
    });
    expect(sections.some((s) => /prossimo passo/i.test(s))).toBe(false);
    expect(sections.some((s) => /bibliograf/i.test(s))).toBe(false);
  });
});
