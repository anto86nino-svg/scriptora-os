import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, ChevronDown, ChevronUp, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { InputPanel } from "@/components/AutoBestseller/InputPanel";
import { ProgressTimeline } from "@/components/AutoBestseller/ProgressTimeline";
import { ResultView } from "@/components/AutoBestseller/ResultView";
import { BookLivePreview, GenerationErrorPanel } from "@/components/AutoBestseller/BookLivePreview";
import { BatchRun, MultiRunPanel } from "@/components/AutoBestseller/MultiRunPanel";
import { RecentRunsPanel } from "@/components/AutoBestseller/RecentRunsPanel";
import { useAutoBestseller } from "@/hooks/useAutoBestseller";
import { AutoBestsellerInput, AutoBestsellerResult } from "@/services/autoBestsellerService";
import { autoBestsellerToProject } from "@/lib/auto-bestseller-to-project";
import { saveProjectAsync } from "@/services/storageService";
import { LeavePageDialog } from "@/components/AutoBestseller/LeavePageDialog";
import { getBookProgress } from "@/lib/book-progress";
import { ProgressBar } from "@/components/AutoBestseller/ProgressBar";
import { BookConfig } from "@/types/book";
import { ensureBookTitleMetadata } from "@/lib/title-shadow";
import { applyAuthorIdentityToConfig, getSelectedAuthorIdentity, resolveAuthorIdentity } from "@/lib/author-identity";

const VARIATION_ANGLES = [
  "emotional / personal transformation angle",
  "outcome-driven / measurable results angle",
  "contrarian / against conventional wisdom angle",
  "urgent / problem-solution angle",
  "niche-specific deep dive angle",
  "story-driven / case study angle",
  "scientific / evidence-based angle",
  "practical / step-by-step angle",
  "philosophical / deeper meaning angle",
  "controversial / bold claim angle",
];

const ACTIVE_RUN_KEY = "nexora-active-run";

const ALLOWED_SETUP_GENRES = [
  "self-help", "romance", "dark-romance", "thriller", "fantasy", "philosophy", "business", "memoir",
];

const ALLOWED_SETUP_LANGUAGES = ["English", "Italian", "Spanish", "French", "German"];

function normalizeSetupGenre(value?: string): any {
  const slug = String(value || "self-help").toLowerCase().trim().replace(/\s+/g, "-");
  return ALLOWED_SETUP_GENRES.includes(slug) ? slug : "self-help";
}

function normalizeSetupLanguage(value?: string): any {
  const raw = String(value || "English").trim();
  const cap = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  return ALLOWED_SETUP_LANGUAGES.includes(cap) ? cap : "English";
}

function charactersFromSetupText(text?: string): any[] {
  const raw = String(text || "").trim();
  if (!raw) return [];
  return raw
    .split(/\n{2,}|^\s*[-•]\s*/gm)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((block) => {
      const firstLine = block.split("\n")[0]?.trim() || "";
      const name = firstLine.replace(/^Nome[:\-]\s*/i, "").split(/[,.—-]/)[0]?.trim() || firstLine;
      return {
        name,
        role: "",
        personality: block,
        strictRules: "Never rename this character. Preserve role, personality, relationships and continuity."
      };
    });
}

function autoBestsellerInputToBookConfig(input: AutoBestsellerInput): BookConfig {
  const title = String(input.prefilledTitle || input.idea || "Untitled Book").trim().slice(0, 120);
  const subtitle = String(input.prefilledSubtitle || input.readerPromise || "").trim().slice(0, 180);
  const authorIdentity = resolveAuthorIdentity(input.authorIdentity, input.authorIdentityId) || getSelectedAuthorIdentity();
  const authorName = String(authorIdentity?.penName || input.authorName || "").trim();

  return ensureBookTitleMetadata(applyAuthorIdentityToConfig({
    title,
    subtitle,
    authorName,
    author: authorName,
    writerName: authorName,
    tone: input.tone || "warm, insightful, bestseller-level",
    authorStyle: input.tone || "",
    language: normalizeSetupLanguage(input.language),
    genre: normalizeSetupGenre(input.genre),
    category: input.genre || "Self Help",
    subcategory: input.subcategory || "",
    chapterLength: "medium",
    bookLength: "medium",
    numberOfChapters: Math.max(3, Math.min(20, Number(input.numberOfChapters) || 8)),
    subchaptersEnabled: false,
    characters: charactersFromSetupText(input.charactersText),
  } as any, authorIdentity), {
    idea: input.idea,
    readerPromise: input.readerPromise,
    genre: input.genre,
    subcategory: input.subcategory,
    targetAudience: input.targetAudience,
    language: input.language,
  });
}


export default function AutoBestsellerPage() {
  const navigate = useNavigate();
  const engine = useAutoBestseller();
  const [batchRuns, setBatchRuns] = useState<BatchRun[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [selectedBatchResult, setSelectedBatchResult] = useState<AutoBestsellerResult | null>(null);
  const [recentKey, setRecentKey] = useState(0);
  const [prefill, setPrefill] = useState<Partial<AutoBestsellerInput> | null>(null);
  const [autoStart, setAutoStart] = useState(false);
  const [lastInput, setLastInput] = useState<Partial<AutoBestsellerInput> | null>(null);
  const [savingProject, setSavingProject] = useState(false);
  const [briefCollapsed, setBriefCollapsed] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // Pick up brief from Home OR re-attach to an active run from a previous navigation
  useEffect(() => {
    const raw = sessionStorage.getItem("nexora-auto-brief");
    if (raw) {
      sessionStorage.removeItem("nexora-auto-brief");
      try {
        const parsed = JSON.parse(raw);
        setPrefill(parsed);
        setLastInput(parsed);
        if (parsed.autoStart) {
          const fullInput: AutoBestsellerInput = {
            idea: parsed.idea,
            genre: parsed.genre,
            subcategory: parsed.subcategory,
            targetAudience: parsed.targetAudience,
            tone: parsed.tone,
            language: parsed.language || "English",
            numberOfChapters: parsed.numberOfChapters,
            level: parsed.level,
            readerPromise: parsed.readerPromise,
            prefilledTitle: parsed.prefilledTitle,
            prefilledSubtitle: parsed.prefilledSubtitle,
            authorName: parsed.authorName,
            authorIdentityId: parsed.authorIdentityId,
            authorIdentity: parsed.authorIdentity,
            totalWordTarget: parsed.totalWordTarget,
            charactersText: parsed.charactersText,
          };
          handleGenerateOne(fullInput);
        }
        return;
      } catch { /* ignore */ }
    }
    // No fresh brief — check for active run started in a previous navigation
    const activeRaw = sessionStorage.getItem(ACTIVE_RUN_KEY);
    if (activeRaw) {
      try {
        const active = JSON.parse(activeRaw);
        if (active?.input) setLastInput(active.input);
        if (active?.runId) {
          setBriefCollapsed(true);
          void engine.attachToRun(active.runId);
        }
      } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-collapse brief when generation starts; expand when finished without result
  useEffect(() => {
    if (engine.isRunning) setBriefCollapsed(true);
  }, [engine.isRunning]);

  // Persist active run flag so user can navigate away & come back
  useEffect(() => {
    if (engine.isRunning && engine.runId) {
      sessionStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify({
        runId: engine.runId,
        title: engine.liveBook.title || lastInput?.idea?.slice(0, 60) || "Generating book…",
        input: lastInput,
        startedAt: Date.now(),
      }));
    } else if (!engine.isRunning && engine.result) {
      sessionStorage.removeItem(ACTIVE_RUN_KEY);
    }
  }, [engine.isRunning, engine.runId, engine.liveBook.title, engine.result, lastInput]);

  // Warn before unload during active generation
  useEffect(() => {
    if (!engine.isRunning) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [engine.isRunning]);

  const handleGenerateOne = useCallback(async (input: AutoBestsellerInput) => {
    setBatchRuns([]);
    setSelectedBatchResult(null);
    setLastInput(input);
    setAutoStart(false);
    setBriefCollapsed(true);

    try {
      const config = autoBestsellerInputToBookConfig(input);
      sessionStorage.setItem("nexora-new-book", JSON.stringify(config));
      sessionStorage.setItem("scriptora-setup-origin", "auto-bestseller");
      toast.success("Progetto configurato — apertura stanza di scrittura…");
      navigate("/app");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preparazione progetto fallita");
    }
  }, [navigate]);

  const handleGenerateBatch = useCallback(async (baseInput: AutoBestsellerInput, _count: number) => {
    toast.info("La generazione multipla è temporaneamente disattivata. Scriptora prepara un progetto stabile alla volta.");
    await handleGenerateOne(baseInput);
  }, [handleGenerateOne]);

  const handleSaveAsProject = useCallback(async (result: AutoBestsellerResult) => {
    if (savingProject) return;
    setSavingProject(true);
    try {
      const project = autoBestsellerToProject(result, lastInput || undefined);
      await saveProjectAsync(project);
      toast.success("Project saved — opening editor…");
      sessionStorage.setItem("nexora-open-project", project.id);
      setTimeout(() => navigate("/app"), 300);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save project");
    } finally {
      setSavingProject(false);
    }
  }, [navigate, lastInput, savingProject]);

  const handleRecentOpen = useCallback((r: AutoBestsellerResult) => {
    setSelectedBatchResult(r);
  }, []);

  const handleRecentOpenRunning = useCallback((runId: string, input: AutoBestsellerInput) => {
    setLastInput(input);
    setSelectedBatchResult(null);
    setBriefCollapsed(true);
    sessionStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify({
      runId,
      title: input?.idea?.slice(0, 60) || "Generating book…",
      input,
      startedAt: Date.now(),
    }));
    void engine.attachToRun(runId);
    toast.info("Live preview attiva — riconnesso alla generazione");
  }, [engine]);

  const handleRecentRegenerate = useCallback((input: AutoBestsellerInput) => {
    setPrefill({ ...input });
    setAutoStart(true);
  }, []);

  const handleRecentUseAsBase = useCallback((input: AutoBestsellerInput) => {
    setPrefill({ ...input });
    setAutoStart(false);
    setBriefCollapsed(false);
    toast.info("Brief loaded — adjust and generate");
  }, []);

  const handleLeaveToHome = useCallback(() => {
    if (engine.isRunning) {
      setShowLeaveDialog(true);
      return;
    }
    navigate("/dashboard");
  }, [engine.isRunning, navigate]);

  const handleContinueInBackground = useCallback(() => {
    setShowLeaveDialog(false);
    toast.info("Generazione in background. La trovi in 'In corso' sulla home.");
    navigate("/dashboard");
  }, [navigate]);

  const handleSaveDraftAndStop = useCallback(async () => {
    setSavingDraft(true);
    try {
      const projectId = await engine.stopAndSaveDraft();
      if (projectId) {
        toast.success("Bozza salvata. Puoi riprenderla da 'I miei libri'.");
        sessionStorage.removeItem("nexora-active-run");
      } else {
        toast.info("Niente da salvare ancora.");
      }
      setShowLeaveDialog(false);
      navigate("/dashboard");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Salvataggio fallito");
    } finally {
      setSavingDraft(false);
    }
  }, [engine, navigate]);

  const displayedResult = selectedBatchResult ?? engine.result;
  const isAnyRunning = engine.isRunning || batchRunning;
  const showLivePreview = engine.isRunning || (!selectedBatchResult && !engine.result && engine.liveBook.chapters.length > 0);
  // During an active run, hide the brief panel entirely (focus on writing); show only "Edit brief" button
  const showBriefPanel = !isAnyRunning && !briefCollapsed;
  const bookProgress = getBookProgress(engine.liveBook, lastInput?.numberOfChapters);
  const showHeaderProgress = isAnyRunning && (engine.liveBook.chapters.length > 0 || !!engine.liveBook.outlines);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleLeaveToHome}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Home
            </Button>
            <div>
              <h1 className="flex items-center gap-2 text-lg font-semibold">
                <Sparkles className="h-5 w-5 text-primary" />
                {isAnyRunning ? "Scriptora sta scrivendo il tuo libro…" : "Auto Bestseller Mode"}
              </h1>
              {isAnyRunning && (
                <p className="text-xs text-muted-foreground">
                  Salvataggio automatico attivo · Puoi uscire: Scriptora continuerà in background
                </p>
              )}
            </div>
          </div>
          {isAnyRunning && lastInput && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBriefCollapsed((v) => !v)}
              className="hidden sm:inline-flex"
            >
              {briefCollapsed ? <Pencil className="mr-1.5 h-3.5 w-3.5" /> : <X className="mr-1.5 h-3.5 w-3.5" />}
              {briefCollapsed ? "Vedi brief" : "Nascondi brief"}
            </Button>
          )}
        </div>
        {showHeaderProgress && (
          <div className="mx-auto max-w-7xl px-4 pb-3">
            <div className="flex items-center gap-3">
              <ProgressBar
                percent={bookProgress.percent}
                variant={bookProgress.percent === 100 ? "success" : "primary"}
                animated={engine.isRunning && bookProgress.percent < 100}
                size="sm"
              />
              <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                {bookProgress.percent}%
              </span>
              <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                {bookProgress.chaptersDone}/{bookProgress.totalChapters} ch
              </span>
            </div>
          </div>
        )}
      </header>

      <main
        className={
          showBriefPanel
            ? "mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[400px,1fr]"
            : "mx-auto max-w-4xl px-4 py-6"
        }
      >
        {showBriefPanel && (
          <aside className="space-y-6">
            <InputPanel
              isRunning={isAnyRunning}
              initialInput={prefill}
              autoStart={autoStart}
              onGenerateOne={handleGenerateOne}
              onGenerateBatch={handleGenerateBatch}
            />
            {batchRuns.length > 0 && (
              <MultiRunPanel
                runs={batchRuns}
                isRunning={batchRunning}
                onSelect={(r) => r.result && setSelectedBatchResult(r.result)}
              />
            )}
            <RecentRunsPanel
              refreshKey={recentKey}
              onOpenResult={handleRecentOpen}
              onOpenRunning={handleRecentOpenRunning}
              onRegenerate={handleRecentRegenerate}
              onUseAsBase={handleRecentUseAsBase}
            />
          </aside>
        )}

        {/* Collapsed brief preview (when running) */}
        {isAnyRunning && briefCollapsed && lastInput && (
          <button
            onClick={() => setBriefCollapsed(false)}
            className="mb-4 flex w-full items-center justify-between gap-3 rounded-md border border-border/60 bg-card/40 px-4 py-2.5 text-left text-xs transition-colors hover:bg-muted/30"
          >
            <span className="truncate text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider text-foreground/80">Brief:</span>{" "}
              {lastInput.idea?.slice(0, 90)}{(lastInput.idea?.length || 0) > 90 ? "…" : ""} · {lastInput.genre} · {lastInput.language}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        )}

        <section className="space-y-6">
          {showLivePreview && (
            <BookLivePreview
              liveBook={engine.liveBook}
              isRunning={engine.isRunning}
              totalChaptersHint={lastInput?.numberOfChapters}
            />
          )}

          {(engine.isRunning || engine.stages.some((s) => s.status !== "pending")) && !displayedResult && (
            <details className="group rounded-md border border-border/60 bg-card/40">
              <summary className="cursor-pointer list-none px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/30">
                Dettagli pipeline ({engine.stages.filter((s) => s.status === "done").length}/{engine.stages.length})
              </summary>
              <div className="p-3 pt-0">
                <ProgressTimeline
                  stages={engine.stages}
                  retries={engine.retries}
                  chapters={engine.chapters}
                  isRunning={engine.isRunning}
                />
              </div>
            </details>
          )}

          {engine.error && !displayedResult && (
            <GenerationErrorPanel
              message={engine.error}
              hasPartialContent={engine.liveBook.chapters.length > 0}
              onReset={() => { engine.reset(); setBriefCollapsed(false); }}
              onContinue={lastInput ? () => handleGenerateOne(lastInput as AutoBestsellerInput) : undefined}
            />
          )}

          {displayedResult && (
            <ResultView result={displayedResult} onSaveAsProject={handleSaveAsProject} />
          )}

          {!engine.isRunning && !displayedResult && batchRuns.length === 0 && !engine.error && engine.liveBook.chapters.length === 0 && !showBriefPanel && (
            <div className="rounded-md border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
              <Button variant="outline" onClick={() => setBriefCollapsed(false)}>
                <Pencil className="mr-2 h-4 w-4" /> Apri brief
              </Button>
            </div>
          )}
        </section>
      </main>

      <LeavePageDialog
        open={showLeaveDialog}
        onClose={() => setShowLeaveDialog(false)}
        onContinueInBackground={handleContinueInBackground}
        onSaveDraftAndStop={handleSaveDraftAndStop}
        saving={savingDraft}
        hasContent={engine.liveBook.chapters.some((c) => c.phase === "done")}
        progressPercent={bookProgress.percent}
        progressLabel={`${bookProgress.chaptersDone}/${bookProgress.totalChapters} capitoli completati`}
      />
    </div>
  );
}
