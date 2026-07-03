import { describe, expect, it } from "vitest";
import { generateTitleSubtitleOptions } from "@/lib/guided-interview/book-foundation-lock";
import { buildCompleteExpressBookPackage } from "@/lib/guided-interview/express-book-package";
import { buildFallbackBlueprintFromConfig } from "@/lib/blueprint-recovery";
import { validateBlueprintEntityCoverage } from "@/lib/blueprint-entity-enrichment";
import { isInvalidGeneratedTitle } from "@/lib/title-intelligence-validation";
import { isGenericNarrativePromise } from "@/lib/narrative-promise-intelligence";
import { buildTitleV2Pipeline, extractDistinctiveTitleElements } from "@/lib/title-intelligence-v2";
import { analyzeSubchapterContinuity } from "@/lib/writer/subchapter-continuity-engine";
import { applyBookKernelToConfig } from "@/lib/book-intelligence";
import type { BookConfig } from "@/types/book";

const STATION_IDEA = `Ogni notte alle 03:17 una stazione ferroviaria abbandonata compare per sette minuti tra due gallerie inesistenti.
Elia trova una fotografia della madre con scritto:
"Non lasciare che io salga sul treno."
Fotografie che cambiano.
Ricordi che si riscrivono.
Donna vestita di nero.
Persone cancellate dall'esistenza.`;

const CUSTODE_IDEA = `Il Custode delle Chiavi Perdute.
Protagonista: Arturo Valli.
Personaggio chiave: Nora.
Concept centrale: una bottega delle chiavi perdute custodisce chiavi delle scelte non compiute.
Una chiave dal futuro costringe Arturo a scegliere tra destino e libero arbitrio.`;

const ULTIMATE_CUSTODE_IDEA = `Arturo Valli gestisce una piccola bottega di chiavi nel centro storico di Ferrara.
Una notte trova una chiave senza serratura.
La chiave porta inciso: "NON APRIRE LA PORTA DEL 17 OTTOBRE".
Il problema è che la data appartiene al futuro.
Pochi giorni dopo entra in negozio Nora Bellini.
Nora sostiene di aver già conosciuto Arturo.
Arturo è certo che sia impossibile.
Nel corso della storia scoprirà che alcune chiavi aprono eventi, alcune chiavi aprono ricordi e alcune chiavi aprono possibilità mai vissute.
Ogni volta che una chiave viene usata, una parte della realtà cambia.
Alla fine Arturo dovrà scegliere: salvare Nora oppure preservare la linea temporale.
Oggetti canonici: Chiave del 17 Ottobre, Registro delle Chiavi.
Concetti canonici: libero arbitrio, destino, memoria, linea temporale.`;

const ULTIMATE_FORBIDDEN_RE =
  /\b(vampiri?|lupi\s+mannari|draghi?|profezi(?:a|e)|sceriffi?|regine|accademie\s+magiche|demoni|guerre\s+fantasy|castelli\s+fantasy)\b|citt[aà]\s+nel\s+ghiaccio|\bre\b/i;

const expressInput = {
  bookFormat: "novel" as const,
  genre: "horror",
  language: "Italiano",
  titleMode: "suggest" as const,
  ideaSeed: STATION_IDEA,
  tone: "inquietante",
  length: "medio" as const,
  controlLevel: "scenarios" as const,
};

describe("Blueprint Intelligence Recovery — 03:17 station regression", () => {
  it("rejects truncated idea-prefix titles", () => {
    expect(isInvalidGeneratedTitle("Ogni Notte Alle 03:17 Una", STATION_IDEA)).toBe(true);
    expect(isInvalidGeneratedTitle("Ogni notte alle 03:17 una stazione fer", STATION_IDEA)).toBe(true);
  });

  it("generates entity-aware titles from the station idea", () => {
    const options = generateTitleSubtitleOptions({
      genre: "horror",
      language: "Italiano",
      ideaSeed: STATION_IDEA,
      tone: "inquietante",
      lengthPreset: "medio",
    });
    expect(options).toHaveLength(3);
    for (const option of options) {
      expect(isInvalidGeneratedTitle(option.title, STATION_IDEA)).toBe(false);
      expect(option.title).not.toMatch(/^Ogni Notte Alle 03:17 Una$/i);
    }
    const joined = options.map((o) => o.title).join(" ").toLowerCase();
    expect(joined).toMatch(/stazione|treno|fotograf|03:17|elia|madre/i);
  });

  it("builds a specific narrative promise instead of generic horror template", () => {
    const pkg = buildCompleteExpressBookPackage(expressInput, "commercial");
    expect(isGenericNarrativePromise(pkg.marketPromise)).toBe(false);
    expect(pkg.marketPromise.toLowerCase()).toMatch(/elia|stazione|03:17|fotograf|treno|madre|memor/i);
  });

  it("fallback blueprint anchors every chapter to idea entities", () => {
    const config = applyBookKernelToConfig({
      title: "La Stazione delle 03:17",
      subtitle: "Non salire sul treno",
      idea: STATION_IDEA,
      genre: "horror",
      language: "Italian",
      tone: "inquietante",
      numberOfChapters: 12,
      bookLength: "medium",
      chapterLength: "medium",
      authorStyle: "Cinematografico",
      category: "Fiction",
      subcategory: "Horror",
      subchaptersEnabled: false,
      characters: [{ name: "Elia", role: "protagonist" }],
    } as BookConfig);

    const blueprint = buildFallbackBlueprintFromConfig(config);
    const coverage = validateBlueprintEntityCoverage(blueprint, STATION_IDEA, [
      "stazione",
      "fotografia",
      "madre",
      "treno",
      "donna",
      "memoria",
    ]);
    expect(coverage.pass, `Missing entities: ${coverage.missing.join(", ")}`).toBe(true);
    expect(blueprint.chapterOutlines.some((o) => /normalità|crepa|escalation/i.test(o.title))).toBe(false);
  });
});

describe("Blueprint Intelligence Recovery — concept dominance from end-to-end test", () => {
  it("keeps Arturo, Nora and the lost-key concept in fallback blueprint coverage", () => {
    const config = applyBookKernelToConfig({
      title: "Il Custode delle Chiavi Perdute",
      subtitle: "",
      idea: CUSTODE_IDEA,
      genre: "fantasy",
      language: "Italian",
      tone: "poetico e misterioso",
      numberOfChapters: 10,
      bookLength: "medium",
      chapterLength: "medium",
      authorStyle: "fiabesco contemporaneo",
      category: "Fiction",
      subcategory: "Fantasy",
      subchaptersEnabled: true,
      subchaptersPerChapter: 3,
      characters: [
        { name: "Arturo", role: "protagonist" },
        { name: "Nora", role: "key character" },
      ],
    } as BookConfig);

    const blueprint = buildFallbackBlueprintFromConfig(config);
    const coverage = validateBlueprintEntityCoverage(blueprint, CUSTODE_IDEA, [
      "Arturo",
      "Nora",
      "bottega",
      "chiavi",
      "scelte",
      "futuro",
      "libero arbitrio",
    ]);

    expect(coverage.pass, `Missing entities: ${coverage.missing.join(", ")}`).toBe(true);
    expect(JSON.stringify(blueprint)).not.toMatch(/Noemi|Nico|Sara|sceriffo|citt[aà] nel ghiaccio/i);
  });

  it("does not promote descriptive key fragments into title entities", () => {
    const idea = `${CUSTODE_IDEA} La chiave appartiene a una scelta mai compiuta. La chiave compare misteriosamente nella bottega.`;
    const elements = extractDistinctiveTitleElements({ idea, genre: "fantasy", language: "Italian" });
    const labels = elements.map((element) => element.text).join(" ");
    const pipeline = buildTitleV2Pipeline({ idea, genre: "fantasy", language: "Italian" });
    const winnerText = `${pipeline.finalists[0]?.title || ""} ${pipeline.finalists[0]?.subtitle || ""}`;

    expect(labels).toMatch(/Bottega delle Chiavi Perdute|Chiavi delle Scelte Non Compiute|Chiave dal Futuro|Libero Arbitrio/i);
    expect(labels).not.toMatch(/Chiave Appartiene|Chiave Compare/i);
    expect(winnerText).toMatch(/bottega|chiavi|scelte|futuro|libero arbitrio/i);
    expect(winnerText).not.toMatch(/Chiave Appartiene|Chiave Compare/i);
  });

  it("flags subchapters that repeat the same scene without new progression", () => {
    const analysis = analyzeSubchapterContinuity({
      subchapters: [
        {
          title: "La bottega delle chiavi perdute",
          summary: "Arturo e Nora osservano la chiave dal futuro nella bottega.",
          content: "Arturo resta nella bottega delle chiavi perdute con Nora. La chiave dal futuro vibra sul banco. Parlano di destino, libero arbitrio e scelte non compiute, ma nessuno agisce.",
        },
        {
          title: "Ancora davanti alla chiave",
          summary: "Arturo e Nora restano nella stessa bottega davanti alla chiave dal futuro.",
          content: "Arturo resta nella stessa bottega delle chiavi perdute con Nora. La chiave dal futuro vibra ancora sul banco. Tornano a parlare di destino, libero arbitrio e scelte non compiute senza cambiare obiettivo.",
        },
        {
          title: "La scelta rimandata",
          summary: "Arturo e Nora continuano a fissare la chiave.",
          content: "Nella bottega delle chiavi perdute Arturo e Nora fissano la chiave dal futuro. Il discorso torna sulle scelte non compiute e sul libero arbitrio, ma la scena rimane ferma.",
        },
      ],
    });

    expect(analysis.errors.some((error) => error.category === "progression" && error.severity === "critical")).toBe(true);
    expect(analysis.score).toBeLessThan(80);
  });

  it("passes the ultimate Arturo/Nora temporal-key coherence stress test through blueprint, index, subchapters and export text", () => {
    const config = applyBookKernelToConfig({
      title: "Il Custode Delle Chiavi Perdute",
      subtitle: "La chiave del futuro che puo riscrivere ogni scelta",
      idea: ULTIMATE_CUSTODE_IDEA,
      genre: "Thriller soprannaturale psicologico",
      subgenre: "Mystery temporale",
      language: "Italian",
      tone: "oscuro, psicologico, temporale",
      numberOfChapters: 20,
      bookLength: "long",
      chapterLength: "medium",
      authorStyle: "teso e cinematografico",
      category: "Fiction",
      subcategory: "Mystery temporale",
      bookFormat: "novel",
      subchaptersEnabled: true,
      subchaptersPerChapter: 3,
      characters: [
        { name: "Arturo Valli", role: "protagonist" },
        { name: "Nora Bellini", role: "key character" },
      ],
    } as BookConfig);

    const blueprint = buildFallbackBlueprintFromConfig(config);
    const serializedBlueprint = JSON.stringify(blueprint);
    const exportText = blueprint.chapterOutlines
      .map((chapter, index) => [
        `Capitolo ${index + 1}: ${chapter.title}`,
        chapter.summary,
        ...(chapter.subchapters || []).map((sub, subIndex) => `${index + 1}.${subIndex + 1} ${sub.title}\n${sub.summary}`),
      ].join("\n"))
      .join("\n\n");

    const coverage = validateBlueprintEntityCoverage(blueprint, ULTIMATE_CUSTODE_IDEA, [
      "Arturo",
      "Nora",
      "Ferrara",
      "Bottega delle Chiavi Perdute",
      "Chiave del 17 Ottobre",
      "Registro delle Chiavi",
      "libero arbitrio",
      "destino",
      "memoria",
      "linea temporale",
    ]);

    expect(coverage.pass, `Missing entities: ${coverage.missing.join(", ")}`).toBe(true);
    expect(blueprint.chapterOutlines).toHaveLength(20);
    expect(serializedBlueprint).not.toMatch(ULTIMATE_FORBIDDEN_RE);
    expect(exportText).not.toMatch(ULTIMATE_FORBIDDEN_RE);
    expect(exportText).toMatch(/Arturo|Nora|Ferrara|Bottega delle Chiavi Perdute|Chiave del 17 Ottobre|Registro delle Chiavi/i);
    expect(exportText).toMatch(/libero arbitrio|destino|memoria|linea temporale/i);
    const subchapterTitles = blueprint.chapterOutlines.flatMap((chapter) => (chapter.subchapters || []).map((sub) => sub.title));
    expect(new Set(subchapterTitles).size).toBeGreaterThan(12);

    for (const [index, chapter] of blueprint.chapterOutlines.entries()) {
      const chapterText = `${chapter.title} ${chapter.summary}`;
      expect(chapterText, `chapter ${index + 1}`).toMatch(/Arturo|Nora|Ferrara|Bottega|Chiave|Registro|17 ottobre|linea temporale|memoria|destino|libero arbitrio/i);
      expect(chapter.subchapters, `chapter ${index + 1} subchapters`).toHaveLength(3);
      for (const sub of chapter.subchapters || []) {
        const subText = `${sub.title} ${sub.summary}`;
        expect(subText).not.toMatch(/apertura|pressione|svolta\/scelta|placeholder/i);
        expect(subText).toMatch(/trova|evento|scopr|entra|consulta|capisc|conflitto|cambia|cerca|porta|altera|mostra|decid|scegl|conseguenza|ostacolo|obiettivo|complica|ribaltamento|confronto/i);
      }
    }
  });
});
