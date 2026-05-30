import { useState, useRef, useEffect, useMemo, useCallback, memo } from "react";
import { BookProject, SectionId, Chapter, GenerationStatus, ChapterLength, AIQualityRating } from "@/types/book";
import { Play, RefreshCw, Sparkles, Plus, Loader2, Star, Eye, PenLine, Search, ChevronDown, Target, Headphones, Download, Zap, Wand2, ListTree } from "lucide-react";
import { ChapterIntelligencePanel } from "@/components/ChapterIntelligencePanel";
import { ChapterGenerationExperience } from "@/components/ChapterGenerationExperience";
import { GenreProfileBadge } from "@/components/GenreProfileBadge";
import { EditorialMasteryBadge } from "@/components/EditorialMasteryBadge";
import { GenreCoachPanel } from "@/components/GenreCoachPanel";
import { downloadText } from "@/lib/download";
import { RewriteLevel, ChunkProgress } from "@/lib/generation";
import { resolveOutlineSummaryForDisplay, sanitizePlaceholderText } from "@/lib/generation-experience";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { WritingSettings } from "@/lib/settings";
import { formatChapterDisplayTitle, resolveChapterTitle } from "@/lib/chapter-titles";
import { WriterPipelineBar } from "@/components/WriterPipelineBar";

interface EditorPanelProps {
  project: BookProject;
  activeSection: SectionId | null;
  editorMode?: "edit" | "preview";
  onEditorModeChange?: (mode: "edit" | "preview") => void;
  onGenerateNext: () => void;
  onGenerateFrontMatter?: () => void;
  onGenerateBackMatter?: () => void;
  onGenerateChapter: (index: number) => void;
  onRegenerateChapter: (index: number) => void;
  onRewriteChapter: (index: number, level?: RewriteLevel) => void;
  onEvaluateChapter: (index: number) => void;
  onAutoRewrite?: (index: number, threshold: number) => void;
  onGenerateSubchapter: (chapterIndex: number, subIndex: number) => void;
  onUpdateChapterContent: (chapterIndex: number, content: string) => void;
  onUpdateChapterTitle?: (chapterIndex: number, title: string) => void;
  onUpdateSubchapterContent: (chapterIndex: number, subIndex: number, content: string) => void;
  onUpdateSubchapterTitle?: (chapterIndex: number, subIndex: number, title: string) => void;
  onSetChapterLengthOverride: (chapterIndex: number, length: string) => void;
  isGeneratingSection: (key: string) => boolean;
  onCancelGeneration?: (key?: string) => void;
  chunkProgress?: Record<string, ChunkProgress>;
  writingSettings?: WritingSettings;
  onUpdateBlueprintField?: (field: "overview" | "emotionalArc", value: string) => void;
  onUpdateBlueprintOutlineTitle?: (index: number, title: string) => void;
  onUpdateBlueprintOutlineSummary?: (index: number, summary: string) => void;
  onUpdateFrontMatterField?: (field: string, value: string) => void;
  onUpdateBackMatterField?: (field: string, value: string) => void;
  onApplyAuthorBrainFrontMatter?: () => void;
  onApplyAuthorBrainBackMatter?: () => void;
  onNarrateChapter?: (chapterIndex: number) => void;
  onNavigateSection?: (section: SectionId) => void;
  onOpenChapterIndex?: () => void;
  onGenerateBlueprint?: () => void;
  onGenerateFullBook?: () => void;
  isAnythingGenerating?: boolean;
}

export function EditorPanel({
  project, activeSection,
  editorMode = "edit",
  onEditorModeChange,
  onGenerateNext, onGenerateFrontMatter, onGenerateBackMatter, onGenerateChapter, onRegenerateChapter,
  onRewriteChapter, onEvaluateChapter, onGenerateSubchapter,
  onAutoRewrite,
  onUpdateChapterContent, onUpdateChapterTitle, onUpdateSubchapterContent, onUpdateSubchapterTitle,
  onSetChapterLengthOverride, isGeneratingSection,
  onCancelGeneration,
  chunkProgress,
  writingSettings,
  onUpdateBlueprintField, onUpdateBlueprintOutlineTitle, onUpdateBlueprintOutlineSummary,
  onUpdateFrontMatterField, onUpdateBackMatterField,
  onApplyAuthorBrainFrontMatter, onApplyAuthorBrainBackMatter,
  onNarrateChapter,
  onNavigateSection,
  onOpenChapterIndex,
  onGenerateBlueprint,
  onGenerateFullBook,
  isAnythingGenerating = false,
}: EditorPanelProps) {
  const { blueprint, frontMatter, chapters, backMatter, config, phase } = project;
  const [mode, setMode] = useState<"edit" | "preview">(editorMode);

  const ws = writingSettings || { fontFamily: "'Times New Roman', Times, serif", fontSize: 16, lineSpacing: 2 };

  useEffect(() => {
    setMode(editorMode);
  }, [editorMode]);

  const handleModeChange = useCallback((nextMode: "edit" | "preview") => {
    setMode(nextMode);
    onEditorModeChange?.(nextMode);
  }, [onEditorModeChange]);

  const view = useMemo(() => {
    if (!activeSection) return { type: "blueprint" as const };
    if (activeSection === "blueprint") return { type: "blueprint" as const };
    if (activeSection === "front-matter") return { type: "front-matter" as const };
    if (activeSection === "back-matter") return { type: "back-matter" as const };
    const chMatch = activeSection.match(/^chapter-(\d+)$/);
    if (chMatch) return { type: "chapter" as const, chapterIndex: parseInt(chMatch[1]) };
    const subMatch = activeSection.match(/^chapter-(\d+)-sub-(\d+)$/);
    if (subMatch) return { type: "subchapter" as const, chapterIndex: parseInt(subMatch[1]), subIndex: parseInt(subMatch[2]) };
    return { type: "blueprint" as const };
  }, [activeSection]);

  const hasContent = view.type === "chapter"
    ? !!(chapters[view.chapterIndex]?.content)
    : view.type === "subchapter"
      ? !!(chapters[view.chapterIndex]?.subchapters?.[view.subIndex]?.content)
      : view.type === "front-matter" ? !!frontMatter
        : view.type === "back-matter" ? !!backMatter
          : !!blueprint;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {hasContent && (
        <div className="flex h-14 shrink-0 items-center justify-center border-b border-white/10 bg-slate-950/70 backdrop-blur-xl shadow-sm shadow-slate-950/20">
          <div className="ios-segment">
          <button onClick={() => handleModeChange("edit")}
            className={cn("flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors",
              mode === "edit" ? "bg-white text-slate-950 shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.10]")}>
            <PenLine className="h-3.5 w-3.5" /> {t("edit")}
          </button>
          <button onClick={() => handleModeChange("preview")}
            className={cn("flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors",
              mode === "preview" ? "bg-white text-slate-950 shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.10]")}>
            <Eye className="h-3.5 w-3.5" /> {t("preview")}
          </button>
          </div>
        </div>
      )}

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
        <WriterContextBar
          activeSection={activeSection}
          project={project}
          isGeneratingSection={isGeneratingSection}
          onOpenChapterIndex={onOpenChapterIndex}
          onNavigateSection={onNavigateSection}
        />
        <WriterPipelineBar
          project={project}
          activeSection={activeSection}
          isGeneratingSection={isGeneratingSection}
          isAnythingGenerating={isAnythingGenerating}
          onGenerateBlueprint={onGenerateBlueprint}
          onGenerateFrontMatter={onGenerateFrontMatter || onGenerateNext}
          onGenerateChapter={onGenerateChapter}
          onGenerateBackMatter={onGenerateBackMatter || onGenerateNext}
          onGenerateFullBook={onGenerateFullBook}
          onNavigateSection={onNavigateSection}
        />
        <div className={cn("mx-auto px-4 py-6 sm:px-8", mode === "preview" ? "max-w-2xl" : "max-w-5xl")}>
          <div className={cn("ios-editor-paper max-w-full rounded-[32px] border border-white/10 bg-slate-950/95 p-5 shadow-[0_36px_120px_-40px_rgba(15,23,42,0.75)] ring-1 ring-white/10 sm:p-7 md:bg-slate-950/65", mode === "preview" && "bg-white/[0.055]")}>
          {mode === "preview" && hasContent ? (
            <PreviewMode project={project} view={view} ws={ws} />
          ) : (
            <>
              <div className="flex items-center gap-2 mb-6 flex-wrap rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.82)]">
                <GenreProfileBadge
                  genre={config.genre}
                  subcategory={config.subcategory}
                  className="flex-1 min-w-[200px]"
                />
                <EditorialMasteryBadge genre={config.genre} subcategory={config.subcategory} size="md" />
              </div>
              {view.type === "blueprint" && (
                <BlueprintView
                  project={project}
                  blueprint={blueprint}
                  isGenerating={isGeneratingSection("blueprint")}
                  onUpdateField={onUpdateBlueprintField}
                  onUpdateOutlineTitle={onUpdateBlueprintOutlineTitle}
                  onUpdateOutlineSummary={onUpdateBlueprintOutlineSummary}
                  onNavigateToChapter={onNavigateSection ? (index) => onNavigateSection(`chapter-${index}` as SectionId) : undefined}
                />
              )}
              {view.type === "front-matter" && (
                <FrontMatterView
                  project={project}
                  frontMatter={frontMatter}
                  isGenerating={isGeneratingSection("front-matter")}
                  onGenerate={onGenerateFrontMatter || onGenerateNext}
                  ws={ws}
                  onUpdateField={onUpdateFrontMatterField}
                  onApplyAuthorBrain={onApplyAuthorBrainFrontMatter}
                />
              )}
              {view.type === "chapter" && blueprint && (
                <ChapterView
                  project={project}
                  chapterIndex={view.chapterIndex}
                  outline={blueprint.chapterOutlines[view.chapterIndex]}
                  chapter={chapters[view.chapterIndex]}
                  isGenerating={isGeneratingSection(`chapter-${view.chapterIndex}`)}
                  isEvaluating={isGeneratingSection(`eval-${view.chapterIndex}`)}
                  onGenerate={() => onGenerateChapter(view.chapterIndex)}
                  onRegenerate={() => onRegenerateChapter(view.chapterIndex)}
                  onRewrite={(level?: RewriteLevel) => onRewriteChapter(view.chapterIndex, level)}
                  onEvaluate={() => onEvaluateChapter(view.chapterIndex)}
                  onAutoRewrite={onAutoRewrite ? (threshold: number) => onAutoRewrite(view.chapterIndex, threshold) : undefined}
                  onGenerateSubchapter={(subIdx) => onGenerateSubchapter(view.chapterIndex, subIdx)}
                  onUpdateContent={(content) => onUpdateChapterContent(view.chapterIndex, content)}
                  onUpdateTitle={onUpdateChapterTitle ? (title: string) => onUpdateChapterTitle(view.chapterIndex, title) : undefined}
                  onUpdateSubContent={(subIdx, content) => onUpdateSubchapterContent(view.chapterIndex, subIdx, content)}
                  onUpdateSubTitle={onUpdateSubchapterTitle ? (subIdx: number, title: string) => onUpdateSubchapterTitle(view.chapterIndex, subIdx, title) : undefined}
                  onSetLengthOverride={(len) => onSetChapterLengthOverride(view.chapterIndex, len)}
                  isGeneratingSection={isGeneratingSection}
                  onCancel={onCancelGeneration ? () => onCancelGeneration(`chapter-${view.chapterIndex}`) : undefined}
                  chunkProgress={chunkProgress?.[`chapter-${view.chapterIndex}`]}
                  ws={ws}
                  onNarrateChapter={onNarrateChapter}
                  onOpenChapterIndex={onOpenChapterIndex}
                  onNavigateSection={onNavigateSection}
                />
              )}
              {view.type === "subchapter" && (() => {
                const ch = chapters[view.chapterIndex];
                const sub = ch?.subchapters?.[view.subIndex];
                if (!ch || !sub) return <EmptyState text="Subchapter not yet generated." />;
                return (
                  <SubchapterView
                    chapterIndex={view.chapterIndex} subIndex={view.subIndex}
                    chapterTitle={ch.title} sub={sub}
                    isGenerating={isGeneratingSection(`chapter-${view.chapterIndex}-sub-${view.subIndex}`)}
                    onUpdateContent={(content) => onUpdateSubchapterContent(view.chapterIndex, view.subIndex, content)}
                    onUpdateTitle={onUpdateSubchapterTitle ? (title: string) => onUpdateSubchapterTitle(view.chapterIndex, view.subIndex, title) : undefined}
                    ws={ws}
                  />
                );
              })()}
              {view.type === "back-matter" && (
                <BackMatterView project={project} backMatter={backMatter} phase={phase} isGenerating={isGeneratingSection("back-matter")} onGenerate={onGenerateBackMatter || onGenerateNext} ws={ws} onUpdateField={onUpdateBackMatterField} onApplyAuthorBrain={onApplyAuthorBrainBackMatter} />
              )}
            
      
    </>

          )}
          </div>
        </div>
      </div>
</div>
  );

}

/* ============ Preview Mode ============ */

function PreviewMode({ project, view, ws }: { project: BookProject; view: any; ws: WritingSettings }) {
  const { config, blueprint, frontMatter, chapters, backMatter } = project;
  const proseStyle = { fontFamily: ws.fontFamily, fontSize: `${ws.fontSize}px`, lineHeight: `${ws.lineSpacing}` };

  return (
    <div className="overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/60 shadow-[0_40px_90px_-35px_rgba(15,23,42,0.75)]">
      <div className="p-10 space-y-6" style={proseStyle}>
        {view.type === "blueprint" && blueprint && (
          <>
            <div className="text-center py-8 border-b border-border/20">
              <h1 className="text-2xl font-bold text-foreground">{config.title}</h1>
              {config.subtitle && <p className="text-base text-muted-foreground mt-2 italic">{config.subtitle}</p>}
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground/50 mb-3">{t("table_of_contents")}</p>
              <ol className="space-y-1.5">
                {blueprint.chapterOutlines.map((o, i) => (
                  <li key={`row-${i}`} className="text-foreground/70" style={{ fontSize: `${ws.fontSize}px` }}>
                    <span className="text-muted-foreground mr-2">{i + 1}.</span>
                    {chapters[i]?.title || o.title}
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}
        {view.type === "front-matter" && frontMatter && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-foreground text-center pb-4 border-b border-border/20">{t("front_matter")}</h2>
            {Object.entries(frontMatter).map(([key, val]) => (
              <div key={key}>
                <h3 className="text-xs uppercase text-muted-foreground/70 mb-2">{key.replace(/([A-Z])/g, " $1").trim()}</h3>
                <p className="text-foreground/80 whitespace-pre-wrap">{val}</p>
              </div>
            ))}
          </div>
        )}
        {view.type === "chapter" && (() => {
          const ch = chapters[view.chapterIndex];
          if (!ch?.content) return <p className="text-muted-foreground/40 italic text-center py-16">Chapter not yet generated.</p>;
          return (
            <div className="space-y-6">
              <div className="text-center pb-6 border-b border-border/20">
                <p className="text-xs uppercase text-primary/60 mb-1">{t("chapters")} {view.chapterIndex + 1}</p>
                <h2 className="text-xl font-bold text-foreground">{ch.title}</h2>
              </div>
              <div className="text-foreground/80 whitespace-pre-wrap">{ch.content}</div>
              {ch.subchapters.map((sub, j) => (
                <div key={j} className="mt-8">
                  <h3 className="text-base font-semibold text-foreground/90 mb-3">{sub.title}</h3>
                  <div className="text-foreground/75 whitespace-pre-wrap">{sub.content}</div>
                </div>
              ))}
            </div>
          );
        })()}
        {view.type === "subchapter" && (() => {
          const sub = chapters[view.chapterIndex]?.subchapters?.[view.subIndex];
          if (!sub) return <p className="text-muted-foreground/40 italic text-center py-16">Subchapter not yet generated.</p>;
          return (
            <div className="space-y-4">
              <div className="pb-4 border-b border-border/20">
                <p className="text-xs uppercase text-primary/60 mb-1">{t("chapters")} {view.chapterIndex + 1} › {view.subIndex + 1}</p>
                <h2 className="text-lg font-bold text-foreground">{sub.title}</h2>
              </div>
              <div className="text-foreground/80 whitespace-pre-wrap">{sub.content}</div>
            </div>
          );
        })()}
        {view.type === "back-matter" && backMatter && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-foreground text-center pb-4 border-b border-border/20">{t("back_matter")}</h2>
            {Object.entries(backMatter).map(([key, val]) => (
              <div key={key}>
                <h3 className="text-xs uppercase text-muted-foreground/70 mb-2">{key.replace(/([A-Z])/g, " $1").trim()}</h3>
                <p className="text-foreground/80 whitespace-pre-wrap">{val}</p>
              </div>
            ))}
          </div>
        )}
      </div>
</div>
  );

}

/* ============ Section Views ============ */

function WriterContextBar({
  activeSection,
  project,
  isGeneratingSection,
  onOpenChapterIndex,
  onNavigateSection,
}: {
  activeSection: SectionId | null;
  project: BookProject;
  isGeneratingSection: (key: string) => boolean;
  onOpenChapterIndex?: () => void;
  onNavigateSection?: (section: SectionId) => void;
}) {
  if (!onOpenChapterIndex) return null;

  const chapterMatch = activeSection?.match(/^chapter-(\d+)$/);
  const chapterIndex = chapterMatch ? Number(chapterMatch[1]) : null;
  const outline = chapterIndex !== null ? project.blueprint?.chapterOutlines[chapterIndex] : undefined;
  const isGeneratingChapter = chapterIndex !== null && isGeneratingSection(`chapter-${chapterIndex}`);

  let locationLabel = t("blueprint");
  if (activeSection === "front-matter") locationLabel = t("front_matter");
  else if (activeSection === "back-matter") locationLabel = t("back_matter");
  else if (chapterIndex !== null) {
    locationLabel = formatChapterDisplayTitle(chapterIndex, outline?.title || "", {
      config: project.config,
      summary: outline?.summary,
      totalChapters: project.config.numberOfChapters,
    });
  }

  return (
    <div className="scriptora-writer-context-bar sticky top-0 z-20 border-b border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur-xl sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <button type="button" onClick={onOpenChapterIndex} className="scriptora-writer-nav-primary">
            <ListTree className="h-4 w-4 shrink-0" />
            {t("back_to_chapter_index")}
          </button>
          {onNavigateSection && activeSection !== "blueprint" && (
            <button
              type="button"
              onClick={() => onNavigateSection("blueprint")}
              className="scriptora-writer-nav-secondary"
            >
              {t("blueprint")}
            </button>
          )}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate font-medium text-foreground/85">{locationLabel}</span>
          {isGeneratingChapter && (
            <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-200">
              {t("generation_running")}
            </span>
          )}
          <span className="hidden sm:inline">{t("writer_nav_hint")}</span>
        </div>
      </div>
    </div>
  );
}

function BlueprintView({ project, blueprint, isGenerating, onUpdateField, onUpdateOutlineTitle, onUpdateOutlineSummary, onNavigateToChapter }: {
  project: BookProject;
  blueprint: BookProject["blueprint"];
  isGenerating: boolean;
  onUpdateField?: (field: "overview" | "emotionalArc", value: string) => void;
  onUpdateOutlineTitle?: (index: number, title: string) => void;
  onUpdateOutlineSummary?: (index: number, summary: string) => void;
  onNavigateToChapter?: (index: number) => void;
}) {
  return (
    <div className="space-y-8 rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.72)]">
      <PageHeader title={t("blueprint")} subtitle={t("blueprint_subtitle")} />
      {isGenerating && <LoadingBanner text={`${t("generating")}...`} />}
      {blueprint ? (
        <>
          <div className="prose-zone">
            <textarea
              value={blueprint.overview}
              onChange={(e) => onUpdateField?.("overview", e.target.value)}
              readOnly={!onUpdateField}
              rows={Math.max(4, blueprint.overview.split("\n").length + 1)}
              className="w-full bg-transparent border border-transparent hover:border-border/40 focus:border-primary/50 focus:outline-none rounded-md p-2 text-[15px] leading-8 text-foreground/[0.85] font-serif resize-none"
            />
          </div>
          {blueprint.themes.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-3">{t("themes")}</p>
              <div className="flex flex-wrap gap-2">
                {blueprint.themes.map((th, i) => (
                  <span key={`row-${i}`} className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium">{th}</span>
                ))}
              </div>
            </div>
          )}
          {blueprint.emotionalArc && (
            <div className="p-5 rounded-lg bg-muted/20 border border-border/40">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-2">{t("emotional_arc")}</p>
              <textarea
                value={blueprint.emotionalArc}
                onChange={(e) => onUpdateField?.("emotionalArc", e.target.value)}
                readOnly={!onUpdateField}
                rows={Math.max(2, blueprint.emotionalArc.split("\n").length + 1)}
                className="w-full bg-transparent border border-transparent hover:border-border/40 focus:border-primary/50 focus:outline-none rounded-md p-2 text-sm text-foreground/70 leading-7 resize-none"
              />
            </div>
          )}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-4">{t("chapter_outlines")}</p>
            <div className="space-y-3">
              {blueprint.chapterOutlines.map((o, i) => {
                const summaryDisplay = resolveOutlineSummaryForDisplay(o.summary, project.chapters?.[i]?.content);
                return (
                <div
                  key={`row-${i}`}
                  className={cn(
                    "flex gap-4 p-4 rounded-lg bg-muted/15 border border-border/30 transition-colors",
                    onNavigateToChapter && "hover:bg-muted/30 cursor-pointer group",
                  )}
                  {...(onNavigateToChapter
                    ? {
                        role: "button" as const,
                        tabIndex: 0,
                        onClick: () => onNavigateToChapter(i),
                        onKeyDown: (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onNavigateToChapter(i);
                          }
                        },
                      }
                    : {})}
                >
                  <span className="text-sm font-bold text-primary/50 shrink-0 pt-0.5 w-6 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        value={
                          o.title?.trim()
                            ? o.title
                            : (project.chapters?.[i]?.title?.trim() || "")
                        }
                        onChange={(e) => onUpdateOutlineTitle?.(i, e.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        readOnly={!onUpdateOutlineTitle}
                        className="w-full bg-transparent border border-transparent hover:border-border/40 focus:border-primary/50 focus:outline-none rounded px-1 text-sm font-semibold text-foreground"
                      />
                      {onNavigateToChapter && (
                        <span className="shrink-0 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary opacity-0 transition-opacity group-hover:opacity-100">
                          {t("open_chapter")}
                        </span>
                      )}
                    </div>
                    <textarea
                      value={summaryDisplay}
                      onChange={(e) => onUpdateOutlineSummary?.(i, e.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      readOnly={!onUpdateOutlineSummary}
                      placeholder={summaryDisplay ? undefined : t("outline_summary_pending")}
                      rows={Math.max(2, summaryDisplay.split("\n").length || 2)}
                      className="w-full mt-1 bg-transparent border border-transparent hover:border-border/40 focus:border-primary/50 focus:outline-none rounded px-1 text-xs text-muted-foreground leading-relaxed resize-none placeholder:text-muted-foreground/50"
                    />
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center space-y-4">
          <p className="text-sm text-muted-foreground">{t("blueprint_empty_cta")}</p>
        </div>
      )}
</div>
  );

}

/* ============ Author Brain matter helpers ============ */

const FRONT_MATTER_ORDER = ["titlePage", "copyright", "dedication", "aboutAuthor", "howToUse", "letterToReader"] as const;
const BACK_MATTER_ORDER = ["conclusion", "authorNote", "callToAction", "reviewRequest", "otherBooks", "followAuthor"] as const;

function matterFieldLabel(key: string): string {
  const labels: Record<string, string> = {
    titlePage: "Title Page",
    copyright: "Copyright",
    dedication: "Dedication",
    aboutAuthor: t("matter_aboutAuthor"),
    howToUse: "How to Use",
    letterToReader: "Letter to the Reader",
    conclusion: "Conclusion",
    authorNote: "Author Note",
    callToAction: "What's Next",
    reviewRequest: "Review Request",
    otherBooks: t("matter_otherBooks"),
    followAuthor: t("matter_followAuthor"),
  };
  return labels[key] || key.replace(/([A-Z])/g, " $1").trim();
}

function orderedMatterEntries(record: Record<string, string> | null | undefined, order: readonly string[]) {
  if (!record) return [] as Array<[string, string]>;
  const optionalHideWhenEmpty = new Set(["followAuthor", "otherBooks"]);
  return order
    .filter((key) => key in record)
    .map((key) => [key, String(record[key] ?? "")] as [string, string])
    .filter(([key, val]) => !optionalHideWhenEmpty.has(key) || val.trim().length > 0);
}

function AuthorBrainMatterHint({
  project,
  scope,
  onApply,
}: {
  project: BookProject;
  scope: "front" | "back";
  onApply?: () => void;
}) {
  if (!authorBrainProfileHasInjectionData(project.config)) return null;
  const snapshot = buildAuthorBrainInjectionSnapshot(project.config);
  const canApply = scope === "front" ? Boolean(snapshot.aboutAuthor) : Boolean(snapshot.otherBooks || snapshot.followAuthor);
  if (!canApply || !onApply) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-fuchsia-300/20 bg-fuchsia-500/[0.08] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2.5">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-200" />
        <div>
          <p className="text-xs font-semibold text-foreground">{t("author_brain_prepared_hint")}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {hasPassiveAuthorIntelligence(project.config.authorIdentity)
              ? t("author_brain_passive_aligned")
              : t("author_brain_using_profile")}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onApply}
        className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/15 px-3 text-[11px] font-bold text-primary transition-colors hover:bg-primary/25"
      >
        <Wand2 className="h-3.5 w-3.5" />
        {scope === "front" ? t("author_brain_apply_front") : t("author_brain_apply_back")}
      </button>
    </div>
  );
}

function FrontMatterView({ project, frontMatter, isGenerating, onGenerate, ws, onUpdateField, onApplyAuthorBrain }: {
  project: BookProject; frontMatter: BookProject["frontMatter"]; isGenerating: boolean; onGenerate: () => void; ws: WritingSettings;
  onUpdateField?: (field: string, value: string) => void;
  onApplyAuthorBrain?: () => void;
}) {
  // Front matter can be generated/regenerated any time the blueprint exists.
  const canGenerate = !!project.blueprint;
  return (
    <div className="space-y-8 rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.72)]">
      <div className="flex items-center justify-between">
        <PageHeader title={t("front_matter")} subtitle="Title page, dedication, and introductory content" />
        {canGenerate && (
          <button onClick={onGenerate} disabled={isGenerating}
            className="flex items-center gap-2 h-10 px-5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {frontMatter ? t("regenerate") || "Regenerate" : t("generate")}
          </button>
        )}
      </div>
      {isGenerating && <LoadingBanner text={`${t("generating")}...`} />}
      <AuthorBrainMatterHint project={project} scope="front" onApply={onApplyAuthorBrain} />
      {frontMatter ? (
        <div className="space-y-8">
          {orderedMatterEntries(frontMatter as Record<string, string>, FRONT_MATTER_ORDER).map(([key, val]) => (
            <div key={key}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-3">{matterFieldLabel(key)}</p>
              <textarea
                value={val as string}
                onChange={(e) => onUpdateField?.(key, e.target.value)}
                readOnly={!onUpdateField}
                rows={Math.max(3, String(val).split("\n").length + 1)}
                className="w-full bg-transparent border border-transparent hover:border-border/40 focus:border-primary/50 focus:outline-none rounded-md p-2 text-foreground/[0.85] resize-none"
                style={{ fontFamily: ws.fontFamily, fontSize: `${ws.fontSize}px`, lineHeight: `${ws.lineSpacing}` }}
              />
            </div>
          ))}
        </div>
      ) : (
        !isGenerating && <EmptyState text={canGenerate ? `Click ${t("generate")} to create front matter.` : "Complete the blueprint first."} />
      )}
</div>
  );

}

function ChapterView({
  project, chapterIndex, outline, chapter, isGenerating, isEvaluating,
  onGenerate, onRegenerate, onRewrite, onEvaluate, onAutoRewrite, onGenerateSubchapter,
  onUpdateContent, onUpdateTitle, onUpdateSubContent, onUpdateSubTitle, onSetLengthOverride, isGeneratingSection, onCancel, chunkProgress, ws,
  onNarrateChapter,
  onOpenChapterIndex,
}: {
  project: BookProject; chapterIndex: number;
  outline: { title: string; summary: string }; chapter: Chapter | undefined;
  isGenerating: boolean; isEvaluating: boolean;
  onGenerate: () => void; onRegenerate: () => void; onRewrite: (level?: RewriteLevel) => void; onEvaluate: () => void;
  onAutoRewrite?: (threshold: number) => void;
  onGenerateSubchapter: (subIdx: number) => void;
  onUpdateContent: (content: string) => void;
  onUpdateTitle?: (title: string) => void;
  onUpdateSubContent: (subIdx: number, content: string) => void;
  onUpdateSubTitle?: (subIdx: number, title: string) => void;
  onSetLengthOverride: (length: string) => void; isGeneratingSection: (key: string) => boolean;
  onCancel?: () => void;
  chunkProgress?: ChunkProgress;
  ws: WritingSettings;
  onNarrateChapter?: (chapterIndex: number) => void;
  onOpenChapterIndex?: () => void;
  onNavigateSection?: (section: SectionId) => void;
}) {
  const isGenerated = chapter && chapter.content.length > 0;
  const currentLength = chapter?.lengthOverride || project.config.chapterLength;
  const [showRewriteMenu, setShowRewriteMenu] = useState(false);
  const [showIntelligence, setShowIntelligence] = useState(false);

  const displayedTitle = resolveChapterTitle(isGenerated ? (chapter!.title || outline.title) : outline.title, chapterIndex, {
    config: project.config,
    summary: outline.summary,
    totalChapters: project.config.numberOfChapters,
  });
  const chapterDisplayLabel = formatChapterDisplayTitle(chapterIndex, displayedTitle, {
    config: project.config,
    summary: outline.summary,
    totalChapters: project.config.numberOfChapters,
  });

  return (
    <div className="space-y-8 rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.72)]">
      {onOpenChapterIndex && (
        <button
          type="button"
          onClick={onOpenChapterIndex}
          className="scriptora-writer-nav-primary w-full sm:w-auto"
        >
          <ListTree className="h-4 w-4 shrink-0" />
          {t("back_to_chapter_index")}
        </button>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="mb-2 flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">
            {chapterDisplayLabel}
          </p>
          <EditableTitle
            value={displayedTitle}
            onChange={(v) => onUpdateTitle?.(v)}
            disabled={!onUpdateTitle}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1 sm:shrink-0 sm:justify-end" data-guided-tour="writer-generate">
          {!isGenerated ? (
            <button onClick={onGenerate} disabled={isGenerating || !project.blueprint}
              className="flex items-center gap-2 h-10 px-5 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 transition-colors">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {t("generate")}
            </button>
          ) : (
            <>
              <ActionButton icon={<Download className="h-3.5 w-3.5" />} title="TXT" onClick={() => downloadText(`chapter-${chapterIndex + 1}-${(chapter?.title || "chapter").replace(/\s+/g, "_")}.txt`, chapter?.content || "")} disabled={!isGenerated} />
              <button
                onClick={() => setShowIntelligence(true)}
                disabled={isGenerating || isEvaluating}
                title={t("chapter_doctor_tooltip")}
                className="h-9 flex items-center gap-1.5 px-3 rounded-lg text-[11px] font-semibold bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90 disabled:opacity-30 transition-opacity"
              >
                <Zap className="h-3.5 w-3.5" /> {t("chapter_doctor")}
              </button>
              <ActionButton icon={<Search className="h-3.5 w-3.5" />} title={t("evaluate")} onClick={onEvaluate} disabled={isGenerating || isEvaluating} />

              <ActionButton
                icon={<Headphones className="h-3.5 w-3.5" />}
                title="Narrate Chapter"
                onClick={() => onNarrateChapter?.(chapterIndex)}
                disabled={!isGenerated || isGenerating || isEvaluating}
              />
              <ActionButton icon={<RefreshCw className="h-3.5 w-3.5" />} title={t("regenerate")} onClick={onRegenerate} disabled={isGenerating} />
              
              {/* Rewrite with levels */}
              <div className="relative">
                <button onClick={() => setShowRewriteMenu(!showRewriteMenu)} disabled={isGenerating}
                  className="h-9 flex items-center gap-1 px-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-30 transition-colors">
                  <Sparkles className="h-3.5 w-3.5" />
                  <ChevronDown className="h-3 w-3" />
                </button>
                {showRewriteMenu && (
                  <div className="absolute right-0 top-10 z-20 w-56 max-w-[calc(100vw-2rem)] overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/95 p-1 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.55)]">
                    {([
                      { level: "light" as RewriteLevel, label: "Light Polish", desc: "Fix phrasing, tighten prose" },
                      { level: "deep" as RewriteLevel, label: "Deep Rewrite", desc: "Restructure + fresh insights" },
                      { level: "bestseller" as RewriteLevel, label: "Bestseller Upgrade", desc: "Total transformation" },
                    ]).map(opt => (
                      <button key={opt.level} onClick={() => { onRewrite(opt.level); setShowRewriteMenu(false); }}
                        className="w-full text-left rounded-2xl px-3 py-2 hover:bg-white/5 transition-colors">
                        <p className="text-xs font-semibold text-white">{opt.label}</p>
                        <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                      </button>
                    ))}
                    {onAutoRewrite && (
                      <>
                        <div className="border-t border-white/10 my-1" />
                        {[3, 4, 5].map(th => (
                          <button key={th} onClick={() => { onAutoRewrite(th); setShowRewriteMenu(false); }}
                            className="w-full text-left rounded-2xl px-3 py-1.5 hover:bg-white/5 transition-colors flex items-center gap-2">
                            <Target className="h-3 w-3 text-primary" />
                            <span className="text-[11px] text-foreground">Auto to {th}/5</span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <span className="text-[11px] text-muted-foreground uppercase">{t("chapter_length")}</span>
        {(["short", "medium", "long"] as const).map(len => (
          <button key={len} onClick={() => onSetLengthOverride(len)}
            className={cn(
              "px-3 py-1 rounded-full text-[11px] font-semibold transition-colors border",
              currentLength === len
                ? "border-primary bg-primary/15 text-primary"
                : "border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}>
            {t(len)}
          </button>
        ))}
      </div>

      {isGenerating && (
        <ChapterGenerationExperience
          project={project}
          chapterIndex={chapterIndex}
          outline={outline}
          onCancel={onCancel}
          onBackToChapters={onOpenChapterIndex}
          chunkProgress={chunkProgress}
        />
      )}
      {isEvaluating && <LoadingBanner text={`${t("evaluate")}...`} />}

      {/* Error retry state */}
      {!isGenerating && chapter?.status === "error" && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-lg bg-destructive/5 border border-destructive/20 animate-fade-in">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <span className="text-sm text-destructive font-medium flex-1">{t("generation_failed")}</span>
          <button onClick={onGenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">
            <RefreshCw className="h-3 w-3" /> {t("retry")}
          </button>
        </div>
      )}

      {!isGenerated && !isGenerating && chapter?.status !== "error" && (
        <div className="space-y-4">
          {sanitizePlaceholderText(outline.summary) && (
            <p className="text-sm text-muted-foreground leading-relaxed">{sanitizePlaceholderText(outline.summary)}</p>
          )}
          <p className="text-xs text-muted-foreground">{t("chapter_write_or_generate")}</p>
          <EditableBlock
            content={chapter?.content ?? ""}
            onChange={onUpdateContent}
            ws={ws}
          />
        </div>
      )}

      {isGenerated && (
        <>
          <AIRatingCard rating={chapter.aiRating} />
          <EditableBlock content={chapter.content} onChange={onUpdateContent} ws={ws} />

          {chapter.subchapters.length > 0 && (
            <div className="space-y-6 mt-10">
              <div className="border-t border-border/30 pt-8">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-6">{t("subchapters")}</p>
              </div>
              {chapter.subchapters.map((sub, j) => {
                const subGenerating = isGeneratingSection(`chapter-${chapterIndex}-sub-${j}`);
                return (
                  <div key={j} className="pl-6 border-l-2 border-primary/15 space-y-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-primary/40 font-mono text-sm shrink-0">{chapterIndex + 1}.{j + 1}</span>
                      <EditableTitle
                        value={sub.title}
                        onChange={(v) => onUpdateSubTitle?.(j, v)}
                        disabled={!onUpdateSubTitle}
                        size="sm"
                      />
                    </div>
                    {subGenerating && <LoadingBanner text={`${t("generating")}...`} />}
                    <EditableBlock content={sub.content} onChange={(val) => onUpdateSubContent(j, val)} ws={ws} />
                  </div>
                );
              })}
            </div>
          )}

          {project.config.subchaptersEnabled && (
            <button onClick={() => onGenerateSubchapter(chapter.subchapters.length)} disabled={isGenerating}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors ml-6 mt-3">
              <Plus className="h-3.5 w-3.5" /> {t("add_subchapter")}
            </button>
          )}
        </>
      )}

      {isGenerated && (
        <GenreCoachPanel
          chapterTitle={displayedTitle}
          chapterText={chapter?.content || ""}
          genre={project.config.genre}
          subcategory={project.config.subcategory}
          language={project.config.language}
          project={project}
          chapterIndex={chapterIndex}
        />
      )}

      {showIntelligence && isGenerated && (
        <ChapterIntelligencePanel
          project={project}
          chapterIndex={chapterIndex}
          onClose={() => setShowIntelligence(false)}
          onApplyContent={(newContent) => onUpdateContent(newContent)}
        />
      )}
</div>
  );

}

/* ============ AI Rating Card ============ */

function AIRatingCard({ rating }: { rating?: AIQualityRating }) {
  if (!rating) return null;
  const scoreColor = rating.score >= 4 ? "text-[hsl(var(--success))]" : rating.score >= 3 ? "text-[hsl(var(--warning))]" : "text-destructive";

  return (
    <div className="p-5 rounded-lg bg-muted/15 border border-border/40 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase">{t("ai_quality_rating")}</span>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(s => (
            <Star key={s} className={cn("h-4 w-4", s <= rating.score ? `${scoreColor} fill-current` : "text-muted-foreground/20")} />
          ))}
          <span className={cn("text-sm font-bold ml-1", scoreColor)}>{rating.score}/5</span>
        </div>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed">{rating.explanation}</p>
      {rating.missing && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">{t("whats_missing")}</p>
          <p className="text-xs text-foreground/60 leading-relaxed">{rating.missing}</p>
        </div>
      )}
      {rating.improvements && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">{t("how_to_improve")}</p>
          <p className="text-xs text-foreground/60 leading-relaxed">{rating.improvements}</p>
        </div>
      )}
</div>
  );

}

function SubchapterView({
  chapterIndex, subIndex, chapterTitle, sub, isGenerating, onUpdateContent, onUpdateTitle, ws,
}: {
  chapterIndex: number; subIndex: number; chapterTitle: string;
  sub: { title: string; content: string }; isGenerating: boolean;
  onUpdateContent: (content: string) => void;
  onUpdateTitle?: (title: string) => void;
  ws: WritingSettings;
}) {
  return (
    <div className="space-y-8">
      <div className="mb-2">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">
          {`${t("chapters")} ${chapterIndex + 1}: ${chapterTitle}`}
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-primary/50 font-mono text-base shrink-0">{chapterIndex + 1}.{subIndex + 1}</span>
          <EditableTitle
            value={sub.title}
            onChange={(v) => onUpdateTitle?.(v)}
            disabled={!onUpdateTitle}
          />
        </div>
      </div>
      {isGenerating && <LoadingBanner text={`${t("generating")}...`} />}
      <EditableBlock content={sub.content} onChange={onUpdateContent} ws={ws} />
</div>
  );

}

function BackMatterView({ project, backMatter, phase, isGenerating, onGenerate, ws, onUpdateField, onApplyAuthorBrain }: {
  project: BookProject; backMatter: BookProject["backMatter"]; phase: string; isGenerating: boolean; onGenerate: () => void; ws: WritingSettings;
  onUpdateField?: (field: string, value: string) => void;
  onApplyAuthorBrain?: () => void;
}) {
  const missingChapters = Array.from({ length: project.config.numberOfChapters }, (_, i) => i)
    .filter((i) => !((project.chapters[i]?.content || "").trim().length > 50));
  const canGenerate = !!project.blueprint && missingChapters.length === 0;

  return (
    <div className="space-y-8 rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.72)]">
      <div className="flex items-center justify-between">
        <PageHeader title={t("back_matter")} subtitle="Conclusion, author note, and closing content" />
        {!backMatter && (
          <button onClick={onGenerate} disabled={isGenerating || !canGenerate}
            className="flex items-center gap-2 h-10 px-5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {t("generate")}
          </button>
        )}
      </div>
      {!canGenerate && !backMatter && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-5 py-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-foreground">Completa prima tutti i capitoli.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Mancano {missingChapters.length} capitoli: {missingChapters.slice(0, 8).map((i) => i + 1).join(", ")}
              {missingChapters.length > 8 ? ` +${missingChapters.length - 8}` : ""}.
            </p>
          </div>
        </div>
      )}
      {isGenerating && <LoadingBanner text={`${t("generating")}...`} />}
      <AuthorBrainMatterHint project={project} scope="back" onApply={onApplyAuthorBrain} />
      {backMatter ? (
        <div className="space-y-8">
          {orderedMatterEntries(backMatter as Record<string, string>, BACK_MATTER_ORDER).map(([key, val]) => (
            <div key={key}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-3">{matterFieldLabel(key)}</p>
              <textarea
                value={val as string}
                onChange={(e) => onUpdateField?.(key, e.target.value)}
                readOnly={!onUpdateField}
                rows={Math.max(3, String(val).split("\n").length + 1)}
                className="w-full bg-transparent border border-transparent hover:border-border/40 focus:border-primary/50 focus:outline-none rounded-md p-2 text-foreground/[0.85] resize-none"
                style={{ fontFamily: ws.fontFamily, fontSize: `${ws.fontSize}px`, lineHeight: `${ws.lineSpacing}` }}
              />
            </div>
          ))}
        </div>
      ) : (
        !isGenerating && <EmptyState text={`Click ${t("generate")} to create back matter.`} />
      )}
      {phase === "complete" && backMatter && (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            ✅ {t("complete_msg")}
          </div>
        </div>
      )}
</div>
  );

}

/* ============ Shared Components ============ */

function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground/70 mt-2">{subtitle}</p>}
</div>
  );

}

/**
 * EditableTitle — click-to-edit title with auto-save on blur or Enter.
 * Falls back to plain heading when `disabled` (no onChange wiring).
 */
const EditableTitle = memo(function EditableTitle({
  value,
  onChange,
  disabled = false,
  size = "lg",
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  size?: "sm" | "lg";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onChange(trimmed);
    else setDraft(value);
    setEditing(false);
  };

  const cancel = () => { setDraft(value); setEditing(false); };

  const baseClass = size === "lg"
    ? "text-2xl font-bold text-foreground"
    : "text-base font-semibold text-foreground/90";

  if (editing && !disabled) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          else if (e.key === "Escape") { e.preventDefault(); cancel(); }
        }}
        className={cn(
          baseClass,
          "w-full bg-transparent border-b-2 border-primary/60 focus:outline-none focus:border-primary px-0 py-0.5",
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => !disabled && setEditing(true)}
      title={disabled ? undefined : "Click to edit title"}
      className={cn(
        baseClass,
        "group inline-flex items-baseline gap-2 text-left max-w-full",
        !disabled && "cursor-text hover:text-primary transition-colors",
        disabled && "cursor-default",
      )}
    >
      <span className="truncate">{value || (disabled ? "" : "Untitled")}</span>
      {!disabled && (
        <PenLine className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
      )}
    </button>
  );
}, (prev, next) =>
  prev.value === next.value &&
  prev.disabled === next.disabled &&
  prev.size === next.size &&
  prev.onChange === next.onChange,
);



function LoadingBanner({ text }: { text: string }) {
  return (
    <div className="scriptora-loading-banner animate-fade-in rounded-3xl border border-white/10 bg-slate-950/70 p-4">
      <div className="scriptora-loading-icon">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-white">{text}</div>
        <div className="scriptora-loading-subline">
          <span className="scriptora-loading-dots" aria-hidden="true"><i /><i /><i /></span>
        </div>
      </div>
</div>
  );

}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-16 text-center rounded-3xl border border-white/10 bg-white/5">
      <p className="text-sm text-muted-foreground/60">{text}</p>
</div>
  );

}

function ActionButton({ icon, title, onClick, disabled }: { icon: React.ReactNode; title: string; onClick: () => void; disabled: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} aria-label={title}
      className="flex h-10 min-w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.08] px-2.5 text-foreground/80 transition-colors hover:border-white/20 hover:bg-white/12 hover:text-white disabled:opacity-30 sm:h-9">
      {icon}
      <span className="sr-only">{title}</span>
    </button>
  );
}

const EditableBlock = memo(function EditableBlock({
  content,
  onChange,
  ws,
}: { content: string; onChange: (val: string) => void; ws?: WritingSettings }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fontStyle = ws ? { fontFamily: ws.fontFamily, fontSize: `${ws.fontSize}px`, lineHeight: `${ws.lineSpacing}` } : {};

  // CRITICAL: do NOT reset editValue while user is editing.
  // During AI streaming, parent passes a new `content` ~6×/sec — without this
  // guard the user's draft would be wiped on every token, and the component
  // would re-render uselessly even when the user isn't editing.
  useEffect(() => {
    if (!isEditing) setEditValue(content);
  }, [content, isEditing]);

  // Auto-grow textarea only while editing — keep dependency tight.
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [isEditing, editValue]);

  if (isEditing) {
    return (
      <div className="relative">
        <textarea ref={textareaRef} value={editValue}
          onChange={e => { setEditValue(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
          onBlur={() => { onChange(editValue); setIsEditing(false); }}
          className="w-full text-foreground/[0.85] bg-muted/10 border border-primary/20 rounded-lg p-5 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
          style={fontStyle}
          autoFocus />
        <span className="absolute top-3 right-4 text-[9px] text-primary/50 uppercase font-sans">{t("editing")}</span>
      </div>
    );
  }

  return (
    <div onClick={() => setIsEditing(true)}
      className="text-foreground/[0.85] whitespace-pre-wrap cursor-text rounded-[28px] p-5 hover:bg-slate-950/75 transition-colors border border-white/10 bg-slate-950/30 min-h-[140px]"
      style={fontStyle}
      title={t("click_to_edit")}>
      {content || <span className="text-muted-foreground/40 italic">{t("empty_click_to_add")}</span>}
</div>
  );

}, (prev, next) => {
  // Skip re-render when content + ws + onChange ref are stable.
  // onChange is typically a useCallback in the parent, so reference equality holds.
  return prev.content === next.content && prev.onChange === next.onChange && prev.ws === next.ws;
}
);