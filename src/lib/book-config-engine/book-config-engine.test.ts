import { describe, expect, it } from "vitest";
import { sanitizeBookConfiguration, validateConfigCoherence, resolveGenreDnaProfile } from "./index";

describe("book-config-engine", () => {
  it("strips self-help DNA when switching to gothic thriller", () => {
    const contaminated = {
      title: "La Nebbia del Patto",
      subtitle: "",
      tone: "poetico, introspectivo, motivazionale, mindset",
      authorStyle: "Brianna Wiest-inspired: poetic, deeply personal",
      language: "Italian" as const,
      genre: "thriller" as const,
      category: "Fiction",
      subcategory: "mindset",
      subgenre: "mindset poetico",
      bookTypeId: "gothic-thriller",
      chapterLength: "medium" as const,
      bookLength: "medium" as const,
      numberOfChapters: 12,
      subchaptersEnabled: true,
      styleProfile: {
        voiceIntensity: 80,
        emotionalIntensity: 90,
        poeticLevel: 85,
        dialogueLevel: 40,
        slowBurn: 30,
        tensionIntensity: 40,
        psychologicalDepth: 88,
        showDontTell: 75,
        narrativePace: 45,
        presetId: "literary-depth",
      },
    };

    const { config, fixes } = sanitizeBookConfiguration(contaminated as any);
    expect(config.subcategory.toLowerCase()).not.toContain("mindset");
    expect(config.tone.toLowerCase()).not.toMatch(/mindset|poetic|motivaz/);
    expect(config.authorStyle).not.toMatch(/brianna|poetic/i);
    expect(config.styleProfile?.poeticLevel).toBeLessThanOrEqual(45);
    expect(config.styleProfile?.tensionIntensity).toBeGreaterThanOrEqual(60);
    expect(fixes.length).toBeGreaterThan(0);
  });

  it("blocks narrative subgenres on self-help", () => {
    const contaminated = {
      title: "Torna a Te",
      subtitle: "",
      tone: "chiaro e pratico",
      authorStyle: "Self Help",
      language: "Italian" as const,
      genre: "self-help" as const,
      category: "Non-Fiction",
      subcategory: "gothic thriller",
      bookTypeId: "mindset",
      chapterLength: "medium" as const,
      bookLength: "short" as const,
      numberOfChapters: 10,
      subchaptersEnabled: true,
    };

    const { config } = sanitizeBookConfiguration(contaminated as any);
    expect(config.subcategory.toLowerCase()).not.toContain("gothic");
    expect(config.bookTypeId).toBe("mindset");
  });

  it("resolves gothic thriller DNA profile", () => {
    const dna = resolveGenreDnaProfile({ bookTypeId: "gothic-thriller", genre: "thriller", subcategory: "gothic" });
    expect(dna.traits.therapeuticSpeech).toBe("BLOCKED");
    expect(dna.traits.metaphor).toBe("LOW_MEDIUM");
  });

  it("reports low coherence for contaminated thriller config", () => {
    const report = validateConfigCoherence({
      title: "Thriller Test",
      subtitle: "",
      tone: "poetico mindset healing",
      authorStyle: "Brianna Wiest-inspired",
      language: "Italian",
      genre: "thriller",
      category: "Fiction",
      subcategory: "mindset",
      bookTypeId: "gothic-thriller",
      chapterLength: "medium",
      bookLength: "medium",
      numberOfChapters: 12,
      subchaptersEnabled: true,
      targetReader: "Lettori self-help che vogliono mindset",
      styleProfile: {
        voiceIntensity: 70,
        emotionalIntensity: 90,
        poeticLevel: 90,
        dialogueLevel: 50,
        slowBurn: 40,
        tensionIntensity: 35,
        psychologicalDepth: 85,
        showDontTell: 70,
        narrativePace: 50,
      },
    } as any);
    expect(report.overall).toBeLessThan(80);
    expect(report.needsCorrection).toBe(true);
    expect(report.suggestedFixes.length).toBeGreaterThan(0);
  });
});
