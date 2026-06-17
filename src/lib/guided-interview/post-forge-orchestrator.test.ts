import { describe, expect, it } from "vitest";
import { finalizeForgeForBlueprint } from "./forge-evolution-engine";
import { buildForgeInterviewSeed } from "./forge-blueprint-handoff";
import { evolutionReadyGothicState } from "./evolution-test-fixture";
import {
  analyzeSceneArchitecture,
  buildUnifiedCanonView,
  runNarrativeDirectorAnalysis,
  runPostForgeManuscriptAnalysis,
  simulateReaderProfiles,
} from "./post-forge-orchestrator";
import type { BookConfig } from "@/types/book";

const SAMPLE_CHAPTER = `
Lucia entrò nella villa. Il silenzio la schiacciava, ma decise di non tornare indietro.
Damien la guardò con occhi che promettevano pericolo. «Non puoi andartene», disse.
Lei sentì la paura salire, ma però restò ferma. Improvvisamente capì che ogni scelta aveva un prezzo.
Dopo quella notte, nulla sarebbe stato come prima.
`.trim();

describe("post-forge orchestrator", () => {
  it("builds unified canon view from forge state", () => {
    const state = finalizeForgeForBlueprint(evolutionReadyGothicState());
    const facts = buildUnifiedCanonView(state);
    expect(facts.length).toBeGreaterThan(2);
    expect(facts.some((fact) => /Elena|villa|Marco/i.test(fact))).toBe(true);
  });

  it("flags scenes missing visible consequence", () => {
    const flatText = Array.from({ length: 2 })
      .map(
        () =>
          "La stanza era grande e luminosa con mobili antichi e pavimento di legno. Le pareti erano decorate con quadri antichi e dettagli curati in ogni angolo della stanza mentre la luce entrava dalle finestre alte senza creare alcun movimento narrativo.",
      )
      .join("\n\n");
    const issues = analyzeSceneArchitecture(flatText);
    expect(issues.some((issue) => issue.suggestion === "review" || issue.suggestion === "strengthen")).toBe(true);
  });

  it("runs narrative director analysis without auto-editing", () => {
    const notes = runNarrativeDirectorAnalysis(SAMPLE_CHAPTER, {
      genre: "gothic",
      language: "Italian",
    });
    expect(notes.length).toBeGreaterThan(0);
  });

  it("simulates reader profile report", () => {
    const reports = simulateReaderProfiles(SAMPLE_CHAPTER, "gothic", "Italian");
    expect(reports[0]?.profile).toBeTruthy();
    expect(reports[0]?.summary).toMatch(/curiosità/i);
  });

  it("returns editorial suggestions only in manuscript report", () => {
    const seed = buildForgeInterviewSeed(finalizeForgeForBlueprint(evolutionReadyGothicState()));
    const config: BookConfig = {
      title: "La Villa dei Silenzi",
      idea: seed.extracted?.promise || "Romanzo gotico",
      language: "Italian",
      genre: "gothic",
      numberOfChapters: 12,
      characters: [],
      forgeCanonBrief: "BLUEPRINT CANON BRIEF",
    } as BookConfig;

    const report = runPostForgeManuscriptAnalysis({
      text: SAMPLE_CHAPTER,
      config,
      forgeState: finalizeForgeForBlueprint(evolutionReadyGothicState()),
      chapterIndex: 0,
    });

    expect(report.editorialSuggestions.length).toBeGreaterThan(0);
    expect(report.narrativeDirectorNotes.length).toBeGreaterThan(0);
    expect(report.readerProfiles.length).toBe(1);
  });
});
