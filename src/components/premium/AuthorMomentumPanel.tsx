import { Flame, Trophy, Target, Sparkles } from "lucide-react";
import type { BookProject } from "@/types/book";

interface AuthorMomentumPanelProps {
  lastProject: BookProject | null;
  progressPercent: number;
  onOpenProject: () => void;
}

const MILESTONES = [
  { at: 25, label: "Prima scintilla", icon: Sparkles },
  { at: 50, label: "Metà strada", icon: Target },
  { at: 75, label: "Quasi finito", icon: Flame },
  { at: 100, label: "Manoscritto completo", icon: Trophy },
];

export function AuthorMomentumPanel({ lastProject, progressPercent, onOpenProject }: AuthorMomentumPanelProps) {
  if (!lastProject) return null;

  const remaining = Math.max(0, 100 - progressPercent);
  const nextMilestone = MILESTONES.find((m) => progressPercent < m.at) || MILESTONES[MILESTONES.length - 1];
  const achieved = MILESTONES.filter((m) => progressPercent >= m.at);

  return (
    <section className="ios-panel border-white/12 bg-slate-950/28 p-4 backdrop-blur-xl sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Momentum autore</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            Sei al <span className="text-primary">{progressPercent}%</span> del tuo libro
          </p>
          {remaining > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Ancora <span className="font-medium text-foreground">{remaining}%</span> per completare — prossimo traguardo: {nextMilestone.label}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onOpenProject}
          className="ios-toolbar-button h-9 px-3 text-xs font-medium"
        >
          Mantieni il ritmo
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {MILESTONES.map((m) => {
          const done = progressPercent >= m.at;
          const Icon = m.icon;
          return (
            <div
              key={m.at}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium ${
                done
                  ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-200"
                  : "border-white/10 bg-white/[0.04] text-muted-foreground"
              }`}
            >
              <Icon className="h-3 w-3" />
              {m.label}
            </div>
          );
        })}
      </div>

      {achieved.length > 0 && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          {achieved.length} traguard{achieved.length === 1 ? "o" : "i"} raggiunt{achieved.length === 1 ? "o" : "i"} — continua così.
        </p>
      )}
    </section>
  );
}
