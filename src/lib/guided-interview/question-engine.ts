import type {
  GuidedInterviewState,
  InterviewQuestion,
  NextQuestionResult,
  InterviewGenre,
} from "./types";

const GENERIC_PLACEHOLDER =
  "Inizia a scrivere liberamente… Scriptora organizzerà il resto.";

const QUESTIONS_BY_GENRE: Record<
  InterviewGenre,
  InterviewQuestion[]
> = {
  poetry: [
    {
      id: "poetry-emotion",
      key: "readerTransformation",
      question:
        "Quale emozione, ferita o verità attraversa tutta la raccolta?",
      helper:
        "Può essere perdita, amore, memoria, rabbia, rinascita, spiritualità.",
      placeholder: GENERIC_PLACEHOLDER,
    },
    {
      id: "poetry-tone",
      key: "emotionalTone",
      question:
        "Che atmosfera vuoi lasciare al lettore?",
      helper:
        "Oscura, malinconica, luminosa, intima, spirituale, viscerale.",
      placeholder: GENERIC_PLACEHOLDER,
    },
    {
      id: "poetry-images",
      key: "genreDNA",
      question:
        "Ci sono immagini o simboli che ritornano spesso?",
      helper:
        "Pioggia, mare, stanze vuote, corpi, memoria, notte, luce.",
      placeholder: GENERIC_PLACEHOLDER,
    },
    {
      id: "poetry-promise",
      key: "promise",
      question:
        "Che esperienza emotiva promette questa raccolta?",
      placeholder: GENERIC_PLACEHOLDER,
    },
  ],

  romance: [
    {
      id: "romance-conflict",
      key: "centralConflict",
      question:
        "Cosa rende questa relazione difficile o impossibile?",
      placeholder: GENERIC_PLACEHOLDER,
    },
    {
      id: "romance-tone",
      key: "emotionalTone",
      question:
        "Vuoi un romance più dolce, intenso, proibito o doloroso?",
      placeholder: GENERIC_PLACEHOLDER,
    },
    {
      id: "romance-promise",
      key: "promise",
      question:
        "Che payoff emotivo deve sentire il lettore?",
      placeholder: GENERIC_PLACEHOLDER,
    },
  ],

  "dark-romance": [
    {
      id: "dr-core",
      key: "centralConflict",
      question:
        "Qual è il desiderio proibito o il conflitto morale della relazione?",
      placeholder: GENERIC_PLACEHOLDER,
    },
    {
      id: "dr-tone",
      key: "emotionalTone",
      question:
        "Più ossessione, potere, vulnerabilità o tensione psicologica?",
      placeholder: GENERIC_PLACEHOLDER,
    },
  ],

  thriller: [
    {
      id: "thriller-secret",
      key: "centralConflict",
      question:
        "Qual è il segreto o il pericolo che mette tutto in moto?",
      placeholder: GENERIC_PLACEHOLDER,
    },
    {
      id: "thriller-fear",
      key: "emotionalTone",
      question:
        "Che tipo di tensione vuoi creare nel lettore?",
      helper:
        "Psicologica, investigativa, paranoica, action, lenta e disturbante.",
      placeholder: GENERIC_PLACEHOLDER,
    },
  ],

  fantasy: [
    {
      id: "fantasy-world",
      key: "setting",
      question:
        "Che tipo di mondo o atmosfera vuoi creare?",
      placeholder: GENERIC_PLACEHOLDER,
    },
    {
      id: "fantasy-conflict",
      key: "centralConflict",
      question:
        "Quale forza minaccia il mondo o il protagonista?",
      placeholder: GENERIC_PLACEHOLDER,
    },
  ],

  "self-help": [
    {
      id: "selfhelp-transformation",
      key: "readerTransformation",
      question:
        "Quale trasformazione concreta promette il libro?",
      placeholder: GENERIC_PLACEHOLDER,
    },
    {
      id: "selfhelp-pain",
      key: "centralConflict",
      question:
        "Qual è il problema principale del lettore?",
      placeholder: GENERIC_PLACEHOLDER,
    },
  ],

  business: [
    {
      id: "business-result",
      key: "readerTransformation",
      question:
        "Quale risultato concreto prometti al lettore?",
      placeholder: GENERIC_PLACEHOLDER,
    },
  ],

  manual: [
    {
      id: "manual-outcome",
      key: "readerTransformation",
      question:
        "Cosa saprà fare il lettore alla fine del libro?",
      placeholder: GENERIC_PLACEHOLDER,
    },
  ],

  "literary-fiction": [
    {
      id: "literary-conflict",
      key: "centralConflict",
      question:
        "Quale tensione umana o interiore guida la storia?",
      placeholder: GENERIC_PLACEHOLDER,
    },
  ],

  general: [
    {
      id: "general-core",
      key: "readerTransformation",
      question:
        "Raccontami liberamente il cuore del libro.",
      placeholder: GENERIC_PLACEHOLDER,
    },
  ],
};

export function getInitialInterviewState(
  partial?: Partial<GuidedInterviewState>
): GuidedInterviewState {
  return {
    completed: false,
    currentStep: 0,
    confidence: 0.15,
    messages: [],
    extracted: {},
    ...partial,
  };
}

function getQuestionsForGenre(
  genre?: string
): InterviewQuestion[] {
  return (
    QUESTIONS_BY_GENRE[
      (genre as InterviewGenre) || "general"
    ] || QUESTIONS_BY_GENRE.general
  );
}

export function getNextInterviewQuestion(
  state: GuidedInterviewState
): NextQuestionResult {
  const questions = getQuestionsForGenre(
    state.selectedGenre
  );

  const currentQuestion =
    questions[state.currentStep];

  if (!currentQuestion) {
    return {
      done: true,
      state: {
        ...state,
        completed: true,
        confidence: 0.92,
      },
    };
  }

  return {
    done: false,
    question: currentQuestion,
    state,
  };
}


function calculateInterviewConfidence(state: GuidedInterviewState, key: string, answer: string): number {
  const normalized = (answer ?? "").trim();
  if (!normalized) return state.confidence ?? 0;

  let score = Math.max(0.15, state.confidence ?? 0.1);

  const importantFields = [
    "readerTransformation",
    "centralConflict",
    "emotionalTone",
    "genreDNA",
    "promise",
    "setting",
  ];

  // base signal: we answered something
  score += 0.10;

  // structured questions answered add more confidence
  for (const field of importantFields) {
    const v = (state.extracted as any)?.[field];
    if (typeof v === "string" && v.trim().length > 10) score += 0.08;
  }

  // longer answers indicate greater clarity
  const longAnswers = Object.values(state.extracted ?? {})
    .filter((v) => typeof v === "string" && (v as string).trim().length > 140).length;

  score += longAnswers * 0.05;
  return Math.min(0.96, score);
}

export function applyInterviewAnswer(
  state: GuidedInterviewState,
  answer: string
): GuidedInterviewState {
  const questions = getQuestionsForGenre(
    state.selectedGenre
  );

  const currentQuestion =
    questions[state.currentStep];

  if (!currentQuestion) return state;

  return {
    ...state,
    currentStep: state.currentStep + 1,
    confidence: calculateInterviewConfidence(state, currentQuestion.key, answer),
    extracted: {
      ...state.extracted,
      [currentQuestion.key]: answer,
    },
  };
}
