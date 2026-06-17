import type { GuidedInterviewState } from "./types";
import { evaluateEditorialUnderstanding, detectEditorialBookMode } from "./book-understanding-engine";
import { countForgeUserAnswers } from "./opening-experience";
import { resolveInterviewStage, selectNextForgeQuestion } from "./interview-stages";

export interface ForgeReadinessReport {
  ready: boolean;
  canShowConfirmation: boolean;
  confidence: number;
  missingCritical: string[];
  weakAreas: string[];
  contradictions: string[];
  nextBestQuestion: string;
  humanGapMessage?: string;
}

function hasText(value: unknown, min = 8): boolean {
  return typeof value === "string" && value.trim().length >= min;
}

export function evaluateForgeReadiness(state: GuidedInterviewState): ForgeReadinessReport {
  const editorial = evaluateEditorialUnderstanding(state);
  const ex = state.extracted ?? {};
  const mode = detectEditorialBookMode(state);
  const missingCritical: string[] = [];
  const weakAreas: string[] = [];

  const hasDirection =
    hasText(ex.genreDNA) ||
    hasText(state.selectedGenre) ||
    hasText(state.inferredProfile?.genre);
  const hasPromise = hasText(ex.promise) || hasText(ex.readerTransformation);
  const hasReader = hasText(ex.targetReader);
  const hasTone = hasText(ex.emotionalTone);
  const hasConflict = hasText(ex.centralConflict) || hasText(ex.narrativeDrive);
  const hasStructure = hasText(ex.structurePreference) || hasText(ex.chapterCount);

  if (!hasDirection) missingCritical.push("direzione / tipo libro");
  if (!hasPromise) missingCritical.push("promessa");
  if (!hasReader) missingCritical.push("lettore ideale");
  if (!hasTone) missingCritical.push("tono");
  if (!hasConflict) missingCritical.push("conflitto / cuore del libro");
  if (!hasStructure) missingCritical.push("struttura minima");

  if (mode === "fiction") {
    const hasProtagonist = hasText(ex.protagonistWound) || hasText(ex.centralConflict);
    const hasEnding = hasText(ex.readerTransformation) || hasText(ex.narrativeDrive);
    if (!hasProtagonist) missingCritical.push("protagonista");
    if (!hasEnding) missingCritical.push("finale o direzione finale");
  }

  if (mode === "nonfiction") {
    if (!hasText(ex.centralConflict)) missingCritical.push("problema centrale");
    if (!hasText(ex.genreDNA)) missingCritical.push("metodo");
    if (!hasPromise) missingCritical.push("promessa concreta");
    if (!hasReader) missingCritical.push("pubblico");
  }

  if (mode === "poetry") {
    if (!hasTone) missingCritical.push("campo emotivo");
    if (!hasPromise) missingCritical.push("promessa poetica");
    if (missingCritical.includes("conflitto / cuore del libro")) {
      const idx = missingCritical.indexOf("conflitto / cuore del libro");
      if (idx >= 0) missingCritical.splice(idx, 1);
    }
  }

  for (const spot of editorial.blindSpots) {
    weakAreas.push(spot);
  }

  const contradictions = editorial.contradictions.map((c) => c.label);
  const userAnswers = countForgeUserAnswers(state);
  const conceptTooVague = userAnswers < 3 && !hasDirection && !hasPromise;

  const ready =
    editorial.readyForBlueprint &&
    missingCritical.length === 0 &&
    contradictions.length === 0 &&
    userAnswers >= 4;

  const canShowConfirmation =
    ready ||
    (missingCritical.length <= 1 && userAnswers >= 6 && editorial.overallConfidence >= 0.62);

  const nextQuestion = selectNextForgeQuestion(state);
  const nextBestQuestion =
    nextQuestion?.question ??
    "Ci siamo quasi. Prima di bloccare il libro, mi manca ancora una cosa importante — raccontamela con una scena concreta.";

  let humanGapMessage: string | undefined;
  if (!ready && missingCritical.length > 0) {
    humanGapMessage = `Ci siamo quasi. Prima di bloccare il libro, mi manca ancora una cosa importante: ${missingCritical[0]}.`;
  }
  if (conceptTooVague) {
    humanGapMessage =
      "Ci siamo, ma l'idea è ancora troppo astratta. Fammi vedere una scena concreta prima di andare avanti.";
  }
  if (contradictions.length > 0) {
    humanGapMessage =
      "Qui sento due libri diversi. Dimmi quale deve comandare — poi proseguiamo.";
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
  };
}

export function shouldBlockBlueprint(state: GuidedInterviewState): boolean {
  return !evaluateForgeReadiness(state).ready;
}
