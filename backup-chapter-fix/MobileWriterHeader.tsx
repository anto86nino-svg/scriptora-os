import { Link } from "react-router-dom";
import { ArrowLeft, ListTree, MoreHorizontal } from "lucide-react";
import type { BookProject, SectionId } from "@/types/book";
import { t } from "@/lib/i18n";
import { formatChapterDisplayTitle } from "@/lib/chapter-titles";

interface MobileWriterHeaderProps {
  project: BookProject;
  activeSection: SectionId | null;
  onOpenChapterIndex: () => void;
  onOpenMenu: () => void;
}

function resolveLocationLabel(project: BookProject, activeSection: SectionId | null): string {
  const chapterMatch = activeSection?.match(/^chapter-(\d+)$/);
  const chapterIndex = chapterMatch ? Number(chapterMatch[1]) : null;
  const outline = chapterIndex !== null ? project.blueprint?.chapterOutlines[chapterIndex] : undefined;

  if (activeSection === "front-matter") return t("front_matter");
  if (activeSection === "back-matter") return t("back_matter");
  if (chapterIndex !== null) {
    return formatChapterDisplayTitle(chapterIndex, outline?.title || "", {
      config: project.config,
      summary: outline?.summary,
      totalChapters: project.config.numberOfChapters,
    });
  }
  return project.config.title?.trim() || t("blueprint");
}

export function MobileWriterHeader({
  project,
  activeSection,
  onOpenChapterIndex,
  onOpenMenu,
}: MobileWriterHeaderProps) {
  const locationLabel = resolveLocationLabel(project, activeSection);

  return (
    <header className="scriptora-mobile-writer-header layout-desktop:hidden shrink-0 border-b border-white/10 bg-slate-950/98 pt-safe">
      <div className="flex h-11 items-center gap-1 px-2">
        <Link
          to="/dashboard"
          className="ios-toolbar-button h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={t("back_to_my_books")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-sm font-semibold text-foreground">{locationLabel}</p>
        </div>
        <button
          type="button"
          onClick={onOpenChapterIndex}
          className="ios-toolbar-button h-9 w-9 shrink-0 text-primary"
          aria-label={t("open_chapter_navigation")}
        >
          <ListTree className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onOpenMenu}
          className="ios-toolbar-button h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={t("settings")}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
