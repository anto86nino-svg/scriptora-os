import { lazy, Suspense, type ReactNode } from "react";
import { FolderOpen, Sparkles, Trash2 } from "lucide-react";
import type { BookProject } from "@/types/book";
import type { AuthorIdentity } from "@/types/book";
import { isProjectComplete } from "@/lib/project-status";
import { t, tt } from "@/lib/i18n";
import { getBookTypeLabel } from "@/components/BookTypeBadge";
import { LibrarySection } from "@/components/Home/LibrarySection";
import { DedicatedToolScreen } from "@/components/one-flow/DedicatedToolScreen";
import { SafeDashboardToolBoundary } from "@/components/one-flow/SafeDashboardToolBoundary";
import { DashboardIdeaPreviewPanel } from "@/components/one-flow/DashboardIdeaPreviewPanel";
import { DashboardAdvancedToolsPanel } from "@/components/one-flow/DashboardAdvancedToolsPanel";
import { ScriptoraAliveTransition } from "@/components/boot/ScriptoraAliveTransition";
import type { ActiveDashboardTool } from "@/lib/one-flow/dashboard-active-tool";
import type { DashboardActionContext } from "@/lib/one-flow/dashboard-home-actions";
import { countExportableProjects } from "@/lib/one-flow/dashboard-home-actions";
import type { IdeaPreviewPanelProps } from "@/components/one-flow/DashboardIdeaPreviewPanel";

const HomeExportDialog = lazy(() =>
  import("@/components/HomeExportDialog").then((m) => ({ default: m.HomeExportDialog })),
);
const TitleIntelligenceDialog = lazy(() =>
  import("@/components/TitleIntelligenceDialog").then((m) => ({ default: m.TitleIntelligenceDialog })),
);
const CharacterStudioDialog = lazy(() =>
  import("@/components/CharacterStudioDialog").then((m) => ({ default: m.CharacterStudioDialog })),
);
const ManuscriptAnalyzerDialog = lazy(() =>
  import("@/components/ManuscriptAnalyzerDialog").then((m) => ({ default: m.ManuscriptAnalyzerDialog })),
);
const NotepadDialog = lazy(() =>
  import("@/components/NotepadDialog").then((m) => ({ default: m.NotepadDialog })),
);
const AuthorIdentityDialog = lazy(() =>
  import("@/components/AuthorIdentityDialog").then((m) => ({ default: m.AuthorIdentityDialog })),
);

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

function ToolLoading() {
  return (
    <ScriptoraAliveTransition
      compact
      overlay
      tone="export"
      title="Sto aprendo lo strumento…"
      steps={["Caricamento pannello…", "Quasi pronto…"]}
    />
  );
}

export type DashboardToolHostProps = {
  activeTool: ActiveDashboardTool;
  onClose: () => void;
  projects: BookProject[];
  draftProjects: BookProject[];
  flowProjectId: string | null;
  lastProject: BookProject | null;
  freeBookUsed: boolean;
  authorIdentityPrefill: AuthorIdentity | null;
  onClearAuthorPrefill: () => void;
  onDeleteProject: (id: string) => void;
  onGoApp: (opts?: { section?: string; projectId?: string }) => void;
  onOpenTool: (tool: ActiveDashboardTool) => void;
  onOpenNewBook: () => void;
  onLimitReached: () => void;
  onAuthorIdentityFromCharacter: () => void;
  ideaPreview: IdeaPreviewPanelProps;
  dashboardActionContext: DashboardActionContext;
};

export function DashboardToolHost({
  activeTool,
  onClose,
  projects,
  draftProjects,
  flowProjectId,
  lastProject,
  freeBookUsed,
  authorIdentityPrefill,
  onClearAuthorPrefill,
  onDeleteProject,
  onGoApp,
  onOpenTool,
  onOpenNewBook,
  onLimitReached,
  onAuthorIdentityFromCharacter,
  ideaPreview,
  dashboardActionContext,
}: DashboardToolHostProps) {
  if (!activeTool || activeTool === "book-forge") return null;

  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeDrafts = Array.isArray(draftProjects) ? draftProjects : [];
  const toolLabel = TOOL_LABELS[activeTool];
  const canExport = countExportableProjects(safeProjects) > 0;

  const boundary = (child: ReactNode) => (
    <SafeDashboardToolBoundary toolLabel={toolLabel} onClose={onClose}>
      <Suspense fallback={<ToolLoading />}>{child}</Suspense>
    </SafeDashboardToolBoundary>
  );

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
          {boundary(
            safeDrafts.length === 0 ? (
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
            ),
          )}
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
          {boundary(
            <LibrarySection
              projects={safeProjects}
              onOpen={(id) => { onClose(); onGoApp({ projectId: id }); }}
              onDelete={onDeleteProject}
              onExport={() => onOpenTool("export")}
            />,
          )}
        </DedicatedToolScreen>
      );

    case "export":
      if (!canExport) {
        return (
          <DedicatedToolScreen
            open
            title="Export Studio"
            description="Esporta il tuo libro in EPUB, DOCX o PDF."
            onClose={onClose}
            maxWidthClass="max-w-lg"
          >
            <div className="space-y-4 py-8 text-center">
              <p className="text-sm text-white/65">
                Per esportare devi prima aprire o generare un libro completato.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => { onClose(); onOpenNewBook(); }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  <Sparkles className="h-4 w-4" />
                  Apri Book Forge
                </button>
                <button
                  type="button"
                  onClick={() => onOpenTool("projects")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white/80"
                >
                  <FolderOpen className="h-4 w-4" />
                  I miei libri
                </button>
              </div>
            </div>
          </DedicatedToolScreen>
        );
      }
      return boundary(
        <HomeExportDialog
          open
          projects={safeProjects}
          initialProjectId={flowProjectId || lastProject?.id || undefined}
          onClose={onClose}
        />,
      );

    case "title-intelligence":
      return boundary(
        <TitleIntelligenceDialog
          open
          onClose={onClose}
          onLaunchForge={() => { onClose(); onOpenNewBook(); }}
        />,
      );

    case "character-studio":
      return boundary(
        <CharacterStudioDialog
          open
          onClose={onClose}
          onAuthorIdentity={onAuthorIdentityFromCharacter}
        />,
      );

    case "manuscript-lab":
      return boundary(
        <ManuscriptAnalyzerDialog
          open
          onClose={onClose}
          canCreateProject={!freeBookUsed}
          onLimitReached={onLimitReached}
        />,
      );

    case "notepad":
      return boundary(<NotepadDialog open onClose={onClose} />);

    case "author-identity":
      return boundary(
        <AuthorIdentityDialog
          open
          onClose={() => {
            onClearAuthorPrefill();
            onClose();
          }}
          prefillDraft={authorIdentityPrefill}
        />,
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
          {boundary(<DashboardIdeaPreviewPanel {...ideaPreview} onClose={onClose} />)}
        </DedicatedToolScreen>
      );

    case "advanced-tools":
      return (
        <DedicatedToolScreen
          open
          title="Strumenti avanzati"
          description="Ottimizzazione, mercato, scrittura e sistema. Ogni strumento apre una destinazione protetta."
          onClose={onClose}
          maxWidthClass="max-w-6xl"
        >
          {boundary(<DashboardAdvancedToolsPanel context={dashboardActionContext} />)}
        </DedicatedToolScreen>
      );

    default:
      return null;
  }
}
