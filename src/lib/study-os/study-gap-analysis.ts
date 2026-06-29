import type { StudyMemorySnapshot, StudyQuizAttempt } from "@/lib/study-os/study-memory";

export interface GapAnalysisInput {
  quizAttempts?: StudyQuizAttempt[];
  memory?: StudyMemorySnapshot | null;
  oralScores?: Array<{ score: number }>;
  totalQuestions?: number;
  examScore?: number;
}

export interface GapAnalysisResult {
  weakTopics: string[];
  strongTopics: string[];
  rischioBocciatura: "basso" | "medio" | "alto" | "critico";
  probabilitaSuccesso: number;
  summary: string;
  actions: string[];
}

function riskFromAccuracy(accuracy: number, examScore?: number): GapAnalysisResult["rischioBocciatura"] {
  const blended = examScore !== undefined ? accuracy * 0.5 + (examScore / 100) * 0.5 : accuracy;
  if (blended >= 0.75) return "basso";
  if (blended >= 0.55) return "medio";
  if (blended >= 0.4) return "alto";
  return "critico";
}

function successProbability(accuracy: number, weakCount: number, examScore?: number): number {
  let base = Math.round(accuracy * 100);
  base -= weakCount * 5;
  if (examScore !== undefined) base = Math.round(base * 0.4 + examScore * 0.6);
  return Math.max(5, Math.min(95, base));
}

/** Analyze lacune after quiz or oral interrogation. */
export function analyzeStudyGaps(input: GapAnalysisInput): GapAnalysisResult {
  const attempts = input.quizAttempts ?? input.memory?.quizAttempts ?? [];
  const oral = input.oralScores ?? input.memory?.oralScores ?? [];

  const weakSet = new Set(input.memory?.weakTopics ?? []);
  const strongSet = new Set(input.memory?.strongTopics ?? []);

  for (const attempt of attempts) {
    const topic = attempt.topic?.trim() || "generale";
    if (!attempt.correct) weakSet.add(topic);
  }

  const recent = attempts.slice(-20);
  const accuracy =
    recent.length > 0 ? recent.filter((a) => a.correct).length / recent.length : input.memory?.recentQuizAccuracy ?? 1;

  const oralAvg =
    oral.length > 0 ? oral.reduce((sum, o) => sum + o.score, 0) / oral.length / 100 : null;
  const blendedAccuracy = oralAvg !== null ? accuracy * 0.7 + oralAvg * 0.3 : accuracy;

  const weakTopics = Array.from(weakSet).slice(0, 8);
  const strongTopics = Array.from(strongSet).slice(0, 6);
  const rischioBocciatura = riskFromAccuracy(blendedAccuracy, input.examScore);
  const probabilitaSuccesso = successProbability(blendedAccuracy, weakTopics.length, input.examScore);

  const summary =
    rischioBocciatura === "basso"
      ? "Buona preparazione: mantieni il ritmo con ripassi leggeri."
      : rischioBocciatura === "medio"
        ? "Preparazione discreta: colma le lacune prima della verifica."
        : rischioBocciatura === "alto"
          ? "Lacune rilevanti: serve un piano di ripasso strutturato."
          : "Rischio elevato: concentrati sui concetti base e rifai i quiz.";

  const actions: string[] = [];
  if (weakTopics.length) actions.push(`Ripassa: ${weakTopics.slice(0, 3).join(", ")}`);
  if (blendedAccuracy < 0.7) actions.push("Rifai il quiz in modalità pratica con feedback immediato.");
  if (oralAvg !== null && oralAvg < 0.6) actions.push("Allenati con l'interrogazione orale sui temi deboli.");
  if (strongTopics.length) actions.push(`Consolida i punti forti: ${strongTopics.slice(0, 2).join(", ")}.`);
  if (!actions.length) actions.push("Continua con flashcard e simulazione esame.");

  return {
    weakTopics,
    strongTopics,
    rischioBocciatura,
    probabilitaSuccesso,
    summary,
    actions,
  };
}

export function gapRiskLabel(risk: GapAnalysisResult["rischioBocciatura"]): string {
  const labels: Record<GapAnalysisResult["rischioBocciatura"], string> = {
    basso: "Basso",
    medio: "Medio",
    alto: "Alto",
    critico: "Critico",
  };
  return labels[risk];
}
