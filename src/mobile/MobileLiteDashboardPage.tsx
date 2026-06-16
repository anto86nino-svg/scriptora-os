import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Download,
  FileText,
  GraduationCap,
  Library,
  Loader2,
  Sparkles,
  UserRound,
  WalletCards,
} from "lucide-react";
import type { AuthorIdentity, BookBlueprint, BookConfig, BookProject } from "@/types/book";
import type { StudioLaunchPayload } from "@/lib/book-config-studio/types";
import { AuthSessionButton } from "@/components/auth/AuthSessionButton";
import { GlobalCreditBar } from "@/components/billing/GlobalCreditBar";
import { ScriptoraAliveTransition } from "@/components/boot/ScriptoraAliveTransition";
import { useAuth } from "@/hooks/useAuth";
import { getProjectCoverDataUrl } from "@/lib/cover-session";
import { isProjectComplete } from "@/lib/project-status";
import { getLastProjectId, loadProjects, setLastProjectId } from "@/services/storageService";
import { applyAuthorIdentityToConfig, getSelectedAuthorIdentity } from "@/lib/author-identity";
import { normalizeBookConfig } from "@/lib/book-config-studio/defaults";
import { buildBookTypeLock as buildGenreLock } from "@/lib/book-type-engine";
import { runGenerateBlueprint } from "@/lib/generation-runtime";
import { usePlan } from "@/lib/plan";
import { toast } from "sonner";
import { MobileBookForge } from "@/mobile/MobileBookForge";

const HomeExportDialog = lazy(() =>
  import("@/components/HomeExportDialog").then((m) => ({ default: m.HomeExportDialog })),
);

function countWords(project?: BookProject | null): number {
  if (!project) return 0;
  return (project.chapters || []).reduce(
    (sum, chapter) => sum + (chapter.content || "").split(/\s+/).filter(Boolean).length,
    0,
  );
}

function projectProgress(project?: BookProject | null): number {
  if (!project) return 0;
  if (project.phase === "complete") return 100;
  const done = project.chapters?.filter((chapter) => (chapter.content || "").trim().length > 50).length || 0;
  const total = project.config?.numberOfChapters || project.blueprint?.chapterOutlines?.length || project.chapters?.length || 0;
  return total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
}

function lastChapterLabel(project?: BookProject | null): string {
  if (!project?.chapters?.length) return "Blueprint pronto per iniziare";
  const lastWrittenIndex = project.chapters.findLastIndex((chapter) => (chapter.content || "").trim().length > 50);
  if (lastWrittenIndex >= 0) return `Ultimo capitolo: ${lastWrittenIndex + 1}`;
  return "Capitoli pronti da generare";
}

function coverFor(project?: BookProject | null): string | null {
  if (!project?.id) return null;
  try {
    return getProjectCoverDataUrl(project.id);
  } catch {
    return null;
  }
}

export default function MobileLiteDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { currentPlan } = usePlan();
  const [projects, setProjects] = useState<BookProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExport, setShowExport] = useState(false);
  const [showBookForge, setShowBookForge] = useState(false);
  const [authorIdentity, setAuthorIdentity] = useState<AuthorIdentity>(() => getSelectedAuthorIdentity());

  const freeBookUsed = currentPlan === "free" && projects.length > 0;

  const openMobileBookForge = useCallback(() => {
    if (freeBookUsed) {
      toast.error("Hai già usato il libro gratuito. Passa a un piano superiore per crearne altri.");
      navigate("/pricing");
      return;
    }
    setAuthorIdentity(getSelectedAuthorIdentity());
    setShowBookForge(true);
  }, [freeBookUsed, navigate]);

  useEffect(() => {
    const state = location.state as { openForge?: boolean; openWizard?: boolean; openNewBook?: boolean } | null;
    if (!state?.openForge && !state?.openWizard && !state?.openNewBook) return;
    openMobileBookForge();
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate, openMobileBookForge]);

  const handleStudioComplete = useCallback(
    (payload: StudioLaunchPayload) => {
      const finalConfig = applyAuthorIdentityToConfig(
        normalizeBookConfig(payload.config),
        authorIdentity,
      ) as BookConfig;
      sessionStorage.setItem(
        "scriptora-new-book",
        JSON.stringify({
          ...payload,
          config: finalConfig,
        }),
      );
      setShowBookForge(false);
      navigate("/app");
    },
    [authorIdentity, navigate],
  );

  const handleGenerateBlueprint = useCallback(async (config: BookConfig): Promise<BookBlueprint> => {
    const finalConfig = applyAuthorIdentityToConfig(normalizeBookConfig(config), authorIdentity) as BookConfig;
    const genreLock = buildGenreLock(finalConfig);
    const { blueprint } = await runGenerateBlueprint(finalConfig, genreLock);
    return blueprint;
  }, [authorIdentity]);

  useEffect(() => {
    let mounted = true;
    const apply = (items: BookProject[]) => {
      if (!mounted) return;
      setProjects(items);
      setLoading(false);
    };

    loadProjects((fresh) => apply(fresh)).then(apply).catch(() => apply([]));

    const refresh = () => {
      loadProjects((fresh) => apply(fresh)).then(apply).catch(() => apply([]));
    };
    window.addEventListener("scriptora-projects-change", refresh);
    return () => {
      mounted = false;
      window.removeEventListener("scriptora-projects-change", refresh);
    };
  }, []);

  const lastProject = useMemo(() => {
    const lastId = getLastProjectId();
    return (lastId ? projects.find((project) => project.id === lastId) : null) ||
      projects.find((project) => !isProjectComplete(project)) ||
      projects[0] ||
      null;
  }, [projects]);

  const progress = projectProgress(lastProject);
  const cover = coverFor(lastProject);
  const words = countWords(lastProject);
  const remaining = lastProject
    ? Math.max(0, (lastProject.config?.numberOfChapters || 0) - (lastProject.chapters?.filter((chapter) => (chapter.content || "").trim().length > 50).length || 0))
    : 0;

  const openProject = (project: BookProject | null = lastProject) => {
    if (project?.id) {
      setLastProjectId(project.id);
      sessionStorage.setItem("scriptora-open-project", project.id);
    }
    navigate("/app");
  };

  const displayName =
    (user?.user_metadata as any)?.full_name ||
    (user?.user_metadata as any)?.name ||
    user?.email ||
    "Autore";

  return (
    <main className="scriptora-page-scroll min-h-[100dvh] bg-background px-4 pb-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] pt-3 safe-area-pt">
      <header className="sticky top-0 z-30 -mx-4 border-b border-white/10 bg-background/98 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200/70">Scriptora Mobile Lite</p>
            <h1 className="truncate text-xl font-semibold text-white">Pure Creator Experience</h1>
          </div>
          <GlobalCreditBar variant="mobilePill" />
        </div>
      </header>

      <section className="mt-4 rounded-[28px] border border-sky-300/18 bg-gradient-to-br from-slate-950 via-slate-950 to-sky-950/45 p-4 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="h-36 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-sky-400/20 via-slate-900 to-violet-500/20 shadow-lg">
            {cover ? (
              <img src={cover} alt={lastProject?.config.title || "Cover"} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col justify-between p-3">
                <BookOpen className="h-5 w-5 text-sky-200/80" />
                <p className="line-clamp-4 text-xs font-bold leading-4 text-white">
                  {lastProject?.config.title || "Il tuo prossimo libro"}
                </p>
                <span className="h-1 w-10 rounded-full bg-sky-300/70" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Continua libro</p>
            <h2 className="mt-1 line-clamp-2 text-2xl font-semibold leading-tight text-white">
              {lastProject?.config.title || "Inizia da una nuova idea"}
            </h2>
            <p className="mt-2 text-sm leading-5 text-white/68">
              {lastProject ? `${lastChapterLabel(lastProject)} | ${remaining} capitoli rimasti` : "Nessun progetto attivo. Scriptora ti guida dal primo brief al blueprint."}
            </p>

            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-sky-300" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-white/55">
                <span>{progress}% completato</span>
                <span>{words.toLocaleString()} parole</span>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => (lastProject ? openProject(lastProject) : openMobileBookForge())}
          className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 text-base font-bold text-slate-950 shadow-lg"
        >
          {lastProject ? "Continua a scrivere" : "Apri Book Forge"}
          <ArrowRight className="h-5 w-5" />
        </button>
      </section>

      <section className="mt-4 grid gap-3">
        <MobileLiteAction
          icon={Sparkles}
          title="Book Forge"
          description="Racconta il libro a Scriptora: intervista, DNA Lock, blueprint e indice editabile."
          onClick={openMobileBookForge}
        />
        <MobileLiteAction
          icon={GraduationCap}
          title="Study OS"
          description="Carica PDF, DOCX o appunti. Ottieni riassunti, quiz, flashcard e orale."
          onClick={() => navigate("/study")}
        />
        <MobileLiteAction
          icon={Download}
          title="Export essenziale"
          description="EPUB, DOCX e PDF quando il libro e pronto."
          onClick={() => setShowExport(true)}
          disabled={projects.length === 0}
        />
      </section>

      <section className="mt-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Account e crediti</p>
            <p className="mt-1 truncate text-sm font-semibold text-white">{displayName}</p>
          </div>
          <AuthSessionButton />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => navigate("/usage")}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 text-sm font-semibold text-white"
          >
            <WalletCards className="h-4 w-4 text-sky-200" />
            Crediti
          </button>
          <button
            type="button"
            onClick={() => navigate("/pricing")}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 text-sm font-semibold text-white"
          >
            <UserRound className="h-4 w-4 text-emerald-200" />
            Piano
          </button>
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-white/10 bg-white/[0.035] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Progetti recenti</p>
            <p className="mt-1 text-sm text-white/62">{projects.length} libri sincronizzati</p>
          </div>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-sky-200" />}
        </div>
        <div className="mt-3 space-y-2">
          {projects.slice(0, 4).map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => openProject(project)}
              className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-3 text-left"
            >
              <FileText className="h-4 w-4 shrink-0 text-sky-200" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">{project.config.title || "Senza titolo"}</span>
                <span className="block truncate text-[11px] text-white/48">{project.config.genre} | {projectProgress(project)}%</span>
              </span>
              <ArrowRight className="h-4 w-4 text-white/40" />
            </button>
          ))}
          {!loading && projects.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/12 p-4 text-sm leading-6 text-white/58">
              Nessun libro ancora. Apri Book Forge e racconta il libro a Scriptora.
            </div>
          )}
        </div>
      </section>

      <nav className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] z-40 grid grid-cols-4 gap-2 rounded-3xl border border-white/10 bg-slate-950/96 p-2 shadow-xl">
        <LiteDockButton icon={BookOpen} label="Writer" onClick={() => openProject(lastProject)} />
        <LiteDockButton icon={Sparkles} label="Forge" onClick={openMobileBookForge} />
        <LiteDockButton icon={GraduationCap} label="Study" onClick={() => navigate("/study")} />
        <LiteDockButton icon={Library} label="Export" onClick={() => setShowExport(true)} disabled={projects.length === 0} />
      </nav>

      {showBookForge && (
        <MobileBookForge
          onClose={() => setShowBookForge(false)}
          authorIdentity={authorIdentity}
          onStudioComplete={handleStudioComplete}
          onGenerateBlueprint={handleGenerateBlueprint}
        />
      )}

      {showExport && (
        <Suspense fallback={<ScriptoraAliveTransition compact overlay tone="export" title="Sto aprendo Export..." steps={["Controllo libro...", "Preparo formati..."]} />}>
          <HomeExportDialog
            open
            projects={projects}
            initialProjectId={lastProject?.id}
            onClose={() => setShowExport(false)}
          />
        </Suspense>
      )}
    </main>
  );
}

interface MobileLiteActionProps {
  icon: typeof BookOpen;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}

function MobileLiteAction({ icon: Icon, title, description, onClick, disabled }: MobileLiteActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[88px] items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.045] p-4 text-left shadow-md disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-300/18 bg-sky-400/10 text-sky-100">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-white">{title}</span>
        <span className="mt-1 block text-sm leading-5 text-white/58">{description}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-white/40" />
    </button>
  );
}

interface LiteDockButtonProps {
  icon: typeof BookOpen;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

function LiteDockButton({ icon: Icon, label, onClick, disabled }: LiteDockButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-semibold text-white/76 disabled:opacity-40"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
