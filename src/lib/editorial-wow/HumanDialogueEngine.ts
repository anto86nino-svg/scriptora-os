/**
 * HUMAN DIALOGUE ENGINE
 *
 * Post-processes dialogue to reduce AI-perfect patterns:
 * - Removes therapist-speak completions
 * - Adds micro-hesitations to overly clean sentences
 * - Breaks up over-long dialogue runs
 * - Adds small physical beats near speech
 *
 * Conservative: touches at most ~10% of dialogue lines.
 * Pure, synchronous, never throws.
 */

type Lang = "it" | "en" | "default";

function langKey(language: string): Lang {
  const l = language.toLowerCase();
  if (l.includes("ital")) return "it";
  if (l.includes("engl")) return "en";
  return "default";
}

/* ---- Overly-complete dialogue patterns → more human alternatives ---- */

const THERAPIST_PATTERNS_IT: Array<[RegExp, string]> = [
  [/([""«])Devo essere onest[oa] con me stess[oa]\.?([""»])/gi, "$1Non so nemmeno da dove cominciare.$2"],
  [/([""«])Hai ragione\. Hai completamente ragione\.?([""»])/gi, "$1...sì.$2"],
  [/([""«])Ho capito cosa provo (davvero|veramente)\.?([""»])/gi, "$1Ancora non lo so.$2"],
  [/([""«])Dobbiamo affrontare questo insieme\.?([""»])/gi, "$1Non lo so. Forse.$2"],
  [/([""«])Le mie emozioni sono valide\.?([""»])/gi, "$1Non lo dire come se fosse semplice.$2"],
  [/([""«])Ti (amo|voglio bene) nonostante tutto\.?([""»])/gi, "$1Nonostante tutto, sì.$2"],
];

const THERAPIST_PATTERNS_EN: Array<[RegExp, string]> = [
  [/([""«])I need to be honest with myself\.?([""»])/gi, "$1I don't even know where to start.$2"],
  [/([""«])You're right\. You're completely right\.?([""»])/gi, "$1...yeah.$2"],
  [/([""«])I finally understand what I feel\.?([""»])/gi, "$1I still don't know.$2"],
  [/([""«])We need to work through this together\.?([""»])/gi, "$1I don't know. Maybe.$2"],
  [/([""«])My feelings are valid\.?([""»])/gi, "$1Don't say it like it's simple.$2"],
  [/([""«])I love you despite everything\.?([""»])/gi, "$1Despite everything. Yeah.$2"],
  [/([""«])I understand (exactly )?how you feel\.?([""»])/gi, "$1I don't. But I'm here.$2"],
  [/([""«])We can talk about this later\.?([""»])/gi, "$1Not now.$2"],
];

/* ---- Hesitation injector: for long, perfectly articulated dialogue lines ---- */

// A dialogue line is "too perfect" if it's > 80 chars and contains zero hesitation markers
const HESITATION_MARKERS = /(\.\.\.|—|–|,\s*(ma|but|però|eppure)|\b(uh|um|er|ehm|cioè|voglio dire|I mean|you know|non so)\b)/i;

const HESITATIONS_IT = ["Cioè...", "Non so,", "Voglio dire,", "Aspetta,", "Sì, però—"];
const HESITATIONS_EN = ["I mean...", "Look,", "It's just—", "I don't—", "Wait,"];

function injectHesitation(dialogue: string, lang: Lang, index: number): string {
  if (dialogue.length < 85 || HESITATION_MARKERS.test(dialogue)) return dialogue;
  // Only inject ~every 3rd qualifying line to stay conservative
  if (index % 3 !== 0) return dialogue;
  const pool = lang === "it" ? HESITATIONS_IT : HESITATIONS_EN;
  const prefix = pool[index % pool.length];
  return prefix + " " + dialogue.charAt(0).toLowerCase() + dialogue.slice(1);
}

/* ---- Physical beats near dialogue (break up pure dialogue blocks) ---- */

const BEATS_IT = [
  "Si fermò, cercando le parole.",
  "Abbassò lo sguardo.",
  "Lasciò che il silenzio riempisse lo spazio.",
  "Strinse le dita.",
];
const BEATS_EN = [
  "She paused, searching for the words.",
  "He looked away.",
  "The silence stretched between them.",
  "She tightened her fingers around nothing.",
];

function shouldInjectBeat(lines: string[], index: number): boolean {
  // If we have 3+ consecutive dialogue lines with no action beat, inject one
  const dialoguePattern = /^\s*[""«]/;
  if (index < 2) return false;
  return (
    dialoguePattern.test(lines[index - 2]) &&
    dialoguePattern.test(lines[index - 1]) &&
    dialoguePattern.test(lines[index]) &&
    index % 3 === 2
  );
}

export interface DialogueEngineResult {
  text: string;
  interventions: string[];
}

/**
 * Apply the human dialogue engine to a chapter text.
 */
export function applyHumanDialogueEngine(
  text: string,
  language = "Italian",
): DialogueEngineResult {
  if (!text?.trim()) return { text: text ?? "", interventions: [] };

  const lang = langKey(language);
  const interventions: string[] = [];

  // 1. Strip therapist-speak patterns
  let result = text;
  const patterns = lang === "it" ? THERAPIST_PATTERNS_IT : THERAPIST_PATTERNS_EN;
  for (const [pattern, replacement] of patterns) {
    const before = result;
    result = result.replace(pattern, replacement);
    if (result !== before) interventions.push(`Therapist dialogue softened: ${pattern.source.slice(0, 40)}…`);
  }

  // 2. Process line by line for hesitation injection and beat insertion
  const lines = result.split("\n");
  const processed: string[] = [];
  const beatPool = lang === "it" ? BEATS_IT : BEATS_EN;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dialogueMatch = line.match(/^(\s*)([""«])(.+)([""»])(.*)$/);

    if (dialogueMatch) {
      const [, indent, open, content, close, tail] = dialogueMatch;
      const hesitant = injectHesitation(content, lang, i);
      if (hesitant !== content) {
        interventions.push(`Hesitation injected in line ${i + 1}`);
        processed.push(`${indent}${open}${hesitant}${close}${tail}`);
      } else {
        processed.push(line);
      }
      // Physical beat after 3 consecutive dialogue lines
      if (shouldInjectBeat(lines, i)) {
        const beat = beatPool[i % beatPool.length];
        processed.push("");
        processed.push(beat);
        processed.push("");
        interventions.push(`Physical beat injected after line ${i + 1}`);
      }
    } else {
      processed.push(line);
    }
  }

  return {
    text: processed.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
    interventions,
  };
}
