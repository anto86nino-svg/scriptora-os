import { describe, expect, it } from "vitest";
import {
  buildContinuationCanonBlock,
  buildWriterMemorySource,
  extractCompactNarrativeContinuity,
} from "@/lib/premium-writing";
import { buildForgeWriterContextBlock } from "@/lib/guided-interview/forge-writer-bridge";
import type { BookConfig } from "@/types/book";

function sampleConfig(): BookConfig {
  return {
    title: "Test",
    subtitle: "",
    genre: "thriller",
    language: "Italian",
    tone: "dark",
    authorStyle: "literary",
    category: "Fiction",
    subcategory: "Thriller",
    subgenre: "Psychological thriller",
    chapterLength: "medium",
    bookLength: "short",
    numberOfChapters: 5,
    subchaptersEnabled: false,
    forgeCanonBrief: "Roma, tono noir.",
    characterBibleText: "Marco — detective.",
    forgeAntiDriftRules: ["Mai cambiare il nome di Marco."],
    characters: [
      {
        name: "Marco",
        role: "Protagonista",
        personalLanguage: "Frasi brevi, sarcasmo controllato.",
        emotionalTriggers: "Tradimento, menzogne sul passato.",
        recurringBehavior: "Si passa le mani nei capelli quando mente.",
      },
    ],
    matterOptions: {
      frontMatterEnabled: false,
      backMatterEnabled: false,
      acknowledgmentsEnabled: false,
      ctaEnabled: false,
      bibliographyEnabled: false,
    },
  };
}

describe("writer integration fixes", () => {
  it("buildWriterMemorySource includes intelligence block", () => {
    const intel = "INTEL BLOCK\nMemory graph open promises.";
    const block = buildWriterMemorySource({
      config: sampleConfig(),
      previousChapters: [],
      chapterIndex: 0,
      intelligenceBlock: intel,
    });
    expect(block).toContain("WRITER MEMORY SOURCE");
    expect(block).toContain("INTEL BLOCK");
  });

  it("buildContinuationCanonBlock carries compact canon", () => {
    const block = buildContinuationCanonBlock({
      writerMemorySource: "WRITER MEMORY SOURCE\nCanon law.",
      characterLock: "CHARACTER LOCK\nMarco stays Marco.",
      narrativeContinuity: "Arc position: Chapter 2 of 5",
    });
    expect(block).toContain("CONTINUATION MEMORY BLOCK");
    expect(block).toContain("Marco stays Marco");
  });

  it("extractCompactNarrativeContinuity keeps last scene slice", () => {
    const context = `NARRATIVE MEMORY
Arc position: Chapter 3 of 10 — RISING
Core themes: guilt, revenge

LAST SCENE STATE (closing passage of Ch 2 — maintain direct continuity):
Marco chiuse la porta.`;
    const compact = extractCompactNarrativeContinuity(context);
    expect(compact).toContain("Arc position");
    expect(compact).toContain("LAST SCENE STATE");
  });

  it("forge writer block includes subgenre", () => {
    const block = buildForgeWriterContextBlock(sampleConfig());
    expect(block).toContain("Psychological thriller");
  });
});
