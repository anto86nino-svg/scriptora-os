import { useLocation, useNavigate } from "react-router-dom";
import { lazy, Suspense, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { loadProjects, deleteProjectAsync, getLastProjectId, getCurrentUserId, setLastProjectId, saveProjectAsync } from "@/services/storageService";
import { isProjectComplete } from "@/lib/project-status";
import { SCRIPTORA_CHARACTER_BIBLE_KEY, SCRIPTORA_CHARACTER_PROJECT_KEY } from "@/lib/character-studio-keys";
import { getPendingCharacterProject } from "@/lib/character-studio/pending-character-project";
import { FocusMusicControl } from "@/components/FocusMusicControl";
import { InProgressSection } from "@/components/Home/InProgressSection";
import { PaywallGuard } from "@/components/PaywallGuard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BookOpen, Plus, Rocket, Zap,
  FileDown, ArrowRight, Clock, Globe, Flame, Loader2, Sparkles, Wand2,
  Home as HomeIcon, X, BarChart3,
  TrendingUp, LogOut, CreditCard, Download as DownloadIcon, Settings, Users,
  CheckCircle2, NotebookPen, Fingerprint, ImagePlus
} from "lucide-react";
import { BookConfig, BookLength, BookProject, DEFAULT_SUBCHAPTERS_PER_CHAPTER, Genre, Language } from "@/types/book";
import { normalizeBookConfig } from "@/lib/book-config-studio/defaults";
import type { StudioLaunchPayload } from "@/lib/book-config-studio/types";
import { t, tt, getUILanguage, setUILanguage, UI_LANGUAGES, UILanguage, useUILanguage } from "@/lib/i18n";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
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
import { AuthSessionButton } from "@/components/auth/AuthSessionButton";
import { CreditCostBadge } from "@/components/billing/CreditCostBadge";
import type { ForgePreset } from "@/lib/scriptora-forge/forge-presets";
import { DashboardHomePillars } from "@/components/one-flow/DashboardHomePillars";
import { DashboardPackagingRow } from "@/components/one-flow/DashboardPackagingRow";
import { STUDIO_DRAFT_STORAGE_KEY } from "@/lib/book-config-studio/types";
import type { DashboardActionContext } from "@/lib/one-flow/dashboard-home-actions";
import { resetRouteScroll } from "@/lib/one-flow/dashboard-navigation";
import { getToolRoute } from "@/lib/one-flow/tool-registry";
import {
  focusDashboardToolPanelWhenReady,
  scrollElementIntoViewWithOffset,
} from "@/lib/one-flow/dashboard-panel-scroll";
import type { ActiveDashboardTool } from "@/lib/one-flow/dashboard-active-tool";
import { activeToolGuideRoute } from "@/lib/one-flow/dashboard-active-tool";
import { OsHomeHero } from "@/components/os/OsHomeHero";
import {
  MobileDashboardCreditPill,
  MobileDashboardMoreMenu,
} from "@/components/mobile/MobileDashboardChrome";
import { ScriptoraSettingsButton } from "@/components/settings/ScriptoraSettingsButton";
import { ScriptoraAliveTransition } from "@/components/boot/ScriptoraAliveTransition";
import {
  ProfileMenuDialog,
  isAdvancedLaunchpadEnabled,
  setAdvancedLaunchpadEnabled,
} from "@/components/one-flow/ProfileMenuDialog";
import {
  buildBookForgeHandoff,
  type BookForgeHandoff,
} from "@/lib/book-forge/book-forge-handoff";
import { DashboardContinueCard } from "@/components/projects/DashboardContinueCard";
import { DashboardIdeaBookCard } from "@/components/one-flow/DashboardIdeaBookCard";
import {
  buildBlueprintPreviewProject,
  canGenerateBlueprintPreview,
  selectContinuityProject,
} from "@/lib/project-continuity";
import { getUserFriendlyError } from "@/lib/user-friendly-error";
import { trackScriptoraEvent } from "@/lib/usage-analytics";
import { disableDesktopModeOverride, isDesktopModeOverrideActive } from "@/lib/mobile-performance";
import {
  ideaBookDraftToConfig,
  type IdeaBookDraft,
} from "@/lib/book-creation-os/idea-book-flow";
import {
  buildProjectHandoffSeed,
  saveProjectHandoffSeed,
} from "@/lib/book-forge/project-handoff";

const ScriptoraSettingsHub = lazy(() =>
  import("@/components/settings/ScriptoraSettingsHub").then((m) => ({ default: m.ScriptoraSettingsHub })),
);
const AdvancedAppearanceDialog = lazy(() =>
  import("@/components/AdvancedAppearanceDialog").then((m) => ({ default: m.AdvancedAppearanceDialog })),
);
const BookCreationOsWizard = lazyWithRetry(() =>
  import("@/components/one-flow/BookCreationOsWizard").then((m) => ({ default: m.BookCreationOsWizard })),
);
const DashboardToolHost = lazyWithRetry(() =>
  import("@/components/one-flow/DashboardToolHost").then((m) => ({ default: m.DashboardToolHost })),
);

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

function isBookForgeHandoff(value: unknown): value is BookForgeHandoff {
  return Boolean(
    value &&
    typeof value === "object" &&
    "prefill" in value &&
    "recommendedStartStep" in value,
  );
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
      const character = get("Carattere:") || get("Personality:");
      const contradiction = get("Contraddizione:") || get("Contradiction:") || get("Blind spot:");
      const dominantFlaw = get("Difetto dominante:") || get("Dominant flaw:");
      const transformationArc = get("Arco di trasformazione:") || get("Transformation arc:");
      const personality = [
        character,
        contradiction && `Contraddizione: ${contradiction}`,
        dominantFlaw && `Difetto dominante: ${dominantFlaw}`,
        transformationArc && `Arco di trasformazione: ${transformationArc}`,
      ].filter(Boolean).join("\n");

      return {
        name: nameLine || "Personaggio",
        surname,
        age: get("Età:") || get("Age:"),
        role: get("Ruolo nella storia:") || get("Role:"),
        physicalDescription: get("Aspetto fisico:") || get("Physical description:"),
        personality: personality || block,
        wound: get("Ferita interiore:") || get("Core wound:"),
        externalDesire: get("Desiderio esterno:") || get("External desire:"),
        internalNeed: get("Bisogno interiore:") || get("Internal need:"),
        secret: get("Segreto:") || get("Secret:"),
        vulnerability: get("Paura:") || get("Core fear:") || get("Fear:") || get("Vulnerabilità:") || get("Vulnerability:"),
        dominantFlaw,
        blindSpot: contradiction,
        emotionalTriggers: get("Trigger emotivi:") || get("Emotional triggers:"),
        recurringBehavior: get("Comportamento ricorrente:") || get("Recurring behavior:"),
        personalLanguage: get("Linguaggio personale:") || get("Personal language:") || get("Voce:") || get("Voice:"),
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
  const [activeDashboardTool, setActiveDashboardTool] = useState<ActiveDashboardTool>(null);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showSettingsHub, setShowSettingsHub] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAdvancedLaunchpad, setShowAdvancedLaunchpad] = useState(() => isAdvancedLaunchpadEnabled());
  const [projects, setProjects] = useState<BookProject[]>([]);
  const [flowProjectId, setFlowProjectId] = useState<string | null>(null);
  const [blueprintPreviewProjectId, setBlueprintPreviewProjectId] = useState<string | null>(null);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showMobileMoreMenu, setShowMobileMoreMenu] = useState(false);
  const currentLang = useUILanguage();
  const [desktopOverrideActive, setDesktopOverrideActive] = useState(() => isDesktopModeOverrideActive());
  const closeAllDashboardTools = useCallback(() => {
    setActiveDashboardTool(null);
    setBookForgeHandoff(null);
  }, []);

  const navigateFromDashboard = useCallback((path: string, state?: Record<string, unknown>) => {
    closeAllDashboardTools();
    setShowMobileMoreMenu(false);
    setShowProfileMenu(false);
    setShowSettingsHub(false);
    setShowAdvancedSettings(false);
    resetRouteScroll();
    navigate(path, state ? { state } : undefined);
  }, [closeAllDashboardTools, navigate]);

  const openDashboardTool = useCallback((tool: ActiveDashboardTool) => {
    setShowSettingsHub(false);
    setShowAdvancedSettings(false);

    setActiveDashboardTool((current) => {
      if (current === tool) return current;
      return tool;
    });
  }, []);

  const openFreshCharacterStudio = useCallback(() => {
    try {
      sessionStorage.setItem("scriptora-character-studio-fresh-start", "1");
      sessionStorage.removeItem(SCRIPTORA_CHARACTER_BIBLE_KEY);
      sessionStorage.removeItem(SCRIPTORA_CHARACTER_PROJECT_KEY);
      localStorage.removeItem(SCRIPTORA_CHARACTER_BIBLE_KEY);
      localStorage.removeItem(SCRIPTORA_CHARACTER_PROJECT_KEY);
    } catch {
      /* noop */
    }
    navigateFromDashboard("/character-studio", { fresh: true });
  }, [navigateFromDashboard]);

  const openSettingsHub = useCallback(() => {
    closeAllDashboardTools();
    setShowSettingsHub(true);
  }, [closeAllDashboardTools]);

  useEffect(() => {
    if (!activeDashboardTool) return;
    trackScriptoraEvent({
      eventName: activeDashboardTool === "book-forge" ? "book_forge_opened" : "home_cta_clicked",
      tool: activeDashboardTool,
      success: true,
    });
  }, [activeDashboardTool]);

  useEffect(() => {
    setDesktopOverrideActive(isDesktopModeOverrideActive());
  }, [location.search]);

  useEffect(() => {
    if (!activeDashboardTool) return;
    document.body.classList.add("scriptora-dashboard-tool-open");
    return () => document.body.classList.remove("scriptora-dashboard-tool-open");
  }, [activeDashboardTool]);

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
  const toBookLanguage = (value?: string): Language => {
    const found = BOOK_LANGUAGES.find((lang) => lang.value === value);
    return (found?.value || "English") as Language;
  };

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
      activeDashboardTool ? activeToolGuideRoute(activeDashboardTool) :
      showAdvancedSettings ? "settings" :
      showBetaDialog ? "beta" :
      showDevUnlock ? "usage" :
      null;

    window.dispatchEvent(new CustomEvent("scriptora-guide-context", { detail: { route } }));
    return () => {
      window.dispatchEvent(new CustomEvent("scriptora-guide-context", { detail: { route: null } }));
    };
  }, [activeDashboardTool, showAdvancedSettings, showBetaDialog, showDevUnlock]);

  // Reset intent if user edits the idea after detection
  useEffect(() => {
    if (intent) setIntent(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea]);

  const blueprintGate = useMemo(
    () => canGenerateBlueprintPreview(currentPlan, projects),
    [currentPlan, projects],
  );
  const devBypassLimits = devOn;
  const freeBookUsed = currentPlan === "free" && !devBypassLimits && !blueprintGate.allowed;
  const [bookForgeHandoff, setBookForgeHandoff] = useState<BookForgeHandoff | null>(null);

  useEffect(() => {
    if (currentPlan === "free" && bookLength !== "short") {
      setBookLength("short");
    }
  }, [bookLength, currentPlan]);

  const openNewBookGuarded = (handoff?: BookForgeHandoff | null | unknown) => {
    if (freeBookUsed) {
      toast.error("Limite Blueprint Free raggiunto", {
        description: blueprintGate.message || "Passa a un piano autore o sblocca un singolo progetto.",
      });
      trackScriptoraEvent({
        eventName: "free_blueprint_limit_blocked",
        tool: "book-forge",
        planId: currentPlan,
        success: false,
      });
      navigate("/pricing");
      return;
    }

    const resolvedHandoff = isBookForgeHandoff(handoff) ? handoff : null;

    // Fresh dashboard start: "Crea libro" must never resurrect an old Book Forge draft.
    // Handoff flows keep their payload and still skip the right steps.
    if (!resolvedHandoff) {
      try {
        sessionStorage.removeItem(STUDIO_DRAFT_STORAGE_KEY);
      } catch {
        // Storage can be unavailable in private/mobile webviews.
      }
    }

    setBookForgeHandoff(resolvedHandoff);
    if (resolvedHandoff?.recommendedStartStep === "writer") {
      navigate("/app");
      return;
    }

    // Single creation flow: every "new book" entrypoint opens Scriptora Forge.
    // The legacy wizard remains available only inside Forge after DNA confirmation.
    openDashboardTool("book-forge");
  };

  useEffect(() => {
    const onAdvancedChange = () => setShowAdvancedLaunchpad(isAdvancedLaunchpadEnabled());
    window.addEventListener("scriptora-advanced-mode-change", onAdvancedChange);
    return () => window.removeEventListener("scriptora-advanced-mode-change", onAdvancedChange);
  }, []);

  const guardPlanFeature = useCallback((feature: FeatureKey, action: () => void) => () => {
    if (!canUseFeature(currentPlan, feature)) {
      toast.error(t("unlock_pro"));
      navigate("/pricing");
      return;
    }
    action();
  }, [currentPlan, navigate]);

  useEffect(() => {
    const state = location.state as {
      openWizard?: boolean;
      openNewBook?: boolean;
      openForge?: boolean;
      openProjects?: boolean;
      openCover?: boolean;
      openExport?: boolean;
      bookForgeHandoff?: BookForgeHandoff;
      projectId?: string;
    } | null;
    if (!state) return;
    if (state.projectId) {
      setFlowProjectId(state.projectId);
      setLastProjectId(state.projectId);
    }
    if (state.openForge || state.openWizard || state.openNewBook) openNewBookGuarded(state.bookForgeHandoff || null);
    if (state.openProjects) openDashboardTool("projects");
    if (state.openCover) guardPlanFeature("cover_studio_template", openCoverStudioPage)();
    if (state.openExport) {
      guardPlanFeature("export_epub", () => navigateFromDashboard(getToolRoute("publishing"), state.projectId ? { projectId: state.projectId } : undefined))();
    }
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
  const dashboardContextProject = useMemo(
    () => selectContinuityProject(projects, { lastProjectId: lastId, flowProjectId }),
    [projects, lastId, flowProjectId],
  );
  useEffect(() => {
    if (!dashboardContextProject?.id) return;
    const currentLastId = getLastProjectId();
    const currentLastProjectStillVisible = currentLastId
      ? projects.some((project) => project.id === currentLastId)
      : false;
    if (!currentLastProjectStillVisible) setLastProjectId(dashboardContextProject.id);
  }, [dashboardContextProject?.id, projects]);

  // Only surface "continue last" when the project still belongs to the active
  // environment (DEV vs USER). Cross-scope ids are silently ignored.
  const openForgePreset = (preset: ForgePreset) => {
    const presetGenreById: Partial<Record<ForgePreset["id"], Genre>> = {
      poetry: "poetry",
      novel: "romance",
      manual: "manual",
      essay: "philosophy",
      history: "education",
      philosophy: "philosophy",
      math: "education",
      physics: "education",
      songs: "poetry",
      children: "children",
      self_help: "self-help",
      business: "business",
    };
    const categoryByFamily: Record<ForgePreset["family"], string> = {
      creative: preset.id === "poetry" || preset.id === "songs" ? "Poetry" : "Fiction",
      nonfiction: "Non-Fiction",
      academic: "Education",
      music: "Poetry",
      children: "Children",
    };

    const handoff = buildBookForgeHandoff("preset-forge", {
      bookType: preset.id,
      bookTypeId: preset.id,
      genre: presetGenreById[preset.id] || "education",
      category: categoryByFamily[preset.family],
      subcategory: preset.label,
      subgenre: preset.subtitle,
      niche: preset.label,
      language: preset.defaultLanguage,
      chapterCount: preset.defaultChapters,
      numberOfChapters: preset.defaultChapters,
      bookLength: preset.defaultChapters <= 8 ? "short" : "medium",
      structureMode: preset.structureMode,
      subchaptersEnabled: preset.structureMode !== "poems" && preset.structureMode !== "songs",
      subchaptersPerChapter: preset.structureMode === "lessons" || preset.structureMode === "chapters" ? 3 : 0,
      tone: preset.tone,
      promise: preset.promise,
      commercialAngle: preset.blueprintHint,
      idea: preset.blueprintHint,
    });

    toast.success(`${preset.label}: preset preparato nella creazione libro.`);
    openNewBookGuarded(handoff);
  };

  const openCoverStudioPage = useCallback(() => {
    const projectId = dashboardContextProject?.id || getLastProjectId();
    if (projectId) setLastProjectId(projectId);
    navigateFromDashboard(getToolRoute("cover"), projectId ? { projectId } : undefined);
  }, [dashboardContextProject?.id, navigateFromDashboard]);

  const advancedToolsAnchorRef = useRef<HTMLDivElement | null>(null);
  const packagingAnchorRef = useRef<HTMLDivElement | null>(null);
  const panelHandledRef = useRef<string | null>(null);

  useEffect(() => {
    const panel = new URLSearchParams(location.search).get("panel");
    if (!panel) {
      panelHandledRef.current = null;
      return;
    }
    const key = location.search;
    if (panelHandledRef.current === key) return;
    panelHandledRef.current = key;

    if (panel === "advanced-tools") {
      setAdvancedLaunchpadEnabled(true);
      setShowAdvancedLaunchpad(true);
      openDashboardTool("advanced-tools");
      focusDashboardToolPanelWhenReady("advanced-tools");
      return;
    }
    if (panel === "packaging") {
      requestAnimationFrame(() => {
        scrollElementIntoViewWithOffset(packagingAnchorRef.current, { behavior: "smooth" });
      });
    }
  }, [location.search, openDashboardTool]);

  useEffect(() => {
    if (activeDashboardTool === "advanced-tools") {
      focusDashboardToolPanelWhenReady("advanced-tools");
    }
  }, [activeDashboardTool]);

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
    navigateFromDashboard(getToolRoute("identity"), prefill ? { prefill } : undefined);
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
    const openFromCharacterStudio = (event: Event) => {
      const detail = (event as CustomEvent<{ handoff?: BookForgeHandoff }>).detail;
      closeAllDashboardTools();
      openNewBookGuarded(detail?.handoff || null);
    };

    window.addEventListener("scriptora-open-new-book-from-character-studio", openFromCharacterStudio);
    return () => window.removeEventListener("scriptora-open-new-book-from-character-studio", openFromCharacterStudio);
  }, [closeAllDashboardTools, openNewBookGuarded]);

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
    closeAllDashboardTools();
    navigate("/app");
  };

  const handleStudioComplete = (payload: StudioLaunchPayload) => {
    const finalConfig = mergeCharacterStudioIntoConfig(payload.config);
    setSelectedAuthorIdentityId(activeAuthor.id);
    const continuityProjectId =
      payload.projectId ||
      blueprintPreviewProjectId ||
      (() => {
        try {
          return sessionStorage.getItem("scriptora-last-blueprint-preview-project-id") || undefined;
        } catch {
          return undefined;
        }
      })();
    sessionStorage.setItem("scriptora-new-book", JSON.stringify({
      ...payload,
      projectId: continuityProjectId,
      config: finalConfig,
    }));
    closeAllDashboardTools();
    navigate("/app");
  };

  const handleStudioGenerateBlueprint = async (config: BookConfig) => {
    const finalConfig = mergeCharacterStudioIntoConfig(config);
    const gate = canGenerateBlueprintPreview(currentPlan, projects);
    if (!devBypassLimits && !gate.allowed) {
      trackScriptoraEvent({
        eventName: "free_blueprint_limit_blocked",
        tool: "book-forge",
        planId: currentPlan,
        success: false,
      });
      throw new Error(gate.message);
    }
    trackScriptoraEvent({
      eventName: "blueprint_generation_requested",
      tool: "book-forge",
      planId: currentPlan,
      success: true,
    });
    const [{ buildBookTypeLock: buildGenreLock }, { runGenerateBlueprint }] = await Promise.all([
      import("@/lib/book-type-engine"),
      import("@/lib/generation-runtime"),
    ]);
    const genreLock = buildGenreLock(finalConfig);
    const { blueprint } = await runGenerateBlueprint(finalConfig, genreLock);
    const previewProject = buildBlueprintPreviewProject({
      config: finalConfig,
      blueprint,
      sourceTool: "book-forge",
      planId: currentPlan,
    });
    await saveProjectAsync(previewProject);
    setProjects((prev) => [previewProject, ...prev.filter((project) => project.id !== previewProject.id)]);
    setFlowProjectId(previewProject.id);
    setBlueprintPreviewProjectId(previewProject.id);
    try {
      sessionStorage.setItem("scriptora-last-blueprint-preview-project-id", previewProject.id);
    } catch { /* noop */ }
    window.dispatchEvent(new Event("scriptora-projects-change"));
    trackScriptoraEvent({
      eventName: "blueprint_generated",
      tool: "book-forge",
      projectId: previewProject.id,
      planId: currentPlan,
      success: true,
    });
    trackScriptoraEvent({
      eventName: "blueprint_saved",
      tool: "book-forge",
      projectId: previewProject.id,
      planId: currentPlan,
      success: true,
    });
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
      toast.error(getUserFriendlyError(e, { area: "blueprint", fallback: t("detection_failed") }));
      return null;
    } finally {
      setDetecting(false);
    }
  };

  const buildIdeaBookForgeHandoff = (detected?: DetectedIntent | null): BookForgeHandoff | null => {
    const sourceIdea = idea.trim();
    const safeBookLength = currentPlan === "free" ? "short" : bookLength;
    const best = Math.max(0, Math.min(2, Number(detected?.bestTitleIndex || 0)));
    const resolvedTitle = briefTitle.trim() || detected?.suggestedTitles?.[best] || detected?.suggestedTitles?.[0] || "";
    const resolvedSubtitle = briefSubtitle.trim() || detected?.suggestedSubtitles?.[best] || detected?.suggestedSubtitles?.[0] || "";
    const resolvedChapters = Math.max(3, Math.min(50, Number(oneClickChapters || detected?.numberOfChapters) || 10));
    const resolvedGenre = detected?.genre as Genre | undefined;

    if (!sourceIdea && !resolvedTitle && !resolvedSubtitle && !resolvedGenre) return null;

    return buildBookForgeHandoff("book-idea-tools", {
      title: resolvedTitle,
      subtitle: resolvedSubtitle,
      idea: sourceIdea,
      plot: sourceIdea,
      genre: resolvedGenre,
      category: resolvedGenre
        ? isNarrativeGenreForCharacters(resolvedGenre) ? "Fiction" : "Non-Fiction"
        : undefined,
      subcategory: detected?.subcategory,
      niche: detected?.subcategory,
      language: toBookLanguage(bookLang),
      titleLanguage: toBookLanguage(titleLang || bookLang),
      chapterCount: resolvedChapters,
      numberOfChapters: resolvedChapters,
      bookLength: safeBookLength,
      customTotalWords: safeBookLength === "custom" ? customTotalWords : undefined,
      subchaptersEnabled: oneClickSubchaptersEnabled,
      subchaptersPerChapter: oneClickSubchaptersEnabled
        ? Math.max(1, Math.min(8, Number(oneClickSubchaptersPerChapter) || DEFAULT_SUBCHAPTERS_PER_CHAPTER))
        : undefined,
      targetReader: detected?.targetAudience,
      promise: detected?.readerPromise,
      transformation: detected?.readerPromise,
      tone: detected?.tone,
      authorIdentityId: activeAuthor.id,
      authorIdentity: activeAuthor,
      authorName: activeAuthor.penName,
    });
  };

  const saveIdeaBookSeed = (draft: IdeaBookDraft) => {
    saveProjectHandoffSeed(buildProjectHandoffSeed("book-idea-tools", {
      title: draft.title,
      subtitle: draft.subtitle,
      language: draft.language,
      bookType: draft.bookTypeId,
      genre: draft.genre,
      category: draft.category,
      subcategory: draft.subcategory,
      niche: draft.subgenre,
      targetReader: draft.targetReader,
      promise: draft.promise,
      tone: draft.tone,
      chapterCount: draft.chaptersCount,
      bookLength: draft.bookLength,
      commercialAngle: draft.subtitle,
    }));
  };

  const startWritingFromIdeaBook = (draft: IdeaBookDraft) => {
    saveIdeaBookSeed(draft);
    const config = normalizeBookConfig(ideaBookDraftToConfig(draft));
    handleStudioComplete({
      config,
      mode: "studio-draft",
    });
    toast.success("Idea Libro trasformata in progetto. Apro il Writer Studio.");
  };

  const openBookForgeFromIdeaBook = (draft: IdeaBookDraft) => {
    saveIdeaBookSeed(draft);
    openNewBookGuarded(buildBookForgeHandoff("book-idea-tools", {
      title: draft.title,
      subtitle: draft.subtitle,
      idea: draft.originalIdea,
      plot: draft.originalIdea,
      bookType: draft.bookFormat,
      bookTypeId: draft.bookTypeId,
      bookFormat: draft.bookFormat,
      genre: draft.genre,
      category: draft.category,
      subcategory: draft.subcategory,
      subgenre: draft.subgenre,
      niche: draft.subgenre,
      language: draft.language,
      titleLanguage: draft.language,
      chapterCount: draft.chaptersCount,
      numberOfChapters: draft.chaptersCount,
      bookLength: draft.bookLength,
      structureMode: draft.structureMode,
      subchaptersEnabled: draft.subchaptersEnabled,
      subchaptersPerChapter: draft.subchaptersPerChapter,
      targetReader: draft.targetReader,
      promise: draft.promise,
      transformation: draft.promise,
      tone: draft.tone,
      commercialAngle: draft.subtitle,
      authorIdentityId: activeAuthor.id,
      authorIdentity: activeAuthor,
      authorName: activeAuthor.penName,
    }));
  };

  const openBookForgeFromIdeaPreview = () => {
    closeAllDashboardTools();
    openNewBookGuarded(buildIdeaBookForgeHandoff(intent));
  };

  const launchOneClick = async () => {
    if (idea.trim().length < 6) return;
    setLaunching(true);
    let i = intent;
    if (!i) i = await detectIntent();
    if (!i) { setLaunching(false); return; }

    closeAllDashboardTools();
    openNewBookGuarded(buildIdeaBookForgeHandoff(i));
  };

  const heroValid = idea.trim().length >= 6;

  const currentLangLabel = UI_LANGUAGES.find(l => l.value === currentLang)?.label || "English";
  const completedProjects = projects.filter(isProjectComplete);
  const draftProjects = projects.filter((p) => !isProjectComplete(p));
  const activeProjectDoneChapters = dashboardContextProject?.chapters?.filter((chapter) => (chapter.content || "").trim().length > 50).length || 0;
  const activeProjectTargetChapters = dashboardContextProject?.config?.numberOfChapters || dashboardContextProject?.chapters?.length || 0;
  const activeProjectProgress = dashboardContextProject
    ? dashboardContextProject.phase === "complete"
      ? 100
      : activeProjectTargetChapters > 0
        ? Math.min(100, Math.round((activeProjectDoneChapters / activeProjectTargetChapters) * 100))
        : 0
    : 0;

  const dashboardActionContext = useMemo<DashboardActionContext>(
    () => ({
      hasActiveBook: Boolean(dashboardContextProject),
      hasCompletedBook: completedProjects.length > 0,
      activeProject: dashboardContextProject,
      closeAllTools: closeAllDashboardTools,
      openTool: (tool) => {
        openDashboardTool(tool);
      },
      onNewBook: openNewBookGuarded,
      onContinue: dashboardContextProject ? () => { closeAllDashboardTools(); goApp({ projectId: dashboardContextProject.id }); } : undefined,
      onOpenCover: () => { closeAllDashboardTools(); guardPlanFeature("cover_studio_template", openCoverStudioPage)(); },
      onNavigate: navigateFromDashboard,
    }),
    [dashboardContextProject, completedProjects.length, closeAllDashboardTools, openDashboardTool, navigateFromDashboard, openNewBookGuarded, goApp, openCoverStudioPage],
  );

  const returnToMobileDashboard = useCallback(() => {
    disableDesktopModeOverride();
    const url = new URL(window.location.href);
    url.searchParams.delete("desktop");
    setDesktopOverrideActive(false);
    window.location.assign(url.toString());
  }, []);

  const ideaPreviewProps = useMemo(() => ({
    idea,
    setIdea,
    briefTitle,
    setBriefTitle,
    briefSubtitle,
    setBriefSubtitle,
    bookLang,
    setBookLang,
    titleLang,
    setTitleLang,
    bookLength,
    setBookLength,
    customTotalWords,
    setCustomTotalWords,
    oneClickChapters,
    setOneClickChapters,
    oneClickSubchaptersEnabled,
    setOneClickSubchaptersEnabled,
    oneClickSubchaptersPerChapter,
    setOneClickSubchaptersPerChapter,
    intent,
    detecting,
    launching,
    currentPlan,
    heroValid,
    onDetectIntent: () => { void detectIntent(); },
    onLaunchOneClick: () => { void launchOneClick(); },
    onOpenAdvancedForge: openBookForgeFromIdeaPreview,
    onClose: closeAllDashboardTools,
  }), [
    idea, briefTitle, briefSubtitle, bookLang, titleLang, bookLength, customTotalWords,
    oneClickChapters, oneClickSubchaptersEnabled, oneClickSubchaptersPerChapter,
    intent, detecting, launching, currentPlan, heroValid, closeAllDashboardTools,
  ]);

  if (activeDashboardTool === "book-forge") {
    return (
      <div className="scriptora-page-scroll min-h-[100dvh] bg-background">
        <div className="sticky top-0 z-50 border-b border-white/10 bg-background/85 backdrop-blur-2xl">
          <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={closeAllDashboardTools}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.12]"
            >
              ← Torna alla Home
            </button>
          </div>
        </div>

        <Suspense
          fallback={
            <ScriptoraAliveTransition
              compact
              overlay
              tone="forge"
              title="Apro la creazione libro…"
              steps={["Caricamento studio", "Preparo interfaccia"]}
            />
          }
        >
          <BookCreationOsWizard
            open={activeDashboardTool === "book-forge"}
            onClose={closeAllDashboardTools}
            authorIdentity={activeAuthor}
            onStudioComplete={handleStudioComplete}
            onGenerateBlueprint={handleStudioGenerateBlueprint}
            bookForgeHandoff={bookForgeHandoff}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="scriptora-dashboard-shell scriptora-ios-screen scriptora-app-surface scriptora-dashboard-mobile scriptora-page-scroll scriptora-cinematic-shell scriptora-brand-shell relative min-h-[100dvh] overflow-x-hidden safe-area-pt">
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
                  <span className="hidden max-w-[82px] truncate text-[11px] font-medium text-foreground lg:inline">
                    Account
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
            <ScriptoraSettingsButton onClick={openSettingsHub} />
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
              onClick={() => openAuthorIdentity()}
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
              onExportStudio={() => guardPlanFeature("export_epub", () => navigateFromDashboard(getToolRoute("publishing"), dashboardContextProject?.id ? { projectId: dashboardContextProject.id } : undefined))()}
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

      {desktopOverrideActive && (
        <div className="border-b border-[#f2c400]/20 bg-[#f2c400]/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 text-sm text-amber-50 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <span className="font-semibold">Visuale desktop attiva</span>
            <button
              type="button"
              onClick={returnToMobileDashboard}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#f2c400] px-4 text-sm font-black text-slate-950 hover:bg-[#ffe06a]"
            >
              Torna alla visuale mobile
            </button>
          </div>
        </div>
      )}

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-3 sm:px-6 sm:pb-16 sm:pt-6 lg:px-8">
        <OsHomeHero
          lastProject={dashboardContextProject}
          progressPercent={activeProjectProgress}
          onContinue={() => dashboardContextProject && goApp({ projectId: dashboardContextProject.id })}
          onGenerateNextChapter={() => dashboardContextProject && goApp({ projectId: dashboardContextProject.id, section: "chapters" })}
          onExport={() => guardPlanFeature("export_epub", () => navigateFromDashboard(getToolRoute("publishing"), dashboardContextProject?.id ? { projectId: dashboardContextProject.id } : undefined))()}
          onNewBook={openNewBookGuarded}
          onMyBooks={() => openDashboardTool("projects")}
        />

        <DashboardIdeaBookCard
          currentPlan={currentPlan}
          defaultLanguage={toBookLanguage(bookLang)}
          onStartWriting={startWritingFromIdeaBook}
          onOpenAdvancedForge={openBookForgeFromIdeaBook}
        />

        <DashboardHomePillars
          onCharacterStudio={openFreshCharacterStudio}
          onStudyOs={() => navigateFromDashboard(getToolRoute("study"))}
        />

        <div className="mb-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <DashboardContinueCard
            projects={projects}
            lastProject={dashboardContextProject}
            onContinue={(projectId) => goApp({ projectId })}
            onOpenProjects={() => openDashboardTool("projects")}
          />

          <section ref={advancedToolsAnchorRef} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.18)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">Strumenti avanzati</p>
                <h2 className="mt-1 text-lg font-black text-white">Console qualità</h2>
                <p className="mt-1 text-xs leading-5 text-white/55">
                  Audit, continuità, mercato e strumenti editoriali restano raccolti in un pannello dedicato.
                </p>
              </div>
              <span className="rounded-xl border border-sky-300/20 bg-sky-400/10 px-2 py-1 text-[10px] font-black text-sky-100">
                {showAdvancedLaunchpad ? "ON" : "READY"}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] font-semibold text-white/58">
              <span className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2">Audit</span>
              <span className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2">Canon</span>
              <span className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2">Market</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setAdvancedLaunchpadEnabled(true);
                setShowAdvancedLaunchpad(true);
                openDashboardTool("advanced-tools");
              }}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.06] px-4 text-sm font-bold text-white/80 transition-colors hover:bg-white/[0.10]"
            >
              <Settings className="h-4 w-4" />
              Apri strumenti avanzati
            </button>
          </section>
        </div>

        {dashboardContextProject && (
          <div ref={packagingAnchorRef}>
            <DashboardPackagingRow
              projectTitle={dashboardContextProject.config.title}
              context={dashboardActionContext}
            />
          </div>
        )}

        {!activeDashboardTool && (
          <InProgressSection refreshKey={projects.length + (activeRun ? 1 : 0)} />
        )}

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

      {activeDashboardTool && activeDashboardTool !== "book-forge" && (
        <Suspense
          fallback={
            <ScriptoraAliveTransition
              compact
              overlay
              tone="export"
              title="Apro strumento…"
              steps={["Caricamento pannello", "Quasi pronto"]}
            />
          }
        >
          <DashboardToolHost
            activeTool={activeDashboardTool}
            onClose={closeAllDashboardTools}
            projects={projects}
            draftProjects={draftProjects}
            onDeleteProject={handleDelete}
            onGoApp={goApp}
            onOpenNewBook={openNewBookGuarded}
            onNavigate={navigateFromDashboard}
            ideaPreview={ideaPreviewProps}
            dashboardActionContext={dashboardActionContext}
          />
        </Suspense>
      )}

      {(showAdvancedSettings || showSettingsHub) && (
      <Suspense fallback={(
        <ScriptoraAliveTransition
          compact
          overlay
          tone="export"
          title="Sto aprendo le impostazioni…"
          steps={["Caricamento pannello…", "Quasi pronto…"]}
        />
      )}>
      {showAdvancedSettings && <AdvancedAppearanceDialog open onClose={() => setShowAdvancedSettings(false)} />}
      {showSettingsHub && (
          <ScriptoraSettingsHub
            open={showSettingsHub}
            onClose={() => setShowSettingsHub(false)}
            onOpenAppearance={() => { closeAllDashboardTools(); setShowAdvancedSettings(true); }}
            onOpenAuthorIdentity={() => openAuthorIdentity()}
            onOpenUsage={() => navigate("/usage?focus=purchase")}
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
        onAuthorIdentity={() => openAuthorIdentity()}
        onAppearance={() => { closeAllDashboardTools(); setShowAdvancedSettings(true); }}
        onCredits={() => navigate("/usage?focus=purchase")}
        onPricing={() => navigate("/pricing")}
      />

      <DevModeUnlockDialog open={showDevUnlock} onOpenChange={setShowDevUnlock} onUnlocked={() => navigate("/usage")} />
      <BetaActivationDialog open={showBetaDialog} onOpenChange={setShowBetaDialog} />
    </div>
  );
}
