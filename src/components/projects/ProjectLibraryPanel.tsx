import { useMemo, useState } from "react";
import { ArrowRight, Search, Trash2 } from "lucide-react";
import type { BookProject } from "@/types/book";
import {
  filterProjectsByLibraryTab,
  formatProjectUpdatedAt,
  getProjectContinuityStatus,
  getProjectHumanStatus,
  type ProjectLibraryFilter,
} from "@/lib/project-continuity";

interface ProjectLibraryPanelProps {
  projects: BookProject[];
  onOpen: (projectId: string) => void;
  onDelete: (projectId: string) => void;
  onNewBook: () => void;
  onNavigate: (path: string, state?: Record<string, unknown>) => void;
}

const TABS: { id: ProjectLibraryFilter; label: string }[] = [
  { id: "all", label: "Tutti" },
  { id: "blueprint_ready", label: "Blueprint pronti" },
  { id: "writing_locked", label: "Da sbloccare" },
  { id: "writing_in_progress", label: "In scrittura" },
  { id: "manuscript_ready", label: "Manoscritti pronti" },
  { id: "publishing_ready", label: "Pubblicazione/Export" },
];

function ctaForProject(project: BookProject): string {
  const status = getProjectContinuityStatus(project);
  if (status === "draft_config") return "Completa configurazione";
  if (status === "writing_locked") return "Sblocca scrittura";
  if (status === "writing_unlocked") return "Scrivi capitoli";
  if (status === "writing_in_progress") return "Riprendi scrittura";
  if (status === "manuscript_ready") return "Apri manoscritto";
  if (status === "publishing_ready") return "Vai a pubblicazione";
  return "Apri Blueprint";
}

export function ProjectLibraryPanel({
  projects,
  onOpen,
  onDelete,
  onNewBook,
  onNavigate,
}: ProjectLibraryPanelProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ProjectLibraryFilter>("all");

  const filtered = useMemo(() => {
    const byTab = filterProjectsByLibraryTab(projects, filter);
    const q = query.trim().toLowerCase();
    if (!q) return byTab;
    return byTab.filter((project) => {
      const blob = [
        project.config.title,
        project.config.subtitle,
        project.config.genre,
        project.config.language,
        project.config.category,
        project.config.subcategory,
      ].join(" ").toLowerCase();
      return blob.includes(q);
    });
  }, [filter, projects, query]);

  if (projects.length === 0) {
    return (
      <div className="space-y-4 py-8 text-center">
        <p className="text-sm text-muted-foreground/70">Non hai ancora progetti salvati.</p>
        <button
          type="button"
          onClick={onNewBook}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Apri Book Forge
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
        <Search className="h-4 w-4 text-white/45" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cerca titolo, genere, lingua..."
          className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/35"
        />
      </label>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={[
              "shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition",
              filter === tab.id
                ? "bg-white text-slate-950"
                : "border border-white/10 bg-white/[0.04] text-white/65 hover:text-white",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-h-[64dvh] space-y-2 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-muted-foreground">
            Nessun progetto in questo filtro.
          </p>
        ) : (
          filtered.map((project) => {
            const status = getProjectContinuityStatus(project);
            const unlocked = (project as any).writingUnlockStatus === "unlocked";
            const isFreePreview = (project as any).scriptoraProjectMeta?.blueprintPreview === true;
            return (
              <div
                key={project.id}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:bg-white/[0.06]"
              >
                <div className="flex items-start justify-between gap-3">
                  <button type="button" onClick={() => onOpen(project.id)} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-semibold text-foreground">{project.config.title || "Progetto senza titolo"}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {project.config.subtitle || project.blueprint?.overview || "Blueprint e configurazione salvati."}
                    </p>
                    <p className="mt-2 text-[11px] text-muted-foreground/75">
                      {project.config.genre} · {project.config.language} · {formatProjectUpdatedAt(project.updatedAt)}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(project.id)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Elimina progetto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-white/75">
                    {getProjectHumanStatus(project)}
                  </span>
                  {isFreePreview && (
                    <span className="rounded-full border border-sky-300/25 bg-sky-300/10 px-2.5 py-1 text-[11px] text-sky-100">
                      Free Blueprint
                    </span>
                  )}
                  {unlocked && (
                    <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-[11px] text-emerald-100">
                      Sbloccato
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      if (status === "writing_locked") {
                        onNavigate("/usage?focus=pay-per-project", { projectId: project.id });
                        return;
                      }
                      if (status === "publishing_ready" || status === "manuscript_ready") {
                        onNavigate("/publishing", { projectId: project.id });
                        return;
                      }
                      onOpen(project.id);
                    }}
                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-white px-3 text-sm font-bold text-slate-950 hover:opacity-90"
                  >
                    {ctaForProject(project)}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
