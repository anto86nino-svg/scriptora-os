import {
  classifyStudyMaterial,
  countStudyWords,
  sanitizeStudySessionResult,
  type OpenStudyQuestion,
  type StudyConceptMap,
  type StudyIntentSettings,
  type StudyMaterialClassification,
  type StudyMaterialType,
  type StudySessionResult,
} from "@/lib/study-session";

export const STUDY_MIN_FULL_SESSION_WORDS = 40;

export const STUDY_INSUFFICIENT_MESSAGE =
  "Materiale insufficiente per una sessione completa.";

export type StudyInputKind = "real_material" | "topic_only" | "insufficient";

export type StudySessionMode = "full" | "topic" | "insufficient";

export interface StudyInputClassification {
  kind: StudyInputKind;
  wordCount: number;
  topic?: string;
}

interface TopicSubjectHint {
  type: StudyMaterialType;
  label: string;
  subjectLabel: string;
  expansionSeed: string;
  concepts: string[];
  explorationIntro: string;
}

const TOPIC_SUBJECT_HINTS: Array<{ pattern: RegExp; hint: TopicSubjectHint }> = [
  {
    pattern: /intelligenza artificiale|machine learning|deep learning|informatica|algoritmi|programmazione|rete neurale|reti neurali|computer vision|\bIA\b|\bAI\b|\bML\b|\bDL\b|chatgpt|llm|transformer|dataset|training|inferenza|nlp|python|javascript|typescript/i,
    hint: {
      type: "computer-science",
      label: "Informatica / Intelligenza Artificiale",
      subjectLabel: "Informatica / Intelligenza Artificiale",
      expansionSeed:
        "L'intelligenza artificiale studia algoritmi, machine learning, deep learning, reti neurali, dataset, training e inferenza per costruire sistemi software intelligenti.",
      concepts: [
        "Machine learning",
        "Deep learning",
        "Reti neurali",
        "Training e dataset",
        "Inferenza",
        "Algoritmi",
      ],
      explorationIntro:
        "Hai inserito solo un argomento, non un capitolo o una dispensa. Scriptora ti offre una panoramica esplorativa sull'intelligenza artificiale: definizioni, concetti chiave e domande per orientarti prima di studiare materiale vero.",
    },
  },
  {
    pattern: /\bDNA\b|genetica|biologia molecolare|codice genetico|RNA|cellula/i,
    hint: {
      type: "medicine",
      label: "Biologia",
      subjectLabel: "Biologia / Genetica",
      expansionSeed:
        "Il DNA codifica l'informazione genetica ereditaria. RNA, proteine, cellule e replicazione sono concetti centrali della biologia molecolare.",
      concepts: ["DNA", "Geni", "Ereditarietà", "RNA", "Proteine", "Cellula"],
      explorationIntro:
        "Hai inserito solo un argomento biologico. Ecco una panoramica esplorativa per orientarti: non sostituisce lo studio di un capitolo o dispensa completa.",
    },
  },
  {
    pattern: /rivoluzione francese|\b1789\b|napoleone|bastiglia|stato moderno/i,
    hint: {
      type: "history",
      label: "Storia",
      subjectLabel: "Storia moderna",
      expansionSeed:
        "La Rivoluzione Francese del 1789 segnò crisi dell'Ancien Régime, Dichiarazione dei diritti, fasi rivoluzionarie e trasformazioni politiche in Europa.",
      concepts: [
        "Cause della Rivoluzione",
        "1789 e caduta dell'Ancien Régime",
        "Diritti civili e cittadinanza",
        "Fasi rivoluzionarie",
        "Impatto europeo",
        "Napoleone e eredità",
      ],
      explorationIntro:
        "Hai inserito solo un argomento storico. Scriptora non simula lo studio di un capitolo: ti propone una mappa concettuale esplorativa e domande guida.",
    },
  },
];

const TOPIC_QUERY_PATTERN =
  /^(come|perch[eé]|quando|dove|chi|cosa|che cosa|aiuto|help|spiegami|dimmi|devo|posso|vorrei)\b/i;

function cleanTopicText(value: string): string {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function resolveTopicSubjectHint(topic: string): TopicSubjectHint | null {
  const normalized = topic.trim();
  for (const entry of TOPIC_SUBJECT_HINTS) {
    if (entry.pattern.test(normalized)) return entry.hint;
  }
  return null;
}

export function isTopicOnlyInput(text: string): boolean {
  const clean = cleanTopicText(text);
  const words = countStudyWords(clean);
  if (words === 0 || words >= STUDY_MIN_FULL_SESSION_WORDS) return false;

  const lines = clean.split(/\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 2) return false;

  if (TOPIC_QUERY_PATTERN.test(clean)) return false;
  if (/\?\s*$/.test(clean) && words > 4) return false;

  if (resolveTopicSubjectHint(clean)) return true;

  const sentenceLike = /[.!?;:]\s/.test(clean);
  if (words <= 8 && !sentenceLike) return true;

  return false;
}

export function classifyStudyInput(text: string): StudyInputClassification {
  const clean = cleanTopicText(text);
  const wordCount = countStudyWords(clean);

  if (wordCount >= STUDY_MIN_FULL_SESSION_WORDS) {
    return { kind: "real_material", wordCount };
  }

  if (isTopicOnlyInput(clean)) {
    return { kind: "topic_only", wordCount, topic: clean };
  }

  return { kind: "insufficient", wordCount };
}

export function hasMinimumStudyMaterial(text: string): boolean {
  return classifyStudyInput(text).kind === "real_material";
}

function classifyTopicMaterial(topic: string, intent: StudyIntentSettings = {}): StudyMaterialClassification {
  const hint = resolveTopicSubjectHint(topic);
  const seed = hint?.expansionSeed || `${topic} è un argomento di studio da approfondire con materiale strutturato.`;
  const classification = classifyStudyMaterial(`${topic}. ${seed}`, topic, intent);

  if (!hint) return classification;

  return {
    ...classification,
    type: hint.type,
    label: hint.label,
    subjectLabel: hint.subjectLabel,
    mode: "Esplorazione argomento",
    signals: [`Argomento breve: ${topic}`, ...classification.signals.slice(0, 2)],
    strategy: hint.concepts.slice(0, 4),
  };
}

function buildTopicConceptMap(topic: string, concepts: string[], classification: StudyMaterialClassification): StudyConceptMap {
  const nodes = [
    { id: "root", label: topic, detail: classification.subjectLabel, level: 0 },
    ...concepts.slice(0, 6).map((concept, index) => ({
      id: `concept-${index}`,
      label: concept,
      detail: `Nucleo esplorativo su ${topic}.`,
      level: 1,
    })),
  ];
  const relations = concepts.slice(0, 6).map((_, index) => ({
    from: "root",
    to: `concept-${index}`,
    label: "include",
    type: "hierarchy" as const,
  }));

  return {
    title: topic,
    nodes,
    relations,
    exportText: [`MAPPA ESPLORATIVA — ${topic}`, ...concepts.map((concept) => `- ${concept}`)].join("\n"),
  };
}

function buildTopicOpenQuestions(topic: string, concepts: string[], classification: StudyMaterialClassification): OpenStudyQuestion[] {
  const base = concepts.slice(0, 4);
  return [
    {
      question: `Cosa intendiamo per "${topic}" nel contesto di ${classification.label}?`,
      answerGuide: "Definisci l'argomento con parole tue, anche a livello introduttivo, e indica perché è rilevante.",
    },
    {
      question: `Quali sono i concetti fondamentali da conoscere su ${topic}?`,
      answerGuide: `Elenca e spiega brevemente: ${base.join(", ") || classification.label}.`,
    },
    {
      question: `Come potresti approfondire ${topic} con materiale reale (libro, dispensa, PDF)?`,
      answerGuide: "Indica che tipo di fonte servirebbe e quali sezioni studieresti per passare dall'esplorazione allo studio completo.",
    },
    {
      question: `Quali domande d'esame potrebbero nascere su ${topic}?`,
      answerGuide: "Proponi 2-3 domande plausibili, senza inventare fatti non presenti in un vero capitolo.",
    },
  ];
}

function buildTopicSummaries(topic: string, hint: TopicSubjectHint | null, classification: StudyMaterialClassification) {
  const intro = hint?.explorationIntro
    || `Hai inserito solo "${topic}". Scriptora attiva la modalità esplorazione: panoramica introduttiva, concetti chiave e domande guida. Non sostituisce lo studio di un capitolo o dispensa.`;

  const body = hint?.expansionSeed
    || `${topic} è un argomento di ${classification.label}. Per una sessione completa servono almeno ${STUDY_MIN_FULL_SESSION_WORDS} parole di materiale reale.`;

  const brief = `${intro}\n\n${body}`;
  const complete = [
    intro,
    "",
    "Concetti chiave da esplorare:",
    ...(hint?.concepts || classification.strategy).map((item) => `• ${item}`),
    "",
    "Prossimo passo: incolla un capitolo, carica un PDF o amplia l'argomento con appunti strutturati.",
  ].join("\n");

  return {
    brief,
    complete,
    university: complete,
    oral: `Spiega oralmente cosa sai già di ${topic} e quali lacune vorresti colmare con materiale vero.`,
    ultraSimple: `${topic}: panoramica introduttiva. Serve materiale più lungo per quiz e simulazione esame.`,
    quickReview: brief,
    chronological: body,
    causeEffect: `Per approfondire ${topic}: causa = materiale insufficiente; effetto = modalità esplorazione attiva.`,
    bulletPoints: (hint?.concepts || classification.strategy).map((item) => `• ${item}`).join("\n"),
    oralExam: `Domanda orale esplorativa: cosa sai di ${topic} e come lo collegheresti a ${classification.label}?`,
  };
}

export function buildTopicModeSession(
  text: string,
  sourceName = "argomento.txt",
  intent: StudyIntentSettings = {},
): StudySessionResult {
  const topic = cleanTopicText(text) || sourceName;
  const words = countStudyWords(topic);
  const hint = resolveTopicSubjectHint(topic);
  const classification = classifyTopicMaterial(topic, intent);
  const keyConcepts = (hint?.concepts || classification.strategy.slice(0, 6)).map(
    (item) => item[0]?.toUpperCase() + item.slice(1),
  );
  const summaries = buildTopicSummaries(topic, hint, classification);
  const openQuestions = buildTopicOpenQuestions(topic, keyConcepts, classification);
  const conceptMap = buildTopicConceptMap(topic, keyConcepts, classification);

  const result: StudySessionResult = {
    title: topic,
    sourceName,
    words,
    contentType: classification.contentType,
    subjectLabel: classification.subjectLabel,
    studyMode: "Esplorazione argomento",
    detectedSubject: classification.subjectLabel,
    difficulty: "soft",
    sessionMode: "topic",
    classification,
    summaries,
    lightSummary: summaries.brief,
    mediumSummary: summaries.complete,
    proSummary: summaries.complete,
    studyNotesPro: [
      `MODALITÀ ESPLORAZIONE — ${topic}`,
      "",
      summaries.brief,
      "",
      "Concetti chiave:",
      ...keyConcepts.map((item) => `• ${item}`),
      "",
      "Per quiz, flashcard e simulazione esame carica almeno 40 parole di materiale reale.",
    ].join("\n"),
    openQuestions,
    difficultWords: [],
    flashcards: [],
    quiz: [],
    trueFalse: [],
    exercises: [],
    conceptMap,
    learningPackage: {
      summaryUltraBrief: summaries.brief,
      summaryStandard: summaries.complete,
      summaryDeep: summaries.complete,
      keyConcepts,
      commonMistakes: [
        `Confondere l'esplorazione di "${topic}" con lo studio di un capitolo completo.`,
        "Inventare dettagli specifici senza materiale di riferimento.",
      ],
      examQuestions: openQuestions.map((item) => item.question),
    },
    knowledgeMap: keyConcepts.slice(0, 4).map((concept) => ({
      concept,
      mastery: 15,
      status: "weak" as const,
      reason: "Modalità esplorazione: nessuna verifica attiva ancora disponibile.",
      nextAction: "Carica materiale reale per attivare quiz e flashcard.",
    })),
    adaptiveCoach: {
      currentLevel: "base",
      nextAction: "Incolla testo, carica PDF o amplia l'argomento per una sessione completa.",
      gaps: ["Materiale insufficiente per verifica attiva"],
      strengths: keyConcepts.slice(0, 2),
      estimatedPassProbability: 20,
      knowledgeMap: [],
    },
    keyConcepts,
    studyMaterialType: intent.studyMaterialType,
    studySubject: intent.studySubject,
    literaryGenre: intent.literaryGenre,
    studyGoal: intent.studyGoal,
    difficultyLevel: intent.difficultyLevel,
  };

  return sanitizeStudySessionResult(result);
}

export function buildInsufficientStudySession(
  text: string,
  sourceName = "materiale-studio.txt",
  intent: StudyIntentSettings = {},
  wordCount = countStudyWords(cleanTopicText(text)),
): StudySessionResult {
  const topic = cleanTopicText(text) || sourceName;
  const classification = classifyStudyMaterial(topic, sourceName, intent);

  const result: StudySessionResult = {
    title: topic || "Materiale insufficiente",
    sourceName,
    words: wordCount,
    contentType: classification.contentType,
    subjectLabel: classification.subjectLabel,
    studyMode: "Materiale insufficiente",
    detectedSubject: classification.subjectLabel,
    difficulty: "soft",
    sessionMode: "insufficient",
    classification,
    summaries: {
      brief: STUDY_INSUFFICIENT_MESSAGE,
      complete: STUDY_INSUFFICIENT_MESSAGE,
      university: STUDY_INSUFFICIENT_MESSAGE,
      oral: STUDY_INSUFFICIENT_MESSAGE,
      ultraSimple: STUDY_INSUFFICIENT_MESSAGE,
      quickReview: STUDY_INSUFFICIENT_MESSAGE,
      chronological: STUDY_INSUFFICIENT_MESSAGE,
      causeEffect: STUDY_INSUFFICIENT_MESSAGE,
      bulletPoints: STUDY_INSUFFICIENT_MESSAGE,
      oralExam: STUDY_INSUFFICIENT_MESSAGE,
    },
    lightSummary: STUDY_INSUFFICIENT_MESSAGE,
    mediumSummary: [
      STUDY_INSUFFICIENT_MESSAGE,
      "",
      "Puoi:",
      "• incollare più testo (almeno 40 parole)",
      "• caricare un PDF o una dispensa",
      "• inserire solo un argomento (es. «Intelligenza Artificiale») per la modalità esplorazione",
    ].join("\n"),
    proSummary: STUDY_INSUFFICIENT_MESSAGE,
    studyNotesPro: STUDY_INSUFFICIENT_MESSAGE,
    openQuestions: [],
    difficultWords: [],
    flashcards: [],
    quiz: [],
    trueFalse: [],
    exercises: [],
    keyConcepts: [],
    studyMaterialType: intent.studyMaterialType,
    studySubject: intent.studySubject,
    literaryGenre: intent.literaryGenre,
    studyGoal: intent.studyGoal,
    difficultyLevel: intent.difficultyLevel,
  };

  return sanitizeStudySessionResult(result);
}

export function hasSemanticStudyContent(result: StudySessionResult): boolean {
  if (result.sessionMode === "topic" || result.sessionMode === "insufficient") return false;
  if ((result.words || 0) < STUDY_MIN_FULL_SESSION_WORDS) return false;

  const concepts = (result.keyConcepts || []).filter(Boolean);
  if (concepts.length < 3) return false;

  const hasSummarySentence = [result.lightSummary, result.mediumSummary, result.proSummary]
    .some((part) => countStudyWords(String(part || "")) >= 8);
  if (!hasSummarySentence) return false;

  return true;
}

export function isFullStudySession(result: StudySessionResult | null | undefined): boolean {
  return Boolean(result && (result.sessionMode === "full" || (!result.sessionMode && hasSemanticStudyContent(result))));
}
