import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { loadProjects, deleteProjectAsync, getLastProjectId, getCurrentUserId, setLastProjectId } from "@/services/storageService";
import { isProjectComplete } from "@/lib/project-status";
import { DashboardGuidedFlow } from "@/components/DashboardGuidedFlow";
import { FocusMusicControl } from "@/components/FocusMusicControl";
import { GuidedTourTriggerButton } from "@/components/GuidedTourTriggerButton";
import { LazyPanelFallback } from "@/components/LazyPanelFallback";
import { InProgressSection } from "@/components/Home/InProgressSection";
import { LibrarySection } from "@/components/Home/LibrarySection";
import { PaywallGuard } from "@/components/PaywallGuard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BookOpen, Plus, FolderOpen, Trash2, Rocket, Zap,
  FileDown, ArrowRight, Clock, Globe, Flame, Loader2, Sparkles, Wand2,
  Library, Home as HomeIcon, X, BarChart3,
  TrendingUp, LogOut, CreditCard, Download as DownloadIcon, Settings, Users,
  CheckCircle2, NotebookPen, Fingerprint, ImagePlus, AudioLines,
} from "lucide-react";
import { BOOK_LENGTH_CONFIG, BookConfig, BookLength, BookProject, DEFAULT_SUBCHAPTERS_PER_CHAPTER } from "@/types/book";
import { t, tt, getUILanguage, setUILanguage, UI_LANGUAGES, UILanguage, useUILanguage } from "@/lib/i18n";
import { AUTHOR_IDENTITY_CHANGED_EVENT, applyAuthorIdentityToConfig, enforceAuthorIdentityLock, getSelectedAuthorIdentity, loadAuthorIdentities, setSelectedAuthorIdentityId } from "@/lib/author-identity";
import { refineDetectedGenre } from "@/lib/book-intelligence";
import { GUIDED_TOUR_IDS } from "@/lib/guided-tour-events";
import { DevModeUnlockDialog } from "@/components/DevModeUnlockDialog";
import { canUseDevTools } from "@/lib/app-environment";
import { enableDevMode, isDevMode, exitDevMode, useDevMode } from "@/lib/dev-mode";
import { BetaActivationDialog } from "@/components/BetaActivationDialog";
import { usePlan } from "@/lib/plan";
import { canUseFeature, type FeatureKey } from "@/lib/subscription";
import { FlaskConical } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIntelligentPreload } from "@/hooks/useIntelligentPreload";
import { useIsMobile } from "@/hooks/useIsMobile";
import { DeviceViewToolbarControl } from "@/components/DeviceViewToggle";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AccountIdentityBlock } from "@/components/AccountIdentityBlock";
import { GoogleLogoMark } from "@/components/GoogleLogoMark";
import { WriterCommandBridge } from "@/components/immersive/WriterCommandBridge";
import { getAuthProfile } from "@/lib/auth-profile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const VoiceStudioDialog = lazy(() => import("@/components/VoiceStudioDialog").then(m => ({ default: m.VoiceStudioDialog })));
const HomeExportDialog = lazy(() => import("@/components/HomeExportDialog").then(m => ({ default: m.HomeExportDialog })));
const TitleIntelligenceDialog = lazy(() => import("@/components/TitleIntelligenceDialog").then(m => ({ default: m.TitleIntelligenceDialog })));
const CoverGenerator = lazy(() => import("@/components/CoverGenerator").then(m => ({ default: m.CoverGenerator })));
const CharacterStudioDialog = lazy(() => import("@/components/CharacterStudioDialog").then(m => ({ default: m.CharacterStudioDialog })));
const ManuscriptAnalyzerDialog = lazy(() => import("@/components/ManuscriptAnalyzerDialog").then(m => ({ default: m.ManuscriptAnalyzerDialog })));
const NotepadDialog = lazy(() => import("@/components/NotepadDialog").then(m => ({ default: m.NotepadDialog })));
const AuthorIdentityDialog = lazy(() => import("@/components/AuthorIdentityDialog").then(m => ({ default: m.AuthorIdentityDialog })));
const NewBookDialog = lazy(() => import("@/components/NewBookDialog").then(m => ({ default: m.NewBookDialog })));
const AdvancedAppearanceDialog = lazy(() => import("@/components/AdvancedAppearanceDialog").then(m => ({ default: m.AdvancedAppearanceDialog })));

const SCRIPTORA_CHARACTER_BIBLE_KEY = "scriptora-character-bible-v1";
const SCRIPTORA_CHARACTER_PROJECT_KEY = "scriptora-character-project-v1";
const DASHBOARD_METRICS_VISIBLE_KEY = "scriptora-dashboard-metrics-visible-v1";

function readDashboardMetricsVisible(): boolean {
  try {
    return localStorage.getItem(DASHBOARD_METRICS_VISIBLE_KEY) === "true";
  } catch {
    return false;
  }
}

function saveDashboardMetricsVisible(visible: boolean) {
  try {
    localStorage.setItem(DASHBOARD_METRICS_VISIBLE_KEY, String(visible));
  } catch {
    /* ignore */
  }
}


import { LaunchBookModal, type LaunchMode } from "@/components/LaunchBookModal";
import { type DetectedIntent } from "@/components/QuickLaunchPanel";

function isNarrativeGenreForCharacters(genre?: string): boolean {
  const g = String(genre || "").toLowerCase();
  return ["romance", "dark-romance", "thriller", "fantasy", "fiction", "memoir", "historical", "horror", "sci-fi"].some(x => g.includes(x));
}


function getPendingCharacterProject(): any | null {
  try {
    const raw =
      sessionStorage.getItem(SCRIPTORA_CHARACTER_PROJECT_KEY) ||
      localStorage.getItem(SCRIPTORA_CHARACTER_PROJECT_KEY);

    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.characterBible && !parsed?.idea) return null;
    return parsed;
  } catch {
    return null;
  }
}

function charactersFromBibleText(text?: string): any[] {
  const raw = String(text || "").trim();
  if (!raw) return [];

  return raw
    .split(/\n{2,}(?=Nome:|Name:)|^\s*[-•]\s*/gm)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
      const get = (label: string) => {
        const found = lines.find(l => l.toLowerCase().startsWith(label.toLowerCase()));
        return found ? found.replace(new RegExp("^" + label + "\\s*", "i"), "").trim() : "";
      };

      const nameLine = get("Nome:") || get("Name:") || lines[0] || "";
      const surname = get("Cognome:") || get("Surname:");

      return {
        name: nameLine || "Personaggio",
        surname,
        age: get("Età:") || get("Age:"),
        role: get("Ruolo nella storia:") || get("Role:"),
        physicalDescription: get("Aspetto fisico:") || get("Physical description:"),
        personality: get("Carattere:") || get("Personality:") || block,
        wound: get("Ferita interiore:") || get("Core wound:"),
        externalDesire: get("Desiderio esterno:") || get("External desire:"),
        internalNeed: get("Bisogno interiore:") || get("Internal need:"),
        secret: get("Segreto:") || get("Secret:"),
        relationships: get("Rapporto con gli altri personaggi:") || get("Relationship to other characters:"),
        strictRules: get("Regole di continuità:") || "Never rename this character. Preserve role, wound, desire, relationships and continuity."
      };
    })
    .filter(c => String(c.name || "").trim());
}

export default function Home() {
  const navigate = useNavigate();
  const devOn = useDevMode();
  const [showNewBook, setShowNewBook] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showTitleIntel, setShowTitleIntel] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showCharacterStudio, setShowCharacterStudio] = useState(false);
  const [showCoverStudio, setShowCoverStudio] = useState(false);
  const [showManuscriptAnalyzer, setShowManuscriptAnalyzer] = useState(false);
  const [showNotepad, setShowNotepad] = useState(false);
  const [showAuthorIdentity, setShowAuthorIdentity] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showVoiceStudio, setShowVoiceStudio] = useState(false);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [launchMode, setLaunchMode] = useState<LaunchMode>("quick");
  const [showWorkspaceMetrics, setShowWorkspaceMetrics] = useState(readDashboardMetricsVisible);
  const [projects, setProjects] = useState<BookProject[]>([]);
  const [projectsReady, setProjectsReady] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const currentLang = useUILanguage();
  const isMobileLayout = useIsMobile();

  const [activeRun, setActiveRun] = useState<{ runId: string; title: string; startedAt: number } | null>(null);

  // One-click idea state
  const [idea, setIdea] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [intent, setIntent] = useState<DetectedIntent | null>(null);
  const [launching, setLaunching] = useState(false);
  const [showDevUnlock, setShowDevUnlock] = useState(false);
  const [showBetaDialog, setShowBetaDialog] = useState(false);
  const { plan: currentPlan } = usePlan();
  const [logoClicks, setLogoClicks] = useState<number[]>([]);
  const { user, signOut } = useAuth();
  const authProfile = getAuthProfile(user);
  const [bookLang, setBookLang] = useState<string>(() => {
    const ui = getUILanguage();
    return ({ en: "English", it: "Italian", es: "Spanish", fr: "French", de: "German" } as Record<string, string>)[ui] || "English";
  });
  const [titleLang, setTitleLang] = useState<string>("English");
  const [briefTitle, setBriefTitle] = useState("");
  const [briefSubtitle, setBriefSubtitle] = useState("");
  const [bookLength, setBookLength] = useState<BookLength>("medium");
  const [customTotalWords, setCustomTotalWords] = useState(30000);
  const [oneClickChapters, setOneClickChapters] = useState(10);
  const [oneClickSubchaptersEnabled, setOneClickSubchaptersEnabled] = useState(false);
  const [oneClickSubchaptersPerChapter, setOneClickSubchaptersPerChapter] = useState(DEFAULT_SUBCHAPTERS_PER_CHAPTER);
  const [authorIdentities, setAuthorIdentities] = useState(() => loadAuthorIdentities());
  const [activeAuthor, setActiveAuthor] = useState(() => getSelectedAuthorIdentity());

  const toggleWorkspaceMetrics = useCallback(() => {
    setShowWorkspaceMetrics((value) => {
      const next = !value;
      saveDashboardMetricsVisible(next);
      return next;
    });
  }, []);

  const closeDashboardDialogs = useCallback(() => {
    setShowNewBook(false);
    setShowExport(false);
    setShowTitleIntel(false);
    setShowAdvancedSettings(false);
    setShowCharacterStudio(false);
    setShowCoverStudio(false);
    setShowManuscriptAnalyzer(false);
    setShowNotepad(false);
    setShowAuthorIdentity(false);
    setShowLibrary(false);
    setShowVoiceStudio(false);
    setShowLaunchModal(false);
    setShowBetaDialog(false);
    setShowDevUnlock(false);
  }, []);

  const closeAllDashboardOverlays = useCallback(() => {
    closeDashboardDialogs();
    setShowLangMenu(false);
  }, [closeDashboardDialogs]);

  const openDashboardOverlay = useCallback((opener: () => void) => {
    closeAllDashboardOverlays();
    opener();
  }, [closeAllDashboardOverlays]);

  const dashboardOverlayOpen =
    showNewBook ||
    showExport ||
    showTitleIntel ||
    showAdvancedSettings ||
    showCharacterStudio ||
    showCoverStudio ||
    showManuscriptAnalyzer ||
    showNotepad ||
    showAuthorIdentity ||
    showLibrary ||
    showVoiceStudio ||
    showLaunchModal ||
    showBetaDialog ||
    showDevUnlock;

  useEffect(() => {
    const syncBodyLock = () => {
      if (isMobileLayout && dashboardOverlayOpen) {
        document.body.classList.add("scriptora-mobile-overlay-open");
      } else {
        document.body.classList.remove("scriptora-mobile-overlay-open");
      }
    };
    syncBodyLock();
    return () => {
      document.body.classList.remove("scriptora-mobile-overlay-open");
    };
  }, [dashboardOverlayOpen, isMobileLayout]);

  const BOOK_LANGUAGES = [
    { value: "English", label: "🇬🇧 English" },
    { value: "Italian", label: "🇮🇹 Italiano" },
    { value: "Spanish", label: "🇪🇸 Español" },
    { value: "French", label: "🇫🇷 Français" },
    { value: "German", label: "🇩🇪 Deutsch" },
  ];

  useEffect(() => {
    // Optimistic load: shows local projects immediately, refreshes from server
    // in the background. Eliminates the visible "frozen" gap on first paint.
    loadProjects((fresh) => setProjects(fresh)).then((fresh) => {
      setProjects(fresh);
      setProjectsReady(true);
    });
    try {
      const raw = sessionStorage.getItem("nexora-active-run");
      if (raw) setActiveRun(JSON.parse(raw));
    } catch { /* noop */ }

    // Re-load when DEV MODE is toggled — projects are scoped per environment.
    const onDevChange = () => {
      setProjects([]);
      setProjectsReady(false);
      setActiveRun(null);
      loadProjects((fresh) => setProjects(fresh)).then((fresh) => {
        setProjects(fresh);
        setProjectsReady(true);
      });
    };
    window.addEventListener("nexora-dev-mode-change", onDevChange);
    return () => window.removeEventListener("nexora-dev-mode-change", onDevChange);
  }, []);

  useEffect(() => {
    const refreshAuthors = () => {
      setAuthorIdentities(loadAuthorIdentities());
      setActiveAuthor(getSelectedAuthorIdentity());
    };
    window.addEventListener(AUTHOR_IDENTITY_CHANGED_EVENT, refreshAuthors);
    window.addEventListener("storage", refreshAuthors);
    return () => {
      window.removeEventListener(AUTHOR_IDENTITY_CHANGED_EVENT, refreshAuthors);
      window.removeEventListener("storage", refreshAuthors);
    };
  }, []);

  // Reset intent if user edits the idea after detection
  useEffect(() => {
    if (intent) setIntent(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea]);

  const freeBookUsed = currentPlan === "free" && projects.length > 0;

  useEffect(() => {
    if (currentPlan === "free" && bookLength !== "short") {
      setBookLength("short");
    }
  }, [bookLength, currentPlan]);

  const openNewBookGuarded = () => {
    if (freeBookUsed) {
      toast.error(t("toast_free_book_used"));
      navigate("/pricing");
      return;
    }
    openDashboardOverlay(() => setShowNewBook(true));
  };

  const openLaunchModal = (mode: LaunchMode = "quick") => {
    if (mode === "manual" && freeBookUsed) {
      toast.error(t("toast_free_book_used"));
      navigate("/pricing");
      return;
    }
    openDashboardOverlay(() => {
      setLaunchMode(mode);
      setShowLaunchModal(true);
    });
  };

  const closeLaunchModal = () => {
    if (launching || detecting) return;
    setShowLaunchModal(false);
  };

  const guardPlanFeature = (feature: FeatureKey, action: () => void) => () => {
    if (!canUseFeature(currentPlan, feature)) {
      toast.error(t("unlock_pro"));
      navigate("/pricing");
      return;
    }
    openDashboardOverlay(action);
  };

  const lastId = getLastProjectId();
  // Only surface "continue last" when the project still belongs to the active
  // environment (DEV vs USER). Cross-scope ids are silently ignored.
  const lastProject = lastId ? projects.find(p => p.id === lastId) : null;
  const activeWritingId = lastProject && !isProjectComplete(lastProject) ? lastProject.id : null;
  const activeWritingProject = activeWritingId ? lastProject : null;

  const deleteHomeProject = async (projectId: string, title?: string) => {
    const name = title || t("this_project");
    const ok = window.confirm(tt("confirm_delete_project", { name }));
    if (!ok) return;

    await deleteProjectAsync(projectId);
    setProjects((items) => items.filter((p) => p.id !== projectId));
    try {
      if (getLastProjectId() === projectId) setLastProjectId("");
      sessionStorage.removeItem("nexora-open-project");
    } catch {
      toast.error(t("delete_project_failed"));
    }
    window.dispatchEvent(new Event("nexora-projects-change"));
  };

  const changeLang = (lang: UILanguage) => {
    setUILanguage(lang);
    setShowLangMenu(false);
  };

  const changeAuthorIdentity = (id: string) => {
    const identity = authorIdentities.find((item) => item.id === id);
    if (!identity) return;
    setSelectedAuthorIdentityId(identity.id);
    setActiveAuthor(identity);
    toast.success(tt("author_identity_selected", { name: identity.penName }));
  };

  const goApp = (opts?: { section?: string; projectId?: string; mode?: "rewrite" }) => {
    closeAllDashboardOverlays();
    if (opts?.projectId) sessionStorage.setItem("nexora-open-project", opts.projectId);
    if (opts?.section) sessionStorage.setItem("nexora-open-section", opts.section);
    if (opts?.mode) sessionStorage.setItem("scriptora-open-mode", opts.mode);
    navigate("/app");
  };

  const openRewriteStudio = () => {
    const target = activeWritingProject;
    const chapterIdx = target?.chapters?.findIndex((ch) => (ch.content || "").trim().length > 0) ?? -1;
    const idx = chapterIdx >= 0 ? chapterIdx : 0;
    goApp({
      projectId: target?.id,
      section: target ? `chapter-${idx}` : undefined,
      mode: "rewrite",
    });
  };

  useEffect(() => {
    const openFromCharacterStudio = () => {
      setShowCharacterStudio(false);
      openNewBookGuarded();
    };

    window.addEventListener("scriptora-open-new-book-from-character-studio", openFromCharacterStudio);
    return () => window.removeEventListener("scriptora-open-new-book-from-character-studio", openFromCharacterStudio);
  }, []);

  const handleNewBook = (config: BookConfig) => {
    let finalConfig: BookConfig = config;

    try {
      const pending = getPendingCharacterProject();
      const bible =
        pending?.characterBible ||
        sessionStorage.getItem(SCRIPTORA_CHARACTER_BIBLE_KEY) ||
        localStorage.getItem(SCRIPTORA_CHARACTER_BIBLE_KEY) ||
        "";

      const shouldAttachCharacters = String(bible || "").trim() && isNarrativeGenreForCharacters(pending?.genre || config.genre);

      if (shouldAttachCharacters) {
        finalConfig = {
          ...config,
          genre: (pending?.genre || config.genre || "romance") as any,
          category: pending?.category || "Fiction",
          subcategory: pending?.subcategory || config.subcategory || "",
          tone: pending?.tone || config.tone || "poetic, emotional, cinematic",
          language: pending?.language || config.language,
          characters: charactersFromBibleText(bible),
        } as BookConfig;

        toast.success(tt("characters_attached_to_novel", { genre: `${finalConfig.genre}${finalConfig.subcategory ? " / " + finalConfig.subcategory : ""}` }));
      }
    } catch {
      finalConfig = config;
    }

    finalConfig = enforceAuthorIdentityLock(applyAuthorIdentityToConfig(finalConfig, activeAuthor) as BookConfig);
    setSelectedAuthorIdentityId(activeAuthor.id);
    sessionStorage.setItem("nexora-new-book", JSON.stringify(finalConfig));
    setShowNewBook(false);
    navigate("/app");
  };

  const handleDelete = async (id: string) => {
    // Optimistic UI: drop from list instantly, then sync to backend.
    setProjects((prev) => prev.filter((p) => p.id !== id));
    deleteProjectAsync(id).catch(() => {
      // On failure, refetch to recover state.
      loadProjects((fresh) => setProjects(fresh)).then((fresh) => {
      setProjects(fresh);
      setProjectsReady(true);
    });
    });
  };

  const detectIntent = async (): Promise<DetectedIntent | null> => {
    if (idea.trim().length < 6) return null;
    setDetecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("detect-book-intent", {
        body: { idea: idea.trim(), language: bookLang, userId: getCurrentUserId() },
      });
      if (error) throw error;
      if (data?.fallback) {
        if (data.code === "CREDITS_EXHAUSTED") {
          toast.error(t("ai_credits_exhausted"));
        } else if (data.code === "RATE_LIMIT") {
          toast.error(t("rate_limit_retry"));
        } else {
          toast.error(data.error || t("detection_unavailable"));
        }
        return null;
      }
      if (data?.error) throw new Error(data.error);
      const detected = data as DetectedIntent;
      const refined = refineDetectedGenre({
        idea: idea.trim(),
        genre: detected.genre,
        subcategory: detected.subcategory,
        tone: detected.tone,
      });
      const refinedIntent: DetectedIntent = {
        ...detected,
        genre: refined.genre,
        subcategory: refined.subcategory,
        tone: refined.tone,
      };
      const best = Math.max(0, Math.min(2, refinedIntent.bestTitleIndex || 0));
      setIntent(refinedIntent);
      setOneClickChapters(Math.max(3, Math.min(50, Number(refinedIntent.numberOfChapters) || oneClickChapters)));
      if (!briefTitle.trim()) setBriefTitle(refinedIntent.suggestedTitles?.[best] || refinedIntent.suggestedTitles?.[0] || "");
      if (!briefSubtitle.trim()) setBriefSubtitle(refinedIntent.suggestedSubtitles?.[best] || refinedIntent.suggestedSubtitles?.[0] || "");
      return refinedIntent;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("detection_failed"));
      return null;
    } finally {
      setDetecting(false);
    }
  };

  const launchOneClick = async () => {
    if (idea.trim().length < 6) return;
    setLaunching(true);
    let i = intent;
    if (!i) i = await detectIntent();
    if (!i) {
      setLaunching(false);
      return;
    }

    const best = Math.max(0, Math.min(2, i.bestTitleIndex || 0));
    const safeBookLength = currentPlan === "free" ? "short" : bookLength;
    sessionStorage.setItem(
      "nexora-auto-brief",
      JSON.stringify({
        idea: idea.trim(),
        genre: i.genre,
        subcategory: i.subcategory,
        targetAudience: i.targetAudience,
        tone: i.tone,
        language: bookLang,
        titleLanguage: titleLang || bookLang,
        numberOfChapters: Math.max(3, Math.min(50, Number(oneClickChapters || i.numberOfChapters) || 10)),
        subchaptersEnabled: oneClickSubchaptersEnabled,
        subchaptersPerChapter: oneClickSubchaptersEnabled
          ? Math.max(1, Math.min(8, Number(oneClickSubchaptersPerChapter) || DEFAULT_SUBCHAPTERS_PER_CHAPTER))
          : undefined,
        bookLength: safeBookLength,
        customTotalWords: safeBookLength === "custom" ? customTotalWords : undefined,
        totalWordTarget: safeBookLength === "custom" ? customTotalWords : BOOK_LENGTH_CONFIG[safeBookLength].totalWords,
        level: i.level,
        readerPromise: i.readerPromise,
        prefilledTitle: briefTitle.trim() || i.suggestedTitles?.[best],
        prefilledSubtitle: briefSubtitle.trim() || i.suggestedSubtitles?.[best],
        authorIdentityId: activeAuthor.id,
        authorIdentity: activeAuthor,
        authorName: activeAuthor.penName,
        autoStart: true,
      })
    );
    setLaunching(false);
    setShowLaunchModal(false);
    navigate("/auto-bestseller");
  };

  const currentLangLabel = UI_LANGUAGES.find(l => l.value === currentLang)?.label || "English";
  const completedProjects = useMemo(() => projects.filter(isProjectComplete), [projects]);
  const draftProjects = useMemo(() => projects.filter((p) => !isProjectComplete(p)), [projects]);
  useIntelligentPreload(projects);
  const totalChapters = useMemo(
    () => projects.reduce((sum, p) => sum + (p.chapters?.length || 0), 0),
    [projects],
  );
  const totalWords = useMemo(
    () => projects.reduce(
      (sum, p) => sum + (p.chapters || []).reduce(
        (chapterSum, ch) => chapterSum + (ch.content?.split(/\s+/).filter(Boolean).length || 0),
        0,
      ),
      0,
    ),
    [projects],
  );
  const planLabel = currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1);
  const lastProjectDoneChapters = useMemo(
    () => activeWritingProject?.chapters?.filter((chapter) => (chapter.content || "").trim().length > 50).length || 0,
    [activeWritingProject],
  );
  const lastProjectTargetChapters = activeWritingProject?.config?.numberOfChapters || activeWritingProject?.chapters?.length || 0;
  const lastProjectProgress = activeWritingProject
    ? activeWritingProject.phase === "complete"
      ? 100
      : lastProjectTargetChapters > 0
        ? Math.min(100, Math.round((lastProjectDoneChapters / lastProjectTargetChapters) * 100))
        : 0
    : 0;

  const wordCountForProject = (project: BookProject) =>
    (project.chapters || []).reduce(
      (sum, chapter) => sum + (chapter.content?.split(/\s+/).filter(Boolean).length || 0),
      0,
    );
  const dayKey = (date: Date) => date.toISOString().slice(0, 10);
  const todayKey = dayKey(new Date());
  const wordsToday = useMemo(
    () => projects
      .filter((project) => {
        const updated = new Date(project.updatedAt);
        return !Number.isNaN(updated.getTime()) && dayKey(updated) === todayKey;
      })
      .reduce((sum, project) => sum + wordCountForProject(project), 0),
    [projects, todayKey],
  );
  const updateDays = useMemo(
    () => new Set(
      projects
        .map((project) => {
          const updated = new Date(project.updatedAt);
          return Number.isNaN(updated.getTime()) ? "" : dayKey(updated);
        })
        .filter(Boolean),
    ),
    [projects],
  );
  const writingStreak = useMemo(() => {
    let streak = 0;
    for (const cursor = new Date(); updateDays.has(dayKey(cursor)); cursor.setDate(cursor.getDate() - 1)) {
      streak += 1;
    }
    return streak;
  }, [updateDays]);
  const aiQualityValues = useMemo(
    () => projects.flatMap((project) =>
      (project.chapters || []).map((chapter) => {
        const c = chapter as any;
        if (typeof c?.aiRating?.score === "number") return Math.round(c.aiRating.score * 20);
        if (typeof c?.qualityRating === "number") return Math.round(c.qualityRating * 20);
        return null;
      }).filter((value): value is number => typeof value === "number"),
    ),
    [projects],
  );
  const aiQualityScore = useMemo(
    () => (aiQualityValues.length
      ? Math.round(aiQualityValues.reduce((sum, value) => sum + value, 0) / aiQualityValues.length)
      : null),
    [aiQualityValues],
  );
  const dashboardWidgets = [
    {
      label: t("active_book_widget"),
      value: activeWritingProject?.config.title || t("no_active_book"),
      detail: activeWritingProject ? t("open_manuscript") : t("start_or_import_book"),
      icon: BookOpen,
      tone: "from-sky-400/18 to-cyan-300/8",
      action: activeWritingProject ? () => goApp({ projectId: activeWritingProject.id }) : openNewBookGuarded,
    },
    {
      label: t("words_today_widget"),
      value: wordsToday.toLocaleString(),
      detail: t("from_updated_projects"),
      icon: NotebookPen,
      tone: "from-emerald-400/18 to-lime-300/8",
      action: () => goApp(),
    },
    {
      label: t("writing_streak_widget"),
      value: writingStreak.toLocaleString(),
      detail: t("consecutive_days"),
      icon: Flame,
      tone: "from-amber-400/20 to-orange-300/8",
      action: () => goApp(),
    },
    {
      label: t("project_progress_widget"),
      value: activeWritingProject ? `${lastProjectProgress}%` : "0%",
      detail: activeWritingProject ? t("active_draft_progress") : t("no_active_book"),
      icon: BarChart3,
      tone: "from-violet-400/18 to-fuchsia-300/8",
      action: activeWritingProject ? () => goApp({ projectId: activeWritingProject.id }) : () => openDashboardOverlay(() => setShowLibrary(true)),
    },
    {
      label: t("ai_quality_score_widget"),
      value: aiQualityScore == null ? "—" : `${aiQualityScore}`,
      detail: aiQualityScore == null ? t("run_analysis_to_score") : t("analysis_based_score"),
      icon: Sparkles,
      tone: "from-rose-400/18 to-pink-300/8",
      action: guardPlanFeature("chapter_improvement", () => setShowManuscriptAnalyzer(true)),
    },
  ];
  const workspaceStats = [
    { label: t("projects"), value: projectsReady ? projects.length.toLocaleString() : "…", detail: projectsReady ? tt("draft_count", { count: draftProjects.length }) : "…", icon: FolderOpen, iconBg: "ios-icon-blue" },
    { label: t("completed"), value: completedProjects.length.toLocaleString(), detail: t("ready_to_export"), icon: CheckCircle2, iconBg: "ios-icon-green" },
    { label: t("chapters"), value: totalChapters.toLocaleString(), detail: t("generated_detail"), icon: BookOpen, iconBg: "ios-icon-orange" },
    { label: t("words_unit"), value: totalWords > 0 ? totalWords.toLocaleString() : "0", detail: t("in_library"), icon: FileDown, iconBg: "ios-icon-pink" },
  ];

  const cards = [
    { group: "writer", icon: BookOpen, title: t("writer_studio_title"), desc: t("writer_studio_desc"), iconBg: "ios-icon-violet", action: () => goApp(), tag: t("os_tag_write"), emphasis: true, tourTarget: "dashboard-writer" },
    { group: "writer", icon: Plus, title: freeBookUsed ? t("free_book_used") : t("story_architect_title"), desc: freeBookUsed ? t("upgrade_more_books") : t("story_architect_desc"), iconBg: freeBookUsed ? "ios-icon-slate" : "ios-icon-green", action: () => openLaunchModal("manual"), feature: "book_engine_full" as const, tag: t("os_tag_plan") },
    { group: "writer", icon: Wand2, title: t("manuscript_lab_title"), desc: t("manuscript_lab_desc"), iconBg: "ios-icon-teal", action: () => openDashboardOverlay(() => setShowManuscriptAnalyzer(true)), feature: "chapter_improvement" as const, tag: t("os_tag_score") },
    { group: "writer", icon: Sparkles, title: t("rewrite_studio"), desc: t("rewrite_studio_desc"), iconBg: "ios-icon-pink", action: openRewriteStudio, feature: "chapter_rewrite" as const, tag: t("os_tag_rewrite") },
    { group: "writer", icon: Users, title: t("character_studio_title"), desc: t("character_studio_desc"), iconBg: "ios-icon-pink", action: () => openDashboardOverlay(() => setShowCharacterStudio(true)), feature: "book_engine_full" as const, tag: t("os_tag_cast") },
    { group: "writer", icon: AudioLines, title: t("voice_studio_title"), desc: t("voice_studio_desc"), iconBg: "ios-icon-cyan", action: () => openDashboardOverlay(() => setShowVoiceStudio(true)), feature: "book_engine_full" as const, tag: "IMMERSIVE", emphasis: true },
    { group: "writer", icon: NotebookPen, title: t("block_notes"), desc: t("notepad_premium_desc"), iconBg: "ios-icon-yellow", action: () => openDashboardOverlay(() => setShowNotepad(true)), tag: t("os_tag_notes") },

    { group: "bestseller", icon: Flame, title: t("bestseller_engine_title"), desc: t("bestseller_engine_desc"), iconBg: "ios-icon-blue", action: () => openLaunchModal("advanced"), emphasis: true, tag: t("os_tag_launch") },
    { group: "bestseller", icon: Rocket, title: t("kdp_intelligence_title"), desc: t("kdp_intelligence_desc"), iconBg: "ios-icon-violet", action: () => navigate("/kdp-launch"), feature: "kdp_market_base" as const, tag: t("os_tag_market") },
    { group: "bestseller", icon: Zap, title: t("title_intelligence"), desc: t("title_premium_desc"), iconBg: "ios-icon-teal", action: () => openDashboardOverlay(() => setShowTitleIntel(true)), feature: "title_intelligence_base" as const, tag: t("os_tag_titles") },
    { group: "bestseller", icon: TrendingUp, title: t("bestseller_radar_title"), desc: t("radar_premium_desc"), iconBg: "ios-icon-green", action: () => navigate("/bestseller-radar"), feature: "trending_niches_limited" as const, tag: t("os_tag_signal") },
    { group: "bestseller", icon: BarChart3, title: t("keyword_gold_title"), desc: t("keyword_premium_desc"), iconBg: "ios-icon-yellow", action: () => navigate("/keyword-gold"), feature: "kdp_market_base" as const, tag: t("os_tag_metadata") },

    { group: "publishing", icon: ImagePlus, title: t("cover_studio"), desc: t("cover_studio_desc"), iconBg: "ios-icon-blue", action: () => openDashboardOverlay(() => setShowCoverStudio(true)), feature: "cover_studio_template" as const, tag: t("os_tag_cover") },
    { group: "publishing", icon: FileDown, title: t("export_studio_title"), desc: t("export_studio_desc"), iconBg: "ios-icon-orange", action: () => openDashboardOverlay(() => setShowExport(true)), feature: "export_epub" as const, tag: t("os_tag_export"), tourTarget: "dashboard-export" },
    { group: "publishing", icon: Library, title: t("completed_shelf_title"), desc: t("library_premium_desc"), iconBg: "ios-icon-green", action: () => openDashboardOverlay(() => setShowLibrary(true)), feature: "export_epub" as const, tag: t("os_tag_archive") },

    { group: "system", icon: Users, title: t("author_identity"), desc: t("author_identity_premium_desc"), iconBg: "ios-icon-blue", action: () => openDashboardOverlay(() => setShowAuthorIdentity(true)), feature: "book_engine_full" as const, tag: t("os_tag_identity") },
    { group: "system", icon: Settings, title: t("background_atmosphere"), desc: t("atmosphere_premium_desc"), iconBg: "ios-icon-slate", action: () => openDashboardOverlay(() => setShowAdvancedSettings(true)), feature: "book_engine_full" as const, tag: t("os_tag_space") },
    { group: "system", icon: Settings, title: t("settings"), desc: t("settings_premium_desc"), iconBg: "ios-icon-yellow", action: () => openDashboardOverlay(() => setShowAdvancedSettings(true)), feature: "book_engine_full" as const, tag: t("os_tag_control") },
  ];

  const cardGroups = [
    { id: "writer", title: t("writer_os"), desc: t("writer_os_desc") },
    { id: "bestseller", title: t("bestseller_os"), desc: t("bestseller_os_desc") },
    { id: "publishing", title: t("publishing_os"), desc: t("publishing_os_desc") },
    { id: "system", title: t("system_os"), desc: t("system_os_desc") },
  ];

  return (
    <div className="scriptora-feature-page scriptora-os-ecosystem relative">
      <header className="sticky top-0 z-[100] isolate shrink-0 border-b border-white/10 bg-background/[0.88] backdrop-blur-2xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-1.5 px-3 sm:gap-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-1 sm:gap-1.5">
            <button
              onClick={() => {
                const now = Date.now();
                const recent = [...logoClicks.filter(t => now - t < 1500), now];
                if (recent.length >= 3) {
                  setLogoClicks([]);
                  if (canUseDevTools() && !isDevMode()) {
                    enableDevMode();
                    toast.success(t("toast_dev_enabled"));
                  }
                  if (canUseDevTools()) {
                    navigate("/usage");
                  }
                  return;
                }
                setLogoClicks(recent);
                if (recent.length === 1) {
                  setTimeout(() => {
                    setLogoClicks(curr => {
                      if (curr.length === 1 && curr[0] === now) {
                        navigate("/dashboard");
                        return [];
                      }
                      return curr;
                    });
                  }, 400);
                }
              }}
              className="group flex shrink-0 items-center gap-2 text-sm select-none"
              title="SCRIPTORA"
            >
              <span className="ios-icon ios-icon-blue h-9 w-9 transition-transform group-hover:scale-[1.03]">
                <BookOpen className="h-3.5 w-3.5" />
              </span>
              <span className="hidden text-[13px] font-bold text-foreground sm:inline">SCRIPTORA</span>
            </button>

            {user && authProfile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    title={authProfile.displayName}
                    aria-label={authProfile.displayName}
                    className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.07] pl-0.5 pr-2 transition-colors hover:bg-white/[0.12]"
                  >
                    <span className="relative shrink-0">
                      <Avatar className="h-7 w-7">
                        {authProfile.avatarUrl && (
                          <AvatarImage
                            src={authProfile.avatarUrl}
                            alt={authProfile.displayName}
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary">
                          {authProfile.initials}
                        </AvatarFallback>
                      </Avatar>
                      {authProfile.isGoogle && (
                        <span className="absolute -bottom-0.5 -right-0.5 rounded-full border border-background bg-background p-0.5 shadow-sm">
                          <GoogleLogoMark className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </span>
                    <span className="hidden max-w-[88px] truncate text-[11px] font-medium text-foreground min-[400px]:inline md:max-w-[120px]">
                      {authProfile.displayName}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  sideOffset={8}
                  className="scriptora-toolbar-menu-content ios-glass z-[200] w-64 rounded-lg border-white/15 bg-slate-950/95 p-1 shadow-2xl backdrop-blur-xl"
                >
                  <DropdownMenuLabel className="px-3 py-3 font-normal">
                    <AccountIdentityBlock user={user} size="md" />
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    className="cursor-pointer rounded-md px-3 py-2 text-xs focus:bg-white/10"
                    onClick={() => navigate("/pricing")}
                  >
                    <CreditCard className="mr-2 h-3.5 w-3.5" />
                    {t("pricing")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer rounded-md px-3 py-2 text-xs text-destructive focus:bg-destructive/10 focus:text-destructive"
                    onClick={async () => {
                      try {
                        await signOut();
                        toast.success(t("toast_signed_out"));
                      } catch { /* noop */ }
                      navigate("/auth");
                    }}
                  >
                    <LogOut className="mr-2 h-3.5 w-3.5" />
                    {t("sign_out")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <div className="hidden h-5 w-px bg-white/10 lg:block" />
            <span className="hidden items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.07] px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground lg:inline-flex">
              <HomeIcon className="h-3 w-3" />
              {t("studio")}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <button
              onClick={() => navigate("/pricing")}
              className="ios-toolbar-button hidden px-3 text-xs font-medium lg:flex"
              title={t("pricing")}
            >
              <CreditCard className="h-3.5 w-3.5" /> {t("pricing")}
            </button>
            <button
              onClick={() => navigate("/downloads")}
              className="ios-toolbar-button hidden px-3 text-xs font-medium lg:flex"
              title={t("install_app_hint")}
            >
              <DownloadIcon className="h-3.5 w-3.5" /> {t("install_app")}
            </button>
            {devOn && (
              <>
                <button
                  onClick={() => navigate("/usage")}
                  className="hidden h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-foreground transition-colors hover:bg-white/15 md:inline-flex"
                  title={t("usage_dashboard")}
                  aria-label={t("usage_dashboard")}
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => exitDevMode()}
                  className="ios-toolbar-button hidden h-8 w-8 text-xs hover:bg-destructive hover:text-destructive-foreground md:inline-flex"
                  title="Dev Mode"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            <div
              className="hidden h-8 max-w-[150px] shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.07] px-2 text-xs text-foreground lg:flex"
              title={`${t("author_identity")}: ${activeAuthor.penName}`}
            >
              <Fingerprint className="h-3.5 w-3.5 shrink-0 text-sky-300" />
              <select
                aria-label={t("author_identity")}
                value={activeAuthor.id}
                onChange={(e) => changeAuthorIdentity(e.target.value)}
                className="min-w-0 max-w-[108px] cursor-pointer appearance-none bg-transparent text-[11px] font-semibold text-foreground outline-none xl:max-w-[132px]"
              >
                {authorIdentities.map((identity) => (
                  <option key={identity.id} value={identity.id}>
                    {identity.penName}
                  </option>
                ))}
              </select>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="ios-toolbar-button h-8 w-8 px-0 lg:hidden"
                  aria-label={t("author_identity")}
                  title={t("author_identity")}
                >
                  <Fingerprint className="h-3.5 w-3.5 text-sky-300" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="scriptora-toolbar-menu-content ios-glass z-[200] w-52 rounded-lg border-white/15 bg-slate-950/95 p-1 shadow-2xl backdrop-blur-xl lg:hidden"
              >
                <DropdownMenuLabel className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("author_identity")}
                </DropdownMenuLabel>
                {authorIdentities.map((identity) => (
                  <DropdownMenuItem
                    key={identity.id}
                    className={`cursor-pointer rounded-md px-3 py-2 text-xs focus:bg-white/10 ${
                      identity.id === activeAuthor.id ? "font-semibold text-primary" : "text-foreground"
                    }`}
                    onClick={() => changeAuthorIdentity(identity.id)}
                  >
                    {identity.penName}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  className="cursor-pointer rounded-md px-3 py-2 text-xs focus:bg-white/10"
                  onClick={() => openDashboardOverlay(() => setShowAuthorIdentity(true))}
                >
                  <Settings className="mr-2 h-3.5 w-3.5" />
                  {t("settings")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <FocusMusicControl compact={isMobileLayout} />
            <GuidedTourTriggerButton tourId={GUIDED_TOUR_IDS.dashboard} compact={isMobileLayout} />
            <DeviceViewToolbarControl />
            <DropdownMenu
              open={showLangMenu}
              onOpenChange={(open) => {
                if (open) closeDashboardDialogs();
                setShowLangMenu(open);
              }}
            >
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="ios-toolbar-button relative z-[120] h-8 w-8 shrink-0 px-0 text-xs font-medium lg:w-auto lg:px-3"
                  aria-label={t("lang")}
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">{currentLangLabel}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="scriptora-toolbar-menu-content ios-glass z-[200] w-40 rounded-lg border-white/15 bg-slate-950/95 p-1 shadow-2xl backdrop-blur-xl"
              >
                {UI_LANGUAGES.map((lang) => (
                  <DropdownMenuItem
                    key={lang.value}
                    onClick={() => changeLang(lang.value)}
                    className={`cursor-pointer rounded-md px-3 py-2 text-xs focus:bg-white/10 ${
                      lang.value === currentLang ? "font-medium text-primary" : "text-foreground"
                    }`}
                  >
                    {lang.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="scriptora-feature-scroll relative mx-auto w-full max-w-7xl px-4 pb-8 pt-4 sm:px-6 sm:pt-8 lg:px-8">
        <WriterCommandBridge
          project={activeWritingProject}
          progressPercent={lastProjectProgress}
          onContinue={activeWritingProject ? () => goApp({ projectId: activeWritingProject.id }) : undefined}
          onLaunch={() => openLaunchModal("quick")}
          className="mb-2 sm:mb-4"
        />

        <div className="scriptora-os-legacy-hero mb-4 grid gap-3 sm:mb-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
          <section className="ios-panel overflow-hidden rounded-[28px] border-white/15 bg-slate-950/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-6 md:bg-slate-950/40">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2 sm:mb-3">
                  <span className="inline-flex items-center gap-1.5 rounded-2xl border border-white/15 bg-white/[0.10] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 shadow-[0_8px_20px_rgba(0,0,0,0.16)]">
                    <Sparkles className="h-3 w-3 text-sky-300" /> {t("ai_book_studio")}
                  </span>
                  <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold uppercase sm:hidden ${
                    activeRun
                      ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                      : "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                  }`}>
                    {activeRun ? t("live") : t("stable")}
                  </span>
                </div>
                <h1 className="max-w-2xl text-2xl font-semibold leading-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.45)] sm:text-4xl">
                  Scriptora OS
                </h1>
                <p className="mt-2 max-w-xl text-xs font-medium leading-5 text-white/75 sm:mt-3 sm:text-sm sm:leading-6">
                  {tt("plan_active_sentence", { plan: planLabel })}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <button
                  onClick={() => openLaunchModal("quick")}
                  data-guided-tour="dashboard-launch"
                  className="group inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-2xl border border-amber-200/70 bg-gradient-to-r from-amber-300/20 to-amber-200/10 px-4 text-xs font-bold text-slate-950 shadow-[0_18px_48px_rgba(251,191,36,0.22)] ring-1 ring-white/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_22px_52px_rgba(251,191,36,0.30)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:h-12 sm:px-5 sm:text-sm"
                >
                  <Flame className="h-4 w-4" />
                  {t("launch_book_title")}
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.08] px-4 text-xs font-bold text-white/85 shadow-[0_14px_36px_rgba(0,0,0,0.20)] transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-200/40 hover:bg-cyan-300/12 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:h-12 sm:px-4 sm:text-sm"
                  title={t("public_site")}
                >
                  <HomeIcon className="h-4 w-4 text-cyan-200" />
                  {t("public_site")}
                </button>
              </div>
            </div>
          </section>

          <section className="ios-panel hidden border-white/15 bg-slate-950/30 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.20)] backdrop-blur-2xl xl:block xl:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">{t("workspace_status")}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {activeRun ? t("generation_running") : t("ready")}
                </p>
              </div>
              <div className={`rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase ${
                activeRun
                  ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                  : "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
              }`}>
                {activeRun ? t("live") : t("stable")}
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => openDashboardOverlay(() => setShowLibrary(true))}
                className="w-full rounded-xl border border-white/15 bg-white/[0.10] p-3 text-left shadow-[0_10px_28px_rgba(0,0,0,0.14)] transition-colors hover:border-emerald-300/45 hover:bg-emerald-400/14"
              >
                <p className="text-[10px] uppercase text-muted-foreground">{t("library_workspace_title")}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                  {projectsReady ? projects.length.toLocaleString() : "…"}
                </p>
                {activeWritingProject && projects.length > 0 && (
                  <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{t("library_workspace_active_note")}</p>
                )}
              </button>
            </div>
          </section>
        </div>

        <DashboardGuidedFlow />

        <InProgressSection refreshKey={projects.length + (activeRun ? 1 : 0)} />

        <section className="mb-4 sm:mb-6">
          <button
            type="button"
            onClick={toggleWorkspaceMetrics}
            className="ios-panel flex w-full items-center justify-between gap-3 border-white/15 bg-slate-950/30 p-3 text-left shadow-[0_12px_36px_rgba(0,0,0,0.16)] backdrop-blur-2xl transition-colors hover:border-white/20 hover:bg-slate-950/40 sm:p-3.5"
            aria-expanded={showWorkspaceMetrics}
            aria-controls="dashboard-workspace-metrics"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="ios-icon ios-icon-blue h-10 w-10 shrink-0 rounded-[16px]">
                <BarChart3 className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-5 text-white">{t("mobile_status_summary")}</span>
                <span className="mt-0.5 block truncate text-[11px] font-medium text-white/62">
                  {showWorkspaceMetrics
                    ? t("dashboard_metrics_visible_hint")
                    : t("dashboard_metrics_hidden_hint")}
                </span>
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className={`rounded-lg border px-2 py-1 text-[10px] font-semibold uppercase ${
                activeRun
                  ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                  : "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
              }`}>
                {activeRun ? t("live") : t("stable")}
              </span>
              <span className="rounded-lg border border-white/10 bg-white/[0.07] px-2.5 py-1 text-[10px] font-semibold text-white/75">
                {showWorkspaceMetrics ? t("hide_metrics") : t("show_metrics")}
              </span>
              <ArrowRight className={`h-4 w-4 text-white/55 transition-transform ${showWorkspaceMetrics ? "rotate-90" : ""}`} />
            </span>
          </button>

          {showWorkspaceMetrics && (
            <div id="dashboard-workspace-metrics" className="mt-2 space-y-2 sm:space-y-3">
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-[repeat(auto-fill,minmax(240px,320px))] xl:grid-cols-4">
                {dashboardWidgets.map((widget) => (
                  <button
                    key={widget.label}
                    type="button"
                    onClick={widget.action}
                    className={`group relative min-h-[96px] overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br ${widget.tone} p-3 text-left shadow-[0_14px_44px_rgba(0,0,0,0.18)] backdrop-blur-2xl transition-all duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.10] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:min-h-[104px]`}
                  >
                    <div className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent opacity-60" />
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/58">{widget.label}</p>
                        <p className="mt-2 truncate text-base font-semibold leading-6 text-white sm:text-lg xl:text-xl">{widget.value}</p>
                      </div>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.10] text-white/85 shadow-lg shadow-black/20 transition-transform group-hover:scale-105">
                        <widget.icon className="h-4 w-4" />
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-[11px] font-medium leading-4 text-white/66">{widget.detail}</p>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-2 sm:gap-2.5 xl:grid xl:grid-cols-[repeat(auto-fill,minmax(220px,280px))]">
                {workspaceStats.map((stat) => (
                  <button
                    key={stat.label}
                    type="button"
                    onClick={() => openDashboardOverlay(() => setShowLibrary(true))}
                    className="ios-glass-soft rounded-[20px] border-white/15 bg-white/[0.08] p-3 text-left shadow-[0_16px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 sm:rounded-[24px]"
                  >
                    <div className="flex items-center justify-between gap-2 sm:gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[9px] font-semibold uppercase text-foreground/58 sm:text-[10px]">{stat.label}</p>
                        <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground sm:mt-1 sm:text-xl">{stat.value}</p>
                      </div>
                      <span className={`ios-icon ${stat.iconBg} hidden h-10 w-10 rounded-[18px] sm:inline-flex`}>
                        <stat.icon className="h-4 w-4" />
                      </span>
                    </div>
                    <p className="mt-1 hidden truncate text-[11px] text-foreground/60 sm:block">{stat.detail}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {activeWritingProject && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => goApp({ projectId: activeWritingProject.id })}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                goApp({ projectId: activeWritingProject.id });
              }
            }}
            className="ios-panel group mb-5 w-full cursor-pointer overflow-hidden p-0 text-left transition-colors hover:border-primary/40"
          >
            <div className="bg-gradient-to-r from-sky-400/10 via-white/[0.055] to-emerald-400/10 p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="mb-1.5 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.07] px-2 py-1 text-[9px] font-semibold uppercase text-foreground/70">
                    <Clock className="h-3 w-3 text-sky-300" /> {t("continue_project")}
                  </p>
                  <p className="truncate text-base font-semibold leading-5 text-foreground sm:text-lg">
                    {activeWritingProject.config.title || t("untitled")}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-4 text-foreground/65">
                    {lastProjectDoneChapters}/{lastProjectTargetChapters || activeWritingProject.chapters?.length || 0} {t("chapters").toLowerCase()} · {activeWritingProject.phase}
                  </p>
                </div>
                <button
                  type="button"
                  title={t("delete")}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteHomeProject(activeWritingProject.id, activeWritingProject.config.title);
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10 text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-300 to-emerald-300 transition-all"
                    style={{ width: `${lastProjectProgress}%` }}
                  />
                </div>
                <span className="min-w-10 text-right text-[11px] font-semibold tabular-nums text-foreground/70">
                  {lastProjectProgress}%
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-[11px] leading-4 text-foreground/60">
                  {t("continue_project_hint")}
                </span>
                <span className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-white px-2.5 text-[11px] font-semibold text-slate-950 shadow-lg shadow-black/20 transition-colors group-hover:bg-slate-100">
                  {t("continue_action")}
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </div>
        )}

        <section className="scriptora-os-module mb-10">
          <div className="scriptora-os-module__header flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="scriptora-os-module__title">{t("os_capabilities")}</p>
              <h2 className="scriptora-os-module__name">{t("launchpad")}</h2>
            </div>
            <span className="text-[11px] text-white/40">
              {tt("total_suffix", { count: projects.length, plan: planLabel })}
            </span>
          </div>

          <div className="space-y-8">
            {cardGroups.map((group) => {
              const groupCards = cards.filter((card) => card.group === group.id);
              return (
                <div key={group.id}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-medium text-white/80">{group.title}</h3>
                      <p className="mt-0.5 text-[11px] text-white/42">{group.desc}</p>
                    </div>
                  </div>

                  <div className="scriptora-os-capabilities">
                    {groupCards.map(card => {
                      const Icon = card.icon;
                      const inner = (
                        <button
                          key={card.title}
                          onClick={card.action}
                          data-guided-tour={(card as { tourTarget?: string }).tourTarget}
                          className={`scriptora-os-capability group focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                            (card as { emphasis?: boolean }).emphasis ? "scriptora-os-capability--emphasis" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className={`ios-icon ${card.iconBg} flex h-10 w-10 shrink-0 items-center justify-center rounded-xl`}>
                              <Icon className="h-4 w-4" />
                            </span>
                            {(card as { tag?: string }).tag && (
                              <span className="scriptora-os-capability__tag">{(card as { tag?: string }).tag}</span>
                            )}
                          </div>
                          <h3 className="scriptora-os-capability__title">{card.title}</h3>
                          <p className="scriptora-os-capability__desc">{card.desc}</p>
                        </button>
                      );
                      return (card as { feature?: string }).feature
                        ? <PaywallGuard key={card.title} feature={(card as any).feature} compact>{inner}</PaywallGuard>
                        : <div key={card.title}>{inner}</div>;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {!devOn && currentPlan === "free" && (
          <div className="ios-panel mb-4 flex items-center gap-3 p-4">
            <div className="ios-icon ios-icon-pink h-10 w-10 shrink-0 rounded-[16px]">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{t("beta_code_prompt")}</p>
              <p className="text-xs text-muted-foreground">{t("beta_code_desc")}</p>
            </div>
            <button
              onClick={() => openDashboardOverlay(() => setShowBetaDialog(true))}
              className="rounded-lg border border-fuchsia-500/40 bg-fuchsia-500/15 px-3 py-2 text-xs font-bold text-fuchsia-200 transition-colors hover:bg-fuchsia-500/25"
            >
              {t("activate")}
            </button>
          </div>
        )}

        {currentPlan === "beta" && (
          <div className="ios-panel mb-4 flex items-center gap-3 p-4">
            <div className="ios-icon ios-icon-pink h-10 w-10 shrink-0 rounded-[16px]">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-fuchsia-200">Beta Tester</p>
              <p className="text-xs text-muted-foreground">{t("beta_access_desc")}</p>
            </div>
          </div>
        )}

      </main>

      {showNewBook && (
        <Suspense fallback={<LazyPanelFallback />}>
          <NewBookDialog
            open={showNewBook}
            onClose={() => setShowNewBook(false)}
            onSubmit={(config) => {
              if (freeBookUsed) {
                setShowNewBook(false);
                toast.error(t("toast_free_book_used"));
                navigate("/pricing");
                return;
              }
              handleNewBook(config);
            }}
          />
        </Suspense>
      )}
      {showExport && (
        <Suspense fallback={null}>
          <HomeExportDialog open={showExport} projects={projects} onClose={() => setShowExport(false)} />
        </Suspense>
      )}
      {showTitleIntel && (
        <Suspense fallback={null}>
          <TitleIntelligenceDialog open={showTitleIntel} onClose={() => setShowTitleIntel(false)} />
        </Suspense>
      )}
      {showAdvancedSettings && (
        <Suspense fallback={null}>
          <AdvancedAppearanceDialog open={showAdvancedSettings} onClose={() => setShowAdvancedSettings(false)} />
        </Suspense>
      )}
      {showCharacterStudio && (
        <Suspense fallback={null}>
          <CharacterStudioDialog open={showCharacterStudio} onClose={() => setShowCharacterStudio(false)} />
        </Suspense>
      )}
      {showCoverStudio && (
        <Suspense fallback={null}>
          <CoverGenerator
            title={t("untitled")}
            subtitle=""
            authorName={activeAuthor.penName}
            description=""
            authorBio={activeAuthor.biography}
            projectGenre={lastProject?.config?.genre}
            showPrimaryAction={false}
            onGenerate={() => undefined}
            onClose={() => setShowCoverStudio(false)}
          />
        </Suspense>
      )}
      {showManuscriptAnalyzer && (
        <Suspense fallback={null}>
          <ManuscriptAnalyzerDialog
            open={showManuscriptAnalyzer}
            onClose={() => setShowManuscriptAnalyzer(false)}
            canCreateProject={!freeBookUsed}
            onLimitReached={() => navigate("/pricing")}
          />
        </Suspense>
      )}
      {showNotepad && (
        <Suspense fallback={null}>
          <NotepadDialog open={showNotepad} onClose={() => setShowNotepad(false)} />
        </Suspense>
      )}
      {showAuthorIdentity && (
        <Suspense fallback={null}>
          <AuthorIdentityDialog open={showAuthorIdentity} onClose={() => setShowAuthorIdentity(false)} />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <VoiceStudioDialog
          open={showVoiceStudio}
          onClose={() => setShowVoiceStudio(false)}
          projects={projects}
          onOpenProject={(id) => {
            setShowVoiceStudio(false);
            goApp({ projectId: id });
          }}
          onOpenChapterInEditor={(projectId, chapterIdx) => {
            setShowVoiceStudio(false);
            goApp({ projectId, section: `chapter-${chapterIdx}` });
          }}
        />
      </Suspense>

      <LaunchBookModal
        open={showLaunchModal}
        mode={launchMode}
        onModeChange={setLaunchMode}
        onClose={closeLaunchModal}
        onAdvancedLaunch={() => {
          setShowLaunchModal(false);
          navigate("/auto-bestseller");
        }}
        onManualSetup={() => {
          setShowLaunchModal(false);
          openNewBookGuarded();
        }}
        manualLocked={freeBookUsed}
        busy={launching || detecting}
        quickLaunch={{
          idea,
          onIdeaChange: setIdea,
          briefTitle,
          onBriefTitleChange: setBriefTitle,
          briefSubtitle,
          onBriefSubtitleChange: setBriefSubtitle,
          bookLang,
          onBookLangChange: setBookLang,
          titleLang,
          onTitleLangChange: setTitleLang,
          bookLength,
          onBookLengthChange: setBookLength,
          customTotalWords,
          onCustomTotalWordsChange: setCustomTotalWords,
          oneClickChapters,
          onOneClickChaptersChange: setOneClickChapters,
          oneClickSubchaptersEnabled,
          onOneClickSubchaptersEnabledChange: setOneClickSubchaptersEnabled,
          oneClickSubchaptersPerChapter,
          onOneClickSubchaptersPerChapterChange: setOneClickSubchaptersPerChapter,
          intent,
          launching,
          detecting,
          currentPlan,
          onLaunch: launchOneClick,
          onDetect: detectIntent,
        }}
      />
      {/* Library modal — opens via the Biblioteca card */}
      {showLibrary && (
        <div
          className="scriptora-modal-overlay"
          onClick={() => setShowLibrary(false)}
        >
          <div
            className="scriptora-modal-panel ios-panel max-w-2xl animate-scriptora-dialog-entrance"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="scriptora-modal-body p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Library className="h-4 w-4 text-emerald-500" />
                  {t("completed_shelf_title")}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">{t("library_modal_subtitle")}</p>
              </div>
              <button
                onClick={() => setShowLibrary(false)}
                className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={t("close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <LibrarySection
              projects={projects}
              activeWritingId={activeWritingId}
              allowEmpty
              onOpen={(id) => { setShowLibrary(false); goApp({ projectId: id }); }}
              onDelete={handleDelete}
              onExport={() => openDashboardOverlay(() => setShowExport(true))}
            />
            </div>
          </div>
        </div>
      )}

      <DevModeUnlockDialog open={showDevUnlock} onOpenChange={setShowDevUnlock} onUnlocked={() => navigate("/usage")} />
      <BetaActivationDialog open={showBetaDialog} onOpenChange={setShowBetaDialog} />
    </div>
  );
}
