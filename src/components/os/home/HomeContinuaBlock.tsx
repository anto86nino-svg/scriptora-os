import { ArrowRight, PenLine } from "lucide-react";
import type { BookProject } from "@/types/book";
import { formatProjectUpdatedAt } from "@/lib/project-continuity";
import { getActiveChapterLabel } from "@/lib/os/home-project-categories";

type Props = {
  project: BookProject | null | undefined;
  progressPercent: number;
  onContinue: () => void;
  onNewBook: () => void;
};

export function HomeContinuaBlock({ project, progressPercent, onContinue, onNewBook }: Props) {
  const title = project?.config?.title?.trim() || "Nessun libro attivo";
  const chapterLabel = getActiveChapterLabel(project);
  const lastAccess = project ? formatProjectUpdatedAt(project.updatedAt) : null;

  return (
    <section
      aria-labelledby="home-continua-title"
      className="rounded-[1.5rem] bg-white/[0.04] p-5 sm:p-6"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Continua</p>
      <h2 id="home-continua-title" className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
        {title}
      </h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Avanzamento" value={`${progressPercent}%`} />
        <Metric label="Capitolo attuale" value={chapterLabel} small />
        <Metric label="Ultimo accesso" value={lastAccess || "—"} small />
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[rgb(var(--scriptora-visual-primary))] to-[rgb(var(--scriptora-visual-accent))] transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <button
        type="button"
        onClick={project ? onContinue : onNewBook}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-black uppercase tracking-[0.06em] text-slate-950 shadow-[0_12px_32px_rgba(14,165,233,0.22)] transition hover:-translate-y-0.5 sm:w-auto sm:px-6"
      >
        <PenLine className="h-4 w-4" />
        {project ? "Continua a scrivere" : "Crea nuovo libro"}
        <ArrowRight className="h-4 w-4" />
      </button>
    </section>
  );
}

function Metric({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-xl bg-white/[0.03] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{label}</p>
      <p className={`mt-0.5 font-semibold text-white ${small ? "text-xs leading-5" : "text-base tabular-nums"}`}>
        {value}
      </p>
    </div>
  );
}
