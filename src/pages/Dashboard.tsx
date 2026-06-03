import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { loadProjects, deleteProjectAsync, getLastProjectId, getCurrentUserId, setLastProjectId, saveProjectAsync } from "@/services/storageService";
import { saveProject } from "@/lib/storage";
import { isProjectComplete } from "@/lib/project-status";
import { NewBookDialog } from "@/components/NewBookDialog";
import { AdvancedAppearanceDialog } from "@/components/AdvancedAppearanceDialog";
import { FocusMusicControl } from "@/components/FocusMusicControl";
import { InProgressSection } from "@/components/Home/InProgressSection";
import { LibrarySection } from "@/components/Home/LibrarySection";
import { PaywallGuard } from "@/components/PaywallGuard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BookOpen, Plus, FolderOpen, Trash2, Rocket, Zap,
  FileDown, ArrowRight, Globe, Flame, Loader2, Sparkles, Wand2,
  Library, Home as HomeIcon, X, BarChart3,
  TrendingUp, LogOut, CreditCard, Download as DownloadIcon, Settings, Users,
  CheckCircle2, NotebookPen, Fingerprint, ImagePlus, AudioLines
} from "lucide-react";
import { BOOK_LENGTH_CONFIG, BookConfig, BookLength, BookProject, DEFAULT_SUBCHAPTERS_PER_CHAPTER } from "@/types/book";
import { t, tt, getUILanguage, setUILanguage, UI_LANGUAGES, UILanguage, useUILanguage } from "@/lib/i18n";
import { AUTHOR_IDENTITY_CHANGED_EVENT, applyAuthorIdentityToConfig, enforceAuthorIdentityLock, getSelectedAuthorIdentity, loadAuthorIdentities, setSelectedAuthorIdentityId } from "@/lib/author-identity";
import { refineDetectedGenre } from "@/lib/book-intelligence";
import { DevModeUnlockDialog } from "@/components/DevModeUnlockDialog";
import { enableDevMode, isDevMode, exitDevMode, useDevMode } from "@/lib/dev-mode";
import { BetaActivationDialog } from "@/components/BetaActivationDialog";
import { usePlan, useQuota } from "@/lib/plan";
import { canUseFeature, type FeatureKey } from "@/lib/subscription";
import { estimateCreditsFromWords, formatCredits, operationCreditLabel } from "@/lib/credit-economy";
import { FlaskConical } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIntelligentPreload } from "@/hooks/useIntelligentPreload";
import { useAtmosphereProfile } from "@/hooks/useAtmosphereProfile";
import { useBackgroundSource } from "@/hooks/useBackgroundSource";
import { ATMOSPHERE_PROFILES, restoreRealmBackground } from "@/lib/atmosphere-engine";
import { getAtmosphereThemeCopy } from "@/lib/atmosphere-engine/theme-copy";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const VoiceStudioDialog = lazy(() => import("@/components/VoiceStudioDialog").then(m => ({ default: m.VoiceStudioDialog })));
const HomeExportDialog = lazy(() => import("@/components/HomeExportDialog").then(m => ({ default: m.HomeExportDialog })));
const TitleIntelligenceDialog = lazy(() => import("@/components/TitleIntelligenceDialog").then(m => ({ default: m.TitleIntelligenceDialog })));
const CoverGenerator = lazy(() => import("@/components/CoverGenerator").then(m => ({ default: m.CoverGenerator })));
const CharacterStudioDialog = lazy(() => import("@/components/CharacterStudioDialog").then(m => ({ default: m.CharacterStudioDialog })));
const ManuscriptAnalyzerDialog = lazy(() => import("@/components/ManuscriptAnalyzerDialog").then(m => ({ default: m.ManuscriptAnalyzerDialog })));
const NotepadDialog = lazy(() => import("@/components/NotepadDialog").then(m => ({ default: m.NotepadDialog })));
const AuthorIdentityDialog = lazy(() => import("@/components/AuthorIdentityDialog").then(m => ({ default: m.AuthorIdentityDialog })));

const SCRIPTORA_CHARACTER_BIBLE_KEY = "scriptora-character-bible-v1";
const SCRIPTORA_CHARACTER_PROJECT_KEY = "scriptora-character-project-v1";


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
  const [showProjects, setShowProjects] = useState(false);
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
  const [showMobileStats, setShowMobileStats] = useState(false);
  const [expandedOsFolder, setExpandedOsFolder] = useState<string | null>(null);
  const [projects, setProjects] = useState<BookProject[]>([]);
  const [projectsReady, setProjectsReady] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const currentLang = useUILanguage();
  const { profileId, selectProfile } = useAtmosphereProfile();
  const { source: backgroundSource } = useBackgroundSource();
  const activeAtmosphere = ATMOSPHERE_PROFILES.find((profile) => profile.id === profileId) ?? ATMOSPHERE_PROFILES[0];
  const themeCopy = useMemo(() => getAtmosphereThemeCopy(profileId), [profileId]);
  const worldScene = themeCopy.world;

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
  const avatarUrl = (user?.user_metadata as any)?.avatar_url || (user?.user_metadata as any)?.picture || null;
  const displayName = (user?.user_metadata as any)?.full_name || (user?.user_metadata as any)?.name || user?.email || "";
  const initials = displayName
    ? displayName.split(/[\s@]+/).filter(Boolean).slice(0, 2).map((s: string) => s[0]?.toUpperCase()).join("")
    : "U";
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

  useEffect(() => {
    const route =
      showLaunchModal ? (launchMode === "quick" ? "idea" : launchMode === "advanced" ? "bestseller" : "newbook") :
      showNewBook ? "newbook" :
      showAuthorIdentity ? "author" :
      showCoverStudio ? "cover" :
      showCharacterStudio ? "character" :
      showManuscriptAnalyzer ? "manuscript" :
      showNotepad ? "notepad" :
      showTitleIntel ? "title" :
      showExport ? "export" :
      showAdvancedSettings ? "settings" :
      showLibrary || showProjects ? "library" :
      showBetaDialog ? "beta" :
      showDevUnlock ? "usage" :
      null;

    window.dispatchEvent(new CustomEvent("scriptora-guide-context", { detail: { route } }));
    return () => {
      window.dispatchEvent(new CustomEvent("scriptora-guide-context", { detail: { route: null } }));
    };
  }, [
    showAdvancedSettings,
    showAuthorIdentity,
    showBetaDialog,
    showCharacterStudio,
    showCoverStudio,
    showDevUnlock,
    showExport,
    showLaunchModal,
    launchMode,
    showLibrary,
    showManuscriptAnalyzer,
    showNewBook,
    showNotepad,
    showProjects,
    showTitleIntel,
  ]);

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
    setShowNewBook(true);
  };

  const openLaunchModal = (mode: LaunchMode = "quick") => {
    if (mode === "manual" && freeBookUsed) {
      toast.error(t("toast_free_book_used"));
      navigate("/pricing");
      return;
    }
    setLaunchMode(mode);
    setShowLaunchModal(true);
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
    action();
  };

  const lastId = getLastProjectId();
  // Only surface "continue last" when the project still belongs to the active
  // environment (DEV vs USER). Cross-scope ids are silently ignored.
  const lastProject = lastId ? projects.find(p => p.id === lastId) : null;
  const { quota: activeQuota } = useQuota(lastProject?.id || null);

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
    if (opts?.projectId) sessionStorage.setItem("nexora-open-project", opts.projectId);
    if (opts?.section) sessionStorage.setItem("nexora-open-section", opts.section);
    if (opts?.mode) sessionStorage.setItem("scriptora-open-mode", opts.mode);
    navigate("/app");
  };

  const openRewriteStudio = () => {
    const target = lastProject;
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
    () => lastProject?.chapters?.filter((chapter) => (chapter.content || "").trim().length > 50).length || 0,
    [lastProject],
  );
  const lastProjectTargetChapters = lastProject?.config?.numberOfChapters || lastProject?.chapters?.length || 0;
  const lastProjectProgress = lastProject
    ? lastProject.phase === "complete"
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
  const lastProjectWordCount = lastProject ? wordCountForProject(lastProject) : 0;
  const firstMissingChapterIndex = lastProject
    ? Array.from({ length: Math.max(1, lastProjectTargetChapters || lastProject.chapters?.length || 1) }, (_, index) => index)
        .find((index) => !((lastProject.chapters?.[index]?.content || "").trim().length > 50))
    : undefined;
  const activeChapterIndex = lastProject
    ? firstMissingChapterIndex ?? Math.max(0, lastProjectDoneChapters - 1)
    : 0;
  const activeChapterTitle = lastProject
    ? (
        lastProject.chapters?.[activeChapterIndex]?.title ||
        lastProject.blueprint?.chapterOutlines?.[activeChapterIndex]?.title ||
        `${t("chapter")} ${activeChapterIndex + 1}`
      )
    : "";
  const manuscriptStatusLabel = !lastProject
    ? "Nessun libro attivo"
    : lastProject.phase === "complete"
      ? "Manoscritto completo"
      : firstMissingChapterIndex != null
        ? `Prossimo: ${t("chapter")} ${activeChapterIndex + 1}`
        : "Pronto per la rifinitura";
  const openActiveManuscript = () => {
    if (!lastProject) {
      openLaunchModal("quick");
      return;
    }
    goApp({ projectId: lastProject.id, section: `chapter-${activeChapterIndex}` });
  };
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
  const creditBalanceLabel = activeQuota?.tokensRemaining == null
    ? "Illimitati"
    : formatCredits(activeQuota.tokensRemaining);
  const creditUsedLabel = formatCredits(activeQuota?.tokensUsed || 0);
  const todayCreditEstimate = estimateCreditsFromWords(wordsToday);
  const planDisplayLabel = devOn ? `SIM DEV · ${planLabel}` : planLabel;
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
  const focusAtmosphereCard = (
  <div data-atmosphere-zone="atmosphere-engine" className="atmo-engine-card relative overflow-hidden rounded-3xl border p-6 shadow-2xl">
    <div className="absolute inset-x-6 top-6 h-14 rounded-b-[32px] bg-white/[0.03] blur-2xl opacity-50" />

    <div className="relative z-10 flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
            <Sparkles className="h-3.5 w-3.5 text-white/60" />
            {t("atmo_engine_title")}
          </div>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
            {t("atmo_engine_headline")}
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
            {t("atmo_engine_body")}
          </p>
          <p className="mt-3 max-w-xl text-xs font-semibold uppercase tracking-[0.16em] text-white/54">
            {worldScene.title}
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-medium text-white/75 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
          <Sparkles className="h-4 w-4 text-white/50" />
          {t(activeAtmosphere.nameKey)}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {ATMOSPHERE_PROFILES.map((profile) => (
          <button
            key={profile.id}
            type="button"
            disabled={!profile.available}
            onClick={() => profile.available && selectProfile(profile.id)}
            aria-pressed={profileId === profile.id}
            className={`atmo-profile-tile group relative overflow-hidden rounded-3xl border p-4 text-left text-sm font-medium transition ${
              profileId === profile.id
                ? "is-active border-white/14 bg-white/[0.07] text-white"
                : profile.available
                  ? "border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/14 hover:bg-white/[0.05]"
                  : "cursor-not-allowed border-white/8 bg-white/[0.02] text-slate-500 opacity-80"
            }`}
          >
            <span className="relative block text-sm font-semibold">{t(profile.nameKey)}</span>
            <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
              {t(profile.moodKey)}
            </span>
            <span className="mt-2 block text-xs leading-5 text-slate-500">{t(profile.descriptionKey)}</span>
            {profileId === profile.id && profile.available && (
              <span className="mt-4 inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                {t("atmo_engine_active")}
              </span>
            )}
            {!profile.available && (
              <span className="mt-4 inline-flex items-center rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {t("atmo_engine_coming_soon")}
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="text-xs leading-5 text-slate-500">
        {t("atmo_engine_persist")}
      </p>
      <div className="flex flex-col gap-2 border-t border-white/8 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          {backgroundSource === "realm" ? t("bg_source_realm_active") : t("bg_source_custom_active")}
          {backgroundSource === "realm" && (
            <span className="mt-1 block text-[11px] text-slate-600">{t("atmo_bg_realm_hint")}</span>
          )}
        </p>
        {backgroundSource === "custom" && (
          <button
            type="button"
            onClick={() => {
              restoreRealmBackground();
              toast.success(t("toast_realm_background_restored"));
            }}
            className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/75 transition hover:border-white/18 hover:bg-white/[0.08]"
          >
            {t("atmo_restore_realm_bg")}
          </button>
        )}
      </div>
    </div>
  </div>
);

const dashboardWidgets = [
    {
      label: t("active_book_widget"),
      value: lastProject?.config.title || t("no_active_book"),
      detail: lastProject ? t("open_manuscript") : t("start_or_import_book"),
      icon: BookOpen,
      tone: "from-sky-400/18 to-cyan-300/8",
      action: lastProject ? () => goApp({ projectId: lastProject.id }) : openNewBookGuarded,
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
      value: lastProject ? `${lastProjectProgress}%` : "0%",
      detail: lastProject ? t("active_draft_progress") : t("no_active_book"),
      icon: BarChart3,
      tone: "from-violet-400/18 to-fuchsia-300/8",
      action: lastProject ? () => goApp({ projectId: lastProject.id }) : () => setShowProjects(true),
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

  const manuscriptCore = (
    <section data-atmosphere-zone="manuscript-core" data-atmosphere-place={worldScene.label} className="scriptora-dashboard-book-core relative mb-4 overflow-hidden rounded-[32px] border border-white/15 bg-slate-950/70 p-4 shadow-[0_30px_100px_rgba(0,0,0,0.34)] ring-1 ring-white/[0.04] backdrop-blur-2xl sm:mb-6 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(125,211,252,0.10),transparent_36%),linear-gradient(225deg,rgba(251,191,36,0.08),transparent_42%)]" />
      <div className="scriptora-world-stage pointer-events-none absolute inset-0" aria-hidden="true">
        <span className="scriptora-world-stage-orbit scriptora-world-stage-orbit-primary" />
        <span className="scriptora-world-stage-orbit scriptora-world-stage-orbit-secondary" />
        <span className="scriptora-world-stage-floor" />
      </div>
      <div className="relative z-10 grid gap-5 lg:grid-cols-[minmax(250px,0.78fr)_minmax(0,1.55fr)] lg:items-stretch">
        <div className="flex gap-4 lg:flex-col lg:items-center lg:justify-center">
          <div data-atmosphere-zone="book-object" data-atmosphere-object={worldScene.bookObject} className="scriptora-dashboard-book-cover scriptora-scene-object relative flex min-h-[236px] w-[164px] shrink-0 flex-col justify-between overflow-hidden rounded-[24px] border border-white/15 bg-gradient-to-br from-slate-900 via-sky-950 to-slate-950 p-4 shadow-[0_24px_70px_rgba(8,47,73,0.38)] sm:min-h-[292px] sm:w-[202px] sm:p-5">
            <div className="absolute inset-x-0 top-0 h-20 bg-white/[0.06] blur-2xl" />
            <span className="scriptora-book-spine" aria-hidden="true" />
            <div className="relative z-10">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-sky-100/70">{themeCopy.bookObjectLabel}</p>
              <h2 className="mt-4 line-clamp-5 text-xl font-black uppercase leading-6 text-white sm:text-2xl sm:leading-7">
                {lastProject?.config.title || "Nuovo libro"}
              </h2>
            </div>
            <div className="relative z-10">
              <div className="mb-2 h-px w-12 bg-sky-200/60" />
              <p className="line-clamp-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
                {lastProject?.config.authorName || lastProject?.config.author || activeAuthor.penName}
              </p>
            </div>
          </div>

          <div className="min-w-0 flex-1 lg:w-full">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200/70">{themeCopy.activeBookLabel}</p>
            <p className="mt-1 line-clamp-2 text-base font-semibold text-white sm:text-lg">
              {lastProject?.config.title || "Avvia il prossimo manoscritto"}
            </p>
            <p className="mt-1 text-xs leading-5 text-white/60">
              {lastProject ? `${lastProject.config.genre} · ${lastProject.config.language}` : themeCopy.emptyBookHint}
            </p>
          </div>
        </div>

        <div className="scriptora-manuscript-command-surface min-w-0 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="scriptora-world-place-label text-[10px] font-semibold uppercase tracking-[0.18em] text-white/42">{worldScene.label}</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">{themeCopy.journeyLabel}</p>
              <h2 className="mt-1 text-3xl font-semibold leading-tight text-white sm:text-5xl">
                {lastProject ? manuscriptStatusLabel : "Crea, scrivi e pubblica da un unico centro."}
              </h2>
              {lastProject && (
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/68 sm:text-base">
                  {activeChapterTitle} · {lastProjectWordCount.toLocaleString("it-IT")} parole nel manoscritto.
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-right">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Progress</p>
              <p className="text-2xl font-semibold tabular-nums text-white">{lastProjectProgress}%</p>
            </div>
          </div>

          <div className="scriptora-book-instrument-strip grid gap-2 sm:grid-cols-3">
            <div className="scriptora-book-instrument rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-100/55">Crediti disponibili</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-50">{creditBalanceLabel}</p>
              <p className="mt-0.5 text-[10px] text-emerald-100/58">Uso progetto: {creditUsedLabel}</p>
            </div>
            <div className="scriptora-book-instrument rounded-2xl border border-sky-300/20 bg-sky-300/10 px-3 py-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-sky-100/55">Consumo oggi</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-sky-50">{formatCredits(todayCreditEstimate)}</p>
              <p className="mt-0.5 text-[10px] text-sky-100/58">Stimato da attivita libro</p>
            </div>
            <div className="scriptora-book-instrument rounded-2xl border border-amber-300/20 bg-amber-300/10 px-3 py-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-amber-100/55">Piano attivo</p>
              <p className="mt-1 text-lg font-semibold text-amber-50">{planDisplayLabel}</p>
              <p className="mt-0.5 text-[10px] text-amber-100/58">{devOn ? "Non wallet reale" : "Policy corrente"}</p>
            </div>
          </div>

          <div className="scriptora-book-progress h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-300 via-emerald-300 to-amber-200"
              style={{ width: `${lastProjectProgress}%` }}
            />
          </div>

          <div className="scriptora-book-primary-actions grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <button
              type="button"
              onClick={openActiveManuscript}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-[22px] bg-white px-5 py-3 text-base font-black uppercase tracking-[0.08em] text-slate-950 transition hover:bg-slate-100 sm:col-span-2 xl:col-span-2"
            >
              <BookOpen className="h-4 w-4" />
              {lastProject ? "Continua il libro" : "Avvia libro"}
            </button>
            <button
              type="button"
              onClick={openActiveManuscript}
              disabled={!lastProject}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-300/35 bg-emerald-300/10 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/15 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Sparkles className="h-4 w-4" />
              Genera · {operationCreditLabel("chapter_generation", devOn)}
            </button>
            <button
              type="button"
              onClick={guardPlanFeature("chapter_improvement", () => setShowManuscriptAnalyzer(true))}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-sky-300/35 bg-sky-300/10 px-4 py-2.5 text-sm font-semibold text-sky-100 transition hover:bg-sky-300/15"
            >
              <Wand2 className="h-4 w-4" />
              Diagnostica · {operationCreditLabel("chapter_diagnostic", devOn)}
            </button>
            <button
              type="button"
              onClick={lastProject ? openRewriteStudio : openActiveManuscript}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-fuchsia-300/35 bg-fuchsia-300/10 px-4 py-2.5 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-300/15"
            >
              <Zap className="h-4 w-4" />
              Riscrivi · {operationCreditLabel("chapter_rewrite", devOn)}
            </button>
          </div>

          <div className="scriptora-book-secondary-actions grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={guardPlanFeature("cover_studio_template", () => setShowCoverStudio(true))}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.07] px-3 py-2.5 text-xs font-semibold text-white/80 transition hover:bg-white/[0.10]"
            >
              <ImagePlus className="h-4 w-4" />
              Cover · {operationCreditLabel("cover_generation", devOn)}
            </button>
            <button
              type="button"
              onClick={guardPlanFeature("export_epub", () => setShowExport(true))}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.07] px-3 py-2.5 text-xs font-semibold text-white/80 transition hover:bg-white/[0.10]"
            >
              <FileDown className="h-4 w-4" />
              Export · {operationCreditLabel("export_package", devOn)}
            </button>
            <button
              type="button"
              onClick={guardPlanFeature("kdp_market_base", () => navigate("/kdp-launch"))}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.07] px-3 py-2.5 text-xs font-semibold text-white/80 transition hover:bg-white/[0.10]"
            >
              <Rocket className="h-4 w-4" />
              KDP · {operationCreditLabel("kdp_market", devOn)}
            </button>
          </div>

          <div className="scriptora-horror-room-ledger grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
            <button type="button" onClick={() => setShowProjects(true)} className="scriptora-horror-ledger-plaque">
              <span>Stato workspace</span>
              <strong>{activeRun ? t("live") : t("ready")}</strong>
              <small>{activeRun ? t("generation_running") : t("stable")}</small>
            </button>
            <button type="button" onClick={() => setShowProjects(true)} className="scriptora-horror-ledger-plaque">
              <span>Bozze</span>
              <strong>{draftProjects.length.toLocaleString()}</strong>
              <small>In corso</small>
            </button>
            <button type="button" onClick={() => setShowLibrary(true)} className="scriptora-horror-ledger-plaque">
              <span>Biblioteca</span>
              <strong>{completedProjects.length.toLocaleString()}</strong>
              <small>Manoscritti</small>
            </button>
            <button type="button" onClick={() => navigate("/usage")} className="scriptora-horror-ledger-plaque">
              <span>Crediti disponibili</span>
              <strong>{creditBalanceLabel}</strong>
              <small>Uso progetto: {creditUsedLabel}</small>
            </button>
            <button type="button" onClick={() => navigate("/usage")} className="scriptora-horror-ledger-plaque">
              <span>Consumo oggi</span>
              <strong>{formatCredits(todayCreditEstimate)}</strong>
              <small>Stimato da attivita libro</small>
            </button>
            <button type="button" onClick={() => navigate("/pricing")} className="scriptora-horror-ledger-plaque">
              <span>Piano attivo</span>
              <strong>{planDisplayLabel}</strong>
              <small>{devOn ? "Non wallet reale" : "Policy corrente"}</small>
            </button>
          </div>
        </div>
      </div>
    </section>
  );

  const cards = [
    { id: "writer_studio", group: "writer", icon: BookOpen, title: t("writer_studio_title"), desc: t("writer_studio_desc"), iconBg: "ios-icon-violet", action: () => goApp(), tag: t("os_tag_write"), emphasis: true },
    { id: "story_architect", group: "writer", icon: Plus, title: freeBookUsed ? t("free_book_used") : t("story_architect_title"), desc: freeBookUsed ? t("upgrade_more_books") : t("story_architect_desc"), iconBg: freeBookUsed ? "ios-icon-slate" : "ios-icon-green", action: () => openLaunchModal("manual"), feature: "book_engine_full" as const, tag: t("os_tag_plan") },
    { id: "manuscript_lab", group: "writer", icon: Wand2, title: t("manuscript_lab_title"), desc: t("manuscript_lab_desc"), iconBg: "ios-icon-teal", action: () => setShowManuscriptAnalyzer(true), feature: "chapter_improvement" as const, tag: t("os_tag_score") },
    { id: "rewrite_studio", group: "writer", icon: Sparkles, title: t("rewrite_studio"), desc: t("rewrite_studio_desc"), iconBg: "ios-icon-pink", action: openRewriteStudio, feature: "chapter_rewrite" as const, tag: t("os_tag_rewrite") },
    { id: "character_studio", group: "writer", icon: Users, title: t("character_studio_title"), desc: t("character_studio_desc"), iconBg: "ios-icon-pink", action: () => setShowCharacterStudio(true), feature: "book_engine_full" as const, tag: t("os_tag_cast") },
    { id: "voice_studio", group: "writer", icon: AudioLines, title: "Voice Studio", desc: "Hear your story breathe with cinematic narration.", iconBg: "ios-icon-cyan", action: () => setShowVoiceStudio(true), feature: "book_engine_full" as const, tag: "IMMERSIVE", emphasis: true },
    { id: "notes", group: "writer", icon: NotebookPen, title: t("block_notes"), desc: t("notepad_premium_desc"), iconBg: "ios-icon-yellow", action: () => setShowNotepad(true), tag: t("os_tag_notes") },

    { id: "bestseller_engine", group: "bestseller", icon: Flame, title: t("bestseller_engine_title"), desc: t("bestseller_engine_desc"), iconBg: "ios-icon-blue", action: () => openLaunchModal("advanced"), emphasis: true, tag: t("os_tag_launch") },
    { id: "kdp_launch", group: "bestseller", icon: Rocket, title: t("kdp_intelligence_title"), desc: t("kdp_intelligence_desc"), iconBg: "ios-icon-violet", action: () => navigate("/kdp-launch"), feature: "kdp_market_base" as const, tag: t("os_tag_market") },
    { id: "title_intelligence", group: "bestseller", icon: Zap, title: t("title_intelligence"), desc: t("title_premium_desc"), iconBg: "ios-icon-teal", action: () => setShowTitleIntel(true), feature: "title_intelligence_base" as const, tag: t("os_tag_titles") },
    { id: "bestseller_radar", group: "bestseller", icon: TrendingUp, title: "Bestseller Radar", desc: t("radar_premium_desc"), iconBg: "ios-icon-green", action: () => navigate("/bestseller-radar"), feature: "trending_niches_limited" as const, tag: t("os_tag_signal") },
    { id: "keyword_gold", group: "bestseller", icon: BarChart3, title: "Keyword Gold", desc: t("keyword_premium_desc"), iconBg: "ios-icon-yellow", action: () => navigate("/keyword-gold"), feature: "kdp_market_base" as const, tag: t("os_tag_metadata") },

    { id: "cover_studio", group: "publishing", icon: ImagePlus, title: t("cover_studio"), desc: t("cover_studio_desc"), iconBg: "ios-icon-blue", action: () => setShowCoverStudio(true), feature: "cover_studio_template" as const, tag: t("os_tag_cover") },
    { id: "export_studio", group: "publishing", icon: FileDown, title: t("export_studio_title"), desc: t("export_studio_desc"), iconBg: "ios-icon-orange", action: () => setShowExport(true), feature: "export_epub" as const, tag: t("os_tag_export") },
    { id: "completed_shelf", group: "publishing", icon: Library, title: t("completed_shelf_title"), desc: t("library_premium_desc"), iconBg: "ios-icon-green", action: () => setShowLibrary(true), feature: "export_epub" as const, tag: t("os_tag_archive") },

    { id: "author_identity", group: "system", icon: Users, title: t("author_identity"), desc: t("author_identity_premium_desc"), iconBg: "ios-icon-blue", action: () => setShowAuthorIdentity(true), feature: "book_engine_full" as const, tag: t("os_tag_identity") },
    { id: "atmosphere", group: "system", icon: Settings, title: t("background_atmosphere"), desc: t("atmosphere_premium_desc"), iconBg: "ios-icon-slate", action: () => setShowAdvancedSettings(true), feature: "book_engine_full" as const, tag: t("os_tag_space") },
    { id: "drafts", group: "system", icon: FolderOpen, title: t("drafts_shelf_title"), desc: t("projects_premium_desc"), iconBg: "ios-icon-cyan", action: () => setShowProjects(!showProjects), feature: "book_engine_full" as const, tag: t("os_tag_library") },
    { id: "settings", group: "system", icon: Settings, title: t("settings"), desc: t("settings_premium_desc"), iconBg: "ios-icon-yellow", action: () => setShowAdvancedSettings(true), feature: "book_engine_full" as const, tag: t("os_tag_control") },
  ];

  const cardGroups = [
    { id: "writer", title: t("writer_os"), desc: "Scrittura, rewrite, personaggi, voce e note attorno al libro.", icon: BookOpen, tone: "from-sky-300/18 to-cyan-300/8" },
    { id: "bestseller", title: "Market OS", desc: "Mercato, titoli, keyword e segnali commerciali dietro il progetto.", icon: TrendingUp, tone: "from-emerald-300/18 to-lime-300/8" },
    { id: "publishing", title: "Publish OS", desc: "Cover, export e scaffale finale quando il manoscritto e pronto.", icon: FileDown, tone: "from-amber-300/18 to-orange-300/8" },
    { id: "system", title: t("system_os"), desc: "Identita autore, ambiente, libreria e controlli di Scriptora.", icon: Settings, tone: "from-violet-300/18 to-fuchsia-300/8" },
  ];

  return (
    <div className="scriptora-feature-page scriptora-world-shell relative" data-atmosphere-world={profileId}>
      <header className="scriptora-world-topbar z-20 shrink-0 border-b border-white/10 bg-background/[0.55] backdrop-blur-2xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            <button
              onClick={() => {
                const now = Date.now();
                const recent = [...logoClicks.filter(t => now - t < 1500), now];
                if (recent.length >= 3) {
                  setLogoClicks([]);
                  if (!isDevMode()) {
                    enableDevMode();
                    toast.success(t("toast_dev_enabled"));
                  }
                  navigate("/usage");
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
              className="group flex items-center gap-2 text-sm select-none"
              title="SCRIPTORA"
            >
              <span className="ios-icon ios-icon-blue h-9 w-9 transition-transform group-hover:scale-[1.03]">
                <BookOpen className="h-3.5 w-3.5" />
              </span>
              <span className="hidden text-[13px] font-bold text-foreground sm:inline">SCRIPTORA</span>
            </button>

            <div className="hidden h-5 w-px bg-white/10 sm:block" />
            <span className="hidden items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.07] px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground sm:inline-flex">
              <HomeIcon className="h-3 w-3" />
              {t("studio")}
            </span>

            {user && (
              <>
                <button
                  onClick={() => navigate("/pricing")}
                  title={displayName}
                  className="ml-1 flex h-8 min-w-0 shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] pl-1 pr-2 transition-colors hover:bg-white/[0.12]"
                >
                  <Avatar className="h-6 w-6">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                    <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-[120px] truncate text-[11px] font-medium text-foreground lg:inline">
                    {displayName}
                  </span>
                </button>
                <button
                  onClick={async () => {
                    try {
                      await signOut();
                      toast.success(t("toast_signed_out"));
                    } catch { /* noop */ }
                    navigate("/auth");
                  }}
                  title={t("toast_signed_out")}
                  className="ios-toolbar-button h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
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
                  className="hidden h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-slate-950 transition-opacity hover:opacity-90 md:flex"
                  title="Dev Dashboard"
                >
                  <BarChart3 className="h-3.5 w-3.5" /> DEV
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
              className="flex h-8 max-w-[150px] shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.07] px-2 text-xs text-foreground"
              title={`${t("author_identity")}: ${activeAuthor.penName}`}
            >
              <Fingerprint className="h-3.5 w-3.5 shrink-0 text-sky-300" />
              <select
                aria-label={t("author_identity")}
                value={activeAuthor.id}
                onChange={(e) => changeAuthorIdentity(e.target.value)}
                className="min-w-0 max-w-[108px] cursor-pointer appearance-none bg-transparent text-[11px] font-semibold text-foreground outline-none sm:max-w-[132px]"
              >
                {authorIdentities.map((identity) => (
                  <option key={identity.id} value={identity.id}>
                    {identity.penName}
                  </option>
                ))}
              </select>
            </div>
            <FocusMusicControl />
            <button
              type="button"
              onClick={() => setShowAuthorIdentity(true)}
              className="ios-toolbar-button h-8 w-8 text-sky-200"
              title={t("author_identity")}
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="ios-toolbar-button h-8 w-8 px-0 text-xs font-medium min-[420px]:w-auto min-[420px]:px-3"
              >
                <Globe className="h-3.5 w-3.5" /> <span className="hidden min-[420px]:inline">{currentLangLabel}</span>
              </button>
              {showLangMenu && (
                <>
                  <div className="fixed inset-0" onClick={() => setShowLangMenu(false)} />
                  <div className="ios-glass absolute right-0 z-50 mt-1 w-40 rounded-lg py-1">
                    {UI_LANGUAGES.map(lang => (
                      <button key={lang.value} onClick={() => changeLang(lang.value)}
                        className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-muted/50 ${
                          lang.value === currentLang ? "font-medium text-primary" : "text-foreground"
                        }`}>
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="scriptora-feature-scroll scriptora-world-main relative mx-auto w-full max-w-7xl px-4 pb-8 pt-4 sm:px-6 sm:pt-8 lg:px-8">
        <div className="scriptora-dashboard-hero-shell mb-4 grid gap-3 sm:mb-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
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
                  {tt("plan_active_sentence", { plan: planDisplayLabel })}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <button
                  onClick={() => openLaunchModal("quick")}
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
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowProjects(true)}
                className="rounded-xl border border-white/15 bg-white/[0.10] p-3 text-left shadow-[0_10px_28px_rgba(0,0,0,0.14)] transition-colors hover:border-sky-300/45 hover:bg-sky-400/14"
              >
                <p className="text-[10px] uppercase text-muted-foreground">{t("drafts")}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{draftProjects.length}</p>
              </button>
              <button
                onClick={() => setShowLibrary(true)}
                className="rounded-xl border border-white/15 bg-white/[0.10] p-3 text-left shadow-[0_10px_28px_rgba(0,0,0,0.14)] transition-colors hover:border-emerald-300/45 hover:bg-emerald-400/14"
              >
                <p className="text-[10px] uppercase text-muted-foreground">{t("library")}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{completedProjects.length}</p>
              </button>
            </div>
          </section>
        </div>

        <div className="scriptora-in-progress-shell">
          <InProgressSection refreshKey={projects.length + (activeRun ? 1 : 0)} />
        </div>

        {manuscriptCore}

        <section className="scriptora-mobile-status-shell mb-4 xl:hidden">
          <button
            type="button"
            onClick={() => setShowMobileStats((value) => !value)}
            className="ios-panel flex w-full items-center justify-between gap-3 border-white/15 bg-slate-950/30 p-3 text-left shadow-[0_12px_36px_rgba(0,0,0,0.16)] backdrop-blur-2xl"
            aria-expanded={showMobileStats}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="ios-icon ios-icon-blue h-10 w-10 shrink-0 rounded-[16px]">
                <BarChart3 className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-5 text-white">{t("mobile_status_summary")}</span>
                <span className="mt-0.5 block truncate text-[11px] font-medium text-white/62">
                  {projects.length.toLocaleString()} {t("projects").toLowerCase()} · {draftProjects.length.toLocaleString()} {t("drafts").toLowerCase()}
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
              <span className="hidden rounded-lg border border-white/10 bg-white/[0.07] px-2 py-1 text-[10px] font-semibold text-white/70 min-[420px]:inline">
                {showMobileStats ? t("hide_metrics") : t("show_metrics")}
              </span>
              <ArrowRight className={`h-4 w-4 text-white/55 transition-transform ${showMobileStats ? "rotate-90" : ""}`} />
            </span>
          </button>

          {showMobileStats && (
            <div className="mt-2 space-y-2 rounded-2xl border border-white/15 bg-slate-950/28 p-2 shadow-[0_16px_44px_rgba(0,0,0,0.18)] backdrop-blur-2xl">
              <div className="grid grid-cols-2 gap-2">
                {dashboardWidgets.slice(0, 4).map((widget) => (
                  <button
                    key={widget.label}
                    type="button"
                    onClick={widget.action}
                    className={`rounded-xl border border-white/12 bg-gradient-to-br ${widget.tone} p-2.5 text-left`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[9px] font-bold uppercase tracking-[0.13em] text-white/55">{widget.label}</span>
                      <widget.icon className="h-3.5 w-3.5 shrink-0 text-white/75" />
                    </span>
                    <span className="mt-1 block truncate text-sm font-semibold text-white">{widget.value}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-white/58">{widget.detail}</span>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {workspaceStats.map((stat) => (
                  <button
                    key={stat.label}
                    type="button"
                    onClick={() => stat.label === t("completed") ? setShowLibrary(true) : setShowProjects(true)}
                    className="rounded-xl border border-white/12 bg-white/[0.07] p-2 text-center"
                  >
                    <span className="block truncate text-[8px] font-semibold uppercase text-white/48">{stat.label}</span>
                    <span className="mt-0.5 block text-sm font-semibold tabular-nums text-white">{stat.value}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {focusAtmosphereCard}

        <div className="scriptora-dashboard-widget-grid mb-5 sm:mb-7">

          {dashboardWidgets.map((widget) => (
            <button
              key={widget.label}
              type="button"
              onClick={widget.action}
              className={`group relative min-h-[104px] overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br ${widget.tone} p-3 text-left shadow-[0_14px_44px_rgba(0,0,0,0.18)] backdrop-blur-2xl transition-all duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.10] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50`}
            >
              <div className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent opacity-60" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/58">{widget.label}</p>
                  <p className="mt-2 truncate text-lg font-semibold leading-6 text-white sm:text-xl">{widget.value}</p>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.10] text-white/85 shadow-lg shadow-black/20 transition-transform group-hover:scale-105">
                  <widget.icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-[11px] font-medium leading-4 text-white/66">{widget.detail}</p>
            </button>
          ))}
        </div>

        <div className="hidden">
          {workspaceStats.map((stat) => (
              <div key={stat.label} className="ios-glass-soft rounded-[24px] border-white/15 bg-white/[0.08] p-3 shadow-[0_16px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5">
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
              </div>
          ))}
        </div>

        <section data-atmosphere-zone="world-orbit" className="scriptora-world-orbit mb-10">
          <div className="scriptora-world-heading mb-4 flex flex-col gap-3 rounded-[24px] border border-white/10 bg-white/[0.026] p-4 shadow-[0_16px_52px_rgba(0,0,0,0.18)] backdrop-blur-2xl sm:flex-row sm:items-end sm:justify-between sm:p-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{worldScene.orbitLabel}</p>
              <h2 className="mt-1 text-xl font-semibold text-white drop-shadow-[0_1px_12px_rgba(0,0,0,0.38)]">{themeCopy.osTitle}</h2>
              <p className="mt-1 max-w-xl text-sm font-medium leading-6 text-white/64">{themeCopy.osDescription}</p>
              <p className="mt-2 max-w-2xl text-xs leading-5 text-white/42">{worldScene.description}</p>
            </div>
            <span className="hidden text-[11px] text-muted-foreground sm:inline">
              {tt("total_suffix", { count: projects.length, plan: planLabel })}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {cardGroups.map((group) => {
              const groupCards = cards.filter((card) => card.group === group.id);
              const GroupIcon = group.icon;
              const isOpen = expandedOsFolder === group.id;
              const groupCopy = themeCopy.groups[group.id] || { title: group.title, desc: group.desc };
              return (
                <div
                  key={group.id}
                  data-atmosphere-group={group.id}
                  data-atmosphere-room={groupCopy.room || group.id}
                  data-atmosphere-object={groupCopy.object || groupCopy.title}
                  className={`scriptora-os-folder relative overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br ${group.tone} shadow-[0_18px_58px_rgba(0,0,0,0.20)] backdrop-blur-xl ${isOpen ? "is-open sm:col-span-2 xl:col-span-4" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedOsFolder(isOpen ? null : group.id)}
                    className="scriptora-room-trigger flex min-h-[142px] w-full flex-col justify-between p-4 text-left sm:p-5"
                    aria-expanded={isOpen}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="scriptora-room-sigil ios-icon ios-icon-blue h-12 w-12 rounded-[18px]">
                        <GroupIcon className="h-5 w-5" />
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/62">
                        {groupCards.length} tool
                        <ArrowRight className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                      </span>
                    </span>
                    <span className="mt-5 block">
                      <span className="block text-lg font-semibold text-white">{groupCopy.title}</span>
                      {groupCopy.object && (
                        <span className="scriptora-room-object-label mt-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/44">{groupCopy.object}</span>
                      )}
                      <span className="mt-1 block text-xs leading-5 text-white/62">{groupCopy.desc}</span>
                    </span>
                  </button>

                  {isOpen && (
                    <div className="scriptora-launchpad-grid scriptora-world-room-grid grid grid-cols-1 gap-2 border-t border-white/10 bg-slate-950/20 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                      {groupCards.map(card => {
                        const Icon = card.icon;
                        const moduleCopy = themeCopy.modules[card.id] || {};
                        const cardTitle = moduleCopy.title || card.title;
                        const cardDesc = moduleCopy.desc || card.desc;
                        const cardTag = moduleCopy.tag || (card as any).tag;
                        const inner = (
                          <button
                            key={card.id}
                            onClick={card.action}
                            data-atmosphere-module={card.id}
                            data-atmosphere-form={moduleCopy.form || "station"}
                            data-atmosphere-room={moduleCopy.room || group.id}
                            data-atmosphere-object={moduleCopy.object || cardTitle}
                            className="scriptora-world-module group relative flex min-h-[118px] w-full flex-col overflow-hidden rounded-[18px] border border-white/10 bg-slate-950/32 p-3 text-left ring-1 ring-white/[0.03] transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 motion-safe:hover:-translate-y-0.5"
                          >
                            <span className="scriptora-module-object-marker" aria-hidden="true" />
                            <div className="relative z-10 flex items-start justify-between gap-3">
                              <span className={`ios-icon ${card.iconBg} flex h-10 w-10 items-center justify-center rounded-[15px] shadow-[0_12px_32px_rgba(0,0,0,0.18)] ring-1 ring-white/10`}>
                                <Icon className="h-4 w-4" />
                              </span>
                              {cardTag && (
                                <span className="rounded-full border border-white/10 bg-white/[0.08] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/55 transition-colors group-hover:text-white">
                                  {cardTag}
                                </span>
                              )}
                            </div>

                            <div className="relative z-10 mt-3">
                              <h3 className="text-sm font-semibold leading-5 text-white">{cardTitle}</h3>
                              <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-300">{cardDesc}</p>
                              {moduleCopy.object && (
                                <p className="scriptora-module-object-copy mt-2 line-clamp-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-white/42">{moduleCopy.object}</p>
                              )}
                            </div>

                            <div className="relative z-10 mt-auto flex items-center justify-between gap-3 pt-3">
                              <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400 transition-colors group-hover:text-white/75">
                                {t("open_studio")}
                              </span>
                              <ArrowRight className="h-3.5 w-3.5 text-white/72" />
                            </div>
                          </button>
                        );
                        return (card as any).feature
                          ? <PaywallGuard key={card.id} feature={(card as any).feature} compact>{inner}</PaywallGuard>
                          : <div key={card.id}>{inner}</div>;
                      })}
                    </div>
                  )}
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
              onClick={() => setShowBetaDialog(true)}
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
      <AdvancedAppearanceDialog open={showAdvancedSettings} onClose={() => setShowAdvancedSettings(false)} />
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
            showPrimaryAction={Boolean(lastProject)}
            primaryActionLabel="Salva nel progetto"
            onGenerate={(dataUrl) => {
              if (!lastProject) return;
              const updatedProject: BookProject = {
                ...lastProject,
                coverDataUrl: dataUrl,
                coverUpdatedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              setProjects((items) => items.map((project) => project.id === updatedProject.id ? updatedProject : project));
              saveProject(updatedProject);
              saveProjectAsync(updatedProject).catch(() => toast.warning(t("toast_saved_locally")));
              toast.success("Cover salvata nel progetto.");
              setShowCoverStudio(false);
            }}
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
      {showVoiceStudio && (
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
      )}

      {showProjects && (() => {
        const drafts = draftProjects;
        return (
          <div
            className="scriptora-modal-overlay"
            data-atmosphere-zone="world-modal"
            onClick={() => setShowProjects(false)}
          >
            <div
              className="scriptora-modal-panel ios-panel max-w-2xl animate-scriptora-dialog-entrance"
              data-atmosphere-zone="world-modal-panel"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="scriptora-modal-body p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                    {tt("my_projects_drafts", { count: drafts.length })}
                  </p>
                  <h2 className="text-xl font-semibold text-foreground">{t("drafts_shelf_title")}</h2>
                </div>
                <button
                  onClick={() => setShowProjects(false)}
                  className="rounded-md px-3 py-2 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted/50"
                >
                  {t("close")}
                </button>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">{t("projects_modal_subtitle")}</p>
              {drafts.length === 0 && (
                <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs text-muted-foreground/70">
                  {t("no_drafts_library_hint")}
                </p>
              )}
              <div className="space-y-3">
                {drafts.map(p => (
                  <button key={p.id}
                    type="button"
                    onClick={() => goApp({ projectId: p.id })}
                    className="group flex w-full items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm text-foreground transition hover:border-white/20 hover:bg-white/[0.08]"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{p.config.title || t("untitled")}</span>
                      <span className="text-[10px] text-muted-foreground/70">{p.config.genre} · {p.chapters?.length || 0} ch · {p.phase}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                      className="rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-destructive transition hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </button>
                ))}
              </div>
              </div>
            </div>
          </div>
        );
      })()}

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
          data-atmosphere-zone="world-modal"
          onClick={() => setShowLibrary(false)}
        >
          <div
            className="scriptora-modal-panel ios-panel max-w-2xl animate-scriptora-dialog-entrance"
            data-atmosphere-zone="world-modal-panel"
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
              onOpen={(id) => { setShowLibrary(false); goApp({ projectId: id }); }}
              onDelete={handleDelete}
              onExport={() => { setShowLibrary(false); setShowExport(true); }}
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
