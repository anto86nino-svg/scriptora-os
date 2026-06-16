import { isItalianLanguage, type WritingEngineContext } from "./types";
import { hashSeed, normalizeManuscriptSpacing } from "./shared-utils";

const ITALIAN_TELLS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\b([A-ZÀÈÉÌÒÙ][a-zàèéìòù]+) (?:era|sentiva|capiva|realizzava|si rese conto che era) (?:nervos[ao]|triste|spaventat[ao]|arrabbiat[ao]|felice)\b/g, replacement: "$1 tamburellò le dita sul tavolo" },
  { pattern: /\b([A-ZÀÈÉÌÒÙ][a-zàèéìòù]+) capì che\b/g, replacement: "$1 smise di parlare abbastanza da capire" },
  { pattern: /\bsi rese conto che\b/gi, replacement: "notò, senza dirlo," },
  { pattern: /\baveva paura di\b/gi, replacement: "evitava persino pensare a" },
];

const ENGLISH_TELLS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\b([A-Z][a-z]+) (?:was|felt|realized she was|realized he was) (?:nervous|sad|afraid|angry|happy)\b/g, replacement: "$1 drummed her fingers on the table" },
  { pattern: /\b([A-Z][a-z]+) realized that\b/g, replacement: "$1 stopped talking long enough to notice" },
  { pattern: /\bshe realized that\b/gi, replacement: "she noticed, without saying it," },
  { pattern: /\bwas afraid of\b/gi, replacement: "avoided even thinking about" },
];

const MAX_TELL_FIXES = 3;

export function buildShowDontTellEnforcerBlock(language?: string): string {
  return `
SHOW DON'T TELL ENFORCER (V12):
REDUCE: sentiva, pensava, capiva, realizzò, si rese conto, era nervosa/triste/spaventata.
INCREASE: gesture, action, body, environment reaction, silence, object detail.

Ratio target: 70% behavior, 20% dialogue/subtext, 10% explicit emotion naming.
Language: ${language || "Italian"}`;
}

export function applyShowDontTellEnforcerPostprocess(
  text: string,
  opts: WritingEngineContext = {},
): string {
  if (!text?.trim()) return text || "";

  const language = opts.language || opts.config?.language || "Italian";
  const italian = isItalianLanguage(language);
  const rules = italian ? ITALIAN_TELLS : ENGLISH_TELLS;
  let next = text;
  let fixes = 0;
  const seed = hashSeed(text);

  for (const rule of rules) {
    if (fixes >= MAX_TELL_FIXES) break;
    if (!rule.pattern.test(next)) continue;
    rule.pattern.lastIndex = 0;
    const before = next;
    next = next.replace(rule.pattern, rule.replacement);
    if (before !== next) fixes += 1;
  }

  // Avoid over-editing: only apply first matching tell cluster
  if (fixes === 0 && seed % 4 === 0) {
    const softTell = italian ? /\bEra (?:nervos[ao]|triste)\.\b/g : /\bShe was (?:nervous|sad)\.\b/g;
    if (softTell.test(next)) {
      next = next.replace(softTell, italian ? "Le mani non stavano ferme." : "Her hands wouldn't stay still.");
    }
  }

  return normalizeManuscriptSpacing(next);
}

export function countShowVsTell(text: string): { tells: number; shows: number; ratio: number } {
  const tells = (text.match(/\b(sent(?:ì|i|iva|ire|iva)|pens(?:ò|ava|are)|cap(?:ì|iva|ire)|realizz(?:ò|ava)|si rese conto|was afraid|felt|realized|wondered)\b/gi) || []).length;
  const shows = (text.match(/\b(tamburell|piega(?:ò|va)|strinse|abbass(?:ò|ava)|tacque|mentì|scroll(?:ò|ava)|morse|drummed|looked away|wouldn't stay still)\w*/gi) || []).length;
  const ratio = tells + shows === 0 ? 0.5 : shows / (tells + shows);
  return { tells, shows, ratio };
}
