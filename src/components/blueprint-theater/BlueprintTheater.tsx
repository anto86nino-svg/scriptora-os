import { useMemo, useState, type ReactNode } from "react";
import type { BookProject } from "@/types/book";
import type { BookBlueprint } from "@/types/book";
import type { ChunkProgress } from "@/lib/generation-types";
import {
  buildForgePipeline,
  buildWriterPipeline,
  computeTheaterLiveStats,
  deriveNarrativeEvents,
  type ChapterPipelineItem,
} from "@/lib/blueprint-theater/blueprint-theater-state";
import { BlueprintBookIdentity } from "./BlueprintBookIdentity";
import { BlueprintMasterIndex, outlinesToMasterIndex, type MasterIndexChapter } from "./BlueprintMasterIndex";
import { BlueprintLiveGenerationPanel } from "./BlueprintLiveGenerationPanel";
import { BlueprintPackagingCenter } from "./BlueprintPackagingCenter";
import { cn } from "@/lib/utils";

export type BlueprintTheaterMode = "forge" | "writer";

type Props = {
  mode: BlueprintTheaterMode;
  title: string;
  subtitle?: string;
  author?: string;
  genre?: string;
  coverUrl?: string | null;
  onCover?: () => void;
  onKdp?: () => void;
  onRadar?: () => void;
  onKeywordGold?: () => void;
  onTitleIntel?: () => void;
  onExport?: () => void;
  onMarket?: () => void;
  italianUi?: boolean;
  footer?: ReactNode;
  /** Forge */
  blueprint?: BookBlueprint | null;
  generatingBlueprint?: boolean;
  blueprintElapsedSeconds?: number;
  forgeCopy?: string;
  chapterCount?: number;
  editable?: boolean;
  reorderable?: boolean;
  onChapterTitleChange?: (index: number, title: string) => void;
  onSubchapterTitleChange?: (chapterIndex: number, subIndex: number, title: string) => void;
  onReorderChapter?: (index: number, direction: "up" | "down") => void;
  onTitleChange?: (v: string) => void;
  onSubtitleChange?: (v: string) => void;
  /** Writer */
  project?: BookProject | null;
  isGenerating?: (key: string) => boolean;
  chunkProgress?: Record<string, ChunkProgress>;
  onSelectChapter?: (index: number) => void;
  onApproveBlueprint?: () => void;
  showApproveBanner?: boolean;
  keywords?: string[];
  categories?: string[];
};

export function BlueprintTheater({
  mode,
  title,
  subtitle,
  author,
  genre,
  coverUrl,
  onCover,
  onKdp,
  onRadar,
  onKeywordGold,
  onTitleIntel,
  onExport,
  onMarket,
  italianUi = true,
  footer,
  blueprint,
  generatingBlueprint = false,
  blueprintElapsedSeconds = 0,
  forgeCopy,
  chapterCount = 0,
  editable = false,
  reorderable = false,
  onChapterTitleChange,
  onSubchapterTitleChange,
  onReorderChapter,
  onTitleChange,
  onSubtitleChange,
  project,
  isGenerating,
  chunkProgress,
  onSelectChapter,
  onApproveBlueprint,
  showApproveBanner = false,
  keywords,
  categories,
}: Props) {
  const [expandedChapters, setExpandedChapters] = useState<Record<number, boolean>>({});

  const pipeline: ChapterPipelineItem[] = useMemo(() => {
    if (mode === "writer" && project && isGenerating) {
      return buildWriterPipeline(project, isGenerating);
    }
    return buildForgePipeline(
      generatingBlueprint,
      Boolean(blueprint),
      blueprintElapsedSeconds,
      chapterCount || blueprint?.chapterOutlines.length || 0,
    );
  }, [mode, project, isGenerating, generatingBlueprint, blueprint, blueprintElapsedSeconds, chapterCount]);

  const stats = useMemo(() => {
    if (mode === "writer" && project) {
      return computeTheaterLiveStats(project);
    }
    const total = blueprint?.chapterOutlines.length || chapterCount || 0;
    const bpDone = blueprint ? 1 : 0;
    const pct = generatingBlueprint
      ? Math.min(45, 8 + blueprintElapsedSeconds)
      : blueprint
        ? Math.min(35, 12 + total * 2)
        : 0;
    return {
      bookPercent: pct,
      chaptersDone: blueprint ? total : 0,
      chaptersTotal: total,
      wordsGenerated: mode === "writer" && project ? computeTheaterLiveStats(project).wordsGenerated : 0,
    };
  }, [mode, project, blueprint, chapterCount, generatingBlueprint, blueprintElapsedSeconds]);

  const narrativeEvents = useMemo(
    () =>
      deriveNarrativeEvents(pipeline, {
        generatingBlueprint: mode === "forge" && generatingBlueprint,
        forgeCopy,
      }),
    [pipeline, mode, generatingBlueprint, forgeCopy],
  );

  const statusForIndex = (index: number) => pipeline.find((p) => p.chapterIndex === index)?.status;

  const masterChapters: MasterIndexChapter[] = useMemo(() => {
    const outlines = blueprint?.chapterOutlines ?? project?.blueprint?.chapterOutlines ?? [];
    return outlinesToMasterIndex(outlines, mode === "writer" ? statusForIndex : undefined);
  }, [blueprint, project, pipeline, mode]);

  const frontStatus = pipeline.find((p) => p.id === "front-matter")?.status;
  const backStatus = pipeline.find((p) => p.id === "back-matter")?.status;

  return (
    <div className="blueprint-theater-root flex min-h-0 flex-1 flex-col">
      {showApproveBanner && onApproveBlueprint && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-3">
          <p className="text-sm text-amber-50">
            {italianUi ? "Approva la struttura per avviare la scrittura dei capitoli." : "Approve structure to start writing chapters."}
          </p>
          <button
            type="button"
            onClick={onApproveBlueprint}
            className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950"
          >
            {italianUi ? "Approva struttura" : "Approve"}
          </button>
        </div>
      )}

      <div className="blueprint-theater-grid min-h-0 flex-1 gap-4 lg:grid lg:grid-cols-[minmax(220px,260px)_minmax(0,1fr)_minmax(240px,300px)] lg:items-start">
        <div className="blueprint-theater-col-identity space-y-4 lg:sticky lg:top-0">
          <BlueprintBookIdentity
            title={title}
            subtitle={subtitle}
            author={author}
            genre={genre}
            coverUrl={coverUrl}
            onCover={onCover}
            italianUi={italianUi}
          />
          <BlueprintPackagingCenter
            title={title}
            subtitle={subtitle}
            keywords={keywords ?? project?.config.keywords}
            categories={categories ?? (project?.config.subcategory ? [project.config.subcategory] : [])}
            onTitleChange={onTitleChange}
            onSubtitleChange={onSubtitleChange}
            onCover={onCover}
            onKdp={onKdp}
            onRadar={onRadar}
            onKeywordGold={onKeywordGold}
            onTitleIntel={onTitleIntel}
            onExport={onExport}
            onMarket={onMarket}
            italianUi={italianUi}
          />
        </div>

        <BlueprintMasterIndex
          chapters={masterChapters}
          frontMatterStatus={frontStatus}
          backMatterStatus={backStatus}
          editable={editable}
          reorderable={reorderable}
          expandedChapters={expandedChapters}
          onToggleExpand={(index) => setExpandedChapters((prev) => ({ ...prev, [index]: !prev[index] }))}
          onChapterTitleChange={onChapterTitleChange}
          onSubchapterTitleChange={onSubchapterTitleChange}
          onReorderChapter={onReorderChapter}
          onSelectChapter={onSelectChapter}
          italianUi={italianUi}
        />

        <div className={cn("blueprint-theater-col-live lg:sticky lg:top-0", "min-h-[280px] lg:min-h-[420px]")}>
          <BlueprintLiveGenerationPanel
            pipeline={pipeline}
            stats={stats}
            narrativeEvents={narrativeEvents}
            generatingBlueprint={mode === "forge" && generatingBlueprint}
            blueprintElapsedSeconds={blueprintElapsedSeconds}
            italianUi={italianUi}
          />
        </div>
      </div>

      {footer ? <div className="blueprint-theater-footer mt-4 shrink-0">{footer}</div> : null}
    </div>
  );
}
