import type { GuidedInterviewState, InterviewQuestion } from "./types";
import type { ForgeEvolutionReport, ForgePhase, ForgePhaseStatus } from "./forge-evolution-types";
import { evaluateEditorialUnderstanding } from "./book-understanding-engine";
import { getEditorialDepthQuestions } from "./book-understanding-engine";
import { getHumanHostExtraQuestions } from "./human-host-interview";
import { getProBookConfigQuestions, isConfigurationComplete } from "./pro-book-config-engine";
import { getCharacterForgeQuestions, getCharactersCompletionReport, applyCharacterAnswer } from "./character-forge-engine";
import {
  applyNarrativeDecision,
  getNarrativeDecisionQuestions,
  isNarrativeDecisionsComplete,
} from "./narrative-decision-engine";
import { buildCanonFromState, isCanonComplete, lockCanonMaster } from "./canon-genesis-engine";
import { updateStoryFutureFromAnswer } from "./story-future-simulation";
import { applyTitleAnswer, getTitleIntelligenceQuestions, isTitleIntelligenceComplete } from "./title-intelligence-engine";
import { applyCopyrightAnswer, getCopyrightQuestions, isCopyrightComplete } from "./copyright-engine";
import { buildBookPromisesFromState, isRepetitionClear } from "./repetition-prevention";
import { buildFinalBookReview } from "./final-book-review";
import { CONFIDENCE_BLUEPRINT_THRESHOLD } from "./dna-lock";
import { detectEditorialBookMode } from "./book-understanding-engine";

export function isBookUnderstood(state: GuidedInterviewState): boolean {
  const editorial = evaluateEditorialUnderstanding(state);
  return (
    editorial.readyForBlueprint &&
    editorial.canExplainBook &&
    editorial.contradictions.length === 0
  );
}

function phaseStatus(phase: ForgePhase, complete: boolean, missing: string[]): ForgePhaseStatus {
  return { phase, complete, missing };
}

export function resolveCurrentPhase(state: GuidedInterviewState): ForgePhase {
  if (!isBookUnderstood(state)) return "understanding";
  if (!isConfigurationComplete(state)) return "configuration";
  const charReport = getCharactersCompletionReport(state);
  if (charReport.required && !charReport.complete) return "characters";
  if (!isNarrativeDecisionsComplete(state)) return "decisions";
  if (!isTitleIntelligenceComplete(state)) return "title";
  if (!isCopyrightComplete(state)) return "copyright";
  return "review";
}

export function evaluateForgeEvolution(state: GuidedInterviewState): ForgeEvolutionReport {
  const editorial = evaluateEditorialUnderstanding(state);
  const bookUnderstood = isBookUnderstood(state);
  const configurationComplete = isConfigurationComplete(state);
  const charReport = getCharactersCompletionReport(state);
  const charactersComplete = !charReport.required || charReport.complete;
  const decisionsComplete = isNarrativeDecisionsComplete(state);
  const canon = buildCanonFromState(state);
  const canonComplete = isCanonComplete({ ...state, canon });
  const titleComplete = isTitleIntelligenceComplete(state);
  const copyrightComplete = isCopyrightComplete(state);
  const repetitionClear = isRepetitionClear(state);
  const currentPhase = resolveCurrentPhase(state);

  const blockedReasons: string[] = [];
  if (!bookUnderstood) blockedReasons.push("Il libro non è ancora compreso abbastanza.");
  if (!configurationComplete) blockedReasons.push("Configurazione professionale incompleta.");
  if (!charactersComplete) blockedReasons.push("Protagonista non ancora vivo abbastanza.");
  if (!decisionsComplete) blockedReasons.push("Decisioni narrative fondamentali mancanti.");
  if (!canonComplete) blockedReasons.push("Canon Master incompleto.");
  if (!titleComplete) blockedReasons.push("Titolo e promessa commerciale non definitivi.");
  if (!copyrightComplete) blockedReasons.push("Copyright non definito.");
  if (!repetitionClear) blockedReasons.push("Promesse ripetitive o archi duplicati.");
  if (editorial.contradictions.length > 0) {
    blockedReasons.push("Contraddizioni editoriali da risolvere.");
  }

  const confidence = editorial.overallConfidence;
  const readyForBlueprint =
    bookUnderstood &&
    configurationComplete &&
    charactersComplete &&
    decisionsComplete &&
    canonComplete &&
    titleComplete &&
    copyrightComplete &&
    repetitionClear &&
    editorial.contradictions.length === 0 &&
    confidence >= CONFIDENCE_BLUEPRINT_THRESHOLD - 0.04;

  const readyForReview = readyForBlueprint && currentPhase === "review";

  const phases: ForgePhaseStatus[] = [
    phaseStatus("understanding", bookUnderstood, bookUnderstood ? [] : editorial.blindSpots),
    phaseStatus(
      "configuration",
      configurationComplete,
      configurationComplete ? [] : ["config"],
    ),
    phaseStatus("characters", charactersComplete, charReport.missing),
    phaseStatus("decisions", decisionsComplete, decisionsComplete ? [] : ["decisions"]),
    phaseStatus("title", titleComplete, titleComplete ? [] : ["title"]),
    phaseStatus("copyright", copyrightComplete, copyrightComplete ? [] : ["copyright"]),
    phaseStatus("review", readyForReview, readyForReview ? [] : blockedReasons),
  ];

  const nextQuestions = getForgePhaseQuestions(state, currentPhase);

  return {
    currentPhase,
    phases,
    bookUnderstood,
    configurationComplete,
    charactersComplete,
    decisionsComplete,
    canonComplete,
    repetitionClear,
    titleComplete,
    copyrightComplete,
    contradictionsResolved: editorial.contradictions.length === 0,
    confidence,
    readyForBlueprint,
    readyForReview,
    blockedReasons,
    nextQuestions,
  };
}

export function getForgePhaseQuestions(
  state: GuidedInterviewState,
  phase?: ForgePhase,
): InterviewQuestion[] {
  const active = phase ?? resolveCurrentPhase(state);

  switch (active) {
    case "understanding":
      return [
        ...getEditorialDepthQuestions(state),
        ...getHumanHostExtraQuestions(state),
      ].slice(0, 3);
    case "configuration":
      return getProBookConfigQuestions(state);
    case "characters":
      return getCharacterForgeQuestions(state);
    case "decisions":
      return getNarrativeDecisionQuestions(state);
    case "title":
      return getTitleIntelligenceQuestions(state);
    case "copyright":
      return getCopyrightQuestions(state);
    case "review":
      return [];
    default:
      return [];
  }
}

/** Apply side effects for phased answers (canon, characters, decisions, simulation). */
export function enrichStateAfterAnswer(
  state: GuidedInterviewState,
  question: Pick<InterviewQuestion, "id" | "key">,
  answer: string,
): GuidedInterviewState {
  let next: GuidedInterviewState = { ...state };

  if (question.key.startsWith("character")) {
    next.characters = applyCharacterAnswer(next, question.key, answer);
  }

  if (question.id.startsWith("decision-")) {
    next.narrativeDecisions = applyNarrativeDecision(next, question.id, answer);
    next.storyFuture = updateStoryFutureFromAnswer(
      next.storyFuture,
      answer,
      question.id,
    );
  } else {
    next.storyFuture = updateStoryFutureFromAnswer(next.storyFuture, answer, question.key);
  }

  if (["bookTitle", "bookSubtitle", "openingHook", "promise"].includes(question.key)) {
    next.titleIntelligence = applyTitleAnswer(next, question.key, answer);
  }

  if (question.key === "copyrightMode" || question.key === "copyrightCustom") {
    next.copyright = applyCopyrightAnswer(next, answer);
  }

  next.bookPromises = buildBookPromisesFromState(next);
  next.canon = buildCanonFromState(next);
  next.forgePhase = resolveCurrentPhase(next);

  return next;
}

export function finalizeForgeForBlueprint(state: GuidedInterviewState): GuidedInterviewState {
  const canon = lockCanonMaster(buildCanonFromState(state));
  return {
    ...state,
    canon,
    canonLocked: true,
    forgePhase: "review",
    completed: true,
  };
}

export function getForgeEvolutionSummary(state: GuidedInterviewState): string {
  const report = evaluateForgeEvolution(state);
  if (report.readyForBlueprint) {
    return "Forge ha compreso, configurato e bloccato il libro — pronto per il blueprint.";
  }
  return report.blockedReasons[0] ?? "Forge sta ancora costruendo il libro con te.";
}

export { buildFinalBookReview };
