import { describe, expect, it } from "vitest";
import {
  StoryConstitutionEngine,
  runStoryConstitutionAnalysis,
  runEditorialPassSupreme,
  runNarrativeDirectorV2,
  runReaderSimulationEngine,
  evaluateGenreTruthLock,
  evaluatePayoffEngine,
  evaluateCharacterEvolutionLock,
  buildStoryConstitutionPromptBlock,
  buildStoryConstitutionRetryInstruction,
  getSCEPhaseConfig,
  applyAntiRepetitionIntervention,
} from "@/lib/story-constitution-engine";
import type { BookConfig } from "@/types/book";
import type { MemoryGraphSnapshot } from "@/lib/memory-graph/types";

const SAMPLE_CHAPTER = `
Marco attraversò il vicolo. Ma qualcosa non tornava.
Improvvisamente un rumore dietro di lui. Si fermò, il respiro corto.
Non sapeva ancora chi fosse il traditore — ma domani avrebbe scoperto la verità.
`;

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
    chapterLength: "medium",
    bookLength: "short",
    numberOfChapters: 10,
    subchaptersEnabled: false,
    forgeStoryArchitecture: "Finale — Marco scopre il traditore e paga il prezzo.",
    characters: [
      {
        name: "Marco",
        role: "Protagonista",
        wound: "Tradimento passato",
        externalDesire: "Verità",
        emotionalTriggers: "Menzogne sul passato",
        personalLanguage: "Frasi brevi, sarcasmo.",
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

function sampleMemoryGraph(): MemoryGraphSnapshot {
  return {
    version: 1,
    projectId: "p1",
    updatedAt: new Date().toISOString(),
    chaptersIndexed: 2,
    mode: "full",
    characters: [],
    relationships: [],
    promises: [
      {
        id: "p1",
        label: "Identità traditore",
        description: "Chi ha tradito Marco?",
        introducedIn: 0,
        importance: "critical",
        status: "open",
      },
    ],
    mysteries: [],
    world: [],
    objects: [],
    foreshadows: [],
    characterEvolution: [],
    storyDebt: {
      unresolvedPromises: ["Identità traditore"],
      unresolvedMysteries: [],
      unresolvedRelationships: [],
      unresolvedObjects: [],
      unresolvedArcs: [],
      narrativeDebtScore: 12,
    },
  };
}

describe("story-constitution-engine", () => {
  it("phase 1 — measure only: no prompt governance, no text mutation", () => {
    const cfg = getSCEPhaseConfig(1);
    expect(cfg.measureOnly).toBe(true);
    expect(cfg.enablePromptGovernance).toBe(false);

    const block = buildStoryConstitutionPromptBlock({
      config: sampleConfig(),
      previousChapters: [],
      chapterIndex: 2,
      phase: 1,
    });
    expect(block).toBe("");

    const result = runEditorialPassSupreme(SAMPLE_CHAPTER, {
      config: sampleConfig(),
      previousChapters: [],
      chapterIndex: 1,
      phase: 1,
    });
    expect(result.text.trim()).toBe(SAMPLE_CHAPTER.trim());
    expect(result.interventionReport.measureOnly).toBe(true);
    expect(result.interventionReport.textModified).toBe(false);
    expect(result.analysis.measureOnly).toBe(true);
    expect(buildStoryConstitutionRetryInstruction(result.analysis)).toBe("");
  });

  it("phase 3 prompt includes all 14 rules", () => {
    const block = buildStoryConstitutionPromptBlock({
      config: sampleConfig(),
      previousChapters: [],
      chapterIndex: 2,
      outlineSummary: "Marco segue un indizio.",
      phase: 3,
    });
    expect(block).toContain("STORY CONSTITUTION ENGINE");
    expect(block).toContain("RULE 14");
    expect(block).toContain("GENRE TRUTH LOCK");
  });

  it("phase 2 prompt includes only canon, anti-repetition, dead scenes", () => {
    const block = buildStoryConstitutionPromptBlock({
      config: sampleConfig(),
      previousChapters: [],
      chapterIndex: 2,
      phase: 2,
    });
    expect(block).toContain("RULE 4");
    expect(block).toContain("RULE 5");
    expect(block).toContain("RULE 9");
    expect(block).not.toContain("RULE 14");
  });

  it("runStoryConstitutionAnalysis returns scores and warnings", () => {
    const analysis = runStoryConstitutionAnalysis(SAMPLE_CHAPTER, {
      config: sampleConfig(),
      previousChapters: [],
      chapterIndex: 2,
      outlineSummary: "Indizio nel vicolo",
      memoryGraph: sampleMemoryGraph(),
    });
    expect(analysis.constitutionScore).toBeGreaterThan(0);
    expect(analysis.readerScores.readerMomentumScore).toBeGreaterThan(0);
    expect(analysis.director.score).toBeGreaterThan(0);
  });

  it("canon consistency — payoff engine flags stale promises", () => {
    const warnings = evaluatePayoffEngine(SAMPLE_CHAPTER, sampleMemoryGraph(), 8);
    expect(warnings.some((w) => w.ruleId === "payoff_engine")).toBe(true);
  });

  it("anti repetition detects stale beat loop", () => {
    const prior = "Marco aveva paura. Il tradimento lo consumava. Non si fidava di nessuno.";
    const current = "Marco aveva paura. Il tradimento lo consumava ancora. Non si fidava.";
    const analysis = runStoryConstitutionAnalysis(current, {
      config: sampleConfig(),
      previousChapters: [{ title: "C1", content: prior, subchapters: [] }],
      chapterIndex: 1,
      priorText: prior,
    });
    expect(analysis.warnings.some((w) => w.ruleId === "anti_repetition")).toBe(true);
  });

  it("reader simulation produces momentum scores", () => {
    const reader = runReaderSimulationEngine(SAMPLE_CHAPTER, 1);
    expect(reader.readerCuriosityScore).toBeGreaterThan(0);
    expect(reader.readerRetentionScore).toBeGreaterThan(0);
  });

  it("narrative director v2 returns warnings", () => {
    const director = runNarrativeDirectorV2(SAMPLE_CHAPTER, sampleConfig());
    expect(director.directives.length).toBeGreaterThan(0);
  });

  it("genre truth lock for thriller", () => {
    const warnings = evaluateGenreTruthLock(SAMPLE_CHAPTER, sampleConfig());
    expect(Array.isArray(warnings)).toBe(true);
  });

  it("character evolution lock detects protagonist", () => {
    const warnings = evaluateCharacterEvolutionLock(SAMPLE_CHAPTER, sampleConfig(), 1);
    expect(Array.isArray(warnings)).toBe(true);
  });

  it("ending destination lock present in analysis", () => {
    const analysis = runStoryConstitutionAnalysis(SAMPLE_CHAPTER, {
      config: sampleConfig(),
      previousChapters: [],
      chapterIndex: 0,
    });
    expect(analysis.warnings.some((w) => w.ruleId === "ending_destination_lock")).toBe(true);
  });

  it("phase 2 — anti repetition auto-intervention compresses duplicate beats", () => {
    const prior = "Marco aveva paura. Il tradimento lo consumava. Non si fidava di nessuno.";
    const current = "Marco aveva paura. Il tradimento lo consumava ancora. Non si fidava di nessuno.";
    const compressed = applyAntiRepetitionIntervention(current, prior);
    expect(compressed.length).toBeLessThanOrEqual(current.length);

    const result = runEditorialPassSupreme(current, {
      config: sampleConfig(),
      previousChapters: [{ title: "C1", content: prior, subchapters: [] }],
      chapterIndex: 1,
      priorText: prior,
      phase: 2,
    });
    expect(result.interventionReport.phase).toBe(2);
    if (result.analysis.warnings.some((w) => w.ruleId === "anti_repetition")) {
      expect(result.interventionReport.interventionsApplied).toContain("anti_repetition");
    }
  });

  it("phase 3 — narrative optimizations can apply when warnings fire", () => {
    const staticChapter = "Marco camminava. Il cielo era grigio. Le strade erano vuote. ".repeat(20);
    const result = runEditorialPassSupreme(staticChapter, {
      config: sampleConfig(),
      previousChapters: [],
      chapterIndex: 7,
      memoryGraph: sampleMemoryGraph(),
      phase: 3,
    });
    expect(result.interventionReport.phase).toBe(3);
    expect(result.analysis.phase).toBe(3);
  });

  it("StoryConstitutionEngine facade exposes core APIs", () => {
    expect(StoryConstitutionEngine.phase).toBe(1);
    expect(StoryConstitutionEngine.getPhaseConfig).toBeTypeOf("function");
    expect(StoryConstitutionEngine.buildPromptBlock).toBeTypeOf("function");
    expect(StoryConstitutionEngine.analyze).toBeTypeOf("function");
    expect(StoryConstitutionEngine.editorialPassSupreme).toBeTypeOf("function");
  });
});
