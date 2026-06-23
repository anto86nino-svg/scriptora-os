import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, FolderOpen, Loader2, PenLine, Sparkles } from "lucide-react";
import { OsShell } from "@/components/os/OsShell";
import { DashboardPackagingRow } from "@/components/one-flow/DashboardPackagingRow";
import type { DashboardActionContext } from "@/lib/one-flow/dashboard-home-actions";
import { getToolRoute } from "@/lib/one-flow/tool-registry";
import { isProjectComplete } from "@/lib/project-status";
import { loadProjects } from "@/services/storageService";
import { getLastProjectId, setLastProjectId } from "@/lib/storage";
import type { ActiveDashboardTool } from "@/lib/one-flow/dashboard-active-tool";
import type { BookProject } from "@/types/book";

type PublishingRouteState = {
  projectId?: string;
};

function resolveProject(projects: BookProject[], requestedProjectId?: string | null): BookProject | null {
  const lastProjectId = getLastProjectId();
  return (
    (requestedProjectId ? projects.find((project) => project.id === requestedProjectId) : null) ||
    (lastProjectId ? projects.find((project) => project.id === lastProjectId) : null) ||
    projects.find(isProjectComplete) ||
    projects[0] ||
    null
  );
}
export default function PublishingOsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as PublishingRouteState | null;
  const [projects, setProjects] = useState<BookProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(routeState?.projectId || null);

  useEffect(() => {
    let cancelled = false;
    loadProjects((remoteProjects) => {
      if (!cancelled) setProjects(remoteProjects);
    })
      .then((loadedProjects) => {
        if (!cancelled) setProjects(loadedProjects);
      })
      .catch(() => {
        if (!cancelled) setProjects([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeProject = useMemo(
    () => resolveProject(projects, selectedProjectId || routeState?.projectId),
    [projects, routeState?.projectId, selectedProjectId],
  );

  useEffect(() => {
    if (activeProject?.id) {
      setLastProjectId(activeProject.id);
      setSelectedProjectId(activeProject.id);
    }
  }, [activeProject?.id]);

  const openWriter = () => {
    if (activeProject?.id) {
      sessionStorage.setItem("scriptora-open-project", activeProject.id);
    }
    navigate(getToolRoute("writer"));
  };

  const navigateWithProject = (path: string, state?: Record<string, unknown>) => {
    if (activeProject?.id) setLastProjectId(activeProject.id);
    navigate(path, {
      state: {
        ...state,
        ...(activeProject?.id ? { projectId: activeProject.id } : {}),
      },
    });
  };

  const actionContext = useMemo<DashboardActionContext>(() => ({
    hasActiveBook: Boolean(activeProject),
    hasCompletedBook: Boolean(activeProject && isProjectComplete(activeProject)),
    activeProject,
    closeAllTools: () => {},
    openTool: (tool: ActiveDashboardTool) => {
      if (tool === "projects") {
        navigate("/dashboard", { state: { openProjects: true } });
        return;
      }
      if (tool === "book-forge") {
        navigate("/dashboard", { state: { openForge: true } });
        return;
      }
      navigate("/dashboard", { state: { openAdvancedTools: true } });
    },
    onNewBook: () => navigate("/dashboard", { state: { openForge: true } }),
    onContinue: openWriter,
    onOpenCover: () => navigateWithProject(getToolRoute("cover")),
    onNavigate: navigateWithProject,
  }), [activeProject, navigate]);

  if (loading) {
    return (
      <OsShell title="Publishing Center" subtitle="Readiness, cover, export e KDP in un solo cockpit" badge="Pubblicazione" accent="publishing">
        <div className="grid min-h-[48dvh] place-items-center text-center">
          <div>
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-amber-200" />
            <p className="mt-3 text-sm text-muted-foreground">Carico il libro attivo e lo stato pubblicazione...</p>
          </div>
        </div>
      </OsShell>
    );
  }

  if (!activeProject) {
    return (
      <OsShell title="Publishing Center" subtitle="Il centro pubblicazione si attiva sul libro attivo" badge="Pubblicazione" accent="publishing">
        <div className="mx-auto max-w-2xl rounded-2xl border border-amber-300/20 bg-amber-400/[0.07] p-6 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-amber-200" />
          <h2 className="mt-4 text-xl font-black text-white">Nessun libro da pubblicare</h2>
          <p className="mt-2 text-sm leading-6 text-white/58">
            Crea un libro con il flusso di creazione libro o apri un progetto esistente: da qui il flusso continua verso cover, export, KDP e pubblicazione.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => navigate("/dashboard", { state: { openForge: true } })}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-200"
            >
              <Sparkles className="h-4 w-4" />
              Crea nuovo libro
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard", { state: { openProjects: true } })}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white/78"
            >
              <FolderOpen className="h-4 w-4" />
              I miei libri
            </button>
          </div>
        </div>
      </OsShell>
    );
  }

  return (
    <OsShell
      title="Publishing Center"
      subtitle="Titolo, keyword, radar, cover, export e KDP nello stesso percorso"
      badge="Pubblicazione"
      accent="publishing"
      actions={
        <button
          type="button"
          onClick={openWriter}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-400/10 px-3 text-xs font-bold text-amber-50 hover:bg-amber-400/15"
        >
          <PenLine className="h-4 w-4" />
          Writer
        </button>
      }
    >
      <section className="mb-4 rounded-2xl border border-amber-300/20 bg-amber-400/[0.06] p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/70">
              Percorso unico autore → pubblicazione
            </p>
            <h2 className="mt-1 truncate text-2xl font-black text-white">{activeProject.config.title || "Libro senza titolo"}</h2>
            <p className="mt-1 text-sm leading-6 text-white/56">
              IDEA → BOOK FORGE → BLUEPRINT → WRITER → COVER → EXPORT → KDP → PUBBLICAZIONE
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {projects.length > 1 && (
              <label className="min-w-[220px]">
                <span className="sr-only">Libro attivo</span>
                <select
                  value={activeProject.id}
                  onChange={(event) => setSelectedProjectId(event.target.value)}
                  className="h-10 w-full rounded-xl border border-white/10 bg-black/35 px-3 text-sm font-semibold text-white outline-none"
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id} className="bg-slate-950 text-white">
                      {project.config.title || "Libro senza titolo"}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              onClick={openWriter}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 text-sm font-black text-slate-950 hover:bg-amber-200"
            >
              <BookOpen className="h-4 w-4" />
              Apri manoscritto
            </button>
          </div>
        </div>
      </section>

      <DashboardPackagingRow projectTitle={activeProject.config.title} context={actionContext} />

      <section className="rounded-2xl border border-amber-300/20 bg-black/24 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-white">Prossima destinazione</p>
            <p className="mt-1 text-xs leading-5 text-white/52">
              Quando readiness e checklist sono pronte, esporta i file finali e completa KDP senza cambiare contesto.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigateWithProject(getToolRoute("export"))}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-amber-300/25 bg-amber-400/10 px-4 text-sm font-black text-amber-50 hover:bg-amber-400/15"
          >
            Vai a Export
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </OsShell>
  );
}
