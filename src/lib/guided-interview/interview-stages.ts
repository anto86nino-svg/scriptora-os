import type { GuidedInterviewState, InterviewQuestion } from "./types";
import { FORGE_OPENING_QUESTION_ID } from "./opening-experience";
import {
  getForgeMemory,
  getMemoryProgressLabel,
  resolveMemoryStage,
  selectNextMemoryQuestion,
} from "./interview-memory";
import { countForgeUserAnswers, isFirstForgeAssistantMessage, isTechnicalPrematureContent } from "./opening-experience";
import {
  getGenreSelectionQuestion,
} from "./forge-genre-catalog";

export type InterviewStage = import("./interview-memory").ForgeMemoryStage;

import type { InterviewQuickSuggestion } from "./types";

const GENERIC_PLACEHOLDER =
  "Parla liberamente: idea, note, voce, caos… Scriptora organizzerà il resto.";

export { getGenreSelectionQuestion };

/** @deprecated Idea-first opening chips — genre-first flow uses getGenreSelectionQuestion */
export const OPENING_QUICK_CHOICES: InterviewQuickSuggestion[] = [];

export function resolveInterviewStage(state: GuidedInterviewState): InterviewStage {
  return resolveMemoryStage(getForgeMemory(state));
}

export function getWelcomeInterviewQuestion(state?: GuidedInterviewState): InterviewQuestion {
  return getGenreSelectionQuestion();
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
