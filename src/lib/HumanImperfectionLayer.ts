import type { BookConfig, Chapter } from "@/types/book";
import { detectGenreBrainId } from "@/lib/GenreBrain";

export const HUMAN_IMPERFECTION_LAYER_STORAGE_KEY = "scriptora-human-imperfection-v25-enabled";

export type HumanImperfectionContext = {
  config?: Partial<BookConfig>;
  previousChapters?: Array<Pick<Chapter, "title" | "content">>;
  chapterIndex?: number;
  outlineSummary?: string;
  humanImperfectionEnabled?: boolean;
};

type LanguageKey = "it" | "en" | "default";
const MAX_IMPERFECTION_TOUCHES = 2;

function languageKey(config?: Partial<BookConfig>): LanguageKey {
  const language = String(config?.language || "").toLowerCase();
  if (language.includes("ital")) return "it";
  if (language.includes("english")) return "en";
  return "default";
}

export function isHumanImperfectionLayerEnabled(context: HumanImperfectionContext = {}): boolean {
  if (context.humanImperfectionEnabled === false) return false;
  if (context.humanImperfectionEnabled === true) return true;

  try {
    if (import.meta.env.VITE_SCRIPTORA_HUMAN_IMPERFECTION_V25 === "off") return false;
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem(HUMAN_IMPERFECTION_LAYER_STORAGE_KEY);
    return saved !== "off" && saved !== "false";
  } catch {
    return true;
  }
}

export function setHumanImperfectionLayerEnabled(enabled: boolean) {
  try {
    localStorage.setItem(HUMAN_IMPERFECTION_LAYER_STORAGE_KEY, enabled ? "on" : "off");
    window.dispatchEvent(new Event("scriptora-human-imperfection-v25-change"));
  } catch {
    // Storage can fail in private contexts. Generation should continue.
  }
}

function hashText(text: string): number {
  let hash = 0;
  for (let index = 0; index < Math.min(text.length, 900); index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'’]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function previousText(context: HumanImperfectionContext): string {
  return normalize(
    (context.previousChapters || [])
      .slice(-8)
      .map((chapter) => `${chapter.title || ""}\n${chapter.content || ""}`)
      .join("\n"),
  );
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

function chooseWithMemory(items: string[], seed: number, context: HumanImperfectionContext, currentText: string): string {
  if (!items.length) return "";
  const history = previousText(context);
  const current = normalize(currentText);
  const scored = items.map((item) => {
    const key = normalize(item);
    return {
      item,
      repeats: countOccurrences(history, key) * 3 + countOccurrences(current, key),
    };
  });
  const lowest = Math.min(...scored.map((item) => item.repeats));
  const leastRepeated = scored.filter((item) => item.repeats === lowest);
  return leastRepeated[seed % leastRepeated.length]?.item || scored[0].item;
}

function replaceOne(text: string, pattern: RegExp, replacement: string | ((match: string) => string)): string {
  let replaced = false;
  return text.replace(pattern, (match) => {
    if (replaced) return match;
    replaced = true;
    return typeof replacement === "function" ? replacement(match) : match.replace(pattern, replacement);
  });
}

function acceptMicroPass(current: string, candidate: string, state: { touches: number }): string {
  if (candidate === current || state.touches >= MAX_IMPERFECTION_TOUCHES) return current;
  state.touches += 1;
  return candidate;
}

function hasRecentTrauma(context: HumanImperfectionContext): boolean {
  const recent = previousText(context);
  return /\b(death|dead|blood|betrayal|betrayed|scream|screamed|burned|destroyed|curse|cursed|sacrifice|sacrificed|lost|loss|grief|war|murder|trauma|morto|morte|sangue|tradimento|urlo|maledizion|sacrificio|perdita|guerra)\b/i.test(recent);
}

function looksBeautiful(sentence: string): boolean {
  const clean = sentence.trim();
  if (clean.length < 48) return false;
  const markers = /\b(soul|heart|shadow|silence|eternity|infinite|stars|moon|blood|ghost|memory|sacred|prophecy|destiny|grief|beautiful|kingdom|anima|cuore|ombra|silenzio|eterno|stelle|luna|sangue|fantasma|memoria|sacro|profezia|destino|dolore)\b/i;
  return markers.test(clean) || /\b(as if|like a|like the|come se|sembrava)\b/i.test(clean);
}

function bodyBeat(language: LanguageKey, seed: number, context: HumanImperfectionContext, currentText: string): string {
  const beats: Record<LanguageKey, string[]> = {
    it: [
      "Il freddo le rimase sotto le costole.",
      "Si accorse troppo tardi di avere la mascella serrata.",
      "La stoffa le graffio il polso.",
      "Una piccola fitta le prese lo stomaco.",
    ],
    en: [
      "The cold sat between her ribs.",
      "She noticed too late that her jaw was locked.",
      "The strap dug into her shoulder.",
      "A small ache tightened under her ribs.",
      "Mud pulled at the edge of her boot.",
    ],
    default: [
      "The cold sat between her ribs.",
      "The strap dug into one shoulder.",
      "A small ache tightened under the ribs.",
    ],
  };
  return chooseWithMemory(beats[language] || beats.default, seed, context, currentText);
}

function mundaneBeat(language: LanguageKey, seed: number, context: HumanImperfectionContext, currentText: string): string {
  const beats: Record<LanguageKey, string[]> = {
    it: [
      "Da qualche parte cadde una goccia d'acqua.",
      "La polvere le pizzico la gola.",
      "Un bottone le tiro contro il collo.",
      "Il pavimento era freddo sotto la suola.",
    ],
    en: [
      "Somewhere, water dripped.",
      "Dust caught in her throat.",
      "A button pulled at her collar.",
      "The floor was cold through the sole of her boot.",
      "Her sleeve had come loose at the wrist.",
    ],
    default: [
      "Somewhere, water dripped.",
      "Dust caught in the throat.",
      "The floor was cold underfoot.",
    ],
  };
  return chooseWithMemory(beats[language] || beats.default, seed, context, currentText);
}

function applyBodyBeforePoetry(text: string, language: LanguageKey, context: HumanImperfectionContext): string {
  const seed = hashText(`${text.slice(0, 500)}body${context.chapterIndex ?? 0}`);
  let next = text;
  const body = bodyBeat(language, seed, context, next);

  const replacements: Array<[RegExp, string]> = [
    [/\bShe felt grief\b/g, "She forgot to breathe"],
    [/\bshe felt grief\b/g, "she forgot to breathe"],
    [/\bHe felt grief\b/g, "He forgot to breathe"],
    [/\bhe felt grief\b/g, "he forgot to breathe"],
    [/\bThe world felt broken\b/g, body],
    [/\bthe world felt broken\b/g, body.toLowerCase()],
    [/\bEverything inside her changed\b/g, "Her stomach turned before she knew why"],
    [/\beverything inside her changed\b/g, "her stomach turned before she knew why"],
    [/\bShe felt devastated\b/g, "She went still"],
    [/\bshe felt devastated\b/g, "she went still"],
    [/\bHe felt devastated\b/g, "He went still"],
    [/\bhe felt devastated\b/g, "he went still"],
  ];

  for (const [pattern, replacement] of replacements) {
    const candidate = replaceOne(next, pattern, replacement);
    if (candidate !== next) return candidate;
  }

  const fallbackReplacements: Array<[RegExp, string]> = [
    [/\bShe tightened her grip on the glass\b/g, "She tightened her grip hard enough to hurt"],
    [/\bshe tightened her grip on the glass\b/g, "she tightened her grip hard enough to hurt"],
    [/\bHe understood\b/g, "He almost said something. Then did not"],
    [/\bhe understood\b/g, "he almost said something, then did not"],
    [/\bShe understood\b/g, "She almost answered. Then did not"],
    [/\bshe understood\b/g, "she almost answered, then did not"],
  ];

  for (const [pattern, replacement] of fallbackReplacements) {
    const candidate = replaceOne(next, pattern, replacement);
    if (candidate !== next) return candidate;
  }

  return next;
}

function reduceTherapistWisdom(text: string, language: LanguageKey): string {
  const replacements: Record<LanguageKey, Array<[RegExp, string]>> = {
    it: [
      [/\bdevi perdonare te stess[oa]\b/gi, "non so come si sopravvive a cose cosi"],
      [/\bil dolore ti trasforma\b/gi, "forse ti cambia. Non lo so"],
      [/\bla ferita guarira\b/gi, "forse un giorno fara meno rumore"],
      [/\bogni trauma porta una lezione\b/gi, "non tutto deve insegnare qualcosa subito"],
    ],
    en: [
      [/\byou must forgive yourself\b/gi, "I don't know how people survive things like this"],
      [/\bthe pain transforms you\b/gi, "Maybe it changes you. I don't know"],
      [/\bthis wound will heal\b/gi, "Maybe one day it gets quieter"],
      [/\bevery trauma carries a lesson\b/gi, "not everything had to teach her something right away"],
      [/\bthe pain would transform (her|him|them)(?: if [^.?!]+)?/gi, "the pain mostly made $1 quiet"],
      [/\bthe pain transformed (her|him|them)\b/gi, "the pain mostly made $1 quiet"],
    ],
    default: [
      [/\byou must forgive yourself\b/gi, "I don't know how people survive things like this"],
      [/\bthe pain transforms you\b/gi, "Maybe it changes you. I don't know"],
    ],
  };

  for (const [pattern, replacement] of replacements[language] || replacements.default) {
    const candidate = replaceOne(text, pattern, replacement);
    if (candidate !== text) return candidate;
  }

  return text;
}

function applyContradiction(text: string, language: LanguageKey, context: HumanImperfectionContext): string {
  const seed = hashText(`${text.slice(0, 400)}contradiction${context.chapterIndex ?? 0}`);
  const handBeat = language === "it"
    ? chooseWithMemory(["Le mani, pero, tremavano.", "Poi torno indietro di mezzo passo.", "Disse di si. Il corpo no."], seed, context, text)
    : chooseWithMemory(["Her hands were shaking.", "Then she came back half a step.", "She said yes. Her body did not."], seed, context, text);

  const replacements: Array<[RegExp, string]> = [
    [/([\"“«])I'?m fine\.?([\"”»])/gi, `$1I'm fine.$2 ${handBeat}`],
    [/([\"“«])I am fine\.?([\"”»])/gi, `$1I'm fine.$2 ${handBeat}`],
    [/([\"“«])Sto bene\.?([\"”»])/gi, `$1Sto bene.$2 ${handBeat}`],
    [/\bShe stepped closer, certain\b/g, "She stepped closer, then stopped, suddenly angry"],
    [/\bshe stepped closer, certain\b/g, "she stepped closer, then stopped, suddenly angry"],
    [/\bHe stepped closer, certain\b/g, "He stepped closer, then stopped, suddenly angry"],
    [/\bhe stepped closer, certain\b/g, "he stepped closer, then stopped, suddenly angry"],
  ];

  for (const [pattern, replacement] of replacements) {
    const candidate = replaceOne(text, pattern, replacement);
    if (candidate !== text) return candidate;
  }

  return text;
}

function applyAftershock(text: string, language: LanguageKey, context: HumanImperfectionContext): string {
  if (!hasRecentTrauma(context)) return text;

  let next = text;
  const seed = hashText(`${text.slice(0, 400)}aftershock${context.chapterIndex ?? 0}`);
  const aftershock = language === "it"
    ? chooseWithMemory(["Non arrivo nessuna saggezza. Solo fastidio.", "Per un po' non provo niente, e questo la irrito.", "Capirlo avrebbe richiesto piu tempo."], seed, context, next)
    : chooseWithMemory(["No wisdom came. Only irritation.", "For a while she felt nothing, and that irritated her.", "Understanding it would take longer."], seed, context, next);

  const replacements: Array<[RegExp, string]> = [
    [/\bShe finally understood nothing could remain unchanged\b/g, "She did not understand it cleanly yet. Nothing could remain unchanged"],
    [/\bshe finally understood nothing could remain unchanged\b/g, "she did not understand it cleanly yet. Nothing could remain unchanged"],
    [/\bHe finally understood nothing could remain unchanged\b/g, "He did not understand it cleanly yet. Nothing could remain unchanged"],
    [/\bhe finally understood nothing could remain unchanged\b/g, "he did not understand it cleanly yet. Nothing could remain unchanged"],
    [/\bThe lesson became clear:\s*suffering had opened\b/g, "No wisdom came. Only irritation. Suffering had opened"],
    [/\bthe lesson became clear:\s*suffering had opened\b/g, "no wisdom came. Only irritation. Suffering had opened"],
    [/\bThe meaning became clear, shining and terrible\b/g, "The meaning did not become clear. It only kept shining, terrible and useless"],
    [/\bthe meaning became clear, shining and terrible\b/g, "the meaning did not become clear. It only kept shining, terrible and useless"],
    [/\bShe finally understood\b/g, "She understood almost nothing cleanly yet"],
    [/\bshe finally understood\b/g, "she understood almost nothing cleanly yet"],
    [/\bHe finally understood\b/g, "He understood almost nothing cleanly yet"],
    [/\bhe finally understood\b/g, "he understood almost nothing cleanly yet"],
    [/\beverything finally made sense\b/gi, "nothing made sense all at once"],
    [/\bthe lesson became clear\b/gi, aftershock],
    [/\bthe meaning became clear\b/gi, aftershock],
  ];

  for (const [pattern, replacement] of replacements) {
    const candidate = replaceOne(next, pattern, replacement);
    if (candidate !== next) return candidate;
  }

  return next;
}

function protectPersonOverTheme(text: string, language: LanguageKey): string {
  let next = text;
  const grounded = language === "it"
    ? "$1 era ancora $1, stanca e presente"
    : "$1 was still $1, tired and present";

  const replacements: Array<[RegExp, string]> = [
    [/\b([A-Z][\p{L}'’-]+) became a symbol of [^.?!]+/gu, grounded],
    [/\b([A-Z][\p{L}'’-]+) was the embodiment of [^.?!]+/gu, grounded],
    [/\bwaited like symbols of [^.?!]+/gi, "waited, tired and unsure"],
    [/\bceased to be a woman and became [^.?!]+/gi, "was still herself, even then"],
    [/\bsmise di essere una donna e divenne [^.?!]+/gi, "resto se stessa, anche allora"],
  ];

  for (const [pattern, replacement] of replacements) {
    const candidate = replaceOne(next, pattern, replacement);
    if (candidate !== next) return candidate;
  }

  return next;
}

function limitBeautyDensity(text: string, language: LanguageKey, context: HumanImperfectionContext): string {
  const paragraphs = text.split(/\n{2,}/);
  const seed = hashText(`${text.slice(0, 500)}beauty${context.chapterIndex ?? 0}`);
  let inserted = false;

  return paragraphs.map((paragraph, paragraphIndex) => {
    if (inserted || paragraph.length < 240) return paragraph;

    const sentences = paragraph.match(/[^.!?]+[.!?]+(?:["”»])?/g);
    if (!sentences || sentences.length < 4) return paragraph;

    let beautifulRun = 0;
    const rebuilt: string[] = [];
    for (const sentence of sentences) {
      rebuilt.push(sentence.trim());
      beautifulRun = looksBeautiful(sentence) ? beautifulRun + 1 : 0;
      if (!inserted && beautifulRun >= 2) {
        rebuilt.push(mundaneBeat(language, seed + paragraphIndex, context, paragraph));
        inserted = true;
        beautifulRun = 0;
      }
    }

    return rebuilt.join(" ");
  }).join("\n\n");
}

function reduceRepeatedBeautyPatterns(text: string, context: HumanImperfectionContext): string {
  const history = previousText(context);
  const repeatedPatterns = [
    "as if the world",
    "like a prayer",
    "full of ghosts",
    "old bells",
    "remembered her name",
    "the silence was infinite",
  ];

  let next = text;
  for (const pattern of repeatedPatterns) {
    if (!countOccurrences(history, normalize(pattern))) continue;
    const re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    next = replaceOne(next, re, (match) => {
      if (/full of ghosts/i.test(match)) return "too quiet";
      if (/like a prayer/i.test(match)) return "like old cloth";
      if (/the silence was infinite/i.test(match)) return "the silence lasted too long";
      if (/remembered her name/i.test(match)) return "held her there";
      if (/old bells/i.test(match)) return "distant bells";
      return "as if something ordinary had gone wrong";
    });
  }

  return next;
}

export function applyHumanImperfectionLayer(text: string, context: HumanImperfectionContext = {}): string {
  if (!text?.trim() || !isHumanImperfectionLayerEnabled(context)) return text;

  const genre = detectGenreBrainId(context.config);
  if (genre === "nonfiction") return text;

  const language = languageKey(context.config);
  const state = { touches: 0 };
  let next = text;

  next = acceptMicroPass(next, applyAftershock(next, language, context), state);
  next = acceptMicroPass(next, protectPersonOverTheme(next, language), state);
  next = acceptMicroPass(next, reduceTherapistWisdom(next, language), state);
  next = acceptMicroPass(next, applyBodyBeforePoetry(next, language, context), state);
  next = acceptMicroPass(next, applyContradiction(next, language, context), state);
  next = acceptMicroPass(next, reduceRepeatedBeautyPatterns(next, context), state);
  next = acceptMicroPass(next, limitBeautyDensity(next, language, context), state);

  return next.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
