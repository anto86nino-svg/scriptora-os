import { BookOpen, Plus, FolderOpen, Trash2 } from "lucide-react";
import { BookProject } from "@/types/book";
import { t } from "@/lib/i18n";

interface AppSidebarProps {
  projects: BookProject[];
  activeProjectId: string | null;
  onNewBook: () => void;
  onSelectProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
}

export function AppSidebar({ projects, activeProjectId, onNewBook, onSelectProject, onDeleteProject }: AppSidebarProps) {
  return (
    <aside className="w-60 shrink-0 border-r border-border bg-sidebar flex flex-col h-screen">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h1 className="text-sm font-semibold text-foreground">Scriptora</h1>
        </div>
      </div>

      <div className="p-3">
        <button
          onClick={onNewBook}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          New Book
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-2">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <FolderOpen className="h-3 w-3" />
          Projects
        </div>
        {projects.length === 0 && (
          <p className="px-3 py-2 text-xs text-muted-foreground">{t("no_projects_yet")}</p>
        )}
        {projects.map(p => (
          <div
            key={p.id}
            className={`group flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
              p.id === activeProjectId ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
            onClick={() => onSelectProject(p.id)}
          >
            <span className="truncate">{p.config.title || "Untitled"}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteProject(p.id); }}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

    </aside>
  );
}
