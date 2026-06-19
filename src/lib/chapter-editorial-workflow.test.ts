import { describe, expect, it } from "vitest";
import type { BookConfig } from "@/types/book";
import { buildLocalChapterPatchFallback, runLocalChapterEditorialAnalysis } from "./chapter-editorial-workflow";

const config = {
  genre: "romance",
  language: "Italian",
  tone: "intimo",
} as Pick<BookConfig, "genre" | "language" | "tone">;

const chapterText = [
  "Viola rimase davanti alla porta senza bussare. La pioggia le colava dal mento, ma non era quello a farle tremare le mani.",
  "Damien aprì prima che lei decidesse se restare. Non disse niente. Nemmeno lei.",
  "Sul tavolo, una chiave arrugginita aspettava come se fosse sempre stata lì.",
].join("\n\n");

describe("chapter editorial workflow", () => {
  it("runs local analysis without edge dependencies", () => {
    const result = runLocalChapterEditorialAnalysis(chapterText, config, 0);

    expect(result.snapshot.scoreOutOf10).toBeGreaterThan(0);
    expect(result.aiRating.score).toBeGreaterThanOrEqual(1);
    expect(result.aiRating.explanation).toContain("Rewrite necessario?");
  });

  it("segnala duplicazioni reali invece di mascherarle con complimenti generici", () => {
    const duplicatedScene = [
      chapterText,
      "Viola rimase davanti alla porta senza bussare. La pioggia le colava dal mento, ma non era quello a farle tremare le mani.",
      "Damien aprì prima che lei decidesse se restare. Non disse niente. Nemmeno lei.",
      "Sul tavolo, una chiave arrugginita aspettava come se fosse sempre stata lì.",
    ].join("\n\n");

    const result = runLocalChapterEditorialAnalysis(duplicatedScene, config, 0);

    expect(result.snapshot.issues.some((issue) => /duplicato/i.test(issue))).toBe(true);
    expect(result.snapshot.primaryIssue).not.toContain("fascia professionale premium");
  });

  it("segnala possibili contaminazioni/refusi anomali nel manoscritto", () => {
    const contaminated = [
      chapterText,
      "«a,» disse Damien, come se quella sillaba appartenesse a un'altra versione della scena.",
    ].join("\n\n");

    const result = runLocalChapterEditorialAnalysis(contaminated, config, 0);

    expect(result.snapshot.issues.some((issue) => /contaminazione\/refuso/i.test(issue))).toBe(true);
  });

  it("builds a non-destructive fallback patch when the edge function is unavailable", () => {
    const fallback = buildLocalChapterPatchFallback(chapterText, config, 0, "AI unavailable → fallback mode");

    expect(fallback.fallbackMode).toBe(true);
    expect(fallback.patchedText).toBe(chapterText);
    expect(fallback.patches).toEqual([]);
    expect(fallback.modificationPercent).toBe(0);
    expect(fallback.evaluation.improvements[0]).toContain("fallback mode");
  });
});
