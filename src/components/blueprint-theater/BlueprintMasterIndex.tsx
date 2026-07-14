import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import type { BookChapterOutline } from "@/types/book";
import type { ChapterPipelineStatus } from "@/lib/blueprint-theater/blueprint-theater-state";
import { cn } from "@/lib/utils";

export type MasterIndexChapter = {
  title: string;
  summary?: string;
  subchapters?: Array<{ title: string; summary?: string }>;
  status?: ChapterPipelineStatus;
  chapterIndex?: number;
};

type Props = {
  chapters: MasterIndexChapter[];
  frontMatterLabel?: string;
  backMatterLabel?: string;
  frontMatterStatus?: ChapterPipelineStatus;
  backMatterStatus?: ChapterPipelineStatus;
  editable?: boolean;
  reorderable?: boolean;
  expandedChapters: Record<number, boolean>;
  onToggleExpand: (index: number) => void;
  onChapterTitleChange?: (index: number, title: string) => void;
  onChapterSummaryChange?: (index: number, summary: string) => void;
  onSubchapterTitleChange?: (chapterIndex: number, subIndex: number, title: string) => void;
  onSubchapterSummaryChange?: (chapterIndex: number, subIndex: number, summary: string) => void;
  onReorderChapter?: (index: number, direction: "up" | "down") => void;
  onSelectChapter?: (index: number) => void;
  selectedChapterIndex?: number | null;
  italianUi?: boolean;
};

function StatusGlyph({ status }: { status?: ChapterPipelineStatus }) {
  if (status === "done") return <span className="text-emerald-400">✓</span>;
  if (status === "generating") return <span className="animate-pulse text-amber-300">⚡</span>;
  return <span className="text-white/35">⏳</span>;
}

export function BlueprintMasterIndex({
  chapters,
  frontMatterLabel = "Front Matter",
  backMatterLabel = "Back Matter",
  frontMatterStatus,
  backMatterStatus,
  editable = false,
  reorderable = false,
  expandedChapters,
  onToggleExpand,
  onChapterTitleChange,
  onChapterSummaryChange,
  onSubchapterTitleChange,
  onSubchapterSummaryChange,
  onReorderChapter,
  onSelectChapter,
  selectedChapterIndex = null,
  italianUi = true,
}: Props) {
  return (
    <section className="blueprint-theater-index glass-premium flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-white/10">
      <header className="shrink-0 border-b border-white/10 px-4 py-3 sm:px-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-200/80">
          {italianUi ? "Indice protagonista" : "Master index"}
        </p>
        <h2 className="mt-1 text-lg font-semibold text-white sm:text-xl">
          {italianUi ? "Struttura del libro" : "Book structure"}
        </h2>
      </header>

      <div className="blueprint-theater-index-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 sm:py-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
            <StatusGlyph status={frontMatterStatus ?? "waiting"} />
            <span className="text-sm font-medium text-white/80">{frontMatterLabel}</span>
          </div>

          {chapters.map((chapter, index) => {
            const expanded = expandedChapters[index] ?? false;
            const hasSubs = (chapter.subchapters?.length ?? 0) > 0;
            return (
              <div
                key={`ch-${index}`}
                className={cn(
                  "rounded-2xl border transition-colors",
                  selectedChapterIndex === index && "ring-1 ring-violet-300/40",
                  chapter.status === "generating"
                    ? "border-amber-300/30 bg-amber-400/[0.06]"
                    : chapter.status === "done"
                      ? "border-emerald-300/20 bg-emerald-400/[0.04]"
                      : "border-white/8 bg-white/[0.03]",
                )}
              >
                <div className="flex items-start gap-2 px-3 py-3 sm:px-4">
                  {reorderable && onReorderChapter && (
                    <div className="flex shrink-0 flex-col gap-0.5 pt-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => onReorderChapter(index, "up")}
                        className="rounded p-0.5 text-white/40 hover:text-white disabled:opacity-20"
                        aria-label="Su"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <GripVertical className="mx-auto h-3.5 w-3.5 text-white/25" />
                      <button
                        type="button"
                        disabled={index >= chapters.length - 1}
                        onClick={() => onReorderChapter(index, "down")}
                        className="rounded p-0.5 text-white/40 hover:text-white disabled:opacity-20"
                        aria-label="Giù"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  <StatusGlyph status={chapter.status} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                          {italianUi ? "Capitolo" : "Chapter"} {index + 1}
                        </p>
                        {editable && onChapterTitleChange ? (
                          <input
                            value={chapter.title}
                            aria-label={`${italianUi ? "Titolo capitolo" : "Chapter title"} ${index + 1}`}
                            onChange={(e) => onChapterTitleChange(index, e.target.value)}
                            className="mt-0.5 w-full rounded-lg border border-transparent bg-transparent text-base font-semibold text-white focus:border-white/20 focus:bg-white/5 focus:outline-none"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSelectChapter?.(index)}
                            className="mt-0.5 w-full text-left text-base font-semibold text-white hover:text-violet-100"
                          >
                            {chapter.title || `${italianUi ? "Capitolo" : "Chapter"} ${index + 1}`}
                          </button>
                        )}
                      </div>
                      {hasSubs && (
                          <button
                            type="button"
                            onClick={() => {
                              onToggleExpand(index);
                            }}
                            className="shrink-0 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-white/55"
                          >
                            {expanded ? "−" : "+"} {chapter.subchapters!.length}
                          </button>
                      )}
                    </div>
                    {editable && onChapterSummaryChange ? (
                      <textarea
                        value={chapter.summary || ""}
                        aria-label={`${italianUi ? "Riassunto capitolo" : "Chapter summary"} ${index + 1}`}
                        onChange={(event) => onChapterSummaryChange(index, event.target.value)}
                        rows={3}
                        className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-[11px] leading-relaxed text-white/60 focus:border-violet-300/30 focus:outline-none"
                      />
                    ) : chapter.summary ? (
                      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/45">{chapter.summary}</p>
                    ) : null}
                  </div>
                </div>

                {expanded && hasSubs && (
                  <div className="space-y-1.5 border-t border-white/8 px-4 py-3 pl-12">
                    {chapter.subchapters!.map((sub, subIndex) => (
                      <label key={subIndex} className="block rounded-xl bg-black/20 px-3 py-2">
                        <span className="text-[9px] uppercase tracking-wider text-white/35">
                          {italianUi ? "Sottocapitolo" : "Subchapter"} {subIndex + 1}
                        </span>
                        {editable && (onSubchapterTitleChange || onSubchapterSummaryChange) ? (
                          <>
                            {onSubchapterTitleChange ? (
                              <input
                                value={sub.title}
                                aria-label={`${italianUi ? "Titolo sottocapitolo" : "Subchapter title"} ${index + 1}.${subIndex + 1}`}
                                onChange={(e) => onSubchapterTitleChange(index, subIndex, e.target.value)}
                                className="mt-0.5 w-full bg-transparent text-sm text-white/85 focus:outline-none"
                              />
                            ) : (
                              <p className="mt-0.5 text-sm text-white/75">{sub.title}</p>
                            )}
                            {onSubchapterSummaryChange && (
                              <textarea
                                value={sub.summary || ""}
                                aria-label={`${italianUi ? "Riassunto sottocapitolo" : "Subchapter summary"} ${index + 1}.${subIndex + 1}`}
                                onChange={(event) => onSubchapterSummaryChange(index, subIndex, event.target.value)}
                                rows={2}
                                className="mt-1 w-full resize-y rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] leading-relaxed text-white/55 focus:border-violet-300/30 focus:outline-none"
                              />
                            )}
                          </>
                        ) : (
                          <p className="mt-0.5 text-sm text-white/75">{sub.title}</p>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
            <StatusGlyph status={backMatterStatus ?? "waiting"} />
            <span className="text-sm font-medium text-white/80">{backMatterLabel}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function outlinesToMasterIndex(
  outlines: BookChapterOutline[],
  getChapterStatus?: (index: number) => ChapterPipelineStatus,
): MasterIndexChapter[] {
  return outlines.map((outline, index) => ({
    title: outline.title,
    summary: outline.summary,
    chapterIndex: index,
    status: getChapterStatus?.(index),
    subchapters: Array.isArray((outline as BookChapterOutline & { subchapters?: { title: string; summary?: string }[] }).subchapters)
      ? (outline as BookChapterOutline & { subchapters?: { title: string; summary?: string }[] }).subchapters
      : undefined,
  }));
}
