import { describe, expect, it } from "vitest";
import type { BookBlueprint, BookConfig } from "@/types/book";
import {
  buildMaximumEditorialQualityPromptBlock,
  runEditorialQualityPipeline,
  runEditorialQualityPipelineOnChapter,
  validateBlueprintEditorialQuality,
  validateFrontBackMatterQuality,
} from "./editorial-quality-pipeline";

const LITERARY_ROMANCE_CONFIG: Partial<BookConfig> = {
  genre: "philosophy",
  subcategory: "Literary",
  subgenre: "Romance emozionale maturo",
  bookTypeId: "literary",
  language: "Italian",
};

describe("editorial-quality-pipeline", () => {
  it("buildMaximumEditorialQualityPromptBlock includes anti-repetition and forward momentum rules", () => {
    const block = buildMaximumEditorialQualityPromptBlock(LITERARY_ROMANCE_CONFIG, {
      contentKind: "chapter",
      language: "Italian",
    });
    expect(block).toMatch(/NON ripetere scene/i);
    expect(block).toMatch(/flashback/i);
    expect(block).toMatch(/social/i);
    expect(block).toMatch(/mostra, non raccontare/i);
  });

  it("runEditorialQualityPipeline applies cleanup, repetition guard and novel mode", () => {
    const input = [
      "Elisa guardò il telefono.",
      "Non sapeva cosa rispondere.",
      "Si passò una mano sul viso e il silenzio cadde.",
      "Si passò una mano sul viso di nuovo.",
    ].join("\n\n");

    const result = runEditorialQualityPipeline(input, {
      config: LITERARY_ROMANCE_CONFIG,
      language: "Italian",
      contentKind: "chapter",
    });

    expect(result.text).toContain("Elisa guardò il telefono. Non sapeva cosa rispondere.");
    expect((result.text.match(/si passò una mano sul viso/gi) || []).length).toBeLessThanOrEqual(1);
    expect(result.needsTraditionalEditorAi).toBe(true);
  });

  it("validateBlueprintEditorialQuality rejects duplicate chapter titles", () => {
    const blueprint: BookBlueprint = {
      overview: "Una storia d'amore tra due sconosciuti sulla costa ligure durante un'estate che cambia tutto.",
      chapterOutlines: [
        { title: "La prima onda", summary: "Incontro casuale sulla spiaggia al tramonto con tensione immediata." },
        { title: "La prima onda", summary: "Secondo capitolo con sviluppo emotivo e scelta difficile." },
      ],
      themes: ["amore", "estate"],
      emotionalArc: "Distanza → attrazione → scelta",
    };
    const config = {
      title: "Estate",
      genre: "romance",
      language: "Italian",
      numberOfChapters: 2,
    } as BookConfig;

    const errors = validateBlueprintEditorialQuality(blueprint, config);
    expect(errors.some((e) => /titoli capitolo duplicati/i.test(e))).toBe(true);
  });

  it("validateBlueprintEditorialQuality allows scaffold subchapter beats across chapters", () => {
    const scaffoldSub = (summary: string) => ({
      title: "L'evento che sposta tutto",
      summary,
      purpose: "Evento",
    });
    const blueprint: BookBlueprint = {
      overview: "Thriller psicologico con tre atti e progressione costante verso la verità nascosta.",
      chapterOutlines: [
        { title: "La soglia", summary: "Primo shock e domanda irrisolta.", subchapters: [scaffoldSub("Primo evento")] },
        { title: "La crepa", summary: "Conseguenze emotive e pressione crescente.", subchapters: [scaffoldSub("Secondo evento")] },
      ],
      themes: ["tensione"],
      emotionalArc: "Shock → pressione → verità",
    };
    const config = {
      title: "Soglia",
      genre: "thriller",
      language: "Italian",
      numberOfChapters: 2,
      subchaptersEnabled: true,
      subchaptersPerChapter: 1,
    } as BookConfig;

    const errors = validateBlueprintEditorialQuality(blueprint, config);
    expect(errors.some((e) => /beat duplicato/i.test(e))).toBe(false);
  });

  it("runEditorialQualityPipelineOnChapter keeps chapter content aligned with subchapters", () => {
    const subs = [
      { title: "4.1", content: "Si passò una mano sul viso. Poi rise." },
      { title: "4.2", content: "Si passò una mano sul viso di nuovo. Il silenzio cadde." },
    ];
    const chapter = { title: "Cap 4", content: subs.map((s) => s.content).join("\n\n"), subchapters: subs };
    const result = runEditorialQualityPipelineOnChapter(chapter, {
      language: "Italian",
      chapterIndex: 3,
    });

    expect(result.chapter.content).toBe(
      result.chapter.subchapters!.map((sub) => sub.content).join("\n\n"),
    );
  });

  it("validateBlueprintEditorialQuality rejects philosophy beats on romance", () => {
    const blueprint: BookBlueprint = {
      overview: "Romance contemporaneo tra due persone che si ritrovano dopo anni.",
      chapterOutlines: [
        { title: "Il ritorno", summary: "Si rivedono per caso in città." },
        { title: "La crepa", summary: "Tradizione filosofica e implicazione esistenziale emergono nel dialogo." },
      ],
      themes: ["amore"],
      emotionalArc: "Ritorno → crepa → scelta",
    };
    const config = {
      title: "Ritorno",
      genre: "romance",
      language: "Italian",
      numberOfChapters: 2,
    } as BookConfig;

    const errors = validateBlueprintEditorialQuality(blueprint, config);
    expect(errors.some((e) => /beat filosofico/i.test(e))).toBe(true);
  });

  it("validateFrontBackMatterQuality flags duplicate synopsis across dedication and preface", () => {
    const synopsis = "Due sconosciuti si incontrano sulla costa ligure in un'estate che cambierà per sempre le loro vite.";
    const frontMatter = {
      titlePage: "Estate",
      copyright: "© 2026",
      dedication: synopsis,
      aboutAuthor: "Autore noto per narrativa contemporanea.",
      howToUse: "Leggi con calma, capitolo dopo capitolo.",
      letterToReader: `${synopsis} Spero che questa storia vi accompagni.`,
    };

    const errors = validateFrontBackMatterQuality(frontMatter, {
      kind: "front",
      synopsis,
      language: "Italian",
    });

    expect(errors.some((e) => /sinossi/i.test(e))).toBe(true);
  });
});
