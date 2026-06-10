export interface StudyAchievement {
  id: string;
  label: string;
  emoji: string;
  description: string;
}

export const STUDY_ACHIEVEMENTS: StudyAchievement[] = [
  { id: "scholar", label: "Scholar", emoji: "🎓", description: "Completa 3 sessioni di studio" },
  { id: "master-reader", label: "Master Reader", emoji: "📚", description: "Analizza oltre 5.000 parole" },
  { id: "perfect-score", label: "Perfect Score", emoji: "💯", description: "Ottieni 100/100 in una verifica" },
  { id: "history-expert", label: "History Expert", emoji: "🏛️", description: "Completa 5 verifiche" },
  { id: "fast-learner", label: "Fast Learner", emoji: "⚡", description: "Completa una verifica in modalità esame" },
];

export function evaluateStudyAchievements(input: {
  sessions: number;
  words: number;
  latestScore?: number;
  totalAttempts: number;
  examCompleted?: boolean;
}): string[] {
  const earned: string[] = [];
  if (input.sessions >= 3) earned.push("scholar");
  if (input.words >= 5000) earned.push("master-reader");
  if ((input.latestScore || 0) >= 100) earned.push("perfect-score");
  if (input.totalAttempts >= 5) earned.push("history-expert");
  if (input.examCompleted) earned.push("fast-learner");
  return earned;
}

export function achievementById(id: string): StudyAchievement | undefined {
  return STUDY_ACHIEVEMENTS.find((a) => a.id === id);
}
