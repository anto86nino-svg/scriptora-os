import type { BookConfig } from "@/types/book";

function isRomanceGenre(genre?: string): boolean {
  const g = String(genre || "").toLowerCase();
  return /romance|dark-romance|love|erotic/i.test(g);
}

export function buildRomanceSlowBurnBlock(config: BookConfig, chapterIndex: number): string {
  if (!isRomanceGenre(config.genre)) return "";

  const total = config.numberOfChapters || 12;
  const progress = total > 0 ? chapterIndex / total : 0;
  const surrenderAllowed = progress >= 0.72;

  return `
ROMANCE SLOW BURN ENGINE (MANDATORY for this genre):
Prevent love interests from emotionally surrendering too fast.

Chapter ${chapterIndex + 1} of ${total} — emotional surrender ${surrenderAllowed ? "may begin cautiously" : "is NOT allowed yet"}.

INCREASE:
- tension, uncertainty, delayed payoff
- attraction/frustration balance and push/pull
- longing without full reciprocity
- near-misses, pulled-back confessions, misread signals

${surrenderAllowed ? "" : `BLOCK until later chapters:
- mutual "I love you" or full emotional availability
- complete vulnerability without resistance
- resolved romantic tension`}
`.trim();
}
