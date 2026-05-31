import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { NavigationTree } from "@/components/NavigationTree";
import { EditorPanel } from "@/components/EditorPanel";
import { ProjectConfigBlockedDialog } from "@/components/ProjectConfigBlockedDialog";
import { ProgressTracker } from "@/components/ProgressTracker";
import { GuidedProjectFlow } from "@/components/GuidedProjectFlow";
import { GuidedTourTriggerButton } from "@/components/GuidedTourTriggerButton";
import { LazyPanelFallback } from "@/components/LazyPanelFallback";
import { useBookEngine } from "@/hooks/useBookEngine";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { deleteProject as removeProject, getLastProjectId, setLastProjectId } from "@/lib/storage";
import type { ProjectConfigIssue } from "@/lib/project-config-validation";
import type { BookConfig } from "@/types/book";
import { GUIDED_TOUR_IDS } from "@/lib/guided-tour-events";
import { loadProjects as loadRemoteProjects, deleteProjectAsync, saveProjectAsync } from "@/services/storageService";
import { BookProject, SectionId } from "@/types/book";
import { WritingSettings, loadSettings, saveSettings } from "@/lib/settings";
import { t, tt, UILanguage, useUILanguage } from "@/lib/i18n";
import { toast } from "sonner";
import { BookOpen, Plus, Trash2, FolderOpen, Settings, Sparkles, Minimize2, Menu, X, ArrowLeft, ListTree, LogOut } from "lucide-react";
import { AccountIdentityBlock } from "@/components/AccountIdentityBlock";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/useIsMobile";
import { MobileChapterIndexSheet } from "@/components/mobile/MobileChapterIndexSheet";
import { MobileWriterHeader } from "@/components/mobile/MobileWriterHeader";
import { MobileWriterToolsSheet } from "@/components/mobile/MobileWriterToolsSheet";
import { useQuota, usePlan } from "@/lib/plan";
import { UpgradeModal } from "@/components/UpgradeModal";
import { isProjectComplete } from "@/lib/project-status";
import { setProjectCoverDataUrl } from "@/lib/cover-session";
import { useRequirementGate } from "@/hooks/useRequirementGate";
import {
  buildRequirement,
  firstIncompleteChapterIndex,
  summarizeEpubValidationErrors,
  getExportAuthorGap,
  applyActiveAuthorIdentityToProject,
} from "@/lib/scriptora-requirement-gate";
import {
  REQUIREMENT_ACTION_EVENTS,
  parseOpenQuery,
  stripOpenQuery,
} from "@/lib/scriptora-requirement-actions";
import { MissingRequirementCard } from "@/components/MissingRequirementCard";

const NewBookDialog = lazy(() => import("@/components/NewBookDialog").then((m) => ({ default: m.NewBookDialog })));
const CoverGenerator = lazy(() => import("@/components/CoverGenerator").then((m) => ({ default: m.CoverGenerator })));
const CoverBeforeExportDialog = lazy(() =>
  import("@/components/CoverBeforeExportDialog").then((m) => ({ default: m.CoverBeforeExportDialog })),
);
const VoiceStudioDialog = lazy(() => import("@/components/VoiceStudioDialog").then((m) => ({ default: m.VoiceStudioDialog })));
const PublishPanel = lazy(() => import("@/components/PublishPanel").then((m) => ({ default: m.PublishPanel })));
const AuthorIdentityDialog = lazy(() =>
  import("@/components/AuthorIdentityDialog").then((m) => ({ default: m.AuthorIdentityDialog })),
);
const SettingsPanel = lazy(() => import("@/components/SettingsPanel").then((m) => ({ default: m.SettingsPanel })));
const AICoachPanel = lazy(() => import("@/components/AICoachPanel").then((m) => ({ default: m.AICoachPanel })));

type ExportFormat = "epub" | "docx" | "pdf";
const WRITING_ROOM_PROJECT_KEY = "scriptora-writing-room-last-project";
const WRITING_ROOM_SECTION_KEY = "scriptora-writing-room-active-section";
const WRITING_ROOM_MODE_KEY = "scriptora-writing-room-editor-mode";

const Index = () => {
  useUILanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const openQueryConsumedRef = useRef<string | null>(null);
  const { user, signOut } = useAuth();
  const isMobileLayout = useIsMobile();
  const [projects, setProjects] = useState<BookProject[]>([]);
  const [showNewBook, setShowNewBook] = useState(false);
  const [reconfigureMode, setReconfigureMode] = useState(false);
  const [configBlockedIssues, setConfigBlockedIssues] = useState<ProjectConfigIssue[] | null>(null);
  const [configBlockedDraft, setConfigBlockedDraft] = useState<BookConfig | null>(null);
  const [showCover, setShowCover] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const [showVoiceStudio, setShowVoiceStudio] = useState(false);
  const [showAuthorIdentity, setShowAuthorIdentity] = useState(false);
  const [voiceStudioChapterIndex, setVoiceStudioChapterIndex] = useState<number>(0);
  const [focusMode, setFocusMode] = useState(false);
  const [chapterIndexOpen, setChapterIndexOpen] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    const isDesktop =
      typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
    if (!isDesktop) return false;
    const saved = localStorage.getItem("scriptora-sidebar-open");
    if (saved !== null) return JSON.parse(saved) as boolean;
    return true;
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
  const pendingExportProjectRef = useRef<BookProject | null>(null);
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
    onConfigBlocked: ({ issues, config }) => {
      setConfigBlockedIssues(issues);
      if (config) setConfigBlockedDraft(config);
    },
  });
  const { quota } = useQuota(engine.project?.id || null);
  const { plan } = usePlan();
  const { showRequirement, requirementDialog } = useRequirementGate();
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
    const onOpenAuthorIdentity = () => setShowAuthorIdentity(true);
    const onOpenNewBook = () => openNewBookGuarded();
    const onOpenCover = () => setShowCover(true);
    const onOpenPublish = () => setShowPublish(true);
    const onFocusChapter = (event: Event) => {
      const idx = (event as CustomEvent<{ chapterIndex?: number }>).detail?.chapterIndex;
      if (typeof idx === "number" && idx >= 0) {
        setActiveSection(`chapter-${idx}` as SectionId);
      }
    };
    const onFocusBookTitle = () => {
      setActiveSection("blueprint");
      window.setTimeout(() => {
        document.querySelector<HTMLInputElement>("[data-book-title-input]")?.focus();
      }, 120);
    };

    window.addEventListener(REQUIREMENT_ACTION_EVENTS.open_author_identity, onOpenAuthorIdentity);
    window.addEventListener(REQUIREMENT_ACTION_EVENTS.open_new_book, onOpenNewBook);
    window.addEventListener(REQUIREMENT_ACTION_EVENTS.open_cover_studio, onOpenCover);
    window.addEventListener(REQUIREMENT_ACTION_EVENTS.open_kdp_publish, onOpenPublish);
    window.addEventListener(REQUIREMENT_ACTION_EVENTS.focus_chapter, onFocusChapter);
    window.addEventListener(REQUIREMENT_ACTION_EVENTS.focus_book_title, onFocusBookTitle);

    return () => {
      window.removeEventListener(REQUIREMENT_ACTION_EVENTS.open_author_identity, onOpenAuthorIdentity);
      window.removeEventListener(REQUIREMENT_ACTION_EVENTS.open_new_book, onOpenNewBook);
      window.removeEventListener(REQUIREMENT_ACTION_EVENTS.open_cover_studio, onOpenCover);
      window.removeEventListener(REQUIREMENT_ACTION_EVENTS.open_kdp_publish, onOpenPublish);
      window.removeEventListener(REQUIREMENT_ACTION_EVENTS.focus_chapter, onFocusChapter);
      window.removeEventListener(REQUIREMENT_ACTION_EVENTS.focus_book_title, onFocusBookTitle);
    };
  }, [freeBookUsed]);

  useEffect(() => {
    const { open, chapterIndex } = parseOpenQuery(searchParams.toString());
    if (!open) return;
    const token = `${open}:${chapterIndex ?? ""}`;
    if (openQueryConsumedRef.current === token) return;
    openQueryConsumedRef.current = token;

    switch (open) {
      case "author-identity":
        setShowAuthorIdentity(true);
        break;
      case "book-title":
        setActiveSection("blueprint");
        window.setTimeout(() => {
          document.querySelector<HTMLInputElement>("[data-book-title-input]")?.focus();
        }, 120);
        break;
      case "chapter":
        if (chapterIndex != null && chapterIndex >= 0) {
          setActiveSection(`chapter-${chapterIndex}` as SectionId);
        }
        break;
      case "publish":
        setShowPublish(true);
        break;
      default:
        break;
    }

    const nextSearch = stripOpenQuery(searchParams.toString());
    setSearchParams(nextSearch ? nextSearch.replace(/^\?/, "") : "", { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    if (isDesktop) {
      localStorage.setItem("scriptora-sidebar-open", JSON.stringify(sidebarOpen));
    }
  }, [sidebarOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const syncSidebarForViewport = () => {
      if (mq.matches) {
        setSidebarOpen(false);
        setChapterIndexOpen(false);
        setToolsMenuOpen(false);
      }
    };
    syncSidebarForViewport();
    mq.addEventListener("change", syncSidebarForViewport);
    return () => mq.removeEventListener("change", syncSidebarForViewport);
  }, []);

  const indexOverlayOpen =
    showNewBook ||
    reconfigureMode ||
    showCover ||
    showPublish ||
    showSettings ||
    showVoiceStudio ||
    showAuthorIdentity ||
    coverGateOpen ||
    chapterIndexOpen ||
    toolsMenuOpen ||
    (sidebarOpen && !isMobileLayout) ||
    !!upgradeReason ||
    !!configBlockedIssues?.length;

  const openChapterIndex = () => {
    if (isMobileLayout) setChapterIndexOpen(true);
    else setSidebarOpen(true);
  };

  useEffect(() => {
    if (isMobileLayout && indexOverlayOpen) {
      document.body.classList.add("scriptora-mobile-overlay-open");
    } else {
      document.body.classList.remove("scriptora-mobile-overlay-open");
    }
    return () => {
      document.body.classList.remove("scriptora-mobile-overlay-open");
    };
  }, [indexOverlayOpen, isMobileLayout]);

  const effectiveProject = engine.project || recoveredProject;
  const nextVoiceProjectList = effectiveProject
    ? [effectiveProject, ...projects.filter((p) => p.id !== effectiveProject.id)]
    : projects;

  const prevBlueprintForMobileRef = useRef(effectiveProject?.blueprint ?? null);
  useEffect(() => {
    prevBlueprintForMobileRef.current = effectiveProject?.blueprint ?? null;
  }, [effectiveProject?.id]);

  useEffect(() => {
    if (!effectiveProject || !isMobileLayout) return;
    const wasMissing = !prevBlueprintForMobileRef.current;
    prevBlueprintForMobileRef.current = effectiveProject.blueprint;
    if (wasMissing && effectiveProject.blueprint && activeSection === "blueprint") {
      setChapterIndexOpen(true);
    }
  }, [effectiveProject?.blueprint, effectiveProject?.id, activeSection, isMobileLayout]);

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
  const runExport = (format: ExportFormat, coverOverride?: string, projectOverride?: BookProject) => {
    const project = projectOverride ?? pendingExportProjectRef.current ?? effectiveProject ?? undefined;
    if (format === "epub") void handleExport(coverOverride, project);
    if (format === "docx") void handleExportDocx(project);
    if (format === "pdf") void handleExportPdf(project);
  };

  const continueExportFlow = (format: ExportFormat, project: BookProject) => {
    pendingExportProjectRef.current = project;
    if (!coverDataUrl) {
      setPendingExportFormat(format);
      setCoverGateOpen(true);
      return;
    }
    runExport(format, undefined, project);
  };

  const promptAuthorIdentityIfNeeded = (
    project: BookProject,
    format: ExportFormat,
  ) => {
    const gap = getExportAuthorGap(project);
    if (!gap.needsIdentityPrompt) {
      continueExportFlow(format, project);
      return;
    }
    showRequirement("missing_author_identity", {
      vars: { name: gap.activePenName },
      onSecondary: () => continueExportFlow(format, applyActiveAuthorIdentityToProject(project)),
    });
  };

  const requestExport = (format: ExportFormat) => {
    if (!quota?.canExport) {
      setUpgradeReason("export");
      return;
    }
    if (!effectiveProject) {
      showRequirement("missing_project");
      return;
    }
    if (!isProjectComplete(effectiveProject)) {
      const chapterIdx = firstIncompleteChapterIndex(effectiveProject);
      showRequirement("incomplete_book", {
        onPrimary: () => setActiveSection(`chapter-${chapterIdx}` as SectionId),
      });
      return;
    }
    promptAuthorIdentityIfNeeded(effectiveProject, format);
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
    await removeProject(id);
    if (getLastProjectId() === id) setLastProjectId("");
    refreshProjects();
  };

  const handleConfigBlockedReconfigure = () => {
    const draft = configBlockedDraft ?? effectiveProject?.config;
    if (!draft) {
      setConfigBlockedIssues(null);
      return;
    }
    setConfigBlockedIssues(null);
    setReconfigureMode(true);
    setShowNewBook(true);
  };

  const handleConfigBlockedDelete = async () => {
    const id = effectiveProject?.id;
    if (!id) {
      setConfigBlockedIssues(null);
      return;
    }
    const name = effectiveProject.config.title?.trim() || t("this_draft");
    if (!window.confirm(tt("confirm_delete_draft", { name }))) return;

    await handleDeleteProject(id);
    engine.clearProject();
    setRecoveredProject(null);
    sessionStorage.removeItem(WRITING_ROOM_PROJECT_KEY);
    setConfigBlockedIssues(null);
    setConfigBlockedDraft(null);
    setReconfigureMode(false);
    setShowNewBook(false);
  };

  const handleExport = async (coverOverride?: string, projectOverride?: BookProject) => {
    const project = projectOverride ?? effectiveProject;
    if (!project) {
      showRequirement("missing_project");
      return;
    }
    const { generateEpub, downloadEpub, validateEpubStructure } = await import("@/lib/epub");
    const errors = validateEpubStructure(project);
    if (errors.length > 0) {
      showRequirement("epub_not_ready", {
        detail: summarizeEpubValidationErrors(errors),
        onPrimary: () => {
          const chapterIdx = firstIncompleteChapterIndex(project);
          setActiveSection(`chapter-${chapterIdx}` as SectionId);
        },
      });
      return;
    }
    setIsExporting(true);
    setExportLabel(t("exporting_epub"));
    try {
      const blob = await generateEpub(project, coverOverride ?? coverDataUrl);
      const filename = project.config.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_") || "book";
      downloadEpub(blob, filename);
      toast.success(t("export_success_epub"));
    } catch (e) {
      console.error("EPUB export failed:", e);
      showRequirement("export_failed");
    } finally {
      setIsExporting(false);
      setExportLabel("");
    }
  };

  const handleExportDocx = async (projectOverride?: BookProject) => {
    const project = projectOverride ?? effectiveProject;
    if (!project) return;
    setIsExporting(true);
    setExportLabel(t("preparing_docx"));
    try {
      const { generateDocx, downloadDocx } = await import("@/lib/docx-export");
      const blob = await generateDocx(project);
      const filename = project.config.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_") || "book";
      downloadDocx(blob, filename);
      toast.success(t("export_success_docx"));
    } catch (e) {
      console.error("DOCX export failed:", e);
      showRequirement("export_failed");
    } finally {
      setIsExporting(false);
      setExportLabel("");
    }
  };

  const handleExportPdf = async (projectOverride?: BookProject) => {
    const project = projectOverride ?? effectiveProject;
    if (!project) return;
    setIsExporting(true);
    setExportLabel(t("formatting_pdf"));
    try {
      const { generatePdf, downloadPdf } = await import("@/lib/pdf-export");
      const blob = await generatePdf(project);
      const filename = project.config.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_") || "book";
      downloadPdf(blob, filename);
      toast.success(t("export_success_pdf"));
    } catch (e) {
      console.error("PDF export failed:", e);
      showRequirement("export_failed");
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

  const reconfigureInitialConfig = reconfigureMode
    ? (configBlockedDraft ?? effectiveProject?.config ?? null)
    : null;

  const writingRoomOverlays = (
    <>
      {(showNewBook || reconfigureMode) && (
        <Suspense fallback={<LazyPanelFallback />}>
          <NewBookDialog
            open={showNewBook}
            onClose={() => {
              setShowNewBook(false);
              setReconfigureMode(false);
              setConfigBlockedDraft(null);
            }}
            initialConfig={reconfigureInitialConfig}
            reconfigureMode={reconfigureMode}
            onSubmit={(config) => {
              if (reconfigureMode) {
                engine.applyProjectConfig(config);
                setShowNewBook(false);
                setReconfigureMode(false);
                setConfigBlockedIssues(null);
                setConfigBlockedDraft(null);
                setTimeout(refreshProjects, 500);
                return;
              }
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
        </Suspense>
      )}

      {showAuthorIdentity && (
        <Suspense fallback={<LazyPanelFallback />}>
          <AuthorIdentityDialog open={showAuthorIdentity} onClose={() => setShowAuthorIdentity(false)} />
        </Suspense>
      )}

      <ProjectConfigBlockedDialog
        open={!!configBlockedIssues?.length}
        issues={configBlockedIssues || []}
        projectTitle={effectiveProject?.config.title || configBlockedDraft?.title}
        onReconfigure={handleConfigBlockedReconfigure}
        onDeleteProject={handleConfigBlockedDelete}
        onClose={() => {
          setConfigBlockedIssues(null);
          setConfigBlockedDraft(null);
        }}
      />

      <UpgradeModal
        open={!!upgradeReason}
        reason={upgradeReason || "export"}
        currentPlan={quota?.plan || "free"}
        onClose={() => setUpgradeReason(null)}
      />
      {requirementDialog}
    </>
  );

  if (focusMode && effectiveProject) {
    return (
      <>
      <div className="scriptora-ios-screen scriptora-immersive-editor scriptora-os-editor scriptora-focus-active flex h-safe-screen min-h-[100dvh] flex-col pb-safe">
        <div className="ios-glass-soft flex h-12 shrink-0 items-center justify-between px-4 pt-safe">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t("focus_mode")}</span>
            <GuidedTourTriggerButton tourId={GUIDED_TOUR_IDS.writer} compact />
          </div>
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
            onGenerateBlueprint={engine.generateBlueprintSection}
            onGenerateFullBook={guardedGenerateFullBook}
            isAnythingGenerating={engine.isAnythingGenerating}
            onNavigateSection={setActiveSection}
            isMobileWriter={isMobileLayout}
          />
        </div>
      </div>
      {writingRoomOverlays}
      </>
    );
  }

  return (
    <div className={`scriptora-ios-screen scriptora-immersive-editor scriptora-os-editor relative flex h-safe-screen min-h-[100dvh] max-w-full overflow-x-hidden overflow-hidden pb-safe${focusMode ? " scriptora-focus-active" : ""}${isMobileLayout && effectiveProject ? " scriptora-mobile-writer" : ""}`}>
      {effectiveProject && isMobileLayout && (
        <MobileWriterHeader
          project={effectiveProject}
          activeSection={activeSection}
          onOpenChapterIndex={openChapterIndex}
          onOpenMenu={() => setToolsMenuOpen(true)}
        />
      )}

      {/* Desktop: sidebar always visible via layout-desktop:translate-x-0 */}

      {/* Overlay for desktop sidebar collapse (tablet) */}
      {sidebarOpen && !isMobileLayout && (
        <div className="fixed inset-0 z-30 hidden bg-black/60 backdrop-blur-sm layout-desktop:block" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      {/* Left Sidebar — desktop only; mobile uses fullscreen chapter sheet */}
      <aside
        className={`ios-sidebar hidden layout-desktop:flex fixed inset-y-0 left-0 z-40 h-safe-screen w-[min(100vw-2rem,288px)] max-w-[288px] shrink-0 flex-col pb-safe transition-transform duration-300 ease-out layout-desktop:relative layout-desktop:inset-auto layout-desktop:h-auto layout-desktop:max-w-none layout-desktop:w-[288px] layout-desktop:translate-x-0 layout-desktop:pointer-events-auto ${
          sidebarOpen
            ? "translate-x-0 pointer-events-auto"
            : "-translate-x-full pointer-events-none"
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
              aria-label={t("close_chapter_navigation")}
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

        {user && (
          <div className={`${effectiveProject ? "" : "mt-auto"} space-y-2 border-t border-white/10 p-2`}>
            <div className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2">
              <AccountIdentityBlock user={user} size="sm" />
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  await signOut();
                  toast.success(t("toast_signed_out"));
                } catch { /* noop */ }
                navigate("/auth");
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              {t("sign_out")}
            </button>
          </div>
        )}
      </aside>

      {/* Main Area */}
      <div
        className={`flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col transition-all duration-300 ${
          isMobileLayout && effectiveProject
            ? "p-0"
            : sidebarOpen ? "p-2 layout-desktop:p-3" : "p-2 pb-3 layout-desktop:px-6 layout-desktop:py-4"
        }`}
      >
        <div className={`flex min-h-0 min-w-0 flex-1 overflow-hidden overflow-x-hidden ${
          isMobileLayout && effectiveProject
            ? "bg-slate-950"
            : "rounded-lg border border-white/10 bg-slate-950/95 shadow-2xl shadow-black/20 layout-desktop:bg-slate-950/45 layout-desktop:backdrop-blur-xl"
        }`}>
          {effectiveProject ? (
            <>
              {effectiveProject && (
                <GuidedProjectFlow
                  projectId={effectiveProject.id}
                  sidebarOpen={sidebarOpen || chapterIndexOpen}
                  onOpenSidebar={openChapterIndex}
                  onSelectSection={setActiveSection}
                />
              )}
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <div className="min-h-0 flex-1 overflow-hidden">
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
                  onNavigateSection={(section) => {
                    setActiveSection(section);
                    if (isMobileLayout) {
                      setChapterIndexOpen(false);
                    } else if (typeof window !== "undefined" && window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                  onOpenChapterIndex={openChapterIndex}
                  onGenerateBlueprint={engine.generateBlueprintSection}
                  onGenerateFullBook={guardedGenerateFullBook}
                  isAnythingGenerating={engine.isAnythingGenerating}
                  isMobileWriter={isMobileLayout}
                />
                </div>
              </div>
              {showCoach && (
                <Suspense fallback={<LazyPanelFallback />}>
                  <AICoachPanel project={effectiveProject} activeSection={activeSection} onClose={() => setShowCoach(false)}
                    onApplyRewrite={(chapterIdx, subIdx, text) => {
                      if (subIdx !== null) engine.updateSubchapterContent(chapterIdx, subIdx, text);
                      else engine.updateChapterContent(chapterIdx, text);
                    }} />
                </Suspense>
              )}
              {showVoiceStudio && (
                <Suspense fallback={<LazyPanelFallback />}>
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
                </Suspense>
              )}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center px-4 py-6">
              <div className="ios-panel w-full max-w-md space-y-4 p-4 sm:p-6">
                <MissingRequirementCard
                  payload={buildRequirement("missing_project")}
                  onPrimary={openNewBookGuarded}
                  onSecondary={() => navigate("/dashboard")}
                />
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

      {writingRoomOverlays}

      {effectiveProject && isMobileLayout && (
        <>
          <MobileChapterIndexSheet
            open={chapterIndexOpen}
            onOpenChange={setChapterIndexOpen}
            project={effectiveProject}
            activeSection={activeSection}
            onSelectSection={setActiveSection}
            generatingSet={engine.generatingSet}
            onGenerateChaptersParallel={engine.generateChaptersParallel}
          />
          <MobileWriterToolsSheet
            open={toolsMenuOpen}
            onOpenChange={setToolsMenuOpen}
            onSettings={() => setShowSettings(true)}
            onFocusMode={() => setFocusMode(true)}
            onCoach={() => setShowCoach(true)}
            onGenerateFullBook={guardedGenerateFullBook}
            canGenerateFullBook={Boolean(effectiveProject.blueprint && effectiveProject.phase !== "complete")}
            isGenerating={engine.isAnythingGenerating}
          />
        </>
      )}

      {showCover && effectiveProject && (
        <Suspense fallback={<LazyPanelFallback />}>
          <CoverGenerator
            title={effectiveProject.config.title}
            subtitle={effectiveProject.config.subtitle}
            authorName={effectiveProject.config.authorName || effectiveProject.config.author || effectiveProject.config.writerName}
            description={effectiveProject.blueprint?.overview || effectiveProject.config.subtitle}
            authorBio={effectiveProject.frontMatter?.aboutAuthor || effectiveProject.config.authorIdentity?.biography}
            projectGenre={effectiveProject.config.genre}
            onGenerate={(dataUrl) => {
              if (effectiveProject?.id) {
                setProjectCoverDataUrl(effectiveProject.id, dataUrl);
              }
              setCoverDataUrl(dataUrl);
              toast.success(t("cover_saved_toast"));
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

      {(coverGateOpen && !!pendingExportFormat) && (
        <Suspense fallback={<LazyPanelFallback />}>
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
        </Suspense>
      )}

      {showPublish && (
        <Suspense fallback={<LazyPanelFallback />}>
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
            onGenerateFullBook={guardedGenerateFullBook}
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
        </Suspense>
      )}

      {showSettings && (
        <Suspense fallback={<LazyPanelFallback />}>
          <SettingsPanel
            open={showSettings}
            onClose={() => setShowSettings(false)}
            settings={writingSettings}
            onUpdateSettings={handleUpdateSettings}
            onLanguageChange={handleLanguageChange}
          />
        </Suspense>
      )}
    </div>
  );
};

export default Index;
