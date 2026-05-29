import { describe, expect, it } from "vitest";
import {
  buildCoverDirectionSuggestions,
  evaluateCoverReadiness,
  inferCoverArtDirection,
  matchTemplateFamily,
  prepareAudiobookAdaptation,
  getActiveCoverProvider,
  listCoverProviders,
} from "@/lib/cover-studio";

describe("Cover Studio Pro Max V1", () => {
  it("infers dark romance art direction", () => {
    const art = inferCoverArtDirection("dark romance mafia obsession");
    expect(art.motif).toBe("dark-romance");
  });

  it("builds genre-specific cover direction", () => {
    const dir = buildCoverDirectionSuggestions({
      genreBrief: "dark romance obsessive luxury",
      title: "The Captive Crown",
      subtitle: "",
      description: "",
      templateName: "Obsidian Luxe",
      templateMood: "Dark premium",
      templateDark: true,
      titleColor: "#fff9ea",
      titleScale: 100,
      hasUploadedImage: false,
      hasArtDirection: true,
      artDirectionLabel: "dark romance",
    });
    expect(dir.mood.length).toBeGreaterThan(0);
    expect(dir.palette).toContain("black");
  });

  it("scores cover readiness conservatively", () => {
    const weak = evaluateCoverReadiness({
      genreBrief: "",
      title: "A Very Long Title That Will Definitely Break Thumbnail Readability At Small Sizes",
      subtitle: "",
      templateName: "Test",
      templateDark: true,
      titleColor: "#333333",
      titleScale: 75,
      hasUploadedImage: false,
      hasArtDirection: false,
      frontWidthPx: 1600,
      frontHeightPx: 2560,
    });
    expect(weak.score).toBeLessThan(55);

    const strong = evaluateCoverReadiness({
      genreBrief: "dark romance commercial fiction",
      title: "Ash Crown",
      subtitle: "A dark romance",
      templateName: "Obsidian Luxe",
      templateDark: true,
      titleColor: "#fff9ea",
      titleScale: 100,
      hasUploadedImage: false,
      hasArtDirection: true,
      frontWidthPx: 1600,
      frontHeightPx: 2560,
    });
    expect(strong.score).toBeGreaterThan(50);
  });

  it("matches template families", () => {
    const family = matchTemplateFamily("booktok romance love story");
    expect(family?.id).toBe("booktok-romance");
  });

  it("prepares audiobook safe zones", () => {
    const prep = prepareAudiobookAdaptation({
      frontWidthPx: 1600,
      frontHeightPx: 2560,
      title: "Test Title",
      titleScale: 100,
    });
    expect(prep.ready).toBe(true);
    expect(prep.squareSafeCrop.size).toBe(1600);
  });

  it("registers builtin provider and future placeholders", () => {
    expect(getActiveCoverProvider().available).toBe(true);
    expect(listCoverProviders().length).toBeGreaterThan(5);
    const external = listCoverProviders().find((p) => p.id === "openai-images");
    expect(external?.available).toBe(false);
  });
});
