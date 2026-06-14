import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Scissors,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import type { BookProject, ChapterEditorialSnapshot, AIQualityRating } from "@/types/book";
import { useDomination } from "@/contexts/DominationContext";
import {
  humanizeEditorialError,
  runLocalChapterEditorialAnalysis,
  type AnalysisStatus,
  type PatchStatus,
} from "@/lib/chapter-editorial-workflow";
import { cn } from "@/lib/utils";

type PatchResult = {
  patches: Array<{ idx: number; original: string; patched: string; type: string; reason: string }>;
  patchedText: string;
  originalText: string;
  modificationPercent: number;
  evaluation: { score: number; improvements: string[]; strengths: string[] } | null;
};

interface ChapterEditorialWorkbenchProps {
  project: BookProject;
  chapterIndex: number;
  initialMode?: "analysis" | "patch";
  onApplyContent: (content: string) => void;
  onPersistAnalysis: (
    snapshot: ChapterEditorialSnapshot,
    chapterIndex: number,
    aiRating: AIQualityRating,
  ) => void;
  onClose: () => void;
  onOpenFullReport?: () => void;
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 min-w-0">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground truncate">{label}</p>
      <p className="text-sm font-bold tabular-nums text-foreground">{Math.round(value)}</p>
    </div>
  );
}

export function ChapterEditorialWorkbench({
  project,
  chapterIndex,
  initialMode = "analysis",
  onApplyContent,
  onPersistAnalysis,
  onClose,
  onOpenFullReport,
}: ChapterEditorialWorkbenchProps) {
  const chapter = project.chapters[chapterIndex];
  const panelRef = useRef<HTMLDivElement>(null);
  const { startPatch, getJob, applyJob, dismissJob } = useDomination();
  const patchJob = getJob(project.id, chapterIndex, "patch");

  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [patchStatus, setPatchStatus] = useState<PatchStatus>("idle");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [patchError, setPatchError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<ChapterEditorialSnapshot | null>(
    chapter?.editorialAnalysis ?? null,
  );
  const [showDiff, setShowDiff] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const patchResult: PatchResult | null = patchJob?.status === "ready" ? patchJob.result : null;

  const runAnalysis = useCallback(async (opts?: { silent?: boolean }) => {
    if (!chapter?.content?.trim()) {
      setAnalysisStatus("error");
      setAnalysisError("Capitolo vuoto — scrivi o genera il testo prima dell'analisi.");
      if (!opts?.silent) toast.error("Capitolo vuoto.");
      return;
    }
    setAnalysisStatus("running");
    setAnalysisError(null);
    try {
      const result = runLocalChapterEditorialAnalysis(
        chapter.content,
        project.config,
        chapterIndex,
      );
      setSnapshot(result.snapshot);
      onPersistAnalysis(result.snapshot, chapterIndex, result.aiRating);
      setAnalysisStatus("done");
      if (!opts?.silent) toast.success(`Analisi completata · ${result.snapshot.scoreOutOf10}/10`);
    } catch (e) {
      const message = humanizeEditorialError(e);
      setAnalysisStatus("error");
      setAnalysisError(message);
      if (!opts?.silent) toast.error(message);
    }
  }, [chapter?.content, chapterIndex, onPersistAnalysis, project.config]);

  const runPatch = useCallback(async () => {
    if (!chapter?.content?.trim()) {
      setPatchError("Capitolo vuoto.");
      toast.error("Capitolo vuoto.");
      return;
    }
    if (analysisStatus !== "done" && !snapshot) {
      await runAnalysis({ silent: true });
    }
    setPatchStatus("running");
    setPatchError(null);
    try {
      await startPatch(project, chapterIndex);
    } catch (e) {
      const message = humanizeEditorialError(e);
      setPatchStatus("error");
      setPatchError(message);
      toast.error(message);
    }
  }, [analysisStatus, chapter?.content, chapterIndex, project, runAnalysis, snapshot, startPatch]);

  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    if (initialMode === "analysis") {
      void runAnalysis();
    } else if (initialMode === "patch") {
      void runPatch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on open
  }, [chapterIndex, initialMode]);

  useEffect(() => {
    if (patchJob?.status === "running") {
      setPatchStatus("running");
      return;
    }
    if (patchJob?.status === "ready" && patchResult) {
      setPatchStatus("preview");
      setShowDiff(true);
      return;
    }
    if (patchJob?.status === "error") {
      setPatchStatus("error");
      setPatchError(patchJob.error || "Patch fallita.");
    }
  }, [patchJob?.status, patchJob?.error, patchResult]);

  const predictedScore = useMemo(() => {
    if (!snapshot) return null;
    if (patchResult?.evaluation?.score) return patchResult.evaluation.score;
    const bump = Math.min(0.8, (patchResult?.patches?.length || 0) * 0.12);
    return Math.min(10, Math.round((snapshot.scoreOutOf10 + bump) * 10) / 10);
  }, [patchResult, snapshot]);

  const applyPatch = () => {
    if (!patchJob || !patchResult?.patchedText) {
      toast.error("Patch generata ma vuota — rigenera la patch.");
      return;
    }
    setPatchStatus("applying");
    applyJob(patchJob.id, (text) => {
      onApplyContent(text);
      setPatchStatus("done");
      dismissJob(patchJob.id);
      toast.success("Patch applicata — puoi annullare dall'editor se necessario.");
    });
  };

  const discardPatch = () => {
    if (patchJob) dismissJob(patchJob.id);
    setPatchStatus("idle");
    setShowDiff(false);
  };

  return (
    <div
      ref={panelRef}
      className="scriptora-chapter-editorial-workbench min-w-0 w-full max-w-full rounded-2xl border border-sky-400/25 bg-gradient-to-br from-sky-500/10 via-indigo-500/5 to-transparent shadow-lg shadow-sky-950/20"
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/20">
            <Sparkles className="h-4 w-4 text-sky-200" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white">Analysis Pro</p>
            <p className="truncate text-[10px] text-white/55">
              {analysisStatus === "running"
                ? "Analisi editoriale in corso…"
                : patchStatus === "running"
                  ? "Patch chirurgica in corso…"
                  : analysisStatus === "done"
                    ? `Analisi completata${snapshot ? ` · ${snapshot.scoreOutOf10}/10` : ""}`
                    : "Editoriale Scriptora"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label={expanded ? "Comprimi pannello" : "Espandi pannello"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Chiudi pannello editoriale"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="scriptora-chapter-editorial-body max-h-[70dvh] min-h-0 overflow-y-auto overscroll-contain px-3 py-3 pb-safe sm:px-4">
          {analysisStatus === "running" && (
            <div className="flex items-center gap-3 rounded-xl border border-sky-300/20 bg-sky-400/10 px-3 py-3">
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-sky-200" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-sky-50">Analisi editoriale in corso…</p>
                <p className="text-[11px] leading-5 text-sky-100/70">
                  Sto leggendo emozione, dialoghi, pacing, sottotesto e leggibilità commerciale.
                </p>
              </div>
            </div>
          )}

          {analysisStatus === "error" && analysisError && (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-3 text-sm text-rose-100">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p>{analysisError}</p>
                <button
                  type="button"
                  onClick={() => void runAnalysis()}
                  className="mt-2 text-[11px] font-semibold underline"
                >
                  Riprova analisi
                </button>
              </div>
            </div>
          )}

          {snapshot && analysisStatus === "done" && patchStatus !== "preview" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-white">
                  Score {snapshot.scoreOutOf10}
                  <span className="text-white/45">/10</span>
                </p>
                <span className="text-[10px] text-white/45">
                  {Math.round(snapshot.compositeScore)}/100 composite
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <ScorePill label="Emozione" value={snapshot.emotionalRealism} />
                <ScorePill label="Dialoghi" value={snapshot.dialogueHumanity} />
                <ScorePill label="Pacing" value={snapshot.pacingBalance} />
                <ScorePill label="Sottotesto" value={snapshot.subtextStrength} />
              </div>

              <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200/80">Problema principale</p>
                <p className="mt-1 break-words text-xs leading-5 text-amber-50/90">{snapshot.primaryIssue}</p>
              </div>

              {snapshot.suggestions.length > 0 && (
                <ul className="space-y-1 text-[11px] leading-5 text-white/70">
                  {snapshot.suggestions.slice(0, 3).map((line) => (
                    <li key={line} className="break-words">→ {line}</li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void runPatch()}
                  disabled={patchStatus === "running"}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
                >
                  {patchStatus === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Scissors className="h-3.5 w-3.5" />}
                  Genera Patch
                </button>
                {onOpenFullReport && (
                  <button
                    type="button"
                    onClick={onOpenFullReport}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-3 text-[11px] font-semibold text-white/85"
                  >
                    <Zap className="h-3.5 w-3.5" /> Apri Report
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void runAnalysis()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/15 px-3 text-[11px] font-semibold text-white/70"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Rianalizza
                </button>
              </div>
            </div>
          )}

          {patchStatus === "running" && (
            <div className="flex items-center gap-3 rounded-xl border border-violet-300/20 bg-violet-400/10 px-3 py-3">
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-violet-200" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-violet-50">Patch editoriale in corso…</p>
                <p className="text-[11px] leading-5 text-violet-100/70">
                  Intervento chirurgico sul capitolo — massimo 15% di modifica, voce e trama intatte.
                </p>
              </div>
            </div>
          )}

          {patchStatus === "error" && patchError && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-3 text-sm text-rose-100">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <div>
                <p>{patchError}</p>
                <button type="button" onClick={() => void runPatch()} className="mt-2 text-[11px] font-semibold underline">
                  Rigenera patch
                </button>
              </div>
            </div>
          )}

          {patchStatus === "preview" && patchResult && (
            <div className="space-y-3">
              <div className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Patch Editor</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  Miglioramento stimato:{" "}
                  <span className="text-muted-foreground">{snapshot?.scoreOutOf10 ?? "—"}</span>
                  {" → "}
                  <span className="text-primary">{predictedScore ?? "—"}</span>
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {patchResult.patches.length} interventi · {patchResult.modificationPercent}% modificato
                </p>
              </div>

              {patchResult.evaluation?.improvements?.length ? (
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Interventi</p>
                  <ul className="space-y-1 text-[11px] text-foreground/85">
                    {patchResult.evaluation.improvements.slice(0, 5).map((line) => (
                      <li key={line} className="break-words">- {line}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setShowDiff((v) => !v)}
                className="text-[11px] font-semibold text-sky-300 hover:text-sky-200"
              >
                {showDiff ? "Nascondi confronto" : "Mostra confronto"}
              </button>

              {showDiff && patchResult.patches.length > 0 && (
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-2">
                  {patchResult.patches.slice(0, 4).map((p) => (
                    <div key={p.idx} className="rounded-md border border-white/10 bg-white/[0.03] p-2 text-[11px]">
                      <p className="font-semibold text-white/70">¶{p.idx + 1} · {p.type}</p>
                      <p className="mt-1 line-through text-rose-200/70 break-words">{p.original.slice(0, 160)}…</p>
                      <p className="mt-1 text-emerald-100/90 break-words">{p.patched.slice(0, 160)}…</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={applyPatch}
                  disabled={!patchResult.patchedText || patchResult.patches.length === 0}
                  className={cn(
                    "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-[11px] font-bold text-primary-foreground min-w-[120px]",
                    "disabled:opacity-40",
                  )}
                >
                  <Check className="h-3.5 w-3.5" /> Applica patch
                </button>
                <button
                  type="button"
                  onClick={discardPatch}
                  className="inline-flex h-9 items-center rounded-lg border border-white/15 px-3 text-[11px] font-semibold text-white/75"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={() => void runPatch()}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/15 px-3 text-[11px] font-semibold text-white/75"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Rigenera
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
