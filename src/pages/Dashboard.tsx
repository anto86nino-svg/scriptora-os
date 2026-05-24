import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { loadProjects, deleteProjectAsync, getLastProjectId, getCurrentUserId } from "@/services/storageService";
import { isProjectComplete } from "@/lib/project-status";
import { NewBookDialog } from "@/components/NewBookDialog";
import { HomeExportDialog } from "@/components/HomeExportDialog";
import { TitleIntelligenceDialog } from "@/components/TitleIntelligenceDialog";
import { AdvancedAppearanceDialog } from "@/components/AdvancedAppearanceDialog";
import { CharacterStudioDialog, SCRIPTORA_CHARACTER_BIBLE_KEY, SCRIPTORA_CHARACTER_PROJECT_KEY } from "@/components/CharacterStudioDialog";
import { ManuscriptAnalyzerDialog } from "@/components/ManuscriptAnalyzerDialog";
import { NotepadDialog } from "@/components/NotepadDialog";
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
  CheckCircle2, NotebookPen, Fingerprint
} from "lucide-react";
import { BookConfig, BookProject } from "@/types/book";
import { t, tt, getUILanguage, setUILanguage, UI_LANGUAGES, UILanguage, useUILanguage } from "@/lib/i18n";
import { AUTHOR_IDENTITY_CHANGED_EVENT, applyAuthorIdentityToConfig, getSelectedAuthorIdentity, loadAuthorIdentities, setSelectedAuthorIdentityId } from "@/lib/author-identity";
import { DevModeUnlockDialog } from "@/components/DevModeUnlockDialog";
import { enableDevMode, isDevMode, exitDevMode, useDevMode } from "@/lib/dev-mode";
import { BetaActivationDialog } from "@/components/BetaActivationDialog";
import { usePlan } from "@/lib/plan";
import { FlaskConical } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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

export default function Home() {
  const navigate = useNavigate();
  const devOn = useDevMode();
  const [showNewBook, setShowNewBook] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showTitleIntel, setShowTitleIntel] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showCharacterStudio, setShowCharacterStudio] = useState(false);
  const [showManuscriptAnalyzer, setShowManuscriptAnalyzer] = useState(false);
  const [showNotepad, setShowNotepad] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showIdeaModal, setShowIdeaModal] = useState(false);
  const [projects, setProjects] = useState<BookProject[]>([]);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const currentLang = useUILanguage();
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
      const raw = sessionStorage.getItem("nexora-active-run");
      if (raw) setActiveRun(JSON.parse(raw));
    } catch { /* noop */ }

    // Re-load when DEV MODE is toggled — projects are scoped per environment.
    const onDevChange = () => {
      setProjects([]);
      setActiveRun(null);
      loadProjects((fresh) => setProjects(fresh)).then(setProjects);
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

  const openNewBookGuarded = () => {
    if (freeBookUsed) {
      toast.error(t("toast_free_book_used"));
      navigate("/pricing");
      return;
    }
    setShowNewBook(true);
  };

  const guardFreeAiFeature = (action: () => void) => () => {
    if (freeBookUsed) {
      toast.error(t("toast_free_feature_locked"));
      navigate("/pricing");
      return;
    }
    action();
  };

  const lastId = getLastProjectId();
  // Only surface "continue last" when the project still belongs to the active
  // environment (DEV vs USER). Cross-scope ids are silently ignored.
  const lastProject = lastId ? projects.find(p => p.id === lastId) : null;

  const deleteHomeProject = async (projectId: string, title?: string) => {
    const name = title || t("this_project");
    const ok = window.confirm(tt("confirm_delete_project", { name }));
    if (!ok) return;

    await deleteProjectAsync(projectId);
    setProjects((items) => items.filter((p) => p.id !== projectId));
    try {
      if (getLastProjectId() === projectId) setLastProjectId("");
      sessionStorage.removeItem("nexora-open-project");
    } catch {}
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

  const goApp = (opts?: { section?: string; projectId?: string }) => {
    if (opts?.projectId) sessionStorage.setItem("nexora-open-project", opts.projectId);
    if (opts?.section) sessionStorage.setItem("nexora-open-section", opts.section);
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

    finalConfig = applyAuthorIdentityToConfig(finalConfig, activeAuthor) as BookConfig;
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
      loadProjects((fresh) => setProjects(fresh)).then(setProjects);
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
      setIntent(data as DetectedIntent);
      return data as DetectedIntent;
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
    sessionStorage.setItem(
      "nexora-auto-brief",
      JSON.stringify({
        idea: idea.trim(),
        genre: i.genre,
        subcategory: i.subcategory,
        targetAudience: i.targetAudience,
        tone: i.tone,
        language: bookLang,
        numberOfChapters: i.numberOfChapters,
        level: i.level,
        readerPromise: i.readerPromise,
        prefilledTitle: i.suggestedTitles?.[best],
        prefilledSubtitle: i.suggestedSubtitles?.[best],
        authorIdentityId: activeAuthor.id,
        authorIdentity: activeAuthor,
        authorName: activeAuthor.penName,
        autoStart: true,
      })
    );
    navigate("/auto-bestseller");
  };

  const heroValid = idea.trim().length >= 6;

  const currentLangLabel = UI_LANGUAGES.find(l => l.value === currentLang)?.label || "English";
  const completedProjects = projects.filter(isProjectComplete);
  const draftProjects = projects.filter((p) => !isProjectComplete(p));
  const totalChapters = projects.reduce((sum, p) => sum + (p.chapters?.length || 0), 0);
  const totalWords = projects.reduce(
    (sum, p) => sum + (p.chapters || []).reduce(
      (chapterSum, ch) => chapterSum + (ch.content?.split(/\s+/).filter(Boolean).length || 0),
      0,
    ),
    0,
  );
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
  const workspaceStats = [
    { label: t("projects"), value: projects.length.toLocaleString(), detail: tt("draft_count", { count: draftProjects.length }), icon: FolderOpen, iconBg: "ios-icon-blue" },
    { label: t("completed"), value: completedProjects.length.toLocaleString(), detail: t("ready_to_export"), icon: CheckCircle2, iconBg: "ios-icon-green" },
    { label: t("chapters"), value: totalChapters.toLocaleString(), detail: t("generated_detail"), icon: BookOpen, iconBg: "ios-icon-orange" },
    { label: t("words_unit"), value: totalWords > 0 ? totalWords.toLocaleString() : "0", detail: t("in_library"), icon: FileDown, iconBg: "ios-icon-pink" },
  ];

  const cards = [
    { group: "create", icon: Flame, title: t("generate_bestseller_title"), desc: t("generate_bestseller_desc"), iconBg: "ios-icon-blue", action: () => setShowIdeaModal(true), emphasis: true },
    { group: "create", icon: HomeIcon, title: t("dashboard_overview"), desc: t("dashboard_overview_desc"), iconBg: "ios-icon-cyan", action: () => navigate("/dashboard") },
    { group: "create", icon: BookOpen, title: t("editor"), desc: t("write_desc"), iconBg: "ios-icon-violet", action: () => goApp() },
    { group: "create", icon: Plus, title: freeBookUsed ? t("free_book_used") : t("new_book"), desc: freeBookUsed ? t("upgrade_more_books") : t("new_book_desc"), iconBg: freeBookUsed ? "ios-icon-slate" : "ios-icon-green", action: openNewBookGuarded },

    { group: "editorial", icon: Wand2, title: t("analyze_manuscript"), desc: t("analyze_manuscript_desc"), iconBg: "ios-icon-teal", action: () => setShowManuscriptAnalyzer(true) },
    { group: "editorial", icon: Sparkles, title: t("rewrite_studio"), desc: t("rewrite_studio_desc"), iconBg: "ios-icon-pink", action: () => goApp() },
    { group: "editorial", icon: Users, title: freeBookUsed ? `${t("characters")} ${t("pro_feature_suffix")}` : t("characters"), desc: freeBookUsed ? t("unlock_pro") : t("characters_desc"), iconBg: freeBookUsed ? "ios-icon-slate" : "ios-icon-pink", action: guardFreeAiFeature(() => setShowCharacterStudio(true)), feature: freeBookUsed ? "export_epub" as const : undefined },
    { group: "editorial", icon: NotebookPen, title: t("block_notes"), desc: t("block_notes_desc"), iconBg: "ios-icon-yellow", action: () => setShowNotepad(true) },

    { group: "publishing", icon: Rocket, title: t("kdp_tools"), desc: t("kdp_tools_desc"), iconBg: "ios-icon-violet", action: () => navigate("/kdp-launch"), feature: "kdp_market_base" as const },
    { group: "publishing", icon: Zap, title: freeBookUsed ? `Title ${t("pro_feature_suffix")}` : t("title_intelligence"), desc: freeBookUsed ? t("unlock_pro") : t("title_desc"), iconBg: freeBookUsed ? "ios-icon-slate" : "ios-icon-teal", action: guardFreeAiFeature(() => setShowTitleIntel(true)), feature: "title_intelligence_base" as const },
    { group: "publishing", icon: TrendingUp, title: freeBookUsed ? `Radar ${t("pro_feature_suffix")}` : "Bestseller Radar", desc: freeBookUsed ? t("unlock_pro") : t("radar_desc"), iconBg: freeBookUsed ? "ios-icon-slate" : "ios-icon-green", action: guardFreeAiFeature(() => navigate("/bestseller-radar")), feature: freeBookUsed ? "export_epub" as const : undefined },
    { group: "publishing", icon: BarChart3, title: freeBookUsed ? `Keyword ${t("pro_feature_suffix")}` : "Keyword Gold", desc: freeBookUsed ? t("unlock_pro") : t("keyword_desc"), iconBg: freeBookUsed ? "ios-icon-slate" : "ios-icon-yellow", action: guardFreeAiFeature(() => navigate("/keyword-gold")), feature: freeBookUsed ? "export_epub" as const : "kdp_market_base" as const },
    { group: "publishing", icon: FileDown, title: t("export_label"), desc: t("export_desc"), iconBg: "ios-icon-orange", action: () => setShowExport(true), feature: "export_epub" as const },
    { group: "publishing", icon: Library, title: t("library"), desc: t("library_desc"), iconBg: "ios-icon-green", action: () => setShowLibrary(true) },

    { group: "system", icon: Users, title: t("author_identity"), desc: t("author_identity_desc"), iconBg: "ios-icon-blue", action: openNewBookGuarded },
    { group: "system", icon: Settings, title: t("background_atmosphere"), desc: t("background_atmosphere_desc"), iconBg: "ios-icon-slate", action: guardFreeAiFeature(() => setShowAdvancedSettings(true)), feature: freeBookUsed ? "export_epub" as const : undefined },
    { group: "system", icon: FolderOpen, title: t("projects"), desc: t("projects_desc"), iconBg: "ios-icon-cyan", action: () => setShowProjects(!showProjects) },
    { group: "system", icon: Settings, title: freeBookUsed ? `${t("settings")} ${t("pro_feature_suffix")}` : t("settings"), desc: freeBookUsed ? t("unlock_pro") : t("settings_desc"), iconBg: freeBookUsed ? "ios-icon-slate" : "ios-icon-yellow", action: guardFreeAiFeature(() => setShowAdvancedSettings(true)), feature: freeBookUsed ? "export_epub" as const : undefined },
  ];

  const cardGroups = [
    { id: "create", title: t("creation_suite"), desc: t("creation_suite_desc") },
    { id: "editorial", title: t("editorial_suite"), desc: t("editorial_suite_desc") },
    { id: "publishing", title: t("publishing_suite"), desc: t("publishing_suite_desc") },
    { id: "system", title: t("system_suite"), desc: t("system_suite_desc") },
  ];

  return (
    <div className="scriptora-ios-screen min-h-screen relative overflow-hidden">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-background/[0.55] backdrop-blur-2xl">
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

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 sm:pt-8 lg:px-8">
        <div className="mb-4 grid gap-3 sm:mb-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
          <section className="ios-panel border-white/15 bg-slate-950/34 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl sm:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2 sm:mb-3">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.10] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/78 shadow-sm">
                    <Sparkles className="h-3 w-3 text-sky-300" /> {t("ai_book_studio")}
                  </span>
                  <span className={`inline-flex items-center rounded-lg border px-2 py-1 text-[10px] font-semibold uppercase sm:hidden ${
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
                <p className="mt-2 max-h-10 max-w-xl overflow-hidden text-xs font-medium leading-5 text-white/74 drop-shadow-[0_1px_10px_rgba(0,0,0,0.45)] sm:mt-3 sm:max-h-none sm:text-sm sm:leading-6">
                  {tt("plan_active_sentence", { plan: devOn ? "DEV" : planLabel })}
                </p>
              </div>
              <button
                onClick={() => setShowIdeaModal(true)}
                className="group inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-200/70 bg-amber-50 px-3 text-xs font-bold text-slate-950 shadow-[0_16px_42px_rgba(251,191,36,0.28)] ring-1 ring-white/50 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_48px_rgba(251,191,36,0.36)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:h-12 sm:px-5 sm:text-sm"
              >
                <Flame className="h-4 w-4" />
                {t("generate_bestseller_title")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </section>

          <section className="ios-panel hidden border-white/15 bg-slate-950/30 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.20)] backdrop-blur-2xl sm:block sm:p-6">
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

        <InProgressSection refreshKey={projects.length + (activeRun ? 1 : 0)} />

        <div className="mb-4 grid grid-cols-4 gap-1.5 sm:mb-6 sm:grid-cols-2 sm:gap-2.5 lg:grid-cols-4">
          {workspaceStats.map((stat) => (
            <div key={stat.label} className="ios-glass-soft rounded-xl border-white/15 bg-white/[0.075] p-2 shadow-[0_10px_32px_rgba(0,0,0,0.14)] backdrop-blur-xl sm:p-3">
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[8px] font-semibold uppercase text-foreground/58 sm:text-[10px]">{stat.label}</p>
                  <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground sm:mt-1 sm:text-xl">{stat.value}</p>
                </div>
                <span className={`ios-icon ${stat.iconBg} hidden h-9 w-9 rounded-[14px] sm:inline-flex`}>
                  <stat.icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-1 hidden truncate text-[11px] text-foreground/60 sm:block">{stat.detail}</p>
            </div>
          ))}
        </div>

        {lastProject && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => goApp({ projectId: lastProject.id })}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                goApp({ projectId: lastProject.id });
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
                    {lastProject.config.title || t("untitled")}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-4 text-foreground/65">
                    {lastProjectDoneChapters}/{lastProjectTargetChapters || lastProject.chapters?.length || 0} {t("chapters").toLowerCase()} · {lastProject.phase}
                  </p>
                </div>
                <button
                  type="button"
                  title={t("delete")}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteHomeProject(lastProject.id, lastProject.config.title);
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

        <section className="mb-10">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("home_screen")}</p>
              <h2 className="mt-1 text-xl font-semibold text-white drop-shadow-[0_1px_12px_rgba(0,0,0,0.38)]">{t("launchpad")}</h2>
              <p className="mt-1 max-w-xl text-xs font-medium leading-5 text-white/72 drop-shadow-[0_1px_10px_rgba(0,0,0,0.38)]">{t("launchpad_desc")}</p>
            </div>
            <span className="hidden text-[11px] text-muted-foreground sm:inline">
              {tt("total_suffix", { count: projects.length, plan: planLabel })}
            </span>
          </div>

          <div className="space-y-7">
            {cardGroups.map((group) => {
              const groupCards = cards.filter((card) => card.group === group.id);
              return (
                <div key={group.id}>
                  <div className="mb-3 flex items-center justify-between gap-3 border-b border-white/15 pb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
                      <p className="mt-0.5 text-[11px] text-foreground/62">{group.desc}</p>
                    </div>
                    <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                      {groupCards.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    {groupCards.map(card => {
                      const Icon = card.icon;
                      const inner = (
                        <button
                          key={card.title}
                          onClick={card.action}
                          className={`group flex min-h-[136px] w-full flex-col items-start justify-between rounded-xl border border-white/15 bg-slate-950/28 p-3.5 text-left shadow-[0_14px_38px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.105] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                            (card as any).emphasis ? "sm:col-span-2 lg:col-span-2" : ""
                          }`}
                        >
                          <span className={`ios-icon ${card.iconBg} h-11 w-11 rounded-[17px] shadow-[0_10px_24px_rgba(0,0,0,0.20)] ring-1 ring-white/18 sm:h-12 sm:w-12`}>
                            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                          </span>
                          <span className="mt-3 text-sm font-bold leading-5 text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]">{card.title}</span>
                          <span className="mt-1 text-[11px] font-medium leading-4 text-white/72 drop-shadow-[0_1px_8px_rgba(0,0,0,0.32)]">{card.desc}</span>
                        </button>
                      );
                      return (card as any).feature
                        ? <PaywallGuard key={card.title} feature={(card as any).feature} compact>{inner}</PaywallGuard>
                        : <div key={card.title}>{inner}</div>;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {showProjects && (() => {
          const drafts = draftProjects;
          return (
            <div className="ios-panel mb-6 p-3">
              <div className="mb-2 flex items-center justify-between gap-3 px-1">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                  {tt("my_projects_drafts", { count: drafts.length })}
                </p>
                <button
                  onClick={() => setShowProjects(false)}
                  className="rounded-md px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                >
                  {t("close")}
                </button>
              </div>
              {drafts.length === 0 && (
                <p className="px-2 py-3 text-xs text-muted-foreground/70">
                  {t("no_drafts_library_hint")}
                </p>
              )}
              <div className="divide-y divide-white/10">
                {drafts.map(p => (
                  <div key={p.id}
                    className="group flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-white/[0.07] hover:text-foreground"
                    onClick={() => goApp({ projectId: p.id })}>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.config.title || t("untitled")}</span>
                      <span className="text-[10px] text-muted-foreground/70">{p.config.genre} · {p.chapters?.length || 0} ch · {p.phase}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                      className="rounded-md p-1 text-muted-foreground opacity-70 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

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
      <HomeExportDialog open={showExport} projects={projects} onClose={() => setShowExport(false)} />
      <TitleIntelligenceDialog open={showTitleIntel} onClose={() => setShowTitleIntel(false)} />
      <AdvancedAppearanceDialog open={showAdvancedSettings} onClose={() => setShowAdvancedSettings(false)} />
      <CharacterStudioDialog open={showCharacterStudio} onClose={() => setShowCharacterStudio(false)} />
      <ManuscriptAnalyzerDialog
        open={showManuscriptAnalyzer}
        onClose={() => setShowManuscriptAnalyzer(false)}
        canCreateProject={!freeBookUsed}
        onLimitReached={() => navigate("/pricing")}
      />
      <NotepadDialog open={showNotepad} onClose={() => setShowNotepad(false)} />

      {/* Idea modal — primary generation flow */}
      {showIdeaModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-2xl"
          onClick={() => !launching && !detecting && setShowIdeaModal(false)}
        >
          <div
            className="ios-panel relative max-h-[90vh] w-full max-w-xl overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="ios-icon ios-icon-blue flex h-10 w-10 items-center justify-center rounded-[16px]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">{t("generate_bestseller_title")}</h2>
                  <p className="text-[11px] text-muted-foreground">{t("generate_bestseller_desc")}</p>
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
              <button
                onClick={launchOneClick}
                disabled={!heroValid || launching || detecting}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-white text-sm font-semibold text-slate-950 shadow-lg shadow-black/20 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {launching || detecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />}
                {launching ? t("launching") : detecting ? t("detecting") : t("generate_full_book")}
              </button>
              {!intent ? (
                <button
                  onClick={detectIntent}
                  disabled={!heroValid || detecting || launching}
                  className="ios-toolbar-button h-11 px-4 text-sm font-medium disabled:opacity-50"
                >
                  <Wand2 className="h-3.5 w-3.5" /> {t("preview_action")}
                </button>
              ) : (
                <button
                  onClick={() => { setShowIdeaModal(false); navigate("/auto-bestseller"); }}
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
      )}

      {/* Library modal — opens via the Biblioteca card */}
      {showLibrary && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-2xl"
          onClick={() => setShowLibrary(false)}
        >
          <div
            className="ios-panel relative max-h-[85vh] w-full max-w-2xl overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Library className="h-4 w-4 text-emerald-500" />
                {t("library")}
              </h2>
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
      )}

      <DevModeUnlockDialog open={showDevUnlock} onOpenChange={setShowDevUnlock} onUnlocked={() => navigate("/usage")} />
      <BetaActivationDialog open={showBetaDialog} onOpenChange={setShowBetaDialog} />
    </div>
  );
}
