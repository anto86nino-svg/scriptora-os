import { describe, expect, it } from "vitest";
import type { BookConfig } from "@/types/book";
import {
  applyHumanBestsellerModeV12Postprocess,
  buildHumanBestsellerModeV12Block,
} from "./human-bestseller-mode-v12";

const config = {
  title: "La distanza tra noi",
  subtitle: "",
  genre: "dark-romance",
  category: "Fiction",
  subcategory: "Dark Romance",
  language: "Italian",
  tone: "intenso",
  authorStyle: "cinematico",
  chapterLength: "medium",
  bookLength: "medium",
  numberOfChapters: 24,
  subchaptersEnabled: false,
  characters: [
    {
      name: "Nora",
      role: "protagonista",
      wound: "ha imparato a non fidarsi",
      externalDesire: "riprendere controllo della propria vita",
      internalNeed: "accettare aiuto senza consegnarsi",
      relationships: "tensione irrisolta con Damien",
      strictRules: "Non rinominare Nora. Non renderla emotivamente risolta troppo presto.",
    },
    {
      name: "Damien",
      role: "love interest",
      personality: "controllato, protettivo, ambiguo",
      strictRules: "Non rinominare Damien. Non farlo diventare terapeutico troppo presto.",
    },
  ],
} as BookConfig;

describe("Human Bestseller Mode V12", () => {
  it("builds V12 prompt rules for character obsession, page turns and canon lock", () => {
    const block = buildHumanBestsellerModeV12Block(config, { chapterIndex: 3, mode: "generation" });

    expect(block).toContain("HUMAN BESTSELLER MODE V12");
    expect(block).toContain("CHARACTER OBSESSION ENGINE");
    expect(block).toContain("PAGE TURN ENGINE");
    expect(block).toContain("CANON LOCK V2");
    expect(block).toContain("Nora");
    expect(block).toContain("Damien");
  });

  it("strips V12 leakage and over-explained trauma dialogue", () => {
    const raw = [
      "HUMAN BESTSELLER MODE V12 — HUMAN PAGE-TURN ENGINE:",
      "Nora guardò la tazza scheggiata.",
      "«Devo raccontarti tutto il mio trauma prima di fidarmi.»",
      "Damien non toccò la porta. Aspettò.",
    ].join("\n\n");

    const result = applyHumanBestsellerModeV12Postprocess(raw, { config, language: "Italian" });

    expect(result).not.toContain("HUMAN BESTSELLER MODE V12");
    expect(result).not.toMatch(/raccontarti tutto il mio trauma/i);
    expect(result).toContain("Nora guardò");
    expect(result).toContain("Damien non toccò");
  });

  it("uses StoryBibleLock to correct near-miss canonical character names", () => {
    const raw = "Nora rimase ferma. Damian abbassò lo sguardo, troppo controllato per chiedere scusa.";

    const result = applyHumanBestsellerModeV12Postprocess(raw, {
      config,
      language: "Italian",
      priorText: "Nora e Damien avevano già litigato sotto la pioggia.",
    });

    expect(result).toContain("Damien abbassò");
    expect(result).not.toContain("Damian abbassò");
  });
});
