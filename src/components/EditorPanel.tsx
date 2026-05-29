import { useState, useRef, useEffect, useMemo, useCallback, memo } from "react";
import { BookProject, SectionId, Chapter, GenerationStatus, ChapterLength, AIQualityRating } from "@/types/book";
import { Play, RefreshCw, Sparkles, Plus, Loader2, Star, Eye, PenLine, Search, ChevronDown, Target, Square, Headphones, Download, Zap } from "lucide-react";
import { ChapterIntelligencePanel } from "@/components/ChapterIntelligencePanel";
import { GenreProfileBadge } from "@/components/GenreProfileBadge";
import { EditorialMasteryBadge } from "@/components/EditorialMasteryBadge";
import { GenreCoachPanel } from "@/components/GenreCoachPanel";
import { downloadText } from "@/lib/download";
import { RewriteLevel, ChunkProgress } from "@/lib/generation";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { WritingSettings } from "@/lib/settings";
import { Progress } from "@/components/ui/progress";
import { formatChapterDisplayTitle, resolveChapterTitle } from "@/lib/chapter-titles";

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
  onNarrateChapter?: (chapterIndex: number) => void;
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
  onNarrateChapter,
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
    <div className="flex h-full flex-1 flex-col">
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

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <div className={cn("mx-auto px-4 py-6 sm:px-8", mode === "preview" ? "max-w-2xl" : "max-w-5xl")}>
          <div className={cn("ios-editor-paper rounded-[32px] border border-white/10 bg-slate-950/65 shadow-[0_36px_120px_-40px_rgba(15,23,42,0.75)] ring-1 ring-white/10 p-5 sm:p-7", mode === "preview" && "bg-white/[0.055]")}>
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
                />
              )}
              {view.type === "front-matter" && (
                <FrontMatterView project={project} frontMatter={frontMatter} isGenerating={isGeneratingSection("front-matter")} onGenerate={onGenerateFrontMatter || onGenerateNext} ws={ws} onUpdateField={onUpdateFrontMatterField} />
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
                <BackMatterView project={project} backMatter={backMatter} phase={phase} isGenerating={isGeneratingSection("back-matter")} onGenerate={onGenerateBackMatter || onGenerateNext} ws={ws} onUpdateField={onUpdateBackMatterField} />
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

function BlueprintView({ project, blueprint, isGenerating, onUpdateField, onUpdateOutlineTitle, onUpdateOutlineSummary }: {
  project: BookProject;
  blueprint: BookProject["blueprint"];
  isGenerating: boolean;
  onUpdateField?: (field: "overview" | "emotionalArc", value: string) => void;
  onUpdateOutlineTitle?: (index: number, title: string) => void;
  onUpdateOutlineSummary?: (index: number, summary: string) => void;
}) {
  return (
    <div className="space-y-8 rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.72)]">
      <PageHeader title={t("blueprint")} subtitle="Book architecture and chapter plan" />
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
              {blueprint.chapterOutlines.map((o, i) => (
                <div key={`row-${i}`} className="flex gap-4 p-4 rounded-lg bg-muted/15 border border-border/30 hover:bg-muted/25 transition-colors">
                  <span className="text-sm font-bold text-primary/50 shrink-0 pt-0.5 w-6 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <input
                      value={
                        o.title?.trim()
                          ? o.title
                          : (project.chapters?.[i]?.title?.trim() || "")
                      }
                      onChange={(e) => onUpdateOutlineTitle?.(i, e.target.value)}
                      readOnly={!onUpdateOutlineTitle}
                      className="w-full bg-transparent border border-transparent hover:border-border/40 focus:border-primary/50 focus:outline-none rounded px-1 text-sm font-semibold text-foreground"
                    />
                    <textarea
                      value={o.summary}
                      onChange={(e) => onUpdateOutlineSummary?.(i, e.target.value)}
                      readOnly={!onUpdateOutlineSummary}
                      rows={Math.max(2, o.summary.split("\n").length)}
                      className="w-full mt-1 bg-transparent border border-transparent hover:border-border/40 focus:border-primary/50 focus:outline-none rounded px-1 text-xs text-muted-foreground leading-relaxed resize-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <EmptyState text="Blueprint will be generated when you create the book." />
      )}
</div>
  );

}

function FrontMatterView({ project, frontMatter, isGenerating, onGenerate, ws, onUpdateField }: {
  project: BookProject; frontMatter: BookProject["frontMatter"]; isGenerating: boolean; onGenerate: () => void; ws: WritingSettings;
  onUpdateField?: (field: string, value: string) => void;
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
      {frontMatter ? (
        <div className="space-y-8">
          {Object.entries(frontMatter).map(([key, val]) => (
            <div key={key}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-3">{key.replace(/([A-Z])/g, " $1").trim()}</p>
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
        <div className="flex flex-wrap items-center gap-2 pt-1 sm:shrink-0 sm:justify-end">
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
                title="AI Diagnostica Editoriale — score reali e fix mirati"
                className="h-9 flex items-center gap-1.5 px-3 rounded-lg text-[11px] font-semibold bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90 disabled:opacity-30 transition-opacity"
              >
                <Zap className="h-3.5 w-3.5" /> Diagnostica Editoriale
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
        <GenerationProgress
          project={project}
          chapterIndex={chapterIndex}
          outline={outline}
          onCancel={onCancel}
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
          <p className="text-sm text-muted-foreground leading-relaxed">{outline.summary}</p>
          <div className="p-10 rounded-[28px] border border-dashed border-white/15 bg-white/5 text-center">
            <p className="text-sm text-muted-foreground/60">Click {t("generate")} to write this chapter</p>
          </div>
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

function BackMatterView({ project, backMatter, phase, isGenerating, onGenerate, ws, onUpdateField }: {
  project: BookProject; backMatter: BookProject["backMatter"]; phase: string; isGenerating: boolean; onGenerate: () => void; ws: WritingSettings;
  onUpdateField?: (field: string, value: string) => void;
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
      {backMatter ? (
        <div className="space-y-8">
          {Object.entries(backMatter).map(([key, val]) => (
            <div key={key}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-3">{key.replace(/([A-Z])/g, " $1").trim()}</p>
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


const generationPhaseMeta: Record<string, { label: string; title: string; detail: string; index: number }> = {
  OPENING: {
    label: "Hook",
    title: "Apertura in presa diretta",
    detail: "Sta cercando il primo colpo narrativo: promessa, atmosfera e tensione iniziale.",
    index: 0,
  },
  DEVELOPMENT: {
    label: "Sviluppo",
    title: "La scena prende corpo",
    detail: "Personaggi, conflitto e ritmo vengono intrecciati nel flusso del capitolo.",
    index: 1,
  },
  EXPANSION: {
    label: "Densità",
    title: "Profondità e texture",
    detail: "Aggiunge dettagli sensoriali, micro-tensione e continuita emotiva.",
    index: 2,
  },
  TRANSITION: {
    label: "Ponte",
    title: "Connessione narrativa",
    detail: "Allinea la scena al prossimo movimento senza perdere energia.",
    index: 3,
  },
  CLOSURE: {
    label: "Chiusura",
    title: "Finale del blocco",
    detail: "Sta serrando l'ultima pagina con ritmo, payoff e aggancio.",
    index: 4,
  },
};

const generationPipeline = [
  { phase: "OPENING", label: "Hook" },
  { phase: "DEVELOPMENT", label: "Sviluppo" },
  { phase: "EXPANSION", label: "Densità" },
  { phase: "TRANSITION", label: "Ponte" },
  { phase: "CLOSURE", label: "Chiusura" },
];

const generationBars = [38, 64, 46, 78, 54, 92, 66, 48, 84, 58, 72, 42, 88, 52, 68, 36];

type LiveSceneTone = "noir" | "warm" | "storm" | "dawn" | "glass";

interface LiveSceneAnalysis {
  phaseLabel: string;
  title: string;
  detail: string;
  sceneLabel: string;
  emotionLabel: string;
  rhythmLabel: string;
  subjectLabel: string;
  cameraLabel: string;
  tone: LiveSceneTone;
  rain: boolean;
  night: boolean;
  interior: boolean;
  dialogue: boolean;
  conflict: boolean;
  closeness: boolean;
  touch: boolean;
  phone: boolean;
  doorway: boolean;
  bed: boolean;
  table: boolean;
  road: boolean;
  nature: boolean;
  people: boolean;
  paragraphPulse: number;
}

const emotionKeywords = {
  tensione: ["tensione", "paura", "ansia", "silenzio", "ombra", "rischio", "pericolo", "segreto", "sospetto", "trem", "minaccia"],
  desiderio: ["desiderio", "attrazione", "bacio", "pelle", "cuore", "sfior", "vicino", "labbra", "calore", "respiro"],
  conflitto: ["rabbia", "accusa", "ferita", "tradimento", "bugia", "colpa", "litig", "rottura", "distanza", "urlo"],
  malinconia: ["ricordo", "perdita", "nostalgia", "vuoto", "lacrime", "addio", "solitudine", "mancanza", "rimpianto"],
  speranza: ["speranza", "fiducia", "promessa", "sorriso", "luce", "alba", "respiro", "possibile", "futuro"],
};

const settingKeywords = {
  notte: ["notte", "buio", "luna", "ombra", "lampione", "madrugada", "stelle"],
  interno: ["stanza", "camera", "cucina", "salotto", "ufficio", "casa", "porta", "finestra", "tavolo"],
  citta: ["strada", "auto", "traffico", "palazzo", "bar", "marciapiede", "ascensore", "hotel"],
  natura: ["mare", "lago", "riva", "vento", "pioggia", "bosco", "giardino", "terra", "fango", "acqua", "fiume", "neve", "tempesta"],
};

function keywordScore(text: string, words: string[]): number {
  const lower = text.toLowerCase();
  return words.reduce((score, word) => score + (lower.includes(word) ? 1 : 0), 0);
}

function bestKey<T extends string>(text: string, groups: Record<T, string[]>, fallback: T): T {
  let best = fallback;
  let bestScore = -1;
  for (const [key, words] of Object.entries(groups) as [T, string[]][]) {
    const score = keywordScore(text, words);
    if (score > bestScore) {
      best = key;
      bestScore = score;
    }
  }
  return best;
}

function extractNames(text: string, project: BookProject): string[] {
  const cleanName = (value: unknown) => String(value || "")
    .replace(/[*_`:#.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const isLikelyName = (value: string) =>
    value.length >= 3 &&
    value.length <= 34 &&
    /^[A-ZÀ-Ü][A-Za-zÀ-ÿ]+(?:\s+[A-ZÀ-Ü][A-Za-zÀ-ÿ]+)?$/.test(value) &&
    !["Capitolo", "Scriptora", "Quando", "Perche", "Perché", "Ecco", "Character Bible", "Piccole", "Domani"].includes(value);
  const configured = (project.config.characters || [])
    .map((character) => cleanName([character.name, character.surname].filter(Boolean).join(" ")))
    .filter(isLikelyName);
  const found = Array.from(text.matchAll(/\b[A-ZÀ-Ü][a-zà-ÿ]{2,}(?:\s+[A-ZÀ-Ü][a-zà-ÿ]{2,})?/g))
    .map((match) => cleanName(match[0]))
    .filter(isLikelyName);
  return Array.from(new Set([...configured, ...found])).slice(0, 3);
}

function getLiveParagraph(content: string, fallback: string): string {
  const normalized = (content || "").replace(/\r/g, "").trim();
  if (!normalized) return fallback;
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  return paragraphs.slice(-2).join("\n\n") || paragraphs[paragraphs.length - 1] || normalized;
}

function compactPreviewLine(value: string, max = 170): string {
  const clean = value
    .replace(/^#+\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).replace(/\s+\S*$/, "").trim()}...`;
}

function getLiveWritingPreviewLines(content: string, fallback: string, chapterIndex: number): string[] {
  const normalized = content
    .replace(/\r/g, "")
    .replace(/^#+\s*.+$/gm, "")
    .trim();

  if (!normalized) {
    const direction = compactPreviewLine(fallback || "Scriptora sta preparando struttura, tono e continuità del capitolo.", 190);
    return [
      `Capitolo ${chapterIndex + 1}: impostazione narrativa in corso.`,
      `Direzione: ${direction}`,
      "Le prime righe reali appariranno qui appena Scriptora completa il primo blocco.",
    ];
  }

  const recent = getLiveParagraph(normalized, fallback)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const sentences = recent
    .replace(/\n+/g, " ")
    .match(/[^.!?…]+[.!?…]?/g)
    ?.map((part) => compactPreviewLine(part, 190))
    .filter((part) => part.length > 24) || [];

  const lines = sentences.length >= 2
    ? sentences.slice(-4)
    : recent.split(/\n+/).map((part) => compactPreviewLine(part, 190)).filter(Boolean).slice(-4);

  return lines.length ? lines : [compactPreviewLine(recent, 190)];
}

function rhythmFromText(text: string, pct: number): string {
  const punctuation = (text.match(/[.!?;]/g) || []).length;
  const quotes = (text.match(/[“”"«»]/g) || []).length;
  const words = text.split(/\s+/).filter(Boolean).length;
  if (quotes >= 4) return "dialogo serrato";
  if (punctuation > 0 && words / punctuation < 11) return "tagli brevi";
  if (pct > 70) return "chiusura in spinta";
  if (words > 260) return "respiro largo";
  return "costruzione controllata";
}

function analyzeLiveScene({
  project,
  outline,
  chapterIndex,
  phase,
  content,
  pct,
}: {
  project: BookProject;
  outline?: { title: string; summary: string };
  chapterIndex: number;
  phase: string;
  content: string;
  pct: number;
}): LiveSceneAnalysis {
  const outlineText = `${outline?.title || ""}. ${outline?.summary || ""}`.trim();
  const recent = getLiveParagraph(content, outlineText || `${project.config.title} ${project.config.genre}`).slice(-1100);
  const emotion = bestKey(recent, emotionKeywords, "tensione");
  const setting = bestKey(recent, settingKeywords, "interno");
  const names = extractNames(recent, project);
  const dialogue = /[“”"«»]/.test(recent) || keywordScore(recent, ["disse", "chiese", "rispose", "sussurr", "voce"]) > 0;
  const conflict = emotion === "conflitto" || keywordScore(recent, ["no", "mai", "basta", "bugia", "colpa", "segreto"]) >= 2;
  const rain = keywordScore(recent, ["pioggia", "tempesta", "vento", "neve", "gocce"]) > 0;
  const night = setting === "notte" || keywordScore(recent, ["notte", "buio", "luna", "ombra"]) > 0;
  const interior = setting === "interno";
  const closeness = keywordScore(recent, ["vicin", "braccio", "spalle", "pelle", "calore", "corpo", "respiro", "petto", "abbraccio", "sfior", "bacio", "odore"]) > 0;
  const touch = keywordScore(recent, ["braccio", "spalle", "mano", "dita", "pelle", "sfior", "tocc", "abbraccio", "bacio"]) > 0;
  const phone = keywordScore(recent, ["messaggio", "telefono", "cellulare", "scrisse", "risposta", "chat", "sms"]) > 0;
  const doorway = keywordScore(recent, ["porta", "soglia", "affrontare", "domani", "uscire", "entrò", "entro", "chiave"]) > 0;
  const bed = keywordScore(recent, ["letto", "cuscino", "lenzuola", "sonno", "dorm", "svegli"]) > 0;
  const table = keywordScore(recent, ["tavolo", "cucina", "bicchiere", "tazza", "caffè", "lettera"]) > 0;
  const road = setting === "citta" || keywordScore(recent, ["strada", "auto", "marciapiede", "hotel", "bar"]) > 0;
  const nature = setting === "natura";
  const people = dialogue || closeness || touch || conflict || names.length > 0;
  const tone: LiveSceneTone =
    rain || conflict ? "storm"
      : night || emotion === "tensione" ? "noir"
        : emotion === "desiderio" ? "warm"
          : emotion === "speranza" ? "dawn"
            : "glass";
  const sceneLabel = setting === "citta"
    ? "esterno urbano"
    : setting === "natura"
      ? "spazio aperto"
      : setting === "notte"
        ? "notte tesa"
        : "interno ravvicinato";
  const subjectLabel = names.length > 0 ? names.join(" · ") : `Capitolo ${chapterIndex + 1}`;
  const rhythmLabel = rhythmFromText(recent, pct);
  const cameraLabel = dialogue
    ? "campo/controcampo"
    : conflict
      ? "camera stretta"
      : interior
        ? "dettaglio su oggetti"
        : "inquadratura ampia";
  const phaseMeta = generationPhaseMeta[phase] ?? generationPhaseMeta.OPENING;
  const action = content
    ? dialogue
      ? "sta facendo emergere il sottotesto nei dialoghi"
      : conflict
        ? "sta alzando la pressione emotiva della scena"
        : rain || night
          ? "sta usando atmosfera e luce per guidare la tensione"
          : "sta sviluppando ritmo, immagini e continuita"
    : "sta preparando il capitolo dal brief e dalla struttura";

  return {
    phaseLabel: phaseMeta.label,
    title: `${phaseMeta.label}: ${sceneLabel}`,
    detail: `Scriptora ${action}: tono ${emotion}, ritmo ${rhythmLabel}, focus su ${subjectLabel}.`,
    sceneLabel,
    emotionLabel: emotion,
    rhythmLabel,
    subjectLabel,
    cameraLabel,
    tone,
    rain,
    night,
    interior,
    dialogue,
    conflict,
    closeness,
    touch,
    phone,
    doorway,
    bed,
    table,
    road,
    nature,
    people,
    paragraphPulse: Math.abs(recent.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 7,
  };
}

const GenerationProgress = memo(function GenerationProgress({
  project,
  chapterIndex,
  outline,
  onCancel,
  chunkProgress,
}: {
  project: BookProject;
  chapterIndex: number;
  outline?: { title: string; summary: string };
  onCancel?: () => void;
  chunkProgress?: ChunkProgress;
}) {
  const [fakePct, setFakePct] = useState(0);

  useEffect(() => {
    if (chunkProgress) return;
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      let pct: number;
      if (elapsed < 3) pct = (elapsed / 3) * 10;
      else if (elapsed < 10) pct = 10 + ((elapsed - 3) / 7) * 10;
      else pct = 20 + Math.min((elapsed - 10) / 30, 1) * 5;
      setFakePct(Math.min(pct, 25));
    }, 500);
    return () => clearInterval(interval);
  }, [chunkProgress]);

  const currentWords = chunkProgress?.currentWords ?? 0;
  const targetWords = Math.max(chunkProgress?.targetWords ?? 1, 1);
  const realPct = chunkProgress
    ? Math.min(Math.round((currentWords / targetWords) * 100), 99)
    : Math.round(fakePct);
  const phase = chunkProgress?.phase ?? "OPENING";
  const phaseMeta = generationPhaseMeta[phase] ?? generationPhaseMeta.OPENING;
  const liveContent = chunkProgress?.content?.trim() ?? "";
  const scene = analyzeLiveScene({ project, outline, chapterIndex, phase, content: liveContent, pct: realPct });
  const previewFallback = `${outline?.title || ""}. ${outline?.summary || ""}`.trim() || `${project.config.title} ${project.config.genre}`;
  const livePreviewLines = getLiveWritingPreviewLines(liveContent, previewFallback, chapterIndex);
  const livePreviewLabel = liveContent ? "Ultime righe generate" : "Direzione";
  const livePreviewSnippet = getLiveParagraph(
    liveContent,
    previewFallback,
  );
  const overlayTitle = resolveChapterTitle(outline?.title || "", chapterIndex, {
    config: project.config,
    summary: outline?.summary,
    totalChapters: project.config.numberOfChapters,
  });

  const wordInfo = chunkProgress
    ? `${currentWords.toLocaleString()} / ${targetWords.toLocaleString()} parole`
    : "Motore narrativo";
  const chunkSizeLabel = chunkProgress?.chunkSize
    ? `${chunkProgress.chunkSize === "LARGE" ? "Passaggio lungo" : chunkProgress.chunkSize === "MEDIUM" ? "Passaggio medio" : "Passaggio rapido"}`
    : "Setup";

  return (
    <div className="scriptora-generation-stage animate-fade-in">
      <div className="scriptora-generation-topline">
        <div className="scriptora-generation-live-pill">
          <span className="scriptora-generation-live-dot" />
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="scriptora-generation-actions">
          <span className="scriptora-generation-percent">{realPct}%</span>
          {onCancel && (
            <button onClick={onCancel} title={t("stop_generation")}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-white/65 hover:text-white hover:bg-red-500/15 transition-colors">
              <Square className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="scriptora-generation-grid">
        <div className="scriptora-generation-engine">
          <div className="scriptora-generation-wave" aria-hidden="true">
            {generationBars.map((height, index) => (
              <span
                key={`${height}-${index}`}
                style={{ height: `${height}%`, animationDelay: `${index * 72}ms` }}
              />
            ))}
          </div>
          <div className="scriptora-generation-scan" aria-hidden="true" />
          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-cyan-100/65">
              <Zap className="h-3.5 w-3.5 text-cyan-200" />
              {scene.phaseLabel}
            </div>
            <h3 className="text-xl font-semibold text-white leading-tight">{scene.title}</h3>
            <p className="max-w-xl text-[11px] leading-relaxed text-white/68">{scene.detail}</p>
            <div className="scriptora-generation-signals">
              <span>{scene.emotionLabel}</span>
              <span>{scene.rhythmLabel}</span>
              <span>{scene.cameraLabel}</span>
            </div>
          </div>
        </div>

        <div className="scriptora-generation-manuscript">
          <div className="scriptora-generation-manuscript-header">
            <div className="flex items-center gap-2">
              <PenLine className="h-4 w-4 text-emerald-200" />
              <span>Live Preview</span>
            </div>
            <span aria-hidden="true" className="scriptora-scene-status">
              <i /><i /><i />
            </span>
          </div>
          <div className="scriptora-live-writing-board" aria-label={`Anteprima testuale live: ${overlayTitle}`}>
            <div className="scriptora-live-writing-paper">
              <div className="scriptora-live-writing-kicker">
                <span>{livePreviewLabel}</span>
                <span>{scene.sceneLabel}</span>
              </div>
              <h4>{overlayTitle}</h4>
              <div className="scriptora-generation-live-text">
                {livePreviewLines.map((line, index) => (
                  <p key={`${line}-${index}`}>{line}</p>
                ))}
              </div>
            </div>
            <div className="scriptora-live-writing-footer">
              <span>{scene.emotionLabel}</span>
              <span>{scene.rhythmLabel}</span>
              <span>{compactPreviewLine(livePreviewSnippet, 70)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="scriptora-generation-meter">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-white/45">
          <span>{wordInfo}</span>
          <span>{chunkSizeLabel}</span>
        </div>
        <Progress value={realPct} className="h-2 bg-white/10" />
      </div>

      <div className="scriptora-generation-pipeline">
        {generationPipeline.map((step, index) => {
          const state = index < phaseMeta.index ? "done" : index === phaseMeta.index ? "active" : "pending";
          return (
            <div key={step.phase} className={cn("scriptora-generation-step", `is-${state}`)}>
              <span>{index + 1}</span>
              <strong>{step.label}</strong>
            </div>
          );
        })}
      </div>
</div>
  );

}, (prev, next) =>
  prev.onCancel === next.onCancel &&
  prev.project?.id === next.project?.id &&
  prev.project?.config?.genre === next.project?.config?.genre &&
  prev.project?.config?.tone === next.project?.config?.tone &&
  prev.chapterIndex === next.chapterIndex &&
  prev.outline?.title === next.outline?.title &&
  prev.outline?.summary === next.outline?.summary &&
  prev.chunkProgress?.currentWords === next.chunkProgress?.currentWords &&
  prev.chunkProgress?.targetWords === next.chunkProgress?.targetWords &&
  prev.chunkProgress?.phase === next.chunkProgress?.phase &&
  prev.chunkProgress?.chunkSize === next.chunkProgress?.chunkSize &&
  prev.chunkProgress?.chunkIndex === next.chunkProgress?.chunkIndex &&
  prev.chunkProgress?.content === next.chunkProgress?.content,
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
    <button onClick={onClick} disabled={disabled} title={title}
      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 sm:h-9 sm:w-9">
      {icon}
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