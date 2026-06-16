import type {
  GuidedInterviewState,
  InterviewQuestion,
  NextQuestionResult,
  InterviewGenre,
  InterviewQuickSuggestion,
} from "./types";
import { buildDnaLockFromInterviewState, type BookDnaLock } from "./dna-lock";

const GENERIC_PLACEHOLDER =
  "Inizia a scrivere liberamente… Scriptora organizzerà il resto.";

const STRONG_ANSWER_MIN = 12;

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
  return typeof value === "string" ? value.trim() : "";
}

function hasStrongSignal(value: unknown): boolean {
  return clean(value).length >= STRONG_ANSWER_MIN;
}

const TONE_SUGGESTIONS: InterviewQuickSuggestion[] = [
  { label: "Psicologico e umano", value: "Psicologico e umano, vicino alle paure reali del lettore." },
  { label: "Diretto e pratico", value: "Diretto e pratico, senza fronzoli, orientato all'azione." },
  { label: "Più scientifico", value: "Più scientifico, basato su evidenze e chiarezza concettuale." },
  { label: "Più narrativo", value: "Più narrativo, con esempi, storie e immagini forti." },
];

const TARGET_SUGGESTIONS: InterviewQuickSuggestion[] = [
  { label: "Professionisti", value: "Professionisti under pressure che vogliono ritrovare focus." },
  { label: "Creativi", value: "Creativi e maker che devono portare a termine progetti importanti." },
  { label: "Studenti brillanti", value: "Studenti brillanti che procrastinano sotto pressione." },
  { label: "Persone bloccate", value: "Persone bloccate che sanno cosa fare ma non riescono a iniziare." },
];

const CRITICAL_FIELD_QUESTIONS: InterviewQuestion[] = [
  {
    id: "crit-readerTransformation",
    key: "readerTransformation",
    question: "Quale trasformazione concreta vuoi regalare al lettore?",
    helper: "Cosa sarà diverso nella sua vita, mente o abitudini dopo il libro?",
    placeholder: GENERIC_PLACEHOLDER,
    quickSuggestions: TARGET_SUGGESTIONS,
  },
  {
    id: "crit-centralConflict",
    key: "centralConflict",
    question: "Qual è il conflitto, problema o verità scomoda al centro del libro?",
    helper: "Può essere una tensione interiore, un nemico, un blocco, un falso mito da smontare.",
    placeholder: GENERIC_PLACEHOLDER,
  },
  {
    id: "crit-emotionalTone",
    key: "emotionalTone",
    question: "Che tono emotivo deve percepire il lettore?",
    helper: "Non il genere in sé, ma la sensazione dominante.",
    placeholder: GENERIC_PLACEHOLDER,
    quickSuggestions: TONE_SUGGESTIONS,
  },
  {
    id: "crit-genreDNA",
    key: "genreDNA",
    question: "Qual è il DNA editoriale del libro?",
    helper: "Stile, ritmo, registri, riferimenti impliciti, atmosfera distintiva.",
    placeholder: GENERIC_PLACEHOLDER,
  },
  {
    id: "crit-promise",
    key: "promise",
    question: "Qual è la promessa editoriale in una frase?",
    helper: "Perché qualcuno dovrebbe comprare questo libro adesso?",
    placeholder: GENERIC_PLACEHOLDER,
  },
  {
    id: "crit-setting",
    key: "setting",
    question: "In che mondo, contesto o cornice vive la promessa del libro?",
    helper: "Reale, professionale, domestico, storico, immaginario o metaforico.",
    placeholder: GENERIC_PLACEHOLDER,
  },
  {
    id: "crit-targetReader",
    key: "targetReader",
    question: "Chi è il lettore ideale, nel modo più concreto possibile?",
    helper: "Età, ruolo, frustrazione, desiderio, momento di vita.",
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
      quickSuggestions: TONE_SUGGESTIONS,
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
      quickSuggestions: TONE_SUGGESTIONS,
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
      quickSuggestions: TONE_SUGGESTIONS,
      placeholder: GENERIC_PLACEHOLDER,
    },
  ],
  thriller: [
    {
      id: "thriller-secret",
      key: "centralConflict",
      question: "Qual è il segreto o il pericolo che mette tutto in moto?",
      placeholder: GENERIC_PLACEHOLDER,
    },
    {
      id: "thriller-fear",
      key: "emotionalTone",
      question: "Che tipo di tensione vuoi creare nel lettore?",
      helper: "Psicologica, investigativa, paranoica, action, lenta e disturbante.",
      quickSuggestions: TONE_SUGGESTIONS,
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
  const base = {
    completed: false,
    currentStep: 0,
    confidence: 0.15,
    messages: [],
    extracted: {},
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
  return CRITICAL_FIELD_KEYS.filter(
    (field) => !hasStrongSignal((state.extracted as Record<string, unknown>)?.[field]),
  );
}

/** Full static queue for genre + critical fields + follow-ups (order stable). */
function buildFullQueue(state: GuidedInterviewState): InterviewQuestion[] {
  const queue: InterviewQuestion[] = [];
  const seenIds = new Set<string>();

  const push = (q: InterviewQuestion) => {
    if (seenIds.has(q.id)) return;
    seenIds.add(q.id);
    queue.push(q);
  };

  for (const q of getQuestionsForGenre(state.selectedGenre)) push(q);
  for (const q of CRITICAL_FIELD_QUESTIONS) push(q);
  for (const field of CRITICAL_FIELD_KEYS) {
    for (const q of FOLLOW_UP_BY_FIELD[field] ?? []) push(q);
  }

  return queue;
}

function findNextUnansweredQuestion(
  state: GuidedInterviewState,
): InterviewQuestion | null {
  const queue = buildFullQueue(state);
  for (let i = state.currentStep; i < queue.length; i += 1) {
    const q = queue[i];
    if (!hasStrongSignal((state.extracted as Record<string, unknown>)?.[q.key])) {
      return q;
    }
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
  const dnaLock = buildDnaLockFromInterviewState(state);
  const question = findNextUnansweredQuestion(state);

  if (question) {
    return { done: false, question, state: { ...state, dnaLock } };
  }

  if (dnaLock.readyForBlueprint) {
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

  const weak = getWeakFields(state);
  if (weak.length > 0) {
    const fallback =
      CRITICAL_FIELD_QUESTIONS.find((q) => q.key === weak[0]) ??
      ({
        id: `adaptive-${weak[0]}-${state.currentStep}`,
        key: weak[0],
        question: `Aiutami a capire meglio ${weak[0]}: cosa deve essere chiarissimo per te?`,
        placeholder: GENERIC_PLACEHOLDER,
      } satisfies InterviewQuestion);
    return { done: false, question: fallback, state: { ...state, dnaLock } };
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

function calculateInterviewConfidence(
  extracted: Record<string, unknown>,
): number {
  let score = 0.12;
  let strongCount = 0;

  for (const field of CRITICAL_FIELD_KEYS) {
    const v = clean(extracted[field]);
    if (v.length >= STRONG_ANSWER_MIN) {
      strongCount += 1;
      score += 0.1;
    } else if (v.length >= 4) {
      score += 0.03;
    }
  }

  const longAnswers = Object.values(extracted).filter(
    (v) => typeof v === "string" && clean(v).length > 140,
  ).length;
  score += longAnswers * 0.025;

  if (strongCount >= CRITICAL_FIELD_KEYS.length - 1) score += 0.06;

  return Math.min(0.96, score);
}

export function applyInterviewAnswer(
  state: GuidedInterviewState,
  answer: string,
): GuidedInterviewState {
  const normalized = clean(answer);
  if (!normalized) return state;

  const currentQuestion = findNextUnansweredQuestion(state);
  if (!currentQuestion) return state;

  const extracted = {
    ...state.extracted,
    [currentQuestion.key]: normalized,
  };

  const nextState: GuidedInterviewState = {
    ...state,
    currentStep: state.currentStep + 1,
    completed: false,
    confidence: calculateInterviewConfidence(extracted as Record<string, unknown>),
    extracted,
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

  return {
    ...nextState,
    dnaLock: buildDnaLockFromInterviewState(nextState),
  };
}

export function resumeInterview(state: GuidedInterviewState): GuidedInterviewState {
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
