import { describe, expect, it } from "vitest";
import { buildFallbackBlueprintFromConfig } from "@/lib/blueprint-recovery";
import { buildFormatAwareChapterScaffold } from "@/lib/blueprint-entity-enrichment";
import {
  buildHorrorStationChapterTitles,
  buildCookbookChapterTitles,
  expandChapterScaffold,
  isForbiddenFantasyTitlePattern,
  resolveConceptDominance,
} from "@/lib/concept-dominance";
import { resolveChapterTitle } from "@/lib/chapter-titles";
import {
  ensureNarrativeSubchapterOutlines,
  validateSubchapterOutline,
} from "@/lib/writer/subchapter-pipeline";

const SPOSTATI_IDEA =
  "Romanzo contemporaneo emozionale con amore maturo, destino, memoria e scelte irreversibili tra due persone che si ritrovano dopo anni.";

const SPOSTATI_CONFIG = {
  title: "Spostati di un secondo",
  subtitle: "",
  genre: "philosophy",
  category: "Fiction",
  subcategory: "Literary",
  subgenre: "Romance emozionale maturo",
  bookTypeId: "literary",
  language: "Italian",
  tone: "intimo e maturo",
  idea: SPOSTATI_IDEA,
  numberOfChapters: 12,
  subchaptersEnabled: true,
  subchaptersPerChapter: 3,
  bookLength: "medium",
} as const;

const FANTASY_MARKERS = /porta|custod\w*|corona|ghiaccio|mille\s+anni|patto\s+spezzato/i;

describe("Spostati di un secondo — literary romance regression", () => {
  it("does not scaffold fantasy chapter titles for literary romance", () => {
    const scaffold = buildFormatAwareChapterScaffold(SPOSTATI_IDEA, 12, {
      genre: SPOSTATI_CONFIG.genre,
      subcategory: SPOSTATI_CONFIG.subcategory,
      subgenre: SPOSTATI_CONFIG.subgenre,
      bookTypeId: SPOSTATI_CONFIG.bookTypeId,
    });

    expect(scaffold.length).toBeGreaterThan(0);
    const titles = scaffold.map((beat) => beat.title).join(" ");
    expect(titles).not.toMatch(FANTASY_MARKERS);
    expect(titles).toMatch(/secondo|distanza|passato|appuntamento|scelta|silenzio/i);
  });

  it("rejects fantasy title patterns when resolving chapter titles", () => {
    const forbidden = resolveChapterTitle("La Porta", 0, {
      config: SPOSTATI_CONFIG,
      summary: SPOSTATI_IDEA,
    });
    expect(forbidden).not.toMatch(FANTASY_MARKERS);
    expect(forbidden).toMatch(/secondo|distanza|passato|appuntamento|scelta/i);
  });

  it("builds blueprint fallback without fantasy contamination", () => {
    const blueprint = buildFallbackBlueprintFromConfig(SPOSTATI_CONFIG as any);
    const titles = blueprint.chapterOutlines.map((outline) => outline.title).join(" ");
    expect(titles).not.toMatch(FANTASY_MARKERS);
  });

  it("creates distinct narrative subchapter purpose labels", () => {
    const subs = ensureNarrativeSubchapterOutlines([], SPOSTATI_IDEA, 3, SPOSTATI_CONFIG as any);
    const validation = validateSubchapterOutline(subs);
    expect(validation.valid).toBe(true);
    expect(subs.map((sub) => sub.purpose)).toEqual(["Evento", "Conseguenza", "Decisione"]);
    expect(subs.map((sub) => sub.title).join(" ")).not.toMatch(/\b(apertura|pressione|payoff)\b/i);
  });

  it("keeps concept dominance on literary romance with fantasy templates blocked", () => {
    const dominance = resolveConceptDominance(SPOSTATI_IDEA, {
      genre: "philosophy",
      tags: "Literary Romance emozionale maturo",
    });
    expect(dominance.blockFantasyTemplates).toBe(true);
    expect(dominance.genre).not.toBe("fantasy");
  });
});

describe("horror/fantasy/cookbook regressions", () => {
  it("still expands horror station scaffold", () => {
    const horrorIdea =
      "Stazione ferroviaria abbandonata alle 03:17, fotografia della madre, treno che non dovrebbe esistere.";
    const expanded = expandChapterScaffold(buildHorrorStationChapterTitles(horrorIdea), 8, horrorIdea, "horror_station");
    expect(expanded.length).toBe(8);
    expect(expanded.map((beat) => beat.title).join(" ")).toMatch(/visione|stazione|treno|fotograf|03:17/i);
  });

  it("still flags canonical fantasy title patterns", () => {
    expect(isForbiddenFantasyTitlePattern("Corona di Cenere")).toBe(true);
    expect(isForbiddenFantasyTitlePattern("Il secondo che cambia tutto")).toBe(false);
  });

  it("still expands cookbook scaffold", () => {
    const expanded = expandChapterScaffold(buildCookbookChapterTitles(), 8, "ricette mediterranee", "cookbook");
    expect(expanded.length).toBe(8);
    expect(expanded.map((beat) => beat.title).join(" ")).toMatch(/ricett|menu|ingredienti/i);
  });
});
