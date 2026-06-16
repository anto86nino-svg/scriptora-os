import type { BookConfig } from "@/types/book";
import { isItalianLanguage, type WritingEngineContext } from "./types";
import { hashSeed, normalizeManuscriptSpacing } from "./shared-utils";

const ITALIAN_THERAPY_DIALOGUE: RegExp[] = [
  /«?\s*devo raccontarti tutto il mio trauma[^».\n]*(?:[.»])?/gi,
  /«?\s*questa è la mia ferita emotiva[^».\n]*(?:[.»])?/gi,
  /«?\s*il mio punto cieco emotivo[^».\n]*(?:[.»])?/gi,
  /«?\s*ora sono finalmente guarita[^».\n]*(?:[.»])?/gi,
  /«?\s*sto elaborando il mio dolore[^».\n]*(?:[.»])?/gi,
  /«?\s*devo imparare ad amare me stessa[^».\n]*(?:[.»])?/gi,
  /«?\s*ho bisogno di essere onest[oa] con te[^».\n]*(?:[.»])?/gi,
  /«?\s*parliamo dei nostri sentimenti[^».\n]*(?:[.»])?/gi,
  /\bera come se il suo cuore (?:si spezzasse|avesse capito tutto)[^.\n]*(?:\.)?/gi,
];

const ENGLISH_THERAPY_DIALOGUE: RegExp[] = [
  /"?\s*i need to tell you all my trauma[^".\n]*(?:[."])?/gi,
  /"?\s*this is my emotional wound[^".\n]*(?:[."])?/gi,
  /"?\s*my emotional blind spot is[^".\n]*(?:[."])?/gi,
  /"?\s*i am finally healed now[^".\n]*(?:[."])?/gi,
  /"?\s*i am processing my pain[^".\n]*(?:[."])?/gi,
  /"?\s*i need to learn to love myself[^".\n]*(?:[."])?/gi,
  /"?\s*i need to be honest with you about my feelings[^".\n]*(?:[."])?/gi,
  /"?\s*let's talk about our feelings[^".\n]*(?:[."])?/gi,
  /\bit was as if her heart (?:broke|understood everything)[^.\n]*(?:\.)?/gi,
];

const ITALIAN_AI_METAPHOR: RegExp[] = [
  /come un['']?(?:a)?\s*(?:onda|tempesta|marea) di (?:emozioni|sentimenti)/gi,
  /\bil silenzio pesava come (?:piombo|un manto)\b/gi,
];

const ENGLISH_AI_METAPHOR: RegExp[] = [
  /\blike a (?:wave|storm|tide) of emotions\b/gi,
  /\bthe silence hung like (?:lead|a weight)\b/gi,
];

const MAX_V4_TOUCHES = 4;

export function buildHumanImperfectionV4Block(config: BookConfig, _opts: WritingEngineContext = {}): string {
  const isRomance = /romance|love|dark/i.test([config.genre, config.subcategory, config.category].join(" "));

  return `
HUMAN IMPERFECTION LAYER V4 (MANDATORY):
Reduce: perfect dialogue, therapeutic clarity, emotional monologues, AI metaphors, too-intelligent speeches.
Increase: hesitation, broken sentences, topic changes, silence, defensive sarcasm, small lies, avoided eye contact, unsaid words.

MICRO-IMPERFECTIONS (use at least 2 per scene):
- false start / unfinished sentence
- wrong joke timing
- physical gesture before speech
- contradiction between words and action
- character answers a different question

${isRomance ? `ROMANCE RULE: Never grant full emotional availability too early. Friction > payoff. Attraction can exist while trust is withheld.` : ""}

VOICE FRICTION: characters dodge, interrupt, under-answer, overreact, protect ego, misunderstand on purpose.
Language: ${config.language}`;
}

export function applyHumanImperfectionV4Postprocess(
  text: string,
  opts: WritingEngineContext = {},
): string {
  if (!text?.trim()) return text || "";

  const language = opts.language || opts.config?.language || "Italian";
  const italian = isItalianLanguage(language);
  let next = text;
  let touches = 0;

  const therapy = italian ? ITALIAN_THERAPY_DIALOGUE : ENGLISH_THERAPY_DIALOGUE;
  const metaphors = italian ? ITALIAN_AI_METAPHOR : ENGLISH_AI_METAPHOR;

  for (const pattern of therapy) {
    if (touches >= MAX_V4_TOUCHES) break;
    const before = next;
    next = next.replace(pattern, "");
    if (before !== next) touches += 1;
  }

  for (const pattern of metaphors) {
    if (touches >= MAX_V4_TOUCHES) break;
    const before = next;
    next = next.replace(pattern, "");
    if (before !== next) touches += 1;
  }

  // Light behavioral echo injection on flat emotional tells (deterministic, rare)
  const flatTell = italian
    ? /\b(Era|Erano) (?:trist[ei]|nervos[ao]|spaventat[ao])\.\s*$/gim
    : /\b(She|He|They) (?:was|were) (?:sad|nervous|afraid)\.\s*$/gim;

  if (touches < MAX_V4_TOUCHES && flatTell.test(next)) {
    const seed = hashSeed(next);
    const gesture = italian
      ? ["Distolse lo sguardo.", "Si sistemò il polso come se fosse importante.", "Disse «sto bene» troppo in fretta."][seed % 3]
      : ["She looked away.", "She adjusted her sleeve for no reason.", "She said \"I'm fine\" too quickly."][seed % 3];
    next = next.replace(flatTell, gesture);
    touches += 1;
  }

  return normalizeManuscriptSpacing(next);
}
