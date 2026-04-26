import { useState, useRef, useEffect, useMemo, useCallback, memo } from "react";
import { BookProject, SectionId, Chapter, GenerationStatus, ChapterLength, AIQualityRating } from "@/types/book";
import { Play, RefreshCw, Sparkles, Plus, Loader2, Star, Eye, PenLine, Search, ChevronDown, Target, Square, AlertTriangle, Download, Zap } from "lucide-react";
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

interface EditorPanelProps {
  project: BookProject;
  activeSection: SectionId | null;
  onGenerateNext: () => void;
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
}

export function EditorPanel({
  project, activeSection,
  onGenerateNext, onGenerateChapter, onRegenerateChapter,
  onRewriteChapter, onEvaluateChapter, onGenerateSubchapter,
  onAutoRewrite,
  onUpdateChapterContent, onUpdateChapterTitle, onUpdateSubchapterContent, onUpdateSubchapterTitle,
  onSetChapterLengthOverride, isGeneratingSection,
  onCancelGeneration,
  chunkProgress,
  writingSettings,
  onUpdateBlueprintField, onUpdateBlueprintOutlineTitle, onUpdateBlueprintOutlineSummary,
  onUpdateFrontMatterField, onUpdateBackMatterField,
}: EditorPanelProps) {
  const { blueprint, frontMatter, chapters, backMatter, config, phase } = project;
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  const ws = writingSettings || { fontFamily: "'Times New Roman', Times, serif", fontSize: 16, lineSpacing: 2 };

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
    <div className="flex-1 flex flex-col h-full">
      {hasContent && (
        <div className="h-10 border-b border-border/50 flex items-center justify-center gap-1 shrink-0 bg-card/50">
          <button onClick={() => setMode("edit")}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              mode === "edit" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/40")}>
            <PenLine className="h-3.5 w-3.5" /> {t("edit")}
          </button>
          <button onClick={() => setMode("preview")}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              mode === "preview" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/40")}>
            <Eye className="h-3.5 w-3.5" /> {t("preview")}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className={cn("mx-auto py-10 px-8", mode === "preview" ? "max-w-2xl" : "max-w-3xl")}>
          {mode === "preview" && hasContent ? (
            <PreviewMode project={project} view={view} ws={ws} />
          ) : (
            <>
              <div className="flex items-center gap-2 mb-6 flex-wrap">
                <GenreProfileBadge
                  genre={config.genre}
                  subcategory={config.subcategory}
                  className="flex-1 min-w-[200px]"
                />
                <EditorialMasteryBadge genre={config.genre} subcategory={config.subcategory} size="md" />
              </div>
              {view.type === "blueprint" && (
                <BlueprintView
                  blueprint={blueprint}
                  isGenerating={isGeneratingSection("blueprint")}
                  onUpdateField={onUpdateBlueprintField}
                  onUpdateOutlineTitle={onUpdateBlueprintOutlineTitle}
                  onUpdateOutlineSummary={onUpdateBlueprintOutlineSummary}
                />
              )}
              {view.type === "front-matter" && (
                <FrontMatterView project={project} frontMatter={frontMatter} phase={phase} isGenerating={isGeneratingSection("front-matter")} onGenerate={onGenerateNext} ws={ws} onUpdateField={onUpdateFrontMatterField} />
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
                <BackMatterView backMatter={backMatter} phase={phase} isGenerating={isGeneratingSection("back-matter")} onGenerate={onGenerateNext} ws={ws} onUpdateField={onUpdateBackMatterField} />
              )}
            </>
          )}
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
    <div className="bg-card rounded-xl shadow-lg border border-border/30 overflow-hidden">
      <div className="p-10 space-y-6" style={proseStyle}>
        {view.type === "blueprint" && blueprint && (
          <>
            <div className="text-center py-8 border-b border-border/20">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">{config.title}</h1>
              {config.subtitle && <p className="text-base text-muted-foreground mt-2 italic">{config.subtitle}</p>}
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground/50 mb-3">{t("table_of_contents")}</p>
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
                <h3 className="text-xs uppercase tracking-widest text-muted-foreground/70 mb-2">{key.replace(/([A-Z])/g, " $1").trim()}</h3>
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
                <p className="text-xs uppercase tracking-widest text-primary/60 mb-1">{t("chapters")} {view.chapterIndex + 1}</p>
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
                <p className="text-xs uppercase tracking-widest text-primary/60 mb-1">{t("chapters")} {view.chapterIndex + 1} › {view.subIndex + 1}</p>
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
                <h3 className="text-xs uppercase tracking-widest text-muted-foreground/70 mb-2">{key.replace(/([A-Z])/g, " $1").trim()}</h3>
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

function BlueprintView({ blueprint, isGenerating, onUpdateField, onUpdateOutlineTitle, onUpdateOutlineSummary }: {
  blueprint: BookProject["blueprint"];
  isGenerating: boolean;
  onUpdateField?: (field: "overview" | "emotionalArc", value: string) => void;
  onUpdateOutlineTitle?: (index: number, title: string) => void;
  onUpdateOutlineSummary?: (index: number, summary: string) => void;
}) {
  return (
    <div className="space-y-8">
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
              className="w-full bg-transparent border border-transparent hover:border-border/40 focus:border-primary/50 focus:outline-none rounded-md p-2 text-[15px] leading-8 text-foreground/85 font-serif resize-none"
            />
          </div>
          {blueprint.themes.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("themes")}</p>
              <div className="flex flex-wrap gap-2">
                {blueprint.themes.map((th, i) => (
                  <span key={`row-${i}`} className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium">{th}</span>
                ))}
              </div>
            </div>
          )}
          {blueprint.emotionalArc && (
            <div className="p-5 rounded-xl bg-muted/20 border border-border/40">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("emotional_arc")}</p>
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
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">{t("chapter_outlines")}</p>
            <div className="space-y-3">
              {blueprint.chapterOutlines.map((o, i) => (
                <div key={`row-${i}`} className="flex gap-4 p-4 rounded-xl bg-muted/15 border border-border/30 hover:bg-muted/25 transition-colors">
                  <span className="text-sm font-bold text-primary/50 shrink-0 pt-0.5 w-6 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <input
                      value={o.title}
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

function FrontMatterView({ project, frontMatter, phase, isGenerating, onGenerate, ws, onUpdateField }: {
  project: BookProject; frontMatter: BookProject["frontMatter"]; phase: string; isGenerating: boolean; onGenerate: () => void; ws: WritingSettings;
  onUpdateField?: (field: string, value: string) => void;
}) {
  // Front matter can be generated/regenerated any time the blueprint exists.
  const canGenerate = !!project.blueprint;
  return (
    <div className="space-y-8">
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
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">{key.replace(/([A-Z])/g, " $1").trim()}</p>
              <textarea
                value={val as string}
                onChange={(e) => onUpdateField?.(key, e.target.value)}
                readOnly={!onUpdateField}
                rows={Math.max(3, String(val).split("\n").length + 1)}
                className="w-full bg-transparent border border-transparent hover:border-border/40 focus:border-primary/50 focus:outline-none rounded-md p-2 text-foreground/85 resize-none"
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
}) {
  const isGenerated = chapter && chapter.content.length > 0;
  const currentLength = chapter?.lengthOverride || project.config.chapterLength;
  const [showRewriteMenu, setShowRewriteMenu] = useState(false);
  const [showIntelligence, setShowIntelligence] = useState(false);

  const displayedTitle = isGenerated ? (chapter!.title || outline.title) : outline.title;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="mb-2 flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            {`${t("chapters")} ${chapterIndex + 1}`}
          </p>
          <EditableTitle
            value={displayedTitle}
            onChange={(v) => onUpdateTitle?.(v)}
            disabled={!onUpdateTitle}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0 pt-1">
          {!isGenerated ? (
            <button onClick={onGenerate} disabled={isGenerating || !project.blueprint}
              className="flex items-center gap-2 h-10 px-5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 transition-colors">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {t("generate")}
            </button>
          ) : (
            <>
              <ActionButton icon={<Download className="h-3.5 w-3.5" />} title="TXT" onClick={() => downloadText(`chapter-${chapterIndex + 1}-${(chapter?.title || "chapter").replace(/\s+/g, "_")}.txt`, chapter?.content || "")} disabled={!isGenerated} />
              <button
                onClick={() => setShowIntelligence(true)}
                disabled={isGenerating || isEvaluating}
                title="AI Analysis Pro — score reali e fix mirati"
                className="h-9 flex items-center gap-1.5 px-3 rounded-lg text-[11px] font-semibold bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90 disabled:opacity-30 transition-opacity"
              >
                <Zap className="h-3.5 w-3.5" /> Analysis Pro
              </button>
              <ActionButton icon={<Search className="h-3.5 w-3.5" />} title={t("evaluate")} onClick={onEvaluate} disabled={isGenerating || isEvaluating} />
              <ActionButton icon={<RefreshCw className="h-3.5 w-3.5" />} title={t("regenerate")} onClick={onRegenerate} disabled={isGenerating} />
              
              {/* Rewrite with levels */}
              <div className="relative">
                <button onClick={() => setShowRewriteMenu(!showRewriteMenu)} disabled={isGenerating}
                  className="h-9 flex items-center gap-1 px-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-30 transition-colors">
                  <Sparkles className="h-3.5 w-3.5" />
                  <ChevronDown className="h-3 w-3" />
                </button>
                {showRewriteMenu && (
                  <div className="absolute right-0 top-10 z-20 bg-card border border-border rounded-xl shadow-xl py-1 w-48">
                    {([
                      { level: "light" as RewriteLevel, label: "Light Polish", desc: "Fix phrasing, tighten prose" },
                      { level: "deep" as RewriteLevel, label: "Deep Rewrite", desc: "Restructure + fresh insights" },
                      { level: "bestseller" as RewriteLevel, label: "Bestseller Upgrade", desc: "Total transformation" },
                    ]).map(opt => (
                      <button key={opt.level} onClick={() => { onRewrite(opt.level); setShowRewriteMenu(false); }}
                        className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors">
                        <p className="text-xs font-medium text-foreground">{opt.label}</p>
                        <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                      </button>
                    ))}
                    {onAutoRewrite && (
                      <>
                        <div className="border-t border-border/50 my-1" />
                        {[3, 4, 5].map(th => (
                          <button key={th} onClick={() => { onAutoRewrite(th); setShowRewriteMenu(false); }}
                            className="w-full text-left px-3 py-1.5 hover:bg-muted/50 transition-colors flex items-center gap-2">
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

      <div className="flex items-center gap-3">
        <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{t("chapter_length")}</span>
        {(["short", "medium", "long"] as const).map(len => (
          <button key={len} onClick={() => onSetLengthOverride(len)}
            className={cn(
              "px-3 py-1 rounded-md text-[11px] font-medium transition-colors border",
              currentLength === len
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}>
            {t(len)}
          </button>
        ))}
      </div>

      {isGenerating && <GenerationProgress onCancel={onCancel} chunkProgress={chunkProgress} />}
      {isEvaluating && <LoadingBanner text={`${t("evaluate")}...`} />}

      {/* Error retry state */}
      {!isGenerating && chapter?.status === "error" && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-destructive/5 border border-destructive/20 animate-fade-in">
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
          <div className="p-10 rounded-xl border border-dashed border-border/50 bg-muted/5 text-center">
            <p className="text-sm text-muted-foreground/50">Click {t("generate")} to write this chapter</p>
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
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-6">{t("subchapters")}</p>
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
          chapterTitle={chapter?.title || outline.title}
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
    <div className="p-5 rounded-xl bg-muted/15 border border-border/40 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t("ai_quality_rating")}</span>
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
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t("whats_missing")}</p>
          <p className="text-xs text-foreground/60 leading-relaxed">{rating.missing}</p>
        </div>
      )}
      {rating.improvements && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t("how_to_improve")}</p>
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
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
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

function BackMatterView({ backMatter, phase, isGenerating, onGenerate, ws, onUpdateField }: {
  backMatter: BookProject["backMatter"]; phase: string; isGenerating: boolean; onGenerate: () => void; ws: WritingSettings;
  onUpdateField?: (field: string, value: string) => void;
}) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader title={t("back_matter")} subtitle="Conclusion, author note, and closing content" />
        {!backMatter && (
          <button onClick={onGenerate} disabled={isGenerating}
            className="flex items-center gap-2 h-10 px-5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {t("generate")}
          </button>
        )}
      </div>
      {isGenerating && <LoadingBanner text={`${t("generating")}...`} />}
      {backMatter ? (
        <div className="space-y-8">
          {Object.entries(backMatter).map(([key, val]) => (
            <div key={key}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">{key.replace(/([A-Z])/g, " $1").trim()}</p>
              <textarea
                value={val as string}
                onChange={(e) => onUpdateField?.(key, e.target.value)}
                readOnly={!onUpdateField}
                rows={Math.max(3, String(val).split("\n").length + 1)}
                className="w-full bg-transparent border border-transparent hover:border-border/40 focus:border-primary/50 focus:outline-none rounded-md p-2 text-foreground/85 resize-none"
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
    <div className="mb-2">
      <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
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
    ? "text-2xl font-bold text-foreground tracking-tight"
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


const GenerationProgress = memo(function GenerationProgress({ onCancel, chunkProgress }: { onCancel?: () => void; chunkProgress?: ChunkProgress }) {
  const [fakePct, setFakePct] = useState(0);

  // Fake progress for when no chunk data yet
  useEffect(() => {
    if (!chunkProgress) return;
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

  const realPct = chunkProgress
    ? Math.min(Math.round((chunkProgress.currentWords / chunkProgress.targetWords) * 100), 99)
    : Math.round(fakePct);

  const phaseLabels: Record<string, string> = {
    OPENING: t("progress_analyzing") || "🪝 Inizio potente — hooking the reader...",
    DEVELOPMENT: t("progress_writing") || "✍️ Developing — building depth...",
    EXPANSION: t("progress_enhancing") || "🧠 Expanding — adding richness...",
    TRANSITION: t("progress_refining") || "🔥 Transitioning — guiding toward closure...",
    CLOSURE: t("progress_finalizing") || "🎯 Finalizing — writing the ending...",
  };

  const statusText = chunkProgress
    ? phaseLabels[chunkProgress.phase] || `Writing...`
    : t("progress_analyzing") || "Preparing...";

  const wordInfo = chunkProgress
    ? `${chunkProgress.currentWords.toLocaleString()} / ${chunkProgress.targetWords.toLocaleString()} parole`
    : "";

  return (
    <div className="space-y-3 px-5 py-4 rounded-xl bg-primary/5 border border-primary/15 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-primary font-medium">{statusText}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-primary/60 font-mono tabular-nums">{realPct}%</span>
          {onCancel && (
            <button onClick={onCancel} title={t("stop_generation")}
              className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
              <Square className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      <Progress value={realPct} className="h-1.5 bg-primary/10" />
      {wordInfo && (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{wordInfo}</span>
          <div className="flex items-center gap-3">
            {chunkProgress?.chunkSize && (
              <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium",
                chunkProgress.chunkSize === "LARGE" ? "bg-primary/10 text-primary" :
                chunkProgress.chunkSize === "MEDIUM" ? "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]" :
                "bg-destructive/10 text-destructive"
              )}>{chunkProgress.chunkSize}</span>
            )}
            {chunkProgress && <span>Chunk {chunkProgress.chunkIndex} / ~{chunkProgress.totalChunks}</span>}
          </div>
        </div>
      )}
    </div>
  );
}, (prev, next) =>
  prev.onCancel === next.onCancel &&
  prev.chunkProgress?.currentWords === next.chunkProgress?.currentWords &&
  prev.chunkProgress?.targetWords === next.chunkProgress?.targetWords &&
  prev.chunkProgress?.phase === next.chunkProgress?.phase &&
  prev.chunkProgress?.chunkSize === next.chunkProgress?.chunkSize &&
  prev.chunkProgress?.chunkIndex === next.chunkProgress?.chunkIndex,
);

function LoadingBanner({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-primary/5 border border-primary/15 animate-fade-in">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      <span className="text-sm text-primary font-medium">{text}</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-16 text-center">
      <p className="text-sm text-muted-foreground/50">{text}</p>
    </div>
  );
}

function ActionButton({ icon, title, onClick, disabled }: { icon: React.ReactNode; title: string; onClick: () => void; disabled: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-30 transition-colors">
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
          className="w-full text-foreground/85 bg-muted/10 border border-primary/20 rounded-xl p-5 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
          style={fontStyle}
          autoFocus />
        <span className="absolute top-3 right-4 text-[9px] text-primary/50 uppercase tracking-wider font-sans">{t("editing")}</span>
      </div>
    );
  }

  return (
    <div onClick={() => setIsEditing(true)}
      className="text-foreground/85 whitespace-pre-wrap cursor-text rounded-xl p-5 hover:bg-muted/10 transition-colors border border-transparent hover:border-border/20 min-h-[120px]"
      style={fontStyle}
      title={t("click_to_edit")}>
      {content || <span className="text-muted-foreground/40 italic">{t("empty_click_to_add")}</span>}
    </div>
  );
}, (prev, next) => {
  // Skip re-render when content + ws + onChange ref are stable.
  // onChange is typically a useCallback in the parent, so reference equality holds.
  return prev.content === next.content && prev.onChange === next.onChange && prev.ws === next.ws;
});
