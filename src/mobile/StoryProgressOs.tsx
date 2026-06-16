import type { BookProject, SectionId } from "@/types/book";
import type { ChunkProgress } from "@/lib/generation-types";
import { computeProjectProgressPercent } from "@/lib/project-progress";
import { cn } from "@/lib/utils";

export type StoryProgressOsProps = {
  project: BookProject;
  activeSection: SectionId | null;
  generatingSet: Set<string>;
  chunkProgress?: Record<string, ChunkProgress>;
  className?: string;
};

export function StoryProgressOs({
  project,
  activeSection,
  generatingSet,
  chunkProgress,
  className,
}: StoryProgressOsProps) {
  const total = project.config.numberOfChapters || project.blueprint?.chapterOutlines.length || 0;
  if (!total) return null;

  const progressPct = computeProjectProgressPercent(project);
  const activeMatch = activeSection?.match(/^chapter-(\d+)/);
  const activeIndex = activeMatch ? parseInt(activeMatch[1], 10) : null;
  const isGenerating = activeIndex != null && generatingSet.has(`chapter-${activeIndex}`);
  const live = activeIndex != null ? chunkProgress?.[`chapter-${activeIndex}`] : undefined;

  const writtenCount = project.chapters.filter((c) => (c.content || "").trim().length > 50).length;

  let statusLabel = `Libro · ${total} capitoli`;
  if (isGenerating && activeIndex != null) {
    const pct = live?.targetWords
      ? Math.min(99, Math.round(((live.currentWords || 0) / live.targetWords) * 100))
      : null;
    statusLabel = pct != null
      ? `Scriptora sta scrivendo il capitolo ${activeIndex + 1}… ${pct}%`
      : `Scriptora sta scrivendo il capitolo ${activeIndex + 1}…`;
  } else if (activeIndex != null) {
    statusLabel = `Capitolo ${activeIndex + 1} · ${writtenCount}/${total} completati`;
  }

  const rangeDone = writtenCount > 0 ? `✓ 1–${writtenCount}` : "";
  const rangeCurrent = activeIndex != null ? `● ${activeIndex + 1}` : "";
  const rangePending =
    activeIndex != null && activeIndex + 1 < total
      ? `○ ${activeIndex + 2}–${total}`
      : writtenCount < total
        ? `○ ${writtenCount + 1}–${total}`
        : "";

  return (
    <div
      className={cn(
        "scriptora-story-progress-os sticky z-20 shrink-0 border-b border-white/[0.08] bg-[#07070b]/95 px-3 py-2 backdrop-blur-xl lg:hidden",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 text-[10px] text-white/50">
        <span className="min-w-0 truncate font-medium text-white/70">{statusLabel}</span>
        <span className="shrink-0 tabular-nums font-semibold text-violet-200">{progressPct}%</span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            isGenerating
              ? "bg-gradient-to-r from-violet-500 via-cyan-400 to-violet-500 animate-pulse"
              : "bg-gradient-to-r from-violet-500 to-emerald-400",
          )}
          style={{ width: `${Math.max(6, progressPct)}%` }}
        />
      </div>
      <p className="mt-1.5 truncate text-[9px] text-white/40">
        {[rangeDone, rangeCurrent, rangePending].filter(Boolean).join("  ")}
      </p>
    </div>
  );
}
