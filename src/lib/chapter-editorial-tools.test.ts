import { describe, expect, it } from "vitest";
import {
  CHAPTER_TOOL_FAMILY,
  MOBILE_PRIMARY_CHAPTER_TOOLS,
  TOOL_INVASIVENESS,
  buildChapterEditorialOutcome,
  cleanupIsLessInvasiveThanRewrite,
  isValidRewriteLevel,
  scoreChapterEditorialReadiness,
  shouldShowChapterTools,
  validateChapterPatchSafety,
} from "./chapter-editorial-tools";
import { runEditorialCleanup } from "./editorial-cleanup";

describe("chapter editorial tools", () => {
  it("suggests editorial cleanup when analysis finds corrupted phrases", () => {
    const outcome = buildChapterEditorialOutcome(
      "Marco restava a fissare il a, come se tutto fosse gia' finito. Non non riusciva a parlare.",
    );

    expect(outcome.recommendedNextAction).toBe("editorial_cleanup");
    expect(outcome.issues.some((issue) => issue.suggestedTool === "cleanup")).toBe(true);
  });

  it("penalizes editorial cleanliness for dirty chapter text", () => {
    const score = scoreChapterEditorialReadiness(
      "Non non era soltanto paura. Marco restava a fissare il a mentre la porta si apriva.",
    );

    expect(score.editorialCleanliness).toBeLessThan(7);
    expect(score.nextAction).toBe("Pulizia editoriale");
  });

  it("rejects patches that delete the main content", () => {
    const original = "La scena conserva nomi, conflitto, luogo e conseguenze narrative. ".repeat(12);
    const validation = validateChapterPatchSafety(original, "La scena resta.");

    expect(validation.valid).toBe(false);
  });

  it("requires an explicit rewrite level", () => {
    expect(isValidRewriteLevel()).toBe(false);
    expect(isValidRewriteLevel("light")).toBe(true);
  });

  it("keeps cleanup less invasive than rewrite", () => {
    const result = runEditorialCleanup({
      content: "Non non era solo vanita. Era una scena ancora valida.",
    });

    expect(cleanupIsLessInvasiveThanRewrite(result)).toBe(true);
    expect(TOOL_INVASIVENESS.cleanup).toBeLessThan(TOOL_INVASIVENESS.rewrite);
  });

  it("hides chapter tools when the chapter is empty", () => {
    expect(shouldShowChapterTools("   ")).toBe(false);
  });

  it("keeps desktop and mobile exposing the same core tool family", () => {
    expect(CHAPTER_TOOL_FAMILY).toEqual(["analysis", "score", "cleanup", "patch", "rewrite"]);
    expect(MOBILE_PRIMARY_CHAPTER_TOOLS).toEqual(["analysis", "cleanup", "patch", "more"]);
    expect(MOBILE_PRIMARY_CHAPTER_TOOLS).toEqual(expect.arrayContaining(["analysis", "cleanup", "patch"]));
  });

  it("keeps subchapter coverage coherent after cleanup application data is produced", () => {
    const result = runEditorialCleanup({
      title: "La Sala del Sangue",
      content: "Testo aggregato.",
      subchapters: [
        { title: "La porta", content: "Non non doveva entrare." },
        { title: "Il sigillo", content: "Celeste restava a fissare il a." },
      ],
    });

    expect(result.cleanedSubchapters).toHaveLength(2);
    expect(result.cleanedSubchapters?.[0]?.content).toContain("Non doveva");
    expect(result.cleanedSubchapters?.[1]?.content).toContain("a fissare il vuoto");
    expect(result.cleanedContent).toContain("La porta");
    expect(result.cleanedContent).toContain("Il sigillo");
  });
});
