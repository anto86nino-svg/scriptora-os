import {
  sanitizeStudyQuizQuestions,
  type QuizQuestion,
  type StudySessionResult,
} from "@/lib/study-session";
import { hasSemanticStudyContent } from "@/lib/study-os/study-topic-mode";
import type {
  KernelQuizType,
  QuizDifficultyTier,
  StudyKernelPlan,
  StudySubjectProfile,
} from "@/lib/study-os/study-intelligence-kernel";

export interface EnhancedQuizItem extends QuizQuestion {
  kernelType: KernelQuizType;
  tier: QuizDifficultyTier;
}

export interface StudyQuizPack {
  items: EnhancedQuizItem[];
  byType: Record<KernelQuizType, EnhancedQuizItem[]>;
  subjectAppropriate: boolean;
}

const NARRATIVE_TROPE_PATTERN =
  /villa gotica|desiderio proibito|slow burn|Viola sent|Damiano.*contratto|cosa sente viola/i;

const TIER_TO_INTERNAL: Record<QuizDifficultyTier, QuizQuestion["difficulty"]> = {
  facile: "easy",
  media: "medium",
  difficile: "hard",
  esame: "hard",
};

function inferKernelType(item: QuizQuestion, profile: StudySubjectProfile): KernelQuizType {
  if (item.type === "true-false" || /^vero\s*(?:o|\/)\s*falso/i.test(item.question)) return "true_false";
  if (item.type === "open" || item.type === "short-answer") return "open_answer";
  if (/complet|inserisci|riempi|____/i.test(item.question)) return "completion";
  if (item.type === "case" || item.type === "application") return "practical_case";
  if (item.type === "multiple-choice" || item.type === "comparison" || item.type === "connection" || item.options.length >= 3) {
    return "multiple_choice";
  }
  if (profile.prefersCases && item.learningLevel === "exam") return "practical_case";
  return "multiple_choice";
}

function tierForItem(item: QuizQuestion, plan: StudyKernelPlan): QuizDifficultyTier {
  if (plan.quizDifficulty === "esame") return item.difficulty === "easy" ? "media" : "esame";
  if (item.difficulty === "easy") return "facile";
  if (item.difficulty === "hard") return plan.quizDifficulty === "facile" ? "media" : "difficile";
  return "media";
}

function buildCompletionItems(result: StudySessionResult, profile: StudySubjectProfile): EnhancedQuizItem[] {
  return result.keyConcepts.slice(0, 4).map((concept, index) => ({
    question: `Completa: "${concept}" si definisce come __________ nel contesto di ${profile.classification.label}.`,
    options: [
      `Un concetto chiave di ${profile.classification.label}`,
      "Un dettaglio irrilevante",
      "Una data da memorizzare a caso",
      "Un termine fuori contesto",
    ],
    answer: 0,
    explanation: `Nel materiale "${concept}" è un nucleo concettuale da definire con precisione.`,
    difficulty: TIER_TO_INTERNAL.media,
    type: "multiple-choice",
    kernelType: "completion" as const,
    tier: "media" as const,
    learningLevel: "memory",
    sourceReference: profile.classification.label,
    testedSkill: "definizione e completamento",
    memoryTrick: "Definizione + contesto + esempio.",
    commonMistake: "Inserire una parola corretta ma fuori dal materiale studiato.",
    ...(index >= 0 ? {} : {}),
  }));
}

function buildOpenAnswerItems(result: StudySessionResult, profile: StudySubjectProfile): EnhancedQuizItem[] {
  return result.openQuestions.slice(0, 4).map((item) => ({
    question: item.question,
    options: ["Risposta aperta — verifica con la guida"],
    answer: 0,
    explanation: item.answerGuide,
    difficulty: "medium",
    type: "open",
    kernelType: "open_answer" as const,
    tier: "difficile" as const,
    learningLevel: "exam",
    sourceReference: profile.classification.label,
    testedSkill: "risposta argomentata",
  }));
}

function buildPracticalCases(result: StudySessionResult, profile: StudySubjectProfile): EnhancedQuizItem[] {
  const concepts = result.keyConcepts.slice(0, 3);
  return concepts.map((concept) => ({
    question: `Caso pratico: come applicheresti "${concept}" in un esempio concreto legato a ${profile.classification.label}?`,
    options: [
      "Definisco il concetto, descrivo il caso e traggo una conseguenza verificabile",
      "Cito il concetto senza applicarlo",
      "Invento un caso non presente nel materiale",
      "Evito di collegare concetto e contesto",
    ],
    answer: 0,
    explanation: "Un caso pratico valido usa definizione, applicazione e conseguenza coerente col materiale.",
    difficulty: "hard",
    type: "case",
    kernelType: "practical_case" as const,
    tier: "esame" as const,
    learningLevel: "application",
    sourceReference: profile.classification.label,
    testedSkill: "applicazione a caso concreto",
  }));
}

function isSubjectAppropriate(items: QuizQuestion[], profile: StudySubjectProfile): boolean {
  if (profile.isNarrative) return true;
  const joined = items.map((q) => q.question).join(" ");
  return !NARRATIVE_TROPE_PATTERN.test(joined);
}

/** Enhance and type-tag quiz items according to kernel subject profile. */
export function buildStudyQuizPack(
  result: StudySessionResult,
  plan: StudyKernelPlan,
): StudyQuizPack {
  const emptyByType = {
    multiple_choice: [],
    open_answer: [],
    completion: [],
    true_false: [],
    practical_case: [],
  } as Record<KernelQuizType, EnhancedQuizItem[]>;

  if (!hasSemanticStudyContent(result)) {
    return {
      items: [],
      byType: emptyByType,
      subjectAppropriate: true,
    };
  }

  const profile = plan.subjectProfile;
  const base = sanitizeStudyQuizQuestions(result.quiz, result.quiz);
  const trueFalse = (result.trueFalse ?? []).map((item) => ({
    ...item,
    type: "true-false" as const,
  }));

  let items: EnhancedQuizItem[] = base.map((item) => ({
    ...item,
    kernelType: inferKernelType(item, profile),
    tier: tierForItem(item, plan),
  }));

  if (plan.quizTypes.includes("true_false")) {
    items = [
      ...items,
      ...trueFalse.map((item) => ({
        ...item,
        kernelType: "true_false" as const,
        tier: tierForItem(item, plan),
      })),
    ];
  }

  if (plan.quizTypes.includes("completion") && !profile.isNarrative) {
    items = [...items, ...buildCompletionItems(result, profile)];
  }

  if (plan.quizTypes.includes("open_answer")) {
    items = [...items, ...buildOpenAnswerItems(result, profile)];
  }

  if (plan.quizTypes.includes("practical_case") && (profile.prefersCases || plan.quizDifficulty === "esame")) {
    items = [...items, ...buildPracticalCases(result, profile)];
  }

  // Non-narrative subjects must not leak gothic narrative tropes into quiz
  if (!profile.isNarrative) {
    items = items.filter((item) => !NARRATIVE_TROPE_PATTERN.test(item.question));
  }

  const byType: Record<KernelQuizType, EnhancedQuizItem[]> = {
    multiple_choice: [],
    open_answer: [],
    completion: [],
    true_false: [],
    practical_case: [],
  };
  items.forEach((item) => {
    byType[item.kernelType].push(item);
  });

  return {
    items: items.slice(0, 24),
    byType,
    subjectAppropriate: isSubjectAppropriate(items, profile),
  };
}

export function filterQuizByTier(pack: StudyQuizPack, tier: QuizDifficultyTier): EnhancedQuizItem[] {
  if (!pack.items.length) return [];
  return pack.items.filter((item) => item.tier === tier);
}
