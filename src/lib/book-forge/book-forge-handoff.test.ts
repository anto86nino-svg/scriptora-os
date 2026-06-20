import { describe, expect, it } from "vitest";
import type { BookConfig } from "@/types/book";
import {
  buildBookForgeHandoff,
  mergeHandoffIntoBookConfig,
  resolveBookForgeStartStep,
  validateBookForgeHandoff,
} from "./book-forge-handoff";

describe("Book Forge convergence handoff", () => {
  it("Title Domination con titolo/genere/nicchia salta Book Foundation", () => {
    const handoff = buildBookForgeHandoff("title-domination", {
      title: "La disciplina gentile",
      subtitle: "Un metodo pratico per tornare costanti",
      genre: "self-help",
      category: "Non-Fiction",
      niche: "abitudini sostenibili",
      keywords: ["abitudini", "disciplina", "mindset"],
      promise: "Costruire costanza senza autodistruggersi.",
    });

    expect(handoff.completedSlots).toEqual(expect.arrayContaining(["title", "genre", "niche", "keywords", "promise"]));
    expect(handoff.recommendedStartStep).not.toBe("book-foundation");
    expect(handoff.recommendedStartStep).toBe("structure-forge");
  });

  it("Bestseller Radar con categoria e keyword completa le parti mancanti dentro Book Forge", () => {
    const handoff = buildBookForgeHandoff("bestseller-radar", {
      genre: "thriller",
      category: "Fiction",
      subcategory: "Thriller psicologico",
      niche: "segreti familiari",
      keywords: ["domestic thriller", "segreti", "suspense"],
    });

    expect(handoff.recommendedStartStep).toBe("book-foundation");
    expect(handoff.completedSlots).toEqual(expect.arrayContaining(["genre", "category", "subcategory", "niche", "keywords"]));
    expect(handoff.missingSlots).toContain("title");
  });

  it("KDP Launch con metadata presenti parte da struttura o blueprint", () => {
    const partial = buildBookForgeHandoff("kdp-launch", {
      title: "Smetti di tradirti",
      subtitle: "Una guida pratica per scegliere meglio",
      genre: "self-help",
      category: "Non-Fiction",
      subcategory: "Self Help",
      niche: "confini personali",
      language: "Italian",
      marketplace: "amazon.it",
      targetReader: "Lettori adulti che vogliono smettere di compiacere tutti.",
      promise: "Imparare a scegliere senza tradirsi.",
      commercialAngle: "Self-help diretto, emotivo e pratico.",
    });
    const ready = buildBookForgeHandoff("kdp-launch", {
      ...partial.prefill,
      structureMode: "capitoli pratici con esercizi",
      transformation: "Da compiacenza a confini personali chiari.",
    });

    expect(partial.recommendedStartStep).toBe("structure-forge");
    expect(ready.recommendedStartStep).toBe("blueprint-generation");
  });

  it("Preset poesia usa flusso poesia e non personaggi romanzo", () => {
    const handoff = buildBookForgeHandoff("preset-forge", {
      title: "Geografia delle cose non dette",
      genre: "poetry" as any,
      category: "Poetry",
      subcategory: "Poetry Collection",
      niche: "poesia contemporanea",
      bookType: "poetry",
    });

    expect(handoff.recommendedStartStep).toBe("poetry-forge");
    expect(resolveBookForgeStartStep({ ...handoff.prefill, characters: [{ name: "" }] })).toBe("poetry-forge");
  });

  it("Progetto fiction senza personaggi va a Character Forge", () => {
    const handoff = buildBookForgeHandoff("book-idea-tools", {
      title: "La casa senza finestre",
      genre: "thriller",
      category: "Fiction",
      subcategory: "Psychological Thriller",
      niche: "domestic suspense",
      plot: "Una donna torna nella casa dove sua madre e' sparita.",
      conflict: "Scoprire la verita' senza diventare il nuovo bersaglio.",
    });

    expect(handoff.recommendedStartStep).toBe("character-forge");
    expect(handoff.missingSlots).toContain("characters");
  });

  it("Progetto completo va direttamente a Blueprint Generation", () => {
    const handoff = buildBookForgeHandoff("guided-interview", {
      title: "La cattedrale delle anime dimenticate",
      genre: "fantasy",
      category: "Fiction",
      subcategory: "Fantasy",
      niche: "gotico sacro",
      language: "Italian",
      targetReader: "Lettori fantasy adulti che amano colpa, reliquie e magia con costo.",
      promise: "Un viaggio di fede, memoria e scelta impossibile.",
      plot: "Una restauratrice deve riparare un portale sacro legato alla sua memoria.",
      conflict: "Salvare il mondo o distruggere la verita' che la protegge.",
      characters: [{ name: "Nora", role: "protagonista" }],
      structureMode: "capitoli con sottocapitoli",
      chapterCount: 18,
      bookLength: "medium",
    });

    expect(handoff.recommendedStartStep).toBe("blueprint-generation");
    expect(validateBookForgeHandoff(handoff).ok).toBe(true);
  });

  it("Blueprint approvato va al Writer", () => {
    const handoff = buildBookForgeHandoff("one-flow", {
      title: "Libro pronto",
      genre: "romance",
      category: "Fiction",
      niche: "second chance",
      blueprintApproved: true,
      blueprint: {
        overview: "Overview",
        themes: [],
        emotionalArc: "Arc",
        chapterOutlines: [{ title: "Capitolo 1", summary: "Inizio" }],
      },
    });

    expect(handoff.recommendedStartStep).toBe("writer");
  });

  it("mergeHandoffIntoBookConfig preserva i campi gia' scelti manualmente", () => {
    const config = {
      title: "Titolo manuale",
      subtitle: "",
      language: "Italian",
      amazonMarketplace: "amazon.it",
      genre: "romance",
      category: "Fiction",
      subcategory: "Romance",
      tone: "intimo",
      authorStyle: "editoriale",
      chapterLength: "medium",
      bookLength: "medium",
      numberOfChapters: 12,
      subchaptersEnabled: true,
      subchaptersPerChapter: 3,
    } as BookConfig;
    const handoff = buildBookForgeHandoff("keyword-gold", {
      title: "Titolo da keyword",
      subtitle: "Promessa forte",
      keywords: ["romance", "slow burn"],
    });

    const merged = mergeHandoffIntoBookConfig(config, handoff);

    expect(merged.title).toBe("Titolo manuale");
    expect(merged.subtitle).toBe("Promessa forte");
  });
});
