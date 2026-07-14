import { describe, expect, it } from "vitest";
import type { ForgeInterviewSeed } from "@/lib/guided-interview/forge-blueprint-handoff";
import { deriveForgeWizardPrefill, parseWordsPerChapterTarget } from "./utils";

describe("parseWordsPerChapterTarget", () => {
  it("maps an exact chapter target to the custom total used by generation", () => {
    expect(parseWordsPerChapterTarget("4500", 20)).toEqual({
      wordsPerChapter: 4500,
      totalWords: 90000,
    });
  });

  it("supports Italian thousands separators and chapter-length ranges", () => {
    expect(parseWordsPerChapterTarget("4.500 parole", 20)?.totalWords).toBe(90000);
    expect(parseWordsPerChapterTarget("1.800-2.400", 10)).toEqual({
      wordsPerChapter: 2100,
      totalWords: 21000,
    });
  });

  it("ignores unusable values instead of overriding the selected preset", () => {
    expect(parseWordsPerChapterTarget("decidi tu", 20)).toBeNull();
    expect(parseWordsPerChapterTarget("120", 20)).toBeNull();
  });
});

describe("deriveForgeWizardPrefill", () => {
  it("keeps the author premise separate and fills structure and book sheet fields", () => {
    const seed: ForgeInterviewSeed = {
      selectedGenre: "thriller",
      extracted: {
        rawIdea: "Una restauratrice scopre messaggi lasciati nei quadri dalla madre scomparsa.",
        editorialSynopsis: "Sinossi tecnica che non deve sostituire l'idea originale.",
        promise: "Ogni quadro rivela una verità che mette la protagonista in pericolo.",
        centralConflict: "La restauratrice deve trovare la madre prima che il collezionista distrugga le prove.",
        targetReader: "Lettori adulti di thriller psicologici e misteri familiari.",
        emotionalTone: "Teso, intimo e realistico.",
        setting: "Torino contemporanea e un museo chiuso al pubblico.",
        chapterCount: "14 capitoli",
        chapterLength: "1900-2300",
        bookLength: "medio",
        structurePreference: "Tre atti con rivelazioni progressive.",
        subchaptersPreference: "Sì, 3 sottocapitoli dove servono.",
      },
      characters: [
        { id: "lead", role: "protagonist", name: "Elena" },
        { id: "villain", role: "antagonist", name: "Valerio" },
        { id: "ally", role: "supporting", name: "Marta" },
      ],
      canon: {
        world: { facts: ["I messaggi esistono solo sotto la vernice originale."], locked: true },
        characters: { facts: ["Elena non falsifica mai un restauro."], locked: true },
        relationships: { facts: [], locked: true },
        story: { facts: ["Il collezionista controlla il museo."], locked: true },
        ending: { facts: ["La madre viene ritrovata viva."], locked: true },
        book: { facts: [], locked: true },
        version: 1,
      },
      dnaLock: {
        forbiddenPatterns: ["Nessun elemento soprannaturale."],
      } as ForgeInterviewSeed["dnaLock"],
    };

    const result = deriveForgeWizardPrefill(seed);

    expect(result.idea).toBe(seed.extracted?.rawIdea);
    expect(result.idea).not.toContain("Sinossi tecnica");
    expect(result.chapters).toBe(14);
    expect(result.wordsPerChapter).toBe("1900-2300");
    expect(result.structureType).toContain("Tre atti");
    expect(result.protagonist).toBe("Elena");
    expect(result.antagonist).toBe("Valerio");
    expect(result.secondaryCast).toBe("Marta");
    expect(result.canonRules).toContain("vernice originale");
    expect(result.forbiddenContent).toContain("soprannaturale");
    expect(result.endingType).toContain("ritrovata viva");
  });
});
