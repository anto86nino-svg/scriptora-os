import { describe, expect, it } from "vitest";
import {
  buildChapterForbiddenPatterns,
  buildChapterWritingPlan,
  buildChapterWritingPlanPromptBlock,
  buildGenreAntiClicheRules,
  detectChapterClicheViolations,
} from "./chapter-writing-director";
import { reduceAiRepetitionPatterns } from "@/lib/manuscript/manuscript-integrity-guard";
import type { BookBlueprint, BookConfig } from "@/types/book";

const fantasyConfig: BookConfig = {
  title: "Radici di Cenere",
  subtitle: "",
  idea:
    "Elena scopre che le vene sotto la pelle disegnano radici verso Luca quando la magia risponde al villaggio di Selva Nera, non a lei.",
  language: "Italian",
  genre: "fantasy",
  category: "Fiction",
  subcategory: "Epic Fantasy",
  subgenre: "dark fantasy village",
  tone: "tensione lirica",
  authorStyle: "Autorevole",
  chapterLength: "medium",
  bookLength: "medium",
  numberOfChapters: 12,
  subchaptersEnabled: false,
  characters: [
    {
      name: "Elena",
      role: "Protagonista",
      wound: "Colpa per il fuoco che ha quasi ucciso il fratello",
      externalDesire: "Capire cosa le fa al corpo la magia",
      internalNeed: "Non perdere controllo di sé",
      secret: "Temeva che Luca sapesse la verità",
    },
    {
      name: "Kael",
      role: "Antagonista",
      wound: "Ha giurato di non rivelare ciò che protegge il villaggio",
      externalDesire: "Impedire che Elena corra verso il fratello",
      secret: "Conosce il prezzo del sigillo meglio di chi lo porta",
    },
  ],
} as BookConfig;

const fantasyBlueprint: BookBlueprint = {
  overview: "Fantasy dark con magia corporale",
  themes: ["controllo", "colpa", "desiderio"],
  emotionalArc: "Da negazione a scelta costosa",
  chapterOutlines: Array.from({ length: 12 }, (_, i) => ({
    title: i === 0 ? "La radura che ascolta" : `Atto ${i + 1}`,
    summary:
      i === 0
        ? "Elena entra nella radura di Selva Nera e la magia le risponde nel corpo prima che lei scelga."
        : `Escalation ${i + 1}`,
    purpose: i === 0 ? "Far pagare subito un costo fisico alla magia" : undefined,
  })),
};

describe("buildChapterWritingPlan", () => {
  it("produces non-generic worldSpecificity for fantasy", () => {
    const plan = buildChapterWritingPlan(fantasyConfig, fantasyBlueprint, 0, []);
    expect(plan.worldSpecificity).toHaveLength(3);
    const joined = plan.worldSpecificity.join(" ").toLowerCase();
    expect(joined).not.toBe("foresta proibita");
    expect(joined).toMatch(/selva|radic|elena|corpo|villaggio|dettaglio/);
  });

  it("includes chapterPurpose, subtext, forbiddenPhrases, endingHook in prompt block", () => {
    const plan = buildChapterWritingPlan(fantasyConfig, fantasyBlueprint, 0, []);
    const block = buildChapterWritingPlanPromptBlock(plan);
    expect(block).toContain("chapterPurpose:");
    expect(block).toContain("subtext:");
    expect(block).toContain("forbiddenPhrases");
    expect(block).toContain("endingHook:");
    expect(block).toContain("annuì");
    expect(block).toContain("DIALOGUE RULES");
    expect(block).toContain("Se ti dico cos'è");
  });

  it("antiClicheRules ban generic sigillo/foresta/mantello", () => {
    const rules = buildGenreAntiClicheRules(fantasyConfig);
    const joined = rules.join(" ").toLowerCase();
    expect(joined).toContain("foresta proibita");
    expect(joined).toContain("sigillo antico");
    expect(joined).toContain("mantello");
    expect(joined).toContain("costo");
  });

  it("forbidden patterns include fantasy clichés", () => {
    const patterns = buildChapterForbiddenPatterns(fantasyConfig);
    expect(patterns).toContain("foresta proibita");
    expect(patterns).toContain("sigillo antico");
    expect(patterns).toContain("annuì");
  });
});

describe("post-generation cliché checks", () => {
  it("flags magic sigillo without cost", () => {
    const plan = buildChapterWritingPlan(fantasyConfig, fantasyBlueprint, 0, []);
    const violations = detectChapterClicheViolations(
      "Il sigillo antico si risvegliò dentro di lei senza spiegazione.",
      plan,
    );
    expect(violations.some((v) => v.type === "magic_without_cost" || v.type === "forbidden_phrase")).toBe(true);
  });

  it("allows sigillo when cost is present", () => {
    const plan = buildChapterWritingPlan(fantasyConfig, fantasyBlueprint, 0, []);
    const violations = detectChapterClicheViolations(
      "Le vene sotto il polso si disposero in radici, e ogni radice bruciava come un prezzo che il corpo le faceva pagare.",
      plan,
    );
    expect(violations.filter((v) => v.type === "magic_without_cost")).toHaveLength(0);
  });

  it("flags dialogue infodump", () => {
    const plan = buildChapterWritingPlan(fantasyConfig, fantasyBlueprint, 0, []);
    const violations = detectChapterClicheViolations(
      'Kael disse: "La magia è corrotta e tuo fratello è in pericolo."',
      plan,
    );
    expect(violations.some((v) => v.type === "dialogue_infodump")).toBe(true);
  });

  it("reduces annuì to at most one per chapter", () => {
    const input = "Kael annuì. Elena annuì lentamente. Poi Kael annuì di nuovo.";
    const { content } = reduceAiRepetitionPatterns(input, { chapterLength: "medium" });
    expect((content.match(/annu[iì]/gi) || []).length).toBeLessThanOrEqual(1);
  });
});

describe("specificity example direction", () => {
  it("plan forbids generic awakening phrasing implicitly via rules", () => {
    const plan = buildChapterWritingPlan(fantasyConfig, fantasyBlueprint, 0, []);
    expect(plan.antiClicheRules.some((r) => /sigillo|magia|costo/i.test(r))).toBe(true);
    expect(plan.revelation).not.toMatch(/^Develop chapter/i);
  });
});
