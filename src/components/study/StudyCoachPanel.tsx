import { CalendarDays, Compass } from "lucide-react";
import type { StudyAnswerEvaluation } from "@/lib/study-answer-evaluator";
import type { StudySessionResult } from "@/lib/study-session";
import {
  buildAdaptiveCoachSnapshot,
  buildStudyCoachPlans,
  computeStudyCoachMetrics,
  computeUserPerformanceLevel,
  type FlashcardConfidence,
} from "@/lib/study-ux";

interface StudyCoachPanelProps {
  result: StudySessionResult;
  quizAnswers: Record<number, number>;
  openEvaluations: Record<number, StudyAnswerEvaluation>;
  flashcardConfidence: Record<number, FlashcardConfidence>;
}

export function StudyCoachPanel({
  result,
  quizAnswers,
  openEvaluations,
  flashcardConfidence,
}: StudyCoachPanelProps) {
  const performance = computeUserPerformanceLevel({
    quiz: result.quiz || [],
    quizAnswers,
    openEvaluations,
    flashcardConfidence,
  });
  const metrics = computeStudyCoachMetrics(result, performance);
  const adaptive = buildAdaptiveCoachSnapshot({ result, quizAnswers, openEvaluations, flashcardConfidence });
  const plans = buildStudyCoachPlans({ result, quizAnswers, openEvaluations, flashcardConfidence });

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-emerald-200" />
          <h3 className="font-semibold">Coach reale</h3>
        </div>
        <p className="mt-3 text-sm leading-6 text-foreground/85">{metrics.coachMessage}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-background/45 p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Difficolta</p>
            <p className="mt-1 font-bold">{metrics.studyDifficulty}/10 · {metrics.difficultyPrediction}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-background/45 p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tempo</p>
            <p className="mt-1 font-bold">{metrics.estimatedMinutes} min</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-background/45 p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Profilo</p>
            <p className="mt-1 font-bold">{performance}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-background/45 p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Probabilita esame</p>
            <p className="mt-1 font-bold">{adaptive.estimatedPassProbability}%</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100">Prossima azione</p>
          <p className="mt-2 text-sm leading-6 text-emerald-50/90">{adaptive.nextAction}</p>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100">Cosa fare</p>
            <ul className="mt-2 space-y-1 text-sm text-emerald-50/90">
              {metrics.focusOn.map((item) => <li key={item}>- {item}</li>)}
            </ul>
          </div>
          <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-100">Cosa evitare</p>
            <ul className="mt-2 space-y-1 text-sm text-amber-50/90">
              {metrics.avoid.map((item) => <li key={item}>- {item}</li>)}
            </ul>
          </div>
        </div>
      </div>

      {adaptive.knowledgeMap.length > 0 && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <h3 className="font-semibold">Mappa della conoscenza</h3>
          <p className="mt-1 text-xs text-muted-foreground">Aggiornata da quiz, flashcard e interrogazione.</p>
          <div className="mt-4 grid gap-3">
            {adaptive.knowledgeMap.map((area) => (
              <div key={area.concept} className="rounded-2xl border border-white/10 bg-background/45 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-foreground">{area.concept}</p>
                  <span className={[
                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]",
                    area.status === "strong" ? "bg-emerald-400/15 text-emerald-100"
                      : area.status === "medium" ? "bg-amber-400/15 text-amber-100"
                        : "bg-rose-400/15 text-rose-100",
                  ].join(" ")}>
                    {area.mastery}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={area.status === "strong" ? "h-full rounded-full bg-emerald-300" : area.status === "medium" ? "h-full rounded-full bg-amber-300" : "h-full rounded-full bg-rose-300"}
                    style={{ width: `${area.mastery}%` }}
                  />
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{area.reason}</p>
                <p className="mt-1 text-xs leading-5 text-emerald-100/80">{area.nextAction}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {plans.map((plan) => (
        <div key={plan.title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-emerald-200" />
            <h3 className="font-semibold">{plan.title}</h3>
          </div>
          <div className="mt-3 grid gap-3">
            {plan.days.map((day) => (
              <div key={`${plan.title}-${day.day}`} className="rounded-2xl border border-white/10 bg-background/45 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold">{day.day} · {day.focus}</p>
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-muted-foreground">
                    {day.minutes} min
                  </span>
                </div>
                <ul className="mt-2 space-y-1 text-sm leading-6 text-muted-foreground">
                  {day.tasks.map((task) => <li key={task}>- {task}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
