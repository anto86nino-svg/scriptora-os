import type { GuidedInterviewState, InterviewQuestion, NextQuestionResult } from "./types";
import { buildDnaLockFromInterviewState } from "./dna-lock";
import { scoreEditorialTextQuality } from "./book-understanding-engine";
import { evaluateForgeEvolution } from "./forge-evolution-engine";
import { getEditorialBlockedPrompt } from "./interview-ui-copy";
import { enrichInterviewQuestion, getDirectionFallbackSuggestions } from "./contextual-interview";
import { enrichQuestionWithCoAuthor } from "./co-author-engine";
import { getAdaptiveQuestion } from "./dna-inference";
import { sanitizeDnaText } from "./dna-cleaner";

const GENERIC_PLACEHOLDER =
  "Oppure raccontamelo con parole tue…";

/** Map depth-question keys to critical extracted fields. */
export const DEPTH_KEY_TO_CRITICAL: Record<string, string> = {
  openingSpark: "readerTransformation",
  depthReaderFit: "targetReader",
  depthCoreFear: "readerTransformation",
  depthPacingChoice: "genreDNA",
  depthDoNotBecome: "promise",
  depthFinalDirection: "genreDNA",
};

export type ResolveInterviewOptions = {
  continueNonce?: number;
  avoidQuestionId?: string | null;
};

export function resolveExtractedFieldKey(questionKey: string): string {
  return DEPTH_KEY_TO_CRITICAL[questionKey] ?? questionKey;
}

export function getContinueFollowUpQuestion(
  state: GuidedInterviewState,
  options?: ResolveInterviewOptions,
): InterviewQuestion {
  const dnaLock = buildDnaLockFromInterviewState(state);
  const nonce = options?.continueNonce ?? 0;
  const weak = getWeakCriticalFields(state);

  const candidates: InterviewQuestion[] = [];

  for (const field of weak) {
    const adaptive = getAdaptiveQuestion(state, field);
    candidates.push(
      enrichInterviewQuestion(state, {
        id: `continue-${field}-${state.currentStep}-${nonce}`,
        key: field,
        question: adaptive.question,
        helper: adaptive.helper ?? "Anche pochi dettagli in più mi aiutano a vedere il libro con chiarezza.",
        placeholder: GENERIC_PLACEHOLDER,
      }) as InterviewQuestion,
    );
  }

  const editorial = evaluateForgeEvolution(state);

  for (const q of editorial.nextQuestions.slice(0, 2)) {
    candidates.push(
      enrichInterviewQuestion(state, {
        ...q,
        id: `continue-${q.id}-${state.currentStep}-${nonce}`,
        placeholder: q.placeholder ?? GENERIC_PLACEHOLDER,
      }) as InterviewQuestion,
    );
  }

  if (!dnaLock.dnaQuality.pass) {
    candidates.push(
      enrichInterviewQuestion(state, {
        id: `continue-clarify-${state.currentStep}-${nonce}`,
        key: weak[0] ?? "emotionalTone",
        question: getEditorialBlockedPrompt(dnaLock),
        helper: "Rispondi con calma — anche una frase precisa basta.",
        placeholder: GENERIC_PLACEHOLDER,
      }) as InterviewQuestion,
    );
  }

  candidates.push(
    enrichInterviewQuestion(state, {
      id: `continue-direction-${state.currentStep}-${nonce}`,
      key: "depthFinalDirection",
      question: "Quale direzione senti più vicina al libro che vuoi davvero?",
      helper: "Scegli la più vicina, oppure raccontamelo con parole tue sotto.",
      placeholder: GENERIC_PLACEHOLDER,
      quickSuggestions: getDirectionFallbackSuggestions(state),
    }) as InterviewQuestion,
  );

  const avoid = options?.avoidQuestionId;
  const picked =
    candidates.find((c) => c.id !== avoid && c.question !== avoid) ??
    candidates[0] ??
    enrichInterviewQuestion(state, {
      id: `continue-fallback-${Date.now()}`,
      key: "genreDNA",
      question: "Dimmi un dettaglio che rende unico questo libro.",
      placeholder: GENERIC_PLACEHOLDER,
    }) as InterviewQuestion;

  return enrichQuestionWithCoAuthor(state, picked);
}

function getWeakCriticalFields(state: GuidedInterviewState): string[] {
  const keys = [
    "readerTransformation",
    "centralConflict",
    "emotionalTone",
    "genreDNA",
    "promise",
    "setting",
    "targetReader",
  ] as const;
  return keys.filter((k) => {
    const text = sanitizeDnaText((state.extracted as Record<string, unknown>)?.[k]);
    return text.length < 4 || scoreEditorialTextQuality(text) < 0.52;
  });
}

/** Never leave interview in a dead-end: always surface a question until blueprint-ready. */
export function resolveActiveInterviewQuestion(
  state: GuidedInterviewState,
  base: NextQuestionResult,
  options?: ResolveInterviewOptions,
): NextQuestionResult {
  if (!base.done || base.state.dnaLock?.readyForBlueprint) return base;

  const followUp = getContinueFollowUpQuestion(state, options);
  return {
    done: false,
    question: followUp,
    state: { ...state, completed: false, dnaLock: base.state.dnaLock ?? buildDnaLockFromInterviewState(state) },
  };
}
