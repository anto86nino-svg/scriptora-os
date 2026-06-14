import { describe, expect, it } from "vitest";
import { buildCoverStudioPackage, inferGenreFamily } from "./index";

const FIXTURES = {
  darkRomance: {
    title: "Il Patto del Miliardario",
    author: "Livia Emerson",
    subtitle: "Un dark romance di segreti, ossessione e potere",
    genre: "Dark Romance",
    language: "Italian",
  },
  thriller: {
    title: "La Moglie Sbagliata",
    author: "Livia Emerson",
    subtitle: "Nessuno conosce davvero la persona che ama",
    genre: "Thriller psicologico",
    language: "Italian",
  },
  selfHelp: {
    title: "Smetti di Pensare Troppo",
    author: "Antonino Campanella",
    subtitle: "Un metodo pratico per liberarti da ansia, blocchi e overthinking",
    genre: "Self-help",
    language: "Italian",
  },
  study: {
    title: "Studiare Meglio in 30 Giorni",
    author: "Antonino Campanella",
    subtitle: "Metodo pratico per preparare esami, verifiche e interrogazioni",
    genre: "Manuale / Study",
    language: "Italian",
  },
  cozyFantasy: {
    title: "The Moonlit Bookshop",
    author: "Livia Emerson",
    subtitle: "A cozy fantasy of tea magic, found family and enchanted pages",
    genre: "Cozy Fantasy",
    language: "English",
  },
  business: {
    title: "The Solopreneur AI System",
    author: "Livia Emerson",
    subtitle: "Automate your work, scale your income, and build a lean digital business",
    genre: "Business / AI",
    language: "English",
  },
} as const;

describe("cover-studio fixtures", () => {
  it("dark romance — high booktok, genre fit", () => {
    const pkg = buildCoverStudioPackage(FIXTURES.darkRomance);
    expect(inferGenreFamily(FIXTURES.darkRomance.genre, FIXTURES.darkRomance.title)).toBe("dark-romance");
    expect(pkg.score.booktokPotential).toBeGreaterThanOrEqual(75);
    expect(pkg.score.genreFit).toBeGreaterThanOrEqual(70);
    expect(pkg.score.titleReadability).toBeGreaterThan(0);
    expect(pkg.recommendedTemplateId).toBe("booktok-dark-romance");
  });

  it("thriller — no self-help style, good contrast", () => {
    const pkg = buildCoverStudioPackage(FIXTURES.thriller);
    expect(inferGenreFamily(FIXTURES.thriller.genre)).toMatch(/thriller|mystery/);
    expect(pkg.recommendedTemplateId).not.toBe("minimal-self-help");
    expect(pkg.score.contrast).toBeGreaterThanOrEqual(65);
    expect(pkg.score.thumbnailReadability).toBeGreaterThanOrEqual(70);
  });

  it("self-help — no romance mood", () => {
    const pkg = buildCoverStudioPackage(FIXTURES.selfHelp);
    expect(pkg.recommendedTemplateId).toMatch(/self-help|nonfiction/);
    expect(pkg.brief.avoidList.join(" ").toLowerCase()).toMatch(/romance|thriller/);
    expect(pkg.score.marketFit).toBeGreaterThanOrEqual(70);
  });

  it("study manual — educational readability", () => {
    const pkg = buildCoverStudioPackage(FIXTURES.study);
    expect(inferGenreFamily(FIXTURES.study.genre)).toBe("study-manual");
    expect(pkg.recommendedTemplateId).toBe("study-manual");
    expect(pkg.score.titleReadability).toBeGreaterThanOrEqual(65);
  });

  it("cozy fantasy — cozy mood not business", () => {
    const pkg = buildCoverStudioPackage(FIXTURES.cozyFantasy);
    expect(inferGenreFamily(FIXTURES.cozyFantasy.genre, FIXTURES.cozyFantasy.title)).toBe("cozy-fantasy");
    expect(pkg.recommendedTemplateId).toBe("cozy-fantasy");
    expect(pkg.score.booktokPotential).toBeGreaterThanOrEqual(75);
    expect(pkg.recommendedTemplateId).not.toBe("business-ai");
  });

  it("scoring coherence — missing title lowers readiness", () => {
    const pkg = buildCoverStudioPackage({ title: "", author: "Test", genre: "Thriller" });
    expect(pkg.readiness.hasTitle).toBe(false);
    expect(pkg.readiness.kdpReady).toBe(false);
    expect(pkg.score.finalScore).toBeLessThanOrEqual(75);
  });

  it("export readiness — unsaved cover warns", () => {
    const pkg = buildCoverStudioPackage(FIXTURES.business, { hasSavedCover: false });
    expect(pkg.readiness.hasSavedCover).toBe(false);
    expect(pkg.readiness.warnings.some((w) => /salvat|saved/i.test(w))).toBe(true);
    const saved = buildCoverStudioPackage(FIXTURES.business, { hasSavedCover: true });
    expect(saved.readiness.hasSavedCover).toBe(true);
  });

  it("business AI — authoritative template", () => {
    const pkg = buildCoverStudioPackage(FIXTURES.business);
    expect(pkg.recommendedTemplateId).toBe("business-ai");
    expect(pkg.score.marketFit).toBeGreaterThanOrEqual(70);
  });
});
