import type { BookConfig } from "@/types/book";
import { isItalianLanguage, type WritingEngineContext } from "./types";
import { hashSeed, normalizeManuscriptSpacing, splitParagraphs } from "./shared-utils";

const FORBIDDEN_ENDING_IT = /\b(finalmente|per sempre|tutto era chiaro|era finita|non aveva più paura|andrà tutto bene|si sent(?:ì|irono) meglio|erano finalmente felici)\b/i;
const FORBIDDEN_ENDING_EN = /\b(finally|forever|everything was clear|it was over|she was no longer afraid|everything would be fine|felt better|were finally happy)\b/i;

const ENDING_ECHO_IT = [
  " Ma qualcosa, nel silenzio dopo, non tornava.",
  " Restò un dettaglio fuori posto — piccolo, ma impossibile da ignorare.",
  " Nessuno disse la cosa che entrambi stavano pensando.",
];

const ENDING_ECHO_EN = [
  " But something in the silence after it did not fit.",
  " One small detail stayed out of place — impossible to ignore.",
  " Neither of them said the thing they were both thinking.",
];

export function buildPageTurnEngineBlock(config: BookConfig, opts: WritingEngineContext = {}): string {
  const chapterLabel = typeof opts.chapterIndex === "number" ? `Chapter ${opts.chapterIndex + 1}` : "This chapter";

  return `
PAGE TURN ENGINE (V12):
Every scene/chapter must leave at least ONE open loop: question, mystery, friction, micro cliffhanger, promise, reversal, tension.
Forbidden endings: "finally happy", "felt better", "everything would be fine", emotionally solved closure (unless late-book earned payoff).
Required feel: reader thinks "just one more page."

SCENE TURN MATRIX:
- Every scene must change: power, desire, danger, trust, knowledge, intimacy, status, plan or moral cost.
- If scene starts and ends with same emotional info → transform into action, revelation, decision or consequence.

${chapterLabel} FINAL 10%:
Introduce pressure: consequence, withheld answer, new risk, intimate distance, contradiction, clue, deadline or irreversible choice.
Language: ${config.language}`;
}

export function buildEndingEchoSystemBlock(config: BookConfig): string {
  return `
ENDING ECHO SYSTEM (V12):
Last lines must NOT moralize or explain. Create emotional echo: image, question, absence, micro tension.
NO: "Finally it was over." / "She was healed now."
YES: concrete leftover detail, unanswered question, object out of place, silence that costs something.
Language: ${config.language}`;
}

export function hardenFlatClosedEnding(text: string, language?: string): string {
  const paragraphs = splitParagraphs(text);
  if (paragraphs.length < 3) return text;

  const italian = isItalianLanguage(language);
  const last = paragraphs[paragraphs.length - 1] || "";
  const forbidden = italian ? FORBIDDEN_ENDING_IT : FORBIDDEN_ENDING_EN;
  const echoes = italian ? ENDING_ECHO_IT : ENDING_ECHO_EN;

  if (!forbidden.test(last)) return text;

  const seed = hashSeed(last);
  paragraphs[paragraphs.length - 1] = last.replace(/\s*$/, echoes[seed % echoes.length]);
  return paragraphs.join("\n\n");
}

export function applyPageTurnPostprocess(text: string, opts: WritingEngineContext = {}): string {
  const language = opts.language || opts.config?.language || "Italian";
  return normalizeManuscriptSpacing(hardenFlatClosedEnding(text, language));
}

export function applyEndingEchoPostprocess(text: string, opts: WritingEngineContext = {}): string {
  return applyPageTurnPostprocess(text, opts);
}
