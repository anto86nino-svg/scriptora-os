import { useState, useEffect } from "react";
import { NavigationTree } from "@/components/NavigationTree";
import { TopBar } from "@/components/TopBar";
import { EditorPanel } from "@/components/EditorPanel";
import { NewBookDialog } from "@/components/NewBookDialog";
import { CoverGenerator } from "@/components/CoverGenerator";
import { CoverBeforeExportDialog } from "@/components/CoverBeforeExportDialog";
import { PublishPanel } from "@/components/PublishPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { AICoachPanel } from "@/components/AICoachPanel";
import { ProgressTracker } from "@/components/ProgressTracker";
import { GuidedProjectFlow } from "@/components/GuidedProjectFlow";
import { useBookEngine } from "@/hooks/useBookEngine";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { deleteProject as removeProject, getLastProjectId } from "@/lib/storage";
import { loadProjects as loadRemoteProjects, deleteProjectAsync, saveProjectAsync } from "@/services/storageService";
import { generateEpub, downloadEpub, validateEpubStructure } from "@/lib/epub";
import { generateDocx, downloadDocx } from "@/lib/docx-export";
import { generatePdf, downloadPdf } from "@/lib/pdf-export";
import { BookProject, SectionId } from "@/types/book";
import { WritingSettings, loadSettings, saveSettings } from "@/lib/settings";
import { t, tt, UILanguage, useUILanguage } from "@/lib/i18n";
import { toast } from "sonner";
import { BookOpen, Plus, Trash2, FolderOpen, Settings, Sparkles, Minimize2, Menu, X, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuota, usePlan } from "@/lib/plan";
import { UpgradeModal } from "@/components/UpgradeModal";
import { isProjectComplete } from "@/lib/project-status";

type ExportFormat = "epub" | "docx" | "pdf";

const Index = () => {
  useUILanguage();
  const [projects, setProjects] = useState<BookProject[]>([]);
  const [showNewBook, setShowNewBook] = useState(false);
  const [showCover, setShowCover] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem("scriptora-sidebar-open");
    return saved ? JSON.parse(saved) : false;
  });
  const [coverDataUrl, setCoverDataUrl] = useState<string | undefined>();
  const [coverGateOpen, setCoverGateOpen] = useState(false);
  const [pendingExportFormat, setPendingExportFormat] = useState<ExportFormat | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportLabel, setExportLabel] = useState("");
  const [activeSection, setActiveSection] = useState<SectionId | null>("blueprint");
  const [writingSettings, setWritingSettings] = useState<WritingSettings>(loadSettings());
  const [upgradeReason, setUpgradeReason] = useState<null | "export" | "token-limit" | "dominate" | "books-limit">(null);
  const { syncStatus, markSaving, markSaved, markPending, markOffline } = useSyncStatus();
  const engine = useBookEngine({
    onSaving: markSaving,
    onSaved: markSaved,
    onPending: markPending,
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
      toast.error(t("toast_free_book_used"));
      return;
    }
    setShowNewBook(true);
  };

  useEffect(() => {
    localStorage.setItem("scriptora-sidebar-open", JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  
  // Token guard for free users — gracefully stop generation when limit is reached
  useEffect(() => {
    if (quota?.isOverTokenLimit && engine.isAnythingGenerating) {
      engine.cancelGeneration();
      setUpgradeReason("token-limit");
      toast.warning(t("free_generation_limit"));
    }
  }, [quota?.isOverTokenLimit, engine.isAnythingGenerating]);

  const guardedGenerateFullBook = () => {
    if (quota?.isOverTokenLimit) { setUpgradeReason("token-limit"); return; }
    engine.generateFullBook((section) => setActiveSection(section as SectionId));
  };
  const runExport = (format: ExportFormat, coverOverride?: string) => {
    if (format === "epub") void handleExport(coverOverride);
    if (format === "docx") void handleExportDocx();
    if (format === "pdf") void handleExportPdf();
  };

  const requestExport = (format: ExportFormat) => {
    if (!quota?.canExport) {
      setUpgradeReason("export");
      return;
    }
    if (!engine.project) return;
    if (!isProjectComplete(engine.project)) {
      toast.error("Completa tutto il libro prima di esportare.");
      return;
    }
    if (!coverDataUrl) {
      setPendingExportFormat(format);
      setCoverGateOpen(true);
      return;
    }
    runExport(format);
  };

  const guardedExportEpub = () => requestExport("epub");
  const guardedExportDocx = () => requestExport("docx");
  const guardedExportPdf  = () => requestExport("pdf");

  useEffect(() => {
    const init = async () => {
      const loaded = await loadRemoteProjects((fresh) => setProjects(fresh));
      setProjects(loaded);

      const openSection = sessionStorage.getItem("nexora-open-section");
      if (openSection) sessionStorage.removeItem("nexora-open-section");

      const applySection = () => {
        if (openSection === "publish") setShowPublish(true);
        else if (
          openSection === "blueprint" ||
          openSection === "front-matter" ||
          openSection === "back-matter" ||
          /^chapter-\d+(?:-sub-\d+)?$/.test(openSection || "")
        ) {
          setActiveSection(openSection as SectionId);
        }
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

  const handleExport = async (coverOverride?: string) => {
    if (!engine.project) return;
    const errors = validateEpubStructure(engine.project);
    if (errors.length > 0) {
      alert(`${t("export_blocked_epub")}:\n\n${errors.join("\n")}`);
      return;
    }
    setIsExporting(true);
    setExportLabel(t("exporting_epub"));
    try {
      const blob = await generateEpub(engine.project, coverOverride ?? coverDataUrl);
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
    setExportLabel(t("preparing_docx"));
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
    setExportLabel(t("formatting_pdf"));
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
    // SettingsPanel calls this after saving; useUILanguage handles the rerender.
  };

  if (focusMode && engine.project) {
    return (
      <div className="scriptora-ios-screen flex h-screen flex-col">
        <div className="ios-glass-soft flex h-12 shrink-0 items-center justify-between px-4">
          <span className="text-xs text-muted-foreground">{t("focus_mode")}</span>
          <button onClick={() => setFocusMode(false)}
            className="ios-toolbar-button px-3 text-xs text-muted-foreground hover:text-foreground">
            <Minimize2 className="h-3.5 w-3.5" /> {t("exit_focus")}
          </button>
        </div>
        <div className="min-h-0 flex-1 px-3 pb-3">
          <EditorPanel
            project={engine.project}
            activeSection={activeSection}
            onGenerateNext={engine.generateNext}
            onGenerateFrontMatter={engine.generateFrontMatterSection}
            onGenerateBackMatter={engine.generateBackMatterSection}
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
    <div className="scriptora-ios-screen relative flex h-screen overflow-hidden">
      {/* Floating sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`ios-toolbar-button fixed left-3 top-3 z-50 p-2 text-foreground shadow-lg backdrop-blur-xl ${
          ""
        }`}
        title={sidebarOpen ? "Chiudi pannello" : "Capitoli & Libro"}
      >
        <>
  <div className="
    h-10 w-10 rounded-xl
    bg-primary/10
    flex items-center justify-center
    text-lg shrink-0
  ">
    {sidebarOpen ? "✕" : "📚"}
  </div>

  <div className="text-left leading-tight">
    <p className="text-sm font-bold text-foreground">
      {sidebarOpen
        ? "Chiudi pannello"
        : "Capitoli & Libro"}
    </p>

    <p className="text-[11px] text-muted-foreground">
      {sidebarOpen
        ? "Torna alla scrittura"
        : "Apri navigazione"}
    </p>
  </div>
</>
      </button>

      <button
        onClick={() => setGuidedFlowEnabled(true)}
        className="
          ios-toolbar-button
          fixed top-4 left-[270px]
          z-50
          px-3 py-3
          text-xs font-semibold
          text-muted-foreground
          hover:text-foreground
          rounded-2xl
          shadow-lg
          backdrop-blur-xl
        "
        title="Apri guida"
      >
        ✨ Guida
      </button>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/[0.55] backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Left Sidebar */}
      <aside
        className={`ios-sidebar fixed z-40 flex h-screen shrink-0 flex-col transition-all duration-300 ease-out md:relative ${
          sidebarOpen
            ? "translate-x-0 w-[272px] opacity-100"
            : "-translate-x-full md:translate-x-0 md:w-0 md:opacity-0 overflow-hidden"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-3 pl-14 md:pl-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="ios-icon ios-icon-blue h-9 w-9 shrink-0">
              <BookOpen className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Scriptora OS</p>
              <h1 className="truncate text-xs font-bold text-foreground">
                {engine.project ? (engine.project.config.title || t("untitled")) : "SCRIPTORA"}
              </h1>
            </div>
          </div>
          <button onClick={() => setShowSettings(true)} className="ios-toolbar-button h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground" title={t("settings")}>
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* When a project is OPEN: show only "Back to My Books" */}
        {engine.project ? (
          <div className="p-2">
            <Link
              to="/dashboard"
              className="ios-toolbar-button flex w-full justify-start px-3 py-2 text-xs font-medium"
            >
              <ArrowLeft className="h-3 w-3" /> {t("back_to_my_books")}
            </Link>
          </div>
        ) : (
          <>
            <div className="p-2">
              <button onClick={openNewBookGuarded}
                className="flex w-full items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-slate-100">
                <Plus className="h-3 w-3" /> {t("new_book")}
              </button>
            </div>

            <div className="px-2">
              <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground/70">
                <FolderOpen className="h-3 w-3" /> {t("projects")}
              </div>
              {projects.map(p => (
                <div key={p.id}
                  className="group flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-white/[0.07] hover:text-foreground"
                  onClick={() => handleSelectProject(p.id)}>
                  <span className="truncate">{p.config.title || t("untitled")}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id); }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {engine.project && <div className="mx-3 my-2 border-t border-white/10" />}

        {/* ONE-CLICK FULL BOOK + PARALLEL */}
        {engine.project?.blueprint && engine.project.phase !== "complete" && (
          <div className="px-2 pb-2 space-y-1.5">
            <button
              onClick={guardedGenerateFullBook}
              disabled={engine.isAnythingGenerating}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[11px] font-semibold text-slate-950 shadow-sm transition-opacity hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              title={t("generate_full_book_title")}
            >
              <Sparkles className="h-3 w-3" />
              {engine.isAnythingGenerating ? t("generation_running") : t("generate_full_book")}
            </button>
            <button
              onClick={() => engine.generateAllChaptersParallel()}
              disabled={!engine.project.blueprint}
              className="ios-toolbar-button w-full px-3 py-1.5 text-[10px] font-medium disabled:opacity-40"
              title={t("generate_parallel_title")}
            >
              <Sparkles className="h-3 w-3" />
              {t("generate_parallel_all")}
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
            <div className="mx-3 my-1 border-t border-white/10" />
            <ProgressTracker project={engine.project} />
          </>
        )}

        {/* Bottom actions */}
        {engine.project && (
          <div className="mt-auto space-y-1 border-t border-white/10 p-2">
            <button onClick={() => setFocusMode(true)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-white/[0.07] hover:text-foreground">
              <Minimize2 className="h-3 w-3" /> {t("focus_mode")}
            </button>
            <button onClick={() => setShowCoach(!showCoach)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-white/[0.07] hover:text-foreground">
              <Sparkles className="h-3 w-3" /> {t("ai_coach")}
            </button>
          </div>
        )}
      </aside>

      {/* Main Area */}
      <div
        className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ${
          sidebarOpen ? "p-2 md:p-3" : "p-2 md:px-6 md:py-4"
        }`}
      >
{/* TopBar removed for clean writing experience */}


        <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border border-white/10 bg-black/10 shadow-2xl shadow-black/20 backdrop-blur-sm">
          {engine.project ? (
            <>
              <div className="min-w-0 flex-1">
                <EditorPanel
                  project={engine.project}
                  activeSection={activeSection}
                  onGenerateNext={engine.generateNext}
                  onGenerateFrontMatter={engine.generateFrontMatterSection}
                  onGenerateBackMatter={engine.generateBackMatterSection}
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
            <div className="flex flex-1 items-center justify-center px-4">
              <div className="ios-panel w-full max-w-md space-y-4 p-6 text-center">
                <span className="ios-icon ios-icon-blue mx-auto h-16 w-16">
                  <BookOpen className="h-7 w-7" />
                </span>
                <div className="space-y-1">
                  <p className="text-base font-semibold text-foreground">Scriptora</p>
                  <p className="text-sm text-muted-foreground">{t("no_project")}</p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <button
                    onClick={openNewBookGuarded}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-100"
                  >
                    <Plus className="h-4 w-4" />
                    {t("new_book")}
                  </button>
                  <Link
                    to="/dashboard"
                    className="ios-toolbar-button h-10 px-4 text-sm font-medium"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t("back_to_dashboard")}
                  </Link>
                </div>

                {projects.length > 0 && (
                  <div className="ios-glass-soft rounded-lg p-3 text-left">
                    <p className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">
                      {t("recent_projects")}
                    </p>
                    <div className="space-y-1.5">
                      {projects.slice(0, 3).map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleSelectProject(p.id)}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-white/[0.07]"
                        >
                          <span className="truncate">{p.config.title || t("untitled")}</span>
                          <span className="text-[11px] text-muted-foreground">{t("open_action")}</span>
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
            toast.error(t("toast_free_book_used"));
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
          authorName={engine.project.config.authorName || engine.project.config.author || engine.project.config.writerName}
          description={engine.project.blueprint?.overview || engine.project.config.subtitle}
          authorBio={engine.project.frontMatter?.aboutAuthor || engine.project.config.authorIdentity?.biography}
          onGenerate={(dataUrl) => {
            setCoverDataUrl(dataUrl);
            setShowCover(false);
            if (pendingExportFormat) {
              const format = pendingExportFormat;
              setPendingExportFormat(null);
              runExport(format, dataUrl);
            }
          }}
          onClose={() => {
            setShowCover(false);
            if (pendingExportFormat) setPendingExportFormat(null);
          }}
        />
      )}

      <CoverBeforeExportDialog
        open={coverGateOpen && !!pendingExportFormat}
        format={(pendingExportFormat || "epub").toUpperCase() as "EPUB" | "PDF" | "DOCX"}
        onCreateCover={() => {
          setCoverGateOpen(false);
          setShowCover(true);
        }}
        onShipWithoutCover={() => {
          const format = pendingExportFormat;
          setCoverGateOpen(false);
          setPendingExportFormat(null);
          if (format) runExport(format);
        }}
        onClose={() => {
          setCoverGateOpen(false);
          setPendingExportFormat(null);
        }}
      />

      {showPublish && (
        <PublishPanel
          project={engine.project}
          onClose={() => setShowPublish(false)}
          onStartFresh={(config) => {
            if (freeBookUsed) {
              setUpgradeReason("books-limit");
              toast.error(t("toast_free_book_used"));
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
          onExportEpub={guardedExportEpub}
          onExportPdf={guardedExportPdf}
          onExportDocx={guardedExportDocx}
        />
      )}

      <SettingsPanel
        open={showSettings}
        onClose={() => setShowSettings(false)}
        settings={writingSettings}
        onUpdateSettings={handleUpdateSettings}
        onLanguageChange={handleLanguageChange}
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
