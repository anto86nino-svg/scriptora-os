import { useState, useEffect, useRef } from "react";
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
import { VoiceStudioDialog } from "@/components/VoiceStudioDialog";
import { useBookEngine } from "@/hooks/useBookEngine";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { deleteProject as removeProject, getLastProjectId } from "@/lib/storage";
import { loadProjects as loadRemoteProjects, deleteProjectAsync, saveProjectAsync } from "@/services/storageService";
import { generateEpub, downloadEpub, validateEpubStructure } from "@/lib/epub";
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
const WRITING_ROOM_PROJECT_KEY = "scriptora-writing-room-last-project";
const WRITING_ROOM_SECTION_KEY = "scriptora-writing-room-active-section";
const WRITING_ROOM_MODE_KEY = "scriptora-writing-room-editor-mode";

const Index = () => {
  useUILanguage();
  const [projects, setProjects] = useState<BookProject[]>([]);
  const [showNewBook, setShowNewBook] = useState(false);
  const [showCover, setShowCover] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const [showVoiceStudio, setShowVoiceStudio] = useState(false);
  const [voiceStudioChapterIndex, setVoiceStudioChapterIndex] = useState<number>(0);
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
  const [editorMode, setEditorMode] = useState<"edit" | "preview">(() => {
    const saved = localStorage.getItem(WRITING_ROOM_MODE_KEY);
    return saved === "preview" ? "preview" : "edit";
  });
  const [recoveredProject, setRecoveredProject] = useState<BookProject | null>(() => {
    try {
      const raw = sessionStorage.getItem(WRITING_ROOM_PROJECT_KEY);
      return raw ? JSON.parse(raw) as BookProject : null;
    } catch {
      return null;
    }
  });
  const recoveredProjectRef = useRef<BookProject | null>(recoveredProject);
  const lastPersistedRecoveredProjectId = useRef<string | null>(recoveredProject?.id ?? null);
  const lastPersistedRecoveredProjectUpdatedAt = useRef<string | null>(recoveredProject?.updatedAt ?? null);
  const recoverProjectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const effectiveProject = engine.project || recoveredProject;
  const nextVoiceProjectList = effectiveProject
    ? [effectiveProject, ...projects.filter((p) => p.id !== effectiveProject.id)]
    : projects;

  useEffect(() => {
    localStorage.setItem(WRITING_ROOM_MODE_KEY, editorMode);
  }, [editorMode]);

  useEffect(() => {
    if (!activeSection) return;
    sessionStorage.setItem(WRITING_ROOM_SECTION_KEY, activeSection);
    console.info("[writing-room] activeSection changed", { activeSection });
  }, [activeSection]);

  useEffect(() => {
    const mode = sessionStorage.getItem("scriptora-open-mode");
    if (!mode || !effectiveProject) return;
    sessionStorage.removeItem("scriptora-open-mode");
    if (mode === "rewrite") {
      toast.info(t("rewrite_mode_hint"));
    }
  }, [effectiveProject?.id]);

  useEffect(() => {
    const persistProjectRecovery = (project: BookProject) => {
      const sameId = lastPersistedRecoveredProjectId.current === project.id;
      const sameUpdatedAt = lastPersistedRecoveredProjectUpdatedAt.current === project.updatedAt;
      if (sameId && sameUpdatedAt) return;

      if (recoverProjectTimer.current) {
        window.clearTimeout(recoverProjectTimer.current);
      }

      recoverProjectTimer.current = window.setTimeout(() => {
        try {
          sessionStorage.setItem(WRITING_ROOM_PROJECT_KEY, JSON.stringify(project));
          lastPersistedRecoveredProjectId.current = project.id;
          lastPersistedRecoveredProjectUpdatedAt.current = project.updatedAt;
          console.info("[writing-room] persisted recovered project", { projectId: project.id, title: project.config?.title });
        } catch {
          // ignore storage errors
        }
      }, 800);
    };

    if (engine.project) {
      setRecoveredProject(engine.project);
      recoveredProjectRef.current = engine.project;
      persistProjectRecovery(engine.project);
      return;
    }

    if (!recoveredProject) return;
    console.warn("[writing-room] project lost, attempting recovery", { projectId: recoveredProject.id });
    engine.loadProject(recoveredProject);
  }, [engine.project, recoveredProject, engine]);

  useEffect(() => {
    return () => {
      if (recoverProjectTimer.current) {
        window.clearTimeout(recoverProjectTimer.current);
        recoverProjectTimer.current = null;
      }
    };
  }, []);

  
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
    if (!effectiveProject) return;
    if (!isProjectComplete(effectiveProject)) {
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
        const persistedSection = sessionStorage.getItem(WRITING_ROOM_SECTION_KEY);
        const sectionToApply = openSection || persistedSection;
        if (sectionToApply && sectionToApply !== openSection) {
          console.info("[writing-room] restoring persisted activeSection", { activeSection: sectionToApply });
        }
        if (openSection === "publish") setShowPublish(true);
        else if (
          sectionToApply === "blueprint" ||
          sectionToApply === "front-matter" ||
          sectionToApply === "back-matter" ||
          /^chapter-\d+(?:-sub-\d+)?$/.test(sectionToApply || "")
        ) {
          setActiveSection(sectionToApply as SectionId);
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
          setRecoveredProject(target);
          sessionStorage.setItem(WRITING_ROOM_PROJECT_KEY, JSON.stringify(target));
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
          if (sessionStorage.getItem("scriptora-setup-origin") === "auto-bestseller") {
            sessionStorage.removeItem("scriptora-setup-origin");
            toast.success("Stanza di scrittura pronta — blueprint e memoria narrativa caricati");
          }
          setTimeout(refreshProjects, 500);
          return;
        } catch {
          toast.error(t("toast_gen_failed"));
        }
      }

      const lastId = getLastProjectId();
      if (lastId) {
        const last = loaded.find(p => p.id === lastId);
        if (last) {
          if (!last.config.category) last.config.category = "Self Help";
          if (!last.config.subcategory) last.config.subcategory = "Mindset";
          if (!last.config.genre) last.config.genre = "self-help";
          engine.loadProject(last);
          setRecoveredProject(last);
          sessionStorage.setItem(WRITING_ROOM_PROJECT_KEY, JSON.stringify(last));
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
      setRecoveredProject(p);
      sessionStorage.setItem(WRITING_ROOM_PROJECT_KEY, JSON.stringify(p));
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
    if (!effectiveProject) return;
    const errors = validateEpubStructure(effectiveProject);
    if (errors.length > 0) {
      alert(`${t("export_blocked_epub")}:\n\n${errors.join("\n")}`);
      return;
    }
    setIsExporting(true);
    setExportLabel(t("exporting_epub"));
    try {
      const blob = await generateEpub(effectiveProject, coverOverride ?? coverDataUrl);
      const filename = effectiveProject.config.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_") || "book";
      downloadEpub(blob, filename);
      toast.success(t("export_success_epub"));
    } catch (e) {
      console.error("EPUB export failed:", e);
      toast.error(e instanceof Error ? e.message : t("export_failed"));
    } finally {
      setIsExporting(false);
      setExportLabel("");
    }
  };

  const handleExportDocx = async () => {
    if (!effectiveProject) return;
    setIsExporting(true);
    setExportLabel(t("preparing_docx"));
    try {
      const { generateDocx, downloadDocx } = await import("@/lib/docx-export");
      const blob = await generateDocx(effectiveProject);
      const filename = effectiveProject.config.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_") || "book";
      downloadDocx(blob, filename);
      toast.success(t("export_success_docx"));
    } catch (e) {
      console.error("DOCX export failed:", e);
      toast.error(e instanceof Error ? e.message : t("export_failed"));
    } finally {
      setIsExporting(false);
      setExportLabel("");
    }
  };

  const handleExportPdf = async () => {
    if (!effectiveProject) return;
    setIsExporting(true);
    setExportLabel(t("formatting_pdf"));
    try {
      const { generatePdf, downloadPdf } = await import("@/lib/pdf-export");
      const blob = await generatePdf(effectiveProject);
      const filename = effectiveProject.config.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_") || "book";
      downloadPdf(blob, filename);
      toast.success(t("export_success_pdf"));
    } catch (e) {
      console.error("PDF export failed:", e);
      toast.error(e instanceof Error ? e.message : t("export_failed"));
    } finally {
      setIsExporting(false);
      setExportLabel("");
    }
  };

  const handleUpdateSettings = (s: WritingSettings) => {
    setWritingSettings(s);
    saveSettings(s);
  };

  const openVoiceStudioForChapter = (chapterIndex: number) => {
    setVoiceStudioChapterIndex(chapterIndex);
    setShowVoiceStudio(true);
  };

  const closeVoiceStudio = () => {
    setShowVoiceStudio(false);
  };

  const handleLanguageChange = (_lang: UILanguage) => {
    // SettingsPanel calls this after saving; useUILanguage handles the rerender.
  };

  if (focusMode && effectiveProject) {
    return (
      <div className="scriptora-ios-screen flex h-safe-screen min-h-[100dvh] flex-col pb-safe">
        <div className="ios-glass-soft flex h-12 shrink-0 items-center justify-between px-4 pt-safe">
          <span className="text-xs text-muted-foreground">{t("focus_mode")}</span>
          <button onClick={() => setFocusMode(false)}
            className="ios-toolbar-button px-3 text-xs text-muted-foreground hover:text-foreground">
            <Minimize2 className="h-3.5 w-3.5" /> {t("exit_focus")}
          </button>
        </div>
        <div className="min-h-0 flex-1 px-3 pb-3">
          <EditorPanel
            project={effectiveProject}
            activeSection={activeSection}
            editorMode={editorMode}
            onEditorModeChange={setEditorMode}
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
            onApplyAuthorBrainFrontMatter={engine.applyAuthorBrainFrontMatter}
            onApplyAuthorBrainBackMatter={engine.applyAuthorBrainBackMatter}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="scriptora-ios-screen relative flex h-safe-screen min-h-[100dvh] max-w-full overflow-x-hidden overflow-hidden pb-safe">
      {/* Floating sidebar toggle — icon only on mobile */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="ios-toolbar-button fixed left-3 top-3 z-50 h-11 w-11 p-0 text-foreground shadow-lg backdrop-blur-xl sm:min-w-11 sm:px-2"
        title={sidebarOpen ? "Chiudi pannello" : "Capitoli & Libro"}
        aria-expanded={sidebarOpen}
        aria-label={sidebarOpen ? "Chiudi pannello" : "Apri navigazione"}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg">
          {sidebarOpen ? "✕" : "📚"}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-bold text-foreground">
            {sidebarOpen ? "Chiudi pannello" : "Capitoli & Libro"}
          </span>
          <span className="block text-[11px] text-muted-foreground">
            {sidebarOpen ? "Torna alla scrittura" : "Apri navigazione"}
          </span>
        </span>
      </button>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm layout-desktop:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      {/* Left Sidebar — drawer on mobile, collapsible on desktop */}
      <aside
        className={`ios-sidebar fixed inset-y-0 left-0 z-40 flex h-safe-screen w-[min(100vw-2rem,288px)] max-w-[288px] shrink-0 flex-col pb-safe transition-transform duration-300 ease-out layout-desktop:relative layout-desktop:inset-auto layout-desktop:h-auto layout-desktop:max-w-none ${
          sidebarOpen
            ? "translate-x-0 pointer-events-auto"
            : "-translate-x-full pointer-events-none layout-desktop:translate-x-0 layout-desktop:w-0 layout-desktop:overflow-hidden layout-desktop:pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-3 pl-14 layout-desktop:pl-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="ios-icon ios-icon-blue h-9 w-9 shrink-0">
              <BookOpen className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Scriptora OS</p>
              <h1 className="truncate text-xs font-bold text-foreground">
                {effectiveProject ? (effectiveProject.config.title || t("untitled")) : "SCRIPTORA"}
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="ios-toolbar-button h-8 w-8 text-muted-foreground hover:text-foreground layout-desktop:hidden"
              aria-label="Chiudi pannello"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setShowSettings(true)} className="ios-toolbar-button h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground" title={t("settings")}>
            <Settings className="h-3.5 w-3.5" />
          </button>
          </div>
        </div>

        {/* When a project is OPEN: show only "Back to My Books" */}
        {effectiveProject ? (
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

        {effectiveProject && <div className="mx-3 my-2 border-t border-white/10" />}

        {/* ONE-CLICK FULL BOOK + PARALLEL */}
        {effectiveProject?.blueprint && effectiveProject.phase !== "complete" && (
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
              disabled={!effectiveProject.blueprint}
              className="ios-toolbar-button w-full px-3 py-1.5 text-[10px] font-medium disabled:opacity-40"
              title={t("generate_parallel_title")}
            >
              <Sparkles className="h-3 w-3" />
              {t("generate_parallel_all")}
            </button>
          </div>
        )}

        <NavigationTree
          project={effectiveProject}
          activeSection={activeSection}
          onSelectSection={(s) => { setActiveSection(s); setSidebarOpen(false); }}
          generatingSet={engine.generatingSet}
          onGenerateChaptersParallel={engine.generateChaptersParallel}
        />

        {effectiveProject && (
          <>
            <div className="mx-3 my-1 border-t border-white/10" />
            <ProgressTracker project={effectiveProject} />
          </>
        )}

        {/* Bottom actions */}
        {effectiveProject && (
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
        className={`flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col transition-all duration-300 ${
          sidebarOpen ? "p-2 layout-desktop:p-3" : "p-2 pb-3 layout-desktop:px-6 layout-desktop:py-4"
        }`}
      >
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden overflow-x-hidden rounded-lg border border-white/10 bg-slate-950/95 shadow-2xl shadow-black/20 layout-desktop:bg-slate-950/45 layout-desktop:backdrop-blur-xl">
          {effectiveProject ? (
            <>
              <div className="min-h-0 min-w-0 flex-1">
                <EditorPanel
                  project={effectiveProject}
                  activeSection={activeSection}
                  editorMode={editorMode}
                  onEditorModeChange={setEditorMode}
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
                  onApplyAuthorBrainFrontMatter={engine.applyAuthorBrainFrontMatter}
                  onApplyAuthorBrainBackMatter={engine.applyAuthorBrainBackMatter}
                  onNarrateChapter={openVoiceStudioForChapter}
                />
              </div>
              {showCoach && (
                <AICoachPanel project={effectiveProject} activeSection={activeSection} onClose={() => setShowCoach(false)}
                  onApplyRewrite={(chapterIdx, subIdx, text) => {
                    if (subIdx !== null) engine.updateSubchapterContent(chapterIdx, subIdx, text);
                    else engine.updateChapterContent(chapterIdx, text);
                  }} />
              )}
              <VoiceStudioDialog
                open={showVoiceStudio}
                onClose={closeVoiceStudio}
                projects={nextVoiceProjectList}
                initialProjectId={effectiveProject?.id}
                initialChapterIndex={voiceStudioChapterIndex}
                autoPlayOnOpen
                onOpenChapterInEditor={(_projectId, chapterIdx) => {
                  closeVoiceStudio();
                  setActiveSection(`chapter-${chapterIdx}` as SectionId);
                }}
              />
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
          const restoredSection = "blueprint" as SectionId;
          sessionStorage.setItem(WRITING_ROOM_SECTION_KEY, restoredSection);
          setShowNewBook(false);
          setActiveSection(restoredSection);
          setTimeout(refreshProjects, 500);
        }}
      />

      {showCover && effectiveProject && (
        <CoverGenerator
          title={effectiveProject.config.title}
          subtitle={effectiveProject.config.subtitle}
          authorName={effectiveProject.config.authorName || effectiveProject.config.author || effectiveProject.config.writerName}
          description={effectiveProject.blueprint?.overview || effectiveProject.config.subtitle}
          authorBio={effectiveProject.frontMatter?.aboutAuthor || effectiveProject.config.authorIdentity?.biography}
          projectGenre={effectiveProject.config.genre}
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
          project={effectiveProject}
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
            if (effectiveProject) await saveProjectAsync(effectiveProject);
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
