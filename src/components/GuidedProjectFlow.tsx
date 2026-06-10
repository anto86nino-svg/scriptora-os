import { ArrowRight, CheckCircle2, Compass, EyeOff, Menu, Sparkles } from "lucide-react";
import type { BookProject, SectionId } from "@/types/book";
import { cn } from "@/lib/utils";
import { t, tt, useUILanguage } from "@/lib/i18n";
import type { SyncStatus } from "@/hooks/useSyncStatus";
import { PRIMARY_BOOK_PATH_STEPS } from "@/lib/primary-book-path";
import { isUserAuthorIdentityConfigured } from "@/lib/author-identity";

type StepStatus = "done" | "active" | "locked";

interface GuidedProjectFlowProps {
  project: BookProject | null;
  activeSection: SectionId | null;
  sidebarOpen: boolean;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onOpenSidebar: () => void;
  onSelectSection: (section: SectionId) => void;
  syncStatus?: SyncStatus;
  authorPenName?: string;
  progressPercent?: number;
  onCover?: () => void;
  onExport?: () => void;
}

function syncLabel(status?: SyncStatus): string {
  if (status === "saving") return "Salvataggio…";
  if (status === "saved") return "Salvato";
  if (status === "pending") return "Sync in coda";
  if (status === "offline") return "Solo locale";
  return "Pronto";
}

export function GuidedProjectFlow({
  project,
  activeSection,
  sidebarOpen,
  enabled,
  onEnabledChange,
  onOpenSidebar,
  onSelectSection,
  syncStatus,
  authorPenName,
  progressPercent = 0,
  onCover,
  onExport,
}: GuidedProjectFlowProps) {
  useUILanguage();

  if (!project) return null;

  if (!enabled) {
    return (
      <div className="mb-2 flex justify-end">
        <button
          onClick={() => onEnabledChange(true)}
          className="ios-toolbar-button px-3 py-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
        >
          <Compass className="h-3.5 w-3.5" />
          {t("guided_enable")}
        </button>
      </div>
    );
  }

  const outlines = project.blueprint?.chapterOutlines || [];
  const hasBlueprint = !!project.blueprint;
  const hasCharacters = (project.config.characters || []).some((c) => String(c.name || "").trim());
  const activeIsChapter = /^chapter-\d+/.test(String(activeSection || ""));
  const doneChapters = (project.chapters || []).filter((chapter) => (chapter.content || "").trim().length > 50).length;
  const hasWrittenChapter = doneChapters > 0;
  const allChaptersDone = outlines.length > 0 && doneChapters >= outlines.length;
  const bookReady = project.phase === "complete" || allChaptersDone;
  const firstMissingIndex = outlines.findIndex((_, index) => !((project.chapters?.[index]?.content || "").trim().length > 50));
  const targetChapterIndex = outlines.length ? Math.max(0, firstMissingIndex === -1 ? 0 : firstMissingIndex) : null;
  const identityReady = isUserAuthorIdentityConfigured(project.config.authorIdentity as any);

  const stepStatuses: Record<string, StepStatus> = {
    idea: "done",
    blueprint: !hasBlueprint ? "active" : "done",
    characters: !hasBlueprint ? "locked" : hasCharacters ? "done" : hasWrittenChapter ? "done" : "active",
    structure: !hasBlueprint ? "locked" : outlines.length ? "done" : "active",
    chapters: !hasBlueprint ? "locked" : allChaptersDone ? "done" : hasWrittenChapter || activeIsChapter ? "active" : "locked",
    diagnostic: !hasWrittenChapter ? "locked" : activeIsChapter ? "active" : "done",
    cover: !bookReady ? "locked" : "active",
    export: !bookReady || !identityReady ? "locked" : "active",
  };

  const nextStep = PRIMARY_BOOK_PATH_STEPS.find((step) => stepStatuses[step.id] === "active")
    || PRIMARY_BOOK_PATH_STEPS.find((step) => stepStatuses[step.id] === "locked");

  const steps = PRIMARY_BOOK_PATH_STEPS.map((step) => ({
    label: step.label,
    detail:
      step.id === "export" && !identityReady
        ? "Configura Identità Autore prima dell'export"
        : step.id === "chapters"
          ? `${doneChapters}/${outlines.length || "?"} capitoli`
          : step.label,
    status: stepStatuses[step.id] || "locked",
  }));

  return (
    <section className="scriptora-guide-panel mb-2 rounded-lg border border-white/10 bg-white/[0.055] p-3 shadow-xl shadow-black/15 backdrop-blur-xl safe-area-pb">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Compass className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">{t("guided_title")}</p>
              <p className="truncate text-xs text-muted-foreground">
                {nextStep ? `Prossimo passo: ${nextStep.label}` : t("guided_desc")}
              </p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1">
              {syncLabel(syncStatus)}
            </span>
            {authorPenName && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1">
                {authorPenName}
              </span>
            )}
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1">
              {progressPercent}% · {project.config.title || "Libro"}
            </span>
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
          {targetChapterIndex !== null && !allChaptersDone && (
            <button
              onClick={() => onSelectSection(`chapter-${targetChapterIndex}` as SectionId)}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[11px] font-bold text-slate-950 transition-colors hover:bg-slate-100"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t("guided_go_chapter")}
            </button>
          )}
          {bookReady && onCover && (
            <button onClick={onCover} className="ios-toolbar-button px-3 text-[11px] font-semibold text-foreground">
              Cover
            </button>
          )}
          {bookReady && onExport && (
            <button onClick={onExport} className="ios-toolbar-button px-3 text-[11px] font-semibold text-foreground">
              Export
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

      <div className="mt-3 grid gap-2 grid-cols-2 sm:grid-cols-4 xl:grid-cols-8">
        {steps.map((step, index) => (
          <div
            key={step.label}
            className={cn(
              "rounded-lg border px-2.5 py-2 transition-colors",
              step.status === "done" && "border-emerald-400/25 bg-emerald-400/10",
              step.status === "active" && "border-sky-300/35 bg-sky-400/12 shadow-sm shadow-sky-500/10",
              step.status === "locked" && "border-white/8 bg-white/[0.03] opacity-60",
            )}
          >
            <div className="mb-1 flex items-center justify-between gap-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                {index + 1}
              </span>
              {step.status === "done" ? (
                <CheckCircle2 className="h-3 w-3 text-emerald-300" />
              ) : (
                <ArrowRight className={cn("h-3 w-3", step.status === "active" ? "text-sky-200" : "text-muted-foreground")} />
              )}
            </div>
            <p className="text-[11px] font-semibold text-foreground">{step.label}</p>
            <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">{step.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
