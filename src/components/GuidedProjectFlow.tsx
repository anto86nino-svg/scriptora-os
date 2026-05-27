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
      <div className="mb-2 flex justify-end">
        {/* Guide button moved to Home settings */}
      </div>
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

  return (
    <section className="scriptora-guide-panel mb-2 rounded-lg border border-white/10 bg-white/[0.055] p-3 shadow-xl shadow-black/15 backdrop-blur-xl">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Compass className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">{t("guided_title")}</p>
              <p className="truncate text-xs text-muted-foreground">{t("guided_desc")}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasBlueprint && !sidebarOpen && (
            <button
              onClick={onOpenSidebar}
              className="ios-toolbar-button px-3 py-2 text-[11px] font-semibold text-foreground"
            >
              <Menu className="h-3.5 w-3.5" />
              {t("guided_open_index")}
            </button>
          )}
          {targetChapterIndex !== null && (
            <button
              onClick={() => onSelectSection(`chapter-${targetChapterIndex}` as SectionId)}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[11px] font-bold text-slate-950 transition-colors hover:bg-slate-100"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t("guided_go_chapter")}
            </button>
          )}
          <button
            onClick={() => onEnabledChange(false)}
            className="ios-toolbar-button px-3 py-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
          >
            <EyeOff className="h-3.5 w-3.5" />
            {t("guided_disable")}
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {steps.map((step, index) => (
          <div
            key={step.label}
            className={cn(
              "rounded-lg border px-3 py-2 transition-colors",
              step.status === "done" && "border-emerald-400/25 bg-emerald-400/10",
              step.status === "active" && "border-sky-300/35 bg-sky-400/12 shadow-sm shadow-sky-500/10",
              step.status === "locked" && "border-white/8 bg-white/[0.03] opacity-60",
            )}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {tt("guided_step_label", { count: index + 1 })}
              </span>
              {step.status === "done" ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
              ) : (
                <ArrowRight className={cn("h-3.5 w-3.5", step.status === "active" ? "text-sky-200" : "text-muted-foreground")} />
              )}
            </div>
            <p className="text-xs font-semibold text-foreground">{step.label}</p>
            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{step.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
