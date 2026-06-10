import { GraduationCap, Trophy, TrendingUp, BookOpen, Award } from "lucide-react";
import { getStudyLearningMetrics } from "@/lib/study-project-storage";
import { achievementById } from "@/lib/study-achievements";

export function LearningDashboard() {
  const metrics = getStudyLearningMetrics();

  return (
    <section className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300/90">Learning Dashboard</p>
        <h2 className="text-xl font-bold text-white">Il tuo percorso di apprendimento</h2>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MetricCard icon={BookOpen} label="Sessioni" value={String(metrics.sessions)} />
        <MetricCard icon={Trophy} label="Punteggio medio" value={metrics.avgScore ? `${metrics.avgScore}/100` : "—"} />
        <MetricCard icon={TrendingUp} label="Livello" value={metrics.level} />
        <MetricCard icon={GraduationCap} label="Materie" value={String(metrics.subjects.length)} />
      </div>

      {metrics.badges.length > 0 && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/8 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-100">
            <Award className="h-4 w-4" /> Badge ottenuti
          </p>
          <div className="flex flex-wrap gap-2">
            {metrics.badges.map((id) => {
              const badge = achievementById(id);
              return (
                <span key={id} className="rounded-full border border-amber-300/25 bg-black/20 px-3 py-1 text-xs font-semibold text-amber-100">
                  {badge ? `${badge.emoji} ${badge.label}` : id}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {metrics.attempts.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="mb-2 text-sm font-semibold text-white">Storico verifiche</p>
          <ul className="space-y-2 text-xs text-white/70">
            {metrics.attempts.map((a, i) => (
              <li key={i} className="flex justify-between gap-2 border-b border-white/8 pb-2 last:border-0">
                <span>{new Date(a.completedAt).toLocaleDateString()}</span>
                <span className="font-semibold tabular-nums text-emerald-200">{a.score}/100 · {a.mode}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <Icon className="h-4 w-4 text-emerald-300/80" />
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-white/45">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-white">{value}</p>
    </div>
  );
}
