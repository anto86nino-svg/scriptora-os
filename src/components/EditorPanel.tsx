import { useState, useRef, useEffect, useMemo, useCallback, memo, type RefObject } from "react";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import { BookProject, SectionId, Chapter, GenerationStatus, ChapterLength, AIQualityRating, isGenerationFailureStatus, getSubchaptersPerChapter } from "@/types/book";
import { Play, RefreshCw, Sparkles, Plus, Loader2, Star, Eye, PenLine, Search, ChevronDown, Target, Square, AlertTriangle, Download, Zap, Headphones, Shield, Clock3, Scissors, CheckCircle2 } from "lucide-react";
import { BlueprintTheater } from "@/components/blueprint-theater/BlueprintTheater";
import { BlueprintRecoveryCard } from "@/components/blueprint/BlueprintRecoveryCard";
import { ChapterIntelligencePanel } from "@/components/ChapterIntelligencePanel";
import { ChapterEditorialWorkbench } from "@/components/ChapterEditorialWorkbench";
import { GenreProfileBadge } from "@/components/GenreProfileBadge";
import { EditorialMasteryBadge } from "@/components/EditorialMasteryBadge";
import { BookTypeBadge } from "@/components/BookTypeBadge";
import { MatterSectionDisabled } from "@/components/MatterSectionDisabled";
import { isBackMatterEnabled, isFrontMatterEnabled } from "@/lib/matter-options";
import { GenreCoachPanel } from "@/components/GenreCoachPanel";
import { downloadText } from "@/lib/download";
import { usePlan } from "@/lib/plan";
import { ScriptoraFreeWatermark } from "@/components/brand/ScriptoraFreeWatermark";
import { appendScriptoraFreeWatermarkToText, shouldApplyScriptoraFreeWatermark } from "@/lib/brand/scriptoraBrand";
import type { RewriteLevel, ChunkProgress } from "@/lib/generation-types";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { WritingSettings } from "@/lib/settings";
import { formatChapterDisplayTitle, resolveChapterTitle } from "@/lib/chapter-titles";
import { hasRealSubchapterContent } from "@/lib/manuscript/subchapter-content";
import { chapterAnchorId, getChapterIndexFromSection } from "@/lib/writer/chapter-navigation";
import { buildEditorialChapterPreview } from "@/lib/project-generation-readiness";
import { CreditCostBadge } from "@/components/billing/CreditCostBadge";
import { resolveChapterGenerationOperation } from "@/lib/billing";
import { validateBookReadinessForBlueprint } from "@/lib/book-config-engine/blueprint-readiness";
import { RecoveryProjectBanner } from "@/components/recovery/RecoveryProjectBanner";
import { isGenerationCompleteStatus } from "@/types/book";
import {
  hasCleanableChapterContent,
  runEditorialCleanup,
  validateEditorialCleanupResult,
  type EditorialCleanupResult,
} from "@/lib/editorial-cleanup";
import { buildChapterEditorialOutcome, REWRITE_LEVEL_LABELS, type ChapterEditorialOutcome } from "@/lib/chapter-editorial-tools";

interface EditorPanelProps {
  project: BookProject;
  activeSection: SectionId | null;
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
  onRegenerateBlueprint?: () => void;
  onCreateSafeBlueprint?: () => void;
  onAutoCompleteBlueprintConfig?: () => void;
  onApproveBlueprint?: () => void;
  onGenerateBlueprint?: () => void;
  onUpdateFrontMatterField?: (field: string, value: string) => void;
  onUpdateBackMatterField?: (field: string, value: string) => void;
  onNarrateChapter?: (chapterIndex: number) => void;
  onPersistChapterEditorialAnalysis?: (
    chapterIndex: number,
    snapshot: import("@/types/book").ChapterEditorialSnapshot,
    aiRating: import("@/types/book").AIQualityRating,
  ) => void;
  premiumWriter?: boolean;
  hideDesktopToolbar?: boolean;
  chapterToolRequest?: { mode: "analysis" | "patch" | "cleanup"; nonce: number } | null;
  onSelectChapter?: (index: number) => void;
  onCover?: () => void;
  onKdp?: () => void;
  onRadar?: () => void;
  onKeywordGold?: () => void;
  onTitleIntel?: () => void;
  onExport?: () => void;
  onMarket?: () => void;
  coverDataUrl?: string | null;
  onRecoverProject?: () => void;
  onContinueChapterFromCheckpoint?: (chapterIndex: number) => void;
}

export function EditorPanel({
  project, activeSection,
  onGenerateNext, onGenerateFrontMatter, onGenerateBackMatter, onGenerateChapter, onRegenerateChapter,
  onRewriteChapter, onEvaluateChapter, onGenerateSubchapter,
  onAutoRewrite,
  onUpdateChapterContent, onUpdateChapterTitle, onUpdateSubchapterContent, onUpdateSubchapterTitle,
  onSetChapterLengthOverride, isGeneratingSection,
  onCancelGeneration,
  chunkProgress,
  writingSettings,
  onUpdateBlueprintField, onUpdateBlueprintOutlineTitle, onUpdateBlueprintOutlineSummary,
  onRegenerateBlueprint, onCreateSafeBlueprint, onAutoCompleteBlueprintConfig, onApproveBlueprint, onGenerateBlueprint,
  onUpdateFrontMatterField, onUpdateBackMatterField,
  onNarrateChapter,
  onPersistChapterEditorialAnalysis,
  premiumWriter = true,
  hideDesktopToolbar = false,
  chapterToolRequest = null,
  onSelectChapter,
  onCover,
  onKdp,
  onRadar,
  onKeywordGold,
  onTitleIntel,
  onExport,
  onMarket,
  coverDataUrl = null,
  onRecoverProject,
  onContinueChapterFromCheckpoint,
}: EditorPanelProps) {
  const { blueprint, frontMatter, chapters, backMatter, config, phase } = project;
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const showProjectRecovery =
    Boolean(onRecoverProject) &&
    (!blueprint || project.blueprintStatus === "error" || project.memoryGraph?.mode === "degraded");

  const selectedChapterIndex = useMemo(
    () => getChapterIndexFromSection(activeSection),
    [activeSection],
  );

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
    <div className="flex min-w-0 w-full max-w-full flex-1 flex-col overflow-x-clip">
      {hasContent && !premiumWriter && (
        <div className="flex h-12 shrink-0 items-center justify-center border-b border-white/10 bg-white/[0.035]">
          <div className="ios-segment">
          <button onClick={() => setMode("edit")}
            className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              mode === "edit" ? "bg-white text-slate-950 shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.07]")}>
            <PenLine className="h-3.5 w-3.5" /> {t("edit")}
          </button>
          <button onClick={() => setMode("preview")}
            className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              mode === "preview" ? "bg-white text-slate-950 shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.07]")}>
            <Eye className="h-3.5 w-3.5" /> {t("preview")}
          </button>
          </div>
        </div>
      )}

      <div className="scriptora-scroll-main scriptora-writer-scroll scrollbar-thin min-h-0 flex-1 overflow-y-auto overflow-x-clip">
        <div className={cn(
          "mx-auto min-h-0 w-full min-w-0 max-w-full px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+5rem)] sm:px-6 sm:py-6 md:pb-safe",
          activeSection === "blueprint" && premiumWriter
            ? "max-w-none px-3 sm:px-4"
            : premiumWriter
              ? "max-w-[850px]"
              : mode === "preview"
                ? "max-w-2xl"
                : "max-w-4xl",
        )}>
          <div className={cn(
            activeSection === "blueprint" && premiumWriter
              ? "p-0"
              : premiumWriter
                ? "scriptora-manuscript-premium rounded-2xl p-5 sm:p-10"
                : "ios-editor-paper p-4 sm:p-7",
            mode === "preview" && !premiumWriter && "bg-white/[0.055]",
          )}>
          {mode === "preview" && hasContent && !premiumWriter ? (
            <PreviewMode project={project} view={view} ws={ws} />
          ) : (
            <>
              {!premiumWriter && (
              <div className="mb-4 flex min-w-0 w-full max-w-full flex-wrap items-center gap-2 sm:mb-6">
                <BookTypeBadge config={config} />
                <GenreProfileBadge
                  genre={config.genre}
                  subcategory={config.subcategory}
                  className="min-w-0 max-w-full flex-1 basis-full sm:basis-[140px]"
                />
                <EditorialMasteryBadge genre={config.genre} subcategory={config.subcategory} size="md" />
              </div>
              )}
              {showProjectRecovery && (
                <div className="mb-4">
                  <RecoveryProjectBanner onRecover={onRecoverProject} />
                </div>
              )}
              {view.type === "blueprint" && (
                <BlueprintView
                  project={project}
                  blueprint={blueprint}
                  isGenerating={isGeneratingSection("blueprint")}
                  onUpdateField={onUpdateBlueprintField}
                  onUpdateOutlineTitle={onUpdateBlueprintOutlineTitle}
                  onUpdateOutlineSummary={onUpdateBlueprintOutlineSummary}
                  onRegenerateBlueprint={onRegenerateBlueprint}
                  onCreateSafeBlueprint={onCreateSafeBlueprint}
                  onAutoCompleteBlueprintConfig={onAutoCompleteBlueprintConfig}
                  onApproveBlueprint={onApproveBlueprint}
                  onGenerateBlueprint={onGenerateBlueprint}
                  premiumWriter={premiumWriter}
                  onSelectChapter={onSelectChapter}
                  selectedChapterIndex={selectedChapterIndex}
                  onCover={onCover}
                  onKdp={onKdp}
                  onRadar={onRadar}
                  onKeywordGold={onKeywordGold}
                  onTitleIntel={onTitleIntel}
                  onExport={onExport}
                  onMarket={onMarket}
                  coverDataUrl={coverDataUrl}
                  isGeneratingSection={isGeneratingSection}
                  chunkProgress={chunkProgress}
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
                  onPersistChapterEditorialAnalysis={onPersistChapterEditorialAnalysis}
                  premiumWriter={premiumWriter}
                  hideDesktopToolbar={hideDesktopToolbar}
                  chapterToolRequest={chapterToolRequest}
                  onRecoverProject={onRecoverProject}
                  onContinueChapter={() => onContinueChapterFromCheckpoint?.(view.chapterIndex)}
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
    <div className="overflow-hidden rounded-lg bg-white/[0.045]">
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

function BlueprintView({
  project,
  blueprint,
  isGenerating,
  onUpdateField,
  onUpdateOutlineTitle,
  onUpdateOutlineSummary,
  onRegenerateBlueprint,
  onCreateSafeBlueprint,
  onAutoCompleteBlueprintConfig,
  onApproveBlueprint,
  onGenerateBlueprint,
  premiumWriter = false,
  onSelectChapter,
  selectedChapterIndex = null,
  onCover,
  onKdp,
  onRadar,
  onKeywordGold,
  onTitleIntel,
  onExport,
  onMarket,
  coverDataUrl = null,
  isGeneratingSection,
  chunkProgress,
}: {
  project: BookProject;
  blueprint: BookProject["blueprint"];
  isGenerating: boolean;
  onUpdateField?: (field: "overview" | "emotionalArc", value: string) => void;
  onUpdateOutlineTitle?: (index: number, title: string) => void;
  onUpdateOutlineSummary?: (index: number, summary: string) => void;
  onRegenerateBlueprint?: () => void;
  onCreateSafeBlueprint?: () => void;
  onAutoCompleteBlueprintConfig?: () => void;
  onApproveBlueprint?: () => void;
  onGenerateBlueprint?: () => void;
  premiumWriter?: boolean;
  onSelectChapter?: (index: number) => void;
  selectedChapterIndex?: number | null;
  onCover?: () => void;
  onKdp?: () => void;
  onRadar?: () => void;
  onKeywordGold?: () => void;
  onTitleIntel?: () => void;
  onExport?: () => void;
  onMarket?: () => void;
  coverDataUrl?: string | null;
  isGeneratingSection?: (key: string) => boolean;
  chunkProgress?: Record<string, ChunkProgress>;
}) {
  const hasBlueprintError = project.blueprintStatus === "error" && !blueprint;
  const readiness = useMemo(() => validateBookReadinessForBlueprint(project.config), [project.config]);
  const readinessIssues = [
    ...readiness.missingFields.map((field) => ({ field, type: "missing" as const })),
    ...readiness.weakFields.map((field) => ({ field, type: "weak" as const })),
  ];

  if (premiumWriter && blueprint && isGeneratingSection) {
    return (
      <div className="blueprint-theater-writer-host -mx-2 space-y-4 sm:-mx-4">
        {isGenerating && (
          <BlueprintRecoveryCard isGenerating onRegenerate={() => {}} onCreateSafe={() => {}} />
        )}
        {hasBlueprintError && !isGenerating && onRegenerateBlueprint && onCreateSafeBlueprint && (
          <BlueprintRecoveryCard
            errorMessage={project.blueprintLastError}
            validationErrors={project.blueprintValidationErrors}
            onRegenerate={onRegenerateBlueprint}
            onCreateSafe={onCreateSafeBlueprint}
          />
        )}
        <BlueprintTheater
          mode="writer"
          title={project.config.title || t("untitled")}
          subtitle={project.config.subtitle}
          author={project.config.authorName || project.config.author}
          genre={[project.config.genre, project.config.subcategory].filter(Boolean).join(" · ")}
          coverUrl={coverDataUrl}
          onCover={onCover}
          onKdp={onKdp}
          onRadar={onRadar}
          onKeywordGold={onKeywordGold}
          onTitleIntel={onTitleIntel}
          onExport={onExport}
          onMarket={onMarket}
          project={project}
          blueprint={blueprint}
          isGenerating={isGeneratingSection}
          chunkProgress={chunkProgress}
          editable={Boolean(onUpdateOutlineTitle)}
          onChapterTitleChange={onUpdateOutlineTitle}
          onSelectChapter={onSelectChapter}
          selectedChapterIndex={selectedChapterIndex}
          showApproveBanner={project.blueprintApproved === false && Boolean(onApproveBlueprint)}
          onApproveBlueprint={onApproveBlueprint}
          italianUi={(project.config.language || "").toLowerCase().includes("ital")}
        />
        {blueprint.overview && (
          <details className="glass-premium rounded-2xl border border-white/10 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-white/80">Overview blueprint</summary>
            <textarea
              value={blueprint.overview}
              onChange={(e) => onUpdateField?.("overview", e.target.value)}
              readOnly={!onUpdateField}
              rows={4}
              className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/75 focus:outline-none"
            />
          </details>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", premiumWriter && "scriptora-blueprint-premium space-y-8")}>
      {!premiumWriter && <PageHeader title={t("blueprint")} subtitle={t("blueprint_subtitle")} />}

      {premiumWriter && blueprint && (
        <header className="scriptora-blueprint-hero space-y-4 border-b border-white/[0.08] pb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">Mappa del libro</p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl">{project.config.title || t("untitled")}</h1>
          {project.config.subtitle && (
            <p className="text-base italic text-white/55">{project.config.subtitle}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {project.config.genre && (
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/70">
                {project.config.genre}{project.config.subcategory ? ` · ${project.config.subcategory}` : ""}
              </span>
            )}
            {project.config.tone && (
              <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1 text-xs text-violet-100">
                {project.config.tone}
              </span>
            )}
            <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100">
              {project.chapters.filter((c) => c.content?.length).length}/{blueprint.chapterOutlines.length} capitoli scritti
            </span>
          </div>
          {blueprint.overview && (
            <p className="max-w-2xl text-sm leading-7 text-white/65">{blueprint.overview.split("\n")[0]}</p>
          )}
        </header>
      )}

      {isGenerating && (
        <BlueprintRecoveryCard
          isGenerating
          onRegenerate={() => {}}
          onCreateSafe={() => {}}
        />
      )}

      {hasBlueprintError && !isGenerating && onRegenerateBlueprint && onCreateSafeBlueprint && (
        <BlueprintRecoveryCard
          errorMessage={project.blueprintLastError}
          validationErrors={project.blueprintValidationErrors}
          onRegenerate={onRegenerateBlueprint}
          onCreateSafe={onCreateSafeBlueprint}
        />
      )}

      {blueprint && project.blueprintApproved === false && onApproveBlueprint && (
        <div className="rounded-xl border border-amber-400/35 bg-amber-400/10 p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-amber-100">Rivedi la struttura e approva prima di generare capitoli e export.</p>
          <button type="button" onClick={onApproveBlueprint} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950">
            Approva struttura
          </button>
        </div>
      )}

      {blueprint ? (
        <>
          {project.blueprintSource === "config_fallback" && (
            <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-xs leading-relaxed text-sky-100/90">
              {t("blueprint_safe_structure_notice")}
            </div>
          )}
          {project.blueprintSource === "repaired" && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100/90">
              {t("blueprint_recovered_notice")}
            </div>
          )}
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
            {!premiumWriter && (
              <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-4">{t("chapter_outlines")}</p>
            )}
            {premiumWriter && (
              <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">Capitoli</p>
            )}
            <div className={cn("space-y-3", premiumWriter && "space-y-4")}>
              {blueprint.chapterOutlines.map((o, i) => {
                const chapter = project.chapters[i];
                const written = !!(chapter?.content?.length);
                const words = written ? chapter.content.trim().split(/\s+/).filter(Boolean).length : 0;
                const tension = Math.min(5, Math.max(1, Math.round((o.summary?.length || 40) / 80)));

                if (premiumWriter) {
                  return (
                    <button
                      key={`row-${i}`}
                      type="button"
                      onClick={() => onSelectChapter?.(i)}
                      className="scriptora-blueprint-chapter-card group w-full rounded-2xl border border-white/[0.1] bg-white/[0.03] p-5 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                            Capitolo {i + 1}
                          </p>
                          <input
                            value={o.title}
                            onChange={(e) => onUpdateOutlineTitle?.(i, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            readOnly={!onUpdateOutlineTitle}
                            className="mt-1 w-full bg-transparent text-lg font-semibold text-white focus:outline-none"
                          />
                        </div>
                        <span className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold",
                          written ? "bg-emerald-500/15 text-emerald-200" : "bg-white/[0.06] text-white/45",
                        )}>
                          {written ? "✓ scritto" : "○ da scrivere"}
                        </span>
                      </div>
                      {o.summary && (
                        <p className="mt-3 text-xs text-white/45">
                          <span className="font-semibold text-white/55">Obiettivo: </span>
                          {o.summary.split(".")[0]}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-white/45">
                        <span className="inline-flex items-center gap-1.5">
                          Tensione
                          <span className="inline-flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, bar) => (
                              <span
                                key={bar}
                                className={cn(
                                  "h-2 w-2 rounded-sm",
                                  bar < tension ? "bg-violet-400/80" : "bg-white/10",
                                )}
                              />
                            ))}
                          </span>
                        </span>
                        {chapter?.subchapters?.length ? (
                          <span>Sottocapitoli: {chapter.subchapters.length}</span>
                        ) : null}
                        {written && <span>{words.toLocaleString()} parole</span>}
                      </div>
                    </button>
                  );
                }

                return (
                <div key={`row-${i}`} className="flex gap-4 p-4 rounded-lg bg-muted/15 border border-border/30 hover:bg-muted/25 transition-colors">
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
                );
              })}
            </div>
          </div>
        </>
      ) : !isGenerating && !hasBlueprintError ? (
        <div className={cn(
          "rounded-xl border p-5 space-y-4",
          readiness.ready ? "border-sky-500/35 bg-sky-500/10" : "border-amber-400/35 bg-amber-400/10",
        )}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {readiness.ready ? "Blueprint quasi pronto da costruire" : "Manca ancora qualcosa per un blueprint solido"}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {readiness.ready
                  ? "La configurazione ha basi sufficienti. Ora Scriptora può generare una struttura coerente e recuperabile."
                  : "Prima mettiamo fondamenta solide: dati mancanti o troppo deboli generano blueprint fragili e capitoli confusi."}
              </p>
            </div>
            <div className="shrink-0 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-bold text-white">
              Readiness {readiness.score}/100
            </div>
          </div>

          {(readinessIssues.length > 0 || readiness.genreSpecificWarnings.length > 0) && (
            <div className="grid gap-3 md:grid-cols-2">
              {readinessIssues.slice(0, 6).map((issue) => (
                <div key={`${issue.type}-${issue.field}`} className="rounded-lg border border-white/10 bg-black/15 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                    {issue.type === "missing" ? "Campo mancante" : "Campo debole"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">{issue.field}</p>
                </div>
              ))}
              {readiness.genreSpecificWarnings.slice(0, 4).map((warning) => (
                <div key={warning} className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-100/60">Avviso genere</p>
                  <p className="mt-1 text-xs leading-relaxed text-amber-50/90">{warning}</p>
                </div>
              ))}
            </div>
          )}

          {Object.keys(readiness.suggestions).length > 0 && (
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cosa sistemare ora</p>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                {Object.entries(readiness.suggestions).slice(0, 5).map(([key, suggestion]) => (
                  <li key={key}>→ {suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            {readiness.ready && onGenerateBlueprint && (
              <button
                type="button"
                onClick={onGenerateBlueprint}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Genera Blueprint
              </button>
            )}
            {!readiness.ready && onAutoCompleteBlueprintConfig && readiness.canAutoComplete && (
              <button
                type="button"
                onClick={onAutoCompleteBlueprintConfig}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-amber-400 px-3 text-xs font-bold text-slate-950 hover:opacity-90"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Suggerisci automaticamente
              </button>
            )}
            {!readiness.ready && (
              <button
                type="button"
                disabled
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-muted-foreground"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Completa configurazione
              </button>
            )}
            {onCreateSafeBlueprint && (
              <button
                type="button"
                onClick={onCreateSafeBlueprint}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted/40"
              >
                <Shield className="h-3.5 w-3.5" />
                {t("blueprint_create_safe_cta")}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FrontMatterView({ project, frontMatter, isGenerating, onGenerate, ws, onUpdateField }: {
  project: BookProject; frontMatter: BookProject["frontMatter"]; isGenerating: boolean; onGenerate: () => void; ws: WritingSettings;
  onUpdateField?: (field: string, value: string) => void;
}) {
  if (!isFrontMatterEnabled(project.config)) {
    return (
      <MatterSectionDisabled
        title="Front Matter disabilitato"
        description="Hai disattivato il front matter nella configurazione del libro. Puoi riattivarlo dalle impostazioni del progetto o ricreare il libro con le opzioni desiderate."
      />
    );
  }

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
      {isGenerating && (
        <LoadingBanner
          text="Costruzione front matter editoriale"
          steps={FRONT_MATTER_LIVE_STEPS}
        />
      )}
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

function resolveExpectedSubchapterCount(
  project: BookProject,
  outline?: { subchapters?: unknown[] },
): number {
  const blueprintCount = Array.isArray(outline?.subchapters) ? outline.subchapters.length : 0;
  if (blueprintCount > 0) return blueprintCount;
  if (project.blueprint?.chapterOutlines?.length) return 0;
  return getSubchaptersPerChapter(project.config);
}

function SubchapterCoverageStrip({
  chapterIndex,
  expectedCount,
  subchapters,
  isGeneratingSection,
  onGenerateSubchapter,
}: {
  chapterIndex: number;
  expectedCount: number;
  subchapters: Chapter["subchapters"];
  isGeneratingSection: (key: string) => boolean;
  onGenerateSubchapter: (subIdx: number) => void;
}) {
  const total = expectedCount > 0 ? expectedCount : subchapters.length;
  if (total <= 0) return null;

  const written = subchapters.slice(0, total).filter((sub) => hasRealSubchapterContent(sub.content)).length;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-100/75">
          Copertura sottocapitoli reali
        </p>
        <span className="rounded-full bg-cyan-300/10 px-2 py-1 text-[10px] font-semibold text-cyan-100">
          {written}/{total} scritti
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: total }, (_, index) => {
          const sub = subchapters[index];
          const generating = isGeneratingSection(`chapter-${chapterIndex}-sub-${index}`);
          const done = hasRealSubchapterContent(sub?.content);
          const canGenerate = !done && !generating && index < total;
          return (
            <button
              key={`sub-coverage-${chapterIndex}-${index}`}
              type="button"
              disabled={!canGenerate}
              onClick={() => onGenerateSubchapter(index)}
              title={done ? `Sottocapitolo ${chapterIndex + 1}.${index + 1} scritto` : `Genera sottocapitolo ${chapterIndex + 1}.${index + 1}`}
              className={cn(
                "min-h-8 rounded-lg border px-2.5 text-[11px] font-semibold transition-colors",
                done && "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
                generating && "border-amber-300/25 bg-amber-300/10 text-amber-100",
                !done && !generating && canGenerate && "border-cyan-300/25 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/15",
                !done && !generating && !canGenerate && "border-white/10 bg-white/[0.03] text-white/35",
              )}
            >
              {chapterIndex + 1}.{index + 1} · {done ? "scritto" : generating ? "live" : "manca"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function recommendationLabel(action: ChapterEditorialOutcome["recommendedNextAction"]): string {
  switch (action) {
    case "editorial_cleanup":
      return "Pulizia consigliata";
    case "patch":
      return "Patch consigliata";
    case "rewrite_light":
      return "Riscrittura leggera consigliata";
    case "rewrite_medium":
      return "Riscrittura media consigliata";
    default:
      return "Nessuna riscrittura necessaria";
  }
}

function ChapterToolsHub({
  outcome,
  busy,
  cleanupDisabled,
  cleanupRunning,
  rewriteOpen,
  onAnalysis,
  onEvaluate,
  onCleanup,
  onPatch,
  onToggleRewrite,
  onRewrite,
}: {
  outcome: ChapterEditorialOutcome;
  busy: boolean;
  cleanupDisabled: boolean;
  cleanupRunning: boolean;
  rewriteOpen: boolean;
  onAnalysis: () => void;
  onEvaluate: () => void;
  onCleanup: () => void;
  onPatch: () => void;
  onToggleRewrite: () => void;
  onRewrite: (level: RewriteLevel) => void;
}) {
  return (
    <section className="rounded-2xl border border-border/45 bg-muted/10 p-4 shadow-[0_18px_48px_rgba(15,23,42,0.10)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Strumenti capitolo</p>
          <h3 className="mt-1 text-base font-black text-foreground">Esito editoriale</h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">{outcome.summary}</p>
        </div>
        <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-[11px] font-bold text-emerald-100">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {recommendationLabel(outcome.recommendedNextAction)}
        </span>
      </div>

      {outcome.issues.length > 0 && (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {outcome.issues.slice(0, 2).map((issue) => (
            <div key={`${issue.type}-${issue.severity}`} className="rounded-xl border border-border/35 bg-background/35 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
                Priorita' {issue.severity}
              </p>
              <p className="mt-1 text-xs leading-5 text-foreground/70">{issue.description}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <ChapterToolHubButton
          icon={Zap}
          label="Analizza"
          description="Trova problemi di ritmo, coerenza e struttura."
          onClick={onAnalysis}
          disabled={busy}
        />
        <ChapterToolHubButton
          icon={Search}
          label="Vota"
          description="Assegna un voto editoriale severo al capitolo."
          onClick={onEvaluate}
          disabled={busy}
        />
        <ChapterToolHubButton
          icon={Shield}
          label="Pulizia editoriale"
          description="Corregge errori e ripetizioni senza riscrivere."
          onClick={onCleanup}
          disabled={cleanupDisabled || cleanupRunning}
          loading={cleanupRunning}
        />
        <ChapterToolHubButton
          icon={Scissors}
          label="Patch"
          description="Corregge un problema specifico."
          onClick={onPatch}
          disabled={busy}
        />
        <ChapterToolHubButton
          icon={Sparkles}
          label="Riscrivi"
          description="Riscrive con intervento piu' forte."
          onClick={onToggleRewrite}
          disabled={busy}
        />
      </div>

      {rewriteOpen && (
        <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3">
          <p className="text-xs font-bold text-amber-100">
            La riscrittura e' piu' invasiva di Pulizia editoriale e Patch.
          </p>
          <p className="mt-1 text-[11px] leading-5 text-amber-100/75">
            Usala solo se il capitolo e' debole a livello di struttura, ritmo o resa narrativa.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {(["light", "deep", "bestseller"] as RewriteLevel[]).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => onRewrite(level)}
                className="rounded-xl border border-border/35 bg-background/35 px-3 py-2 text-left transition hover:bg-muted/25"
              >
                <p className="text-xs font-black text-foreground">{REWRITE_LEVEL_LABELS[level].label}</p>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{REWRITE_LEVEL_LABELS[level].description}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ChapterToolHubButton({
  icon: Icon,
  label,
  description,
  onClick,
  disabled,
  loading,
}: {
  icon: typeof Zap;
  label: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      title={description}
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[5.75rem] flex-col items-start gap-2 rounded-xl border border-border/40 bg-background/40 p-3 text-left transition enabled:hover:border-primary/30 enabled:hover:bg-muted/20 disabled:opacity-35"
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      </span>
      <span className="text-sm font-black text-foreground">{label}</span>
      <span className="text-[11px] leading-4 text-muted-foreground">{description}</span>
    </button>
  );
}

function ChapterView({
  project, chapterIndex, outline, chapter, isGenerating, isEvaluating,
  onGenerate, onRegenerate, onRewrite, onEvaluate, onAutoRewrite, onGenerateSubchapter,
  onUpdateContent, onUpdateTitle, onUpdateSubContent, onUpdateSubTitle, onSetLengthOverride, isGeneratingSection, onCancel, chunkProgress, ws,
  onNarrateChapter,
  onPersistChapterEditorialAnalysis,
  premiumWriter = false,
  hideDesktopToolbar = false,
  chapterToolRequest = null,
  onRecoverProject,
  onContinueChapter,
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
  onPersistChapterEditorialAnalysis?: EditorPanelProps["onPersistChapterEditorialAnalysis"];
  premiumWriter?: boolean;
  hideDesktopToolbar?: boolean;
  chapterToolRequest?: { mode: "analysis" | "patch" | "cleanup"; nonce: number } | null;
  onRecoverProject?: () => void;
  onContinueChapter?: () => void;
}) {
  const isGenerated = Boolean(chapter?.content?.length);
  const { plan } = usePlan();
  const showFreeWatermark = Boolean(isGenerated && shouldApplyScriptoraFreeWatermark(plan));
  const chapterLanguage = ws?.config?.language || ws?.config?.bookLanguage || ws?.config?.uiLanguage || "it";
  const currentLength = chapter?.lengthOverride || project.config.chapterLength;
  const expectedSubchapterCount = resolveExpectedSubchapterCount(project, outline);
  const writtenSubchapterCount = chapter?.subchapters
    ?.slice(0, expectedSubchapterCount > 0 ? expectedSubchapterCount : undefined)
    .filter((sub) => hasRealSubchapterContent(sub.content)).length || 0;
  const nextMissingSubchapterCandidate = expectedSubchapterCount > 0
    ? Array.from({ length: expectedSubchapterCount }, (_, index) => index)
        .find((index) => !hasRealSubchapterContent(chapter?.subchapters?.[index]?.content))
    : -1;
  const nextMissingSubchapterIndex = typeof nextMissingSubchapterCandidate === "number" ? nextMissingSubchapterCandidate : -1;
  const hasMissingExpectedSubchapter = typeof nextMissingSubchapterIndex === "number" && nextMissingSubchapterIndex >= 0;
  const subchapterCtaIndex = hasMissingExpectedSubchapter ? nextMissingSubchapterIndex : (chapter?.subchapters?.length || 0);
  const chapterWordCount = chapter?.content?.trim() ? chapter.content.trim().split(/\s+/).length : 0;
  const [showRewriteMenu, setShowRewriteMenu] = useState(false);
  const [editorialOpen, setEditorialOpen] = useState(false);
  const [editorialMode, setEditorialMode] = useState<"analysis" | "patch">("analysis");
  const [showFullReport, setShowFullReport] = useState(false);
  const [cleanupStatus, setCleanupStatus] = useState<"idle" | "running" | "ready" | "applied" | "error">("idle");
  const [cleanupResult, setCleanupResult] = useState<EditorialCleanupResult | null>(null);
  const [cleanupError, setCleanupError] = useState("");
  const liveAnchorRef = useRef<HTMLDivElement | null>(null);
  const autoFollowLiveRef = useRef(true);
  const [showReturnToLive, setShowReturnToLive] = useState(false);
  const editorialOutcome = useMemo(
    () => buildChapterEditorialOutcome(chapter?.content || ""),
    [chapter?.content],
  );

  const rawPublicTitle = isGenerated
    ? ((chapter as any)?.narrativeTitle || chapter!.title || outline.title)
    : outline.title;
  const displayedTitle = resolveChapterTitle(rawPublicTitle, chapterIndex, {
    config: project.config,
    summary: outline.summary,
    content: chapter?.content,
    totalChapters: project.config.numberOfChapters,
  });
  const chapterDisplayLabel = formatChapterDisplayTitle(chapterIndex, displayedTitle, {
    config: project.config,
    summary: outline.summary,
    content: chapter?.content,
    totalChapters: project.config.numberOfChapters,
  });
  const liveSignature = `${chunkProgress?.chunkIndex ?? 0}:${chunkProgress?.currentWords ?? 0}:${chunkProgress?.content?.length ?? chapter?.content?.length ?? 0}`;

  const isNearDocumentBottom = useCallback(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return true;
    const doc = document.documentElement;
    const scrollTop = window.scrollY || doc.scrollTop || 0;
    const viewportBottom = scrollTop + window.innerHeight;
    const documentHeight = Math.max(doc.scrollHeight, document.body?.scrollHeight || 0);
    return documentHeight - viewportBottom < 260;
  }, []);

  const scrollToLive = useCallback((behavior: ScrollBehavior = "smooth") => {
    autoFollowLiveRef.current = true;
    setShowReturnToLive(false);
    requestAnimationFrame(() => {
      liveAnchorRef.current?.scrollIntoView({ behavior, block: "end" });
    });
  }, []);

  useEffect(() => {
    if (!isGenerating) {
      autoFollowLiveRef.current = true;
      setShowReturnToLive(false);
      return;
    }

    const handleScroll = () => {
      const nearBottom = isNearDocumentBottom();
      autoFollowLiveRef.current = nearBottom;
      setShowReturnToLive(!nearBottom);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    scrollToLive("auto");
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isGenerating, isNearDocumentBottom, scrollToLive]);

  useEffect(() => {
    if (!isGenerating || !autoFollowLiveRef.current) return;
    scrollToLive("smooth");
  }, [isGenerating, liveSignature, scrollToLive]);

  useEffect(() => {
    if (!chapterToolRequest) return;
    if (chapterToolRequest.mode === "analysis") {
      setEditorialMode("analysis");
      setEditorialOpen(true);
    } else if (chapterToolRequest.mode === "patch") {
      setEditorialMode("patch");
      setEditorialOpen(true);
    } else {
      runCleanupPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterToolRequest?.nonce, chapterToolRequest?.mode]);

  useEffect(() => {
    setCleanupStatus("idle");
    setCleanupResult(null);
    setCleanupError("");
  }, [chapterIndex, chapter?.content]);

  const canRunCleanup = Boolean(
    isGenerated &&
    !isGenerating &&
    !isEvaluating &&
    hasCleanableChapterContent(chapter?.content, chapter?.subchapters),
  );

  const runCleanupPreview = useCallback(() => {
    if (!chapter || !canRunCleanup) return;
    setCleanupStatus("running");
    setCleanupError("");
    window.setTimeout(() => {
      try {
        const result = runEditorialCleanup({
          title: displayedTitle,
          content: chapter.content || "",
          subchapters: chapter.subchapters,
        });
        const validation = validateEditorialCleanupResult(chapter.content || "", result);
        if (!validation.valid) {
          setCleanupResult(null);
          setCleanupError(validation.reason || "Pulizia non sicura: versione pulita non applicabile.");
          setCleanupStatus("error");
          return;
        }
        setCleanupResult(result);
        setCleanupStatus("ready");
      } catch {
        setCleanupResult(null);
        setCleanupError("Pulizia editoriale non completata. Il capitolo originale resta invariato.");
        setCleanupStatus("error");
      }
    }, 160);
  }, [canRunCleanup, chapter, displayedTitle]);

  const applyCleanupResult = useCallback(() => {
    if (!cleanupResult || !chapter) return;
    const validation = validateEditorialCleanupResult(chapter.content || "", cleanupResult);
    if (!validation.valid) {
      setCleanupError(validation.reason || "Versione pulita non applicabile.");
      setCleanupStatus("error");
      return;
    }

    onUpdateContent(cleanupResult.cleanedContent);
    cleanupResult.cleanedSubchapters?.forEach((sub, index) => {
      onUpdateSubContent(index, sub.content);
    });
    setCleanupStatus("applied");
  }, [chapter, cleanupResult, onUpdateContent, onUpdateSubContent]);

  return (
    <div
      id={chapterAnchorId(chapterIndex)}
      className={cn("scriptora-chapter-anchor min-w-0 w-full max-w-full", premiumWriter ? "space-y-6" : "space-y-8")}
    >
      <div className={cn(
        "scriptora-chapter-header flex min-w-0 w-full max-w-full flex-col gap-3",
        isGenerated && "sticky top-2 z-30 rounded-2xl border border-white/10 bg-background/90 p-3 shadow-2xl shadow-slate-950/10 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75",
        !premiumWriter && "sm:flex-row sm:items-start sm:justify-between sm:gap-4",
      )}>
        <div className="min-w-0 w-full flex-1">
          {premiumWriter ? (
            <>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                {project.config.title || t("untitled")}
              </p>
              <p className="mb-1 text-xs font-medium text-white/50">{chapterDisplayLabel.split(" — ")[0] || `Capitolo ${chapterIndex + 1}`}</p>
              <EditableTitle
                value={displayedTitle}
                onChange={(v) => onUpdateTitle?.(v)}
                disabled={!onUpdateTitle}
                className="scriptora-chapter-title-premium"
              />
            </>
          ) : (
            <>
              <p className="mb-1 break-words text-[11px] font-semibold uppercase text-muted-foreground">
                {chapterDisplayLabel}
              </p>
              <EditableTitle
                value={displayedTitle}
                onChange={(v) => onUpdateTitle?.(v)}
                disabled={!onUpdateTitle}
              />
            </>
          )}
        </div>
        <div className={cn(
          "scriptora-chapter-toolbar w-full min-w-0 sm:w-auto sm:shrink-0 sm:pt-1",
          hideDesktopToolbar && isGenerated && "lg:hidden",
          premiumWriter && isGenerated && "max-lg:hidden",
        )}>
          {!isGenerated ? (
            <div className="flex flex-col items-stretch gap-1 sm:items-end">
              <button onClick={onGenerate} disabled={isGenerating || !project.blueprint}
                className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-30">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {t("generate")}
              </button>
              <CreditCostBadge
                operation={resolveChapterGenerationOperation(project.config)}
                bookLength={project.config.bookLength}
                prominent
              />
            </div>
          ) : (
            <>
              {onNarrateChapter && (
                <button
                  type="button"
                  onClick={() => onNarrateChapter(chapterIndex)}
                  disabled={!isGenerated || isGenerating || isEvaluating}
                  title="Voice Studio — ascolta e rileggi il capitolo"
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-emerald-300 px-3 text-[11px] font-bold text-slate-950 transition-colors hover:bg-emerald-200 disabled:opacity-30"
                >
                  <Headphones className="h-3.5 w-3.5 shrink-0" />
                  <span className="sm:hidden">Ascolta</span>
                  <span className="hidden sm:inline">Ascolta capitolo</span>
                </button>
              )}
              <ActionButton icon={<Download className="h-3.5 w-3.5" />} title="TXT" onClick={() => downloadText(`chapter-${chapterIndex + 1}-${(chapter?.title || "chapter").replace(/\s+/g, "_")}.txt`, appendScriptoraFreeWatermarkToText(chapter?.content || "", plan, chapterLanguage))} disabled={!isGenerated} />
              <button
                onClick={() => {
                  setEditorialMode("analysis");
                  setEditorialOpen(true);
                }}
                disabled={isGenerating || isEvaluating}
                title="Trova problemi di ritmo, coerenza e struttura."
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary to-primary/80 px-3 text-[11px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-30"
              >
                <Zap className="h-3.5 w-3.5 shrink-0" />
                <span className="sm:hidden">Analizza</span>
                <span className="hidden sm:inline">Analizza</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditorialMode("patch");
                  setEditorialOpen(true);
                }}
                disabled={isGenerating || isEvaluating}
                title="Corregge un problema specifico."
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-violet-400/35 bg-violet-500/15 px-3 text-[11px] font-semibold text-violet-100 disabled:opacity-30"
              >
                <Scissors className="h-3.5 w-3.5 shrink-0" />
                <span className="sm:hidden">Patch</span>
                <span className="hidden sm:inline">Patch</span>
              </button>
              <button
                type="button"
                onClick={runCleanupPreview}
                disabled={!canRunCleanup || cleanupStatus === "running"}
                title="Corregge errori, frasi rotte e ripetizioni senza riscrivere il capitolo da zero."
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-emerald-300/35 bg-emerald-400/15 px-3 text-[11px] font-semibold text-emerald-100 transition-colors hover:bg-emerald-400/20 disabled:opacity-30"
              >
                {cleanupStatus === "running" ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : <Shield className="h-3.5 w-3.5 shrink-0" />}
                <span className="sm:hidden">Pulizia</span>
                <span className="hidden sm:inline">Pulizia editoriale</span>
              </button>
              <div className="flex shrink-0 flex-col items-center gap-1">
                <ActionButton icon={<Search className="h-3.5 w-3.5" />} title="Vota" onClick={onEvaluate} disabled={isGenerating || isEvaluating} />
                <CreditCostBadge operation="chapter_diagnostic" className="max-w-[5.5rem] truncate sm:max-w-none" />
              </div>
              <ActionButton icon={<RefreshCw className="h-3.5 w-3.5" />} title={t("regenerate")} onClick={onRegenerate} disabled={isGenerating} />
              {onNarrateChapter && (
                <ActionButton
                  icon={<Headphones className="h-3.5 w-3.5" />}
                  title="Modalità lettura"
                  onClick={() => onNarrateChapter(chapterIndex)}
                  disabled={!isGenerated || isGenerating || isEvaluating}
                />
              )}

              {/* Rewrite with levels */}
              <div className="relative flex shrink-0 flex-col items-center gap-1">
                <button onClick={() => setShowRewriteMenu(!showRewriteMenu)} disabled={isGenerating}
                  className="flex h-9 items-center gap-1 rounded-lg px-2.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-30">
                  <Sparkles className="h-3.5 w-3.5" />
                  <ChevronDown className="h-3 w-3" />
                </button>
                <CreditCostBadge operation="rewrite_chapter" />
                {showRewriteMenu && (
                  <div className="absolute right-0 top-10 z-20 w-48 rounded-lg border border-border bg-card py-1 shadow-xl">
                    {([
                      { level: "light" as RewriteLevel },
                      { level: "deep" as RewriteLevel },
                      { level: "bestseller" as RewriteLevel },
                    ]).map(opt => (
                      <button key={opt.level} onClick={() => { onRewrite(opt.level); setShowRewriteMenu(false); }}
                        className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors">
                        <p className="text-xs font-medium text-foreground">{REWRITE_LEVEL_LABELS[opt.level].label}</p>
                        <p className="text-[10px] text-muted-foreground">{REWRITE_LEVEL_LABELS[opt.level].description}</p>
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

      {isGenerated && (
        <ChapterToolsHub
          outcome={editorialOutcome}
          busy={isGenerating || isEvaluating}
          cleanupDisabled={!canRunCleanup}
          cleanupRunning={cleanupStatus === "running"}
          rewriteOpen={showRewriteMenu}
          onAnalysis={() => {
            setEditorialMode("analysis");
            setEditorialOpen(true);
          }}
          onEvaluate={onEvaluate}
          onCleanup={runCleanupPreview}
          onPatch={() => {
            setEditorialMode("patch");
            setEditorialOpen(true);
          }}
          onToggleRewrite={() => setShowRewriteMenu((value) => !value)}
          onRewrite={(level) => {
            onRewrite(level);
            setShowRewriteMenu(false);
          }}
        />
      )}

      {editorialOpen && isGenerated && onPersistChapterEditorialAnalysis && (
        <ChapterEditorialWorkbench
          project={project}
          chapterIndex={chapterIndex}
          initialMode={editorialMode}
          onApplyContent={onUpdateContent}
          onPersistAnalysis={(snapshot, idx, aiRating) => {
            onPersistChapterEditorialAnalysis(idx, snapshot, aiRating);
          }}
          onClose={() => setEditorialOpen(false)}
          onOpenFullReport={() => setShowFullReport(true)}
        />
      )}

      {cleanupStatus === "running" && (
        <LoadingBanner
          text="Pulizia editoriale in corso"
          steps={[
            "Cerco frasi rotte e refusi",
            "Controllo ripetizioni evidenti",
            "Preparo una versione pulita senza riscrivere il capitolo",
          ]}
        />
      )}

      {cleanupStatus === "error" && cleanupError && (
        <div className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {cleanupError}
        </div>
      )}

      {(cleanupStatus === "ready" || cleanupStatus === "applied") && cleanupResult && (
        <div className="rounded-2xl border border-emerald-300/25 bg-emerald-400/10 p-4 text-sm text-emerald-50 shadow-[0_18px_48px_rgba(16,185,129,0.10)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-black text-emerald-100">
                <CheckCircle2 className="h-4 w-4" />
                {cleanupStatus === "applied" ? "Capitolo pulito" : "Pulizia completata"}
              </p>
              <p className="mt-1 text-xs leading-5 text-emerald-50/72">{cleanupResult.summary}</p>
            </div>
            <span className="rounded-lg border border-emerald-200/20 bg-black/18 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-100">
              Confidenza {Math.round(cleanupResult.confidence * 100)}%
            </span>
          </div>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
            <span className="rounded-xl border border-emerald-200/15 bg-black/14 px-3 py-2">Errori corretti: <strong>{cleanupResult.stats.errorsCorrected}</strong></span>
            <span className="rounded-xl border border-emerald-200/15 bg-black/14 px-3 py-2">Ripetizioni ridotte: <strong>{cleanupResult.stats.repetitionsReduced}</strong></span>
            <span className="rounded-xl border border-emerald-200/15 bg-black/14 px-3 py-2">Frasi incomplete: <strong>{cleanupResult.stats.incompleteSentencesFixed}</strong></span>
            <span className="rounded-xl border border-emerald-200/15 bg-black/14 px-3 py-2">Refusi rimossi: <strong>{cleanupResult.stats.typosRemoved}</strong></span>
          </div>
          {cleanupResult.changesApplied.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-emerald-50/78">
              {cleanupResult.changesApplied.slice(0, 4).map((change) => (
                <li key={change}>• {change}</li>
              ))}
            </ul>
          )}
          {cleanupStatus === "ready" && (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={applyCleanupResult}
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-emerald-300 px-4 text-sm font-black text-slate-950 transition hover:bg-emerald-200"
              >
                Applica versione pulita
              </button>
              <button
                type="button"
                onClick={() => {
                  setCleanupStatus("idle");
                  setCleanupResult(null);
                  setCleanupError("");
                }}
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-bold text-white/75 transition hover:bg-white/[0.10]"
              >
                Annulla
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
        <span className="shrink-0 text-[11px] uppercase text-muted-foreground">{t("chapter_length")}</span>
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

      {(expectedSubchapterCount > 0 || (chapter?.subchapters?.length || 0) > 0) && (
        <SubchapterCoverageStrip
          chapterIndex={chapterIndex}
          expectedCount={expectedSubchapterCount}
          subchapters={chapter?.subchapters || []}
          isGeneratingSection={isGeneratingSection}
          onGenerateSubchapter={onGenerateSubchapter}
        />
      )}

      {isGenerating && (
        <GenerationProgress
          project={project}
          chapterIndex={chapterIndex}
          outline={outline}
          onCancel={onCancel}
          chunkProgress={chunkProgress}
          fallbackContent={chapter?.status === "generating" ? chapter?.content : ""}
          liveAnchorRef={liveAnchorRef}
        />
      )}
      {isEvaluating && (
        <LoadingBanner
          text="Analisi editoriale in corso"
          steps={EVALUATION_LIVE_STEPS}
        />
      )}

      {/* Error / partial recovery state */}
      {!isGenerating && chapter?.status === "recovered_partial" && (
        <RecoveryProjectBanner
          showContinueChapter
          onContinueChapter={onContinueChapter}
          onRecover={onRecoverProject}
          className="animate-fade-in"
        />
      )}

      {!isGenerating && isGenerationFailureStatus(chapter?.status) && chapter?.status !== "failed_empty" && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-lg bg-destructive/5 border border-destructive/20 animate-fade-in">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <span className="text-sm text-destructive font-medium flex-1">{t("generation_failed")}</span>
          <button onClick={onGenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">
            <RefreshCw className="h-3 w-3" /> {t("retry")}
          </button>
        </div>
      )}

      {!isGenerating && chapter?.status === "failed_empty" && (
        <div className="space-y-3 animate-fade-in">
          <RecoveryProjectBanner onRecover={onRecoverProject} onContinueChapter={onContinueChapter} showContinueChapter={Boolean(onContinueChapter)} />
          <div className="flex items-center gap-3 px-5 py-3 rounded-lg bg-destructive/5 border border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-sm text-destructive font-medium flex-1">{t("generation_failed")}</span>
            <button onClick={onGenerate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">
              <RefreshCw className="h-3 w-3" /> {t("retry")}
            </button>
          </div>
        </div>
      )}

      {!isGenerating && isGenerationCompleteStatus(chapter?.status) && chapter?.status !== "completed" && chapter?.content && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-amber-900 dark:text-amber-100 animate-fade-in">
          Capitolo salvato. Alcune analisi richiedono completamento.
        </div>
      )}

      {!isGenerated && !isGenerating && !isGenerationFailureStatus(chapter?.status) && (
        <div className="space-y-3">
          <div className="scriptora-chapter-brief scriptora-chapter-brief-static">
            <p className="scriptora-chapter-brief-label">Micro brief editoriale</p>
            <ul>
              {buildMicroChapterBrief(outline.summary, chapterIndex, project.config.language).map((line, index) => (
                <li key={`${index}-${line.slice(0, 12)}`}>{line}</li>
              ))}
            </ul>
          </div>
          <div className="scriptora-chapter-empty-cta rounded-lg border border-dashed border-border/50 bg-muted/5 p-6 text-center">
            <p className="text-sm font-medium text-muted-foreground/70">Capitolo non scritto</p>
            <p className="mt-1 text-xs text-muted-foreground/50">Genera il contenuto per questo capitolo dal blueprint.</p>
            <button
              type="button"
              onClick={onGenerate}
              disabled={isGenerating || !project.blueprint}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              <Sparkles className="h-4 w-4" />
              Genera questo capitolo
            </button>
          </div>
        </div>
      )}

      {isGenerated && (
        <div className="scriptora-chapter-reading-shell overflow-hidden rounded-2xl border border-border/45 bg-background/70 shadow-inner shadow-slate-950/5">
          <div className="sticky top-0 z-10 flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-border/35 bg-background/95 px-4 py-2.5 backdrop-blur-xl">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Lettura capitolo</p>
              <p className="truncate text-xs font-semibold text-foreground/80">{displayedTitle}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-[11px] font-semibold text-muted-foreground">
              <span>{chapterWordCount.toLocaleString("it-IT")} parole</span>
              {expectedSubchapterCount > 0 && <span>{writtenSubchapterCount}/{expectedSubchapterCount} sottocapitoli</span>}
            </div>
          </div>
          <div className="scriptora-chapter-reading-scroll max-h-[min(72dvh,760px)] overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[74ch] space-y-6">
              {!premiumWriter && <AIRatingCard rating={chapter.aiRating} />}
              <EditableBlock content={chapter.content} onChange={onUpdateContent} ws={ws} premium={premiumWriter} />
              {showFreeWatermark && (
                <ScriptoraFreeWatermark language={chapterLanguage} />
              )}

              {chapter.subchapters.length > 0 && (
                <div className="space-y-6 pt-4">
                  <div className="border-t border-border/30 pt-8">
                    <p className="mb-6 text-[11px] font-semibold uppercase text-muted-foreground">{t("subchapters")}</p>
                  </div>
                  {chapter.subchapters.map((sub, j) => {
                    const subGenerating = isGeneratingSection(`chapter-${chapterIndex}-sub-${j}`);
                    return (
                      <div key={j} className="space-y-3 border-l-2 border-primary/15 pl-4 sm:pl-6">
                        <div className="flex items-baseline gap-2">
                          <span className="shrink-0 font-mono text-sm text-primary/40">{chapterIndex + 1}.{j + 1}</span>
                          <EditableTitle
                            value={sub.title}
                            onChange={(v) => onUpdateSubTitle?.(j, v)}
                            disabled={!onUpdateSubTitle}
                            size="sm"
                          />
                        </div>
                        {subGenerating && (
                          <LoadingBanner
                            text="Sottocapitolo in scrittura"
                            steps={SUBCHAPTER_LIVE_STEPS}
                          />
                        )}
                        <EditableBlock content={sub.content} onChange={(val) => onUpdateSubContent(j, val)} ws={ws} />
                      </div>
                    );
                  })}
                </div>
              )}

              {project.config.subchaptersEnabled && (
                <button
                  onClick={() => onGenerateSubchapter(subchapterCtaIndex)}
                  disabled={isGenerating || (expectedSubchapterCount > 0 && !hasMissingExpectedSubchapter)}
                  className="ml-0 mt-3 flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-primary disabled:opacity-30 sm:ml-6">
                  <Plus className="h-3.5 w-3.5" />
                  {expectedSubchapterCount > 0
                    ? hasMissingExpectedSubchapter
                      ? `Genera sottocapitolo ${nextMissingSubchapterIndex + 1}/${expectedSubchapterCount}`
                      : "Sottocapitoli completi"
                    : t("add_subchapter")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!isGenerating && <div ref={liveAnchorRef} aria-hidden="true" className="h-px" />}

      {isGenerated && !premiumWriter && (
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

      {showFullReport && isGenerated && (
        <FeatureErrorBoundary featureName="Diagnostica capitolo">
          <ChapterIntelligencePanel
            project={project}
            chapterIndex={chapterIndex}
            onClose={() => setShowFullReport(false)}
            onApplyContent={(newContent) => onUpdateContent(newContent)}
          />
        </FeatureErrorBoundary>
      )}

      {isGenerating && showReturnToLive && (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+4.75rem)] left-3 right-auto z-[35] flex max-w-[calc(100dvw-1.5rem)] items-center gap-2 rounded-2xl border border-cyan-300/25 bg-slate-950/92 px-3 py-2 text-xs text-white shadow-2xl shadow-cyan-950/40 backdrop-blur-xl sm:bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:left-auto sm:right-6">
          <span className="hidden text-white/65 sm:inline">Stai leggendo più in alto</span>
          <button
            type="button"
            onClick={() => scrollToLive("smooth")}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl bg-cyan-300 px-3 text-[11px] font-bold text-slate-950 transition-colors hover:bg-cyan-200"
          >
            ↓ Torna al live
          </button>
        </div>
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
      {isGenerating && (
        <LoadingBanner
          text="Sottocapitolo in scrittura"
          steps={SUBCHAPTER_LIVE_STEPS}
        />
      )}
      <EditableBlock content={sub.content} onChange={onUpdateContent} ws={ws} />
    </div>
  );
}

function BackMatterView({ project, backMatter, phase, isGenerating, onGenerate, ws, onUpdateField }: {
  project: BookProject; backMatter: BookProject["backMatter"]; phase: string; isGenerating: boolean; onGenerate: () => void; ws: WritingSettings;
  onUpdateField?: (field: string, value: string) => void;
}) {
  if (!isBackMatterEnabled(project.config)) {
    return (
      <MatterSectionDisabled
        title="Back Matter disabilitato"
        description="Hai disattivato il back matter nella configurazione. Il libro può essere completato ed esportato senza postfazione."
      />
    );
  }

  const missingChapters = Array.from({ length: project.config.numberOfChapters }, (_, i) => i)
    .filter((i) => !((project.chapters[i]?.content || "").trim().length > 50));
  const canGenerate = !!project.blueprint && missingChapters.length === 0;

  return (
    <div className="space-y-8">
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
      {isGenerating && (
        <LoadingBanner
          text="Costruzione back matter editoriale"
          steps={BACK_MATTER_LIVE_STEPS}
        />
      )}
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
    <div className="mb-2">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
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
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  size?: "sm" | "lg";
  className?: string;
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
    ? cn("text-2xl font-bold text-foreground", className)
    : cn("text-base font-semibold text-foreground/90", className);

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
        "scriptora-chapter-title-btn group w-full min-w-0 max-w-full text-left",
        !disabled && "cursor-text hover:text-primary transition-colors",
        disabled && "cursor-default",
      )}
    >
      <span className="block w-full min-w-0 break-words [overflow-wrap:anywhere] line-clamp-3 sm:line-clamp-2">
        {value || (disabled ? "" : "Untitled")}
      </span>
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


const CHAPTER_FORGE_STEPS = [
  "Preparazione memoria narrativa",
  "Analisi continuity",
  "Costruzione tensione",
  "Human realism pass",
  "Scrittura manoscritto",
  "Rifinitura finale",
] as const;

const CHAPTER_FORGE_COPY = [
  "Carico memoria narrativa e continuità del libro…",
  "Verifico coerenza con blueprint e personaggi…",
  "Calibro tensione emotiva e ritmo del capitolo…",
  "Applico pass qualità e realismo narrativo…",
  "Sto scrivendo il manoscritto in streaming…",
  "Rifinitura finale prima della consegna…",
] as const;

const FRONT_MATTER_LIVE_STEPS = [
  "Allineo titolo, promessa e identità autore…",
  "Preparo pagine iniziali coerenti con il tono del libro…",
  "Controllo dedica, nota al lettore e apertura editoriale…",
  "Finalizzo una soglia pulita prima del manoscritto.",
] as const;

const BACK_MATTER_LIVE_STEPS = [
  "Rileggo l'arco completo prima della chiusura…",
  "Creo nota autore e conclusione senza ripetere il finale…",
  "Allineo call to action, tono e promessa editoriale…",
  "Finalizzo materiali pronti per export e pubblicazione.",
] as const;

const SUBCHAPTER_LIVE_STEPS = [
  "Leggo il capitolo padre e il punto esatto di continuità…",
  "Costruisco una progressione autonoma ma non duplicata…",
  "Proteggo personaggi, tono e micro-payoff del blueprint…",
  "Rifinisco il sottocapitolo per integrarlo nel manoscritto.",
] as const;

const EVALUATION_LIVE_STEPS = [
  "Misuro ritmo, tensione e chiarezza della scena…",
  "Cerco ripetizioni, passaggi molli e dialoghi deboli…",
  "Verifico personaggi, continuità e promessa narrativa…",
  "Preparo un verdetto editoriale utilizzabile.",
] as const;

function formatForgeTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
}

function compactPreviewLine(value: string, max = 170): string {
  const clean = value
    .replace(/^#+\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).replace(/\s+\S*$/, "").trim()}...`;
}

function buildMicroChapterBrief(summary: string, chapterIndex: number, language?: string): string[] {
  const raw = buildEditorialChapterPreview(summary, chapterIndex, language);
  const beats = raw
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => compactPreviewLine(part.replace(/^[-•*]\s*/, ""), 92))
    .filter((part) => part.length > 10);
  if (beats.length >= 2) return beats.slice(0, 4);
  const fallback = compactPreviewLine(raw, 92);
  return [
    fallback,
    "Tensione emotiva in escalation.",
    "Promessa narrativa: avanzamento della trama.",
  ].slice(0, 3);
}

function resolveChapterForgeStep(
  chunkProgress: ChunkProgress | undefined,
  realPct: number,
  elapsedSeconds: number,
): number {
  if (!chunkProgress) {
    return Math.min(CHAPTER_FORGE_STEPS.length - 1, Math.floor(elapsedSeconds / 8));
  }
  const phaseBase: Record<string, number> = {
    OPENING: 0,
    DEVELOPMENT: 2,
    EXPANSION: 3,
    TRANSITION: 4,
    CLOSURE: 5,
  };
  const base = phaseBase[chunkProgress.phase] ?? 1;
  const pctStep = Math.floor((realPct / 100) * (CHAPTER_FORGE_STEPS.length - 1));
  return Math.min(CHAPTER_FORGE_STEPS.length - 1, Math.max(base, pctStep));
}

function getCompactLiveStreamLines(content: string): string[] {
  const normalized = content
    .replace(/\r/g, "")
    .replace(/^#+\s*.+$/gm, "")
    .trim();
  if (!normalized) return [];
  const paragraphs = normalized.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const tail = paragraphs.slice(-2).join("\n\n");
  const lines = tail.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  return lines.length <= 6 ? lines : lines.slice(-6);
}

const GenerationProgress = memo(function GenerationProgress({
  project,
  chapterIndex,
  outline,
  onCancel,
  chunkProgress,
  fallbackContent = "",
  liveAnchorRef,
}: {
  project: BookProject;
  chapterIndex: number;
  outline?: { title: string; summary: string };
  onCancel?: () => void;
  chunkProgress?: ChunkProgress;
  fallbackContent?: string;
  liveAnchorRef?: RefObject<HTMLDivElement | null>;
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = window.setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const currentWords = chunkProgress?.currentWords ?? 0;
  const targetWords = Math.max(chunkProgress?.targetWords ?? 1, 1);
  const liveContent = (chunkProgress?.content?.trim() || fallbackContent?.trim() || "");
  const hasLiveContent = liveContent.length > 0;

  const statusMessage =
    chunkProgress?.statusMessage ||
    "Preparazione apertura narrativa...";

  const realPct = chunkProgress
    ? Math.min(Math.round((currentWords / targetWords) * 100), 99)
    : Math.min(22, 6 + Math.floor(elapsedSeconds * 1.2));

  // Prima del primo testo live, il 22% è solo avvio motore.
  // Non deve sembrare una rifinitura finale né progresso reale del manoscritto.
  const activeStep = hasLiveContent
    ? resolveChapterForgeStep(chunkProgress, realPct, elapsedSeconds)
    : 0;

  const visualProgress = chunkProgress
    ? Math.max(8, Math.min(98, realPct))
    : hasLiveContent
      ? Math.min(45, 22 + elapsedSeconds * 0.35)
      : Math.min(22, 6 + elapsedSeconds * 1.2);

  const copy = CHAPTER_FORGE_COPY[activeStep] || CHAPTER_FORGE_COPY[0];
  const slow = elapsedSeconds >= 90;

  const dynamicStatusMessage = hasLiveContent
    ? (statusMessage || "Scrittura manoscritto in corso...")
    : elapsedSeconds < 15
      ? "Preparazione memoria narrativa..."
      : elapsedSeconds < 30
        ? "Analisi blueprint e continuità..."
        : elapsedSeconds < 60
          ? "Avvio del primo segmento narrativo..."
          : elapsedSeconds < 120
            ? "Il modello sta preparando l'apertura del capitolo..."
            : "Nessun testo ricevuto ancora: Scriptora sta attendendo il primo blocco dal modello...";

  const streamLines = getCompactLiveStreamLines(liveContent);
  const chapterTitle = resolveChapterTitle(outline?.title || "", chapterIndex, {
    config: project.config,
    summary: outline?.summary,
    totalChapters: project.config.numberOfChapters,
  });
  const briefLines = buildMicroChapterBrief(outline?.summary ?? "", chapterIndex, project.config.language);
  const wordInfo = chunkProgress
    ? `${currentWords.toLocaleString()} / ${targetWords.toLocaleString()} parole`
    : "Avvio motore narrativo";

  useEffect(() => {
    const node = streamRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [liveContent]);

  return (
    <div className="scriptora-chapter-forge animate-fade-in">
      <div className="scriptora-chapter-forge-header">
        <div className="min-w-0 flex-1">
          <p className="scriptora-chapter-forge-kicker">Chapter Forge · {chapterTitle}</p>
          <p className="scriptora-chapter-forge-copy">{copy}</p>
        </div>
        <div className="scriptora-chapter-forge-timer-wrap">
          <Clock3 className="h-4 w-4 shrink-0 text-cyan-200" />
          <span className="scriptora-chapter-forge-timer-label">⏱ Scrittura in corso · {formatForgeTime(elapsedSeconds)}</span>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              title={t("stop_generation")}
              className="scriptora-chapter-forge-stop"
            >
              <Square className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="scriptora-chapter-forge-meter">
        <div className="scriptora-chapter-forge-meter-meta">
          <span>{wordInfo}</span>
          <span>{realPct}%</span>
        </div>
        <div className="scriptora-chapter-forge-bar">
          <div
            className="scriptora-chapter-forge-bar-fill"
            style={{ width: `${visualProgress}%` }}
          />
        </div>
      </div>

      <div className="scriptora-chapter-forge-steps">
        {CHAPTER_FORGE_STEPS.map((step, index) => {
          const active = index === activeStep;
          const done = index < activeStep;
          return (
            <div
              key={step}
              className={cn(
                "scriptora-chapter-forge-step",
                active && "is-active",
                done && "is-done",
              )}
            >
              <span className="scriptora-chapter-forge-step-dot" />
              <span className="min-w-0 truncate">{index + 1}. {step}</span>
            </div>
          );
        })}
      </div>

      <div className="scriptora-chapter-brief">
        <p className="scriptora-chapter-brief-label">Micro brief editoriale</p>
        <ul>
          {briefLines.map((line, index) => (
            <li key={`${index}-${line.slice(0, 12)}`}>{line}</li>
          ))}
        </ul>
      </div>

      <div className="scriptora-chapter-live-stream">
        <div className="scriptora-chapter-live-stream-head">
          <PenLine className="h-3.5 w-3.5 text-emerald-200" />
          <span>Manoscritto live</span>
        </div>
        <div ref={streamRef} className="scriptora-chapter-live-stream-body">
          {streamLines.length > 0 ? (
            streamLines.map((line, index) => (
              <p key={`${index}-${line.slice(0, 12)}`}>{line}</p>
            ))
          ) : (
            <div className="scriptora-chapter-live-stream-placeholder">
              <p>{dynamicStatusMessage}</p>
            </div>
          )}
          {liveContent && <span className="scriptora-generation-caret" aria-hidden="true" />}
        </div>
      </div>

      {slow && (
        <div className="scriptora-chapter-forge-slow">
          Sta richiedendo più tempo del previsto, ma la scrittura è ancora attiva. Non chiudere: Scriptora sta completando il capitolo.
        </div>
      )}

      <div ref={liveAnchorRef} aria-hidden="true" className="h-px" />
    </div>
  );
}, (prev, next) =>
  prev.onCancel === next.onCancel &&
  prev.liveAnchorRef === next.liveAnchorRef &&
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
  prev.chunkProgress?.content === next.chunkProgress?.content &&
  prev.fallbackContent === next.fallbackContent,
);

function LoadingBanner({
  text,
  steps = ["Studio attivo"],
}: {
  text: string;
  steps?: readonly string[];
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const activeStep = steps.length ? steps[stepIndex % steps.length] : "Studio attivo";

  useEffect(() => {
    if (steps.length <= 1) return;
    const interval = window.setInterval(() => {
      setStepIndex((current) => current + 1);
    }, 1400);
    return () => window.clearInterval(interval);
  }, [steps]);

  return (
    <div className="scriptora-loading-banner animate-fade-in">
      <div className="scriptora-loading-icon">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-white">{text}</div>
        <div className="scriptora-loading-subline">
          <span>{activeStep}</span>
          <span className="scriptora-loading-dots" aria-hidden="true"><i /><i /><i /></span>
        </div>
      </div>
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
  premium = false,
}: { content: string; onChange: (val: string) => void; ws?: WritingSettings; premium?: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fontStyle = premium
    ? { fontFamily: "var(--scriptora-manuscript-font)", fontSize: "1.125rem", lineHeight: "1.85" }
    : ws ? { fontFamily: ws.fontFamily, fontSize: `${ws.fontSize}px`, lineHeight: `${ws.lineSpacing}` } : {};

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
          className={cn(
            "w-full resize-none text-foreground/[0.85] focus:outline-none",
            premium
              ? "scriptora-manuscript-body border-0 bg-transparent p-0 focus:ring-0"
              : "rounded-lg border border-primary/20 bg-muted/10 p-5 focus:ring-2 focus:ring-primary/20",
          )}
          style={fontStyle}
          autoFocus />
        <span className="absolute top-3 right-4 text-[9px] text-primary/50 uppercase font-sans">{t("editing")}</span>
      </div>
    );
  }

  return (
    <div onClick={() => setIsEditing(true)}
      className={cn(
        "scriptora-manuscript-body min-h-[120px] cursor-text whitespace-pre-wrap text-foreground/[0.88] transition-colors",
        premium
          ? "border-0 p-0 hover:bg-transparent"
          : "rounded-lg border border-transparent p-5 hover:border-border/20 hover:bg-muted/10",
      )}
      style={fontStyle}
      title={t("click_to_edit")}>
      {content || <span className="text-muted-foreground/40 italic">{t("empty_click_to_add")}</span>}
    </div>
  );
}, (prev, next) => {
  // Skip re-render when content + ws + onChange ref are stable.
  // onChange is typically a useCallback in the parent, so reference equality holds.
  return prev.content === next.content && prev.onChange === next.onChange && prev.ws === next.ws && prev.premium === next.premium;
});
