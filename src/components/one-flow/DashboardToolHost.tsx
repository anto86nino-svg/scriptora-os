import { FolderOpen, Sparkles, Trash2 } from "lucide-react";
import type { BookProject } from "@/types/book";
import { isProjectComplete } from "@/lib/project-status";
import { t, tt } from "@/lib/i18n";
import { getBookTypeLabel } from "@/components/BookTypeBadge";
import { LibrarySection } from "@/components/Home/LibrarySection";
import { DedicatedToolScreen } from "@/components/one-flow/DedicatedToolScreen";
import { SafeDashboardToolBoundary } from "@/components/one-flow/SafeDashboardToolBoundary";
import { DashboardIdeaPreviewPanel } from "@/components/one-flow/DashboardIdeaPreviewPanel";
import { DashboardAdvancedToolsPanel } from "@/components/one-flow/DashboardAdvancedToolsPanel";
import type { ActiveDashboardTool } from "@/lib/one-flow/dashboard-active-tool";
import type { DashboardActionContext } from "@/lib/one-flow/dashboard-home-actions";
import type { IdeaPreviewPanelProps } from "@/components/one-flow/DashboardIdeaPreviewPanel";

const TOOL_LABELS: Record<Exclude<ActiveDashboardTool, null>, string> = {
  projects: "I miei libri",
  library: "Libreria",
  export: "Export Studio",
  "author-identity": "Identità autore",
  "character-studio": "Character Studio",
  notepad: "Block Notes",
  "title-intelligence": "Title Intelligence",
  "idea-preview": "Anteprima idea",
  "manuscript-lab": "Manuscript Lab",
  "book-forge": "Book Forge",
  "advanced-tools": "Strumenti avanzati",
};

export type DashboardToolHostProps = {
  activeTool: ActiveDashboardTool;
  onClose: () => void;
  projects: BookProject[];
  draftProjects: BookProject[];
  onDeleteProject: (id: string) => void;
  onGoApp: (opts?: { section?: string; projectId?: string }) => void;
  onOpenNewBook: () => void;
  onNavigate: (path: string) => void;
  ideaPreview: IdeaPreviewPanelProps;
  dashboardActionContext: DashboardActionContext;
};

export function DashboardToolHost({
  activeTool,
  onClose,
  projects,
  draftProjects,
  onDeleteProject,
  onGoApp,
  onOpenNewBook,
  onNavigate,
  ideaPreview,
  dashboardActionContext,
}: DashboardToolHostProps) {
  if (!activeTool || activeTool === "book-forge") return null;

  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeDrafts = Array.isArray(draftProjects) ? draftProjects : [];
  const toolLabel = TOOL_LABELS[activeTool];

  switch (activeTool) {
    case "projects":
      return (
        <DedicatedToolScreen
          open
          title="I miei libri"
          description={tt("my_projects_drafts", { count: safeDrafts.length })}
          onClose={onClose}
          maxWidthClass="max-w-2xl"
        >
          <SafeDashboardToolBoundary toolLabel={toolLabel} onClose={onClose}>
            {safeDrafts.length === 0 ? (
              <div className="space-y-4 py-6 text-center">
                <p className="text-sm text-muted-foreground/70">{t("no_drafts_library_hint")}</p>
                <button
                  type="button"
                  onClick={() => { onClose(); onOpenNewBook(); }}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  <Sparkles className="h-4 w-4" />
                  Book Forge
                </button>
              </div>
            ) : (
              <div className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03]">
                {safeDrafts.map((p) => (
                  <div
                    key={p.id}
                    className="group flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-white/[0.07] hover:text-foreground"
                    onClick={() => { onClose(); onGoApp({ projectId: p.id }); }}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.config.title || t("untitled")}</span>
                      <span className="text-[10px] text-muted-foreground/70">
                        {getBookTypeLabel(p.config) || p.config.genre} · {p.chapters?.length || 0} ch · {isProjectComplete(p) ? "complete" : p.phase}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDeleteProject(p.id); }}
                      className="rounded-md p-1 text-muted-foreground opacity-70 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SafeDashboardToolBoundary>
        </DedicatedToolScreen>
      );

    case "library":
      return (
        <DedicatedToolScreen
          open
          title={t("library")}
          description="Libri completati e pronti per export o pubblicazione."
          onClose={onClose}
          maxWidthClass="max-w-2xl"
        >
          <SafeDashboardToolBoundary toolLabel={toolLabel} onClose={onClose}>
            <LibrarySection
              projects={safeProjects}
              onOpen={(id) => { onClose(); onGoApp({ projectId: id }); }}
              onDelete={onDeleteProject}
              onExport={() => { onClose(); onNavigate("/export-studio"); }}
            />
          </SafeDashboardToolBoundary>
        </DedicatedToolScreen>
      );

    case "idea-preview":
      return (
        <DedicatedToolScreen
          open
          title="Anteprima idea"
          description="Esplora un'idea prima di Book Forge."
          onClose={onClose}
          maxWidthClass="max-w-xl"
        >
          <SafeDashboardToolBoundary toolLabel={toolLabel} onClose={onClose}>
            <DashboardIdeaPreviewPanel {...ideaPreview} onClose={onClose} />
          </SafeDashboardToolBoundary>
        </DedicatedToolScreen>
      );

    case "advanced-tools":
      return (
        <DedicatedToolScreen
          open
          title="Strumenti avanzati"
          description="Ogni strumento apre una pagina dedicata — la Dashboard resta compatta."
          onClose={onClose}
          maxWidthClass="max-w-6xl"
          panelId="advanced-tools"
        >
          <SafeDashboardToolBoundary toolLabel={toolLabel} onClose={onClose}>
            <DashboardAdvancedToolsPanel context={dashboardActionContext} />
          </SafeDashboardToolBoundary>
        </DedicatedToolScreen>
      );

    default:
      return null;
  }
}
