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
      className="scriptora-home-card rounded-[1.5rem] p-5 sm:p-6"
    >
      <p className="scriptora-home-eyebrow">Continua</p>
      <h2 id="home-continua-title" className="mt-1 text-2xl font-black tracking-tight text-[#1a1209] sm:text-3xl">
        {title}
      </h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Avanzamento" value={`${progressPercent}%`} />
        <Metric label="Capitolo attuale" value={chapterLabel} small />
        <Metric label="Ultimo accesso" value={lastAccess || "—"} small />
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#e8dcc8]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#8b5a2b] to-[#f2c400] transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <button
        type="button"
        onClick={project ? onContinue : onNewBook}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2c1810] px-4 text-sm font-black uppercase tracking-[0.06em] text-[#faf6ee] shadow-[0_12px_32px_rgba(26,18,9,0.22)] transition hover:-translate-y-0.5 hover:bg-[#3d2618] sm:w-auto sm:px-6"
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
    <div className="rounded-xl border border-[#d9c9b0] bg-[#faf6ee]/80 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8b7355]">{label}</p>
      <p className={`mt-0.5 font-semibold text-[#1a1209] ${small ? "text-xs leading-5" : "text-base tabular-nums"}`}>
        {value}
      </p>
    </div>
  );
}
