import { Activity, Target } from "lucide-react";
import type { StudyAnswerEvaluation } from "@/lib/study-answer-evaluator";
import type { StudySessionResult } from "@/lib/study-session";
import { getStudyLearningMetrics } from "@/lib/study-project-storage";
import { computeUserPerformanceLevel, type FlashcardConfidence } from "@/lib/study-ux";

interface StudyProgressPanelProps {
  result: StudySessionResult;
  projectId?: string;
  quizAnswers: Record<number, number>;
  openEvaluations: Record<number, StudyAnswerEvaluation>;
  flashcardConfidence: Record<number, FlashcardConfidence>;
}

function MetricBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-background/45 p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

export function StudyProgressPanel({
  result,
  projectId,
  quizAnswers,
  openEvaluations,
  flashcardConfidence,
}: StudyProgressPanelProps) {
  const metrics = getStudyLearningMetrics();
  const performance = computeUserPerformanceLevel({
    quiz: result.quiz || [],
    quizAnswers,
    openEvaluations,
    flashcardConfidence,
  });
  const answered = Object.keys(quizAnswers).length;
  const currentCorrect = (result.quiz || []).filter((q, index) => quizAnswers[index] === q.answer).length;
  const currentScore = answered ? Math.round((currentCorrect / answered) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-200" />
          <h3 className="font-semibold">Dashboard progressi</h3>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricBox label="Ore studiate" value={metrics.hoursStudied} />
          <MetricBox label="Sessioni" value={metrics.sessions} />
          <MetricBox label="Media voti" value={`${metrics.avgScore}/100`} />
          <MetricBox label="Streak" value={`${metrics.streak} giorni`} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricBox label="Sessioni completate" value={metrics.completedSessions} />
          <MetricBox label="Materie" value={metrics.subjects.length} />
          <MetricBox label="Andamento" value={metrics.trend > 0 ? `+${metrics.trend}` : metrics.trend} />
          <MetricBox label="Sessione attuale" value={projectId ? "Salvata" : "Non salvata"} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-200" />
            <h3 className="font-semibold">Prestazione corrente</h3>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <MetricBox label="Quiz risposti" value={answered} />
            <MetricBox label="Score parziale" value={`${currentScore}/100`} />
            <MetricBox label="Profilo" value={performance} />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <h3 className="font-semibold">Punti forti e deboli</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100">Forti</p>
              <ul className="mt-2 space-y-1 text-sm text-emerald-50/90">
                {(metrics.strongPoints.length ? metrics.strongPoints : result.keyConcepts.slice(0, 3)).map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-100">Da rinforzare</p>
              <ul className="mt-2 space-y-1 text-sm text-amber-50/90">
                {(metrics.weakPoints.length ? metrics.weakPoints : result.keyConcepts.slice(3, 6)).map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
