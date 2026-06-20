import { beforeEach, describe, expect, it } from "vitest";
import type { BookProject } from "@/types/book";
import {
  applyProjectHandoffSeed,
  buildProjectHandoffSeed,
  loadProjectHandoffSeed,
  saveProjectHandoffSeed,
} from "./project-handoff";

function project(): BookProject {
  return {
    id: "project-1",
    phase: "blueprint",
    config: {
      title: "Titolo scelto dall'autore",
      subtitle: "",
      language: "Italian",
      genre: "self-help",
      category: "Non-Fiction",
      subcategory: "Mindset",
      tone: "pratico",
      authorStyle: "editoriale",
      chapterLength: "medium",
      bookLength: "medium",
      numberOfChapters: 10,
      subchaptersEnabled: false,
    },
    blueprint: null,
    frontMatter: null,
    chapters: [],
    backMatter: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("project handoff seed", () => {
  it("salva e ricarica il seed attivo e per progetto", () => {
    const seed = saveProjectHandoffSeed(buildProjectHandoffSeed("keyword-gold", {
      projectId: "project-1",
      title: "Titolo keyword",
      backendKeywords: ["focus profondo", "abitudini sane"],
      kdpCategories: ["Self-Help > Personal Growth"],
    }));

    expect(loadProjectHandoffSeed()?.id).toBe(seed.id);
    expect(loadProjectHandoffSeed("project-1")?.backendKeywords).toContain("focus profondo");
  });

  it("aggiorna publishingMetadata senza sovrascrivere campi manuali gia' presenti", () => {
    const seed = buildProjectHandoffSeed("kdp-launch", {
      projectId: "project-1",
      title: "Titolo da KDP",
      subtitle: "Promessa commerciale",
      marketplace: "amazon.it",
      backendKeywords: ["focus profondo", "gestione attenzione"],
      kdpCategories: ["Business > Time Management"],
      commercialAngle: "Metodo pratico per professionisti saturi.",
    });

    const updated = applyProjectHandoffSeed(project(), seed);

    expect(updated.config.title).toBe("Titolo scelto dall'autore");
    expect(updated.config.subtitle).toBe("Promessa commerciale");
    expect(updated.config.amazonMarketplace).toBe("amazon.it");
    expect(updated.config.publishingMetadata?.backendKeywords).toEqual([
      "focus profondo",
      "gestione attenzione",
    ]);
    expect(updated.config.publishingMetadata?.kdpCategories).toContain("Business > Time Management");
    expect(updated.config.publishingMetadata?.sourceTools).toContain("kdp-launch");
  });
});
