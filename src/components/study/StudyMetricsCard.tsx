import { Brain, Clock, Target, Zap } from "lucide-react";
import type { StudySessionResult } from "@/lib/study-session";
import { computeStudyWowMetrics } from "@/lib/study-ux";

interface StudyMetricsCardProps {
  result: StudySessionResult;
  aiMode: "idle" | "deepseek" | "local";
}

export function StudyMetricsCard({ result, aiMode }: StudyMetricsCardProps) {
  const metrics = computeStudyWowMetrics(result);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/80">Analisi intelligente</p>
        <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold text-emerald-100">
          Motore: {aiMode === "local" ? "Analisi locale" : "Scriptora AI"}
        </span>
      </div>
      <h2 className="mt-1 text-xl font-semibold text-foreground">{result.title}</h2>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <MetricPill icon={<Zap className="h-4 w-4" />} label="Difficoltà studio" value={`${metrics.studyDifficulty}/10`} />
        <MetricPill icon={<Clock className="h-4 w-4" />} label="Tempo stimato" value={`${metrics.estimatedMinutes} min`} />
        <MetricPill icon={<Target className="h-4 w-4" />} label="Previsione" value={metrics.difficultyPrediction} />
        <MetricPill icon={<Brain className="h-4 w-4" />} label="Strategia" value={metrics.suggestedStrategy} />
      </div>

      {metrics.difficultConcepts.length > 0 && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-background/45 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-200/80">Concetti più difficili</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {metrics.difficultConcepts.map((concept) => (
              <span
                key={concept}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-muted-foreground"
              >
                {concept}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <MiniStat label="Parole" value={Number(result.words || 0).toLocaleString()} />
        <MiniStat label="Tema" value={result.detectedSubject || "Studio"} />
        <MiniStat label="Livello" value={(result.difficulty || "medium").toUpperCase()} />
      </div>
    </div>
  );
}

function MetricPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-background/45 p-3">
      <div className="mb-1 text-emerald-200">{icon}</div>
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
