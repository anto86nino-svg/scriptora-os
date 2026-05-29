import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, ChevronDown, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/useIsMobile";
import { InputPanel } from "@/components/AutoBestseller/InputPanel";
import { ArchitectFlow } from "@/components/AutoBestseller/ArchitectFlow";
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
import {
  type ArchitectPhaseId,
  type AutoBestsellerArchitectResult,
  buildArchitectBookConfig,
  buildHandoffPack,
  persistAutoBestsellerHandoff,
  runAutoBestsellerArchitect,
} from "@/lib/auto-bestseller-architect";
import {
  getArchitectFlowCopy,
  getArchitectPageCopy,
  normalizeArchitectLang,
} from "@/lib/auto-bestseller-architect/localized-copy";

const ACTIVE_RUN_KEY = "nexora-active-run";

type MobileArchitectScreen = "brief" | "building" | "blueprint" | "legacy" | "result";

export default function AutoBestsellerPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const mainRef = useRef<HTMLElement>(null);
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

  const [architectRunning, setArchitectRunning] = useState(false);
  const [architectPhase, setArchitectPhase] = useState<ArchitectPhaseId | null>(null);
  const [architectMessage, setArchitectMessage] = useState("");
  const [architectResult, setArchitectResult] = useState<AutoBestsellerArchitectResult | null>(null);
  const [architectError, setArchitectError] = useState<string | null>(null);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState(0);
  const [forceBriefOnMobile, setForceBriefOnMobile] = useState(false);

  const architectLang = normalizeArchitectLang(
    lastInput?.language ?? architectResult?.config?.language ?? "English",
  );
  const pageCopy = useMemo(() => getArchitectPageCopy(architectLang), [architectLang]);
  const flowCopy = useMemo(() => getArchitectFlowCopy(architectLang), [architectLang]);

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
            targetAudience: parsed.targetAudience || "",
            tone: parsed.tone,
            language: parsed.language || "English",
            titleLanguage: parsed.titleLanguage || parsed.language || "English",
            numberOfChapters: parsed.numberOfChapters,
            subchaptersEnabled: parsed.subchaptersEnabled,
            subchaptersPerChapter: parsed.subchaptersPerChapter,
            bookLength: parsed.bookLength,
            customTotalWords: parsed.customTotalWords,
            totalWordTarget: parsed.totalWordTarget,
            level: parsed.level,
            readerPromise: parsed.readerPromise,
            prefilledTitle: parsed.prefilledTitle,
            prefilledSubtitle: parsed.prefilledSubtitle,
            authorName: parsed.authorName,
            authorIdentityId: parsed.authorIdentityId,
            authorIdentity: parsed.authorIdentity,
            charactersText: parsed.charactersText,
          };
          void handleStartArchitect(fullInput);
        }
        return;
      } catch { /* ignore */ }
    }
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

  useEffect(() => {
    if (engine.isRunning) setBriefCollapsed(true);
  }, [engine.isRunning]);

  useEffect(() => {
    if (engine.isRunning && engine.runId) {
      sessionStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify({
        runId: engine.runId,
        title: engine.liveBook.title || lastInput?.idea?.slice(0, 60) || "Legacy run…",
        input: lastInput,
        startedAt: Date.now(),
      }));
    } else if (!engine.isRunning && engine.result) {
      sessionStorage.removeItem(ACTIVE_RUN_KEY);
    }
  }, [engine.isRunning, engine.runId, engine.liveBook.title, engine.result, lastInput]);

  useEffect(() => {
    if (!engine.isRunning) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [engine.isRunning]);

  const handleStartArchitect = useCallback(async (input: AutoBestsellerInput) => {
    setBatchRuns([]);
    setSelectedBatchResult(null);
    setLastInput(input);
    setAutoStart(false);
    setBriefCollapsed(true);
    setForceBriefOnMobile(false);
    setArchitectRunning(true);
    setArchitectError(null);
    setArchitectResult(null);
    setArchitectPhase("idea-intelligence");
    setSelectedTitleIndex(0);

    try {
      const result = await runAutoBestsellerArchitect(input, (phase, message) => {
        setArchitectPhase(phase);
        setArchitectMessage(message);
      });
      setArchitectResult(result);
      toast.success(getArchitectPageCopy(normalizeArchitectLang(input.language)).blueprintReady);
    } catch (e) {
      const message = e instanceof Error ? e.message : getArchitectPageCopy(normalizeArchitectLang(input.language)).blueprintFailed;
      setArchitectError(message);
      toast.error(message);
    } finally {
      setArchitectRunning(false);
      setArchitectPhase(null);
    }
  }, []);

  const handleOpenWriterRoom = useCallback(() => {
    if (!architectResult || !lastInput) return;

    const selected = architectResult.titleConcepts[selectedTitleIndex] || architectResult.titleConcepts[0];
    if (!selected) {
      toast.error(pageCopy.selectTitleFirst);
      return;
    }

    const config = buildArchitectBookConfig(
      lastInput as AutoBestsellerInput,
      architectResult.ideaIntelligence,
      architectResult.marketPositioning,
      selected,
    );

    const pack = buildHandoffPack({
      ...architectResult,
      config,
      selectedTitleIndex,
    });

    persistAutoBestsellerHandoff(pack);
    sessionStorage.setItem("nexora-new-book", JSON.stringify(config));
    toast.success(pageCopy.openingWriterRoom);
    navigate("/app");
  }, [architectResult, lastInput, navigate, pageCopy, selectedTitleIndex]);

  const handleGenerateBatch = useCallback(async (baseInput: AutoBestsellerInput) => {
    toast.info(pageCopy.oneProjectAtATime);
    await handleStartArchitect(baseInput);
  }, [handleStartArchitect, pageCopy.oneProjectAtATime]);

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
      title: input?.idea?.slice(0, 60) || "Legacy run…",
      input,
      startedAt: Date.now(),
    }));
    void engine.attachToRun(runId);
    toast.info("Legacy run attached — older full-generation pipeline");
  }, [engine]);

  const handleRecentRegenerate = useCallback((input: AutoBestsellerInput) => {
    setPrefill({ ...input });
    setAutoStart(true);
  }, []);

  const handleRecentUseAsBase = useCallback((input: AutoBestsellerInput) => {
    setPrefill({ ...input });
    setAutoStart(false);
    setBriefCollapsed(false);
    toast.info(pageCopy.briefLoaded);
  }, [pageCopy.briefLoaded]);

  const handleLeaveToHome = useCallback(() => {
    if (engine.isRunning) {
      setShowLeaveDialog(true);
      return;
    }
    navigate("/dashboard");
  }, [engine.isRunning, navigate]);

  const handleContinueInBackground = useCallback(() => {
    setShowLeaveDialog(false);
    toast.info("Generazione legacy in background.");
    navigate("/dashboard");
  }, [navigate]);

  const handleSaveDraftAndStop = useCallback(async () => {
    setSavingDraft(true);
    try {
      const projectId = await engine.stopAndSaveDraft();
      if (projectId) {
        toast.success("Bozza salvata.");
        sessionStorage.removeItem(ACTIVE_RUN_KEY);
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
  const isLegacyRunning = engine.isRunning;
  const isAnyRunning = isLegacyRunning || architectRunning;
  const architectFocused = architectRunning || !!architectResult;
  const showLivePreview = isLegacyRunning || (!selectedBatchResult && !engine.result && engine.liveBook.chapters.length > 0);
  const showBriefPanel = !isLegacyRunning && !briefCollapsed && !architectFocused;
  const bookProgress = getBookProgress(engine.liveBook, lastInput?.numberOfChapters);
  const showHeaderProgress = isLegacyRunning && (engine.liveBook.chapters.length > 0 || !!engine.liveBook.outlines);

  const mobileScreen = useMemo((): MobileArchitectScreen => {
    if (displayedResult) return "result";
    if (isLegacyRunning || showLivePreview) return "legacy";
    if (isMobile && forceBriefOnMobile && !architectRunning) return "brief";
    if (architectRunning) return "building";
    if (architectResult) return "blueprint";
    return "brief";
  }, [displayedResult, isLegacyRunning, showLivePreview, isMobile, forceBriefOnMobile, architectRunning, architectResult]);

  useEffect(() => {
    if (!isMobile || !architectResult || architectRunning) return;
    setBriefCollapsed(true);
    setForceBriefOnMobile(false);
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [isMobile, architectResult, architectRunning]);

  const openBriefOnMobile = () => {
    setForceBriefOnMobile(true);
    setBriefCollapsed(false);
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const briefAside = (
    <aside className="min-w-0 space-y-6">
      <InputPanel
        isRunning={isAnyRunning}
        initialInput={prefill}
        autoStart={autoStart}
        onGenerateOne={handleStartArchitect}
        onGenerateBatch={handleGenerateBatch}
      />
      {batchRuns.length > 0 && (
        <MultiRunPanel
          runs={batchRuns}
          isRunning={batchRunning}
          onSelect={(r) => r.result && setSelectedBatchResult(r.result)}
        />
      )}
      <details className="rounded-lg border border-border/60 bg-card/95 md:bg-card/40">
        <summary className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Run recenti
        </summary>
        <div className="border-t border-border/60 p-2 pt-0">
          <RecentRunsPanel
            refreshKey={recentKey}
            onOpenResult={handleRecentOpen}
            onOpenRunning={handleRecentOpenRunning}
            onRegenerate={handleRecentRegenerate}
            onUseAsBase={handleRecentUseAsBase}
          />
        </div>
      </details>
    </aside>
  );

  const architectPanel = (
    <ArchitectFlow
      running={architectRunning}
      activePhase={architectPhase}
      phaseMessage={architectMessage}
      result={architectResult}
      error={architectError}
      bookLanguage={lastInput?.language ?? architectResult?.config?.language ?? "English"}
      onOpenWriterRoom={handleOpenWriterRoom}
      onRetry={() => lastInput && handleStartArchitect(lastInput as AutoBestsellerInput)}
      onSelectTitle={setSelectedTitleIndex}
      selectedTitleIndex={selectedTitleIndex}
      hidePrimaryAction={isMobile && mobileScreen === "blueprint"}
    />
  );

  const legacySection = (
    <>
      {showLivePreview && (
        <BookLivePreview
          liveBook={engine.liveBook}
          isRunning={engine.isRunning}
          totalChaptersHint={lastInput?.numberOfChapters}
        />
      )}

      {(engine.isRunning || engine.stages.some((s) => s.status !== "pending")) && !displayedResult && (
        <details className="group rounded-md border border-border/60 bg-card/95 md:bg-card/40">
          <summary className="cursor-pointer list-none px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/30">
            Legacy pipeline ({engine.stages.filter((s) => s.status === "done").length}/{engine.stages.length})
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
          onContinue={lastInput ? () => handleStartArchitect(lastInput as AutoBestsellerInput) : undefined}
        />
      )}
    </>
  );

  return (
    <div className="scriptora-feature-page bg-background">
      <header className="z-20 shrink-0 border-b border-border/60 bg-card/95 backdrop-blur md:bg-card/80">
        <div className="mx-auto flex max-w-7xl min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleLeaveToHome} className="shrink-0">
              <ArrowLeft className="mr-1 h-4 w-4" /> Home
            </Button>
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-base font-semibold sm:text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                {architectRunning
                  ? "Building your narrative blueprint…"
                  : isLegacyRunning
                    ? "Legacy generation run"
                    : "AI Developmental Architect"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {architectRunning
                  ? architectMessage || "Analyzing genre expectations…"
                  : "Market-aware narrative architecture — your writing room stays the source of truth."}
              </p>
            </div>
          </div>
          {(isLegacyRunning || architectResult || isMobile) && lastInput && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (isMobile && forceBriefOnMobile && architectResult) {
                  setForceBriefOnMobile(false);
                  mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                  return;
                }
                if (isMobile && mobileScreen !== "brief") {
                  openBriefOnMobile();
                  return;
                }
                if (isMobile) return;
                setBriefCollapsed((v) => !v);
              }}
              className={
                isMobile && mobileScreen === "brief" && !architectResult
                  ? "hidden"
                  : "inline-flex"
              }
            >
              {isMobile && forceBriefOnMobile ? (
                <>{pageCopy.backToBlueprint}</>
              ) : briefCollapsed || mobileScreen !== "brief" ? (
                <>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  {pageCopy.editBrief}
                </>
              ) : (
                <>
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  {pageCopy.hideBrief}
                </>
              )}
            </Button>
          )}
        </div>
        {isMobile && !displayedResult && (
          <div className="mx-auto flex max-w-7xl gap-1 px-4 pb-3">
            {([
              ["brief", pageCopy.mobileSteps.brief],
              ["building", pageCopy.mobileSteps.building],
              ["blueprint", pageCopy.mobileSteps.ready],
            ] as const).map(([key, label]) => {
              const active = mobileScreen === key || (key === "building" && mobileScreen === "building") || (key === "blueprint" && mobileScreen === "blueprint");
              const done =
                (key === "brief" && (architectFocused || isLegacyRunning)) ||
                (key === "building" && (architectResult || isLegacyRunning)) ||
                (key === "blueprint" && architectResult);
              return (
                <div
                  key={key}
                  className={`flex-1 rounded-full border px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wide ${
                    active
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : done
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                        : "border-border/50 text-muted-foreground"
                  }`}
                >
                  {label}
                </div>
              );
            })}
          </div>
        )}
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
            </div>
          </div>
        )}
      </header>

      <main
        ref={mainRef}
        className={
          isMobile
            ? "scriptora-feature-scroll mx-auto max-w-4xl px-4 py-4"
            : showBriefPanel
              ? "scriptora-feature-scroll mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[400px,1fr]"
              : "scriptora-feature-scroll mx-auto max-w-4xl px-4 py-6"
        }
      >
        {isMobile ? (
          <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden">
            {mobileScreen === "brief" && briefAside}

            {mobileScreen === "building" && architectPanel}

            {mobileScreen === "blueprint" && (
              <>
                {architectPanel}
                <div className="sticky bottom-0 z-10 -mx-4 border-t border-border/60 bg-background/95 px-4 py-3 pb-safe backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
                  <Button className="w-full" size="lg" onClick={handleOpenWriterRoom} disabled={!architectResult}>
                    {flowCopy.openWriter}
                  </Button>
                </div>
              </>
            )}

            {mobileScreen === "legacy" && legacySection}

            {mobileScreen === "result" && displayedResult && (
              <ResultView result={displayedResult} onSaveAsProject={handleSaveAsProject} />
            )}
          </div>
        ) : (
          <>
            {showBriefPanel && briefAside}

            {isLegacyRunning && briefCollapsed && lastInput && (
              <button
                onClick={() => setBriefCollapsed(false)}
                className="mb-4 flex w-full items-center justify-between gap-3 rounded-md border border-border/60 bg-card/40 px-4 py-2.5 text-left text-xs transition-colors hover:bg-muted/30"
              >
                <span className="truncate text-muted-foreground">
                  <span className="font-semibold uppercase tracking-wider text-foreground/80">Brief:</span>{" "}
                  {lastInput.idea?.slice(0, 90)}{(lastInput.idea?.length || 0) > 90 ? "…" : ""}
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </button>
            )}

            <section className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
              {!isLegacyRunning && !displayedResult && architectPanel}

              {legacySection}

              {displayedResult && (
                <ResultView result={displayedResult} onSaveAsProject={handleSaveAsProject} />
              )}

              {!isAnyRunning && !displayedResult && !architectResult && !engine.error && engine.liveBook.chapters.length === 0 && !showBriefPanel && (
                <div className="rounded-md border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
                  <Button variant="outline" onClick={() => setBriefCollapsed(false)}>
                    <Pencil className="mr-2 h-4 w-4" /> {pageCopy.openBrief}
                  </Button>
                </div>
              )}
            </section>
          </>
        )}
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
