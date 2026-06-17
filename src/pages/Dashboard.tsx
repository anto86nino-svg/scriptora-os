import { useLocation, useNavigate } from "react-router-dom";
import { lazy, Suspense, useState, useEffect, useMemo } from "react";
import { loadProjects, deleteProjectAsync, getLastProjectId, getCurrentUserId, setLastProjectId } from "@/services/storageService";
import { isProjectComplete } from "@/lib/project-status";
import { SCRIPTORA_CHARACTER_BIBLE_KEY, SCRIPTORA_CHARACTER_PROJECT_KEY } from "@/lib/character-studio-keys";
const HomeExportDialog = lazy(() =>
  import("@/components/HomeExportDialog").then((m) => ({ default: m.HomeExportDialog })),
);
const TitleIntelligenceDialog = lazy(() =>
  import("@/components/TitleIntelligenceDialog").then((m) => ({ default: m.TitleIntelligenceDialog })),
);
const AdvancedAppearanceDialog = lazy(() =>
  import("@/components/AdvancedAppearanceDialog").then((m) => ({ default: m.AdvancedAppearanceDialog })),
);
const CharacterStudioDialog = lazy(() =>
  import("@/components/CharacterStudioDialog").then((m) => ({ default: m.CharacterStudioDialog })),
);
const ManuscriptAnalyzerDialog = lazy(() =>
  import("@/components/ManuscriptAnalyzerDialog").then((m) => ({ default: m.ManuscriptAnalyzerDialog })),
);
const NotepadDialog = lazy(() =>
  import("@/components/NotepadDialog").then((m) => ({ default: m.NotepadDialog })),
);
const AuthorIdentityDialog = lazy(() =>
  import("@/components/AuthorIdentityDialog").then((m) => ({ default: m.AuthorIdentityDialog })),
);
import { FocusMusicControl } from "@/components/FocusMusicControl";
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
  CheckCircle2, NotebookPen, Fingerprint, ImagePlus
} from "lucide-react";
import { BOOK_LENGTH_CONFIG, BookConfig, BookLength, BookProject, DEFAULT_SUBCHAPTERS_PER_CHAPTER } from "@/types/book";
import { normalizeBookConfig } from "@/lib/book-config-studio/defaults";
import type { StudioLaunchPayload } from "@/lib/book-config-studio/types";
import { buildBookTypeLock as buildGenreLock } from "@/lib/book-type-engine";
import { runGenerateBlueprint } from "@/lib/generation-runtime";
import { t, tt, getUILanguage, setUILanguage, UI_LANGUAGES, UILanguage, useUILanguage } from "@/lib/i18n";
import {
  AUTHOR_IDENTITY_CHANGED_EVENT,
  applyAuthorIdentityToConfig,
  generateAuthorIdentityDraft,
  getSelectedAuthorIdentity,
  loadAuthorIdentities,
  setSelectedAuthorIdentityId,
} from "@/lib/author-identity";
import { DevModeUnlockDialog } from "@/components/DevModeUnlockDialog";
import { enableDevMode, isDevMode, exitDevMode, useDevMode } from "@/lib/dev-mode";
import { BetaActivationDialog } from "@/components/BetaActivationDialog";
import { fetchPlan, usePlan } from "@/lib/plan";
import { refreshPaymentStatus } from "@/lib/payments/checkout";
import { canUseFeature, type FeatureKey } from "@/lib/subscription";
import { FlaskConical } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { WalletScriptoraCard } from "@/components/billing/WalletScriptoraCard";
import { GlobalCreditBar } from "@/components/billing/GlobalCreditBar";
import { AuthSessionButton } from "@/components/auth/AuthSessionButton";
import { CreditCostBadge } from "@/components/billing/CreditCostBadge";
import type { ForgePreset } from "@/lib/scriptora-forge/forge-presets";
import { ONE_FLOW_TOOL_ROLES } from "@/lib/one-flow/one-flow-tool-roles";
import { DashboardHomePillars } from "@/components/one-flow/DashboardHomePillars";
import { DashboardPackagingRow } from "@/components/one-flow/DashboardPackagingRow";
import { DashboardAdvancedToolsPanel } from "@/components/one-flow/DashboardAdvancedToolsPanel";
import { DedicatedToolScreen } from "@/components/one-flow/DedicatedToolScreen";
import type { DashboardActionContext } from "@/lib/one-flow/dashboard-home-actions";
import { OsHomeHero } from "@/components/os/OsHomeHero";
import {
  MobileDashboardCreditPill,
  MobileDashboardMoreMenu,
} from "@/components/mobile/MobileDashboardChrome";
import { ScriptoraSettingsButton } from "@/components/settings/ScriptoraSettingsButton";
import { ScriptoraAliveTransition } from "@/components/boot/ScriptoraAliveTransition";

const ScriptoraSettingsHub = lazy(() =>
  import("@/components/settings/ScriptoraSettingsHub").then((m) => ({ default: m.ScriptoraSettingsHub })),
);
import { MobileBookForge } from "@/mobile/MobileBookForge";
import { getBookTypeLabel } from "@/components/BookTypeBadge";
import {
  ProfileMenuDialog,
  isAdvancedLaunchpadEnabled,
  setAdvancedLaunchpadEnabled,
} from "@/components/one-flow/ProfileMenuDialog";

interface DetectedIntent {
  genre: string;
  subcategory: string;
  level: "beginner" | "intermediate" | "advanced";
  readerPromise: string;
  targetAudience: string;
  tone: string;
  numberOfChapters: number;
  suggestedTitles: string[];
  suggestedSubtitles: string[];
  bestTitleIndex: number;
}


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

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const devOn = useDevMode();
  const [showProjects, setShowProjects] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showTitleIntel, setShowTitleIntel] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showSettingsHub, setShowSettingsHub] = useState(false);
  const [showCharacterStudio, setShowCharacterStudio] = useState(false);
  const [showManuscriptAnalyzer, setShowManuscriptAnalyzer] = useState(false);
  const [showNotepad, setShowNotepad] = useState(false);
  const [showAuthorIdentity, setShowAuthorIdentity] = useState(false);
  const [authorIdentityPrefill, setAuthorIdentityPrefill] = useState<import("@/types/book").AuthorIdentity | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showIdeaModal, setShowIdeaModal] = useState(false);
  const [showBookCreationWizard, setShowBookCreationWizard] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAdvancedLaunchpad, setShowAdvancedLaunchpad] = useState(() => isAdvancedLaunchpadEnabled());
  const [projects, setProjects] = useState<BookProject[]>([]);
  const [flowProjectId, setFlowProjectId] = useState<string | null>(null);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showMobileMoreMenu, setShowMobileMoreMenu] = useState(false);
  const currentLang = useUILanguage();
  const [activeRun, setActiveRun] = useState<{ runId: string; title: string; startedAt: number } | null>(null);

  // One-click idea state
  const [idea, setIdea] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [intent, setIntent] = useState<DetectedIntent | null>(null);
  const [launching, setLaunching] = useState(false);
  const [showDevUnlock, setShowDevUnlock] = useState(false);
  const [showBetaDialog, setShowBetaDialog] = useState(false);
  const { plan: currentPlan, refresh: refreshPlan } = usePlan();
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
    loadProjects((fresh) => setProjects(fresh)).then(setProjects);
    try {
      const raw = sessionStorage.getItem("scriptora-active-run");
      if (raw) setActiveRun(JSON.parse(raw));
    } catch { /* noop */ }

    // Re-load when DEV MODE is toggled — projects are scoped per environment.
    const onDevChange = () => {
      setProjects([]);
      setActiveRun(null);
      loadProjects((fresh) => setProjects(fresh)).then(setProjects);
    };
    window.addEventListener("scriptora-dev-mode-change", onDevChange);
    return () => window.removeEventListener("scriptora-dev-mode-change", onDevChange);
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
      showIdeaModal ? "idea" :
      showBookCreationWizard ? "newbook" :
      showAuthorIdentity ? "author" :
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
    showDevUnlock,
    showExport,
    showIdeaModal,
    showLibrary,
    showManuscriptAnalyzer,
    showBookCreationWizard,
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

    // Single creation flow: every "new book" entrypoint opens Scriptora Forge.
    // The legacy wizard remains available only inside Forge after DNA confirmation.
    setShowBookCreationWizard(true);
  };

  useEffect(() => {
    const onAdvancedChange = () => setShowAdvancedLaunchpad(isAdvancedLaunchpadEnabled());
    window.addEventListener("scriptora-advanced-mode-change", onAdvancedChange);
    return () => window.removeEventListener("scriptora-advanced-mode-change", onAdvancedChange);
  }, []);

  const guardPlanFeature = (feature: FeatureKey, action: () => void) => () => {
    if (!canUseFeature(currentPlan, feature)) {
      toast.error(t("unlock_pro"));
      navigate("/pricing");
      return;
    }
    action();
  };

  const openCoverStudioPage = () => {
    const projectId = dashboardContextProject?.id || lastProject?.id || getLastProjectId();
    if (projectId) setLastProjectId(projectId);
    navigate("/cover", { state: projectId ? { projectId } : undefined });
  };

  useEffect(() => {
    const state = location.state as {
      openWizard?: boolean;
      openNewBook?: boolean;
      openForge?: boolean;
      openProjects?: boolean;
      openCover?: boolean;
      openExport?: boolean;
      projectId?: string;
    } | null;
    if (!state) return;
    if (state.projectId) {
      setFlowProjectId(state.projectId);
      setLastProjectId(state.projectId);
    }
    if (state.openForge || state.openWizard || state.openNewBook) openNewBookGuarded();
    if (state.openProjects) setShowProjects(true);
    if (state.openCover) guardPlanFeature("cover_studio_template", openCoverStudioPage)();
    if (state.openExport) guardPlanFeature("export_epub", () => setShowExport(true))();
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const payment = params.get("payment");
    if (payment !== "success") return;

    const sessionId = params.get("session_id");
    let cancelled = false;

    (async () => {
      for (let attempt = 0; attempt < 6; attempt++) {
        if (cancelled) return;
        const status = await refreshPaymentStatus(sessionId);
        if (status.ok && status.plan && status.plan !== "free" && !status.pending) {
          await fetchPlan();
          refreshPlan();
          toast.success(t("payment_success_title"), {
            description: t("payment_success_desc"),
          });
          navigate(location.pathname, { replace: true });
          return;
        }
        await new Promise((r) => setTimeout(r, 1200));
      }
      if (!cancelled) {
        await fetchPlan();
        refreshPlan();
        toast.success(t("payment_success_title"), {
          description: t("payment_success_desc"),
        });
        navigate(location.pathname, { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.search, location.pathname, navigate, refreshPlan]);

  const lastId = getLastProjectId();
  // Only surface "continue last" when the project still belongs to the active
  // environment (DEV vs USER). Cross-scope ids are silently ignored.
  const openForgePreset = (preset: ForgePreset) => {
    try {
      sessionStorage.setItem("scriptora-forge-selected-preset", JSON.stringify(preset));
      toast.success(`${preset.label}: preset preparato.`);
    } catch {
      toast.message(`${preset.label}: preset selezionato.`);
    }
    openNewBookGuarded();
  };

  const lastProject = lastId ? projects.find(p => p.id === lastId) : null;
  const flowProject = flowProjectId ? projects.find((p) => p.id === flowProjectId) : null;
  const dashboardContextProject = flowProject || lastProject;

  const deleteHomeProject = async (projectId: string, title?: string) => {
    const name = title || t("this_project");
    const ok = window.confirm(tt("confirm_delete_project", { name }));
    if (!ok) return;

    await deleteProjectAsync(projectId);
    setProjects((items) => items.filter((p) => p.id !== projectId));
    try {
      if (getLastProjectId() === projectId) setLastProjectId("");
      sessionStorage.removeItem("scriptora-open-project");
    } catch {}
    window.dispatchEvent(new Event("scriptora-projects-change"));
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

  const openAuthorIdentity = (prefill?: import("@/types/book").AuthorIdentity | null) => {
    setAuthorIdentityPrefill(prefill || null);
    setShowAuthorIdentity(true);
  };

  const handleGenerateAuthorWithAi = () => {
    const now = new Date().toISOString();
    openAuthorIdentity({
      id: `custom-${(
typeof crypto !== "undefined" &&
typeof crypto.randomUUID === "function"
? crypto.randomUUID()
: `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
)}`,
      name: "Il mio profilo autore",
      realName: "",
      penName: "",
      copyrightName: "",
      language: "Italian",
      createdAt: now,
      updatedAt: now,
      ...generateAuthorIdentityDraft(),
    } as import("@/types/book").AuthorIdentity);
  };

  const goApp = (opts?: { section?: string; projectId?: string; voice?: boolean }) => {
    if (opts?.projectId) sessionStorage.setItem("scriptora-open-project", opts.projectId);
    if (opts?.section) sessionStorage.setItem("scriptora-open-section", opts.section);
    if (opts?.voice) sessionStorage.setItem("scriptora-open-voice-studio", "1");
    navigate("/app");
  };

  useEffect(() => {
    const openFromCharacterStudio = () => {
      setShowCharacterStudio(false);
      openNewBookGuarded();
    };

    window.addEventListener("scriptora-open-new-book-from-character-studio", openFromCharacterStudio);
    return () => window.removeEventListener("scriptora-open-new-book-from-character-studio", openFromCharacterStudio);
  }, []);

  const mergeCharacterStudioIntoConfig = (config: BookConfig): BookConfig => {
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
          characterBibleText: String(bible || ""),
        } as BookConfig;

        toast.success(tt("characters_attached_to_novel", { genre: `${finalConfig.genre}${finalConfig.subcategory ? " / " + finalConfig.subcategory : ""}` }));
      }
    } catch {
      finalConfig = config;
    }

    return applyAuthorIdentityToConfig(normalizeBookConfig(finalConfig), activeAuthor) as BookConfig;
  };

  const handleNewBook = (config: BookConfig) => {
    const finalConfig = mergeCharacterStudioIntoConfig(config);
    setSelectedAuthorIdentityId(activeAuthor.id);
    sessionStorage.setItem("scriptora-new-book", JSON.stringify({ mode: "legacy", config: finalConfig }));
    setShowBookCreationWizard(false);
    navigate("/app");
  };

  const handleStudioComplete = (payload: StudioLaunchPayload) => {
    const finalConfig = mergeCharacterStudioIntoConfig(payload.config);
    setSelectedAuthorIdentityId(activeAuthor.id);
    sessionStorage.setItem("scriptora-new-book", JSON.stringify({
      ...payload,
      config: finalConfig,
    }));
    setShowBookCreationWizard(false);
    navigate("/app");
  };

  const handleStudioGenerateBlueprint = async (config: BookConfig) => {
    const finalConfig = mergeCharacterStudioIntoConfig(config);
    const genreLock = buildGenreLock(finalConfig);
    const { blueprint } = await runGenerateBlueprint(finalConfig, genreLock);
    return blueprint;
  };

  const handleDelete = async (id: string) => {
    // Optimistic UI: drop from list instantly, then sync to backend.
    setProjects((prev) => prev.filter((p) => p.id !== id));
    deleteProjectAsync(id).catch(() => {
      // On failure, refetch to recover state.
      loadProjects((fresh) => setProjects(fresh)).then(setProjects);
    });
  };

  const detectIntent = async (ideaOverride?: string): Promise<DetectedIntent | null> => {
    const source = (ideaOverride ?? idea).trim();
    if (source.length < 6) return null;
    if (ideaOverride) setIdea(ideaOverride);
    setDetecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("detect-book-intent", {
        body: { idea: source, language: bookLang, userId: getCurrentUserId() },
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
      const best = Math.max(0, Math.min(2, detected.bestTitleIndex || 0));
      setIntent(detected);
      setOneClickChapters(Math.max(3, Math.min(50, Number(detected.numberOfChapters) || oneClickChapters)));
      if (!briefTitle.trim()) setBriefTitle(detected.suggestedTitles?.[best] || detected.suggestedTitles?.[0] || "");
      if (!briefSubtitle.trim()) setBriefSubtitle(detected.suggestedSubtitles?.[best] || detected.suggestedSubtitles?.[0] || "");
      return detected;
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
    if (!i) { setLaunching(false); return; }

    const best = Math.max(0, Math.min(2, i.bestTitleIndex || 0));
    const safeBookLength = currentPlan === "free" ? "short" : bookLength;
    sessionStorage.setItem(
      "scriptora-forge-brief",
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
      }),
    );
    setShowIdeaModal(false);
    openNewBookGuarded();
  };

  const heroValid = idea.trim().length >= 6;

  const currentLangLabel = UI_LANGUAGES.find(l => l.value === currentLang)?.label || "English";
  const completedProjects = projects.filter(isProjectComplete);
  const draftProjects = projects.filter((p) => !isProjectComplete(p));
  const planLabel = currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1);
  const lastProjectDoneChapters = lastProject?.chapters?.filter((chapter) => (chapter.content || "").trim().length > 50).length || 0;
  const lastProjectTargetChapters = lastProject?.config?.numberOfChapters || lastProject?.chapters?.length || 0;
  const lastProjectProgress = lastProject
    ? lastProject.phase === "complete"
      ? 100
      : lastProjectTargetChapters > 0
        ? Math.min(100, Math.round((lastProjectDoneChapters / lastProjectTargetChapters) * 100))
        : 0
    : 0;

  const dashboardActionContext = useMemo<DashboardActionContext>(
    () => ({
      hasActiveBook: Boolean(lastProject),
      onNewBook: openNewBookGuarded,
      onContinue: lastProject ? () => goApp({ projectId: lastProject.id }) : undefined,
      onOpenProjects: () => setShowProjects(true),
      onOpenLibrary: () => setShowLibrary(true),
      onOpenExport: () => guardPlanFeature("export_epub", () => setShowExport(true))(),
      onOpenCover: () => guardPlanFeature("cover_studio_template", openCoverStudioPage)(),
      onOpenTitleIntel: () => guardPlanFeature("title_intelligence_base", () => setShowTitleIntel(true))(),
      onOpenIdeaPreview: () => setShowIdeaModal(true),
      onOpenManuscriptLab: () => guardPlanFeature("chapter_improvement", () => setShowManuscriptAnalyzer(true))(),
      onOpenCharacterStudio: () => guardPlanFeature("book_engine_full", () => setShowCharacterStudio(true))(),
      onOpenAuthorIdentity: () => openAuthorIdentity(),
      onOpenNotepad: () => setShowNotepad(true),
      onNavigate: (path: string) => navigate(path),
    }),
    [lastProject, navigate],
  );

  if (showBookCreationWizard) {
    return (
      <div className="scriptora-page-scroll min-h-[100dvh] bg-background">
        <div className="sticky top-0 z-50 border-b border-white/10 bg-background/85 backdrop-blur-2xl">
          <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setShowBookCreationWizard(false)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.12]"
            >
              ← Torna alla Home
            </button>
          </div>
        </div>

        <MobileBookForge
          onClose={() => setShowBookCreationWizard(false)}
          authorIdentity={activeAuthor}
          onStudioComplete={handleStudioComplete}
          onGenerateBlueprint={handleStudioGenerateBlueprint}
        />
      </div>
    );
  }

  return (
    <div className="scriptora-ios-screen scriptora-app-surface scriptora-dashboard-mobile scriptora-page-scroll scriptora-cinematic-shell scriptora-brand-shell relative min-h-[100dvh] overflow-x-hidden safe-area-pt">
      <header className="sticky top-0 z-20 border-b border-[#f2c400]/20 bg-[#050505]/72 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-2xl safe-area-pt">
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
              <span className="h-10 w-10 overflow-hidden rounded-2xl bg-[#f2c400] shadow-[0_0_28px_rgba(242,196,0,0.28)] ring-1 ring-[#f2c400]/35 transition-transform group-hover:scale-[1.04]">
                <img
                  src="/brand/scriptora-logo.png"
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full object-cover"
                />
              </span>
              <span className="hidden text-[13px] font-black tracking-[0.18em] text-[#f2c400] sm:inline">SCRIPTORA</span>
            </button>

            <div className="hidden h-5 w-px bg-white/10 sm:block" />
            <span className="hidden items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.07] px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground sm:inline-flex">
              <HomeIcon className="h-3 w-3" />
              {t("studio")}
            </span>

            {user ? (
              <>
                <button
                  onClick={() => setShowProfileMenu(true)}
                  title={displayName}
                  className="ml-1 hidden h-8 min-w-0 shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] pl-1 pr-2 transition-colors hover:bg-white/[0.12] md:flex"
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
                <div className="hidden md:block">
                  <AuthSessionButton />
                </div>
              </>
            ) : (
              <div className="hidden md:block">
                <AuthSessionButton />
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <div className="md:hidden">
              <MobileDashboardCreditPill />
            </div>
            <ScriptoraSettingsButton onClick={() => setShowSettingsHub(true)} />
            <button
              onClick={() => navigate("/usage")}
              className="ios-toolbar-button hidden px-3 text-xs font-medium md:flex"
              title="Crediti e Utilizzo"
            >
              <BarChart3 className="h-3.5 w-3.5" /> Crediti
            </button>
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
              title={t("downloads")}
            >
              <DownloadIcon className="h-3.5 w-3.5" /> {t("downloads")}
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
              className="hidden sm:flex h-8 max-w-[150px] shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.07] px-2 text-xs text-foreground"
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
            <div className="hidden md:block">
              <FocusMusicControl />
            </div>
            <button
              type="button"
              onClick={() => setShowAuthorIdentity(true)}
              className="hidden md:inline-flex ios-toolbar-button h-8 w-8 text-sky-200"
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
            <MobileDashboardMoreMenu
              showMoreMenu={showMobileMoreMenu}
              onToggleMoreMenu={() => setShowMobileMoreMenu((open) => !open)}
              onCloseMoreMenu={() => setShowMobileMoreMenu(false)}
              onProfile={() => setShowProfileMenu(true)}
              onCoverStudio={() => guardPlanFeature("cover_studio_template", openCoverStudioPage)()}
              onExportStudio={() => guardPlanFeature("export_epub", () => setShowExport(true))()}
              onAuthorIdentity={() => openAuthorIdentity()}
              onSignOut={async () => {
                try {
                  await signOut();
                  toast.success(t("toast_signed_out"));
                } catch { /* noop */ }
                navigate("/auth");
              }}
              showUserActions={!!user}
            />
          </div>
        </div>
      </header>

      <div className="hidden border-b border-white/8 bg-background/40 md:block">
        <div className="mx-auto max-w-7xl px-3 py-2 sm:px-6 lg:px-8">
          <GlobalCreditBar variant="inline" />
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-3 sm:px-6 sm:pb-16 sm:pt-6 lg:px-8">
        <DashboardHomePillars
          onNewBook={openNewBookGuarded}
          onStudyOs={() => navigate("/study")}
        />

        <OsHomeHero
          lastProject={lastProject}
          progressPercent={lastProjectProgress}
          onContinue={() => lastProject && goApp({ projectId: lastProject.id })}
          onGenerateNextChapter={() => lastProject && goApp({ projectId: lastProject.id, section: "chapters" })}
          onExport={() => guardPlanFeature("export_epub", () => setShowExport(true))()}
          onNewBook={openNewBookGuarded}
          onMyBooks={() => setShowProjects(true)}
        />

        <section className="mb-4 flex flex-wrap gap-2 sm:mb-6">
          <button
            type="button"
            onClick={() => setShowProjects(true)}
            className="scriptora-action-tile inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2.5 text-left transition-all hover:-translate-y-0.5"
          >
            <FolderOpen className="h-4 w-4 text-white/75" />
            <span className="text-sm font-semibold text-white">I miei libri</span>
            <span className="text-xs text-white/45">
              {projects.length > 0 ? `${projects.length} progetti` : "Biblioteca vuota"}
            </span>
          </button>
          {lastProject && (
            <button
              type="button"
              onClick={() => setShowLibrary(true)}
              className="scriptora-action-tile inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2.5 text-left transition-all hover:-translate-y-0.5"
            >
              <Library className="h-4 w-4 text-white/75" />
              <span className="text-sm font-semibold text-white">Libreria</span>
              <span className="text-xs text-white/45">{completedProjects.length} completati</span>
            </button>
          )}
        </section>

        {lastProject && (
          <DashboardPackagingRow
            projectTitle={lastProject.config.title}
            context={dashboardActionContext}
          />
        )}

        <div className="mb-4 flex justify-end sm:mb-6">
          <button
            type="button"
            onClick={() => {
              setAdvancedLaunchpadEnabled(!showAdvancedLaunchpad);
              setShowAdvancedLaunchpad(!showAdvancedLaunchpad);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-white/70 transition-colors hover:bg-white/[0.10]"
          >
            <Settings className="h-3.5 w-3.5" />
            {showAdvancedLaunchpad ? "Nascondi strumenti avanzati" : "Strumenti avanzati"}
          </button>
        </div>

        {showAdvancedLaunchpad && (
          <DashboardAdvancedToolsPanel context={dashboardActionContext} />
        )}

        <InProgressSection refreshKey={projects.length + (activeRun ? 1 : 0)} />

        {projects.length === 0 && !activeRun && (
          <section className="mb-6 rounded-2xl border border-sky-300/25 bg-gradient-to-br from-sky-400/10 via-transparent to-violet-400/10 p-6 shadow-[0_16px_40px_rgba(0,0,0,0.12)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-300/80">{t("no_projects_yet")}</p>
                <h2 className="mt-1 text-xl font-bold text-foreground">{t("empty_state_title")}</h2>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">{t("empty_state_desc")}</p>
              </div>
              <button
                type="button"
                onClick={openNewBookGuarded}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-sky-300/40 bg-sky-400/15 px-5 py-3 text-sm font-bold text-white shadow-[0_8px_24px_rgba(0,0,0,0.16)] transition-all hover:bg-sky-400/22"
              >
                <Sparkles className="h-4 w-4 text-sky-300" />
                {t("empty_state_cta")}
              </button>
            </div>
          </section>
        )}

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

      </div>

      {(showExport || showTitleIntel || showAdvancedSettings || showSettingsHub || showCharacterStudio || showManuscriptAnalyzer || showNotepad || showAuthorIdentity) && (
      <Suspense fallback={(
        <ScriptoraAliveTransition
          compact
          overlay
          tone="export"
          title="Sto aprendo lo strumento…"
          steps={["Caricamento pannello…", "Quasi pronto…"]}
        />
      )}>
      {showExport && (
        <HomeExportDialog
          open
          projects={projects}
          initialProjectId={flowProjectId || lastProject?.id}
          onClose={() => setShowExport(false)}
        />
      )}
      {showTitleIntel && (
        <TitleIntelligenceDialog
          open
          onClose={() => setShowTitleIntel(false)}
          onLaunchForge={openNewBookGuarded}
        />
      )}
      {showAdvancedSettings && <AdvancedAppearanceDialog open onClose={() => setShowAdvancedSettings(false)} />}
      {showSettingsHub && (
          <ScriptoraSettingsHub
            open={showSettingsHub}
            onClose={() => setShowSettingsHub(false)}
            onOpenAppearance={() => setShowAdvancedSettings(true)}
            onOpenAuthorIdentity={() => openAuthorIdentity()}
            onOpenUsage={() => navigate("/usage?focus=purchase")}
          />
      )}
      {showCharacterStudio && (
      <CharacterStudioDialog
        open
        onClose={() => setShowCharacterStudio(false)}
        onAuthorIdentity={() => openAuthorIdentity()}
      />
      )}
      {showManuscriptAnalyzer && (
      <ManuscriptAnalyzerDialog
        open
        onClose={() => setShowManuscriptAnalyzer(false)}
        canCreateProject={!freeBookUsed}
        onLimitReached={() => navigate("/pricing")}
      />
      )}
      {showNotepad && <NotepadDialog open onClose={() => setShowNotepad(false)} />}
      {showAuthorIdentity && (
      <AuthorIdentityDialog
        open
        onClose={() => {
          setShowAuthorIdentity(false);
          setAuthorIdentityPrefill(null);
        }}
        prefillDraft={authorIdentityPrefill}
      />
      )}
      </Suspense>
      )}
      <ProfileMenuDialog
        open={showProfileMenu}
        onClose={() => setShowProfileMenu(false)}
        advancedEnabled={showAdvancedLaunchpad}
        onToggleAdvanced={(enabled) => {
          setAdvancedLaunchpadEnabled(enabled);
          setShowAdvancedLaunchpad(enabled);
        }}
        onOpenStudio={() => goApp()}
        onAuthorIdentity={() => setShowAuthorIdentity(true)}
        onAppearance={() => setShowAdvancedSettings(true)}
        onCredits={() => navigate("/usage?focus=purchase")}
        onPricing={() => navigate("/pricing")}
      />

      {/* Idea modal — advanced launchpad generation flow */}
      {showIdeaModal && (
        <div
          className="scriptora-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-2xl"
          onClick={() => !launching && !detecting && setShowIdeaModal(false)}
        >
          <div
            className="scriptora-modal-panel ios-panel relative flex w-full max-w-xl flex-col overflow-hidden p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <div className="flex shrink-0 items-center justify-between px-6 pb-4 pt-6">
              <div className="flex items-center gap-2">
                <div className="ios-icon ios-icon-blue flex h-10 w-10 items-center justify-center rounded-[16px]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Anteprima idea</h2>
                  <p className="text-[11px] text-muted-foreground">{ONE_FLOW_TOOL_ROLES.ideaPreview.it}</p>
                </div>
              </div>
              <button
                onClick={() => !launching && !detecting && setShowIdeaModal(false)}
                disabled={launching || detecting}
                className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                aria-label={t("close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="scriptora-modal-body min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6">
            <label htmlFor="idea-modal" className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" /> {t("your_book_idea")}
            </label>
            <textarea
              id="idea-modal"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder={t("book_idea_placeholder")}
              rows={3}
              autoFocus
              disabled={launching}
              className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.07] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />

            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.05] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Titolo e sottotitolo reali
                </p>
                <span className="text-[10px] text-muted-foreground">Scrivili tu o usa quelli generati dal rilevamento.</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={briefTitle}
                  onChange={(e) => setBriefTitle(e.target.value)}
                  placeholder="Titolo del libro"
                  disabled={launching || detecting}
                  className="h-9 rounded-lg border border-white/10 bg-white/[0.07] px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
                <input
                  value={briefSubtitle}
                  onChange={(e) => setBriefSubtitle(e.target.value)}
                  placeholder="Sottotitolo / tagline"
                  disabled={launching || detecting}
                  className="h-9 rounded-lg border border-white/10 bg-white/[0.07] px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[10px] font-semibold uppercase text-muted-foreground">Lingua titolo</span>
                {BOOK_LANGUAGES.map(l => (
                  <button
                    key={`title-${l.value}`}
                    type="button"
                    onClick={() => setTitleLang(l.value)}
                    disabled={launching || detecting}
                    className={`rounded-lg px-2 py-1 text-[10px] font-medium transition-colors disabled:opacity-50 ${
                      titleLang === l.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-white/[0.07] text-secondary-foreground hover:bg-white/[0.12]"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
                <Globe className="h-3 w-3" /> {t("book_language_label")}
              </span>
              {BOOK_LANGUAGES.map(l => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setBookLang(l.value)}
                  disabled={launching || detecting}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${
                    bookLang === l.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/[0.07] text-secondary-foreground hover:bg-white/[0.12]"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.05] p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Lunghezza libro
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.entries(BOOK_LENGTH_CONFIG) as [BookLength, typeof BOOK_LENGTH_CONFIG[BookLength]][]).map(([key, value]) => {
                  const locked = currentPlan === "free" && key !== "short";
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={launching || detecting || locked}
                      onClick={() => setBookLength(key)}
                      className={`rounded-lg border px-2.5 py-2 text-left text-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                        (currentPlan === "free" ? "short" : bookLength) === key
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-white/10 bg-white/[0.06] text-foreground hover:bg-white/[0.1]"
                      }`}
                      title={locked ? "Disponibile con Pro/Premium" : undefined}
                    >
                      <span className="block font-semibold">{value.label}</span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">
                        {key === "custom" ? "Custom" : `~${(value.totalWords / 1000).toFixed(0)}k parole`}
                      </span>
                    </button>
                  );
                })}
              </div>
              {currentPlan === "free" && (
                <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                  Il piano Free resta su libro breve. Gli altri piani possono scegliere lunghezze maggiori.
                </p>
              )}
              {bookLength === "custom" && currentPlan !== "free" && (
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr,120px]">
                  <input
                    type="range"
                    min={5000}
                    max={200000}
                    step={1000}
                    value={customTotalWords}
                    onChange={(e) => setCustomTotalWords(Number(e.target.value) || 30000)}
                    disabled={launching || detecting}
                    className="w-full accent-primary"
                  />
                  <input
                    type="number"
                    min={1000}
                    step={500}
                    value={customTotalWords}
                    onChange={(e) => setCustomTotalWords(Math.max(1000, Number(e.target.value) || 30000))}
                    disabled={launching || detecting}
                    className="h-8 rounded-lg border border-white/10 bg-white/[0.07] px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                  />
                </div>
              )}
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.05] p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Struttura reale del libro
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] text-muted-foreground uppercase tracking-wider">N° capitoli</label>
                  <input
                    type="number"
                    min={3}
                    max={50}
                    value={oneClickChapters}
                    onChange={(e) => setOneClickChapters(Math.max(3, Math.min(50, Number(e.target.value) || 10)))}
                    disabled={launching || detecting}
                    className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.07] px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex h-9 items-center gap-2 text-xs text-foreground/80">
                    <input
                      type="checkbox"
                      checked={oneClickSubchaptersEnabled}
                      onChange={(e) => setOneClickSubchaptersEnabled(e.target.checked)}
                      disabled={launching || detecting}
                      className="rounded border-border accent-primary"
                    />
                    Attiva sottocapitoli
                  </label>
                </div>
              </div>
              {oneClickSubchaptersEnabled && (
                <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_110px] sm:items-center">
                  <p className="text-[11px] leading-4 text-muted-foreground">
                    Ogni capitolo avrà sottosezioni scritte davvero e coerenti con il blueprint.
                  </p>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={oneClickSubchaptersPerChapter}
                    onChange={(e) => setOneClickSubchaptersPerChapter(Math.max(1, Math.min(8, Number(e.target.value) || DEFAULT_SUBCHAPTERS_PER_CHAPTER)))}
                    disabled={launching || detecting}
                    className="h-9 rounded-lg border border-white/10 bg-white/[0.07] px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                  />
                </div>
              )}
            </div>

            {intent && (
              <div className="ios-glass-soft mt-3 space-y-2 rounded-lg p-3 text-xs">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                    {intent.genre}
                  </span>
                  {intent.subcategory && (
                    <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-[10px]">
                      {intent.subcategory}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-[10px] capitalize">
                    {intent.level}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-[10px]">
                    {intent.numberOfChapters} {t("chapters").toLowerCase()}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">{t("suggested_title")}</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {intent.suggestedTitles?.[intent.bestTitleIndex] || intent.suggestedTitles?.[0]}
                  </p>
                  <p className="text-xs text-muted-foreground italic mt-0.5">
                    {intent.suggestedSubtitles?.[intent.bestTitleIndex] || intent.suggestedSubtitles?.[0]}
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-semibold">{t("promise")}:</span> {intent.readerPromise}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <div className="flex flex-1 flex-col gap-1.5">
                <button
                  onClick={launchOneClick}
                  disabled={!heroValid || launching || detecting}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-white text-sm font-semibold text-slate-950 shadow-lg shadow-black/20 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {launching || detecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />}
                  {launching ? t("launching") : detecting ? t("detecting") : t("generate_full_book")}
                </button>
                <CreditCostBadge operation="auto_bestseller" prominent />
              </div>
              {!intent ? (
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => void detectIntent()}
                    disabled={!heroValid || detecting || launching}
                    className="ios-toolbar-button h-11 px-4 text-sm font-medium disabled:opacity-50"
                  >
                    <Wand2 className="h-3.5 w-3.5" /> {t("preview_action")}
                  </button>
                  <CreditCostBadge operation="market_intelligence" />
                </div>
              ) : (
                <button
                  onClick={() => { setShowIdeaModal(false); openNewBookGuarded(); }}
                  disabled={launching}
                  className="ios-toolbar-button h-11 px-4 text-sm font-medium disabled:opacity-50"
                >
                  {t("advanced")} <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {!heroValid && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                {t("min_idea_chars")}
              </p>
            )}
            </div>
          </div>
        </div>
      )}

      <DedicatedToolScreen
        open={showProjects}
        title="I miei libri"
        description={tt("my_projects_drafts", { count: draftProjects.length })}
        onClose={() => setShowProjects(false)}
        maxWidthClass="max-w-2xl"
      >
        {draftProjects.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground/70">{t("no_drafts_library_hint")}</p>
        ) : (
          <div className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03]">
            {draftProjects.map((p) => (
              <div
                key={p.id}
                className="group flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-white/[0.07] hover:text-foreground"
                onClick={() => { setShowProjects(false); goApp({ projectId: p.id }); }}
              >
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p.config.title || t("untitled")}</span>
                  <span className="text-[10px] text-muted-foreground/70">
                    {getBookTypeLabel(p.config) || p.config.genre} · {p.chapters?.length || 0} ch · {isProjectComplete(p) ? "complete" : p.phase}
                  </span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                  className="rounded-md p-1 text-muted-foreground opacity-70 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </DedicatedToolScreen>

      <DedicatedToolScreen
        open={showLibrary}
        title={t("library")}
        description="Libri completati e pronti per export o pubblicazione."
        onClose={() => setShowLibrary(false)}
        maxWidthClass="max-w-2xl"
      >
        <LibrarySection
          projects={projects}
          onOpen={(id) => { setShowLibrary(false); goApp({ projectId: id }); }}
          onDelete={handleDelete}
          onExport={() => { setShowLibrary(false); setShowExport(true); }}
        />
      </DedicatedToolScreen>

      <DevModeUnlockDialog open={showDevUnlock} onOpenChange={setShowDevUnlock} onUnlocked={() => navigate("/usage")} />
      <BetaActivationDialog open={showBetaDialog} onOpenChange={setShowBetaDialog} />
    </div>
  );
}
