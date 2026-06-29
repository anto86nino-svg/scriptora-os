import {
  adaptPlanWithMemory,
  buildStudyIntelligencePlan,
  type RiassuntoProLevel,
  type StudyKernelInput,
  type StudyKernelPlan,
  type StudyMode,
} from "@/lib/study-os/study-intelligence-kernel";
import { getStudyMemoryAdaptation, type StudyMemorySnapshot } from "@/lib/study-os/study-memory";
import type { StudyDifficultyLevel, StudyGoalIntent, StudyIntentSettings, StudySubjectIntent } from "@/lib/study-session";

/** Study session tab ids — mirrors StudySessionPage StudySection. */
export type StudySessionSection =
  | "materials"
  | "summary"
  | "quiz"
  | "flashcards"
  | "maps"
  | "exam"
  | "progress"
  | "certificates"
  | "coach";

const MODE_TO_SECTION: Record<StudyMode, StudySessionSection> = {
  explain: "summary",
  quiz: "quiz",
  flashcard: "flashcards",
  interrogation: "quiz",
  review: "flashcards",
  exam_sim: "exam",
};

const SECTION_TO_MODE: Partial<Record<StudySessionSection, StudyMode>> = {
  summary: "explain",
  quiz: "quiz",
  flashcards: "flashcard",
  exam: "exam_sim",
};

export const STUDY_MODE_LABELS: Record<StudyMode, string> = {
  explain: "Riassunto",
  quiz: "Quiz",
  flashcard: "Flashcard",
  interrogation: "Interrogazione",
  review: "Ripasso",
  exam_sim: "Simulazione esame",
};

export interface BuildSessionPlanInput {
  text: string;
  sourceName: string;
  studySubject: StudySubjectIntent;
  studyGoal: StudyGoalIntent;
  difficultyLevel: StudyDifficultyLevel;
  intent: StudyIntentSettings;
  memory?: StudyMemorySnapshot | null;
  timeAvailableMinutes?: number;
}

export function studyModeToSection(mode: StudyMode): StudySessionSection {
  return MODE_TO_SECTION[mode] ?? "summary";
}

export function studySectionToMode(section: StudySessionSection): StudyMode | undefined {
  return SECTION_TO_MODE[section];
}

export function buildSessionKernelPlan(input: BuildSessionPlanInput): StudyKernelPlan | null {
  const trimmed = input.text.trim();
  if (trimmed.split(/\s+/).filter(Boolean).length < 40) return null;

  const kernelInput: StudyKernelInput = {
    text: input.text,
    sourceName: input.sourceName,
    subject: input.studySubject,
    level: input.difficultyLevel,
    objective: input.studyGoal,
    intent: input.intent,
    timeAvailableMinutes: input.timeAvailableMinutes,
    weakTopics: input.memory?.weakTopics ?? [],
  };

  const base = buildStudyIntelligencePlan(kernelInput);
  if (!input.memory) return base;

  return adaptPlanWithMemory(base, getStudyMemoryAdaptation(input.memory));
}

export function resolveRecommendedSummaryLevel(plan: StudyKernelPlan | null): RiassuntoProLevel {
  return plan?.summaryLevel ?? "dettagliato";
}

export function isPrimaryModeSection(section: StudySessionSection, plan: StudyKernelPlan | null): boolean {
  if (!plan) return false;
  return studyModeToSection(plan.primaryMode) === section;
}

export function isRecommendedModeSection(section: StudySessionSection, plan: StudyKernelPlan | null): boolean {
  if (!plan) return false;
  return plan.recommendedModes.some((mode) => studyModeToSection(mode) === section);
}
