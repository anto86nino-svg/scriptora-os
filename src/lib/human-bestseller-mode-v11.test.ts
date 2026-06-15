import { describe, expect, it } from "vitest";
import type { BookConfig } from "@/types/book";
import {
  applyHumanBestsellerModeV11Postprocess,
  buildHumanBestsellerModeV11Block,
} from "./human-bestseller-mode-v11";

const romanceConfig = {
  title: "La distanza tra noi",
  subtitle: "",
  genre: "romance",
  category: "Fiction",
  subcategory: "Romance",
  language: "Italian",
  tone: "intimo",
  authorStyle: "cinematico",
  chapterLength: "medium",
  bookLength: "medium",
  numberOfChapters: 24,
  subchaptersEnabled: false,
} as BookConfig;

describe("Human Bestseller Mode V11", () => {
  it("builds a narrative bestseller prompt with human imperfection and page-turning rules", () => {
    const block = buildHumanBestsellerModeV11Block(romanceConfig, { chapterIndex: 2, mode: "generation" });

    expect(block).toContain("HUMAN BESTSELLER MODE V11");
    expect(block).toContain("Compulsive readability");
    expect(block).toContain("Therapy dialogue filter");
    expect(block).toContain("one more chapter");
    expect(block).toContain("Slow burn");
  });

  it("removes V11 prompt leakage and softens therapy-style Italian dialogue", () => {
    const raw = [
      "HUMAN BESTSELLER MODE V11 — HUMAN BESTSELLER WRITING LAW:",
      "Viola rimase sulla soglia, le dita ancora bagnate di pioggia.",
      "«Devo spiegarti il mio trauma prima di potermi fidare di te.»",
      "«Ho paura di soffrire ancora.»",
      "Damien non rispose subito. Guardò la chiave sul tavolo.",
    ].join("\n\n");

    const result = applyHumanBestsellerModeV11Postprocess(raw, {
      language: "Italian",
      config: romanceConfig,
    });

    expect(result).not.toContain("HUMAN BESTSELLER MODE");
    expect(result).not.toMatch(/spiegarti il mio trauma/i);
    expect(result).not.toMatch(/Ho paura di soffrire ancora/i);
    expect(result).toContain("«Non faccio più quella cosa.»");
    expect(result).toContain("Guardò la chiave");
  });

  it("removes repeated emotional beats from current narrative when prior chapters already used them", () => {
    const priorText = "Viola gli aveva già detto: «Ho paura». Poi avevano promesso un giorno alla volta.";
    const raw = [
      "Viola entrò senza chiudere la porta.",
      "Aveva paura, ancora paura, e un giorno alla volta sembrava l'unico modo per respirare.",
      "Poi prese il telefono e chiamò sua sorella. Questa volta non poteva nascondersi.",
    ].join("\n\n");

    const result = applyHumanBestsellerModeV11Postprocess(raw, {
      language: "Italian",
      priorText,
      config: romanceConfig,
    });

    expect(result).not.toMatch(/un giorno alla volta sembrava/i);
    expect(result).toContain("chiamò sua sorella");
  });

  it("does not apply romance therapy filtering to nonfiction/manual content", () => {
    const manualConfig = {
      ...romanceConfig,
      title: "Metodo 30 giorni",
      genre: "business",
      category: "Nonfiction",
      subcategory: "Manual",
    } as BookConfig;
    const raw = "Framework operativo\n\nStep 1: definisci il risultato.\n\nChecklist: misura, esegui, rivedi.";

    const result = applyHumanBestsellerModeV11Postprocess(raw, {
      language: "Italian",
      config: manualConfig,
    });

    expect(result).toContain("Framework operativo");
    expect(result).toContain("Checklist");
  });
});
