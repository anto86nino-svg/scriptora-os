import { describe, expect, it } from "vitest";
import type { BookBlueprint, BookConfig } from "@/types/book";
import { buildFallbackBlueprintFromConfig } from "@/lib/blueprint-recovery";
import { applyBookKernelToConfig, resolveBookKernel, validateFormatCoherence, type BookFormat } from "@/lib/book-intelligence";
import { buildBlueprintPreviewProject, selectContinuityProject } from "@/lib/project-continuity";
import { detectViewportClass } from "@/lib/adaptive-viewport-engine";

type CertificationBenchmark = {
  id: string;
  title: string;
  idea: string;
  genre: string;
  subgenre?: string;
  category: string;
  bookFormat: string;
  chapters: number;
  expectedFormat: BookFormat;
  mustContain: RegExp[];
  mustNotContain: RegExp;
};

const THRILLER_FORBIDDEN =
  /\b(vampiri?|lupi\s+mannari|draghi?|profezi(?:a|e)|sceriffi?|regine|accademie\s+magiche|demoni|guerre\s+fantasy|castelli\s+fantasy)\b|citt[aà]\s+nel\s+ghiaccio|\bre\b/i;

const FICTION_FORBIDDEN_FANTASY = /\bsmartphone|polizia scientifica|serial killer|detective moderno|startup|email|social media\b/i;
const ROMANCE_FORBIDDEN = /\b(vampir|demoni|omicid|serial killer|possessione|maledizione|cadaveri?|indagine criminale)\b/i;
const HORROR_FORBIDDEN = /\b(draghi?|regni?|re\b|regine|accademie magiche|slow burn|friends to lovers|bacio proibito)\b/i;
const NONFICTION_FORBIDDEN = /\bprotagonist[ao]|antagonist[ao]|trama|scene|dialogh[io]|cast|villain|eroe\b/i;

const BENCHMARKS: CertificationBenchmark[] = [
  {
    id: "thriller-temporale",
    title: "Il Custode Delle Chiavi Perdute",
    idea: `Arturo Valli gestisce una piccola bottega di chiavi nel centro storico di Ferrara.
Nella Bottega delle Chiavi Perdute trova la Chiave del 17 Ottobre e il Registro delle Chiavi.
Nora Bellini sostiene di aver gia conosciuto Arturo.
Alcune chiavi aprono eventi, ricordi e possibilita mai vissute.
Ogni uso altera memoria, destino, libero arbitrio e linea temporale.`,
    genre: "Thriller soprannaturale psicologico",
    subgenre: "Mystery temporale",
    category: "Fiction",
    bookFormat: "novel",
    chapters: 20,
    expectedFormat: "novel",
    mustContain: [/Arturo/i, /Nora/i, /Ferrara/i, /Bottega delle Chiavi Perdute/i, /Chiave del 17 Ottobre/i, /Registro delle Chiavi/i, /libero arbitrio/i, /memoria/i, /destino/i, /linea temporale/i],
    mustNotContain: THRILLER_FORBIDDEN,
  },
  {
    id: "horror-psicologico",
    title: "Le Lettere Dopo La Morte",
    idea: "Una donna riceve lettere scritte da se stessa dopo la propria morte. Ogni lettera anticipa una stanza della casa e una verita che non vuole ricordare.",
    genre: "horror",
    subgenre: "horror psicologico",
    category: "Fiction",
    bookFormat: "novel",
    chapters: 12,
    expectedFormat: "novel",
    mustContain: [/lettere/i, /morte/i, /casa|stanza/i, /ricord|memoria/i],
    mustNotContain: HORROR_FORBIDDEN,
  },
  {
    id: "fantasy-epico",
    title: "L'Ultimo Custode Delle Stelle",
    idea: "Fantasy epico in un impero diviso tra casate astrali. L'ultimo custode delle stelle protegge regole di magia celeste, alleanze politiche e una mappa del cielo proibita.",
    genre: "fantasy",
    subgenre: "epic fantasy",
    category: "Fiction",
    bookFormat: "novel",
    chapters: 16,
    expectedFormat: "novel",
    mustContain: [/custode/i, /stelle|astral|cielo/i, /magia/i, /casate|alleanze|politic/i],
    mustNotContain: FICTION_FORBIDDEN_FANTASY,
  },
  {
    id: "romance",
    title: "Un Giorno Prima Di Noi",
    idea: "Romance contemporaneo su due adulti che si ritrovano un giorno prima di una scelta irreversibile. La relazione evolve tra desiderio, ferite emotive e payoff sentimentale.",
    genre: "romance",
    subgenre: "contemporary romance",
    category: "Fiction",
    bookFormat: "novel",
    chapters: 12,
    expectedFormat: "novel",
    mustContain: [/relazione|desiderio|ferite emotive|sentimental/i, /scelta irreversibile/i],
    mustNotContain: ROMANCE_FORBIDDEN,
  },
  {
    id: "self-help",
    title: "La Vita Che Rimandi Sempre",
    idea: "Self help pratico su procrastinazione, disciplina, obiettivi, mentalita e crescita personale con strategie, framework ed esempi applicabili.",
    genre: "self-help",
    subgenre: "procrastinazione / crescita personale",
    category: "Self Help",
    bookFormat: "self_help",
    chapters: 10,
    expectedFormat: "self_help",
    mustContain: [/framework|metodo|strategie|esercizi|pratica/i, /crescita personale|obiettivi|disciplina|procrastinazione/i],
    mustNotContain: NONFICTION_FORBIDDEN,
  },
  {
    id: "memoir",
    title: "Mio Padre Non Mi Ha Mai Insegnato Ad Andare In Bicicletta",
    idea: "Memoir autobiografico: il rapporto con mio padre, la bicicletta mai imparata, memoria familiare, esperienza personale e riflessione adulta.",
    genre: "memoir",
    subgenre: "memoir familiare",
    category: "Non-Fiction",
    bookFormat: "memoir",
    chapters: 10,
    expectedFormat: "memoir",
    mustContain: [/memoria|memoir|autobiograf|esperienza personale|padre|bicicletta/i, /riflessione|verita|voce/i],
    mustNotContain: /\bdraghi?|magia|regno|serial killer|investigatore|trama fantasy\b/i,
  },
  {
    id: "business",
    title: "Costruire Un'Azienda Da Zero",
    idea: "Business book su modelli, processi, casi studio, strategia, validazione mercato, team, KPI e crescita sostenibile da zero.",
    genre: "business",
    subgenre: "startup strategy",
    category: "Business",
    bookFormat: "business_book",
    chapters: 10,
    expectedFormat: "business_book",
    mustContain: [/modelli|processi|casi|strategia|KPI|mercato/i, /business|azienda|team|crescita/i],
    mustNotContain: NONFICTION_FORBIDDEN,
  },
  {
    id: "workbook",
    title: "90 Giorni Per Cambiare Vita",
    idea: "Workbook operativo di 90 giorni con esercizi, schede, attivita, tracker di progresso, riflessioni guidate e verifiche settimanali.",
    genre: "workbook",
    subgenre: "crescita personale operativa",
    category: "Workbook",
    bookFormat: "workbook",
    chapters: 9,
    expectedFormat: "workbook",
    mustContain: [/esercizi|schede|attivita|tracker|progresso|verific/i],
    mustNotContain: NONFICTION_FORBIDDEN,
  },
  {
    id: "poetry",
    title: "Le Cose Che Non Ho Detto Al Mare",
    idea: "Raccolta poetica sul mare, sulle cose non dette, memoria, assenza, sezioni poetiche, voce lirica e immagini ricorrenti.",
    genre: "poetry",
    subgenre: "poesia contemporanea",
    category: "Poesia",
    bookFormat: "poetry_collection",
    chapters: 6,
    expectedFormat: "poetry_collection",
    mustContain: [/poetic|poesia|poetica|voce lirica|immagini ricorrenti|mare/i, /sezione|parte/i],
    mustNotContain: /\bprotagonist[ao]|antagonist[ao]|cast|trama|indagine|missione|dialogh[io]\b/i,
  },
  {
    id: "cookbook",
    title: "La Cucina Siciliana Delle Nonne",
    idea: "Cookbook di cucina siciliana delle nonne con ricette, ingredienti, preparazione, varianti, tecniche tradizionali e menu familiari.",
    genre: "cookbook",
    subgenre: "cucina siciliana",
    category: "Cookbook",
    bookFormat: "cookbook",
    chapters: 10,
    expectedFormat: "cookbook",
    mustContain: [/ricette|ingredienti|preparazione|varianti|cucina|menu/i, /sicilian|nonne|tradizional/i],
    mustNotContain: NONFICTION_FORBIDDEN,
  },
];

function makeConfig(benchmark: CertificationBenchmark): BookConfig {
  return applyBookKernelToConfig({
    title: benchmark.title,
    subtitle: "",
    idea: benchmark.idea,
    genre: benchmark.genre,
    subgenre: benchmark.subgenre,
    category: benchmark.category,
    subcategory: benchmark.subgenre || benchmark.category,
    bookFormat: benchmark.bookFormat,
    bookTypeId: benchmark.bookFormat,
    language: "Italian",
    tone: benchmark.expectedFormat === "novel" ? "coerente con il genere" : "chiaro e professionale",
    authorStyle: "editoriale",
    chapterLength: "medium",
    bookLength: benchmark.chapters >= 16 ? "long" : "medium",
    numberOfChapters: benchmark.chapters,
    subchaptersEnabled: true,
    subchaptersPerChapter: 3,
    characters: benchmark.expectedFormat === "novel" ? [{ name: benchmark.title, role: "concept lock" }] : [],
  } as BookConfig);
}

function exportBlueprintText(config: BookConfig, blueprint: BookBlueprint): string {
  const sectionLabel = String(config.bookFormat || "").toLowerCase() === "poetry_collection" ? "Parte" : "Capitolo";
  return [
    config.title,
    config.genre,
    config.subgenre,
    config.bookFormat,
    blueprint.overview,
    ...(blueprint.themes || []),
    blueprint.emotionalArc,
    ...blueprint.chapterOutlines.flatMap((chapter, index) => [
      `${sectionLabel} ${index + 1}: ${chapter.title}`,
      chapter.summary,
      ...(chapter.subchapters || []).flatMap((sub, subIndex) => [
        `${index + 1}.${subIndex + 1} ${sub.title}`,
        sub.summary,
      ]),
    ]),
  ].filter(Boolean).join("\n");
}

function certifyBenchmark(benchmark: CertificationBenchmark): void {
  const config = makeConfig(benchmark);
  const kernel = resolveBookKernel({ config });
  const blueprint = buildFallbackBlueprintFromConfig(config);
  const exportText = exportBlueprintText(config, blueprint);
  const coherence = validateFormatCoherence(config, blueprint);

  expect(kernel.bookFormat, benchmark.id).toBe(benchmark.expectedFormat);
  expect(coherence.passed, `${benchmark.id}: ${coherence.issues.map((issue) => issue.message).join("; ")}`).toBe(true);
  expect(blueprint.chapterOutlines, benchmark.id).toHaveLength(benchmark.chapters);
  expect(exportText, benchmark.id).not.toMatch(benchmark.mustNotContain);
  for (const required of benchmark.mustContain) {
    expect(exportText, `${benchmark.id}: missing ${required}`).toMatch(required);
  }
  if (benchmark.expectedFormat === "poetry_collection") {
    expect(kernel.requiresPoems, benchmark.id).toBe(true);
    expect(exportText, benchmark.id).not.toMatch(/\bCapitolo\s+\d+\b/i);
    expect(blueprint.chapterOutlines.every((chapter) => /parte|sezione|movimento/i.test(chapter.title))).toBe(true);
  } else {
    for (const chapter of blueprint.chapterOutlines) {
      expect(chapter.subchapters, `${benchmark.id}: subchapters for ${chapter.title}`).toHaveLength(3);
    }
  }

  const project = buildBlueprintPreviewProject({ config, blueprint, projectId: `cert-${benchmark.id}`, sourceTool: "master-certification", planId: "studio" });
  const rehydrated = JSON.parse(JSON.stringify(project));
  expect(selectContinuityProject([rehydrated], { lastProjectId: project.id })?.id).toBe(project.id);
  expect(exportBlueprintText(rehydrated.config, rehydrated.blueprint)).toContain(benchmark.title);
}

describe("Scriptora Master Certification Suite", () => {
  it.each(BENCHMARKS.map((benchmark) => [benchmark.id, benchmark] as const))(
    "certifies %s through blueprint, index, subchapters, persistence and export",
    (_id, benchmark) => {
      certifyBenchmark(benchmark);
    },
  );

  it("keeps required viewport classes for certification widths", () => {
    expect(detectViewportClass(320)).toBe("mobile-sm");
    expect(detectViewportClass(375)).toBe("mobile-sm");
    expect(detectViewportClass(390)).toBe("mobile");
    expect(detectViewportClass(414)).toBe("mobile");
    expect(detectViewportClass(820)).toBe("tablet");
  });
});
