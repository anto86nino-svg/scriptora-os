import type { BookConfig } from "@/types/book";

export function isRomanceGenre(config: BookConfig): boolean {
  const g = String(config.genre || "").toLowerCase();
  return /romance|romantasy|dark-romance/.test(g);
}

export function buildRomanceTensionV2Block(config: BookConfig, chapterIndex: number): string {
  if (!isRomanceGenre(config)) return "";

  const isDark = /dark/.test(String(config.genre || "").toLowerCase());
  const earlyBook = chapterIndex < Math.max(2, Math.floor((config.numberOfChapters || 10) * 0.35));

  return [
    "ROMANCE TENSION ENGINE V2:",
    isDark ? "Dark romance — desire and danger coexist; trust is the real cliffhanger." : "Romance — friction before tenderness.",
    earlyBook
      ? "EARLY BOOK: Attraction allowed. Full vulnerability FORBIDDEN. Confession must cost something."
      : "MID/LATE BOOK: Payoff may deepen but never erase wound without narrative price.",
    "FORBIDDEN: instant love, instant healing, mutual emotional availability, therapist dialogue.",
    "FAVOR: friction, desire, frustration, near-miss intimacy, interrupted moments, power shifts.",
  ].join("\n");
}
