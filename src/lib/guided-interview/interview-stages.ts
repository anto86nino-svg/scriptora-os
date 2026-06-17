import type { GuidedInterviewState, InterviewQuestion } from "./types";
import { getForgeOpeningGreeting, FORGE_OPENING_QUESTION_ID } from "./opening-experience";
import {
  getForgeMemory,
  getMemoryProgressLabel,
  resolveMemoryStage,
  selectNextMemoryQuestion,
} from "./interview-memory";
import { countForgeUserAnswers, isFirstForgeAssistantMessage, isTechnicalPrematureContent } from "./opening-experience";

export type InterviewStage = import("./interview-memory").ForgeMemoryStage;

import type { InterviewQuickSuggestion } from "./types";

export const OPENING_QUICK_CHOICES: InterviewQuickSuggestion[] = [
  { label: "Ho solo un'idea confusa", value: "Ho solo un'idea confusa, ancora sfocata." },
  { label: "Partiamo da un personaggio", value: "Voglio partire da un personaggio che non riesco a togliermi dalla testa." },
  { label: "Partiamo da una scena", value: "Voglio partire da una scena precisa che vedo già davanti a me." },
  { label: "Partiamo da un titolo", value: "Ho già un titolo o un'immagine-titolo da cui partire." },
  { label: "Guidami tu", value: "Non lo so ancora — guidami tu con domande semplici." },
];

const GENERIC_PLACEHOLDER =
  "Parla liberamente: idea, note, voce, caos… Scriptora organizzerà il resto.";

export function resolveInterviewStage(state: GuidedInterviewState): InterviewStage {
  return resolveMemoryStage(getForgeMemory(state));
}

export function getWelcomeInterviewQuestion(state?: GuidedInterviewState): InterviewQuestion {
  const hasIdea =
    Boolean(state?.extracted?.promise?.trim()) ||
    Boolean(state?.extracted?.centralConflict?.trim()) ||
    Boolean(state?.forgeMemory?.slotValues.rawIdea);

  return {
    id: FORGE_OPENING_QUESTION_ID,
    key: "openingSpark",
    question: getForgeOpeningGreeting({ hasExistingIdea: hasIdea }),
    placeholder: GENERIC_PLACEHOLDER,
    quickSuggestions: OPENING_QUICK_CHOICES,
  };
}

export function selectNextForgeQuestion(state: GuidedInterviewState): InterviewQuestion | null {
  if (isFirstForgeAssistantMessage(state)) return null;
  return selectNextMemoryQuestion(state);
}

export function getInterviewProgressLabel(state: GuidedInterviewState): string {
  const memory = getForgeMemory(state);
  return `Stiamo costruendo: ${getMemoryProgressLabel(memory)}`;
}

export function filterPrematureTechnicalQuestion(
  question: InterviewQuestion,
  state: GuidedInterviewState,
): InterviewQuestion | null {
  if (countForgeUserAnswers(state) < 3 && isTechnicalPrematureContent(question.question)) {
    return null;
  }
  if (countForgeUserAnswers(state) < 2 && isTechnicalPrematureContent(question.helper ?? "")) {
    return null;
  }
  return question;
}
