import { BookProject, getBookTotalWords } from "@/types/book";
import { t, tt } from "@/lib/i18n";

interface MobileProgressPillProps {
  project: BookProject;
  activeChapterIndex?: number | null;
}

function formatWords(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
}

export function MobileProgressPill({ project, activeChapterIndex = null }: MobileProgressPillProps) {
  const { config, chapters } = project;
  const totalChapters = config.numberOfChapters;
  const completedChapters = chapters.filter((ch) => (ch.content || "").trim().length > 0).length;
  const chapterLabel =
    activeChapterIndex !== null && activeChapterIndex >= 0
      ? tt("mobile_progress_chapter", { current: activeChapterIndex + 1, total: totalChapters })
      : tt("mobile_progress_chapters_done", { done: completedChapters, total: totalChapters });

  let totalWords = 0;
  chapters.forEach((ch) => {
    if (ch.content) totalWords += ch.content.split(/\s+/).filter(Boolean).length;
    ch.subchapters.forEach((sub) => {
      if (sub.content) totalWords += sub.content.split(/\s+/).filter(Boolean).length;
    });
  });

  const targetWords = getBookTotalWords(config);

  return (
    <div
      className="mx-2 mb-2 inline-flex max-w-full items-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-foreground/90"
      title={`${totalWords.toLocaleString()} / ${targetWords.toLocaleString()} ${t("words_unit")}`}
    >
      <span className="truncate">{chapterLabel}</span>
      <span className="text-muted-foreground">•</span>
      <span className="shrink-0 tabular-nums text-muted-foreground">
        {formatWords(totalWords)} {t("words_unit")}
      </span>
    </div>
  );
}
