import { describe, expect, it } from "vitest";
import { generateTitleSubtitleOptions } from "@/lib/guided-interview/book-foundation-lock";
import { buildCompleteExpressBookPackage } from "@/lib/guided-interview/express-book-package";
import { buildFallbackBlueprintFromConfig } from "@/lib/blueprint-recovery";
import { validateBlueprintEntityCoverage } from "@/lib/blueprint-entity-enrichment";
import { isInvalidGeneratedTitle } from "@/lib/title-intelligence-validation";
import { isGenericNarrativePromise } from "@/lib/narrative-promise-intelligence";
import { applyBookKernelToConfig } from "@/lib/book-intelligence";
import type { BookConfig } from "@/types/book";

const STATION_IDEA = `Ogni notte alle 03:17 una stazione ferroviaria abbandonata compare per sette minuti tra due gallerie inesistenti.
Elia trova una fotografia della madre con scritto:
"Non lasciare che io salga sul treno."
Fotografie che cambiano.
Ricordi che si riscrivono.
Donna vestita di nero.
Persone cancellate dall'esistenza.`;

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
