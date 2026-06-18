import { describe, expect, it } from "vitest";
import {
  applyBlueprintReadySummaryToState,
  buildBlueprintReadySummary,
  buildEditorialFallbackForMissingField,
  isMetadataOnly,
} from "./blueprint-ready-summary";
import { createEmptyForgeMemory, getForgeMemory } from "./interview-memory";
import { advanceStoryRoomStage } from "./story-room-state-machine";
import type { GuidedInterviewState } from "./types";
import { getInitialInterviewState } from "./question-engine";

function darkRomanceBlueprintState(): GuidedInterviewState {
  let memory = createEmptyForgeMemory();
  memory.slotValues = {
    rawIdea: "Dark romance tra due anime spezzate",
    language: "Italiano",
    genre: "dark-romance",
    bookType: "Romanzo",
    tone: "Oscuro e claustrofobico",
    audience: "Lettori adulti",
    protagonist: "Elena — chef tormentata dal passato",
    antagonist: "Marco — interesse amoroso pericoloso",
    loveInterest: "Marco — magnetico e distruttivo",
    title: "Cenere e Desiderio",
    chapterCount: "14 capitoli",
    endingDirection: "Finale devastante ma giusto",
  };
  memory.answeredSlots = Object.fromEntries(
    Object.keys(memory.slotValues).map((k) => [k, true]),
  ) as typeof memory.answeredSlots;
  memory = advanceStoryRoomStage(memory);
  if (memory.storyRoomMachine) {
    memory.storyRoomMachine.currentStageId = "blueprintReady";
  }

  return {
    ...getInitialInterviewState({ chatFirst: true }),
    selectedGenre: "dark romance",
    forgeMemory: memory,
    extracted: {
      genre: "dark-romance",
      genreDNA: "Romanzo · Dark Romance · dark-romance · Narrativa",
      bookType: "Romanzo",
      promise: "Romanzo · Dark Romance · dark-romance · Narrativa",
      centralConflict: "Non deviare dal DNA Dark Romance.",
      readerTransformation: "dark-romance · Narrativa",
      bookTitle: "Cenere e Desiderio",
      emotionalTone: "Oscuro",
      targetReader: "Lettori adulti",
    },
    messages: [
      { id: "u1", role: "user", content: "Dark romance con Elena chef", createdAt: 1 },
      { id: "u2", role: "user", content: "Tono oscuro e claustrofobico", createdAt: 2 },
      { id: "u3", role: "user", content: "Finale devastante", createdAt: 3 },
      { id: "u4", role: "user", content: "Promessa intensa", createdAt: 4 },
    ],
  };
}

describe("isMetadataOnly", () => {
  it("detects genre metadata chains", () => {
    expect(isMetadataOnly("Romanzo · Dark Romance · dark-romance · Narrativa")).toBe(true);
    expect(isMetadataOnly("dark-romance")).toBe(true);
    expect(isMetadataOnly("Narrativa")).toBe(true);
  });

  it("detects anti-drift rules", () => {
    expect(isMetadataOnly("Non deviare dal DNA Dark Romance.")).toBe(true);
    expect(isMetadataOnly("Resta nel genere scelto; evita toni incoerenti")).toBe(true);
  });

  it("accepts real editorial copy", () => {
    expect(
      isMetadataOnly(
        "Un dark romance claustrofobico dove colpa, desiderio e redenzione sporca si confondono.",
      ),
    ).toBe(false);
  });
});

describe("buildEditorialFallbackForMissingField", () => {
  it("generates dark romance editorial fallbacks", () => {
    const state = darkRomanceBlueprintState();
    const memory = getForgeMemory(state);
    const promise = buildEditorialFallbackForMissingField("promise", memory, state);
    const conflict = buildEditorialFallbackForMissingField("centralConflict", memory, state);
    const transformation = buildEditorialFallbackForMissingField("readerTransformation", memory, state);

    expect(promise).toContain("dark romance");
    expect(conflict).toContain("protagonista");
    expect(transformation).toContain("colpa");
    expect(isMetadataOnly(promise)).toBe(false);
    expect(isMetadataOnly(conflict)).toBe(false);
    expect(isMetadataOnly(transformation)).toBe(false);
  });
});

describe("buildBlueprintReadySummary", () => {
  it("does not show metadata as promise", () => {
    const summary = buildBlueprintReadySummary(darkRomanceBlueprintState());
    expect(summary.promise).not.toContain("Romanzo · Dark Romance");
    expect(isMetadataOnly(summary.promise)).toBe(false);
  });

  it("does not show anti-drift as conflict", () => {
    const summary = buildBlueprintReadySummary(darkRomanceBlueprintState());
    expect(summary.conflict).not.toContain("Non deviare");
    expect(isMetadataOnly(summary.conflict)).toBe(false);
  });

  it("does not show metadata as transformation", () => {
    const summary = buildBlueprintReadySummary(darkRomanceBlueprintState());
    expect(summary.transformation).not.toBe("dark-romance · Narrativa");
    expect(isMetadataOnly(summary.transformation)).toBe(false);
  });

  it("flags missing hook and subtitle with integrity hints", () => {
    const summary = buildBlueprintReadySummary(darkRomanceBlueprintState());
    expect(summary.integrity.missingSubtitle).toBe(true);
    expect(summary.integrity.missingHook).toBe(true);
    expect(summary.integrity.canProceed).toBe(true);
    expect(summary.integrity.notes.length).toBeGreaterThan(0);
  });

  it("suggests editorial hook fallback when hook missing", () => {
    const summary = buildBlueprintReadySummary(darkRomanceBlueprintState());
    expect(summary.commercialHook.length).toBeGreaterThan(12);
    expect(isMetadataOnly(summary.commercialHook)).toBe(false);
  });

  it("dark romance with protagonist and title generates editorial promise/conflict/transformation", () => {
    const summary = buildBlueprintReadySummary(darkRomanceBlueprintState());
    expect(summary.promise.length).toBeGreaterThan(40);
    expect(summary.conflict.length).toBeGreaterThan(30);
    expect(summary.transformation.length).toBeGreaterThan(30);
    expect(summary.title).toContain("Cenere");
  });

  it("applyBlueprintReadySummaryToState writes normalized extracted fields", () => {
    const state = darkRomanceBlueprintState();
    const normalized = applyBlueprintReadySummaryToState(state);
    expect(normalized.extracted?.promise).not.toContain("Romanzo · Dark Romance");
    expect(normalized.extracted?.centralConflict).not.toContain("Non deviare");
    expect(normalized.extracted?.readerTransformation).not.toBe("dark-romance · Narrativa");
  });
});
