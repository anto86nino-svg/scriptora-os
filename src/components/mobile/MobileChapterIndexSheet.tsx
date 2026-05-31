import { NavigationTree } from "@/components/NavigationTree";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { t } from "@/lib/i18n";
import type { BookProject, SectionId } from "@/types/book";
import { X } from "lucide-react";

interface MobileChapterIndexSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: BookProject | null;
  activeSection: SectionId | null;
  onSelectSection: (section: SectionId) => void;
  generatingSet: Set<string>;
  onGenerateChaptersParallel?: (indices: number[]) => void;
}

export function MobileChapterIndexSheet({
  open,
  onOpenChange,
  project,
  activeSection,
  onSelectSection,
  generatingSet,
  onGenerateChaptersParallel,
}: MobileChapterIndexSheetProps) {
  if (!project) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="scriptora-mobile-chapter-sheet flex h-[96dvh] max-h-[96dvh] flex-col rounded-t-[20px] border-white/10 bg-slate-950 pb-safe">
        <DrawerHeader className="shrink-0 border-b border-white/10 px-4 pb-3 pt-2 text-left">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <DrawerTitle className="text-base font-bold text-foreground">
                {t("chapter_outlines")}
              </DrawerTitle>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {project.config.title || t("untitled")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="ios-toolbar-button h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label={t("close_chapter_navigation")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-hidden">
          <NavigationTree
            project={project}
            activeSection={activeSection}
            onSelectSection={(section) => {
              onSelectSection(section);
              onOpenChange(false);
            }}
            generatingSet={generatingSet}
            onGenerateChaptersParallel={onGenerateChaptersParallel}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
