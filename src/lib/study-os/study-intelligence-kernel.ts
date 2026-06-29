import {
  classifyStudyMaterial,
  type StudyDifficulty,
  type StudyDifficultyLevel,
  type StudyGoalIntent,
  type StudyIntentSettings,
  type StudyMaterialClassification,
  type StudySubjectIntent,
} from "@/lib/study-session";

/** Study modes the kernel can recommend — each must aid understanding, recall, or exam prep. */
export type StudyMode =
  | "explain"
  | "quiz"
  | "flashcard"
  | "interrogation"
  | "review"
  | "exam_sim";

export type StudyLearningStyle = "visual" | "verbal" | "practical" | "mixed";

export type RiassuntoProLevel =
  | "rapido"
  | "dettagliato"
  | "accademico"
  | "per_esame"
  | "ultra_sintetico";

export type QuizDifficultyTier = "facile" | "media" | "difficile" | "esame";

export type KernelQuizType =
  | "multiple_choice"
  | "open_answer"
  | "completion"
  | "true_false"
  | "practical_case";

export type KernelFlashcardType =
  | "qa"
  | "definition"
  | "formula"
  | "historical_date"
  | "true_false";

export interface StudySubjectProfile {
  classification: StudyMaterialClassification;
  isNarrative: boolean;
  isExamFocused: boolean;
  prefersDefinitions: boolean;
  prefersCases: boolean;
  prefersFormulas: boolean;
}

export interface StudyKernelInput {
  text: string;
  sourceName?: string;
  materia?: string;
  subject?: StudySubjectIntent;
  level?: StudyDifficultyLevel;
  difficulty?: StudyDifficulty;
  objective?: StudyGoalIntent;
  timeAvailableMinutes?: number;
  learningStyle?: StudyLearningStyle;
  intent?: StudyIntentSettings;
  /** Weak topics from study memory — kernel boosts review modes. */
  weakTopics?: string[];
}

export interface StudyKernelPlan {
  classification: StudyMaterialClassification;
  subjectProfile: StudySubjectProfile;
  recommendedModes: StudyMode[];
  primaryMode: StudyMode;
  summaryLevel: RiassuntoProLevel;
  quizDifficulty: QuizDifficultyTier;
  quizTypes: KernelQuizType[];
  flashcardTypes: KernelFlashcardType[];
  estimatedMinutes: number;
  rationale: string[];
}

export function resolveStudyIntent(input: StudyKernelInput): StudyIntentSettings {
  return {
    studyMaterialType: input.intent?.studyMaterialType ?? "auto",
    studySubject: input.subject ?? input.intent?.studySubject ?? "auto",
    literaryGenre: input.intent?.literaryGenre ?? "auto",
    studyGoal: input.objective ?? input.intent?.studyGoal ?? "complete_summary",
    difficultyLevel: input.level ?? input.intent?.difficultyLevel ?? 3,
  };
}

/** Single entry for subject classification — delegates to study-session, no duplicate logic. */
export function classifyStudySubject(
  text: string,
  sourceName = "",
  intent: StudyIntentSettings = {},
): StudyMaterialClassification {
  return classifyStudyMaterial(text, sourceName, intent);
}

export function buildSubjectProfile(classification: StudyMaterialClassification): StudySubjectProfile {
  const isNarrative = classification.contentType === "narrative_fiction";
  const stemTypes = new Set(["math", "physics", "chemistry", "medicine", "computer-science"]);
  const caseTypes = new Set(["law", "economics", "medicine", "history"]);
  const definitionTypes = new Set(["philosophy", "law", "biology", "chemistry", "medicine", "foreign-language"]);

  return {
    classification,
    isNarrative,
    isExamFocused: classification.mode === "Preparazione esame" || classification.strategy.some((s) => /esame|verifica/i.test(s)),
    prefersDefinitions: definitionTypes.has(classification.type),
    prefersCases: caseTypes.has(classification.type),
    prefersFormulas: stemTypes.has(classification.type),
  };
}

function difficultyTierFromLevel(level: StudyDifficultyLevel, examFocused: boolean): QuizDifficultyTier {
  if (examFocused && level >= 4) return "esame";
  if (level <= 1) return "facile";
  if (level <= 3) return "media";
  return "difficile";
}

function summaryLevelFromInput(
  objective: StudyGoalIntent,
  minutes: number,
  level: StudyDifficultyLevel,
): RiassuntoProLevel {
  if (objective === "quick_understanding" || minutes <= 20) return "rapido";
  if (objective === "exam_prep" || level >= 4) return "per_esame";
  if (objective === "oral_test" || objective === "oral_presentation") return "accademico";
  if (minutes >= 90 || objective === "complete_summary") return "dettagliato";
  if (minutes <= 10) return "ultra_sintetico";
  return "dettagliato";
}

function modesForProfile(
  profile: StudySubjectProfile,
  objective: StudyGoalIntent,
  minutes: number,
  weakTopics: string[],
): StudyMode[] {
  const modes: StudyMode[] = [];

  if (profile.isNarrative) {
    modes.push("explain", "interrogation", "quiz", "review");
    if (objective === "manuscript_analysis") modes.unshift("explain");
    return Array.from(new Set(modes));
  }

  if (objective === "flashcards") modes.push("flashcard", "review", "quiz");
  else if (objective === "quiz") modes.push("quiz", "review", "flashcard");
  else if (objective === "exam_prep") modes.push("quiz", "exam_sim", "flashcard", "review", "explain");
  else if (objective === "oral_test" || objective === "oral_presentation") modes.push("interrogation", "explain", "quiz", "review");
  else if (objective === "quick_understanding") modes.push("explain", "review", "quiz");
  else modes.push("explain", "quiz", "flashcard", "review");

  if (weakTopics.length > 0) modes.unshift("review", "flashcard");
  if (minutes >= 60 && !modes.includes("exam_sim")) modes.push("exam_sim");
  if (profile.prefersCases && !modes.includes("quiz")) modes.push("quiz");

  return Array.from(new Set(modes));
}

function quizTypesForProfile(profile: StudySubjectProfile, tier: QuizDifficultyTier): KernelQuizType[] {
  if (profile.isNarrative) {
    return ["multiple_choice", "open_answer", "true_false"];
  }

  const base: KernelQuizType[] = ["multiple_choice", "true_false", "open_answer"];
  if (profile.prefersDefinitions) base.push("completion");
  if (profile.prefersCases || tier === "esame") base.push("practical_case");
  return Array.from(new Set(base));
}

function flashcardTypesForProfile(profile: StudySubjectProfile): KernelFlashcardType[] {
  if (profile.isNarrative) return ["qa", "definition", "true_false"];
  if (profile.prefersFormulas) return ["definition", "formula", "qa", "true_false"];
  if (profile.classification.type === "history") return ["historical_date", "definition", "qa", "true_false"];
  return ["definition", "qa", "true_false"];
}

/**
 * Central study routing — all Study OS modules should read mode/summary/quiz decisions from here.
 */
export function buildStudyIntelligencePlan(input: StudyKernelInput): StudyKernelPlan {
  const intent = resolveStudyIntent(input);
  const classification = classifyStudySubject(input.text, input.sourceName ?? "", intent);
  const subjectProfile = buildSubjectProfile(classification);
  const minutes = input.timeAvailableMinutes ?? classification.estimatedStudyMinutes;
  const objective = intent.studyGoal ?? "complete_summary";
  const level = intent.difficultyLevel ?? 3;
  const weakTopics = (input.weakTopics ?? []).filter(Boolean);

  const recommendedModes = modesForProfile(subjectProfile, objective, minutes, weakTopics);
  const summaryLevel = summaryLevelFromInput(objective, minutes, level);
  const quizDifficulty = difficultyTierFromLevel(level, subjectProfile.isExamFocused || objective === "exam_prep");
  const quizTypes = quizTypesForProfile(subjectProfile, quizDifficulty);
  const flashcardTypes = flashcardTypesForProfile(subjectProfile);

  const rationale: string[] = [
    `Materia: ${classification.subjectLabel} (${classification.type}).`,
    `Obiettivo: ${objective}; tempo ~${minutes} min; livello ${level}/5.`,
  ];
  if (weakTopics.length) rationale.push(`Ripasso prioritario su: ${weakTopics.slice(0, 4).join(", ")}.`);
  if (subjectProfile.isNarrative) rationale.push("Profilo narrativo: quiz e interrogazione craft-aware, non definizioni scolastiche.");
  if (quizDifficulty === "esame") rationale.push("Difficoltà esame: domande applicative e casi pratici.");

  return {
    classification,
    subjectProfile,
    recommendedModes: recommendedModes,
    primaryMode: recommendedModes[0] ?? "explain",
    summaryLevel,
    quizDifficulty,
    quizTypes,
    flashcardTypes,
    estimatedMinutes: minutes,
    rationale,
  };
}

/** Adapt plan when study memory reports persistent weak areas. */
export function adaptPlanWithMemory(
  plan: StudyKernelPlan,
  memory: { weakTopics: string[]; recentQuizAccuracy?: number },
): StudyKernelPlan {
  const weak = memory.weakTopics.filter(Boolean);
  const lowAccuracy = (memory.recentQuizAccuracy ?? 1) < 0.7;
  if (!weak.length && !lowAccuracy) return plan;

  const modes = plan.recommendedModes.filter((m) => m !== "review" && m !== "flashcard");
  if (lowAccuracy || weak.length) modes.unshift("flashcard");
  modes.unshift("review");

  const rationale = [...plan.rationale];
  if (weak.length) rationale.push(`Memoria studio: rinforzo su ${weak.slice(0, 3).join(", ")}.`);
  if (lowAccuracy) rationale.push("Accuratezza quiz bassa: priorità a ripasso e flashcard.");

  return {
    ...plan,
    recommendedModes: Array.from(new Set(modes)),
    primaryMode: "review",
    rationale,
  };
}
