import type { QuoteCandidate, QuoteDetectorReport } from "./types";
import { clamp100, splitSentences } from "./utils";

const CONTRAST = /\b(but|yet|however|instead|not .{1,30} but|ma|però|invece|eppure)\b/i;
const FILLER = /\b(very|really|truly|quite|davvero|veramente)\b/i;
const CRINGE = /\b(believe in yourself|you've got this|everything happens for a reason)\b/i;

function scoreSentence(sentence: string): QuoteCandidate {
  const trimmed = sentence.trim();
  const wc = trimmed.split(/\s+/).length;
  let highlight = 35;
  let underline = 30;
  let share = 25;

  if (wc >= 5 && wc <= 22) {
    highlight += 12;
    underline += 10;
  }
  if (CONTRAST.test(trimmed)) {
    highlight += 18;
    underline += 16;
    share += 14;
  }
  if (/\b(phone|door|silence|promise|secret|truth|rain|light|key)\b/i.test(trimmed)) {
    highlight += 10;
    underline += 8;
  }
  if (FILLER.test(trimmed) || CRINGE.test(trimmed)) {
    highlight -= 20;
    underline -= 18;
    share -= 22;
  }
  if (wc > 28) {
    highlight -= 12;
    underline -= 10;
  }

  return {
    sentence: trimmed.slice(0, 140),
    highlightProbability: clamp100(highlight),
    underlineProbability: clamp100(underline),
    shareProbability: clamp100(share),
  };
}

export function analyzeQuotePotential(content: string): QuoteDetectorReport {
  const candidates = splitSentences(content)
    .map(scoreSentence)
    .filter(c => c.highlightProbability >= 45)
    .sort((a, b) => b.underlineProbability - a.underlineProbability);

  const topQuote = candidates[0];
  const averageHighlightProbability = candidates.length
    ? clamp100(candidates.reduce((s, c) => s + c.highlightProbability, 0) / candidates.length)
    : 0;

  return {
    candidates: candidates.slice(0, 8),
    topQuote,
    averageHighlightProbability,
  };
}
