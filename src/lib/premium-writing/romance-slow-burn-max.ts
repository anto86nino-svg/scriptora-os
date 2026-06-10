import type { BookConfig } from "@/types/book";

function isRomanceGenre(genre?: string): boolean {
  const g = String(genre || "").toLowerCase();
  return /romance|dark-romance|love|erotic/i.test(g);
}

export function buildRomanceSlowBurnMaxBlock(config: BookConfig, chapterIndex: number): string {
  if (!isRomanceGenre(config.genre)) return "";

  const total = config.numberOfChapters || 12;
  const progress = total > 0 ? chapterIndex / total : 0;
  const kissAllowed = progress >= 0.55;
  const surrenderAllowed = progress >= 0.78;

  return `
ROMANCE SLOW BURN MAX (MANDATORY):
The reader must want the kiss long before it happens.

Chapter ${chapterIndex + 1}/${total}:
- Early love confession / full vulnerability: ${surrenderAllowed ? "cautiously allowed" : "FORBIDDEN"}
- First kiss / physical surrender: ${kissAllowed ? "may approach" : "FORBIDDEN — tension only"}

BLOCK until thresholds:
- instant emotional healing
- therapeutic mutual understanding
- "I love you" without resistance or cost
- love interest emotionally available without friction

FAVOR:
- desire + frustration balance
- realistic misunderstandings
- near-misses, pulled-back words, misread signals
- delayed payoff — every intimate beat must cost something
`.trim();
}
