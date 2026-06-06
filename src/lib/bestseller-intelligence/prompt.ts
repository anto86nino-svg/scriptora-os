import type { BookConfig } from "@/types/book";
import type { BestsellerChapterSnapshot } from "./types";
import { evaluateBestsellerChapter } from "./scorer";

export function buildBestsellerIntelligencePromptBlock(
  config: BookConfig,
  chapterIndex: number,
  previousSnapshot?: BestsellerChapterSnapshot,
): string {
  const brain = config.bookIntelligence?.layers;
  const bestsellerMode = brain?.bestsellerMode || "commercial readability + retention";
  const position = chapterIndex + 1;
  const total = config.numberOfChapters || 12;
  const arcPhase =
    position / total <= 0.25
      ? "OPENING — hook hard, promise the genre, create curiosity debt"
      : position / total <= 0.5
        ? "RISING — deepen stakes, delay payoff, increase tension"
        : position / total <= 0.75
          ? "ESCALATION — accelerate consequences, sharpen conflict"
          : "PAYOFF APPROACH — deliver earned momentum without flattening";

  const weakAreas = previousSnapshot
    ? Object.entries(previousSnapshot.scores)
        .filter(([key, value]) => key !== "overall" && value < 58)
        .map(([key]) => key)
    : [];

  return `BESTSELLER INTELLIGENCE ENGINE V4 — COMMERCIAL OPTIMIZATION
Brain bestseller mode: ${bestsellerMode}
Chapter position: ${position}/${total} — ${arcPhase}

OPTIMIZE FOR (commercial quality, not generic prose):
• Hook strength — first 120 words must earn the next page
• Bingeability — end with forward pull, not tidy closure
• Reader retention — curiosity loops every 400–600 words
• Emotional momentum — escalate through the chapter
• BookTok intensity — 1–2 quotable, shareable lines where genre-appropriate
• Compulsive readability — varied rhythm, human friction, low AI-safe phrasing
• Commercial pacing — scene goals, turns, and consequence

${
  weakAreas.length
    ? `PRIOR CHAPTER WEAK ZONES (correct in this chapter):
${weakAreas.map((area) => `• Improve ${area}`).join("\n")}`
    : "Maintain or exceed prior chapter commercial momentum."
}

RULES:
- Never sacrifice canon for shock — commercial quality must feel earned.
- Delay emotional resolution unless the genre brain demands instructional clarity.
- End this chapter so the reader wants the next one immediately.`;
}

export function buildBestsellerOptimizationBlock(snapshot: BestsellerChapterSnapshot): string {
  if (snapshot.scores.overall >= 75) return "";
  return `BESTSELLER OPTIMIZATION TARGETS (from live score ${snapshot.scores.overall}/100):
${snapshot.optimizations.map((item) => `• ${item}`).join("\n")}`;
}

export function evaluateChapterBestsellerIntel(params: {
  config: BookConfig;
  chapterIndex: number;
  content: string;
}): BestsellerChapterSnapshot {
  return evaluateBestsellerChapter({
    content: params.content,
    chapterIndex: params.chapterIndex,
    totalChapters: params.config.numberOfChapters,
    genre: params.config.genre,
    bookIntelligence: params.config.bookIntelligence,
  });
}
