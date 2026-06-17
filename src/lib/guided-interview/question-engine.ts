import type {
  GuidedInterviewState,
  InterviewQuestion,
  NextQuestionResult,
  InterviewGenre,
  InterviewQuickSuggestion,
} from "./types";
import { mapForgeAnswerToProConfigKey } from "./forge-pro-config";
import { shapeHumanHostQuestion } from "./human-host-interview";
import { buildDnaLockFromInterviewState, type BookDnaLock } from "./dna-lock";
import { sanitizeDnaText } from "./dna-cleaner";
import {
  getAdaptiveQuestion,
  inferBookProfileFromText,
  mergeInferenceIntoExtracted,
} from "./dna-inference";
import { enrichInterviewQuestion } from "./contextual-interview";
import { calculateEditorialConfidenceV2, evaluateEditorialUnderstanding, scoreEditorialTextQuality } from "./book-understanding-engine";
import { updateConvergenceTracking } from "./genre-convergence-engine";
import {
  evaluateForgeEvolution,
  enrichStateAfterAnswer,
  getForgePhaseQuestions,
  resolveCurrentPhase,
} from "./forge-evolution-engine";
import {
  getContinueFollowUpQuestion,
  resolveActiveInterviewQuestion,
  resolveExtractedFieldKey,
  type ResolveInterviewOptions,
} from "./interview-continue";
import {
  countForgeUserAnswers,
  FORGE_OPENING_QUESTION_ID,
  getForgeOpeningGreeting,
  isFirstForgeAssistantMessage,
  isTechnicalPrematureContent,
} from "./opening-experience";
import {
  filterPrematureTechnicalQuestion,
  getWelcomeInterviewQuestion,
  selectNextForgeQuestion,
} from "./interview-stages";
import { evaluateForgeReadiness, shouldBlockBlueprint } from "./forge-readiness";

export { resolveActiveInterviewQuestion, getContinueFollowUpQuestion, resolveExtractedFieldKey };
export {
  getForgeOpeningGreeting,
  getForgeDaypart,
  isFirstForgeAssistantMessage,
  countForgeUserAnswers,
  FORGE_OPENING_QUESTION_ID,
} from "./opening-experience";
export {
  selectNextForgeQuestion,
  resolveInterviewStage,
  getWelcomeInterviewQuestion,
  OPENING_QUICK_CHOICES,
} from "./interview-stages";
export { evaluateForgeReadiness, shouldBlockBlueprint } from "./forge-readiness";
export type { ResolveInterviewOptions };

const GENERIC_PLACEHOLDER =
  "Parla liberamente: idea, note, voce, caos… Scriptora organizzerà il resto.";

/** Scenic opening — use getForgeOpeningGreeting() for live copy. */
export const OPENING_ASSISTANT_MESSAGE = getForgeOpeningGreeting();

export const CRITICAL_FIELD_KEYS = [
  "readerTransformation",
  "centralConflict",
  "emotionalTone",
  "genreDNA",
  "promise",
  "setting",
  "targetReader",
] as const;

function clean(value: unknown): string {
  return sanitizeDnaText(value);
}


function hasStrongSignal(value: unknown): boolean {
  const text = clean(value);
  if (text.length < 4) return false;
  return scoreEditorialTextQuality(text) >= 0.52;
}

const TONE_SUGGESTIONS: InterviewQuickSuggestion[] = [
  { label: "Psicologico e umano", value: "Psicologico e umano, vicino alle paure reali del lettore." },
  { label: "Diretto e concreto", value: "Diretto e concreto, senza fronzoli, con una direzione chiara." },
  { label: "Intenso e immersivo", value: "Intenso e immersivo, con immagini forti e atmosfera riconoscibile." },
  { label: "Teso e narrativo", value: "Teso e narrativo, con ritmo, svolte e pressione emotiva." },
];

const THRILLER_HORROR_TONE_SUGGESTIONS: InterviewQuickSuggestion[] = [
  { label: "Claustrofobica", value: "Claustrofobica, come se il lettore non avesse vie d'uscita." },
  { label: "Disturbante", value: "Disturbante, con una paura che resta addosso anche dopo la scena." },
  { label: "Investigativa", value: "Investigativa, costruita su indizi, sospetti e verità nascoste." },
  { label: "Gotica", value: "Gotica, oscura, elegante, carica di presagi e ombre." },
  { label: "Realistica", value: "Realistica, umana, possibile, vicina alle paure quotidiane." },
  { label: "Soprannaturale ambiguo", value: "Soprannaturale ambiguo, dove non è subito chiaro se il male sia reale o mentale." },
];

const ROMANCE_TONE_SUGGESTIONS: InterviewQuickSuggestion[] = [
  { label: "Slow burn", value: "Slow burn, con desiderio trattenuto e tensione che cresce lentamente." },
  { label: "Dolce", value: "Dolce, intimo, luminoso, emotivamente caldo." },
  { label: "Proibito", value: "Proibito, con attrazione, rischio e conseguenze." },
  { label: "Doloroso", value: "Doloroso, vulnerabile, con ferite emotive che non si aprono subito." },
  { label: "Magnetico", value: "Magnetico, sensuale, pieno di sottotesto e silenzi." },
];

const POETRY_TONE_SUGGESTIONS: InterviewQuickSuggestion[] = [
  { label: "Oscura", value: "Oscura, viscerale, attraversata da ombra e perdita." },
  { label: "Malinconica", value: "Malinconica, intima, piena di memoria e nostalgia." },
  { label: "Luminosa", value: "Luminosa, fragile, orientata a rinascita e speranza." },
  { label: "Spirituale", value: "Spirituale, simbolica, vicina al mistero e al senso." },
  { label: "Corporea", value: "Corporea, sensoriale, fisica, fatta di pelle, respiro e immagini." },
];

const TARGET_SUGGESTIONS: InterviewQuickSuggestion[] = [
  { label: "Professionisti", value: "Professionisti under pressure che vogliono ritrovare focus." },
  { label: "Creativi", value: "Creativi e maker che devono portare a termine progetti importanti." },
  { label: "Studenti brillanti", value: "Studenti brillanti che procrastinano sotto pressione." },
  { label: "Persone bloccate", value: "Persone bloccate che sanno cosa fare ma non riescono a iniziare." },
];

const INTERVIEW_DEPTH_QUESTIONS: InterviewQuestion[] = [
  {
    id: "depth-reader-fit",
    key: "depthReaderFit",
    question: "Chi deve sentirsi colpito da questo libro più di tutti?",
    helper: "Scegli o descrivi il lettore che vuoi conquistare davvero.",
    placeholder: GENERIC_PLACEHOLDER,
    quickSuggestions: [
      { label: "Tensione psicologica", value: "Lettori che amano tensione psicologica, ambiguità e paura umana." },
      { label: "Colpi di scena", value: "Lettori che cercano colpi di scena, mistero e ritmo alto." },
      { label: "Emozione forte", value: "Lettori che vogliono personaggi feriti, scelte difficili e conseguenze emotive." },
      { label: "Commerciale", value: "Lettori che vogliono una storia leggibile, forte, chiara e molto coinvolgente." },
    ],
  },
  {
    id: "depth-core-fear",
    key: "depthCoreFear",
    question: "Quale paura precisa deve restare addosso al lettore?",
    helper: "Una paura concreta: non essere creduto, essere osservato, impazzire, scoprire una verità.",
    placeholder: GENERIC_PLACEHOLDER,
    quickSuggestions: [
      { label: "Non essere creduto", value: "La paura di vedere la verità prima degli altri e non essere creduto." },
      { label: "Essere osservato", value: "La paura di essere osservato o seguito senza riuscire a provarlo." },
      { label: "Impazzire", value: "La paura di non distinguere più realtà, memoria e ossessione." },
      { label: "Verità vicina", value: "La paura che la minaccia venga da qualcuno di vicino." },
    ],
  },
  {
    id: "depth-pacing-choice",
    key: "depthPacingChoice",
    question: "Che ritmo deve avere il libro?",
    helper: "Questa scelta aiuta Scriptora a non sbagliare struttura e capitoli.",
    placeholder: GENERIC_PLACEHOLDER,
    quickSuggestions: [
      { label: "Lento e inquietante", value: "Lento e inquietante, con tensione che cresce scena dopo scena." },
      { label: "Cinematografico", value: "Medio e cinematografico, con alternanza tra mistero, dialoghi e rivelazioni." },
      { label: "Compulsivo", value: "Rapido e compulsivo, con capitoli brevi e molti open loop." },
      { label: "Elegante e oscuro", value: "Elegante e oscuro, atmosferico ma sempre leggibile." },
    ],
  },
  {
    id: "depth-do-not-become",
    key: "depthDoNotBecome",
    question: "Cosa non deve assolutamente diventare questo libro?",
    helper: "Questa è una regola anti-drift: impedisce a Scriptora di portarlo nella direzione sbagliata.",
    placeholder: GENERIC_PLACEHOLDER,
    quickSuggestions: [
      { label: "Non fantasy", value: "Non deve diventare troppo fantasy o soprannaturale se la paura deve restare umana." },
      { label: "Non lento", value: "Non deve diventare troppo lento, contemplativo o pieno di spiegazioni." },
      { label: "Non romance", value: "Non deve spostarsi sul romance se il cuore è thriller/horror." },
      { label: "Non generico", value: "Non deve diventare una storia generica senza identità forte." },
    ],
  },
  {
    id: "depth-final-direction",
    key: "depthFinalDirection",
    question: "Quale direzione senti più vicina al libro che vuoi davvero?",
    helper: "Scegli la più vicina. Se nessuna va bene, scrivimi la tua versione.",
    placeholder: GENERIC_PLACEHOLDER,
    quickSuggestions: [
      { label: "Thriller psicologico", value: "Thriller psicologico: paura mentale, ambiguità, verità instabile." },
      { label: "Horror umano", value: "Horror umano: male vicino, realistico, disturbante, emotivo." },
      { label: "Suspense investigativa", value: "Suspense investigativa: indizi, sospetti, rivelazioni, ritmo." },
      { label: "Gotico moderno", value: "Gotico moderno: atmosfera oscura, segreti, luoghi carichi di memoria." },
    ],
  },
];

const CRITICAL_FIELD_QUESTIONS: InterviewQuestion[] = [
  {
    id: "crit-readerTransformation",
    key: "readerTransformation",
    question: "Che tipo di paura o speranza vuoi lasciare nel lettore quando chiude il libro?",
    helper: "Non cosa impara — cosa sente, cosa gli resta addosso.",
    placeholder: GENERIC_PLACEHOLDER,
    quickSuggestions: TARGET_SUGGESTIONS,
  },
  {
    id: "crit-centralConflict",
    key: "centralConflict",
    question: "Quale evento rompe l'equilibrio della storia?",
    helper: "Può essere una scoperta, una perdita, un incontro, una minaccia, una verità scomoda.",
    placeholder: GENERIC_PLACEHOLDER,
  },
  {
    id: "crit-emotionalTone",
    key: "emotionalTone",
    question: "Che atmosfera immagini: claustrofobica, investigativa, disturbante, gotica, realistica?",
    helper: "Pensa alla sensazione dominante, non al genere in sé.",
    placeholder: GENERIC_PLACEHOLDER,
    quickSuggestions: THRILLER_HORROR_TONE_SUGGESTIONS,
  },
  {
    id: "crit-genreDNA",
    key: "genreDNA",
    question: "Che sensazione di lettura vuoi — lenta e immersiva, tesa, poetica, pratica?",
    helper: "Ritmo, registro, intensità: come deve respirare il libro.",
    placeholder: GENERIC_PLACEHOLDER,
  },
  {
    id: "crit-promise",
    key: "promise",
    question: "Cosa il lettore deve scoprire poco alla volta?",
    helper: "Il filo che tiene sveglio il libro fino alla fine.",
    placeholder: GENERIC_PLACEHOLDER,
  },
  {
    id: "crit-setting",
    key: "setting",
    question: "Dove si svolge la storia e che sensazione deve dare quel luogo?",
    helper: "Città, epoca, mondo reale o interiore — ciò che avvolge la narrazione.",
    placeholder: GENERIC_PLACEHOLDER,
  },
  {
    id: "crit-targetReader",
    key: "targetReader",
    question: "A chi stai parlando, come a una persona reale che conosci?",
    helper: "Età, momento di vita, desiderio o frustrazione che la tiene sveglia la notte.",
    placeholder: GENERIC_PLACEHOLDER,
    quickSuggestions: TARGET_SUGGESTIONS,
  },
];

const FOLLOW_UP_BY_FIELD: Record<string, InterviewQuestion[]> = {
  readerTransformation: [
    {
      id: "fu-transform-1",
      key: "readerTransformation",
      question: "Se il lettore applicasse davvero il libro, cosa cambierebbe in modo misurabile?",
      placeholder: GENERIC_PLACEHOLDER,
    },
  ],
  centralConflict: [
    {
      id: "fu-conflict-1",
      key: "centralConflict",
      question: "Qual è la verità scomoda che vuoi far capire al lettore?",
      placeholder: GENERIC_PLACEHOLDER,
    },
    {
      id: "fu-conflict-2",
      key: "centralConflict",
      question: "Se dovessi smontare un falso mito legato al tema del libro, quale sarebbe?",
      placeholder: GENERIC_PLACEHOLDER,
    },
  ],
  emotionalTone: [
    {
      id: "fu-tone-1",
      key: "emotionalTone",
      question: "Vuoi che il lettore si senta più spronato, più compreso o più sfidato?",
      quickSuggestions: TONE_SUGGESTIONS,
      placeholder: GENERIC_PLACEHOLDER,
    },
  ],
  genreDNA: [
    {
      id: "fu-genre-1",
      key: "genreDNA",
      question: "A quale tipo di libro/editoria somiglia di più, senza copiare nessuno?",
      placeholder: GENERIC_PLACEHOLDER,
    },
  ],
  promise: [
    {
      id: "fu-promise-1",
      key: "promise",
      question: "Cosa promette questo libro che gli altri sullo stesso tema non promettono?",
      placeholder: GENERIC_PLACEHOLDER,
    },
  ],
  setting: [
    {
      id: "fu-setting-1",
      key: "setting",
      question: "Dove si svolge la promessa del libro: mondo reale, mentale, professionale o simbolico?",
      placeholder: GENERIC_PLACEHOLDER,
    },
  ],
  targetReader: [
    {
      id: "fu-target-1",
      key: "targetReader",
      question: "Descrivi una persona reale a cui stai scrivendo: cosa la blocca oggi?",
      quickSuggestions: TARGET_SUGGESTIONS,
      placeholder: GENERIC_PLACEHOLDER,
    },
  ],
};

const QUESTIONS_BY_GENRE: Record<InterviewGenre, InterviewQuestion[]> = {
  poetry: [
    {
      id: "poetry-emotion",
      key: "readerTransformation",
      question: "Quale emozione, ferita o verità attraversa tutta la raccolta?",
      helper: "Può essere perdita, amore, memoria, rabbia, rinascita, spiritualità.",
      placeholder: GENERIC_PLACEHOLDER,
    },
    {
      id: "poetry-tone",
      key: "emotionalTone",
      question: "Che atmosfera vuoi lasciare al lettore?",
      helper: "Oscura, malinconica, luminosa, intima, spirituale, viscerale.",
      quickSuggestions: POETRY_TONE_SUGGESTIONS,
      placeholder: GENERIC_PLACEHOLDER,
    },
    {
      id: "poetry-images",
      key: "genreDNA",
      question: "Ci sono immagini o simboli che ritornano spesso?",
      helper: "Pioggia, mare, stanze vuote, corpi, memoria, notte, luce.",
      placeholder: GENERIC_PLACEHOLDER,
    },
    {
      id: "poetry-promise",
      key: "promise",
      question: "Che esperienza emotiva promette questa raccolta?",
      placeholder: GENERIC_PLACEHOLDER,
    },
  ],
  romance: [
    {
      id: "romance-conflict",
      key: "centralConflict",
      question: "Cosa rende questa relazione difficile o impossibile?",
      placeholder: GENERIC_PLACEHOLDER,
    },
    {
      id: "romance-tone",
      key: "emotionalTone",
      question: "Vuoi un romance più dolce, intenso, proibito o doloroso?",
      quickSuggestions: ROMANCE_TONE_SUGGESTIONS,
      placeholder: GENERIC_PLACEHOLDER,
    },
    {
      id: "romance-promise",
      key: "promise",
      question: "Che payoff emotivo deve sentire il lettore?",
      placeholder: GENERIC_PLACEHOLDER,
    },
  ],
  "dark-romance": [
    {
      id: "dr-core",
      key: "centralConflict",
      question: "Qual è il desiderio proibito o il conflitto morale della relazione?",
      placeholder: GENERIC_PLACEHOLDER,
    },
    {
      id: "dr-tone",
      key: "emotionalTone",
      question: "Più ossessione, potere, vulnerabilità o tensione psicologica?",
      quickSuggestions: ROMANCE_TONE_SUGGESTIONS,
      placeholder: GENERIC_PLACEHOLDER,
    },
  ],
  thriller: [
    {
      id: "thriller-protagonist",
      key: "centralConflict",
      question: "Chi è il protagonista prima che tutto precipiti?",
      placeholder: GENERIC_PLACEHOLDER,
    },
    {
      id: "thriller-secret",
      key: "centralConflict",
      question: "Quale segreto non deve essere rivelato troppo presto?",
      placeholder: GENERIC_PLACEHOLDER,
    },
    {
      id: "thriller-danger",
      key: "centralConflict",
      question: "Il pericolo è umano, soprannaturale, psicologico o ambiguo?",
      placeholder: GENERIC_PLACEHOLDER,
    },
    {
      id: "thriller-fear",
      key: "emotionalTone",
      question: "Che tipo di paura vuoi lasciare nel lettore quando chiude il libro?",
      helper: "Psicologica, investigativa, paranoica, claustrofobica, disturbante.",
      quickSuggestions: THRILLER_HORROR_TONE_SUGGESTIONS,
      placeholder: GENERIC_PLACEHOLDER,
    },
  ],
  fantasy: [
    {
      id: "fantasy-world",
      key: "setting",
      question: "Che tipo di mondo o atmosfera vuoi creare?",
      placeholder: GENERIC_PLACEHOLDER,
    },
    {
      id: "fantasy-conflict",
      key: "centralConflict",
      question: "Quale forza minaccia il mondo o il protagonista?",
      placeholder: GENERIC_PLACEHOLDER,
    },
  ],
  "self-help": [
    {
      id: "selfhelp-transformation",
      key: "readerTransformation",
      question: "Quale trasformazione concreta promette il libro?",
      quickSuggestions: TARGET_SUGGESTIONS,
      placeholder: GENERIC_PLACEHOLDER,
    },
    {
      id: "selfhelp-pain",
      key: "centralConflict",
      question: "Qual è il problema principale del lettore?",
      placeholder: GENERIC_PLACEHOLDER,
    },
  ],
  business: [
    {
      id: "business-result",
      key: "readerTransformation",
      question: "Quale risultato concreto prometti al lettore?",
      quickSuggestions: TARGET_SUGGESTIONS,
      placeholder: GENERIC_PLACEHOLDER,
    },
    {
      id: "business-target",
      key: "targetReader",
      question: "Chi deve leggere questo libro per ottenere quel risultato?",
      quickSuggestions: TARGET_SUGGESTIONS,
      placeholder: GENERIC_PLACEHOLDER,
    },
  ],
  manual: [
    {
      id: "manual-outcome",
      key: "readerTransformation",
      question: "Cosa saprà fare il lettore alla fine del libro?",
      placeholder: GENERIC_PLACEHOLDER,
    },
    {
      id: "manual-target",
      key: "targetReader",
      question: "Per chi è scritto questo manuale, concretamente?",
      quickSuggestions: TARGET_SUGGESTIONS,
      placeholder: GENERIC_PLACEHOLDER,
    },
  ],
  "literary-fiction": [
    {
      id: "literary-conflict",
      key: "centralConflict",
      question: "Quale tensione umana o interiore guida la storia?",
      placeholder: GENERIC_PLACEHOLDER,
    },
    {
      id: "literary-tone",
      key: "emotionalTone",
      question: "Che registro emotivo deve avere il romanzo?",
      quickSuggestions: TONE_SUGGESTIONS,
      placeholder: GENERIC_PLACEHOLDER,
    },
  ],
  general: [
    {
      id: "general-core",
      key: "readerTransformation",
      question: "Raccontami liberamente il cuore del libro.",
      placeholder: GENERIC_PLACEHOLDER,
    },
    {
      id: "general-conflict",
      key: "centralConflict",
      question: "Qual è il problema, conflitto o verità che tiene in piedi tutto?",
      placeholder: GENERIC_PLACEHOLDER,
    },
  ],
};

export function getInitialInterviewState(
  partial?: Partial<GuidedInterviewState>,
): GuidedInterviewState {
  const chatFirst = partial?.chatFirst ?? !partial?.selectedGenre;
  const hasExistingIdea =
    Boolean(partial?.extracted?.promise?.trim()) ||
    Boolean(partial?.extracted?.centralConflict?.trim());
  const openingContent = getForgeOpeningGreeting({
    hasExistingIdea,
    language: partial?.extracted?.language,
  });
  const base = {
    completed: false,
    currentStep: 0,
    confidence: 0.12,
    messages: chatFirst
      ? [
          {
            id: "assistant-opening",
            role: "assistant" as const,
            content: openingContent,
            createdAt: Date.now(),
          },
        ]
      : [],
    extracted: partial?.extracted ?? {},
    chatFirst,
    ...partial,
  };
  return {
    ...base,
    dnaLock: buildDnaLockFromInterviewState(base),
  };
}

function getQuestionsForGenre(genre?: string): InterviewQuestion[] {
  return (
    QUESTIONS_BY_GENRE[(genre as InterviewGenre) || "general"] ||
    QUESTIONS_BY_GENRE.general
  );
}

function getWeakFields(state: GuidedInterviewState): string[] {
  const weak = CRITICAL_FIELD_KEYS.filter(
    (field) => !hasStrongSignal((state.extracted as Record<string, unknown>)?.[field]),
  );
  const recent = state.forgeConvergence?.lastQuestionKeys ?? [];
  const rotated = weak.filter((field) => recent.filter((k) => k === field).length < 2);
  return rotated.length ? rotated : weak;
}

/** Phase-aware queue — understanding first, then config, characters, decisions, title, copyright. */
function buildFullQueue(state: GuidedInterviewState): InterviewQuestion[] {
  const queue: InterviewQuestion[] = [];
  const seenIds = new Set<string>();

  const push = (q: InterviewQuestion) => {
    if (seenIds.has(q.id)) return;
    seenIds.add(q.id);
    queue.push(shapeHumanHostQuestion(q, state));
  };

  const phase = resolveCurrentPhase(state);
  const chatFirst = state.chatFirst && !state.selectedGenre;

  if (phase === "understanding") {
    const userAnswers = countForgeUserAnswers(state);

    if (!chatFirst) {
      for (const q of getQuestionsForGenre(state.selectedGenre)) push(q);
    } else {
      push(getWelcomeInterviewQuestion(state));
    }

    if (state.selectedGenre && state.chatFirst && userAnswers >= 2) {
      for (const q of getQuestionsForGenre(state.selectedGenre)) push(q);
    }

    if (userAnswers >= 2) {
      for (const q of CRITICAL_FIELD_QUESTIONS) push(q);
      for (const field of CRITICAL_FIELD_KEYS) {
        for (const q of FOLLOW_UP_BY_FIELD[field] ?? []) push(q);
      }
      for (const q of INTERVIEW_DEPTH_QUESTIONS) push(q);
    }

    if (userAnswers >= 3) {
      for (const q of getForgePhaseQuestions(state, "understanding")) push(q);
    }
    return queue;
  }

  for (const q of getForgePhaseQuestions(state, phase)) push(q);
  return queue;
}

function findNextUnansweredQuestion(
  state: GuidedInterviewState,
): InterviewQuestion | null {
  if (isFirstForgeAssistantMessage(state)) {
    return null;
  }

  const recent = state.forgeConvergence?.lastQuestionKeys ?? [];
  const phase = resolveCurrentPhase(state);

  if (phase === "understanding") {
    const staged = selectNextForgeQuestion(state);
    if (staged) {
      const filtered = filterPrematureTechnicalQuestion(staged, state);
      if (
        filtered &&
        !hasStrongSignal((state.extracted as Record<string, unknown>)?.[filtered.key]) &&
        recent.filter((k) => k === filtered.key).length < 2
      ) {
        return filtered;
      }
    }
  }

  const phaseQuestions = getForgePhaseQuestions(state).filter((q) => {
    if (filterPrematureTechnicalQuestion(q, state) === null) return false;
    if (isTechnicalPrematureContent(q.question) && countForgeUserAnswers(state) < 3) {
      return false;
    }
    if (hasStrongSignal((state.extracted as Record<string, unknown>)?.[q.key])) return false;
    if (recent.filter((k) => k === q.key).length >= 2) return false;
    return true;
  });
  if (phaseQuestions.length > 0) {
    return phaseQuestions[0];
  }

  const queue = buildFullQueue(state);
  for (let i = state.currentStep; i < queue.length; i += 1) {
    const q = queue[i];
    if (hasStrongSignal((state.extracted as Record<string, unknown>)?.[q.key])) continue;
    if (recent.filter((k) => k === q.key).length >= 2) continue;
    return q;
  }
  return null;
}

/** @deprecated Use buildFullQueue — kept for tests/debug */
export function buildQuestionQueue(state: GuidedInterviewState): InterviewQuestion[] {
  return buildFullQueue(state).filter(
    (q) => !hasStrongSignal((state.extracted as Record<string, unknown>)?.[q.key]),
  );
}

export function getNextInterviewQuestion(
  state: GuidedInterviewState,
): NextQuestionResult {
  const evolution = evaluateForgeEvolution(state);
  const dnaLock = buildDnaLockFromInterviewState(state);
  const forgeReady = evaluateForgeReadiness(state);

  if (evolution.readyForBlueprint && !shouldBlockBlueprint(state) && forgeReady.ready) {
    return {
      done: true,
      state: {
        ...state,
        completed: true,
        confidence: dnaLock.confidenceScore,
        dnaLock,
        forgePhase: "review",
      },
    };
  }

  const question = findNextUnansweredQuestion(state);

  if (question) {
    return {
      done: false,
      question: enrichInterviewQuestion(state, question) as InterviewQuestion,
      state: { ...state, dnaLock },
    };
  }

  if (countForgeUserAnswers(state) === 0) {
    return {
      done: false,
      state: { ...state, dnaLock },
    };
  }

  const weak = getWeakFields(state);
  if (weak.length > 0) {
    const field = weak[0];
    const adaptive = getAdaptiveQuestion(state, field);
    const fallback =
      CRITICAL_FIELD_QUESTIONS.find((q) => q.key === field) ??
      ({
        id: `adaptive-${field}-${state.currentStep}`,
        key: field,
        question: adaptive.question,
        helper: adaptive.helper,
        quickSuggestions: adaptive.quickSuggestions,
        placeholder: GENERIC_PLACEHOLDER,
      } satisfies InterviewQuestion);
    return {
      done: false,
      question: enrichInterviewQuestion(state, fallback) as InterviewQuestion,
      state: { ...state, dnaLock },
    };
  }

  return {
    done: true,
    state: {
      ...state,
      completed: true,
      confidence: dnaLock.confidenceScore,
      dnaLock,
    },
  };
}

function calculateInterviewConfidence(state: GuidedInterviewState): number {
  return calculateEditorialConfidenceV2(state);
}

function collectUserBlob(state: GuidedInterviewState, latest?: string): string {
  const parts = state.messages
    .filter((m) => m.role === "user")
    .map((m) => m.content);
  if (latest) parts.push(latest);
  return parts.join("\n\n");
}

export function applyInterviewAnswer(
  state: GuidedInterviewState,
  answer: string,
  activeQuestion?: Pick<InterviewQuestion, "id" | "key">,
): GuidedInterviewState {
  const normalized = clean(answer);
  if (!normalized) return state;

  const baseNext = getNextInterviewQuestion(state);
  const resolved = resolveActiveInterviewQuestion(state, baseNext);
  const currentQuestion =
    (activeQuestion
      ? ({ id: activeQuestion.id, key: activeQuestion.key } as InterviewQuestion)
      : undefined) ??
    findNextUnansweredQuestion(state) ??
    resolved.question ??
    (isFirstForgeAssistantMessage(state) ? getWelcomeInterviewQuestion(state) : undefined);

  if (!currentQuestion) return state;

  const extractedKey = resolveExtractedFieldKey(mapForgeAnswerToProConfigKey(currentQuestion.key));
  let extracted = {
    ...state.extracted,
    [extractedKey]: normalized,
    [currentQuestion.key]: normalized,
  };

  const userBlob = collectUserBlob(state, normalized);
  const inference = inferBookProfileFromText(userBlob, extracted);
  extracted = mergeInferenceIntoExtracted(extracted, inference, normalized);

  const selectedGenre =
    state.selectedGenre ||
    inference.genre ||
    undefined;
  const selectedBookType =
    state.selectedBookType ||
    inference.bookType ||
    undefined;

  const nextState: GuidedInterviewState = {
    ...state,
    currentStep: state.currentStep + 1,
    completed: false,
    extracted,
    selectedGenre,
    selectedBookType,
    inferredProfile: {
      ...state.inferredProfile,
      ...inference,
      confidence: Math.max(state.inferredProfile?.confidence ?? 0, inference.confidence),
    },
    messages: [
      ...state.messages,
      {
        id: `user-${Date.now()}-${state.currentStep}`,
        role: "user",
        content: normalized,
        createdAt: Date.now(),
      },
    ],
  };

  nextState.confidence = calculateInterviewConfidence(nextState);

  const enriched = enrichStateAfterAnswer(nextState, currentQuestion, normalized);
  enriched.forgePhase = resolveCurrentPhase(enriched);

  const editorial = evaluateEditorialUnderstanding(enriched);
  enriched.forgeConvergence = updateConvergenceTracking(
    enriched.forgeConvergence,
    currentQuestion.key,
    editorial.blindSpots,
  );

  return {
    ...enriched,
    dnaLock: buildDnaLockFromInterviewState(enriched),
  };
}

export function resumeInterview(state: GuidedInterviewState): GuidedInterviewState {
  return resumeInterviewWithFollowUp(state);
}

function resumeInterviewWithFollowUp(state: GuidedInterviewState): GuidedInterviewState {
  return {
    ...state,
    completed: false,
  };
}

export function getInterviewProgress(state: GuidedInterviewState): {
  confidence: number;
  dnaLock: BookDnaLock;
  answeredCount: number;
  totalCritical: number;
} {
  const dnaLock = buildDnaLockFromInterviewState(state);
  const answeredCount = CRITICAL_FIELD_KEYS.filter((k) =>
    hasStrongSignal((state.extracted as Record<string, unknown>)?.[k]),
  ).length;
  return {
    confidence: dnaLock.confidenceScore,
    dnaLock,
    answeredCount,
    totalCritical: CRITICAL_FIELD_KEYS.length,
  };
}
