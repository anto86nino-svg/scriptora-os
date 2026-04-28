import { useState, useEffect } from "react";
import { NavigationTree } from "@/components/NavigationTree";
import { TopBar } from "@/components/TopBar";
import { EditorPanel } from "@/components/EditorPanel";
import { NewBookDialog } from "@/components/NewBookDialog";
import { CoverGenerator } from "@/components/CoverGenerator";
import { PublishPanel } from "@/components/PublishPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { AICoachPanel } from "@/components/AICoachPanel";
import { ProgressTracker } from "@/components/ProgressTracker";
import { DominationTray } from "@/components/DominationTray";
import { useBookEngine } from "@/hooks/useBookEngine";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { loadProjects as loadLocalProjects, deleteProject as removeProject, getLastProjectId } from "@/lib/storage";
import { loadProjects as loadRemoteProjects, deleteProjectAsync, saveProjectAsync } from "@/services/storageService";
import { generateEpub, downloadEpub, validateEpubStructure } from "@/lib/epub";
import { generateDocx, downloadDocx } from "@/lib/docx-export";
import { generatePdf, downloadPdf } from "@/lib/pdf-export";
import { BookProject, SectionId } from "@/types/book";
import { WritingSettings, loadSettings, saveSettings } from "@/lib/settings";
import { t, getUILanguage, UILanguage } from "@/lib/i18n";
import { toast } from "sonner";
import { BookOpen, Plus, Trash2, FolderOpen, Settings, Sparkles, Minimize2, Menu, X, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuota, usePlan } from "@/lib/plan";
import { UpgradeModal } from "@/components/UpgradeModal";

const Index = () => {
  const [projects, setProjects] = useState<BookProject[]>([]);
  const [showNewBook, setShowNewBook] = useState(false);
  const [showCover, setShowCover] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [coverDataUrl, setCoverDataUrl] = useState<string | undefined>();
  const [isExporting, setIsExporting] = useState(false);
  const [exportLabel, setExportLabel] = useState("");
  const [activeSection, setActiveSection] = useState<SectionId | null>("blueprint");
  const [writingSettings, setWritingSettings] = useState<WritingSettings>(loadSettings());
  const [, setLangTick] = useState(0);
  const [upgradeReason, setUpgradeReason] = useState<null | "export" | "token-limit" | "dominate" | "books-limit">(null);
  const { syncStatus, markSaving, markSaved, markOffline } = useSyncStatus();
  const engine = useBookEngine({
    onSaving: markSaving,
    onSaved: markSaved,
    onOffline: () => {
      markOffline();
      toast.warning(t("toast_saved_locally"));
    },
  });
  const { quota } = useQuota(engine.project?.id || null);
  const { plan } = usePlan();
  const freeBookUsed = plan === "free" && projects.length > 0;

  const openNewBookGuarded = () => {
    if (freeBookUsed) {
      setUpgradeReason("books-limit");
      toast.error("Hai già usato il libro gratuito. Passa a Pro/Premium per crearne altri.");
      return;
    }
    setShowNewBook(true);
  };

  // Token guard for free users — gracefully stop generation when limit is reached
  useEffect(() => {
    if (quota?.isOverTokenLimit && engine.isAnythingGenerating) {
      engine.cancelGeneration();
      setUpgradeReason("token-limit");
      toast.warning("You've reached the free generation limit.");
    }
  }, [quota?.isOverTokenLimit, engine.isAnythingGenerating]);

  const guardedGenerateFullBook = () => {
    if (quota?.isOverTokenLimit) { setUpgradeReason("token-limit"); return; }
    engine.generateFullBook((section) => setActiveSection(section as SectionId));
  };
  const guardedExportEpub = () => { if (!quota?.canExport) { setUpgradeReason("export"); return; } handleExport(); };
  const guardedExportDocx = () => { if (!quota?.canExport) { setUpgradeReason("export"); return; } handleExportDocx(); };
  const guardedExportPdf  = () => { if (!quota?.canExport) { setUpgradeReason("export"); return; } handleExportPdf();  };

  useEffect(() => {
    const init = async () => {
      // Optimistic: returns local instantly, then refreshes from server in
      // background. Removes the perceptible "freeze" on app open.
      const loaded = await loadRemoteProjects((fresh) => setProjects(fresh));
      setProjects(loaded);

      const openSection = sessionStorage.getItem("nexora-open-section");
      if (openSection) sessionStorage.removeItem("nexora-open-section");

      const applySection = () => {
        if (openSection === "publish") setShowPublish(true);
      };

      const openId = sessionStorage.getItem("nexora-open-project");
      if (openId) {
        sessionStorage.removeItem("nexora-open-project");
        const target = loaded.find(p => p.id === openId);
        if (target) {
          if (!target.config.category) target.config.category = "Self Help";
          if (!target.config.subcategory) target.config.subcategory = "Mindset";
          if (!target.config.genre) target.config.genre = "self-help";
          engine.loadProject(target);
          applySection();
          return;
        }
      }

      const newBookJson = sessionStorage.getItem("nexora-new-book");
      if (newBookJson) {
        sessionStorage.removeItem("nexora-new-book");
        try {
          const config = JSON.parse(newBookJson);
          engine.startNewBook(config);
          setActiveSection("blueprint");
          setTimeout(refreshProjects, 500);
          return;
        } catch { /* ignore */ }
      }

      const lastId = getLastProjectId();
      if (lastId) {
        const last = loaded.find(p => p.id === lastId);
        if (last) {
          if (!last.config.category) last.config.category = "Self Help";
          if (!last.config.subcategory) last.config.subcategory = "Mindset";
          if (!last.config.genre) last.config.genre = "self-help";
          engine.loadProject(last);
          applySection();
        }
      }
    };
    init();
  }, []);

  const refreshProjects = async () => setProjects(await loadRemoteProjects());

  const handleSelectProject = (id: string) => {
    const p = projects.find(p => p.id === id);
    if (p) {
      if (!p.config.category) p.config.category = "Self Help";
      if (!p.config.subcategory) p.config.subcategory = "Mindset";
      if (!p.config.genre) p.config.genre = "self-help";
      engine.loadProject(p);
      setActiveSection("blueprint");
      setShowNewBook(false);
      setSidebarOpen(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProjectAsync(id);
    refreshProjects();
  };

  const handleExport = async () => {
    if (!engine.project) return;
    const errors = validateEpubStructure(engine.project);
    if (errors.length > 0) {
      alert(`EPUB export blocked:\n\n${errors.join("\n")}`);
      return;
    }
    setIsExporting(true);
    setExportLabel("Exporting EPUB...");
    try {
      const blob = await generateEpub(engine.project, coverDataUrl);
      const filename = engine.project.config.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_") || "book";
      downloadEpub(blob, filename);
    } catch (e) {
      console.error("EPUB export failed:", e);
    } finally {
      setIsExporting(false);
      setExportLabel("");
    }
  };

  const handleExportDocx = async () => {
    if (!engine.project) return;
    setIsExporting(true);
    setExportLabel("Preparing DOCX...");
    try {
      const blob = await generateDocx(engine.project);
      const filename = engine.project.config.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_") || "book";
      downloadDocx(blob, filename);
    } catch (e) {
      console.error("DOCX export failed:", e);
    } finally {
      setIsExporting(false);
      setExportLabel("");
    }
  };

  const handleExportPdf = async () => {
    if (!engine.project) return;
    setIsExporting(true);
    setExportLabel("Formatting PDF...");
    try {
      const blob = await generatePdf(engine.project);
      const filename = engine.project.config.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_") || "book";
      downloadPdf(blob, filename);
    } catch (e) {
      console.error("PDF export failed:", e);
    } finally {
      setIsExporting(false);
      setExportLabel("");
    }
  };

  const handleUpdateSettings = (s: WritingSettings) => {
    setWritingSettings(s);
    saveSettings(s);
  };

  const handleLanguageChange = (_lang: UILanguage) => {
    setLangTick(prev => prev + 1);
  };

  // Focus mode — show only editor
  if (focusMode && engine.project) {
    return (
      <div className="h-screen bg-background flex flex-col">
        <div className="h-10 border-b border-border/30 flex items-center justify-between px-4 shrink-0 bg-card/30">
          <span className="text-xs text-muted-foreground">{t("focus_mode")}</span>
          <button onClick={() => setFocusMode(false)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Minimize2 className="h-3.5 w-3.5" /> {t("exit_focus")}
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <EditorPanel
            project={engine.project}
            activeSection={activeSection}
            onGenerateNext={engine.generateNext}
            onGenerateChapter={(...args) => engine.generateSingleChapter(...args, { onChunkProgress: (progress) => { console.log("🔥 PROGRESS:", progress); } })}
            onRegenerateChapter={engine.regenerateChapter}
            onRewriteChapter={engine.rewriteChapterWithDepth}
            onEvaluateChapter={engine.evaluateChapter}
            onAutoRewrite={engine.autoRewriteToThreshold}
            onGenerateSubchapter={engine.generateSingleSubchapter}
            onUpdateChapterContent={engine.updateChapterContent}
            onUpdateChapterTitle={engine.updateChapterTitle}
            onUpdateSubchapterContent={engine.updateSubchapterContent}
            onUpdateSubchapterTitle={engine.updateSubchapterTitle}
            onSetChapterLengthOverride={engine.setChapterLengthOverride}
            isGeneratingSection={engine.isGeneratingSection}
            onCancelGeneration={engine.cancelGeneration}
            chunkProgress={engine.chunkProgress}
            writingSettings={writingSettings}
            onUpdateBlueprintField={engine.updateBlueprintField}
            onUpdateBlueprintOutlineTitle={engine.updateBlueprintOutlineTitle}
            onUpdateBlueprintOutlineSummary={engine.updateBlueprintOutlineSummary}
            onUpdateFrontMatterField={engine.updateFrontMatterField}
            onUpdateBackMatterField={engine.updateBackMatterField}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background relative">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-2 left-2 z-50 p-2 rounded-lg bg-card border border-border shadow-md text-foreground"
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Left Sidebar */}
      <aside className={`w-56 shrink-0 border-r border-border bg-[hsl(var(--sidebar-background))] flex flex-col h-screen fixed md:static z-40 transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="h-4 w-4 text-primary shrink-0" />
            <h1 className="text-xs font-bold text-foreground tracking-wide truncate">
              {engine.project ? (engine.project.config.title || "Untitled") : "SCRIPTORA"}
            </h1>
          </div>
          <button onClick={() => setShowSettings(true)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0" title={t("settings")}>
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* When a project is OPEN: show only "Back to My Books" */}
        {engine.project ? (
          <div className="p-2">
            <Link
              to="/dashboard"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-card border border-border text-foreground hover:bg-muted/40 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> My Books
            </Link>
          </div>
        ) : (
          <>
            <div className="p-2">
              <button onClick={openNewBookGuarded}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                <Plus className="h-3 w-3" /> {t("new_book")}
              </button>
            </div>

            <div className="px-2">
              <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest flex items-center gap-1.5">
                <FolderOpen className="h-3 w-3" /> {t("projects")}
              </div>
              {projects.map(p => (
                <div key={p.id}
                  className="group flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  onClick={() => handleSelectProject(p.id)}>
                  <span className="truncate">{p.config.title || "Untitled"}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id); }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {engine.project && <div className="mx-3 my-2 border-t border-border/50" />}

        {/* ONE-CLICK FULL BOOK + PARALLEL */}
        {engine.project?.blueprint && engine.project.phase !== "complete" && (
          <div className="px-2 pb-2 space-y-1.5">
            <button
              onClick={guardedGenerateFullBook}
              disabled={engine.isAnythingGenerating}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              title="Genera l'intero libro in sequenza con coerenza tra capitoli"
            >
              <Sparkles className="h-3 w-3" />
              {engine.isAnythingGenerating ? "Generazione in corso..." : "Genera libro completo"}
            </button>
            <button
              onClick={() => engine.generateAllChaptersParallel()}
              disabled={!engine.project.blueprint}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-accent/30 text-foreground hover:bg-accent/50 transition-colors border border-accent/40"
              title="Genera tutti i capitoli mancanti 3 alla volta — puoi continuare a chattare con Molly"
            >
              <Sparkles className="h-3 w-3" />
              Tutti i capitoli in parallelo (×3)
            </button>
          </div>
        )}

        <NavigationTree
          project={engine.project}
          activeSection={activeSection}
          onSelectSection={(s) => { setActiveSection(s); setSidebarOpen(false); }}
          generatingSet={engine.generatingSet}
          onGenerateChaptersParallel={engine.generateChaptersParallel}
        />

        {engine.project && (
          <>
            <div className="mx-3 my-1 border-t border-border/50" />
            <ProgressTracker project={engine.project} />
          </>
        )}

        {/* Bottom actions */}
        {engine.project && (
          <div className="mt-auto p-2 border-t border-border/50 space-y-1">
            <button onClick={() => setFocusMode(true)}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
              <Minimize2 className="h-3 w-3" /> {t("focus_mode")}
            </button>
            <button onClick={() => setShowCoach(!showCoach)}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
              <Sparkles className="h-3 w-3" /> {t("ai_coach")}
            </button>
          </div>
        )}
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          config={engine.project?.config || null}
          onUpdateConfig={engine.updateConfig}
          isGenerating={engine.isAnythingGenerating}
          hasProject={!!engine.project}
          onExport={handleExport}
          onExportDocx={handleExportDocx}
          onExportPdf={handleExportPdf}
          onCover={() => setShowCover(true)}
          onPublish={() => setShowPublish(true)}
          isExporting={isExporting}
          exportLabel={exportLabel}
          phase={engine.project?.phase || "idle"}
          syncStatus={syncStatus}
          projectId={engine.project?.id || null}
          project={engine.project}
        />

        <div className="flex-1 flex min-h-0">
          {engine.project ? (
            <>
              <div className="flex-1 min-w-0">
                <EditorPanel
                  project={engine.project}
                  activeSection={activeSection}
                  onGenerateNext={engine.generateNext}
                  onGenerateChapter={(...args) => engine.generateSingleChapter(...args, { onChunkProgress: (progress) => { console.log("🔥 PROGRESS:", progress); } })}
                  onRegenerateChapter={engine.regenerateChapter}
                  onRewriteChapter={engine.rewriteChapterWithDepth}
                  onEvaluateChapter={engine.evaluateChapter}
                  onAutoRewrite={engine.autoRewriteToThreshold}
                  onGenerateSubchapter={engine.generateSingleSubchapter}
                  onUpdateChapterContent={engine.updateChapterContent}
                  onUpdateChapterTitle={engine.updateChapterTitle}
                  onUpdateSubchapterContent={engine.updateSubchapterContent}
                  onUpdateSubchapterTitle={engine.updateSubchapterTitle}
                  onSetChapterLengthOverride={engine.setChapterLengthOverride}
                  isGeneratingSection={engine.isGeneratingSection}
                  onCancelGeneration={engine.cancelGeneration}
                  chunkProgress={engine.chunkProgress}
                  writingSettings={writingSettings}
                  onUpdateBlueprintField={engine.updateBlueprintField}
                  onUpdateBlueprintOutlineTitle={engine.updateBlueprintOutlineTitle}
                  onUpdateBlueprintOutlineSummary={engine.updateBlueprintOutlineSummary}
                  onUpdateFrontMatterField={engine.updateFrontMatterField}
                  onUpdateBackMatterField={engine.updateBackMatterField}
                />
              </div>
              {showCoach && (
                <AICoachPanel project={engine.project} activeSection={activeSection} onClose={() => setShowCoach(false)}
                  onApplyRewrite={(chapterIdx, subIdx, text) => {
                    if (subIdx !== null) engine.updateSubchapterContent(chapterIdx, subIdx, text);
                    else engine.updateChapterContent(chapterIdx, text);
                  }} />
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center px-4">
              <div className="w-full max-w-md rounded-2xl border border-border bg-card/60 p-6 text-center shadow-xl backdrop-blur-sm space-y-4">
                <BookOpen className="h-10 w-10 text-primary/70 mx-auto" />
                <div className="space-y-1">
                  <p className="text-base font-semibold text-foreground">Scriptora</p>
                  <p className="text-sm text-muted-foreground">{t("no_project")}</p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <button
                    onClick={openNewBookGuarded}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4" />
                    {t("new_book")}
                  </button>
                  <Link
                    to="/dashboard"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Torna alla dashboard
                  </Link>
                </div>

                {projects.length > 0 && (
                  <div className="rounded-xl border border-border/70 bg-background/70 p-3 text-left">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Progetti recenti
                    </p>
                    <div className="space-y-1.5">
                      {projects.slice(0, 3).map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleSelectProject(p.id)}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted/40"
                        >
                          <span className="truncate">{p.config.title || "Untitled"}</span>
                          <span className="text-[11px] text-muted-foreground">Apri</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <NewBookDialog
        open={showNewBook}
        onClose={() => setShowNewBook(false)}
        onSubmit={(config) => {
          if (freeBookUsed) {
            setShowNewBook(false);
            setUpgradeReason("books-limit");
            toast.error("Hai già usato il libro gratuito. Passa a Pro/Premium per crearne altri.");
            return;
          }
          engine.startNewBook(config);
          setShowNewBook(false);
          setActiveSection("blueprint");
          setTimeout(refreshProjects, 500);
        }}
      />

      {showCover && engine.project && (
        <CoverGenerator
          title={engine.project.config.title}
          subtitle={engine.project.config.subtitle}
          onGenerate={(dataUrl) => { setCoverDataUrl(dataUrl); setShowCover(false); }}
          onClose={() => setShowCover(false)}
        />
      )}

      {showPublish && (
        <PublishPanel
          project={engine.project}
          onClose={() => setShowPublish(false)}
          onStartFresh={(config) => {
            if (freeBookUsed) {
              setUpgradeReason("books-limit");
              toast.error("Hai già usato il libro gratuito. Passa a Pro/Premium per crearne altri.");
              return;
            }
            engine.startNewBook(config);
            setActiveSection("blueprint");
            setTimeout(refreshProjects, 500);
          }}
          onGenerateFullBook={() => engine.generateFullBook((s) => setActiveSection(s as SectionId))}
          isBookGenerating={engine.isAnythingGenerating}
          onUpdateConfig={engine.updateConfig}
          onUpdateChapterContent={engine.updateChapterContent}
          onSaveProject={async () => {
            if (engine.project) await saveProjectAsync(engine.project);
            await refreshProjects();
          }}
          onExportEpub={handleExport}
          onExportPdf={handleExportPdf}
          onExportDocx={handleExportDocx}
        />
      )}

      <SettingsPanel
        open={showSettings}
        onClose={() => setShowSettings(false)}
        settings={writingSettings}
        onUpdateSettings={handleUpdateSettings}
        onLanguageChange={handleLanguageChange}
      />

      <DominationTray
        currentProjectId={engine.project?.id}
        onApplyToChapter={async (projectId, chapterIndex, newContent) => {
          if (engine.project?.id === projectId) {
            engine.updateChapterContent(chapterIndex, newContent);
            toast.success("Chapter updated 🔥");
          } else {
            // Apply to a different project: patch + save remotely
            const target = projects.find(p => p.id === projectId);
            if (!target) { toast.error("Project not found"); return; }
            const updated: BookProject = {
              ...target,
              chapters: target.chapters.map((ch, i) =>
                i === chapterIndex ? { ...ch, content: newContent } : ch
              ),
              updatedAt: new Date().toISOString(),
            };
            await saveProjectAsync(updated);
            await refreshProjects();
            toast.success(`Applied to "${target.config.title}" 🔥`);
          }
        }}
        onJumpToChapter={(projectId, chapterIndex) => {
          if (engine.project?.id !== projectId) {
            const target = projects.find(p => p.id === projectId);
            if (target) engine.loadProject(target);
          }
          setActiveSection(`chapter-${chapterIndex}` as SectionId);
          setSidebarOpen(false);
        }}
      />
      <UpgradeModal
        open={!!upgradeReason}
        reason={upgradeReason || "export"}
        currentPlan={quota?.plan || "free"}
        onClose={() => setUpgradeReason(null)}
      />
    </div>
  );
};

export default Index;
