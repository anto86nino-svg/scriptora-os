import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BarChart3, BookOpen, Loader2, Rocket, Sparkles, Target } from "lucide-react";
import type { BookProject } from "@/types/book";
import { MobileFullscreenShell } from "./MobileFullscreenShell";
import { ScriptoraAliveTransition } from "@/components/boot/ScriptoraAliveTransition";
import { loadProjects, saveProjectAsync, setLastProjectId } from "@/services/storageService";
import { dominateTitles } from "@/lib/kdp/money-engine";
import { usePlan } from "@/lib/plan";
import { cn } from "@/lib/utils";
import { getToolRoute } from "@/lib/one-flow/tool-registry";
import {
  clearMobileMarketContext,
  readMobileMarketContext,
  resolveMarketCloseNavigation,
} from "./mobileMarketContext";
import { restoreWriterScrollPosition } from "./clearProjectSession";
import { useDashboardReturn } from "@/hooks/useDashboardReturn";
import { getDashboardReturnPath } from "@/lib/one-flow/dashboard-return-context";

const BestsellerRadarCommercialPanel = lazy(() =>
  import("@/components/bestseller-radar/BestsellerRadarCommercialPanel").then((m) => ({
    default: m.BestsellerRadarCommercialPanel,
  })),
);

type Tab = "market" | "kdp" | "title";
type MobileTitleSuggestion = {
  title: string;
  subtitle?: string;
  score?: number | string;
  reason?: string;
};

export default function MobileMarketHubPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { returnContext } = useDashboardReturn();
  const { plan } = usePlan();
  const marketCtx = useMemo(() => readMobileMarketContext(), []);
  const [tab, setTab] = useState<Tab>("market");
  const [projects, setProjects] = useState<BookProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [titleBusy, setTitleBusy] = useState(false);
  const [titleResult, setTitleResult] = useState<string | null>(null);
  const [titleSuggestion, setTitleSuggestion] = useState<MobileTitleSuggestion | null>(null);

  useEffect(() => {
    loadProjects(setProjects)
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  const activeProject = useMemo(() => {
    if (marketCtx?.projectId) {
      return projects.find((p) => p.id === marketCtx.projectId) || null;
    }
    return (
      projects.find((p) => !p.phase || p.phase !== "complete") ||
      projects[0] ||
      null
    );
  }, [projects, marketCtx?.projectId]);

  const handleClose = () => {
    const returnPath = getDashboardReturnPath(returnContext);
    if (returnPath !== "/dashboard" || returnContext) {
      clearMobileMarketContext();
      navigate(returnPath);
      return;
    }
    const nav = resolveMarketCloseNavigation(marketCtx);
    clearMobileMarketContext();
    if (nav.restoreSection) {
      sessionStorage.setItem("scriptora-open-project", marketCtx!.projectId);
      sessionStorage.setItem("scriptora-open-section", nav.restoreSection);
    }
    navigate(nav.path);
    if (nav.restoreScroll != null && marketCtx?.projectId) {
      requestAnimationFrame(() => restoreWriterScrollPosition(marketCtx.projectId));
    }
  };

  const runTitleDomination = async () => {
    if (!activeProject) return;
    setTitleBusy(true);
    setTitleResult(null);
    setTitleSuggestion(null);
    try {
      const res = await dominateTitles(
        {
          idea:
            activeProject.config.title ||
            activeProject.blueprint?.overview ||
            activeProject.config.subtitle ||
            "Romanzo",
          genre: activeProject.config.genre,
          language: activeProject.config.language,
          bookType: activeProject.config.bookType,
          targetReader: activeProject.config.targetReader,
          desiredPromise: activeProject.blueprint?.overview?.slice(0, 240) || undefined,
        },
        plan,
      );
      const best = res.winner || res.titleCandidates?.[0];
      const score = res.winner?.finalScore ?? res.titleCandidates?.[0]?.kdpScore;
      setTitleSuggestion(best ? {
        title: best.title,
        subtitle: best.subtitle,
        score: score ?? "—",
        reason: res.winner?.reason,
      } : null);
      setTitleResult(
        best
          ? `${best.title}${best.subtitle ? `\n${best.subtitle}` : ""}\nScore: ${score ?? "—"}/100${res.winner?.reason ? `\n\n${res.winner.reason}` : ""}`
          : "Nessun titolo generato — riprova.",
      );
    } catch {
      setTitleResult("Title Domination non disponibile — riprova tra poco.");
    } finally {
      setTitleBusy(false);
    }
  };

  const applyTitleSuggestion = async () => {
    if (!activeProject || !titleSuggestion?.title?.trim()) return;
    const now = new Date().toISOString();
    const updatedProject: BookProject = {
      ...activeProject,
      updatedAt: now,
      config: {
        ...activeProject.config,
        title: titleSuggestion.title.trim(),
        subtitle: titleSuggestion.subtitle?.trim() || activeProject.config.subtitle,
      },
    };
    setLastProjectId(updatedProject.id);
    setProjects((items) => items.map((project) => project.id === updatedProject.id ? updatedProject : project));
    await saveProjectAsync(updatedProject);
    setTitleResult(`Titolo applicato al progetto.\n\n${updatedProject.config.title}${updatedProject.config.subtitle ? `\n${updatedProject.config.subtitle}` : ""}`);
    setTitleSuggestion(null);
  };

  const openPublishingCenter = () => {
    if (activeProject?.id) setLastProjectId(activeProject.id);
    navigate(getToolRoute("publishing"), {
      state: activeProject?.id ? { projectId: activeProject.id } : undefined,
    });
  };

  const bookLabel = activeProject?.config.title || "Il tuo libro";
  const genreLabel = activeProject?.config.genre || "genere in definizione";

  return (
    <MobileFullscreenShell
      title="Market OS"
      subtitle={`Strumenti per «${bookLabel}»`}
      onClose={handleClose}
    >
      <div className="scriptora-mobile-enter border-b border-white/[0.08] px-4 py-3">
        <div className="flex items-center gap-3 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-3 py-2.5">
          <BookOpen className="h-4 w-4 shrink-0 text-violet-200" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{bookLabel}</p>
            <p className="truncate text-[11px] text-white/50">{genreLabel} · analisi contestuale</p>
          </div>
        </div>
      </div>

      <div className="border-b border-white/[0.08] px-3 py-2">
        <div className="grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
          <TabButton active={tab === "market"} onClick={() => setTab("market")} icon={BarChart3} label="Mercato" />
          <TabButton active={tab === "kdp"} onClick={() => setTab("kdp")} icon={Rocket} label="KDP" />
          <TabButton active={tab === "title"} onClick={() => setTab("title")} icon={Target} label="Titoli" />
        </div>
      </div>

      {loading ? (
        <ScriptoraAliveTransition
          compact
          tone="writer"
          title="Carico intelligence per il tuo libro…"
          steps={["Genere e DNA", "Segnali di mercato"]}
          minHeight="200px"
        />
      ) : tab === "market" ? (
        <Suspense
          fallback={
            <ScriptoraAliveTransition compact tone="writer" title="Carico Market Research…" minHeight="200px" />
          }
        >
          <div className="scriptora-mobile-enter p-3">
            <BestsellerRadarCommercialPanel projects={projects} initialProjectId={activeProject?.id} />
          </div>
        </Suspense>
      ) : tab === "kdp" ? (
        <div className="scriptora-mobile-enter space-y-4 px-4 py-5">
          <p className="text-sm leading-6 text-white/65">
            KDP completo per <span className="font-semibold text-white">{bookLabel}</span> vive nel Publishing Center:
            readiness, metadata, cover, export e checklist devono restare nello stesso cockpit.
          </p>
          <div className="rounded-2xl border border-amber-300/25 bg-amber-400/10 p-4 text-sm leading-6 text-amber-50/82">
            Questa sezione e' desktop-only: su mobile non mostriamo una checklist dimostrativa per non creare una pubblicazione parziale o non salvata.
          </div>
          <button
            type="button"
            onClick={openPublishingCenter}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-violet-500 px-4 text-sm font-bold text-white"
          >
            <Rocket className="h-4 w-4" />
            Apri Publishing Center
          </button>
        </div>
      ) : (
        <div className="scriptora-mobile-enter space-y-4 px-4 py-5">
          <p className="text-sm leading-6 text-white/65">
            Title Domination per <span className="font-semibold text-white">{bookLabel}</span> — titolo, sottotitolo e
            score commerciale dal DNA attuale.
          </p>
          <button
            type="button"
            disabled={!activeProject || titleBusy}
            onClick={runTitleDomination}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-violet-500 px-4 text-sm font-bold text-white disabled:opacity-40"
          >
            {titleBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Genera titoli per questo libro
          </button>
          {titleResult && (
            <div className="space-y-3">
              <pre className="whitespace-pre-wrap rounded-2xl border border-violet-400/25 bg-violet-500/10 p-4 text-sm leading-6 text-violet-100">
                {titleResult}
              </pre>
              {titleSuggestion && (
                <button
                  type="button"
                  onClick={applyTitleSuggestion}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-slate-950"
                >
                  <Target className="h-4 w-4" />
                  Applica titolo al progetto
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </MobileFullscreenShell>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof BarChart3;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold transition",
        active ? "bg-white text-slate-950" : "text-white/55",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
