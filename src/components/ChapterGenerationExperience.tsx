import { memo, useMemo } from "react";
import { Check, ListTree, Loader2, PenLine, Sparkles, Square } from "lucide-react";
import type { BookProject } from "@/types/book";
import type { ChunkProgress } from "@/lib/generation";
import { resolveChapterTitle } from "@/lib/chapter-titles";
import { Progress } from "@/components/ui/progress";
import { t, tt } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  getEditorialChecklist,
  getEditorialPhaseLabel,
  editorialStatusMessage,
  formatWordProgress,
  sanitizePlaceholderText,
  splitManuscriptParagraphs,
} from "@/lib/generation-experience";
import { useEditorialChecklist, usePerceivedStreamText } from "@/lib/generation-experience/usePerceivedStream";

interface Props {
  project: BookProject;
  chapterIndex: number;
  outline?: { title: string; summary: string };
  onCancel?: () => void;
  onBackToChapters?: () => void;
  chunkProgress?: ChunkProgress;
}

export const ChapterGenerationExperience = memo(function ChapterGenerationExperience({
  project,
  chapterIndex,
  outline,
  onCancel,
  onBackToChapters,
  chunkProgress,
}: Props) {
  const liveContent = chunkProgress?.content?.trim() ?? "";
  const hasLiveContent = liveContent.length > 0;
  const displayedText = usePerceivedStreamText(liveContent, true);
  const checklistDone = useEditorialChecklist(hasLiveContent);

  const checklist = getEditorialChecklist();
  const currentWords = chunkProgress?.currentWords ?? 0;
  const targetWords = Math.max(chunkProgress?.targetWords ?? 2800, 1);
  const realPct = chunkProgress
    ? Math.min(Math.round((currentWords / targetWords) * 100), 99)
    : Math.min(Math.round((checklistDone / checklist.length) * 18), 18);

  const phase = chunkProgress?.phase ?? "OPENING";
  const phaseLabel = getEditorialPhaseLabel(phase);

  const chapterTitle = resolveChapterTitle(outline?.title || "", chapterIndex, {
    config: project.config,
    summary: outline?.summary,
    totalChapters: project.config.numberOfChapters,
  });

  const paragraphs = useMemo(() => splitManuscriptParagraphs(displayedText), [displayedText]);
  const isStreamingDisplay = hasLiveContent && displayedText.length < liveContent.length;
  const statusMessage = editorialStatusMessage(
    hasLiveContent,
    sanitizePlaceholderText(outline?.summary) || "",
  );

  return (
    <div className="scriptora-generation-stage animate-fade-in min-w-0 max-w-full w-full overflow-x-hidden">
      {onBackToChapters && (
        <button
          type="button"
          onClick={onBackToChapters}
          className="scriptora-writer-nav-primary mb-4 w-full sm:w-auto"
        >
          <ListTree className="h-4 w-4 shrink-0" />
          {t("back_to_chapter_index")}
        </button>
      )}
      <div className="scriptora-generation-topline">
        <div className="min-w-0 flex-1">
          <div className="scriptora-generation-live-pill mb-2">
            <span className="scriptora-generation-live-dot" />
            <Sparkles className="h-4 w-4" />
          </div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-100/70">
            {t("building_chapter")}
          </p>
          <p className="mt-1 text-sm font-medium text-white/88">{phaseLabel}</p>
        </div>
        <div className="scriptora-generation-actions shrink-0">
          <span className="scriptora-generation-percent">{realPct}%</span>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              title={t("stop_generation")}
              className="scriptora-writer-stop-btn"
            >
              <Square className="h-3 w-3 shrink-0" />
              <span>{t("stop_generation")}</span>
            </button>
          )}
        </div>
      </div>

      <ul className="mb-4 space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
        {checklist.map((label, index) => {
          const done = index < checklistDone;
          const active = index === checklistDone && !hasLiveContent;
          return (
            <li key={label} className="flex items-center gap-2.5 text-sm">
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  done && "border-emerald-400/40 bg-emerald-400/15 text-emerald-200",
                  active && "border-cyan-300/40 bg-cyan-300/10 text-cyan-100",
                  !done && !active && "border-white/15 text-white/30",
                )}
              >
                {done ? <Check className="h-3 w-3" /> : active ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              </span>
              <span className={cn(done ? "text-white/90" : active ? "text-white/75" : "text-white/45")}>
                {label}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="scriptora-generation-manuscript mb-4">
        <div className="scriptora-generation-manuscript-header">
          <div className="flex items-center gap-2">
            <PenLine className="h-4 w-4 text-emerald-200" />
            <span>{t("chapter_preview_title")}</span>
          </div>
          {hasLiveContent && (
            <span className="text-[10px] uppercase tracking-[0.14em] text-emerald-200/80">{t("chapter_writing_badge")}</span>
          )}
        </div>
        <div className="scriptora-live-writing-board" aria-label={tt("chapter_preview_aria", { title: chapterTitle })}>
          <div className="scriptora-live-writing-paper">
            <h4 className="text-lg font-semibold text-white leading-snug">{chapterTitle}</h4>
            {paragraphs.length > 0 ? (
              <div className="scriptora-generation-live-text mt-4 space-y-4">
                {paragraphs.map((paragraph, index) => (
                  <p
                    key={`${index}-${paragraph.slice(0, 24)}`}
                    className={cn(
                      "text-[15px] leading-7 text-white/88 sm:text-base sm:leading-8",
                      index === paragraphs.length - 1 && isStreamingDisplay && "opacity-95",
                    )}
                  >
                    {paragraph}
                    {index === paragraphs.length - 1 && (isStreamingDisplay || !chunkProgress) && (
                      <span className="scriptora-generation-caret ml-0.5 inline-block" aria-hidden="true" />
                    )}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-white/60">{statusMessage}</p>
            )}
          </div>
        </div>
      </div>

      <div className="scriptora-generation-meter">
        <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.16em] text-white/45">
          <span>{chunkProgress ? formatWordProgress(currentWords, targetWords) : "Preparazione in corso"}</span>
          <span>{phaseLabel}</span>
        </div>
        <Progress value={realPct} className="mt-2 h-2 bg-white/10" />
      </div>
    </div>
  );
}, (prev, next) =>
  prev.onCancel === next.onCancel &&
  prev.onBackToChapters === next.onBackToChapters &&
  prev.project?.id === next.project?.id &&
  prev.chapterIndex === next.chapterIndex &&
  prev.outline?.title === next.outline?.title &&
  prev.outline?.summary === next.outline?.summary &&
  prev.chunkProgress?.currentWords === next.chunkProgress?.currentWords &&
  prev.chunkProgress?.targetWords === next.chunkProgress?.targetWords &&
  prev.chunkProgress?.phase === next.chunkProgress?.phase &&
  prev.chunkProgress?.content === next.chunkProgress?.content,
);
