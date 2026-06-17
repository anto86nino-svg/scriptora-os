import type { GuidedInterviewState } from "./types";
import { evaluateEditorialUnderstanding, detectEditorialBookMode } from "./book-understanding-engine";
import { countForgeUserAnswers } from "./opening-experience";
import {
  buildForgeMemoryRecap,
  getCriticalMissingSlots,
  getForgeMemory,
  isSlotFilled,
} from "./interview-memory";
import { selectNextForgeQuestion } from "./interview-stages";

export interface ForgeReadinessReport {
  ready: boolean;
  canShowConfirmation: boolean;
  confidence: number;
  missingCritical: string[];
  weakAreas: string[];
  contradictions: string[];
  nextBestQuestion: string;
  humanGapMessage?: string;
  recap?: string | null;
}

const SLOT_LABELS: Record<string, string> = {
  rawIdea: "idea grezza",
  language: "lingua",
  genre: "genere",
  bookType: "tipo libro",
  tone: "tono",
  audience: "lettore ideale",
  promise: "promessa",
  protagonist: "protagonista",
  antagonist: "antagonista",
  narrativeArc: "arco narrativo",
  indexOutline: "indice",
  centralConflict: "conflitto",
  endingDirection: "finale",
  chapterCount: "struttura",
  title: "titolo",
  method: "metodo",
  problem: "problema centrale",
  outcome: "risultato promesso",
};

function labelSlot(slot: string): string {
  return SLOT_LABELS[slot] ?? slot;
}

export function evaluateForgeReadiness(state: GuidedInterviewState): ForgeReadinessReport {
  const editorial = evaluateEditorialUnderstanding(state);
  const memory = getForgeMemory(state);
  const mode = detectEditorialBookMode(state);
  const missingSlots = getCriticalMissingSlots(memory);
  const missingCritical = missingSlots.map(labelSlot);
  const weakAreas = editorial.blindSpots;
  const contradictions = editorial.contradictions.map((c) => c.label);
  const userAnswers = countForgeUserAnswers(state);

  const hasLanguage = isSlotFilled(memory, "language");
  const hasGenre = isSlotFilled(memory, "genre") || isSlotFilled(memory, "bookType");
  const hasPromise = isSlotFilled(memory, "promise");
  const hasTone = isSlotFilled(memory, "tone");
  const hasStructure =
    isSlotFilled(memory, "chapterCount") || isSlotFilled(memory, "pov");
  const hasTitle = isSlotFilled(memory, "title");

  const narrativeReady =
    isSlotFilled(memory, "protagonist") &&
    isSlotFilled(memory, "antagonist") &&
    isSlotFilled(memory, "centralConflict") &&
    (isSlotFilled(memory, "narrativeArc") || isSlotFilled(memory, "endingDirection")) &&
    isSlotFilled(memory, "endingDirection");

  const architectReady =
    hasTitle &&
    (mode !== "fiction" ||
      !isSlotFilled(memory, "chapterCount") ||
      isSlotFilled(memory, "indexOutline"));

  const nonfictionReady =
    isSlotFilled(memory, "problem") &&
    isSlotFilled(memory, "method") &&
    isSlotFilled(memory, "audience");

  const baseReady =
    hasLanguage &&
    hasGenre &&
    hasPromise &&
    hasTone &&
    hasStructure &&
    hasTitle &&
    userAnswers >= 4;

  const modeReady =
    mode === "nonfiction"
      ? nonfictionReady
      : mode === "poetry"
        ? hasPromise && hasTone
        : narrativeReady;

  const ready =
    baseReady &&
    modeReady &&
    architectReady &&
    contradictions.length === 0 &&
    missingCritical.length === 0;

  const canShowConfirmation =
    ready ||
    (missingCritical.length <= 1 && userAnswers >= 6 && hasLanguage && hasGenre);

  const nextQuestion = selectNextForgeQuestion(state);
  const nextBestQuestion =
    nextQuestion?.question ??
    "Ci siamo quasi. Prima di bloccare il libro, mi manca ancora una cosa importante.";

  let humanGapMessage: string | undefined;
  if (!ready && missingCritical.length > 0) {
    humanGapMessage = `Ci siamo quasi. Prima di bloccare il libro, mi manca ancora: ${missingCritical[0]}.`;
  }
  if (!hasLanguage) {
    humanGapMessage = "Prima di costruire l'indice, mi serve la lingua del libro.";
  }
  if (contradictions.length > 0) {
    humanGapMessage = "Qui sento due libri diversi. Dimmi quale deve comandare.";
  }

  return {
    ready,
    canShowConfirmation,
    confidence: editorial.overallConfidence,
    missingCritical,
    weakAreas,
    contradictions,
    nextBestQuestion,
    humanGapMessage,
    recap: buildForgeMemoryRecap(memory),
  };
}

export function shouldBlockBlueprint(state: GuidedInterviewState): boolean {
  return !evaluateForgeReadiness(state).ready;
}
