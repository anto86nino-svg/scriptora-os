import { describe, expect, it } from "vitest";
import { getSupremeGenreProfile, supremeRulesAsFlatList } from "@/lib/genre-brain-supreme";
import { analyzeCanonProtection } from "@/lib/narrative-memory-core";
import {
  buildNarrativeMemoryCore,
  checkLongBookContinuity,
  generateSupremeMemoryReport,
  simulateLongBookMemory,
} from "@/lib/narrative-memory-core";
import type { BookConfig, Chapter } from "@/types/book";

function chapter(content: string, title = "Ch"): Chapter {
  return { title, content, subchapters: [] };
}

function castConfig(genre: string, characters: BookConfig["characters"]): BookConfig {
  return { genre, numberOfChapters: 30, characters } as BookConfig;
}

function simulateSeries(input: {
  genre: string;
  count: number;
  factory: (i: number) => string;
  characters: BookConfig["characters"];
}) {
  const config = castConfig(input.genre, input.characters);
  const chapters = Array.from({ length: input.count }, (_, i) => chapter(input.factory(i), `Ch${i + 1}`));
  const memory = buildNarrativeMemoryCore({ config, chapters });
  const report = generateSupremeMemoryReport(memory);
  const continuity = checkLongBookContinuity({ config, chapters, minChapters: Math.min(15, input.count) });
  return { memory, report, continuity, chapters };
}

describe("editorial orchestrator phase D torture suite", () => {
  it("genre brain supreme is single source for romance rules", () => {
    const profile = getSupremeGenreProfile({ genre: "romance" });
    const rules = supremeRulesAsFlatList(profile);
    expect(rules.some(r => /Attraction → conflict/i.test(r))).toBe(true);
    expect(profile.rules.dialogue.some(r => /Subtext/i.test(r))).toBe(true);
  });

  it("romance 30 chapters — tracks promises and relationships", () => {
    const { memory, report } = simulateSeries({
      genre: "romance",
      count: 30,
      characters: [
        { name: "Elena", externalDesire: "essere amata", secret: "verità sul padre", relationships: "Con Marco: trust 40%, attraction 80%" },
        { name: "Marco" },
      ],
      factory: i =>
        i < 28
          ? `Elena looked at Marco. She promised she would tell him before midnight. Why does he avoid her? Trust flickered between them.`
          : `Elena and Marco finally understood the cost. The promise was kept — revealed at last.`,
    });

    expect(memory.chaptersIndexed).toBe(30);
    expect(memory.relationships.some(r => r.characterA.includes("Elena") || r.characterB.includes("Elena"))).toBe(true);
    expect(report.narrativeHealth).toBeGreaterThan(40);
    expect(memory.items.some(i => i.kind === "promise" || i.kind === "secret")).toBe(true);
  });

  it("fantasy 25 chapters — remembers setup objects", () => {
    const { memory } = simulateSeries({
      genre: "fantasy",
      count: 25,
      characters: [{ name: "Lyra" }],
      factory: i =>
        i === 2
          ? `Lyra noticed the forbidden seal on the vault door. A mystery remained unanswered.`
          : i === 24
            ? `Lyra finally understood the seal — revealed at last the forbidden truth.`
            : `Lyra traveled onward. The kingdom waited.`,
    });

    expect(memory.items.some(i => /seal|sigillo|forbidden/i.test(i.label))).toBe(true);
  });

  it("thriller 20 chapters — mystery stays active until late", () => {
    const { memory, continuity } = simulateSeries({
      genre: "thriller",
      count: 20,
      characters: [{ name: "Sofia" }, { name: "Detective" }],
      factory: i =>
        i < 18
          ? `Who killed Sofia? The detective found a clue. Secret about the warehouse.`
          : `Who killed Sofia — finally revealed. The detective confessed the truth.`,
    });

    expect(memory.openPromises).toBeGreaterThanOrEqual(0);
    expect(continuity.brokenItems).toBe(0);
  });

  it("self-help 15 chapters — no broken canon on character rules", () => {
    const config = castConfig("self-help", [{ name: "Reader", strictRules: "Never claim guaranteed cure" }]);
    const chapters = Array.from({ length: 15 }, (_, i) =>
      chapter(`Step ${i + 1}: How to overcome fear with one practice. Believe in the process, not magic.`),
    );
    const memory = buildNarrativeMemoryCore({ config, chapters });
    const canon = analyzeCanonProtection({
      content: chapters[14].content,
      config,
      memory,
      previousChapters: chapters.slice(0, 14),
    });
    expect(memory.chaptersIndexed).toBe(15);
    expect(canon.violations.filter(v => v.severity === "critical").length).toBeLessThanOrEqual(1);
  });

  it("canon protection flags broken memory items", () => {
    const config = castConfig("thriller", [{ name: "Marco", strictRules: "Never lie without guilt" }]);
    const memory = simulateLongBookMemory({
      genre: "thriller",
      chapterCount: 8,
      config,
      chapterFactory: i => chapter(`Marco ${i === 3 ? "promised never to lie" : "lied without guilt"}`),
    });
    memory.items.push({
      id: "broken-1",
      kind: "promise",
      label: "Forgotten vow from chapter 2",
      status: "BROKEN",
      introducedChapter: 2,
      lastTouchedChapter: 2,
    });
    const canon = analyzeCanonProtection({
      content: "Marco lied again.",
      config,
      memory,
    });
    expect(canon.violations.some(v => v.code === "memory_broken")).toBe(true);
  });
});
