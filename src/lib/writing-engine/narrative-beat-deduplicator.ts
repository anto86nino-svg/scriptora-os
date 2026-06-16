import type { BookConfig, Chapter } from "@/types/book";
import {
  collectPriorBeatClusters,
  extractBeatClustersFromText,
  scoreEmotionalRepetition,
} from "@/lib/premium-writing/narrative-beat-engine";
import { lower, normalizeManuscriptSpacing } from "./shared-utils";
import type { WritingEngineContext } from "./types";

const BEAT_SIGNALS = [
  "ho paura", "fidarmi", "trauma", "guarire", "un giorno alla volta",
  "non sono pront", "ti amo", "non ti merito", "dobbiamo parlarne",
  "i am afraid", "trust", "heal", "one day at a time", "not ready",
  "i love you", "don't deserve", "we need to talk",
];

export function buildNarrativeBeatDeduplicatorBlock(
  config: BookConfig,
  opts: WritingEngineContext & { previousChapters?: Chapter[] } = {},
): string {
  const priorChapters = opts.previousChapters || [];
  const priorClusters = priorChapters.length ? collectPriorBeatClusters(priorChapters as Chapter[]) : [];

  const spentList = priorClusters.length
    ? priorClusters.map((c) => `- ${c} (ALREADY SPENT — evolve, worsen, flip or concretize; do NOT repeat)`).join("\n")
    : "- (first chapter — establish fresh beats)";

  return `
ANTI-REPETITION ENGINE V2 / NARRATIVE BEAT DEDUPLICATOR:
Do NOT repeat the same fear, confession, wound or promise in new wording.
If beat already appeared → consequence, decision, obstacle, cost or changed dynamic.

BEATS ALREADY SPENT:
${spentList}

EVOLUTION EXAMPLES:
- BAD: Cap 4 "ho paura" → Cap 5 "ho ancora paura" → Cap 6 "ho sempre paura"
- GOOD: Cap 4 nega paura → Cap 5 scappa → Cap 6 sabotaggio → Cap 7 confessione → Cap 8 azione concreta

Language: ${config.language}`;
}

export function removeBeatEchoes(text: string, priorText = ""): string {
  const prior = lower(priorText);
  const signals = BEAT_SIGNALS.filter((signal) => prior.includes(signal));
  if (!signals.length) return text;

  return text.split(/\n{2,}/).filter((paragraph) => {
    const normalized = lower(paragraph);
    const repeats = signals.filter((signal) => normalized.includes(signal)).length;
    if (repeats === 0) return true;
    const hasNewConsequence = /\b(decis|scelse|firm|telefon|apr|chius|lasci|entr|usc|mentì|nascos|confessò|scapp|sabot|decided|chose|signed|called|opened|closed|left|entered|lied|hid|ran|sabotaged)\w*/i.test(paragraph);
    return hasNewConsequence || repeats < 2;
  }).join("\n\n");
}

export function applyNarrativeBeatDeduplicatorPostprocess(
  text: string,
  opts: WritingEngineContext = {},
): string {
  if (!text?.trim()) return text || "";
  let next = removeBeatEchoes(text, opts.priorText || "");

  const prior = opts.priorText || "";
  if (prior && scoreEmotionalRepetition(next, prior) < 48) {
    const paragraphs = next.split(/\n{2,}/);
    const pruned = paragraphs.filter((p, idx) => {
      if (idx === 0 || idx === paragraphs.length - 1) return true;
      const clusters = extractBeatClustersFromText(p);
      const priorClusters = extractBeatClustersFromText(prior);
      const overlap = clusters.filter((c) => priorClusters.includes(c));
      return overlap.length === 0 || /\b(decis|scelse|mentì|scapp|confess|decided|lied|ran)\w*/i.test(p);
    });
    if (pruned.length >= Math.max(2, paragraphs.length - 2)) next = pruned.join("\n\n");
  }

  return normalizeManuscriptSpacing(next);
}

export { scoreEmotionalRepetition, collectPriorBeatClusters };
