import { describe, expect, it } from "vitest";
import { buildExpressForgeConfiguration } from "./express-forge-config";
import { getForgeMemory } from "./interview-memory";
import { isStoryRoomBlueprintReady } from "./story-room-state-machine";
import { getNextInterviewQuestion } from "./question-engine";
import { getInitialInterviewState } from "./question-engine";

describe("express-forge-config", () => {
  it("Studio Express dark romance auto-fills core fields", () => {
    const result = buildExpressForgeConfiguration({
      genre: "dark romance",
      language: "Italiano",
      titleMode: "suggest",
      protagonistSeed: "una chef in fuga dal passato",
      tone: "oscuro",
      length: "medio",
      controlLevel: "scenarios",
    });

    const memory = result.memory;
    expect(memory.slotValues.audience).toBeTruthy();
    expect(memory.slotValues.promise).toBeTruthy();
    expect(memory.slotValues.centralConflict).toBeTruthy();
    expect(memory.slotValues.stakes).toBeTruthy();
    expect(memory.slotValues.chapterCount).toBeTruthy();
    expect(result.autoFilledFields).toContain("audience");
    expect(result.autoFilledFields).toContain("promise");
    expect(result.autoFilledFields).toContain("centralConflict");
    expect(result.autoFilledFields).toContain("stakes");
  });

  it("Studio Express produces 3 blueprint scenarios", () => {
    const result = buildExpressForgeConfiguration({
      genre: "dark romance",
      language: "Italiano",
      titleMode: "suggest",
      protagonistSeed: "Elena, chef tormentata",
      tone: "oscuro",
      length: "medio",
      controlLevel: "scenarios",
    });

    expect(result.candidateBlueprintScenarios).toHaveLength(3);
    expect(result.candidateBlueprintScenarios.map((s) => s.variant)).toEqual([
      "safe",
      "commercial",
      "bold",
    ]);
    expect(result.state.blueprintScenarios).toHaveLength(3);
  });

  it("express state reaches blueprint-ready gate", () => {
    const result = buildExpressForgeConfiguration({
      genre: "dark romance",
      language: "Italiano",
      titleMode: "suggest",
      protagonistSeed: "protagonista segnato dal passato",
      tone: "emozionale",
      length: "breve",
      controlLevel: "auto",
    });

    expect(isStoryRoomBlueprintReady(result.memory)).toBe(true);
    const next = getNextInterviewQuestion(result.state);
    expect(next.done).toBe(true);
  });

  it("marks user fields with user source and auto fields with auto source", () => {
    const result = buildExpressForgeConfiguration({
      genre: "thriller",
      language: "Inglese",
      titleMode: "provided",
      title: "Midnight Signal",
      protagonistSeed: "detective in burnout",
      tone: "psicologico",
      length: "lungo",
      controlLevel: "minimal",
    });

    expect(result.provenance.genre?.source).toBe("user");
    expect(result.provenance.promise?.source).toBe("auto");
    expect(result.provenance.title?.source).toBe("user");
  });

  it("minimal input user can reach blueprint without long interview", () => {
    const base = getInitialInterviewState({ chatFirst: true });
    const result = buildExpressForgeConfiguration(
      {
        genre: "fantasy",
        language: "Auto",
        titleMode: "suggest",
        protagonistSeed: "guerriera esiliata",
        tone: "epico",
        length: "medio",
        controlLevel: "auto",
      },
      base,
    );

    expect(result.missingCriticalFields.length).toBeLessThanOrEqual(2);
    expect(getForgeMemory(result.state).slotValues.genre).toBe("fantasy");
    expect(getNextInterviewQuestion(result.state).done).toBe(true);
  });
});
