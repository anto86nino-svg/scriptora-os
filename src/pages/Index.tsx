import { useState, useEffect, useMemo, lazy, Suspense, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { NavigationTree } from "@/components/NavigationTree";
import { CoverBeforeExportDialog } from "@/components/CoverBeforeExportDialog";
import { ProgressTracker } from "@/components/ProgressTracker";
import { GuidedProjectFlow } from "@/components/GuidedProjectFlow";
import { useBookEngine } from "@/hooks/useBookEngine";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { deleteProject as removeProject, getLastProjectId } from "@/lib/storage";
import { loadProjects as loadRemoteProjects, deleteProjectAsync, saveProjectAsync } from "@/services/storageService";
import {
  runEpubExport,
  downloadEpubFile,
  validateEpubExport,
  runDocxExport,
  downloadDocxFile,
  runPdfExport,
  downloadPdfFile,
} from "@/lib/export-runtime";
import { ExportBlockedError, getExportBlockers } from "@/lib/export-readiness";
import { computeProjectProgressPercent } from "@/lib/project-progress";
import { BookTypeBadge } from "@/components/BookTypeBadge";
import { isBackMatterEnabled, isFrontMatterEnabled } from "@/lib/matter-options";
import { applyAuthorIdentityToConfig } from "@/lib/author-identity";
import { RecoveryEngine } from "@/lib/recovery-engine";
import { BookProject, SectionId } from "@/types/book";
import { formatChapterDisplayTitle } from "@/lib/chapter-titles";
import { scrollToChapterAnchor, getChapterIndexFromSection } from "@/lib/writer/chapter-navigation";
import { WritingSettings, loadSettings, saveSettings } from "@/lib/settings";
import { t, tt, UILanguage, useUILanguage } from "@/lib/i18n";
import { usePlan, useQuota } from "@/lib/plan";
import { fillMissingGenreFromInference } from "@/lib/book-creation-os/genre-inference";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BookOpen, Plus, Trash2, FolderOpen, Settings, Sparkles, Minimize2, Menu, X, ArrowLeft } from "lucide-react";
import { WriterCleanHeader } from "@/components/writer/WriterCleanHeader";
import { WriterToolsPanel } from "@/components/writer/WriterToolsPanel";
import { MobileWriterBar } from "@/components/writer/MobileWriterBar";
import { WriterOverflowMenu } from "@/components/writer/WriterOverflowMenu";
import { MobileBookNavigator } from "@/mobile/MobileBookNavigator";
import { StoryProgressOs } from "@/mobile/StoryProgressOs";
import { MobileAICoachScreen } from "@/mobile/MobileAICoachScreen";
import { MobileVoiceStudioScreen } from "@/mobile/MobileVoiceStudioScreen";
import { restoreWriterScrollPosition, saveWriterScrollPosition } from "@/mobile/clearProjectSession";
import { openMobileMarketFromWriter } from "@/mobile/mobileMarketContext";
import type { RewriteLevel } from "@/lib/generation-types";
import { LazyMollyBrainPanel } from "@/components/molly/LazyMollyBrainPanel";
import { ScriptoraAliveTransition } from "@/components/boot/ScriptoraAliveTransition";
import { UpgradeModal } from "@/components/UpgradeModal";
import { applyScriptoraFreeWatermarkToProject } from "@/lib/brand/scriptoraBrand";

const VoiceStudioDialog = lazy(() =>
  import("@/components/VoiceStudioDialog").then((m) => ({ default: m.VoiceStudioDialog })),
);
const EditorPanel = lazyWithRetry(() =>
  import("@/components/EditorPanel").then((m) => ({ default: m.EditorPanel })),
);
const CoverGenerator = lazyWithRetry(() =>
  import("@/components/CoverGenerator").then((m) => ({ default: m.CoverGenerator })),
);
const PublishPanel = lazyWithRetry(() =>
  import("@/components/PublishPanel").then((m) => ({ default: m.PublishPanel })),
);
const TitleIntelligenceDialog = lazyWithRetry(() =>
  import("@/components/TitleIntelligenceDialog").then((m) => ({ default: m.TitleIntelligenceDialog })),
);
const SettingsPanel = lazyWithRetry(() =>
  import("@/components/SettingsPanel").then((m) => ({ default: m.SettingsPanel })),
);
const AICoachPanel = lazyWithRetry(() =>
  import("@/components/AICoachPanel").then((m) => ({ default: m.AICoachPanel })),
);
const DominationTray = lazyWithRetry(() =>
  import("@/components/DominationTray").then((m) => ({ default: m.DominationTray })),
);

type ExportFormat = "epub" | "docx" | "pdf";

function VoiceStudioFallback() {
  return (
    <ScriptoraAliveTransition
      overlay
      tone="writer"
      title="Sto aprendo Voice Studio…"
      steps={[
        "Sto caricando voce, ritmo e lettura avanzata…",
        "Sto preparando il capitolo per l'ascolto…",
        "Quasi pronto…",
      ]}
    />
  );
}

function PanelFallback() {
  return (
    <ScriptoraAliveTransition
      compact
      tone="writer"
      title="Sto aprendo il pannello editoriale…"
      minHeight="240px"
      steps={[
        "Sto caricando strumenti di scrittura…",
        "Sto preparando editor e continuità…",
        "Quasi pronto…",
      ]}
    />
  );
}

function getWriterHeaderContext(
  project: BookProject | null,
  activeSection: SectionId | null,
  chunkProgress: Record<string, { currentWords?: number; targetWords?: number }> | undefined,
  generatingSet: Set<string>,
) {
  if (!project) {
    return {
      breadcrumb: "Scriptora OS",
      title: "Nessun progetto aperto",
      progress: "Apri un libro dalla dashboard",
      isGenerating: false,
    };
  }

  let breadcrumb = "Blueprint";
  let title = project.config.title || t("untitled");
  let generationKey = String(activeSection || "blueprint");

  if (activeSection === "blueprint") {
    title = "Blueprint del libro";
  } else if (activeSection === "front-matter") {
    breadcrumb = "Blueprint → Front matter";
    title = t("front_matter");
  } else if (activeSection === "back-matter") {
    breadcrumb = "Blueprint → Back matter";
    title = t("back_matter");
  } else {
    const chapterMatch = String(activeSection || "").match(/^chapter-(\d+)(?:-sub-(\d+))?$/);
    if (chapterMatch) {
      const chapterIndex = Number(chapterMatch[1]);
      const subIndex = chapterMatch[2] != null ? Number(chapterMatch[2]) : null;
      const outline = project.blueprint?.chapterOutlines?.[chapterIndex];
      const chapter = project.chapters?.[chapterIndex];
      title = formatChapterDisplayTitle(chapterIndex, chapter?.title || outline?.title, {
        config: project.config,
        summary: outline?.summary,
        totalChapters: project.config.numberOfChapters,
      });
      breadcrumb = subIndex != null
        ? `Blueprint → Capitoli → ${chapterIndex + 1}.${subIndex + 1}`
        : "Blueprint → Capitoli";
      generationKey = subIndex != null ? `chapter-${chapterIndex}-sub-${subIndex}` : `chapter-${chapterIndex}`;
    }
  }

  const liveProgress = chunkProgress?.[generationKey];
  const isGenerating = generatingSet.has(generationKey);
  const progress = liveProgress?.targetWords
    ? `${Math.min(99, Math.round(((liveProgress.currentWords || 0) / Math.max(liveProgress.targetWords, 1)) * 100))}% · ${(liveProgress.currentWords || 0).toLocaleString()} / ${liveProgress.targetWords.toLocaleString()} parole`
    : isGenerating
      ? "Generazione live in corso"
      : project.phase;

  return { breadcrumb, title, progress, isGenerating };
}

const Index = () => {
  useUILanguage();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<BookProject[]>([]);
  const [showCover, setShowCover] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showTitleIntel, setShowTitleIntel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const [showVoiceStudio, setShowVoiceStudio] = useState(false);
  const [voiceStudioChapterIndex, setVoiceStudioChapterIndex] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [guidedFlowEnabled, setGuidedFlowEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("scriptora-guided-flow");
    return saved !== "off";
  });
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem("scriptora-sidebar-open");
    return saved ? JSON.parse(saved) : false;
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [coverDataUrl, setCoverDataUrl] = useState<string | undefined>();
  const [coverGateOpen, setCoverGateOpen] = useState(false);
  const [pendingExportFormat, setPendingExportFormat] = useState<ExportFormat | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportLabel, setExportLabel] = useState("");
  const [activeSection, setActiveSection] = useState<SectionId | null>("blueprint");
  const [toolsPanelOpen, setToolsPanelOpen] = useState(false);
  const [writerMenuOpen, setWriterMenuOpen] = useState(false);
  const [chapterToolRequest, setChapterToolRequest] = useState<{ mode: "analysis" | "patch"; nonce: number } | null>(null);
  const [writingSettings, setWritingSettings] = useState<WritingSettings>(loadSettings());
  const openedFromDashboard =
    sessionStorage.getItem("scriptora-open-from-dashboard") === "1";
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
  const writerHeaderContext = getWriterHeaderContext(
    engine.project,
    activeSection,
    engine.chunkProgress,
    engine.generatingSet,
  );

  const activeChapterIndex = useMemo(() => {
    if (!activeSection) return null;
    const match = activeSection.match(/^chapter-(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }, [activeSection]);

  const activeChapter = activeChapterIndex != null ? engine.project?.chapters[activeChapterIndex] : undefined;
  const activeChapterGenerated = !!(activeChapter?.content?.length);
  const isChapterView = activeChapterIndex != null;

  const triggerChapterTool = (mode: "analysis" | "patch") => {
    setChapterToolRequest({ mode, nonce: Date.now() });
  };

  const voiceProjectList = useMemo(
    () => (engine.project ? [engine.project, ...projects.filter((p) => p.id !== engine.project!.id)] : projects),
    [engine.project, projects],
  );

  const [isMobileLayout, setIsMobileLayout] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsMobileLayout(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const handleSelectSection = useCallback((section: SectionId) => {
    setActiveSection(section);
    setSidebarOpen(false);
    setMobileNavOpen(false);

    const chapterIdx = getChapterIndexFromSection(section);
    if (chapterIdx !== null) {
      if (isMobileLayout) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        requestAnimationFrame(() => {
          scrollToChapterAnchor(chapterIdx, { behavior: "smooth", resetWindow: false });
        });
      }
    }
  }, [isMobileLayout]);

  const handleSelectChapter = useCallback((index: number) => {
    handleSelectSection(`chapter-${index}` as SectionId);
  }, [handleSelectSection]);

  const openMobileNavExclusive = useCallback(() => {
    if (engine.project?.id) saveWriterScrollPosition(engine.project.id, window.scrollY);
    setShowCoach(false);
    setWriterMenuOpen(false);
    setShowVoiceStudio(false);
    setShowSettings(false);
    setMobileNavOpen(true);
  }, [engine.project?.id]);

  const openMobileCoachExclusive = useCallback(() => {
    if (engine.project?.id) saveWriterScrollPosition(engine.project.id, window.scrollY);
    setMobileNavOpen(false);
    setWriterMenuOpen(false);
    setShowVoiceStudio(false);
    setShowSettings(false);
    setShowCoach(true);
  }, [engine.project?.id]);

  const closeMobileCoach = useCallback(() => {
    setShowCoach(false);
    if (engine.project?.id) restoreWriterScrollPosition(engine.project.id);
  }, [engine.project?.id]);

  const openMobileWriterMenu = useCallback(() => {
    if (engine.project?.id) saveWriterScrollPosition(engine.project.id, window.scrollY);
    setMobileNavOpen(false);
    setShowCoach(false);
    setShowVoiceStudio(false);
    setShowSettings(false);
    setWriterMenuOpen(true);
  }, [engine.project?.id]);

  const openMobileSettingsExclusive = useCallback(() => {
    if (engine.project?.id) saveWriterScrollPosition(engine.project.id, window.scrollY);
    setMobileNavOpen(false);
    setShowCoach(false);
    setWriterMenuOpen(false);
    setShowVoiceStudio(false);
    setShowSettings(true);
  }, [engine.project?.id]);

  const closeMobileSettings = useCallback(() => {
    setShowSettings(false);
    if (engine.project?.id) restoreWriterScrollPosition(engine.project.id);
  }, [engine.project?.id]);

  const mobileOverlayActive =
    isMobileLayout &&
    (mobileNavOpen || showCoach || writerMenuOpen || showVoiceStudio || showSettings);

  const openVoiceStudioForChapter = (chapterIndex: number) => {
    if (isMobileLayout) {
      if (engine.project?.id) saveWriterScrollPosition(engine.project.id, window.scrollY);
      setMobileNavOpen(false);
      setShowCoach(false);
      setWriterMenuOpen(false);
      setShowSettings(false);
    }
    setVoiceStudioChapterIndex(chapterIndex);
    setShowVoiceStudio(true);
  };

  const closeVoiceStudio = () => {
    setShowVoiceStudio(false);
    if (isMobileLayout && engine.project?.id) restoreWriterScrollPosition(engine.project.id);
  };

  const openNewBookGuarded = () => {
    if (freeBookUsed) {
      setUpgradeReason("books-limit");
      toast.error(t("toast_free_book_used"));
      return;
    }
    navigate("/dashboard", { state: { openForge: true } });
  };

  useEffect(() => {
    localStorage.setItem("scriptora-sidebar-open", JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    localStorage.setItem("scriptora-guided-flow", guidedFlowEnabled ? "on" : "off");
  }, [guidedFlowEnabled]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ focusSection?: SectionId }>).detail;
      if (detail?.focusSection) setActiveSection(detail.focusSection);
    };
    window.addEventListener("scriptora-generation-blocked", handler);
    return () => window.removeEventListener("scriptora-generation-blocked", handler);
  }, []);

  useEffect(() => {
    if (!engine.project) return;
    const cfg = engine.project.config;
    if (activeSection === "front-matter" && !isFrontMatterEnabled(cfg)) setActiveSection("blueprint");
    if (activeSection === "back-matter" && !isBackMatterEnabled(cfg)) setActiveSection("blueprint");
  }, [engine.project, activeSection]);

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
    RecoveryEngine.snapshotBeforeExport(engine.project);
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

      const openSection = sessionStorage.getItem("scriptora-open-section");
      if (openSection) sessionStorage.removeItem("scriptora-open-section");

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

      const openId = sessionStorage.getItem("scriptora-open-project");
      if (openId) {
        sessionStorage.removeItem("scriptora-open-project");
        const target = loaded.find(p => p.id === openId);
        if (target) {
          fillMissingGenreFromInference(target.config);
          engine.loadProject(target);
          applySection();
          return;
        }
      }

      const newBookJson = sessionStorage.getItem("scriptora-new-book");
      if (newBookJson) {
        sessionStorage.removeItem("scriptora-new-book");
        try {
          const payload = JSON.parse(newBookJson);
          if (payload?.mode === "studio-approved" && payload.config && payload.blueprint) {
            void engine.createProjectWithApprovedBlueprint(payload.config, payload.blueprint, payload.blueprintSource || "ai");
            setActiveSection("blueprint");
          } else if (payload?.mode === "studio-draft" && payload.config) {
            void engine.createProjectDraft(payload.config);
            setActiveSection("blueprint");
          } else if (payload?.config) {
            void engine.startNewBook(payload.config);
            setActiveSection("blueprint");
          } else {
            void engine.startNewBook(payload);
            setActiveSection("blueprint");
          }
          setTimeout(refreshProjects, 500);
          return;
        } catch { /* ignore */ }
      }

      const lastId = getLastProjectId();
      if (lastId) {
        const last = loaded.find(p => p.id === lastId);
        if (last) {
          fillMissingGenreFromInference(last.config);
          engine.loadProject(last);
          applySection();
        }
      }

      if (sessionStorage.getItem("scriptora-open-voice-studio") === "1") {
        sessionStorage.removeItem("scriptora-open-voice-studio");
        setShowVoiceStudio(true);
      }
    };
    init();
  }, []);

  const refreshProjects = async () => setProjects(await loadRemoteProjects());

  const handleSelectProject = (id: string) => {
    const p = projects.find(p => p.id === id);
    if (p) {
      fillMissingGenreFromInference(p.config);
      engine.loadProject(p);
      setActiveSection("blueprint");
      setSidebarOpen(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    const target = projects.find((p) => p.id === id);
    const name = target?.config.title?.trim() || t("this_project");
    if (!window.confirm(tt("confirm_delete_project", { name }))) return;
    await deleteProjectAsync(id);
    const fresh = await loadRemoteProjects();
    setProjects(fresh);
    if (engine.project?.id === id && fresh[0]) {
      fillMissingGenreFromInference(fresh[0].config);
      engine.loadProject(fresh[0]);
      setActiveSection("blueprint");
    }
  };

  const handleExport = async (coverOverride?: string) => {
    if (!engine.project) return;
    let exportProject: BookProject = {
      ...engine.project,
      config: applyAuthorIdentityToConfig({ ...engine.project.config }),
    };
    exportProject = applyScriptoraFreeWatermarkToProject(
      exportProject,
      plan,
      exportProject.config?.language,
    );
    const blockers = getExportBlockers(exportProject);
    if (blockers.length > 0) {
      toast.error(blockers.map((issue) => issue.message).join(" · "));
      return;
    }
    const errors = await validateEpubExport(exportProject);
    if (errors.length > 0) {
      toast.error(t("export_blocked_epub"), { description: errors.join(" · ") });
      return;
    }
    setIsExporting(true);
    setExportLabel(t("exporting_epub"));
    try {
      const blob = await runEpubExport(exportProject, coverOverride ?? coverDataUrl);
      const filename = engine.project.config.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_") || "book";
      await downloadEpubFile(blob, filename);
      toast.success(t("export_saved"), { description: `${filename}.epub` });
    } catch (e) {
      toast.error(e instanceof ExportBlockedError ? t("export_blocked_title") : t("export_failed"), {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setIsExporting(false);
      setExportLabel("");
    }
  };

  const handleExportDocx = async () => {
    if (!engine.project) return;
    let exportProject: BookProject = {
      ...engine.project,
      config: applyAuthorIdentityToConfig({ ...engine.project.config }),
    };
    exportProject = applyScriptoraFreeWatermarkToProject(
      exportProject,
      plan,
      exportProject.config?.language,
    );
    const blockers = getExportBlockers(exportProject);
    if (blockers.length > 0) {
      toast.error(blockers.map((issue) => issue.message).join(" · "));
      return;
    }
    setIsExporting(true);
    setExportLabel(t("preparing_docx"));
    try {
      const blob = await runDocxExport(exportProject);
      const filename = engine.project.config.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_") || "book";
      await downloadDocxFile(blob, filename);
      toast.success(t("export_saved"), { description: `${filename}.docx` });
    } catch (e) {
      toast.error(e instanceof ExportBlockedError ? t("export_blocked_title") : t("export_failed"), {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setIsExporting(false);
      setExportLabel("");
    }
  };

  const handleExportPdf = async () => {
    if (!engine.project) return;
    let exportProject: BookProject = {
      ...engine.project,
      config: applyAuthorIdentityToConfig({ ...engine.project.config }),
    };
    exportProject = applyScriptoraFreeWatermarkToProject(
      exportProject,
      plan,
      exportProject.config?.language,
    );
    const blockers = getExportBlockers(exportProject);
    if (blockers.length > 0) {
      toast.error(blockers.map((issue) => issue.message).join(" · "));
      return;
    }
    setIsExporting(true);
    setExportLabel(t("formatting_pdf"));
    try {
      const blob = await runPdfExport(exportProject);
      const filename = engine.project.config.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_") || "book";
      await downloadPdfFile(blob, filename);
      toast.success(t("export_saved"), { description: `${filename}.pdf` });
    } catch (e) {
      toast.error(e instanceof ExportBlockedError ? t("export_blocked_title") : t("export_failed"), {
        description: e instanceof Error ? e.message : undefined,
      });
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
      <div className="scriptora-ios-screen scriptora-app-surface flex min-h-[100dvh] flex-col overflow-x-hidden">
        <div className="ios-glass-soft flex h-12 shrink-0 items-center justify-between px-4">
          <span className="text-xs text-muted-foreground">{t("focus_mode")}</span>
          <button onClick={() => setFocusMode(false)}
            className="ios-toolbar-button px-3 text-xs text-muted-foreground hover:text-foreground">
            <Minimize2 className="h-3.5 w-3.5" /> {t("exit_focus")}
          </button>
        </div>
        <div className="min-h-0 flex-1 px-3 pb-safe">
          <Suspense fallback={<PanelFallback />}>
          <EditorPanel
            project={engine.project}
            activeSection={activeSection}
            onGenerateNext={engine.generateNext}
            onGenerateFrontMatter={engine.generateFrontMatterSection}
            onGenerateBackMatter={engine.generateBackMatterSection}
            onGenerateChapter={(...args) => engine.generateSingleChapter(...args)}
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
            onRegenerateBlueprint={engine.regenerateBlueprint}
            onCreateSafeBlueprint={engine.createSafeBlueprint}
            onApproveBlueprint={engine.approveBlueprint}
            onGenerateBlueprint={engine.generateBlueprintForProject}
            onUpdateFrontMatterField={engine.updateFrontMatterField}
            onUpdateBackMatterField={engine.updateBackMatterField}
            onNarrateChapter={openVoiceStudioForChapter}
            onPersistChapterEditorialAnalysis={engine.updateChapterEditorialAnalysis}
            onRecoverProject={() => void engine.recoverProject?.()}
            onContinueChapterFromCheckpoint={(index) => void engine.continueChapterFromCheckpoint?.(index)}
            premiumWriter
          />
          </Suspense>
        </div>
        {showVoiceStudio && !isMobileLayout && (
          <Suspense fallback={<VoiceStudioFallback />}>
            <VoiceStudioDialog
              open={showVoiceStudio}
              onClose={closeVoiceStudio}
              projects={voiceProjectList}
              initialProjectId={engine.project?.id}
              initialChapterIndex={voiceStudioChapterIndex}
              autoPlayOnOpen
              onOpenChapterInEditor={(_projectId, chapterIdx) => {
                closeVoiceStudio();
                handleSelectChapter(chapterIdx);
              }}
            />
          </Suspense>
        )}
        {isMobileLayout && showVoiceStudio && (
          <MobileVoiceStudioScreen
            open={showVoiceStudio}
            onClose={closeVoiceStudio}
            projects={voiceProjectList}
            initialProjectId={engine.project?.id}
            initialChapterIndex={voiceStudioChapterIndex}
            autoPlayOnOpen
            onOpenChapterInEditor={(_projectId, chapterIdx) => {
              closeVoiceStudio();
              handleSelectChapter(chapterIdx);
            }}
          />
        )}
        <LazyMollyBrainPanel
          project={engine.project}
          activeSection={activeSection}
          appContext={showVoiceStudio ? "voice" : engine.isAnythingGenerating ? "generating" : "writing"}
          voiceFeedback={showVoiceStudio ? "artificial_pacing" : undefined}
          onApplyChapterContent={(chapterIdx, content, subIdx) => {
            if (subIdx != null) engine.updateSubchapterContent(chapterIdx, subIdx, content);
            else engine.updateChapterContent(chapterIdx, content);
          }}
        />
      </div>
    );
  }

  return (
    <div className="scriptora-ios-screen scriptora-app-surface scriptora-writer-studio relative flex min-h-[100dvh] overflow-x-hidden overflow-y-visible lg:flex-row">
      {/* Floating sidebar toggle — mobile opens fullscreen navigator; desktop toggles sidebar */}
      <button
        onClick={() => {
          if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
            openMobileNavExclusive();
          } else {
            setSidebarOpen(!sidebarOpen);
          }
        }}
        className={`scriptora-writer-menu-btn fixed left-2 top-[calc(env(safe-area-inset-top,0px)+0.5rem)] z-50 flex items-center justify-center rounded-[10px] border border-white/10 bg-background/90 p-0 text-foreground shadow-md backdrop-blur-md lg:hidden ${
          mobileOverlayActive ? "hidden" : ""
        } ${
          guidedFlowEnabled && !!engine.project?.blueprint && !sidebarOpen ? "scriptora-guide-pulse" : ""
        }`}
        title={sidebarOpen ? t("hide_sidebar") : t("show_sidebar")}
      >
        {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {engine.project && (
        <MobileBookNavigator
          open={mobileNavOpen}
          onClose={() => {
            setMobileNavOpen(false);
            if (engine.project?.id) restoreWriterScrollPosition(engine.project.id);
          }}
          project={engine.project}
          activeSection={activeSection}
          generatingSet={engine.generatingSet}
          chunkProgress={engine.chunkProgress}
          onSelectSection={handleSelectSection}
        />
      )}

      {/* Overlay for mobile legacy sidebar — disabled; fullscreen nav replaces it */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 hidden bg-black/[0.55] backdrop-blur-sm lg:block" onClick={() => setSidebarOpen(false)} />
      )}

      {openedFromDashboard && (
        <button
          type="button"
          onClick={() => {
            sessionStorage.removeItem("scriptora-open-from-dashboard");
            window.location.href = "/dashboard";
          }}
          className="fixed right-3 top-3 z-[60] inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-background/80 px-4 py-2 text-sm font-medium text-white shadow-xl backdrop-blur-xl transition-colors hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna Dashboard
        </button>
      )}


      {/* Left Sidebar — Story Navigator */}
      <aside
        className="ios-sidebar scriptora-story-nav hidden lg:flex lg:sticky lg:top-0 lg:z-auto lg:h-[100dvh] lg:w-[min(280px,25%)] lg:min-h-0 lg:shrink-0 lg:flex-col lg:overflow-hidden lg:pb-0"
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
              {engine.project && (
                <BookTypeBadge config={engine.project.config} compact className="mt-1 scale-90 origin-left" />
              )}
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
          onSelectSection={handleSelectSection}
          generatingSet={engine.generatingSet}
          onGenerateChaptersParallel={engine.generateChaptersParallel}
          variant="premium"
        />

        {engine.project && (
          <>
            <div className="mx-3 my-1 border-t border-white/10" />
            <ProgressTracker project={engine.project} />
          </>
        )}

        {/* Bottom actions */}
        {engine.project && (
          <div className="mt-auto space-y-1 border-t border-white/10 p-2 pb-safe">
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

      {/* Main Area + Tools */}
      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col lg:flex-row">
      <div
        className={`scriptora-writer-main flex min-h-[100dvh] min-w-0 flex-1 flex-col overflow-x-clip overflow-y-visible pb-[calc(env(safe-area-inset-bottom)+7.5rem)] transition-all duration-300 md:pb-[calc(env(safe-area-inset-bottom)+1.5rem)] lg:pb-0 ${
          sidebarOpen ? "p-2 md:p-3" : "p-2 md:px-4 md:py-3"
        } ${mobileOverlayActive ? "scriptora-writer-overlay-hidden max-lg:invisible max-lg:pointer-events-none" : ""}`}
      >
        {engine.project && isChapterView && isMobileLayout && (
          <button
            type="button"
            onClick={openMobileNavExclusive}
            className="mb-2 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-white/75 transition-colors hover:bg-white/[0.10] max-lg:ml-11"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Torna all&apos;indice
          </button>
        )}

        {engine.project && (
          <div className="relative sticky top-0 z-30 shrink-0">
            <WriterCleanHeader
              bookTitle={engine.project.config.title || t("untitled")}
              sectionLabel={writerHeaderContext.title}
              progressLabel={writerHeaderContext.progress}
              isGenerating={writerHeaderContext.isGenerating}
              focusMode={focusMode}
              onFocusMode={() => setFocusMode(true)}
              onMenuToggle={() => (isMobileLayout ? openMobileWriterMenu() : setWriterMenuOpen((v) => !v))}
              className="rounded-xl border border-white/[0.08] max-lg:ml-11"
            />
            <WriterOverflowMenu
              open={writerMenuOpen}
              onClose={() => {
                setWriterMenuOpen(false);
                if (isMobileLayout && engine.project?.id) restoreWriterScrollPosition(engine.project.id);
              }}
              fullscreen={isMobileLayout}
              onExport={guardedExportEpub}
              onVoice={() => activeChapterIndex != null && openVoiceStudioForChapter(activeChapterIndex)}
              onSettings={() => (isMobileLayout ? openMobileSettingsExclusive() : setShowSettings(true))}
              onCoach={() => (isMobileLayout ? openMobileCoachExclusive() : setShowCoach(true))}
              onMarket={
                engine.project?.id
                  ? () => {
                      setWriterMenuOpen(false);
                      if (engine.project?.id) {
                        openMobileMarketFromWriter(
                          engine.project.id,
                          window.scrollY,
                          activeSection,
                        );
                        navigate("/mobile-market");
                      }
                    }
                  : undefined
              }
            />
          </div>
        )}

        {engine.project && activeSection !== "blueprint" && (
          <StoryProgressOs
            project={engine.project}
            activeSection={activeSection}
            generatingSet={engine.generatingSet}
            chunkProgress={engine.chunkProgress}
          />
        )}

        {!isChapterView && activeSection !== "blueprint" && (
        <GuidedProjectFlow
          project={engine.project}
          activeSection={activeSection}
          sidebarOpen={sidebarOpen}
          enabled={guidedFlowEnabled}
          onEnabledChange={setGuidedFlowEnabled}
          onOpenSidebar={() => {
            if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
              openMobileNavExclusive();
            } else {
              setSidebarOpen(true);
            }
          }}
          onSelectSection={handleSelectSection}
          syncStatus={syncStatus}
          authorPenName={engine.project?.config.authorName || engine.project?.config.author}
          progressPercent={
            engine.project ? computeProjectProgressPercent(engine.project) : 0
          }
          onCover={() => setShowCover(true)}
          onExport={guardedExportEpub}
        />
        )}

        <div className={cn(
          "scriptora-writer-editor-card flex min-h-[320px] min-w-0 flex-1 flex-col overflow-x-clip max-md:overflow-y-visible md:min-h-0 md:overflow-hidden max-md:rounded-xl max-md:border-x-0 lg:border-0 lg:bg-transparent lg:shadow-none",
          isChapterView && isMobileLayout && "scriptora-single-chapter-view",
        )}>
          {engine.project ? (
            <>
              <div className="min-h-0 min-w-0 flex-1">
                <Suspense fallback={<PanelFallback />}>
                <EditorPanel
                  project={engine.project}
                  activeSection={activeSection}
                  onGenerateNext={engine.generateNext}
                  onGenerateFrontMatter={engine.generateFrontMatterSection}
                  onGenerateBackMatter={engine.generateBackMatterSection}
                  onGenerateChapter={(...args) => engine.generateSingleChapter(...args)}
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
                  onRegenerateBlueprint={engine.regenerateBlueprint}
                  onCreateSafeBlueprint={engine.createSafeBlueprint}
                  onAutoCompleteBlueprintConfig={engine.autoCompleteBlueprintConfig}
                  onApproveBlueprint={engine.approveBlueprint}
                  onGenerateBlueprint={engine.generateBlueprintForProject}
                  onUpdateFrontMatterField={engine.updateFrontMatterField}
                  onUpdateBackMatterField={engine.updateBackMatterField}
                  onNarrateChapter={openVoiceStudioForChapter}
                  onPersistChapterEditorialAnalysis={engine.updateChapterEditorialAnalysis}
                  premiumWriter
                  hideDesktopToolbar={isChapterView}
                  chapterToolRequest={chapterToolRequest}
                  onSelectChapter={handleSelectChapter}
                  onCover={() => setShowCover(true)}
                  onKdp={() => navigate("/kdp-launch")}
                  onRadar={() => navigate("/bestseller-radar")}
                  onKeywordGold={() => navigate("/keyword-gold")}
                  onTitleIntel={() => setShowTitleIntel(true)}
                  onExport={guardedExportEpub}
                  onMarket={() => navigate("/mobile-market")}
                  coverDataUrl={coverDataUrl ?? null}
                  onRecoverProject={() => void engine.recoverProject?.()}
                  onContinueChapterFromCheckpoint={(index) => void engine.continueChapterFromCheckpoint?.(index)}
                />
                </Suspense>
              </div>
              {showCoach && !isMobileLayout && (
                <Suspense fallback={<PanelFallback />}>
                <AICoachPanel project={engine.project} activeSection={activeSection} onClose={() => setShowCoach(false)}
                  onApplyRewrite={(chapterIdx, subIdx, text) => {
                    if (subIdx !== null) engine.updateSubchapterContent(chapterIdx, subIdx, text);
                    else engine.updateChapterContent(chapterIdx, text);
                  }} />
                </Suspense>
              )}
              {showVoiceStudio && !isMobileLayout && (
                <Suspense fallback={<VoiceStudioFallback />}>
                  <VoiceStudioDialog
                    open={showVoiceStudio}
                    onClose={closeVoiceStudio}
                    projects={voiceProjectList}
                    initialProjectId={engine.project?.id}
                    initialChapterIndex={voiceStudioChapterIndex}
                    autoPlayOnOpen
                    onOpenChapterInEditor={(_projectId, chapterIdx) => {
                      closeVoiceStudio();
                      handleSelectChapter(chapterIdx);
                    }}
                  />
                </Suspense>
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

      {engine.project && isChapterView && (
        <WriterToolsPanel
          open={toolsPanelOpen}
          onToggle={() => setToolsPanelOpen((v) => !v)}
          isGenerated={activeChapterGenerated}
          isGenerating={activeChapterIndex != null && engine.isGeneratingSection(`chapter-${activeChapterIndex}`)}
          isEvaluating={activeChapterIndex != null && engine.isGeneratingSection(`eval-${activeChapterIndex}`)}
          onGenerate={activeChapterIndex != null ? () => engine.generateSingleChapter(activeChapterIndex) : undefined}
          onListen={activeChapterIndex != null ? () => openVoiceStudioForChapter(activeChapterIndex) : undefined}
          onAnalysis={() => triggerChapterTool("analysis")}
          onPatch={() => triggerChapterTool("patch")}
          onEvaluate={activeChapterIndex != null ? () => engine.evaluateChapter(activeChapterIndex) : undefined}
          onRegenerate={activeChapterIndex != null ? () => engine.regenerateChapter(activeChapterIndex) : undefined}
          onRewrite={activeChapterIndex != null ? (level: RewriteLevel) => engine.rewriteChapterWithDepth(activeChapterIndex, level) : undefined}
          onAutoRewrite={activeChapterIndex != null ? (threshold: number) => engine.autoRewriteToThreshold(activeChapterIndex, threshold) : undefined}
        />
      )}
      </div>

      {engine.project && isChapterView && !mobileOverlayActive && (
        <MobileWriterBar
          onOpenIndex={openMobileNavExclusive}
          onListen={activeChapterGenerated && activeChapterIndex != null ? () => openVoiceStudioForChapter(activeChapterIndex) : undefined}
          onPatch={activeChapterGenerated ? () => triggerChapterTool("patch") : undefined}
          onAnalysis={activeChapterGenerated ? () => triggerChapterTool("analysis") : undefined}
          onMore={openMobileWriterMenu}
          listenDisabled={!activeChapterGenerated}
          toolsDisabled={!activeChapterGenerated}
        />
      )}

      {isMobileLayout && showVoiceStudio && (
        <MobileVoiceStudioScreen
          open={showVoiceStudio}
          onClose={closeVoiceStudio}
          projects={voiceProjectList}
          initialProjectId={engine.project?.id}
          initialChapterIndex={voiceStudioChapterIndex}
          autoPlayOnOpen
          onOpenChapterInEditor={(_projectId, chapterIdx) => {
            closeVoiceStudio();
            handleSelectChapter(chapterIdx);
          }}
        />
      )}

      {isMobileLayout && showCoach && engine.project && (
        <MobileAICoachScreen
          project={engine.project}
          activeSection={activeSection}
          onClose={closeMobileCoach}
          onApplyRewrite={(chapterIdx, subIdx, text) => {
            if (subIdx !== null) engine.updateSubchapterContent(chapterIdx, subIdx, text);
            else engine.updateChapterContent(chapterIdx, text);
          }}
        />
      )}

      {showCover && engine.project && (
        <Suspense fallback={<VoiceStudioFallback />}>
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
        </Suspense>
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
        <Suspense fallback={<VoiceStudioFallback />}>
        <PublishPanel
          project={engine.project}
          onClose={() => setShowPublish(false)}
          onStartFresh={() => {
            setShowPublish(false);
            navigate("/dashboard", { state: { openForge: true } });
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
        </Suspense>
      )}

      {showTitleIntel && engine.project && (
        <Suspense fallback={<PanelFallback />}>
          <TitleIntelligenceDialog
            open
            onClose={() => setShowTitleIntel(false)}
            initialTitle={engine.project.config.title}
            initialGenre={engine.project.config.genre}
            onSelect={(title, subtitle) => {
              engine.updateConfig("title", title);
              if (subtitle) engine.updateConfig("subtitle", subtitle);
              setShowTitleIntel(false);
              toast.success("Titolo aggiornato");
            }}
          />
        </Suspense>
      )}

      {showSettings && (
      <Suspense fallback={(
        <ScriptoraAliveTransition compact overlay tone="writer" title="Impostazioni scrittura…" />
      )}>
      <SettingsPanel
        open
        variant={isMobileLayout ? "mobile" : "dialog"}
        onClose={() => (isMobileLayout ? closeMobileSettings() : setShowSettings(false))}
        settings={writingSettings}
        onUpdateSettings={handleUpdateSettings}
        onLanguageChange={handleLanguageChange}
      />
      </Suspense>
      )}

      <Suspense fallback={null}>
      <DominationTray
        currentProjectId={engine.project?.id}
        onApplyToChapter={async (projectId, chapterIndex, newContent) => {
          if (engine.project?.id === projectId) {
            engine.updateChapterContent(chapterIndex, newContent);
            toast.success(t("chapter_updated"));
          } else {
            const target = projects.find(p => p.id === projectId);
            if (!target) { toast.error(t("project_not_found")); return; }
            const updated: BookProject = {
              ...target,
              chapters: target.chapters.map((ch, i) =>
                i === chapterIndex ? { ...ch, content: newContent } : ch
              ),
              updatedAt: new Date().toISOString(),
            };
            await saveProjectAsync(updated);
            await refreshProjects();
            toast.success(tt("applied_to_project", { title: target.config.title || t("untitled") }));
          }
        }}
        onJumpToChapter={(projectId, chapterIndex) => {
          if (engine.project?.id !== projectId) {
            const target = projects.find(p => p.id === projectId);
            if (target) engine.loadProject(target);
          }
          handleSelectChapter(chapterIndex);
          setSidebarOpen(false);
        }}
      />
      </Suspense>
      {engine.project && !mobileOverlayActive && (
        <LazyMollyBrainPanel
          project={engine.project}
          activeSection={activeSection}
          appContext={showVoiceStudio ? "voice" : engine.isAnythingGenerating ? "generating" : "writing"}
          voiceFeedback={showVoiceStudio ? "artificial_pacing" : undefined}
          onApplyChapterContent={(chapterIdx, content, subIdx) => {
            if (subIdx != null) engine.updateSubchapterContent(chapterIdx, subIdx, content);
            else engine.updateChapterContent(chapterIdx, content);
          }}
        />
      )}

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
