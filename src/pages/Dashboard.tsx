import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { loadProjects, deleteProjectAsync, getLastProjectId } from "@/services/storageService";
import { isProjectComplete } from "@/lib/project-status";
import { NewBookDialog } from "@/components/NewBookDialog";
import { HomeExportDialog } from "@/components/HomeExportDialog";
import { TitleIntelligenceDialog } from "@/components/TitleIntelligenceDialog";
import { AdvancedAppearanceDialog } from "@/components/AdvancedAppearanceDialog";
import { CharacterStudioDialog, SCRIPTORA_CHARACTER_BIBLE_KEY, SCRIPTORA_CHARACTER_PROJECT_KEY } from "@/components/CharacterStudioDialog";
import { InProgressSection } from "@/components/Home/InProgressSection";
import { LibrarySection } from "@/components/Home/LibrarySection";
import { PlansSection } from "@/components/PlansSection";
import { PaywallGuard } from "@/components/PaywallGuard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BookOpen, Plus, FolderOpen, Trash2, Rocket, Zap,
  FileDown, ArrowRight, Clock, Globe, Flame, Loader2, Sparkles, Wand2,
  Library, Home as HomeIcon, X, BarChart3,
  TrendingUp, LogOut, CreditCard, Download as DownloadIcon, Settings, Users
} from "lucide-react";
import { BookConfig, BookProject } from "@/types/book";
import { t, getUILanguage, setUILanguage, UI_LANGUAGES, UILanguage } from "@/lib/i18n";
import { DevModeUnlockDialog } from "@/components/DevModeUnlockDialog";
import { isDevMode, exitDevMode, useDevMode } from "@/lib/dev-mode";
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
  const [showLibrary, setShowLibrary] = useState(false);
  const [showIdeaModal, setShowIdeaModal] = useState(false);
  const [projects, setProjects] = useState<BookProject[]>([]);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [, setLangTick] = useState(0);
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

  // Reset intent if user edits the idea after detection
  useEffect(() => {
    if (intent) setIntent(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea]);

  const freeBookUsed = currentPlan === "free" && projects.length > 0;

  const openNewBookGuarded = () => {
    if (freeBookUsed) {
      toast.error("Hai già usato il libro gratuito. Passa a Pro/Premium per crearne altri.");
      navigate("/pricing");
      return;
    }
    setShowNewBook(true);
  };

  const lastId = getLastProjectId();
  // Only surface "continue last" when the project still belongs to the active
  // environment (DEV vs USER). Cross-scope ids are silently ignored.
  const lastProject = lastId ? projects.find(p => p.id === lastId) : null;

  const deleteHomeProject = async (projectId: string, title?: string) => {
    const name = title || "questo progetto";
    const ok = window.confirm(`Eliminare "${name}" dalla home? Questa azione non si annulla.`);
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
    setLangTick(p => p + 1);
    setShowLangMenu(false);
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

        toast.success(`Personaggi collegati al romanzo · ${finalConfig.genre}${finalConfig.subcategory ? " / " + finalConfig.subcategory : ""}`);
      }
    } catch {
      finalConfig = config;
    }

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
        body: { idea: idea.trim(), language: bookLang },
      });
      if (error) throw error;
      if (data?.fallback) {
        if (data.code === "CREDITS_EXHAUSTED") {
          toast.error("AI credits exhausted. Open Advanced to fill the brief manually.");
        } else if (data.code === "RATE_LIMIT") {
          toast.error("Rate limit hit, retry in a moment.");
        } else {
          toast.error(data.error || "Detection unavailable");
        }
        return null;
      }
      if (data?.error) throw new Error(data.error);
      setIntent(data as DetectedIntent);
      return data as DetectedIntent;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Detection failed");
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
        autoStart: true,
      })
    );
    navigate("/auto-bestseller");
  };

  const heroValid = idea.trim().length >= 6;

  const currentLang = getUILanguage();
  const currentLangLabel = UI_LANGUAGES.find(l => l.value === currentLang)?.label || "English";

  const cards = [
    { icon: Plus, title: freeBookUsed ? "Libro gratuito usato" : t("new_book"), desc: freeBookUsed ? "Passa a Pro/Premium per creare altri libri" : t("new_book_desc"), color: freeBookUsed ? "text-muted-foreground" : "text-primary", action: openNewBookGuarded },
    { icon: Settings, title: "Impostazioni avanzate", desc: "Lingua app, sfondo Scriptora e font di scrittura", color: "text-amber-300", action: () => setShowAdvancedSettings(true) },
    { icon: Users, title: "Personaggi", desc: "Crea cast, ferite, segreti e continuità del romanzo", color: "text-pink-400", action: () => setShowCharacterStudio(true) },
    { icon: FolderOpen, title: t("projects"), desc: t("projects_desc"), color: "text-blue-400", action: () => setShowProjects(!showProjects) },
    { icon: Rocket, title: t("publish"), desc: t("publish_desc"), color: "text-purple-400", action: () => goApp({ section: "publish" }), feature: "export_epub" as const },
    { icon: Zap, title: t("title_intelligence"), desc: t("title_intelligence_desc"), color: "text-cyan-400", action: () => setShowTitleIntel(true), feature: "title_intelligence_base" as const },
    { icon: Library, title: "Biblioteca", desc: "Libri completati", color: "text-emerald-400", action: () => setShowLibrary(true) },
    { icon: TrendingUp, title: "Bestseller Radar", desc: "Studia titoli, domanda e concorrenza", color: "text-emerald-400", action: () => navigate("/bestseller-radar") },
    { icon: FileDown, title: t("export_label"), desc: t("export_desc"), color: "text-orange-400", action: () => setShowExport(true), feature: "export_epub" as const },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient background — subtle radial glow, pro feel */}
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 h-[480px] w-[820px] rounded-full opacity-[0.18] blur-3xl"
          style={{ background: "radial-gradient(closest-side, hsl(var(--primary)), transparent 70%)" }}
        />
        <div
          className="absolute top-1/3 -right-40 h-[360px] w-[360px] rounded-full opacity-[0.10] blur-3xl"
          style={{ background: "radial-gradient(closest-side, hsl(var(--accent)), transparent 70%)" }}
        />
      </div>

      {/* Sticky top bar */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-background/70 border-b border-border/50">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const now = Date.now();
              const recent = [...logoClicks.filter(t => now - t < 1500), now];
              if (recent.length >= 5) {
                setLogoClicks([]);
                if (isDevMode()) {
                  navigate("/usage");
                } else {
                  setShowDevUnlock(true);
                }
                return;
              }
              setLogoClicks(recent);
              if (recent.length === 1) {
                // Single click → normal navigation after a short delay if no follow-ups
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
            <span className="h-7 w-7 rounded-md bg-primary/15 text-primary flex items-center justify-center group-hover:bg-primary/25 transition-colors">
              <BookOpen className="h-3.5 w-3.5" />
            </span>
            <span className="font-bold tracking-[0.2em] text-foreground text-[13px]">SCRIPTORA</span>
          </button>

          {user && (
            <>
            <button
              onClick={() => navigate("/pricing")}
              title={displayName}
              className="ml-1 flex items-center gap-2 h-8 pl-1 pr-2 rounded-full bg-secondary/60 hover:bg-secondary border border-border/50 transition-colors"
            >
              <Avatar className="h-6 w-6">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                <AvatarFallback className="text-[10px] font-semibold bg-primary/15 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline text-[11px] font-medium text-foreground max-w-[120px] truncate">
                {displayName}
              </span>
            </button>
            <button
              onClick={async () => {
                try {
                  await signOut();
                  toast.success("Disconnesso");
                } catch { /* noop */ }
                navigate("/auth");
              }}
              title="Esci dall'account"
              className="h-8 w-8 flex items-center justify-center rounded-full bg-secondary/60 hover:bg-destructive/15 hover:text-destructive border border-border/50 text-muted-foreground transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
            </>
          )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate("/pricing")}
              className="h-8 px-3 hidden sm:flex items-center gap-1.5 rounded-lg text-xs font-medium bg-secondary/60 text-secondary-foreground hover:bg-secondary transition-colors border border-border/50"
              title="Pricing"
            >
              <CreditCard className="h-3.5 w-3.5" /> Pricing
            </button>
            <button
              onClick={() => navigate("/downloads")}
              className="h-8 px-3 hidden sm:flex items-center gap-1.5 rounded-lg text-xs font-medium bg-secondary/60 text-secondary-foreground hover:bg-secondary transition-colors border border-border/50"
              title="Downloads"
            >
              <DownloadIcon className="h-3.5 w-3.5" /> Downloads
            </button>
            {devOn && (
              <>
                <button
                  onClick={() => navigate("/usage")}
                  className="h-8 px-3 flex items-center gap-1.5 rounded-lg text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
                  title="Open Dev Dashboard"
                >
                  <BarChart3 className="h-3.5 w-3.5" /> Dashboard
                </button>
                <button
                  onClick={() => exitDevMode()}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-xs bg-secondary/60 text-secondary-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors border border-border/50"
                  title="Exit Dev Mode"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            <div className="relative">
              <button onClick={() => setShowLangMenu(!showLangMenu)}
                className="h-8 px-3 flex items-center gap-1.5 rounded-lg text-xs font-medium bg-secondary/60 text-secondary-foreground hover:bg-secondary transition-colors border border-border/50">
                <Globe className="h-3.5 w-3.5" /> {currentLangLabel}
              </button>
              {showLangMenu && (
                <>
                  <div className="fixed inset-0" onClick={() => setShowLangMenu(false)} />
                  <div className="absolute right-0 mt-1 w-40 bg-card border border-border rounded-lg shadow-xl py-1 z-50">
                    {UI_LANGUAGES.map(lang => (
                      <button key={lang.value} onClick={() => changeLang(lang.value)}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/50 transition-colors ${
                          lang.value === currentLang ? "text-primary font-medium" : "text-foreground"
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

      <div className="relative max-w-3xl mx-auto px-6 pt-10 pb-16">
        <InProgressSection refreshKey={projects.length + (activeRun ? 1 : 0)} />

        {/* Hero header — compact pro */}
        <div className="text-center mb-6 mt-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-semibold text-primary uppercase tracking-[0.18em] mb-3">
            <Sparkles className="h-3 w-3" /> AI Book Studio
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-1.5 leading-tight">
            Welcome back.
          </h1>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Start a new bestseller, manage drafts, or open your library.
          </p>
        </div>

        {/* PRIMARY CTA — opens idea modal */}
        <button
          onClick={() => setShowIdeaModal(true)}
          className="w-full mb-8 group relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/15 via-primary/10 to-accent/15 hover:from-primary/20 hover:via-primary/15 hover:to-accent/20 transition-all duration-300 p-5 text-left shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-0.5"
        >
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
              <Flame className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-bold text-foreground">Generate a new bestseller</p>
                <span className="px-1.5 py-0.5 rounded-md bg-primary/20 text-primary text-[9px] font-semibold uppercase tracking-wider">AI</span>
              </div>
              <p className="text-xs text-muted-foreground">Drop your idea — we handle genre, title and full draft.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform flex-shrink-0" />
          </div>
        </button>

        {/* Continue Last Project */}
        {lastProject && (
          <div onClick={() => goApp({ projectId: lastProject.id })}
            className="mb-8 p-4 rounded-xl border border-border/60 bg-gradient-to-r from-card to-card/40 hover:border-primary/40 cursor-pointer transition-all duration-200 group">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.18em] mb-1 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> {t("continue_project")}
                </p>
                <p className="text-sm font-semibold text-foreground truncate">{lastProject.config.title || "Untitled"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lastProject.chapters?.length || 0} {t("chapters").toLowerCase()} · {lastProject.phase}
                </p>
              </div>
              <button
                type="button"
                title="Elimina progetto"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  deleteHomeProject(lastProject.id, lastProject.config.title);
                }}
                className="h-9 w-9 rounded-full border border-destructive/30 bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors flex-shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors flex-shrink-0">
                <ArrowRight className="h-4 w-4 text-primary group-hover:text-primary-foreground transition-colors" />
              </div>
            </div>
          </div>
        )}

        {/* Section divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-border/50" />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.22em]">Quick Actions</span>
          <div className="h-px flex-1 bg-border/50" />
        </div>

        {/* Secondary Actions — pro grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-8">
          {cards.map(card => {
            const inner = (
              <button key={card.title} onClick={card.action}
                className="relative w-full p-3.5 rounded-xl border border-border/60 bg-card/60 hover:bg-card hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 cursor-pointer transition-all duration-200 group text-left overflow-hidden">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg bg-muted/40 group-hover:bg-muted/70 transition-colors ${card.color}`}>
                    <card.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{card.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{card.desc}</p>
                  </div>
                </div>
              </button>
            );
            return (card as any).feature
              ? <PaywallGuard key={card.title} feature={(card as any).feature} compact>{inner}</PaywallGuard>
              : <div key={card.title}>{inner}</div>;
          })}
        </div>

        {/* Project List (drafts only — completed go to Library) */}
        {showProjects && (() => {
          const drafts = projects.filter((p) => !isProjectComplete(p));
          return (
            <div className="bg-card border border-border rounded-xl p-3 space-y-1">
              <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                {t("my_projects")} — Bozze ({drafts.length})
              </p>
              {drafts.length === 0 && (
                <p className="text-xs text-muted-foreground/50 px-2 py-2">
                  Nessuna bozza. I progetti completati appaiono nella Biblioteca.
                </p>
              )}
              {drafts.map(p => (
                <div key={p.id}
                  className="group flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                  onClick={() => goApp({ projectId: p.id })}>
                  <div className="flex-1 min-w-0">
                    <span className="truncate block text-sm">{p.config.title || "Untitled"}</span>
                    <span className="text-[10px] text-muted-foreground/60">{p.config.genre} · {p.chapters?.length || 0} ch · {p.phase}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Beta access banner — visible only when user is NOT yet on beta/pro/premium and not in dev mode */}
        {!devOn && currentPlan === "free" && (
          <div className="rounded-xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/10 via-background to-background p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-fuchsia-500/20 flex items-center justify-center shrink-0">
              <FlaskConical className="h-5 w-5 text-fuchsia-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Have a Beta access code?</p>
              <p className="text-xs text-muted-foreground">Unlock 3 books with export — limited beta tester program.</p>
            </div>
            <button
              onClick={() => setShowBetaDialog(true)}
              className="px-3 py-2 rounded-md bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-300 border border-fuchsia-500/40 text-xs font-bold transition-colors"
            >
              Activate Beta
            </button>
          </div>
        )}

        {/* Active beta badge */}
        {currentPlan === "beta" && (
          <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/5 p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-fuchsia-500/20 flex items-center justify-center shrink-0">
              <FlaskConical className="h-5 w-5 text-fuchsia-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-fuchsia-300">Beta Tester</p>
              <p className="text-xs text-muted-foreground">Beta access: limited to 3 books · 15k tokens each</p>
            </div>
          </div>
        )}

        <PlansSection />
      </div>

      <NewBookDialog
        open={showNewBook}
        onClose={() => setShowNewBook(false)}
        onSubmit={(config) => {
          if (freeBookUsed) {
            setShowNewBook(false);
            toast.error("Hai già usato il libro gratuito. Passa a Pro/Premium per crearne altri.");
            navigate("/pricing");
            return;
          }
          handleNewBook(config);
        }}
      />
      <HomeExportDialog open={showExport} projects={projects} onClose={() => setShowExport(false)} />
      <TitleIntelligenceDialog open={showTitleIntel} onClose={() => setShowTitleIntel(false)} />
      <AdvancedAppearanceDialog open={showAdvancedSettings} onClose={() => setShowAdvancedSettings(false)} onLanguageChanged={() => setLangTick(p => p + 1)} />
      <CharacterStudioDialog open={showCharacterStudio} onClose={() => setShowCharacterStudio(false)} />

      {/* Idea modal — primary generation flow */}
      {showIdeaModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={() => !launching && !detecting && setShowIdeaModal(false)}
        >
          <div
            className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Generate a new bestseller</h2>
                  <p className="text-[11px] text-muted-foreground">Describe your idea — AI does the rest.</p>
                </div>
              </div>
              <button
                onClick={() => !launching && !detecting && setShowIdeaModal(false)}
                disabled={launching || detecting}
                className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label htmlFor="idea-modal" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.18em] mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" /> Your Book Idea
            </label>
            <textarea
              id="idea-modal"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="e.g. beekeeping for beginners… or how to use ChatGPT for business…"
              rows={3}
              autoFocus
              disabled={launching}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mr-1 flex items-center gap-1">
                <Globe className="h-3 w-3" /> Book language
              </span>
              {BOOK_LANGUAGES.map(l => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setBookLang(l.value)}
                  disabled={launching || detecting}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors disabled:opacity-50 ${
                    bookLang === l.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {intent && (
              <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-border space-y-2 text-xs">
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-primary/15 text-primary font-semibold uppercase tracking-wider text-[10px]">
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
                    {intent.numberOfChapters} chapters
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Suggested title</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {intent.suggestedTitles?.[intent.bestTitleIndex] || intent.suggestedTitles?.[0]}
                  </p>
                  <p className="text-xs text-muted-foreground italic mt-0.5">
                    {intent.suggestedSubtitles?.[intent.bestTitleIndex] || intent.suggestedSubtitles?.[0]}
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-semibold">Promise:</span> {intent.readerPromise}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <button
                onClick={launchOneClick}
                disabled={!heroValid || launching || detecting}
                className="flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
              >
                {launching || detecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />}
                {launching ? "Launching…" : detecting ? "Detecting…" : "Generate Full Book"}
              </button>
              {!intent ? (
                <button
                  onClick={detectIntent}
                  disabled={!heroValid || detecting || launching}
                  className="h-11 px-4 inline-flex items-center justify-center gap-2 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm hover:bg-secondary/80 transition-colors disabled:opacity-50"
                >
                  <Wand2 className="h-3.5 w-3.5" /> Preview
                </button>
              ) : (
                <button
                  onClick={() => { setShowIdeaModal(false); navigate("/auto-bestseller"); }}
                  disabled={launching}
                  className="h-11 px-4 inline-flex items-center justify-center gap-2 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm hover:bg-secondary/80 transition-colors disabled:opacity-50"
                >
                  Advanced <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {!heroValid && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Type at least 6 characters to launch.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Library modal — opens via the Biblioteca card */}
      {showLibrary && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={() => setShowLibrary(false)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Library className="h-4 w-4 text-emerald-500" />
                Biblioteca
              </h2>
              <button
                onClick={() => setShowLibrary(false)}
                className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Chiudi"
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
