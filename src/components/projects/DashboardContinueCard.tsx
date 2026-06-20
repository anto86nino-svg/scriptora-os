import { ArrowRight, FolderOpen, PenLine } from "lucide-react";
import type { BookProject } from "@/types/book";
import {
  formatProjectUpdatedAt,
  getProjectHumanStatus,
  summarizeProjectLibrary,
} from "@/lib/project-continuity";

interface DashboardContinueCardProps {
  projects: BookProject[];
  lastProject?: BookProject | null;
  onContinue: (projectId: string) => void;
  onOpenProjects: () => void;
}

export function DashboardContinueCard({
  projects,
  lastProject,
  onContinue,
  onOpenProjects,
}: DashboardContinueCardProps) {
  const summary = summarizeProjectLibrary(projects);
  if (summary.total === 0) return null;
  const projectLabel = summary.total === 1 ? "progetto salvato" : "progetti salvati";

  return (
    <section className="mb-5 rounded-2xl border border-amber-300/18 bg-[linear-gradient(135deg,rgba(251,191,36,0.10),rgba(255,255,255,0.035)_42%,rgba(14,165,233,0.06))] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/85">Continua</p>
          <h2 className="mt-1 text-xl font-bold text-white">
            Hai {summary.total} {projectLabel}, {summary.blueprintReady + summary.writingLocked + summary.writingUnlocked} Blueprint pronti e {summary.writingInProgress} manoscritti in corso.
          </h2>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/65">
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1">{summary.manuscriptReady} manoscritti pronti</span>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1">{summary.publishingReady} pronti per pubblicazione</span>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1">{summary.writingLocked} da sbloccare</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
          {lastProject && (
            <button
              type="button"
              onClick={() => onContinue(lastProject.id)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:opacity-90"
            >
              <PenLine className="h-4 w-4 text-amber-600" />
              Riprendi ultimo
            </button>
          )}
          <button
            type="button"
            onClick={onOpenProjects}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.10]"
          >
            <FolderOpen className="h-4 w-4" />
            Apri i miei progetti
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {lastProject && (
        <button
          type="button"
          onClick={() => onContinue(lastProject.id)}
          className="mt-4 flex w-full items-center justify-between gap-3 rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-3 text-left transition hover:bg-amber-300/15"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{lastProject.config.title || "Progetto senza titolo"}</p>
            <p className="mt-0.5 text-xs text-white/55">
              {getProjectHumanStatus(lastProject)} · {formatProjectUpdatedAt(lastProject.updatedAt)}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-amber-200" />
        </button>
      )}
    </section>
  );
}
