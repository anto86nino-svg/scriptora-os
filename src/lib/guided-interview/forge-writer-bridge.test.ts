import { describe, expect, it } from "vitest";
import { finalizeForgeForBlueprint } from "./forge-evolution-engine";
import { buildForgeInterviewSeed } from "./forge-blueprint-handoff";
import { evolutionReadyGothicState } from "./evolution-test-fixture";
import {
  buildForgeWriterContextBlock,
  buildForgeWriterHandoff,
  enrichBookConfigFromForgeSeed,
} from "./forge-writer-bridge";
import type { BookConfig } from "@/types/book";

describe("forge writer bridge", () => {
  it("builds writer handoff with story architecture and anti-drift rules", () => {
    const seed = buildForgeInterviewSeed(finalizeForgeForBlueprint(evolutionReadyGothicState()));
    const handoff = buildForgeWriterHandoff(seed);

    expect(handoff.characterBibleText).toContain("Elena");
    expect(handoff.canonBrief).toContain("BLUEPRINT CANON BRIEF");
    expect(handoff.guidedBrief).toContain("FORGE CHARACTER");
    expect(handoff.storyArchitecture.length).toBeGreaterThan(0);
  });

  it("enriches BookConfig with forge fields for writer engine", () => {
    const seed = buildForgeInterviewSeed(finalizeForgeForBlueprint(evolutionReadyGothicState()));
    const base: BookConfig = {
      title: "Test",
      idea: "Idea base",
      language: "Italian",
      genre: "gothic",
      numberOfChapters: 12,
      characters: [],
    } as BookConfig;

    const enriched = enrichBookConfigFromForgeSeed(base, seed);
    expect(enriched.characterBibleText).toBeTruthy();
    expect(enriched.forgeCanonBrief).toContain("CANON");
    expect(enriched.forgeStoryArchitecture).toBeTruthy();
    expect(enriched.characters?.[0]?.name).toBe("Elena");
  });

  it("builds forge writer context block for generation prompts", () => {
    const config: BookConfig = {
      title: "Test",
      idea: "Brief",
      language: "Italian",
      genre: "gothic",
      numberOfChapters: 12,
      characterBibleText: "CHARACTER TRUTH BLOCK",
      forgeCanonBrief: "BLUEPRINT CANON BRIEF",
      forgeStoryArchitecture: "STORY ARCHITECTURE",
      forgeAntiDriftRules: ["No rename drift"],
    } as BookConfig;

    const block = buildForgeWriterContextBlock(config);
    expect(block).toContain("FORGE → WRITER HANDOFF");
    expect(block).toContain("CHARACTER TRUTH BLOCK");
    expect(block).toContain("CHARACTER REACTION RULE");
    expect(block).toContain("No rename drift");
  });
});
