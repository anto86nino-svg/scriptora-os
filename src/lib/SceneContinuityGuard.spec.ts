import { describe, expect, it } from "vitest";
import { buildSceneContinuityPromptBlock, detectRecentSceneBeats } from "@/lib/SceneContinuityGuard";

describe("SceneContinuityGuard", () => {
  const chapters = [{ content: "Emma gli disse che aveva paura di perderlo. Lui propose di provarci un giorno alla volta." }];

  it("detects recent emotional beats", () => {
    expect(detectRecentSceneBeats(chapters as any)).toEqual(expect.arrayContaining(["fear confession", "one day at a time promise"]));
  });

  it("asks for consequence rather than replay", () => {
    expect(buildSceneContinuityPromptBlock(chapters as any)).toContain("NEW consequence");
  });
});
