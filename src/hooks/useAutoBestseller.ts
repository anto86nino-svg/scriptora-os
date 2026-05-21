import { useCallback, useEffect, useRef, useState } from "react";
import {
  AutoBestsellerInput,
  AutoBestsellerResult,
  BookEvent,
  ChapterProgress,
  RetryEvent,
  StageId,
  StageState,
  createRunRow,
  runAutoBestsellerStream,
  updateRunRow,
} from "@/services/autoBestsellerService";
import { liveBookToPartialProject } from "@/lib/auto-bestseller-to-project";
import { saveProjectAsync } from "@/services/storageService";
import { createProjectId } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { resolveChapterTitle } from "@/lib/chapter-titles";

const INITIAL_STAGES: StageState[] = [
  { id: "titles", label: "Generating Titles", status: "pending" },
  { id: "market", label: "Validating Market", status: "pending" },
  { id: "blueprint", label: "Building Blueprint", status: "pending" },
  { id: "gono", label: "Go / No-Go Decision", status: "pending" },
  { id: "chapters", label: "Writing Chapters", status: "pending" },
  { id: "aggregate", label: "Final Aggregation", status: "pending" },
];

const RUN_CACHE_PREFIX = "nexora-run-cache:";
const RUN_STALE_AFTER_MS = 15 * 60 * 1000;

export interface LiveChapter {
  index: number;
  title: string;
  phase: "writing" | "refining" | "done";
  content?: string;
  score?: number;
}

export interface LiveBook {
  title?: string;
  subtitle?: string;
  outlines?: Array<{ title: string; summary?: string }>;
  chapters: LiveChapter[];
  currentStageLabel: string;
}

const INITIAL_LIVE_BOOK: LiveBook = {
  chapters: [],
  currentStageLabel: "Idle",
};

interface PersistedRunSnapshot {
  input: AutoBestsellerInput | null;
  progress: any[];
  result: AutoBestsellerResult | null;
  error: string | null;
  status: string;
  retryCount: number;
  finalScore: number | null;
  marketScore: number | null;
  partialProjectId: string | null;
  updatedAt: number;
}

export interface UseAutoBestsellerState {
  isRunning: boolean;
  stages: StageState[];
  retries: RetryEvent[];
  chapters: ChapterProgress[];
  liveBook: LiveBook;
  result: AutoBestsellerResult | null;
  error: string | null;
  runId: string | null;
  partialProjectId: string | null;
}

function getRunCacheKey(runId: string) {
  return `${RUN_CACHE_PREFIX}${runId}`;
}

function readRunSnapshot(runId: string): PersistedRunSnapshot | null {
  try {
    const raw = localStorage.getItem(getRunCacheKey(runId));
    return raw ? (JSON.parse(raw) as PersistedRunSnapshot) : null;
  } catch {
    return null;
  }
}

function writeRunSnapshot(runId: string, snapshot: PersistedRunSnapshot) {
  try {
    localStorage.setItem(getRunCacheKey(runId), JSON.stringify(snapshot));
  } catch {
    // Ignore cache failures — DB persistence is still the main source of truth.
  }
}

function resolveAutoChapterTitle(rawTitle: unknown, index: number, opts?: { summary?: string; total?: number; language?: string }) {
  return resolveChapterTitle(rawTitle, index, {
    summary: opts?.summary,
    totalChapters: opts?.total,
    language: opts?.language || "Italian",
  });
}

function normalizeAutoResult(result: AutoBestsellerResult | null): AutoBestsellerResult | null {
  if (!result) return result;
  const outlines = result.blueprint?.chapterOutlines || result.blueprint?.outlines || [];
  const total = result.chapters?.length || outlines.length || 0;
  return {
    ...result,
    chapters: (result.chapters || []).map((chapter, index) => ({
      ...chapter,
      title: resolveAutoChapterTitle(chapter?.title || outlines[index]?.title, index, {
        summary: outlines[index]?.summary,
        total,
      }),
    })),
  };
}

export function useAutoBestseller() {
  const [state, setState] = useState<UseAutoBestsellerState>({
    isRunning: false,
    stages: INITIAL_STAGES,
    retries: [],
    chapters: [],
    liveBook: INITIAL_LIVE_BOOK,
    result: null,
    error: null,
    runId: null,
    partialProjectId: null,
  });
  const abortRef = useRef<(() => void) | null>(null);
  const partialProjectIdRef = useRef<string | null>(null);
  const lastInputRef = useRef<AutoBestsellerInput | null>(null);
  const pollRef = useRef<number | null>(null);
  const attachedRunIdRef = useRef<string | null>(null);

  const updateStage = useCallback((id: StageId, patch: Partial<StageState>) => {
    setState((prev) => ({
      ...prev,
      stages: prev.stages.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.();
    abortRef.current = null;
    stopPolling();
    attachedRunIdRef.current = null;
    partialProjectIdRef.current = null;
    lastInputRef.current = null;
    setState({
      isRunning: false,
      stages: INITIAL_STAGES.map((s) => ({ ...s, status: "pending", detail: undefined, meta: undefined })),
      retries: [],
      chapters: [],
      liveBook: INITIAL_LIVE_BOOK,
      result: null,
      error: null,
      runId: null,
      partialProjectId: null,
    });
  }, [stopPolling]);

  /** Save current liveBook as a partial BookProject (silent — used during generation). */
  const savePartialNow = useCallback(async (liveBook: LiveBook) => {
    if (!lastInputRef.current) return;
    if (!partialProjectIdRef.current) {
      partialProjectIdRef.current = createProjectId();
      setState((p) => ({ ...p, partialProjectId: partialProjectIdRef.current }));
    }
    const project = liveBookToPartialProject(liveBook, lastInputRef.current, partialProjectIdRef.current);
    try {
      await saveProjectAsync(project);
    } catch (e) {
      console.warn("Partial auto-save failed:", e);
    }
  }, []);

  const start = useCallback(async (input: AutoBestsellerInput, batchId?: string): Promise<AutoBestsellerResult | null> => {
    lastInputRef.current = input;
    partialProjectIdRef.current = null;
    attachedRunIdRef.current = null;
    stopPolling();
    setState({
      isRunning: true,
      stages: INITIAL_STAGES.map((s) => ({ ...s, status: "pending", detail: undefined, meta: undefined })),
      retries: [],
      chapters: [],
      liveBook: { ...INITIAL_LIVE_BOOK, currentStageLabel: "Analyzing idea…" },
      result: null,
      error: null,
      runId: null,
      partialProjectId: null,
    });

    const runId = await createRunRow(input, batchId);
    if (runId) {
      setState((p) => ({ ...p, runId }));
      writeRunSnapshot(runId, {
        input,
        progress: [],
        result: null,
        error: null,
        status: "running",
        retryCount: 0,
        finalScore: null,
        marketScore: null,
        partialProjectId: null,
        updatedAt: Date.now(),
      });
    }

    let lastResult: AutoBestsellerResult | null = null;
    let retryCount = 0;
    const progressLog: any[] = [];
    let syncTimer: number | null = null;

    const persistSnapshot = (status: string, patch?: Partial<PersistedRunSnapshot>) => {
      if (!runId) return;
      writeRunSnapshot(runId, {
        input,
        progress: [...progressLog],
        result: lastResult,
        error: null,
        status,
        retryCount,
        finalScore: lastResult?.finalScore ?? null,
        marketScore: lastResult?.marketScore ?? null,
        partialProjectId: partialProjectIdRef.current,
        updatedAt: Date.now(),
        ...patch,
      });
    };

    const flushProgressToBackend = async () => {
      if (!runId) return;
      syncTimer = null;
      await updateRunRow(runId, {
        progress: [...progressLog],
        status: "running",
        retry_count: retryCount,
      });
    };

    const queueProgressSync = () => {
      persistSnapshot("running");
      if (!runId || syncTimer !== null) return;
      syncTimer = window.setTimeout(() => {
        void flushProgressToBackend();
      }, 800);
    };

    const clearSyncTimer = () => {
      if (syncTimer !== null) {
        window.clearTimeout(syncTimer);
        syncTimer = null;
      }
    };

    const { abort, promise } = runAutoBestsellerStream(input, {
      onStage: (s) => {
        const stageId = s.id as StageId;
        updateStage(stageId, { status: s.status, detail: s.label, meta: s.meta });
        if (s.status === "running") {
          const labelMap: Record<string, string> = {
            titles: "Generating titles…",
            market: "Validating market…",
            blueprint: "Building book structure…",
            gono: "Validating concept…",
            chapters: "Writing chapters…",
            aggregate: "Finalizing book…",
          };
          setState((prev) => ({
            ...prev,
            liveBook: { ...prev.liveBook, currentStageLabel: labelMap[s.id] || s.label },
          }));
        }
        progressLog.push({ type: "stage", ...s, ts: Date.now() });
        queueProgressSync();
      },
      onRetry: (r) => {
        retryCount++;
        setState((prev) => ({ ...prev, retries: [...prev.retries, r] }));
        progressLog.push({ type: "retry", ...r, ts: Date.now() });
        queueProgressSync();
      },
      onBook: (b: BookEvent) => {
        let snapshotForSave: LiveBook | null = null;
        setState((prev) => {
          let next = prev;
          if (b.kind === "header") {
            next = { ...prev, liveBook: { ...prev.liveBook, title: b.title, subtitle: b.subtitle } };
          } else if (b.kind === "blueprint") {
            next = {
              ...prev,
              liveBook: { ...prev.liveBook, title: b.title, subtitle: b.subtitle, outlines: b.outlines },
            };
            snapshotForSave = next.liveBook;
          }
          return next;
        });
        if (snapshotForSave) void savePartialNow(snapshotForSave);
        progressLog.push({ type: "book", ...b, ts: Date.now() });
        queueProgressSync();
      },
      onChapter: (c) => {
        let updatedLiveBook: LiveBook | null = null;
        setState((prev) => {
          const outline = prev.liveBook.outlines?.[c.index];
          const safeTitle = resolveAutoChapterTitle(c.title || outline?.title, c.index, {
            summary: outline?.summary,
            total: c.total,
          });
          const safeChapter = { ...c, title: safeTitle };
          const existing = prev.chapters.find((x) => x.index === c.index);
          const chapters = existing
            ? prev.chapters.map((x) => (x.index === c.index ? safeChapter : x))
            : [...prev.chapters, safeChapter];

          const liveExisting = prev.liveBook.chapters.find((x) => x.index === c.index);
          const liveChapters = liveExisting
            ? prev.liveBook.chapters.map((x) =>
                x.index === c.index
                  ? { ...x, phase: c.phase, title: safeTitle, score: c.score, content: c.content ?? x.content }
                  : x,
              )
            : [
                ...prev.liveBook.chapters,
                { index: c.index, title: safeTitle, phase: c.phase, score: c.score, content: c.content },
              ].sort((a, b) => a.index - b.index);

          const liveLabel =
            c.phase === "done"
              ? `Chapter ${c.index + 1}/${c.total} ready`
              : c.phase === "refining"
                ? `Refining Chapter ${c.index + 1}/${c.total}…`
                : `Writing Chapter ${c.index + 1}/${c.total}…`;

          const nextLive = { ...prev.liveBook, chapters: liveChapters, currentStageLabel: liveLabel };
          updatedLiveBook = nextLive;
          return { ...prev, chapters, liveBook: nextLive };
        });
        if (c.phase === "done" && c.index === c.total - 1) {
          updateStage("chapters", { status: "done", detail: `${c.total}/${c.total} chapters complete` });
        } else {
          updateStage("chapters", { status: "running", detail: `Chapter ${c.index + 1}/${c.total} — ${c.phase}` });
        }
        if (c.phase === "done" && updatedLiveBook) {
          void savePartialNow(updatedLiveBook);
        }
        progressLog.push({ type: "chapter", ...c, title: resolveAutoChapterTitle(c.title, c.index, { total: c.total }), ts: Date.now() });
        queueProgressSync();
      },
      onDone: (r) => {
        clearSyncTimer();
        const normalizedResult = normalizeAutoResult(r) || r;
        lastResult = normalizedResult;
        setState((prev) => ({
          ...prev,
          result: normalizedResult,
          isRunning: false,
          liveBook: { ...prev.liveBook, currentStageLabel: "Book complete" },
        }));
        progressLog.push({ type: "done", ts: Date.now() });
        persistSnapshot(normalizedResult.status, {
          result: normalizedResult,
          error: null,
          finalScore: normalizedResult.finalScore,
          marketScore: normalizedResult.marketScore,
        });
        if (runId) {
          void updateRunRow(runId, {
            result: normalizedResult,
            progress: [...progressLog],
            status: normalizedResult.status,
            retry_count: retryCount,
            final_score: normalizedResult.finalScore,
            market_score: normalizedResult.marketScore,
          });
        }
      },
      onError: (msg) => {
        clearSyncTimer();
        setState((prev) => ({
          ...prev,
          error: msg,
          isRunning: false,
          liveBook: { ...prev.liveBook, currentStageLabel: "Error — generation stopped" },
        }));
        progressLog.push({ type: "error", message: msg, ts: Date.now() });
        persistSnapshot("failed", { error: msg });
        if (runId) {
          void updateRunRow(runId, {
            progress: [...progressLog],
            status: "failed",
            error: msg,
            retry_count: retryCount,
          });
        }
      },
    }, runId ?? undefined);

    abortRef.current = abort;
    await promise;
    clearSyncTimer();
    abortRef.current = null;
    return lastResult;
  }, [savePartialNow, stopPolling, updateStage]);

  const cancel = useCallback(() => {
    abortRef.current?.();
    abortRef.current = null;
    setState((prev) => ({ ...prev, isRunning: false, error: prev.error || "Cancelled by user" }));
  }, []);

  /**
   * Stop the current generation and save whatever has been produced so far as a BookProject.
   * Returns the project id, or null if nothing to save.
   */
  const stopAndSaveDraft = useCallback(async (): Promise<string | null> => {
    abortRef.current?.();
    abortRef.current = null;
    if (!lastInputRef.current) return null;
    const snapshot = await new Promise<LiveBook>((resolve) => {
      setState((prev) => {
        resolve(prev.liveBook);
        return { ...prev, isRunning: false, liveBook: { ...prev.liveBook, currentStageLabel: "Saved as draft" } };
      });
    });
    if (!partialProjectIdRef.current) {
      partialProjectIdRef.current = createProjectId();
      setState((p) => ({ ...p, partialProjectId: partialProjectIdRef.current }));
    }
    const project = liveBookToPartialProject(snapshot, lastInputRef.current, partialProjectIdRef.current);
    try {
      await saveProjectAsync(project);
    } catch (e) {
      console.warn("Save draft failed:", e);
    }
    return partialProjectIdRef.current;
  }, []);

  /**
   * Attach to an existing run (started elsewhere or in a previous session).
   * Reconstructs liveBook from the progress log in the DB and polls for updates
   * until the run reaches a terminal status. Does NOT re-open an SSE stream.
   */
  const applyProgressLog = useCallback((row: any) => {
    const progress: any[] = Array.isArray(row?.progress) ? row.progress : [];
    const input: AutoBestsellerInput | null = row?.input || null;
    if (input) lastInputRef.current = input;

    const stages: StageState[] = INITIAL_STAGES.map((s) => ({ ...s }));
    const liveChapters = new Map<number, LiveChapter>();
    let title: string | undefined;
    let subtitle: string | undefined;
    let outlines: Array<{ title: string; summary?: string }> | undefined;
    let lastLabel = "Reconnecting…";
    const retries: RetryEvent[] = [];
    const chaptersList: ChapterProgress[] = [];

    for (const e of progress) {
      if (e?.type === "stage") {
        const idx = stages.findIndex((s) => s.id === e.id);
        if (idx >= 0) stages[idx] = { ...stages[idx], status: e.status, detail: e.label, meta: e.meta };
        if (e.status === "running") {
          const labelMap: Record<string, string> = {
            titles: "Generating titles…",
            market: "Validating market…",
            blueprint: "Building book structure…",
            gono: "Validating concept…",
            chapters: "Writing chapters…",
            aggregate: "Finalizing book…",
          };
          lastLabel = labelMap[e.id] || e.label || lastLabel;
        }
      } else if (e?.type === "book") {
        if (e.kind === "header") {
          title = e.title;
          subtitle = e.subtitle;
        } else if (e.kind === "blueprint") {
          title = e.title;
          subtitle = e.subtitle;
          outlines = e.outlines;
        }
      } else if (e?.type === "chapter") {
        const prev = liveChapters.get(e.index);
        const outline = outlines?.[e.index];
        const safeTitle = resolveAutoChapterTitle(e.title || prev?.title || outline?.title, e.index, {
          summary: outline?.summary,
          total: e.total,
        });
        liveChapters.set(e.index, {
          index: e.index,
          title: safeTitle,
          phase: e.phase,
          score: e.score ?? prev?.score,
          content: e.content ?? prev?.content,
        });
        chaptersList.push({ index: e.index, total: e.total, phase: e.phase, title: safeTitle, score: e.score, content: e.content });
        lastLabel =
          e.phase === "done"
            ? `Chapter ${e.index + 1}/${e.total} ready`
            : e.phase === "refining"
              ? `Refining Chapter ${e.index + 1}/${e.total}…`
              : `Writing Chapter ${e.index + 1}/${e.total}…`;
      } else if (e?.type === "retry") {
        retries.push({ attempt: e.attempt, reason: e.reason });
      } else if (e?.type === "done") {
        lastLabel = "Book complete";
      } else if (e?.type === "error") {
        lastLabel = "Error — generation stopped";
      }
    }

    const liveBook: LiveBook = {
      title,
      subtitle,
      outlines,
      chapters: Array.from(liveChapters.values()).sort((a, b) => a.index - b.index),
      currentStageLabel: lastLabel,
    };

    const isTerminal = ["ready_for_kdp", "needs_revision", "failed"].includes(row?.status);
    setState((prev) => ({
      ...prev,
      isRunning: !isTerminal,
      stages,
      retries,
      chapters: chaptersList,
      liveBook,
      result: row?.result?.title ? normalizeAutoResult(row.result as AutoBestsellerResult) : prev.result,
      error: row?.error || null,
      runId: row?.id || prev.runId,
    }));
    return isTerminal;
  }, []);

  const attachToRun = useCallback(async (runId: string) => {
    if (attachedRunIdRef.current === runId) return;
    attachedRunIdRef.current = runId;
    stopPolling();

    const fetchOnce = async () => {
      const { data, error } = await supabase
        .from("auto_bestseller_runs")
        .select("id, input, status, progress, result, error, updated_at")
        .eq("id", runId)
        .maybeSingle();

      const cached = readRunSnapshot(runId);
      if (error || !data) {
        if (cached?.progress?.length) {
          const terminal = applyProgressLog({
            id: runId,
            input: cached.input,
            status: cached.status,
            progress: cached.progress,
            result: cached.result,
            error: cached.error,
          });
          if (terminal) {
            stopPolling();
            attachedRunIdRef.current = null;
          }
          return terminal;
        }
        return false;
      }

      const dbProgress = Array.isArray(data.progress) ? data.progress : [];
      const cachedProgress = Array.isArray(cached?.progress) ? cached.progress : [];
      const mergedRow = cached && cachedProgress.length > dbProgress.length
        ? {
            ...data,
            input: data.input || cached.input,
            progress: cachedProgress,
            result: data.result || cached.result,
            error: data.error || cached.error,
          }
        : data;

      const mergedProgress = Array.isArray(mergedRow.progress) ? mergedRow.progress : [];
      if (mergedRow.status === "running" && mergedProgress.length === 0) {
        const lastUpdateMs = mergedRow.updated_at ? new Date(mergedRow.updated_at).getTime() : 0;
        if (lastUpdateMs && Date.now() - lastUpdateMs > RUN_STALE_AFTER_MS) {
          setState((prev) => ({
            ...prev,
            isRunning: false,
            error: "Questa generazione sembra bloccata: non sono arrivati aggiornamenti per molto tempo. Puoi rigenerarla dal brief o avviarne una nuova.",
            runId,
            liveBook: { ...INITIAL_LIVE_BOOK, currentStageLabel: "Generation stalled" },
          }));
          stopPolling();
          attachedRunIdRef.current = null;
          return true;
        }
      }

      const terminal = applyProgressLog(mergedRow);
      if (terminal) {
        stopPolling();
        attachedRunIdRef.current = null;
      }
      return terminal;
    };

    const terminal = await fetchOnce();
    if (!terminal) {
      pollRef.current = window.setInterval(() => {
        void fetchOnce();
      }, 2500);
    }
  }, [applyProgressLog, stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  return { ...state, start, cancel, reset, stopAndSaveDraft, attachToRun };
}
