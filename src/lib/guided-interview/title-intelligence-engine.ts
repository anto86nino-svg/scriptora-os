import type { GuidedInterviewState, InterviewQuestion } from "./types";
import type { TitleIntelligence } from "./forge-evolution-types";
import { sanitizeDnaText } from "./dna-cleaner";

function clean(value?: unknown): string {
  return sanitizeDnaText(value);
}

export function deriveTitleIntelligence(state: GuidedInterviewState): TitleIntelligence {
  const ex = state.extracted ?? {};
  const existing = state.titleIntelligence ?? {};
  const working = clean(ex.bookTitle) || existing.workingTitle;
  const definitive = clean(ex.bookTitle) || existing.definitiveTitle || working;
  const subtitle = clean(ex.bookSubtitle) || existing.subtitle;
  const commercialHook = clean(existing.commercialHook) || clean(ex.openingHook);
  const commercialPromise = clean(existing.commercialPromise) || clean(ex.promise);

  return {
    workingTitle: working,
    definitiveTitle: definitive,
    subtitle,
    commercialHook,
    commercialPromise,
    approved: existing.approved ?? Boolean(definitive && commercialHook),
  };
}

export function isTitleIntelligenceComplete(state: GuidedInterviewState): boolean {
  const t = deriveTitleIntelligence(state);
  return Boolean(
    clean(t.definitiveTitle).length >= 3 &&
      clean(t.subtitle).length >= 6 &&
      clean(t.commercialHook).length >= 12 &&
      clean(t.commercialPromise).length >= 12,
  );
}

export function getTitleIntelligenceQuestions(state: GuidedInterviewState): InterviewQuestion[] {
  const t = deriveTitleIntelligence(state);
  const questions: InterviewQuestion[] = [];

  if (!clean(t.definitiveTitle)) {
    questions.push({
      id: "title-definitive",
      key: "bookTitle",
      question: "Se questo libro fosse già in libreria, quale titolo ti farebbe fermare davanti allo scaffale?",
      helper: "Non provvisorio — il titolo che senti giusto adesso.",
      placeholder: "Il titolo definitivo…",
    });
  } else if (!clean(t.subtitle)) {
    questions.push({
      id: "title-subtitle",
      key: "bookSubtitle",
      question: `Sotto «${t.definitiveTitle}», quale sottotitolo chiarisce la promessa senza tradirla?`,
      helper: "Una frase che vende l'esperienza, non riassume il plot.",
      placeholder: "Il sottotitolo definitivo…",
    });
  } else if (!clean(t.commercialHook)) {
    questions.push({
      id: "title-hook",
      key: "openingHook",
      question: "Qual è l'hook commerciale — la frase che fa dire al lettore: devo averlo?",
      helper: "Come la descriveresti su Amazon o in una presentazione.",
      placeholder: "L'hook che apre il mercato…",
    });
  } else if (!clean(t.commercialPromise)) {
    questions.push({
      id: "title-promise",
      key: "promise",
      question: "In una riga: cosa compra il lettore quando compra questo libro?",
      placeholder: "La promessa commerciale definitiva…",
    });
  }

  return questions.slice(0, 1);
}

export function applyTitleAnswer(
  state: GuidedInterviewState,
  key: string,
  answer: string,
): TitleIntelligence {
  const next = deriveTitleIntelligence(state);
  const value = clean(answer);
  if (key === "bookTitle") next.definitiveTitle = value;
  if (key === "bookSubtitle") next.subtitle = value;
  if (key === "openingHook") next.commercialHook = value;
  if (key === "promise") next.commercialPromise = value;
  next.approved = isTitleIntelligenceComplete({
    ...state,
    extracted: { ...state.extracted, [key]: value },
    titleIntelligence: next,
  });
  return next;
}
