import { describe, expect, it } from "vitest";
import { buildExpressForgeConfiguration } from "./express-forge-config";
import { applyExpressScenarioToState, ensureExpressWriterReadiness, validateExpressPackageReadiness } from "./express-book-package";
import { confirmBookFoundationLock } from "./book-foundation-lock";
import { isStoryRoomBlueprintReady } from "./story-room-state-machine";
import { getNextInterviewQuestion, getInitialInterviewState } from "./question-engine";
import { isMetadataOnly } from "./blueprint-ready-summary";

const expressInput = {
  genre: "dark romance",
  language: "Italiano",
  titleMode: "suggest" as const,
  ideaSeed: "una restauratrice torna nella villa dove sua sorella è morta in un incendio doloso",
  tone: "oscuro",
  length: "medio" as const,
  controlLevel: "scenarios" as const,
};

describe("express-forge-config", () => {
  it("Studio Express dark romance auto-fills core fields in packages", () => {
    const result = buildExpressForgeConfiguration(expressInput);
    const pkg = result.packages[1]!;
    expect(pkg.targetAudience).toBeTruthy();
    expect(pkg.marketPromise).toBeTruthy();
    expect(pkg.centralConflict).toBeTruthy();
    expect(pkg.stakes).toBeTruthy();
    expect(pkg.chapterCount).toBeGreaterThan(0);
    expect(isMetadataOnly(pkg.marketPromise)).toBe(false);
  });

  it("Studio Express produces 3 complete book scenarios", () => {
    const result = buildExpressForgeConfiguration(expressInput);
    expect(result.candidateBlueprintScenarios).toHaveLength(3);
    expect(result.candidateBlueprintScenarios.map((s) => s.variant)).toEqual([
      "safe",
      "commercial",
      "bold",
    ]);
    expect(result.state.blueprintScenarios).toHaveLength(3);
    expect(result.state.blueprintScenarios![0]!.editorialSynopsis.length).toBeGreaterThan(100);
  });

  it("selected scenario reaches foundation lock then blueprint-ready handoff", () => {
    const result = buildExpressForgeConfiguration(expressInput);
    let applied = applyExpressScenarioToState(result.state, result.packages[0]!);
    expect(applied.forgeMemory?.storyRoomMachine?.currentStageId).toBe("bookFoundationLock");
    applied = confirmBookFoundationLock(applied, applied.bookFoundation);
    expect(isStoryRoomBlueprintReady(applied.forgeMemory!)).toBe(true);
    const readiness = validateExpressPackageReadiness(applied);
    expect(readiness.ready).toBe(true);
    expect(getNextInterviewQuestion(applied).done).toBe(true);
  });

  it("marks user idea as user source in provenance", () => {
    const result = buildExpressForgeConfiguration({
      ...expressInput,
      genre: "thriller",
      titleMode: "provided",
      title: "Midnight Signal",
      ideaSeed: "detective in burnout",
      tone: "psicologico",
      length: "lungo",
      controlLevel: "auto",
    });
    expect(result.provenance.genre?.source).toBe("user");
    expect(result.provenance.rawIdea?.source).toBe("user");
  });

  it("minimal input user can reach complete express package", () => {
    const base = getInitialInterviewState({ chatFirst: true });
    const result = buildExpressForgeConfiguration(
      {
        genre: "fantasy",
        language: "Auto",
        titleMode: "suggest",
        ideaSeed: "guerriera esiliata che cerca redenzione",
        tone: "epico",
        length: "medio",
        controlLevel: "auto",
      },
      base,
    );
    const staged = applyExpressScenarioToState(result.state, result.packages[0]!);
    const applied = confirmBookFoundationLock(staged, staged.bookFoundation);
    const readiness = validateExpressPackageReadiness(applied);
    expect(readiness.handoffMissing.length).toBe(0);
    expect(applied.characters?.length).toBeGreaterThan(0);
    expect(applied.extracted?.setting).toBeTruthy();
  });

  it("ensureExpressWriterReadiness passes for fantasy minimal idea", () => {
    const result = buildExpressForgeConfiguration({
      genre: "fantasy",
      language: "Italiano",
      titleMode: "suggest",
      ideaSeed: "guerriera esiliata che cerca redenzione",
      tone: "epico",
      length: "medio",
      controlLevel: "auto",
    });
    const staged = applyExpressScenarioToState(result.state, result.packages[0]!);
    const applied = confirmBookFoundationLock(staged, staged.bookFoundation);
    const writerReady = ensureExpressWriterReadiness(applied);
    expect(writerReady.ready).toBe(true);
    expect(writerReady.blockingIssues).toEqual([]);
  });
});
