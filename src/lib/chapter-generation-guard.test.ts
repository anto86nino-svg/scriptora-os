import { describe, expect, it } from "vitest";
import type { BookConfig } from "@/types/book";
import {
  sanitizeChapterTitle,
  sanitizeChapterSummary,
  buildEditorialChapterPreview,
  isForbiddenChapterTitle,
  preflightChapterGeneration,
  sanitizeChapterOutput,
  classifyChapterGenerationError,
} from "./chapter-generation-guard";

const italianHistoryConfig: BookConfig = {
  title: "La Grande Guerra spiegata semplice",
  subtitle: "",
  genre: "history",
  category: "Non-fiction",
  language: "Italian",
  numberOfChapters: 10,
  bookLength: "medium",
  authorName: "Test",
} as BookConfig;

describe("chapter-generation-guard", () => {
  it("rejects broken title To", () => {
    expect(isForbiddenChapterTitle("To")).toBe(true);
    const title = sanitizeChapterTitle("To", 0, italianHistoryConfig, null);
    expect(title.toLowerCase()).not.toBe("to");
    expect(title.length).toBeGreaterThan(4);
  });

  it("replaces To be generated summary", () => {
    const summary = sanitizeChapterSummary("To be generated", 0, italianHistoryConfig, null);
    expect(summary.toLowerCase()).not.toContain("to be generated");
    expect(summary).toMatch(/capitolo|contesto|guerra|introduce/i);
  });

  it("builds italian editorial preview", () => {
    const preview = buildEditorialChapterPreview(0, italianHistoryConfig, {
      overview: "Un percorso chiaro sulla Prima guerra mondiale.",
      chapterOutlines: [{ title: "To", summary: "To be generated" }],
      themes: [],
      emotionalArc: "",
    });
    expect(preview.toLowerCase()).not.toContain("to be generated");
    expect(preview).toMatch(/Scriptora sta preparando/i);
  });

  it("sanitizes leaked output", () => {
    const out = sanitizeChapterOutput("To be generated\n\nIl conflitto iniziò lentamente.", italianHistoryConfig, "Le origini");
    expect(out).not.toMatch(/to be generated/i);
    expect(out).toMatch(/conflitto/i);
  });

  it("maps multiple attempts error to italian", () => {
    const mapped = classifyChapterGenerationError(new Error("Generation failed after multiple attempts"));
    expect(mapped.userMessage).toMatch(/tentativi|lunghezza breve/i);
    expect(mapped.devCode).toBe("CH-GEN-MULTI-RETRY");
  });

  it("preflight fails without blueprint", () => {
    const result = preflightChapterGeneration({ config: italianHistoryConfig, chapters: [] } as any, 0);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.userMessage).toMatch(/blueprint|indice/i);
  });
});
