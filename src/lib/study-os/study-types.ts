import type {
  DifficultWord,
  Flashcard,
  OpenStudyQuestion,
  QuizQuestion,
  StudyDifficulty,
  StudySessionResult,
} from "@/lib/study-session";

export type StudyLevel = "middle_school" | "high_school" | "university";
export type StudyGoal = "interrogation" | "quiz" | "exam" | "summary" | "quick_review";

export interface StudyMaterialAnalysis {
  detectedSubject: string;
  detectedLevel: StudyLevel;
  mainTopics: string[];
  keyTerms: string[];
  difficulty: StudyDifficulty;
  estimatedStudyTimeMinutes: number;
  prerequisites: string[];
  weakPoints: string[];
  confusionRisks: string[];
  recommendedMode: StudyGoal;
}

export interface StudySummaryPack {
  ultraShortSummary: string;
  standardSummary: string;
  detailedSummary: string;
  keyPoints: string[];
  formulasOrDates: string[];
  commonMistakes: string[];
  glossary: Array<{ term: string; definition: string }>;
}

export interface StudyExplanationPack {
  simpleExplanation: string;
  examLevelExplanation: string;
  advancedExplanation: string;
  examples: string[];
  analogy: string;
  stepByStep: string[];
}

export interface StudyFlashcardItem extends Flashcard {
  difficulty?: "easy" | "medium" | "hard";
}

export interface StudyPracticePack {
  flashcards: StudyFlashcardItem[];
  quiz: QuizQuestion[];
  oralExamQuestions: OpenStudyQuestion[];
  shortAnswerQuestions: OpenStudyQuestion[];
  exercises: string[];
}

export interface StudyEvaluationPack {
  score: number;
  strengths: string[];
  weaknesses: string[];
  whatToReview: string[];
  nextActions: string[];
  estimatedReadiness: "low" | "medium" | "high";
}

export interface StudyPlanItem {
  title: string;
  priority: "high" | "medium" | "low";
  minutes: number;
  action: string;
}

export interface StudyPlanPack {
  priorityOrder: StudyPlanItem[];
  dailyPlan: string[];
  activeRecallTasks: string[];
  revisionSchedule: string[];
  examStrategy: string[];
}

export interface StudyClarifyPack {
  simplerRephrase: string;
  concreteExamples: string[];
  analogy: string;
  miniExercise: string;
}

export interface StudyOsExtendedResult {
  materialAnalysis?: StudyMaterialAnalysis;
  summaryPack?: StudySummaryPack;
  explanationPack?: StudyExplanationPack;
  conceptMap?: string;
  practicePack?: StudyPracticePack;
  evaluation?: StudyEvaluationPack;
  studyPlan?: StudyPlanPack;
  clarifyPack?: StudyClarifyPack;
  reviewChecklist?: string[];
}

export type StudyOsSessionResult = StudySessionResult & StudyOsExtendedResult;

export interface StudyOsGenerateInput {
  text: string;
  sourceName: string;
  language?: "Italian" | "English" | "Spanish" | "French" | "German";
  level?: StudyDifficulty;
  studyLevel?: StudyLevel;
  goal?: StudyGoal;
}

export const STUDY_OS_JSON_SHAPE = {
  title: "string",
  detectedSubject: "string",
  difficulty: "soft | medium | pro",
  materialAnalysis: {
    detectedLevel: "middle_school | high_school | university",
    mainTopics: ["string"],
    keyTerms: ["string"],
    estimatedStudyTimeMinutes: 0,
    prerequisites: ["string"],
    weakPoints: ["string"],
    confusionRisks: ["string"],
    recommendedMode: "interrogation | quiz | exam | summary | quick_review",
  },
  lightSummary: "string",
  mediumSummary: "string",
  proSummary: "string",
  studyNotesPro: "string",
  simpleExplanation: "string",
  examLevelExplanation: "string",
  advancedExplanation: "string",
  conceptMap: "string",
  reviewChecklist: ["string"],
  studyPlan: {
    priorityOrder: [{ title: "string", priority: "high|medium|low", minutes: 0, action: "string" }],
    dailyPlan: ["string"],
    activeRecallTasks: ["string"],
    revisionSchedule: ["string"],
    examStrategy: ["string"],
  },
  openQuestions: [{ question: "string", answerGuide: "string" }],
  difficultWords: [{ word: "string", simple: "string", technical: "string", example: "string" }],
  flashcards: [{ front: "string", back: "string", difficulty: "easy|medium|hard" }],
  quiz: [{
    question: "string",
    options: ["string"],
    answer: 0,
    explanation: "string",
    difficulty: "easy|medium|hard",
    memoryTrick: "string",
    commonMistake: "string",
  }],
  keyConcepts: ["string"],
  commonMistakes: ["string"],
  formulasOrDates: ["string"],
} as const;
