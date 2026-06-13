/**
 * ANTI-REPETITION DIRECTOR
 *
 * Detects and compresses repeated emotional beats within a chapter.
 * Conservative: only trims content when repetition is clear.
 * Never rewrites from scratch — preserves the strongest version.
 *
 * Pure function — never throws.
 */

/**
 * Normalize a string for comparison: lowercase, no punctuation, collapsed spaces.
 */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu, " ").replace(/\s+/g, " ").trim();
}

/**
 * Split text into paragraphs.
 */
function paragraphs(text: string): string[] {
  return text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
}

/**
 * Simple word-overlap similarity between two normalized strings. Range 0–1.
 */
function overlapSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(" ").filter(w => w.length > 4));
  const wordsB = new Set(b.split(" ").filter(w => w.length > 4));
  if (!wordsA.size || !wordsB.size) return 0;
  let shared = 0;
  for (const w of wordsA) { if (wordsB.has(w)) shared++; }
  return shared / Math.max(wordsA.size, wordsB.size);
}

/**
 * Detect groups of paragraphs that are too similar (same beat, different words).
 * Returns indices of the weaker duplicates to remove.
 */
function findRedundantParagraphs(paras: string[], threshold = 0.38): Set<number> {
  const normed = paras.map(normalize);
  const toRemove = new Set<number>();

  for (let i = 0; i < normed.length; i++) {
    if (toRemove.has(i)) continue;
    for (let j = i + 1; j < normed.length; j++) {
      if (toRemove.has(j)) continue;
      // Only compare paragraphs that are reasonably long (not single sentences)
      if (normed[i].length < 80 || normed[j].length < 80) continue;
      const sim = overlapSimilarity(normed[i], normed[j]);
      if (sim > threshold) {
        // Keep the longer (richer) version
        if (paras[i].length >= paras[j].length) {
          toRemove.add(j);
        } else {
          toRemove.add(i);
          break; // i removed, move on
        }
      }
    }
  }
  return toRemove;
}

/**
 * Patterns that signal an emotionally repeated beat:
 * "I realized again", "once more she understood", "for the nth time he felt"
 */
const REPETITION_SIGNALS_IT: RegExp[] = [
  /ancora una volta (capì|sentì|si rese conto|si ritrovò)/i,
  /di nuovo (capì|sentì|si rese conto|si ritrovò)/i,
  /per l.ennesima volta/i,
  /come già sapeva/i,
  /non era la prima volta che/i,
];

const REPETITION_SIGNALS_EN: RegExp[] = [
  /once again (she|he|they) (realized|understood|felt|knew)/i,
  /for the (nth|hundredth|thousandth) time/i,
  /she (already|once again) knew/i,
  /not for the first time/i,
  /as (she|he) had (known|felt|realized) before/i,
];

/**
 * Flag paragraphs that explicitly call out repetition (meta-repetition).
 * These are often signs the AI is spinning its wheels.
 */
function flagMetaRepetition(paras: string[], language: string): Set<number> {
  const isItalian = /ital/i.test(language);
  const signals = isItalian ? REPETITION_SIGNALS_IT : REPETITION_SIGNALS_EN;
  const flagged = new Set<number>();
  for (let i = 0; i < paras.length; i++) {
    if (signals.some(p => p.test(paras[i]))) {
      flagged.add(i);
    }
  }
  return flagged;
}

type BeatCategory =
  | "fearConfession"
  | "lossConfession"
  | "traumaReveal"
  | "oneDayPromise"
  | "tearfulEmbrace"
  | "intimateMorning"
  | "homeFeeling"
  | "instantHealing";

const BEAT_PATTERNS: Record<"it" | "en", Record<BeatCategory, RegExp[]>> = {
  it: {
    fearConfession: [/\bho paura\b/i, /\baveva paura\b/i, /\bmi fa paura\b/i],
    lossConfession: [/\bnon voglio perderti\b/i, /\bpaura di perdert[ia]\b/i, /\bnon posso perdert[ia]\b/i],
    traumaReveal: [/\bnon l ho mai detto\b/i, /\bnon ne ho mai parlato\b/i, /\bquando ero piccol[oa]\b/i, /\bquella notte\b/i],
    oneDayPromise: [/\bun giorno alla volta\b/i, /\bci proviamo piano\b/i, /\brestiamo qui\b/i],
    tearfulEmbrace: [/\bsi abbracciarono\b/i, /\blacrime\b/i, /\bpiangeva\b/i, /\bpiangere\b/i],
    intimateMorning: [/\bcolazione\b/i, /\bcaffe\b/i, /\bcaffè\b/i, /\bmattina\b/i, /\bletto\b/i],
    homeFeeling: [/\bmi sento a casa\b/i, /\bsembrava casa\b/i, /\bera casa\b/i],
    instantHealing: [/\bfinalmente guar[ìi]\b/i, /\btutto era risolto\b/i, /\bera finita la paura\b/i],
  },
  en: {
    fearConfession: [/\bi'?m afraid\b/i, /\bi am afraid\b/i, /\bshe was afraid\b/i, /\bhe was afraid\b/i],
    lossConfession: [/\bi don'?t want to lose you\b/i, /\bafraid of losing you\b/i, /\bi can'?t lose you\b/i],
    traumaReveal: [/\bi never told anyone\b/i, /\bi never talked about it\b/i, /\bwhen i was a child\b/i, /\bthat night\b/i],
    oneDayPromise: [/\bone day at a time\b/i, /\bwe try slowly\b/i, /\bwe stay here\b/i],
    tearfulEmbrace: [/\bthey embraced\b/i, /\btears\b/i, /\bcrying\b/i, /\bcried\b/i],
    intimateMorning: [/\bbreakfast\b/i, /\bcoffee\b/i, /\bmorning\b/i, /\bbed\b/i],
    homeFeeling: [/\bi feel at home\b/i, /\bfelt like home\b/i, /\bit was home\b/i],
    instantHealing: [/\bfinally healed\b/i, /\beverything was solved\b/i, /\bthe fear was gone\b/i],
  },
};

const PROGRESSION_MARKERS: RegExp[] = [
  /\b(decise|scelse|firmò|telefonò|uscì|entrò|trovò|rivelò|consegnò|sparì|fuggì|accettò|rifiutò|promise a se stessa|da quel momento|per questo|quindi|allora)\b/i,
  /\b(decided|chose|signed|called|left|entered|found|revealed|handed|vanished|ran|accepted|refused|from that moment|because of that|so then)\b/i,
];

function locale(language: string): "it" | "en" {
  return /ital/i.test(language) ? "it" : "en";
}

function beatCategories(text: string, language: string): Set<BeatCategory> {
  const patterns = BEAT_PATTERNS[locale(language)];
  const found = new Set<BeatCategory>();
  for (const [category, tests] of Object.entries(patterns) as Array<[BeatCategory, RegExp[]]>) {
    if (tests.some((pattern) => pattern.test(text))) found.add(category);
  }
  return found;
}

function hasProgression(text: string): boolean {
  return PROGRESSION_MARKERS.some((pattern) => pattern.test(text));
}

function flagCrossChapterBeatRepetition(paras: string[], language: string, priorText = ""): Set<number> {
  const flagged = new Set<number>();
  if (!priorText.trim()) return flagged;
  const priorBeats = beatCategories(priorText, language);
  if (!priorBeats.size) return flagged;

  for (let i = 0; i < paras.length; i++) {
    const para = paras[i];
    if (para.length < 55 || para.length > 520) continue;
    if (hasProgression(para)) continue;
    const currentBeats = beatCategories(para, language);
    for (const beat of currentBeats) {
      if (priorBeats.has(beat)) {
        flagged.add(i);
        break;
      }
    }
  }

  return flagged;
}

export interface AntiRepetitionResult {
  text: string;
  removedCount: number;
  interventions: string[];
}

/**
 * Run the anti-repetition pass on a chapter text.
 * Conservative: similarity threshold is high to avoid false positives.
 */
export function applyAntiRepetitionDirector(
  text: string,
  language = "Italian",
  priorText = "",
): AntiRepetitionResult {
  if (!text?.trim()) return { text: text ?? "", removedCount: 0, interventions: [] };

  const paras = paragraphs(text);
  if (paras.length < 3) return { text, removedCount: 0, interventions: [] };

  const redundant = findRedundantParagraphs(paras, 0.40);
  const metaRepeat = flagMetaRepetition(paras, language);
  const crossChapterBeats = flagCrossChapterBeatRepetition(paras, language, priorText);
  const toRemove = new Set([...redundant, ...metaRepeat, ...crossChapterBeats]);

  if (!toRemove.size) return { text, removedCount: 0, interventions: [] };

  const interventions: string[] = [];
  const kept: string[] = [];

  for (let i = 0; i < paras.length; i++) {
    if (toRemove.has(i)) {
      interventions.push(`Removed redundant paragraph #${i + 1}: "${paras[i].slice(0, 60)}…"`);
    } else {
      kept.push(paras[i]);
    }
  }

  return {
    text: kept.join("\n\n"),
    removedCount: toRemove.size,
    interventions,
  };
}
