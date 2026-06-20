import type { BookProject } from "@/types/book";
import { t, tt } from "@/lib/i18n";
import { LibrarySection } from "@/components/Home/LibrarySection";
import { DedicatedToolScreen } from "@/components/one-flow/DedicatedToolScreen";
import { SafeDashboardToolBoundary } from "@/components/one-flow/SafeDashboardToolBoundary";
import { DashboardIdeaPreviewPanel } from "@/components/one-flow/DashboardIdeaPreviewPanel";
import { DashboardAdvancedToolsPanel } from "@/components/one-flow/DashboardAdvancedToolsPanel";
import type { ActiveDashboardTool } from "@/lib/one-flow/dashboard-active-tool";
import type { DashboardActionContext } from "@/lib/one-flow/dashboard-home-actions";
import type { IdeaPreviewPanelProps } from "@/components/one-flow/DashboardIdeaPreviewPanel";
import { ProjectLibraryPanel } from "@/components/projects/ProjectLibraryPanel";
import { getToolRoute } from "@/lib/one-flow/tool-registry";

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
  onNavigate: (path: string, state?: Record<string, unknown>) => void;
  ideaPreview: IdeaPreviewPanelProps;
  dashboardActionContext: DashboardActionContext;
};

export function DashboardToolHost({
  activeTool,
  onClose,
  projects,
  onDeleteProject,
  onGoApp,
  onOpenNewBook,
  onNavigate,
  ideaPreview,
  dashboardActionContext,
}: DashboardToolHostProps) {
  if (!activeTool || activeTool === "book-forge") return null;

  const safeProjects = Array.isArray(projects) ? projects : [];
  const toolLabel = TOOL_LABELS[activeTool];

  switch (activeTool) {
    case "projects":
      return (
        <DedicatedToolScreen
          open
          title="I miei progetti"
          description={tt("my_projects_drafts", { count: safeProjects.length })}
          onClose={onClose}
          maxWidthClass="max-w-4xl"
        >
          <SafeDashboardToolBoundary toolLabel={toolLabel} onClose={onClose}>
            <ProjectLibraryPanel
              projects={safeProjects}
              onOpen={(id) => { onClose(); onGoApp({ projectId: id }); }}
              onDelete={onDeleteProject}
              onNewBook={() => { onClose(); onOpenNewBook(); }}
              onNavigate={(path, state) => { onClose(); onNavigate(path, state); }}
            />
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
              onExport={() => { onClose(); onNavigate(getToolRoute("publishing")); }}
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
