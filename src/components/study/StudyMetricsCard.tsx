import { Brain, Check, Clock, X } from "lucide-react";
import type { StudySessionResult } from "@/lib/study-session";
import { computeStudyCoachMetrics, computeUserPerformanceLevel, sanitizeStudyText } from "@/lib/study-ux";

interface StudyMetricsCardProps {
  result: StudySessionResult;
  aiMode: "idle" | "deepseek" | "local";
  quizAnswers?: Record<number, number>;
  openEvaluations?: Record<number, { score?: number }>;
  flashcardConfidence?: Record<number, string>;
}

export function StudyMetricsCard({
  result,
  aiMode,
  quizAnswers = {},
  openEvaluations = {},
  flashcardConfidence = {},
}: StudyMetricsCardProps) {
  const performance = computeUserPerformanceLevel({
    quiz: result.quiz || [],
    quizAnswers,
    openEvaluations,
    flashcardConfidence: flashcardConfidence as Record<number, "unknown" | "almost" | "known">,
  });

  const coach = computeStudyCoachMetrics(result, performance);

  return (
    <div className="study-card-enter rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/80">Il tuo coach di studio</p>
        <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold text-emerald-100">
          {aiMode === "local" ? "Analisi locale" : "Scriptora AI"}
        </span>
      </div>
      <h2 className="mt-1 text-xl font-semibold text-foreground">{sanitizeStudyText(result.title)}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{coach.coachMessage}</p>

      <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/5 p-3">
        <p className="text-sm font-bold text-emerald-100">🎯 La tua strategia di studio</p>
        <p className="mt-1 text-xs text-muted-foreground">{coach.topicType}</p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-emerald-200/80">Concentrati su</p>
            <ul className="mt-1.5 space-y-1">
              {coach.focusOn.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-rose-200/80">Evita</p>
            <ul className="mt-1.5 space-y-1">
              {coach.avoid.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <X className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <StatPill icon={<Clock className="h-4 w-4" />} label="Tempo stimato" value={`${coach.estimatedMinutes} min`} />
        <StatPill icon={<Brain className="h-4 w-4" />} label="Difficoltà" value={`${coach.studyDifficulty}/10`} />
        <StatPill label="Previsione" value={coach.difficultyPrediction} />
      </div>

      {coach.difficultConcepts.length > 0 && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-background/45 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-200/80">Concetti più difficili</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {coach.difficultConcepts.map((concept) => (
              <span key={concept} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-muted-foreground">
                {concept}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <MiniStat label="Parole" value={Number(result.words || 0).toLocaleString()} />
        <MiniStat label="Tema" value={sanitizeStudyText(result.detectedSubject || "Studio")} />
        <MiniStat label="Livello" value={(result.difficulty || "medium").toUpperCase()} />
      </div>
    </div>
  );
}

function StatPill({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-background/45 p-3">
      {icon && <div className="mb-1 text-emerald-200">{icon}</div>}
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-background/45 p-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
