import { describe, expect, it } from "vitest";
import type { BookProject } from "@/types/book";
import {
  buildCanonBrainV3PromptBlock,
  buildCanonBrainV3Report,
  detectProjectMemoryBleed,
} from "./canon-brain-v3";

function project(overrides: Partial<BookProject> = {}): BookProject {
  return {
    id: "book-a",
    phase: "chapters",
    config: {
      title: "La Chiave di Nora",
      subtitle: "",
      language: "Italian",
      genre: "thriller",
      category: "Fiction",
      subcategory: "Gothic",
      tone: "teso",
      authorStyle: "cinematic",
      chapterLength: "medium",
      bookLength: "medium",
      numberOfChapters: 3,
      subchaptersEnabled: false,
      characters: [
        {
          name: "Nora",
          role: "protagonista",
          wound: "abbandono",
          externalDesire: "scoprire la verita sulla chiave",
          vulnerability: "teme di fidarsi",
          dominantFlaw: "controllo",
          emotionalTriggers: "porte chiuse e promesse rotte",
          recurringBehavior: "tocca il polso quando mente",
          personalLanguage: "frasi brevi, difensive",
        },
      ],
    },
    blueprint: {
      overview: "Nora trova una chiave nella Cattedrale di Vetro.",
      themes: ["verita", "fiducia"],
      emotionalArc: "Dal controllo alla scelta vulnerabile.",
      chapterOutlines: [
        { title: "La chiave", summary: "Nora trova la chiave nella Cattedrale di Vetro.", canonNotes: ["La chiave deve tornare nel finale."] },
        { title: "Il patto", summary: "Nora incontra Elia e nasconde la chiave." },
        { title: "La porta", summary: "La promessa sulla chiave viene pagata." },
      ],
      integrity: {
        bookCoreDNA: {},
        worldLoreFoundation: {},
        characterMemoryEngine: [{
          canonicalName: "Elia",
          role: "alleato ambiguo",
          emotionalWounds: "tradimento",
          coreDesire: "essere creduto",
          coreFear: "essere usato",
          internalContradiction: "vuole fiducia ma manipola",
          speechPattern: "calmo, ellittico",
          bodyLanguage: "resta immobile quando e ferito",
          traumaMarkers: "promesse infrante",
        }],
        structuralStoryArchitecture: {},
        relationshipTensionEngine: {},
        canonProtectionLayer: {
          immutableCanonRules: ["La chiave appartiene solo a Nora."],
          forbiddenMutations: [],
          priorityOrder: [],
        },
        narrativeImmersionRules: { prioritize: [], avoid: [], sceneLaws: [] },
      },
    },
    chapters: [
      { title: "La chiave", content: "Nora nascose la chiave della Cattedrale di Vetro e tocco il polso.", subchapters: [] },
    ],
    frontMatter: null,
    backMatter: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("Canon Brain V3", () => {
  it("costruisce un database canonico isolato dal projectId", () => {
    const report = buildCanonBrainV3Report(project());

    expect(report.version).toBe(3);
    expect(report.projectId).toBe("book-a");
    expect(report.database.characters.map((character) => character.canonicalName)).toEqual(["Nora", "Elia"]);
    expect(report.database.storyPromises.join(" ")).toContain("chiave");
    expect(report.score).toBeGreaterThanOrEqual(80);
    expect(report.promptBlock).toContain("PROJECT MEMORY ISOLATION LAYER");
    expect(report.promptBlock).toContain("Project ID: book-a");
  });

  it("segnala character lock deboli invece di fingere continuita premium", () => {
    const weak = project({
      config: { ...project().config, characters: [{ name: "Luca", role: "amico" }] },
      blueprint: { ...project().blueprint!, integrity: undefined },
    });
    const report = buildCanonBrainV3Report(weak);

    expect(report.status).toBe("WARNING");
    expect(report.issues.some((issue) => issue.category === "character" && issue.severity === "HIGH")).toBe(true);
  });

  it("rileva personaggi migrati da altri progetti", () => {
    const active = project({
      chapters: [{ title: "Errore", content: "Nora incontro Marco, l'investigatore della saga sbagliata.", subchapters: [] }],
    });
    const foreign = project({
      id: "book-b",
      config: { ...project().config, title: "Il Caso di Marco", characters: [{ name: "Marco", role: "investigatore" }] },
      chapters: [],
    });

    const issues = detectProjectMemoryBleed(active, [foreign]);

    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("CRITICAL");
    expect(issues[0].message).toContain("Marco");
  });

  it("produce un blocco prompt senza importare entita esterne", () => {
    const block = buildCanonBrainV3PromptBlock(project());

    expect(block).toContain("Use ONLY this project's blueprint");
    expect(block).toContain("AUTHORIZED CHARACTER LOCKS");
    expect(block).not.toContain("Marco");
  });
});
