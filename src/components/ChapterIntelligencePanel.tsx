import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, X, Loader2, AlertCircle, Check, Scissors, Flame, Wand2, Trash2, RefreshCw, TrendingUp, Swords, ArrowRight, ChevronDown, Eye, Lock, Bot, EyeOff, Quote, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BookProject } from "@/types/book";
import { useDomination } from "@/contexts/DominationContext";
import { usePlan, PLAN_LIMITS, fetchPlan } from "@/lib/plan";
import { isDevMode } from "@/lib/dev-mode";
import { getDevPlanOverride } from "@/lib/dev-plan-override";
import { UpgradeModal } from "@/components/UpgradeModal";
import { EditorialMasteryBadge } from "@/components/EditorialMasteryBadge";
import { getEditorialTier } from "@/lib/editorial-mastery";
import { toast } from "sonner";
import { toastPremiumError } from "@/lib/premium-notices";
import { getCurrentUserId } from "@/services/storageService";
import { buildBlueprintIntegrityRuntimeBlock } from "@/lib/BlueprintIntegrityEngine";
import FixChapterComparisonModal from "@/components/FixChapterComparisonModal";
import { computeDevelopmentalEditReport } from "@/lib/chapter-doctor-pro";
import { t, getScriptoraLanguage } from "@/lib/i18n";
import { evaluateChapterBestsellerIntel } from "@/lib/bestseller-intelligence";
import {
  analyzeChapterScenePurpose,
  formatScenePurposeLabel,
  levelLabel,
  readerEmotionDisplayRows,
  simulateReaderEmotion,
} from "@/lib/narrative-intelligence-v2";
import { computeBookEditorialDashboard } from "@/lib/editorial-dashboard-pro";
import { computeMarketPremiumScores } from "@/lib/market-intelligence-premium";
import { useIsMobile } from "@/hooks/useIsMobile";
import { lockViewportScroll, unlockViewportScroll } from "@/lib/viewport-safe";
import { useRequirementGate } from "@/hooks/useRequirementGate";
import { MissingRequirementCard } from "@/components/MissingRequirementCard";
import { buildRequirement } from "@/lib/scriptora-requirement-gate";
import { CreditOperationHint } from "@/components/billing/CreditOperationHint";

function countWordsForChapterLock(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + countWordsForChapterLock(item), 0);
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).reduce((sum, item) => sum + countWordsForChapterLock(item), 0);
  return 0;
}

function countProjectWordsForChapterLock(project: BookProject | null | undefined): number {
  if (!project) return 0;
  let total = 0;
  total += countWordsForChapterLock(project.frontMatter);
  total += countWordsForChapterLock(project.backMatter);
  for (const chapter of project.chapters || []) {
    total += countWordsForChapterLock(chapter?.content);
    for (const sub of chapter?.subchapters || []) total += countWordsForChapterLock(sub?.content);
  }
  return total;
}

async function isFreeChapterAiLocked(project: BookProject | null | undefined): Promise<boolean> {
  const plan = isDevMode() ? getDevPlanOverride() : await fetchPlan();
  return plan === "free" && countProjectWordsForChapterLock(project) > 0;
}

interface ChapterIntelligencePanelProps {
  project: BookProject;
  chapterIndex: number;
  onClose: () => void;
  onApplyContent: (newContent: string) => void;
}

type FixAction = "tighten" | "rewrite" | "compress" | "intensify" | "remove";

interface WeakParagraph {
  idx: number;
  severity: "high" | "medium" | "low";
  problem: string;
  action: FixAction;
  text: string;
}

interface MasteryAIPattern { idx: number; phrase: string; fix: string; }
interface MasteryShowTell { idx: number; told: string; showSuggestion: string; }
interface MasteryWeakSentence { idx: number; sentence: string; why: string; }
interface MasteryHook { issue: boolean; currentOpening: string; suggestion: string; }
interface MasteryMemorability { score: number; quotableCount: number; advice: string; }

interface EditorialMasteryDiagnostic {
  aiPatterns?: MasteryAIPattern[];
  showVsTell?: MasteryShowTell[];
  weakSentences?: MasteryWeakSentence[];
  missingHook?: MasteryHook;
  memorability?: MasteryMemorability;
}

interface AnalysisResult {
  scores: { impact: number; clarity: number; originality: number; rhythm: number; redundancy: number };
  finalScore: number;
  verdict: string;
  keyIssues: string[];
  weakParagraphs: WeakParagraph[];
  globalActions: string[];
  totalParagraphs: number;
  editorialMastery?: EditorialMasteryDiagnostic;
}

interface PatchSegment {
  idx: number;
  level: "strong" | "improvable" | "weak";
  reason?: string;
}
interface ChapterPatch {
  idx: number;
  original: string;
  patched: string;
  type: string;
  reason: string;
}
interface PatchResult {
  segments: PatchSegment[];
  patches: ChapterPatch[];
  evaluation: { score: number; strengths: string[]; improvements: string[]; commercialLevel: string } | null;
  patchedText: string;
  originalText: string;
  modificationPercent: number;
  totalParagraphs: number;
}

const ACTION_META: Record<FixAction, { label: string; icon: any; color: string }> = {
  tighten: { label: "Tighten", icon: Scissors, color: "text-blue-500" },
  rewrite: { label: "Rewrite", icon: Wand2, color: "text-purple-500" },
  compress: { label: "Compress", icon: Scissors, color: "text-cyan-500" },
  intensify: { label: "Intensify", icon: Flame, color: "text-orange-500" },
  remove: { label: "Remove", icon: Trash2, color: "text-destructive" },
};

const SEVERITY_COLOR = {
  high: "border-destructive/40 bg-destructive/5",
  medium: "border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/5",
  low: "border-border/40 bg-muted/5",
};

const LEVEL_STYLE = {
  strong: { dot: "bg-emerald-500", label: "🟢 Strong", border: "border-l-emerald-500" },
  improvable: { dot: "bg-amber-500", label: "🟡 Improvable", border: "border-l-amber-500" },
  weak: { dot: "bg-rose-500", label: "🔴 Weak", border: "border-l-rose-500" },
};

export function ChapterIntelligencePanel({ project, chapterIndex, onClose, onApplyContent }: ChapterIntelligencePanelProps) {
  const { showRequirement, requirementDialog } = useRequirementGate();
  const chapter = project.chapters[chapterIndex];
  const isMobile = useIsMobile();
  const { startDominate, startPatch, getJob, applyJob, dismissJob } = useDomination();

  // Patch is the default action
  const patchJob = getJob(project.id, chapterIndex, "patch");
  const patching = patchJob?.status === "running";
  const patchResult: PatchResult | null = patchJob?.status === "ready" ? patchJob.result : null;

  // Dominate kept as advanced
  const dominateJob = getJob(project.id, chapterIndex, "dominate");
  const dominating = dominateJob?.status === "running";
  const dominateResult = dominateJob?.status === "ready" ? dominateJob.result : null;

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [fixing, setFixing] = useState<number | null>(null);
  const [fixed, setFixed] = useState<Set<number>>(new Set());
  const [workingContent, setWorkingContent] = useState<string>(chapter?.content || "");
  const [showRunAnalyze, setShowRunAnalyze] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showPatchPreview, setShowPatchPreview] = useState(false);
  const [patchPreviewData, setPatchPreviewData] = useState<{ originalText: string; patchedText: string } | null>(null);
  const [showInsightPanels, setShowInsightPanels] = useState(false);

  useEffect(() => {
    lockViewportScroll();
    return () => unlockViewportScroll();
  }, []);

  const bestsellerIntel = useMemo(() => {
    const content = workingContent || chapter?.content || "";
    if (!content.trim() || content.split(/\s+/).filter(Boolean).length < 60) return null;
    return (
      chapter?.bestsellerIntel ||
      evaluateChapterBestsellerIntel({
        config: project.config,
        chapterIndex,
        content,
      })
    );
  }, [workingContent, chapter?.content, chapter?.bestsellerIntel, project.config, chapterIndex]);

  const scenePurposeIntel = useMemo(() => {
    const content = workingContent || chapter?.content || "";
    if (!content.trim() || content.split(/\s+/).filter(Boolean).length < 60) return null;
    return (
      chapter?.scenePurposeIntel ||
      analyzeChapterScenePurpose({
        content,
        chapterIndex,
        config: project.config,
      })
    );
  }, [workingContent, chapter?.content, chapter?.scenePurposeIntel, project.config, chapterIndex]);

  const readerEmotionState = useMemo(() => {
    const content = workingContent || chapter?.content || "";
    if (!content.trim() || content.split(/\s+/).filter(Boolean).length < 60) return null;
    return (
      chapter?.readerEmotionState ||
      simulateReaderEmotion({
        content,
        chapterIndex,
        config: project.config,
        scenePurpose: scenePurposeIntel || undefined,
        totalChapters: project.config.numberOfChapters,
      })
    );
  }, [
    workingContent,
    chapter?.content,
    chapter?.readerEmotionState,
    project.config,
    chapterIndex,
    scenePurposeIntel,
    project.config.numberOfChapters,
  ]);

  const bookDashboard = useMemo(() => computeBookEditorialDashboard(project), [project]);

  const chapterMarketScores = useMemo(() => {
    const content = workingContent || chapter?.content || "";
    if (content.split(/\s+/).filter(Boolean).length < 80) return null;
    return computeMarketPremiumScores({
      content,
      genre: project.config.genre,
      language: project.config.language,
    });
  }, [workingContent, chapter?.content, project.config.genre, project.config.language]);

  const guardFreeChapterAi = async () => {
    if (await isFreeChapterAiLocked(project)) {
      toast.error("AI Editor bloccato nel piano Free dopo il libro gratuito. Passa a Pro/Premium per analisi, patch e Dominate.");
      setShowUpgrade(true);
      return true;
    }
    return false;
  };
  const { plan } = usePlan();
  // Honour dev-mode plan override: only Premium unlocks Dominate.
  // Free/Beta/Pro see the paywall exactly like real users on those tiers.
  const canDominate = PLAN_LIMITS[plan].canDominate;

  const runPatch = async () => {
    if (await guardFreeChapterAi()) return;
    if (!chapter?.content?.trim()) {
      showRequirement("missing_chapter_content", { onPrimary: onClose });
      return;
    }
    await startPatch(project, chapterIndex);
  };
  const applyPatch = () => {
    setShowPatchPreview(true);
  };

  const confirmPatchApply = () => {
    if (!patchJob) return;

    applyJob(patchJob.id, (text) => {
      setWorkingContent(text);
      onApplyContent(text);
    });

    setShowPatchPreview(false);
  };
  const discardPatch = () => {
    if (patchJob) dismissJob(patchJob.id);
  };

  const runDominate = async () => {
    if (await guardFreeChapterAi()) return;
    if (!canDominate) {
      setShowUpgrade(true);
      return;
    }
    await startDominate(project, chapterIndex);
  };
  const applyDominate = () => {
    if (!dominateJob) return;
    applyJob(dominateJob.id, (text) => {
      setWorkingContent(text);
      onApplyContent(text);
    });
  };
  const discardDominate = () => {
    if (dominateJob) dismissJob(dominateJob.id);
  };

  useEffect(() => {
    if (patchResult) {
      setPatchPreviewData({
        originalText: patchResult.originalText,
        patchedText: patchResult.patchedText,
      });
      if (patchResult.patches.length > 0) {
        setShowPatchPreview(true);
      }
    }
  }, [patchResult]);

  const developmentalEditReport = useMemo(() => {
    if (!patchPreviewData || !patchResult) return null;
    return computeDevelopmentalEditReport({
      originalText: patchPreviewData.originalText,
      patchedText: patchPreviewData.patchedText,
      patches: patchResult.patches,
      modificationPercent: patchResult.modificationPercent,
      genre: project.config.genre,
      chapterIndex,
      totalChapters: project.chapters.length,
      chapterTitle: chapter?.title,
      bookIntelligence: project.config.bookIntelligence,
    });
  }, [patchPreviewData, patchResult, project, chapterIndex, chapter?.title]);

  const estimatedBeforeScore = developmentalEditReport?.beforeScore ?? null;
  const realAfterScore = developmentalEditReport?.afterScore ?? null;
  const scoreDelta = developmentalEditReport?.scoreDelta ?? null;
  const deltaMode = developmentalEditReport?.deltaMode ?? "minimal";

  if (showPatchPreview && patchPreviewData && patchResult && developmentalEditReport) {
    return (
      <FixChapterComparisonModal
        patchResult={patchResult}
        report={developmentalEditReport}
        beforeScore={estimatedBeforeScore}
        afterScore={realAfterScore}
        scoreDelta={scoreDelta}
        deltaMode={deltaMode}
        metrics={developmentalEditReport.metrics.map(m => ({
          label: m.label,
          before: m.before,
          after: m.after,
          delta: m.delta,
        }))}
        explanations={developmentalEditReport.explanations}
        onApply={confirmPatchApply}
        onClose={() => setShowPatchPreview(false)}
        onRevert={discardPatch}
      />
    );
  }

  const runAnalysis = async () => {
    if (await guardFreeChapterAi()) return;
    if (!chapter?.content?.trim()) {
      showRequirement("missing_chapter_content", { onPrimary: onClose });
      return;
    }
    setAnalyzing(true);
    setResult(null);
    setFixed(new Set());
    setWorkingContent(chapter.content);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-chapter", {
        body: {
          chapterTitle: chapter.title,
          chapterText: chapter.content,
          genre: project.config.genre,
          tone: project.config.tone,
          language: getScriptoraLanguage(),
          projectId: project.id,
          userId: getCurrentUserId(),
          intensity: "balanced",
        },
      });
      if (error) throw new Error(error.message || "Edge function error");
      if (!data) throw new Error("Nessuna risposta dal server");
      if (data.error) throw new Error(data.error);
      setResult(data as AnalysisResult);
    } catch (e: any) {
      console.error("Analysis failed:", e);
      toastPremiumError(e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const fixParagraph = async (weak: WeakParagraph, fixMode: "clean" | "power" = "clean") => {
    if (await guardFreeChapterAi()) return;
    setFixing(weak.idx);
    try {
      const { data, error } = await supabase.functions.invoke("fix-section", {
        body: {
          paragraphText: weak.text,
          action: weak.action,
          problem: weak.problem,
          genre: project.config.genre,
          tone: project.config.tone,
          language: project.config.language,
          chapterContext: workingContent,
          blueprintIntegrityBlock: buildBlueprintIntegrityRuntimeBlock(project.config, project.blueprint, {
            chapterIndex,
            compact: true,
          }),
          mode: fixMode,
          projectId: project.id,
          userId: getCurrentUserId(),
          intensity: "balanced",
        },
      });
      if (error) throw new Error(error.message || "Edge function error");
      if (!data) throw new Error("Nessuna risposta dal server");
      if (data.error) throw new Error(data.error);

      const paras = workingContent.split(/\n\s*\n/);
      const cleanedNew = (data.improvedText || "").trim();
      if (cleanedNew === "") {
        paras.splice(weak.idx, 1);
      } else {
        paras[weak.idx] = cleanedNew;
      }
      const newContent = paras.join("\n\n");
      setWorkingContent(newContent);
      onApplyContent(newContent);
      setFixed(prev => new Set(prev).add(weak.idx));
      toast.success(`¶${weak.idx + 1} ${fixMode === "power" ? "upgraded ⚡" : "fixed"}`);
    } catch (e: any) {
      console.error("Fix failed:", e);
      toastPremiumError(e.message);
    } finally {
      setFixing(null);
    }
  };

  const fixAll = async (fixMode: "clean" | "power" = "power") => {
    if (!result) return;
    const queue = result.weakParagraphs.filter(w => !fixed.has(w.idx));
    for (const w of queue) {
      await fixParagraph(w, fixMode);
    }
    toast.success(`All sections ${fixMode === "power" ? "upgraded ⚡" : "fixed"}. Re-analyze for new score.`);
  };

  // Build a per-paragraph view that aligns segments to patches for diff display
  const renderPatchDiff = (pr: PatchResult) => {
    const paragraphs = pr.originalText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const patchByIdx = new Map(pr.patches.map(p => [p.idx, p]));
    const segByIdx = new Map(pr.segments.map(s => [s.idx, s]));

    return (
      <div className="space-y-2">
        {paragraphs.map((para, i) => {
          const seg = segByIdx.get(i);
          const patch = patchByIdx.get(i);
          const level = seg?.level || (patch ? "weak" : "strong");
          const style = LEVEL_STYLE[level];

          if (patch) {
            return (
              <div
                key={`stable-${i}`}
                className={`rounded-xl border border-border/40 overflow-hidden ${style.border} border-l-4`}
              >
                <div className="px-4 py-2 bg-muted/30 flex items-center justify-between border-b border-border/30">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                    <span className="text-[10px] font-mono text-muted-foreground">
                      ¶{i + 1}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      {patch.type}
                    </span>
                  </div>

                  <span className="text-[10px] italic text-muted-foreground max-w-[55%] text-right">
                    {patch.reason}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/30">
                  
                  <div className="bg-rose-500/5 p-4">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-rose-500 mb-3">
                      Prima
                    </p>

                    <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3">
                      <p className="text-[13px] text-foreground/80 whitespace-pre-wrap leading-relaxed line-through decoration-rose-500/50">
                        {patch.original}
                      </p>
                    </div>
                  </div>

                  <div className="bg-emerald-500/5 p-4">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-500 mb-3">
                      Dopo
                    </p>

                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 shadow-sm">
                      <p className="text-[13px] text-foreground whitespace-pre-wrap leading-relaxed font-medium">
                        {patch.patched}
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            );
          }

          return (
            <div key={`stable-${i}`} className={`rounded-lg border border-border/30 ${style.border} border-l-4 px-3 py-2`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                <span className="text-[10px] font-mono text-muted-foreground">¶{i + 1}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">{style.label}</span>
                {seg?.reason && <span className="text-[10px] italic text-muted-foreground truncate">— {seg.reason}</span>}
              </div>
              <p className="text-[12px] text-foreground/70 whitespace-pre-wrap leading-relaxed line-clamp-3">{para}</p>
            </div>
          );
        })}
      </div>
    );
  };

  const patchError = patchJob?.status === "error" ? patchJob.error : null;
  const dominateError = dominateJob?.status === "error" ? dominateJob.error : null;

  const idle = !analyzing && !patching && !patchResult && !dominating && !dominateResult && !result && !patchError && !dominateError;
  const showInsights = showInsightPanels || !idle || !isMobile;

  const panel = (
    <div className="scriptora-chapter-doctor-overlay fixed inset-0 z-[120] flex flex-col justify-end bg-black/70 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4 pb-safe pt-safe animate-fade-in">
      <button
        type="button"
        aria-label={t("close")}
        className="absolute inset-0 sm:hidden"
        onClick={onClose}
      />
      <div className="scriptora-chapter-doctor-shell scriptora-viewport-sheet relative flex h-[min(96dvh,100%)] w-full min-h-0 max-h-[96dvh] flex-col overflow-hidden rounded-t-[20px] border border-border/60 bg-card shadow-2xl sm:h-auto sm:max-h-[min(92dvh,92vh)] sm:max-w-4xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/50 p-4 sm:p-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-foreground">{t("chapter_doctor_panel_title")}</h2>
                <EditorialMasteryBadge genre={project.config.genre} subcategory={(project.config as any).subcategory} size="xs" />
              </div>
              <p className="text-xs text-muted-foreground italic">"Analizza salute narrativa, subtext, tensione e rischi di overediting."</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-5">
          {isMobile && idle && !showInsightPanels && (
            <button
              type="button"
              onClick={() => setShowInsightPanels(true)}
              className="w-full rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-left text-xs font-semibold text-foreground transition-colors hover:bg-muted/35"
            >
              Mostra analisi capitolo (Bestseller, Reader Emotion, Scene Health…)
            </button>
          )}
          {showInsights && bestsellerIntel && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wide text-foreground">Bestseller Intelligence</span>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    bestsellerIntel.grade === "bestseller"
                      ? "bg-emerald-500/15 text-emerald-600"
                      : bestsellerIntel.grade === "strong"
                        ? "bg-primary/15 text-primary"
                        : bestsellerIntel.grade === "developing"
                          ? "bg-amber-500/15 text-amber-600"
                          : "bg-rose-500/15 text-rose-600"
                  }`}
                >
                  {bestsellerIntel.scores.overall}/100 · {bestsellerIntel.grade}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  ["Hook", bestsellerIntel.scores.hookStrength],
                  ["Binge", bestsellerIntel.scores.bingeability],
                  ["Retention", bestsellerIntel.scores.readerRetention],
                  ["BookTok", bestsellerIntel.scores.bookTokIntensity],
                ].map(([label, score]) => (
                  <div key={label} className="rounded-lg bg-background/60 px-2 py-1.5 border border-border/40">
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className="text-sm font-semibold text-foreground">{score}</p>
                  </div>
                ))}
              </div>
              {bestsellerIntel.optimizations[0] && (
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">Top fix: </span>
                  {bestsellerIntel.optimizations[0]}
                </p>
              )}
            </div>
          )}

          {showInsights && readerEmotionState && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wide text-foreground">Reader Emotion Simulator</span>
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground">{readerEmotionState.dominantReaderState}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {readerEmotionDisplayRows(readerEmotionState)
                  .filter(row => ["Curiosity", "Emotional Tension", "Boredom Risk", "Obsession Potential"].includes(row.label))
                  .map(row => (
                    <div key={row.label} className="rounded-lg bg-background/60 px-2 py-1.5 border border-border/40">
                      <p className="text-[10px] text-muted-foreground">{row.label}</p>
                      <p className="text-sm font-semibold text-foreground">
                        {levelLabel(row.level)}
                        <span className="text-[10px] text-muted-foreground ml-1">({row.score})</span>
                      </p>
                    </div>
                  ))}
              </div>
              {readerEmotionState.whySummary[0] && (
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">Why: </span>
                  {readerEmotionState.whySummary.join(" · ")}
                </p>
              )}
            </div>
          )}

          {showInsights && scenePurposeIntel && scenePurposeIntel.scenes.length > 0 && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Quote className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wide text-foreground">Scene Health</span>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    scenePurposeIntel.overallHealth === "healthy"
                      ? "bg-emerald-500/15 text-emerald-600"
                      : scenePurposeIntel.overallHealth === "at-risk"
                        ? "bg-amber-500/15 text-amber-600"
                        : "bg-rose-500/15 text-rose-600"
                  }`}
                >
                  {scenePurposeIntel.overallHealth} · {scenePurposeIntel.scenes.length} scenes
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                {scenePurposeIntel.scenes.map(scene => (
                  <div
                    key={scene.sceneIndex}
                    className={`rounded-lg px-3 py-2 border text-[11px] ${
                      scene.health === "weak"
                        ? "border-rose-500/30 bg-rose-500/5"
                        : scene.health === "strong"
                          ? "border-emerald-500/20 bg-emerald-500/5"
                          : "border-border/40 bg-background/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">
                        Scene {scene.sceneIndex}: {formatScenePurposeLabel(scene.primaryPurpose)}
                      </span>
                      <span className="text-muted-foreground capitalize">{scene.health}</span>
                    </div>
                    {scene.issue && <p className="text-muted-foreground mt-1">{scene.issue}</p>}
                    {scene.recommendation && (
                      <p className="text-primary/80 mt-0.5 italic">{scene.recommendation}</p>
                    )}
                  </div>
                ))}
              </div>
              {scenePurposeIntel.recommendations[0] && (
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">Editor note: </span>
                  {scenePurposeIntel.recommendations[0]}
                </p>
              )}
            </div>
          )}

          {showInsights && chapterMarketScores && (
            <div className="rounded-xl border border-border/60 bg-gradient-to-br from-primary/5 to-transparent p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-wide text-foreground">Commercial Readability</span>
                <span className="text-sm font-black text-primary">{chapterMarketScores.composite}/100</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 text-[11px]">
                {[
                  ["Hook strength", chapterMarketScores.hookStrength],
                  ["Bingeability", chapterMarketScores.bingeability],
                  ["Emotional momentum", chapterMarketScores.emotionalMomentum],
                  ["Genre fit", chapterMarketScores.genreAlignment],
                  ...(chapterMarketScores.bookTokPotential != null ? [["BookTok", chapterMarketScores.bookTokPotential]] : []),
                ].map(([label, score]) => (
                  <div key={label} className="rounded-lg bg-background/70 border border-border/40 px-2.5 py-2">
                    <p className="text-muted-foreground">{label}</p>
                    <p className="font-semibold text-foreground">{score}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Retention risk:{" "}
                <span className={`font-semibold ${chapterMarketScores.readerRetentionRisk === "high" ? "text-rose-500" : chapterMarketScores.readerRetentionRisk === "medium" ? "text-amber-600" : "text-emerald-600"}`}>
                  {chapterMarketScores.readerRetentionRisk}
                </span>
                {" · "}
                {chapterMarketScores.genreAlignmentNote}
              </p>
            </div>
          )}

          {showInsights && bookDashboard && (
            <div className="rounded-xl border border-border/60 bg-muted/15 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-foreground">Book Editorial Dashboard</span>
                <span className="text-[10px] text-muted-foreground">{project.chapters.length} chapters</span>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Emotional heatmap</p>
                <div className="flex items-end gap-1 h-16">
                  {bookDashboard.emotionalHeatmap.map(point => (
                    <div key={point.chapter} className="flex-1 min-w-[6px] flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t-md ${point.label === "high" ? "bg-primary" : point.label === "medium" ? "bg-primary/45" : "bg-muted-foreground/30"}`}
                        style={{ height: `${Math.max(12, point.intensity * 10)}%` }}
                        title={`Ch ${point.chapter}: ${point.intensity}/10`}
                      />
                      <span className="text-[8px] text-muted-foreground">{point.chapter}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Tension curve</p>
                <div className="flex items-end gap-1 h-14 rounded-lg bg-background/40 px-1 py-1">
                  {bookDashboard.tensionCurve.map(point => (
                    <div key={`t-${point.chapter}`} className="flex-1 min-w-[6px] flex flex-col items-center gap-0.5">
                      <div
                        className="w-full rounded-t-sm bg-amber-500/70"
                        style={{ height: `${Math.max(8, point.tension * 100)}%` }}
                        title={`Ch ${point.chapter}: ${Math.round(point.tension * 100)}%`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                {[
                  ["Binge", bookDashboard.commercial.bingeability],
                  ["Pull", bookDashboard.commercial.emotionalPull],
                  ["Pace", bookDashboard.commercial.pacingMomentum],
                  ["Tension", bookDashboard.commercial.sceneTension],
                  ["Payoff", bookDashboard.commercial.payoffQuality],
                ].map(([label, score]) => (
                  <div key={label} className="rounded-lg bg-background/60 border border-border/40 px-2 py-1.5">
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className="text-sm font-semibold">{score}</p>
                  </div>
                ))}
              </div>

              {bookDashboard.warnings.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Chapter warnings</p>
                  {bookDashboard.warnings.slice(0, 4).map(w => (
                    <div key={`${w.chapter}-${w.code}`} className="flex gap-2 text-[11px] rounded-lg border border-border/40 bg-background/50 px-2.5 py-2">
                      <span className={`shrink-0 font-bold ${w.severity === "high" ? "text-rose-500" : w.severity === "medium" ? "text-amber-600" : "text-muted-foreground"}`}>
                        Ch.{w.chapter}
                      </span>
                      <span className="text-muted-foreground">{w.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {bookDashboard.dropRiskChapters.length > 0 && (
                <p className="text-[11px] text-rose-600/90">
                  Reader drop risk: chapters {bookDashboard.dropRiskChapters.join(", ")}
                </p>
              )}
            </div>
          )}

          {/* JOB ERRORS */}
          {(patchError || dominateError) && (
            <div className="scriptora-premium-notice scriptora-premium-notice--error rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Revisione non completata</p>
                  <p className="text-xs text-muted-foreground mt-1">{patchError || dominateError}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {patchError && (
                  <button onClick={runPatch}
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90">
                    <RefreshCw className="h-3.5 w-3.5" /> Riprova Fix Capitolo
                  </button>
                )}
                {dominateError && canDominate && (
                  <button onClick={runDominate}
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold bg-card border border-border hover:bg-accent">
                    <RefreshCw className="h-3.5 w-3.5" /> Riprova ricostruzione
                  </button>
                )}
                <button onClick={() => {
                  if (patchJob) dismissJob(patchJob.id);
                  if (dominateJob) dismissJob(dominateJob.id);
                }}
                  className="h-9 px-4 rounded-lg text-xs font-semibold bg-card border border-border hover:bg-accent">
                  Chiudi
                </button>
              </div>
            </div>
          )}

          {/* IDLE — Patch as default */}
          {idle && (
            <div className="text-center py-8 space-y-5">
              {!chapter?.content?.trim() ? (
                <MissingRequirementCard
            payload={buildRequirement("missing_chapter_content")}
            onPrimary={onClose}
            onSecondary={onClose}
            className="mx-auto max-w-md text-left"
          />
              ) : (
              <>
              <Scissors className="h-10 w-10 text-primary mx-auto" />
              <div>
                <p className="text-base font-bold text-foreground">{t("chapter_doctor_panel_subtitle")}</p>
                <p className="text-xs text-muted-foreground mt-1.5 max-w-md mx-auto">
                  Migliora <strong>ciò che hai scritto</strong> — interventi mirati su dialoghi, emozioni, ritmo e chiusure.
                  Mai oltre il <strong>25%</strong>. Voce, canon e struttura intatti.
                </p>
              </div>
              <button onClick={runPatch}
                className="inline-flex items-center gap-2 h-11 px-6 rounded-lg text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-md">
                <Scissors className="h-4 w-4" /> Surgical Edit
              </button>
              <CreditOperationHint
                operation="surgical_fix"
                intensity="standard"
                estimatedWords={countWordsForChapterLock(project.chapters[chapterIndex]?.content)}
                className="mx-auto max-w-md justify-center"
              />
              {/* Advanced toggle */}
              <div className="pt-4 border-t border-border/30 max-w-md mx-auto">
                <button onClick={() => setShowAdvanced(s => !s)}
                  className="flex items-center gap-1.5 mx-auto text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronDown className={`h-3 w-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                  Strumenti avanzati
                </button>
                {showAdvanced && (
                  <div className="mt-3 space-y-2">
                    <button onClick={() => { setShowRunAnalyze(true); runAnalysis(); }}
                      className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-lg text-xs font-semibold bg-card border border-border hover:bg-accent transition-colors">
                      <Sparkles className="h-3.5 w-3.5" /> Diagnosi paragrafo per paragrafo
                    </button>
                    <CreditOperationHint
                      operation="chapter_diagnosis"
                      intensity="standard"
                      estimatedWords={countWordsForChapterLock(project.chapters[chapterIndex]?.content)}
                      showBalance={false}
                      className="px-1"
                    />
                    <button onClick={runDominate}
                      title={canDominate ? "Ricostruzione totale — riscrittura completa" : "Sblocca modalità premium"}
                      className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-lg text-xs font-bold bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white hover:opacity-90 transition-all shadow-sm">
                      {canDominate ? <Swords className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                      {canDominate ? "Ricostruzione totale" : "Modalità premium"}
                    </button>
                    <p className="text-[10px] text-muted-foreground/70 italic px-2">
                      ⚠️ La ricostruzione totale riscrive l’intero capitolo. Usala solo quando vuoi demolire e ricostruire, non per una correzione chirurgica.
                    </p>
                  </div>
                )}
              </div>
              </>
              )}
            </div>
          )}

          {/* PATCHING */}
          {patching && (
            <div className="text-center py-12 space-y-3">
              <div className="relative inline-flex">
                <Scissors className="h-9 w-9 text-primary animate-pulse" />
                <Loader2 className="h-9 w-9 text-primary/60 animate-spin absolute inset-0" />
              </div>
              <p className="text-xs font-semibold text-foreground">Analisi chirurgica in corso…</p>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                Lettura paragrafo per paragrafo → classificazione → patch mirate (max 15%) → valutazione editoriale
              </p>
            </div>
          )}

          {/* PATCH RESULT */}
          {patchResult && !patching && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{t("chapter_doctor_complete")}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {patchResult.patches.length} interventi su {patchResult.totalParagraphs} ¶ — {patchResult.modificationPercent}% modificato
                  </span>
                </div>
                {patchResult.evaluation && (
                  <>
                    <div className="flex items-center justify-center gap-6 py-2">
                      <div className="text-center">
                        <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Prima → Dopo</p>
                        <div className="flex items-end justify-center gap-2">
                          <p className="text-xl font-black text-muted-foreground">
                            {estimatedBeforeScore?.toFixed(1)}
                          </p>
                          <ArrowRight className="h-4 w-4 text-primary mb-1" />
                          <p className={`text-3xl font-black ${patchResult.evaluation.score >= 8 ? "text-primary" : "text-foreground"}`}>
                            {realAfterScore?.toFixed(1)}
                            <span className="text-sm text-muted-foreground/50">/10</span>
                          </p>
                        </div>
                                        {deltaMode === "visible" && scoreDelta !== null && (
                          <p className="text-[11px] font-bold text-emerald-500 mt-1">
                            +{scoreDelta.toFixed(1)} editorial improvement
                          </p>
                        )}

                        {deltaMode === "refinement" && (
                          <p className="text-[11px] font-bold text-emerald-500 mt-1">Precision polish applied</p>
                        )}

                        {deltaMode === "minimal" && (
                          <p className="text-[11px] text-white/60 mt-1">Minimal editorial change</p>
                        )}
                      </div>
                      <div className="text-left max-w-xs">
                        <p className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1">Livello commerciale</p>
                        <p className="text-xs text-foreground/80 italic">"{patchResult.evaluation.commercialLevel}"</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border/30">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider mb-1">Punti di forza</p>
                        <ul className="space-y-0.5">
                          {patchResult.evaluation.strengths.map((s, i) => (
                            <li key={`stable-${i}`} className="text-[11px] text-foreground/70">• {s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-primary tracking-wider mb-1">Consigli editoriali</p>
                        <ul className="space-y-0.5">
                          {patchResult.evaluation.improvements.map((s, i) => (
                            <li key={`stable-${i}`} className="text-[11px] text-foreground/70">• {s}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {patchResult.patches.length > 0 && (
                <button
                  onClick={applyPatch}
                  className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm shadow-lg shadow-blue-500/20 transition inline-flex items-center justify-center gap-2"
                >
                  ✦ Review premium Prima/Dopo
                </button>
              )}

              {/* Diff GitHub-style */}
              {patchResult.patches.length === 0 ? (
                <div className="p-6 text-center rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                  <Check className="h-7 w-7 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-bold text-foreground">Capitolo già forte</p>
                  <p className="text-xs text-muted-foreground mt-1">L'editor non ha trovato interventi necessari.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Diff capitolo (stile pull request)
                    </span>
                  </div>
                  {renderPatchDiff(patchResult)}
                </div>
              )}

              {/* Actions — sticky footer on mobile */}
              <div className="scriptora-chapter-doctor-actions flex flex-wrap items-center gap-2 border-t border-border/30 bg-card/95 pt-3 sm:static sm:border-0 sm:bg-transparent sm:pt-2 sm:backdrop-blur-none">
                <button onClick={applyPatch} disabled={patchResult.patches.length === 0}
                  className="min-h-11 flex-1 inline-flex items-center justify-center gap-2 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md disabled:opacity-40">
                  <Check className="h-3.5 w-3.5" /> Conferma versione patchata
                </button>
                <button onClick={discardPatch}
                  className="min-h-11 px-4 rounded-lg text-xs font-semibold bg-card border border-border hover:bg-accent transition-colors">
                  Discard
                </button>
                <button onClick={runPatch}
                  className="min-h-11 min-w-11 flex items-center justify-center rounded-lg text-xs font-semibold bg-card border border-border hover:bg-accent transition-colors">
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* DOMINATING (advanced) */}
          {dominating && (
            <div className="text-center py-12 space-y-3">
              <div className="relative inline-flex">
                <Swords className="h-9 w-9 text-orange-500 animate-pulse" />
                <Loader2 className="h-9 w-9 text-pink-500 animate-spin absolute inset-0" />
              </div>
              <p className="text-xs font-semibold text-foreground">Dominating chapter…</p>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                Analyzing → demolishing → rewriting → adding final element → re-evaluating
              </p>
            </div>
          )}

          {dominateResult && !dominating && (
            <div className="space-y-4">
              {dominateResult.masteryMode && (
                <div className="p-3 rounded-lg bg-gradient-to-r from-orange-500/15 via-rose-500/15 to-fuchsia-500/15 border border-rose-500/40 flex items-start gap-2">
                  <Zap className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-foreground">🔥 Ottimizzato con Editorial Mastery Engine</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Layer letterario superiore attivo per questo genere — subtext, sensory layering, anti-AI guard.</p>
                  </div>
                </div>
              )}
              <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 via-pink-500/10 to-transparent border border-orange-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500">Domination complete</span>
                  <span className="text-[10px] text-muted-foreground">{dominateResult.iterationsRun} iteration{dominateResult.iterationsRun > 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center justify-center gap-3 py-2">
                  <div className="text-center">
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Before</p>
                    <p className="text-2xl font-bold text-muted-foreground">{dominateResult.passes[0]?.finalScoreBefore?.toFixed(1)}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-orange-500" />
                  <div className="text-center">
                    <p className="text-[10px] uppercase text-orange-500 tracking-wider font-bold">After</p>
                    <p className={`text-3xl font-black ${dominateResult.finalScore >= 8.5 ? "text-primary" : "text-orange-500"}`}>
                      {dominateResult.finalScore?.toFixed(1)}<span className="text-sm text-muted-foreground/50">/10</span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-border/40 bg-card max-h-60 overflow-y-auto">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Preview</p>
                <p className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">
                  {dominateResult.finalText.substring(0, 800)}{dominateResult.finalText.length > 800 ? "…" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={applyDominate}
                  className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-lg text-xs font-bold bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:opacity-90 transition-all shadow-md">
                  <Check className="h-3.5 w-3.5" /> Apply dominated chapter
                </button>
                <button onClick={discardDominate}
                  className="h-10 px-4 rounded-lg text-xs font-semibold bg-card border border-border hover:bg-accent transition-colors">
                  Discard
                </button>
              </div>
            </div>
          )}

          {/* ANALYZE (legacy advanced mode) */}
          {analyzing && (
            <div className="text-center py-12 space-y-3">
              <Loader2 className="h-7 w-7 text-primary animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground">Reading every paragraph, scoring honestly…</p>
            </div>
          )}

          {result && (
            <>
              <div className="p-5 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Final Score</span>
                  <span className={`text-3xl font-black ${result.finalScore >= 8 ? "text-primary" : result.finalScore >= 6 ? "text-foreground" : "text-[hsl(var(--warning))]"}`}>
                    {result.finalScore.toFixed(1)}<span className="text-base text-muted-foreground/50">/10</span>
                  </span>
                </div>
                <p className="text-xs text-foreground/80 italic">"{result.verdict}"</p>
              </div>

              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {Object.entries(result.scores).map(([k, v]) => (
                  <div key={k} className="p-2 rounded-lg bg-muted/15 border border-border/30 text-center">
                    <p className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider truncate">{k}</p>
                    <p className={`text-base font-bold mt-0.5 ${v >= 8 ? "text-primary" : v >= 6 ? "text-foreground" : "text-[hsl(var(--warning))]"}`}>{v}</p>
                  </div>
                ))}
              </div>

              {result.editorialMastery && (
                <div className="space-y-3 p-4 rounded-xl border border-rose-500/30 bg-gradient-to-br from-orange-500/5 via-rose-500/5 to-fuchsia-500/5">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-rose-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500">Editorial Mastery Diagnostic</span>
                  </div>

                  {result.editorialMastery.missingHook?.issue && (
                    <div className="p-2.5 rounded-lg bg-card/60 border border-border/40">
                      <div className="flex items-center gap-1.5 mb-1">
                        <AlertCircle className="h-3 w-3 text-[hsl(var(--warning))]" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">Hook debole</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground italic line-clamp-2">"{result.editorialMastery.missingHook.currentOpening}"</p>
                      <p className="text-[11px] text-foreground/80 mt-1"><span className="font-semibold text-rose-500">→ </span>{result.editorialMastery.missingHook.suggestion}</p>
                    </div>
                  )}

                  {result.editorialMastery.memorability && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-card/60 border border-border/40">
                      <Quote className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">Memorabilità</span>
                          <span className={`text-xs font-bold ${result.editorialMastery.memorability.score >= 7 ? "text-primary" : "text-[hsl(var(--warning))]"}`}>
                            {result.editorialMastery.memorability.score}/10
                          </span>
                          <span className="text-[10px] text-muted-foreground">· {result.editorialMastery.memorability.quotableCount} righe quotabili</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground/90 mt-0.5">{result.editorialMastery.memorability.advice}</p>
                      </div>
                    </div>
                  )}

                  {(result.editorialMastery.aiPatterns?.length ?? 0) > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Bot className="h-3 w-3 text-rose-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">AI patterns rilevati ({result.editorialMastery.aiPatterns!.length})</span>
                      </div>
                      {result.editorialMastery.aiPatterns!.slice(0, 5).map((p, i) => (
                        <div key={`stable-${i}`} className="px-2.5 py-1.5 rounded-md bg-rose-500/5 border border-rose-500/20 text-[11px]">
                          <span className="font-mono text-muted-foreground">¶{p.idx + 1}</span>
                          <span className="text-rose-500/90 italic mx-1.5">"{p.phrase}"</span>
                          <span className="text-foreground/70">→ {p.fix}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {(result.editorialMastery.showVsTell?.length ?? 0) > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <EyeOff className="h-3 w-3 text-rose-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">Show vs Tell ({result.editorialMastery.showVsTell!.length})</span>
                      </div>
                      {result.editorialMastery.showVsTell!.slice(0, 5).map((s, i) => (
                        <div key={`stable-${i}`} className="px-2.5 py-1.5 rounded-md bg-card/60 border border-border/40 text-[11px]">
                          <span className="font-mono text-muted-foreground">¶{s.idx + 1}</span>
                          <span className="text-foreground/60 italic mx-1.5 line-through">"{s.told}"</span>
                          <span className="text-foreground/85">→ {s.showSuggestion}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {(result.editorialMastery.weakSentences?.length ?? 0) > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="h-3 w-3 text-[hsl(var(--warning))]" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">Frasi deboli ({result.editorialMastery.weakSentences!.length})</span>
                      </div>
                      {result.editorialMastery.weakSentences!.slice(0, 5).map((w, i) => (
                        <div key={`stable-${i}`} className="px-2.5 py-1.5 rounded-md bg-card/60 border border-border/40 text-[11px]">
                          <span className="font-mono text-muted-foreground">¶{w.idx + 1}</span>
                          <span className="text-foreground/80 italic mx-1.5">"{w.sentence}"</span>
                          <span className="text-[hsl(var(--warning))] font-semibold">{w.why}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {result.keyIssues.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-[hsl(var(--warning))]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Key issues</span>
                  </div>
                  <ul className="space-y-1">
                    {result.keyIssues.map((issue, i) => (
                      <li key={`stable-${i}`} className="text-xs text-foreground/70 pl-4 relative">
                        <span className="absolute left-0 text-[hsl(var(--warning))]/60">•</span>{issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.weakParagraphs.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Sections to fix ({result.weakParagraphs.length})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => fixAll("clean")} disabled={fixing !== null || fixed.size === result.weakParagraphs.length}
                        className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[10px] font-semibold bg-card border border-border hover:bg-accent disabled:opacity-40 transition-colors">
                        <Scissors className="h-3 w-3" /> Clean all
                      </button>
                      <button onClick={() => fixAll("power")} disabled={fixing !== null || fixed.size === result.weakParagraphs.length}
                        className="flex items-center gap-1.5 h-7 px-3 rounded-md text-[10px] font-bold bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:opacity-90 disabled:opacity-40 transition-all shadow-sm">
                        <Flame className="h-3 w-3" /> Power all
                      </button>
                    </div>
                  </div>

                  {result.weakParagraphs.map((w) => {
                    const meta = ACTION_META[w.action] || ACTION_META.rewrite;
                    const Icon = meta.icon;
                    const isFixed = fixed.has(w.idx);
                    const isFixing = fixing === w.idx;
                    return (
                      <div key={w.idx} className={`p-3 rounded-lg border ${isFixed ? "border-primary/40 bg-primary/5" : SEVERITY_COLOR[w.severity]} space-y-2`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              w.severity === "high" ? "bg-destructive/15 text-destructive" :
                              w.severity === "medium" ? "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]" :
                              "bg-muted text-muted-foreground"
                            }`}>{w.severity}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">¶{w.idx + 1}</span>
                            <span className="text-[11px] text-foreground/70 truncate">{w.problem}</span>
                          </div>
                          {isFixed ? (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-primary shrink-0">
                              <Check className="h-3 w-3" /> Fixed
                            </span>
                          ) : (
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => fixParagraph(w, "clean")} disabled={isFixing || fixing !== null}
                                className="flex items-center gap-1 h-7 px-2 rounded-md text-[10px] font-semibold bg-card border border-border hover:bg-accent transition-colors disabled:opacity-40">
                                {isFixing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Icon className={`h-3 w-3 ${meta.color}`} />}
                                Clean
                              </button>
                              <button onClick={() => fixParagraph(w, "power")} disabled={isFixing || fixing !== null}
                                className="flex items-center gap-1 h-7 px-2 rounded-md text-[10px] font-bold bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:opacity-90 transition-all disabled:opacity-40 shadow-sm">
                                <Flame className="h-3 w-3" /> Power
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground/80 italic line-clamp-2 pl-1 border-l-2 border-border/30 ml-1">
                          {w.text.substring(0, 200)}{w.text.length > 200 ? "…" : ""}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-2 border-t border-border/30 flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">{result.totalParagraphs} paragraphs analyzed</p>
                <button onClick={runAnalysis} disabled={analyzing}
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                  <RefreshCw className="h-3 w-3" /> Re-analyze
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} reason="dominate" currentPlan={plan} />
      {requirementDialog}
    </div>
  );

  return typeof document !== "undefined" ? createPortal(panel, document.body) : panel;
}
