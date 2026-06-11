import { ArrowRight, CheckCircle2, Compass, EyeOff, Menu, Sparkles } from "lucide-react";
import type { BookProject, SectionId } from "@/types/book";
import { cn } from "@/lib/utils";
import { t, tt, useUILanguage } from "@/lib/i18n";
import type { SyncStatus } from "@/hooks/useSyncStatus";
import { getPrimaryBookPathSteps, type PrimaryBookPathStepId } from "@/lib/primary-book-path";
import { isUserAuthorIdentityConfigured } from "@/lib/author-identity";
import { isProjectComplete } from "@/lib/project-status";
import { computeProjectProgressPercent } from "@/lib/project-progress";
import { resolveBookTypeDefinition } from "@/lib/book-type-engine";
import { isBackMatterEnabled, isFrontMatterEnabled } from "@/lib/matter-options";
import { BookTypeBadge } from "@/components/BookTypeBadge";

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
  progressPercent: progressPercentProp,
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

  const { config } = project;
  const pathSteps = getPrimaryBookPathSteps(config);
  const outlines = project.blueprint?.chapterOutlines || [];
  const hasBlueprint = !!project.blueprint;
  const hasCharacters = (config.characters || []).some((c) => String(c.name || "").trim());
  const family = resolveBookTypeDefinition(config.genre, config.subcategory, config.subgenre, config.bookTypeId).family;
  const needsCharacters = family === "narrative" || family === "poetry";
  const activeIsChapter = /^chapter-\d+/.test(String(activeSection || ""));
  const doneChapters = (project.chapters || []).filter((chapter) => (chapter.content || "").trim().length > 50).length;
  const hasWrittenChapter = doneChapters > 0;
  const allChaptersDone = outlines.length > 0 && doneChapters >= outlines.length;
  const bookReady = isProjectComplete(project);
  const progressPercent = progressPercentProp ?? computeProjectProgressPercent(project);
  const firstMissingIndex = outlines.findIndex((_, index) => !((project.chapters?.[index]?.content || "").trim().length > 50));
  const targetChapterIndex = outlines.length ? Math.max(0, firstMissingIndex === -1 ? 0 : firstMissingIndex) : null;
  const identityReady = isUserAuthorIdentityConfigured(project.config.authorIdentity as any);

  const stepStatuses: Record<PrimaryBookPathStepId, StepStatus> = {
    idea: "done",
    blueprint: !hasBlueprint ? "active" : "done",
    characters: !needsCharacters
      ? "done"
      : !hasBlueprint
        ? "locked"
        : hasCharacters
          ? "done"
          : hasWrittenChapter
            ? "done"
            : "active",
    structure: !hasBlueprint ? "locked" : outlines.length ? "done" : "active",
    "front-matter": !hasBlueprint
      ? "locked"
      : !isFrontMatterEnabled(config)
        ? "done"
        : project.frontMatter
          ? "done"
          : "active",
    chapters: !hasBlueprint ? "locked" : allChaptersDone ? "done" : hasWrittenChapter || activeIsChapter ? "active" : "locked",
    "back-matter": !allChaptersDone
      ? "locked"
      : !isBackMatterEnabled(config)
        ? "done"
        : project.backMatter
          ? "done"
          : "active",
    diagnostic: !hasWrittenChapter ? "locked" : activeIsChapter ? "active" : "done",
    cover: !bookReady ? "locked" : "active",
    export: !bookReady || !identityReady ? "locked" : "active",
  };

  const nextStep = pathSteps.find((step) => stepStatuses[step.id] === "active")
    || pathSteps.find((step) => stepStatuses[step.id] === "locked");

  const steps = pathSteps.map((step) => ({
    id: step.id,
    label: step.label,
    detail:
      step.id === "export" && !identityReady
        ? "Configura Identità Autore prima dell'export"
        : step.id === "chapters"
          ? `${doneChapters}/${outlines.length || config.numberOfChapters || "?"} capitoli`
          : step.id === "front-matter" && isFrontMatterEnabled(config)
            ? project.frontMatter ? "Premessa pronta" : "Da generare"
            : step.id === "back-matter" && isBackMatterEnabled(config)
              ? project.backMatter ? "Postfazione pronta" : "Da generare"
              : step.label,
    status: stepStatuses[step.id] || "locked",
  }));

  const gridCols = steps.length <= 8 ? "xl:grid-cols-8" : "xl:grid-cols-10";

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
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <BookTypeBadge config={config} compact />
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {syncLabel(syncStatus)}
            </span>
            {authorPenName && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {authorPenName}
              </span>
            )}
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {progressPercent}% · {config.title || "Libro"}
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
          {stepStatuses["front-matter"] === "active" && (
            <button
              onClick={() => onSelectSection("front-matter")}
              className="ios-toolbar-button px-3 py-2 text-[11px] font-semibold text-foreground"
            >
              Premessa
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
          {stepStatuses["back-matter"] === "active" && (
            <button
              onClick={() => onSelectSection("back-matter")}
              className="ios-toolbar-button px-3 py-2 text-[11px] font-semibold text-foreground"
            >
              Postfazione
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

      <div className={cn("mt-3 grid gap-2 grid-cols-2 sm:grid-cols-4", gridCols)}>
        {steps.map((step, index) => (
          <div
            key={`${step.id}-${step.label}`}
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
