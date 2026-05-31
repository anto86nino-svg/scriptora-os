import type { BookTokMoment, BookTokReport } from "./types";
import { clamp100, splitSentences } from "./utils";

const FORCED = /\b(you've got this|booktok|viral|manifest|girlboss|sigma|main character energy)\b/i;
const AUTHENTIC_SCENE = /\b(looked|stared|paused|hesitated|noticed|found|discovered|guardò|esitò|notò)\b/i;
const AUTHENTIC_REVEAL = /\b(but|yet|only then|not until|instead|invece|solo allora)\b/i;

export function analyzeBookTokMoments(content: string): BookTokReport {
  const text = String(content || "");
  const moments: BookTokMoment[] = [];
  const forcedRisk = FORCED.test(text) ? 40 : 0;

  for (const sentence of splitSentences(text)) {
    const trimmed = sentence.trim();
    const wc = trimmed.split(/\s+/).length;
    if (wc < 6 || wc > 26) continue;
    if (FORCED.test(trimmed)) continue;

    let type: BookTokMoment["type"] | null = null;
    let authenticityScore = 40;

    if (AUTHENTIC_REVEAL.test(trimmed) && /[.!?]/.test(trimmed)) {
      type = "quote";
      authenticityScore += 22;
    } else if (AUTHENTIC_SCENE.test(trimmed)) {
      type = "scene";
      authenticityScore += 18;
    } else if (/\b(secret|truth|promise|love|forbidden|danger)\b/i.test(trimmed)) {
      type = "reveal";
      authenticityScore += 16;
    } else if (/"[^"]{8,80}"/.test(trimmed)) {
      type = "relationship";
      authenticityScore += 14;
    }

    if (!type) continue;

    const sharePotential = clamp100(authenticityScore + (/\?/.test(trimmed) ? 8 : 0) + (wc <= 18 ? 6 : 0));
    if (sharePotential >= 55) {
      moments.push({
        excerpt: trimmed.slice(0, 120),
        type,
        authenticityScore: clamp100(authenticityScore),
        sharePotential,
      });
    }
  }

  moments.sort((a, b) => b.sharePotential - a.sharePotential);

  return {
    moments: moments.slice(0, 6),
    authenticCount: moments.filter(m => m.authenticityScore >= 58).length,
    forcedRisk,
    passesGate: moments.length >= 1 && forcedRisk === 0,
  };
}
