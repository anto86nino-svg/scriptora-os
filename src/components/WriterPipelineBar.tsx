import { Loader2, Play, Sparkles, ChevronRight } from "lucide-react";
import { BookProject, SectionId } from "@/types/book";
import { cn } from "@/lib/utils";
import { t, tt } from "@/lib/i18n";
import { formatChapterDisplayTitle } from "@/lib/chapter-titles";

export type WriterPipelineStep =
  | "blueprint"
  | "front-matter"
  | "chapter"
  | "back-matter"
  | "complete";

export function getWriterPipelineStep(project: BookProject): {
  step: WriterPipelineStep;
  section: SectionId;
  chapterIndex?: number;
} {
  const { blueprint, frontMatter, chapters, backMatter, config } = project;

  if (!blueprint) {
    return { step: "blueprint", section: "blueprint" };
  }

  for (let i = 0; i < config.numberOfChapters; i += 1) {
    const content = chapters[i]?.content?.trim() ?? "";
    if (content.length <= 50) {
      return { step: "chapter", section: `chapter-${i}` as SectionId, chapterIndex: i };
    }
  }

  if (!frontMatter) {
    return { step: "front-matter", section: "front-matter" };
  }

  if (!backMatter) {
    return { step: "back-matter", section: "back-matter" };
  }

  return { step: "complete", section: "blueprint" };
}

interface WriterPipelineBarProps {
  project: BookProject;
  activeSection: SectionId | null;
  isGeneratingSection: (key: string) => boolean;
  isAnythingGenerating?: boolean;
  onGenerateBlueprint?: () => void;
  onGenerateFrontMatter?: () => void;
  onGenerateChapter?: (index: number) => void;
  onGenerateBackMatter?: () => void;
  onGenerateFullBook?: () => void;
  onNavigateSection?: (section: SectionId) => void;
  mobileFloating?: boolean;
}

export function WriterPipelineBar({
  project,
  activeSection,
  isGeneratingSection,
  isAnythingGenerating = false,
  onGenerateBlueprint,
  onGenerateFrontMatter,
  onGenerateChapter,
  onGenerateBackMatter,
  onGenerateFullBook,
  onNavigateSection,
  mobileFloating = false,
}: WriterPipelineBarProps) {
  const pipeline = getWriterPipelineStep(project);
  const { blueprint, config } = project;

  const isBlueprintGenerating = isGeneratingSection("blueprint");
  const isFrontGenerating = isGeneratingSection("front-matter");
  const chapterIndex = pipeline.chapterIndex ?? 0;
  const isChapterGenerating = pipeline.step === "chapter" && isGeneratingSection(`chapter-${chapterIndex}`);
  const isBackGenerating = isGeneratingSection("back-matter");

  const chapterLabel =
    pipeline.step === "chapter" && blueprint
      ? formatChapterDisplayTitle(
          chapterIndex,
          blueprint.chapterOutlines[chapterIndex]?.title ?? "",
          {
            config,
            summary: blueprint.chapterOutlines[chapterIndex]?.summary,
            totalChapters: config.numberOfChapters,
          },
        )
      : null;

  const hintKey: Record<WriterPipelineStep, string> = {
    blueprint: "writer_pipeline_hint_blueprint",
    "front-matter": "writer_pipeline_hint_front",
    chapter: "writer_pipeline_hint_chapter",
    "back-matter": "writer_pipeline_hint_back",
    complete: "writer_pipeline_hint_complete",
  };

  const primaryAction = (() => {
    switch (pipeline.step) {
      case "blueprint":
        return {
          label: t("writer_pipeline_generate_structure"),
          onClick: onGenerateBlueprint,
          loading: isBlueprintGenerating,
          disabled: !onGenerateBlueprint || isBlueprintGenerating || isAnythingGenerating,
        };
      case "front-matter":
        return {
          label: t("writer_pipeline_generate_front"),
          onClick: onGenerateFrontMatter,
          loading: isFrontGenerating,
          disabled: !onGenerateFrontMatter || isFrontGenerating || isAnythingGenerating,
        };
      case "chapter":
        return {
          label: tt("writer_pipeline_generate_chapter", { n: chapterIndex + 1 }),
          onClick: onGenerateChapter ? () => onGenerateChapter(chapterIndex) : undefined,
          loading: isChapterGenerating,
          disabled: !onGenerateChapter || isChapterGenerating || isAnythingGenerating,
        };
      case "back-matter":
        return {
          label: t("writer_pipeline_generate_back"),
          onClick: onGenerateBackMatter,
          loading: isBackGenerating,
          disabled: !onGenerateBackMatter || isBackGenerating || isAnythingGenerating,
        };
      default:
        return null;
    }
  })();

  if (pipeline.step === "complete") return null;

  if (mobileFloating) {
    if (!primaryAction) return null;
    return (
      <div className="scriptora-mobile-writer-action-bar pointer-events-none fixed inset-x-0 bottom-0 z-30 layout-desktop:hidden">
        <div className="pointer-events-auto mx-auto flex max-w-lg justify-center px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2">
          <button
            type="button"
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
            className="scriptora-modal-cta-primary inline-flex h-12 w-full max-w-md items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold shadow-[0_12px_40px_rgba(0,0,0,0.45)] disabled:opacity-40"
          >
            {primaryAction.loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {primaryAction.label}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="scriptora-writer-pipeline-bar border-b border-white/10 bg-gradient-to-r from-sky-500/[0.08] via-slate-950/95 to-emerald-500/[0.06] px-4 py-3 sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200/80">
              {t("writer_pipeline_next")}
            </p>
            <p className="text-sm font-medium text-foreground">
              {pipeline.step === "chapter" && chapterLabel
                ? tt("writer_pipeline_chapter_target", { label: chapterLabel })
                : t(hintKey[pipeline.step])}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
            {primaryAction && (
              <button
                type="button"
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
                className="scriptora-modal-cta-primary inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold disabled:opacity-40"
              >
                {primaryAction.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {primaryAction.label}
              </button>
            )}

            {pipeline.step !== "blueprint" && onNavigateSection && (
              <>
                {!frontMatterExists(project) && (
                  <NavChip
                    label={t("front_matter")}
                    onClick={() => onNavigateSection("front-matter")}
                    active={activeSection === "front-matter"}
                  />
                )}
                {blueprint && pipeline.step !== "chapter" && (
                  <NavChip
                    label={tt("writer_pipeline_chapter_short", { n: 1 })}
                    onClick={() => onNavigateSection("chapter-0")}
                    active={activeSection === "chapter-0"}
                  />
                )}
                {pipeline.step === "chapter" && onNavigateSection && (
                  <NavChip
                    label={chapterLabel ?? t("chapters")}
                    onClick={() => onNavigateSection(pipeline.section)}
                    active={activeSection === pipeline.section}
                  />
                )}
              </>
            )}

            {blueprint && onGenerateFullBook && pipeline.step !== "complete" && (
              <button
                type="button"
                onClick={onGenerateFullBook}
                disabled={isAnythingGenerating}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 text-xs font-semibold text-foreground transition-colors hover:bg-white/10 disabled:opacity-40"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                {isAnythingGenerating ? t("generation_running") : t("generate_full_book")}
              </button>
            )}
          </div>
      </div>
    </div>
  );
}

function frontMatterExists(project: BookProject) {
  return Boolean(project.frontMatter);
}

function NavChip({
  label,
  onClick,
  active,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center gap-1 rounded-full border px-4 text-xs font-semibold transition-colors",
        active
          ? "border-primary/40 bg-primary/15 text-primary"
          : "border-white/12 bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground",
      )}
    >
      {label}
      <ChevronRight className="h-3 w-3 opacity-60" />
    </button>
  );
}
