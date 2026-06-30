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
      className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-[0_16px_48px_rgba(15,23,42,0.07)] sm:p-6"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700/65">Continua</p>
      <h2 id="home-continua-title" className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
        {title}
      </h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Avanzamento" value={`${progressPercent}%`} />
        <Metric label="Capitolo attuale" value={chapterLabel} small />
        <Metric label="Ultimo accesso" value={lastAccess || "—"} small />
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-stone-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-300 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <button
        type="button"
        onClick={project ? onContinue : onNewBook}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black uppercase tracking-[0.06em] text-white shadow-[0_12px_32px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-emerald-950 sm:w-auto sm:px-6"
      >
        <PenLine className="h-4 w-4" />
        Continua a scrivere
        <ArrowRight className="h-4 w-4" />
      </button>
    </section>
  );
}

function Metric({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-0.5 font-semibold text-slate-900 ${small ? "text-xs leading-5" : "text-base tabular-nums"}`}>
        {value}
      </p>
    </div>
  );
}
