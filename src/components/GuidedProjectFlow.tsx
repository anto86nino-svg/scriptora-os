import { ArrowRight, CheckCircle2, Compass, EyeOff, Menu, Sparkles } from "lucide-react";
import type { BookProject, SectionId } from "@/types/book";
import { cn } from "@/lib/utils";
import { t, tt, useUILanguage } from "@/lib/i18n";

type StepStatus = "done" | "active" | "locked";

interface GuidedProjectFlowProps {
  project: BookProject | null;
  activeSection: SectionId | null;
  sidebarOpen: boolean;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onOpenSidebar: () => void;
  onSelectSection: (section: SectionId) => void;
}

export function GuidedProjectFlow({
  project,
  activeSection,
  sidebarOpen,
  enabled,
  onEnabledChange,
  onOpenSidebar,
  onSelectSection,
}: GuidedProjectFlowProps) {
  useUILanguage();

  if (!project) return null;

  if (!enabled) {
    return (
      
    );
  }

  const outlines = project.blueprint?.chapterOutlines || [];
  const hasBlueprint = !!project.blueprint;
  const activeIsChapter = /^chapter-\d+/.test(String(activeSection || ""));
  const hasWrittenChapter = (project.chapters || []).some((chapter) => (chapter.content || "").trim().length > 50);
  const allChaptersDone = outlines.length > 0 && outlines.every((_, index) => (
    (project.chapters?.[index]?.content || "").trim().length > 50
  ));
  const bookReady = project.phase === "complete" || allChaptersDone;
  const firstMissingIndex = outlines.findIndex((_, index) => !((project.chapters?.[index]?.content || "").trim().length > 50));
  const targetChapterIndex = outlines.length ? Math.max(0, firstMissingIndex === -1 ? 0 : firstMissingIndex) : null;

  const steps: Array<{ label: string; detail: string; status: StepStatus }> = [
    {
      label: t("guided_step_structure"),
      detail: t("guided_step_structure_desc"),
      status: hasBlueprint ? "done" : "active",
    },
    {
      label: t("guided_step_index"),
      detail: t("guided_step_index_desc"),
      status: !hasBlueprint ? "locked" : sidebarOpen || activeIsChapter || hasWrittenChapter ? "done" : "active",
    },
    {
      label: t("guided_step_chapter"),
      detail: t("guided_step_chapter_desc"),
      status: !hasBlueprint ? "locked" : activeIsChapter || hasWrittenChapter ? "done" : "active",
    },
    {
      label: t("guided_step_write"),
      detail: t("guided_step_write_desc"),
      status: !hasBlueprint ? "locked" : hasWrittenChapter ? "done" : activeIsChapter ? "active" : "locked",
    },
    {
      label: t("guided_step_export"),
      detail: t("guided_step_export_desc"),
      status: bookReady ? "done" : hasWrittenChapter ? "active" : "locked",
    },
  ];

  return null;
}
