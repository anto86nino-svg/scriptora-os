import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, BookOpen, ImagePlus, Loader2, Rocket, Sparkles, TrendingUp, Trophy, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { KdpScoreBadge } from "@/components/kdp/KdpScoreBadge";
import { KdpTitleDomination } from "@/components/kdp/KdpTitleDomination";
import { KdpNarrativeFlowPanel } from "@/components/kdp/KdpNarrativeFlowPanel";
import {
  clearKdpLaunchSession,
  createEmptyKdpSession,
  getOrCreateKdpSessionId,
  isKdpSessionRecoverable,
  loadKdpLaunchSession,
  saveKdpLaunchSession,
  sessionNeedsUnloadGuard,
  type KdpLaunchSession,
  type KdpLaunchStatus,
} from "@/lib/kdp/kdp-launch-session";
import { generateKdpNarrativeFlowAsync, type KdpNarrativeFlow } from "@/lib/kdp/narrative-flow";
import { fetchPlan, type PlanTier } from "@/lib/plan";
import { creditModeDisclosure, creditModeLabel, operationCreditLabel } from "@/lib/credit-economy";
import { isDevMode } from "@/lib/dev-mode";
import {
  analyzeMarket, generateTitleVariants, kdpPackaging, predictSuccess,
  type Level, type MarketAnalysis, type TitleVariants, type KDPPackaging, type SuccessPrediction,
} from "@/lib/kdp/money-engine";
import { useFeatureGate } from "@/components/PaywallGuard";
import { computeMarketPremiumScores } from "@/lib/market-intelligence-premium";
import { CreditCostBadge } from "@/components/billing/CreditCostBadge";
import { chargePremiumOperation } from "@/lib/billing/charge";
import { ScriptoraLogoMark } from "@/components/brand/ScriptoraLogoMark";
import { useDashboardReturn } from "@/hooks/useDashboardReturn";
import { getLastProjectId, loadProjects, setLastProjectId } from "@/lib/storage";
import { getUserFriendlyError } from "@/lib/user-friendly-error";
import { saveProjectAsync } from "@/services/storageService";
import { getProjectCoverDataUrl } from "@/lib/cover-session";
import type { BookProject } from "@/types/book";
import {
  buildBookForgeHandoff,
  openBookForgeWithHandoff,
} from "@/lib/book-forge/book-forge-handoff";
import {
  applyProjectHandoffSeed,
  buildProjectHandoffSeed,
  saveProjectHandoffSeed,
} from "@/lib/book-forge/project-handoff";

type Step = "idea" | "market" | "title" | "packaging" | "predict" | "narrative-flow";

const KDP_PREFILL_KEY = "scriptora-kdp-prefill";
const KDP_NARRATIVE_PREFILL_KEY = "scriptora:kdp-narrative-prefill";

function mapRadarGenre(genre: string): string {
  const map: Record<string, string> = {
    romance: "Romance",
    thriller: "Thriller",
    selfhelp: "Self-help",
  };
  return map[genre] || "Self-help";
}

function copyText(label: string, value: string) {
  if (!value?.trim()) return;
  void navigator.clipboard.writeText(value).then(
    () => toast.success(`${label} copiato`),
    () => toast.error(`Impossibile copiare ${label}`),
  );
}

function clampKdpScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function levelLabel(level: Level | string | undefined, italian: boolean): string {
  if (!italian) return level || "medium";
  if (level === "high") return "alto";
  if (level === "medium") return "medio";
  if (level === "low") return "basso";
  return "medio";
}

/** Tiny inline badge: shows whether the result was grounded with live market data. */
function GroundingBadge({ meta }: { meta: { groundingUsed?: boolean; groundingResultsCount?: number } }) {
  if (meta?.groundingUsed) {
    return (
      <Badge variant="outline" className="border-primary/40 text-primary text-[10px] font-medium">
        ● Dati di mercato in tempo reale{meta.groundingResultsCount ? ` (${meta.groundingResultsCount})` : ""}
      </Badge>
    );
  }
  return <Badge variant="secondary" className="text-[10px]">Analisi base</Badge>;
}


function loadKdpPreviewProject(): BookProject | null {
  try {
    const projects = loadProjects();
    const lastId = getLastProjectId();
    return (
      (lastId ? projects.find((project) => project.id === lastId) : null) ||
      projects.find((project) => getProjectCoverDataUrl(project.id)?.startsWith("data:image")) ||
      projects[0] ||
      null
    );
  } catch {
    return null;
  }
}

function KdpPublishingPreview({
  project,
  coverDataUrl,
  chosenTitle,
  chosenSubtitle,
  genre,
  italianUi,
  onOpenCover,
}: {
  project: BookProject | null;
  coverDataUrl?: string | null;
  chosenTitle?: string;
  chosenSubtitle?: string;
  genre: string;
  italianUi: boolean;
  onOpenCover: () => void;
}) {
  const title = chosenTitle || project?.config?.title || (italianUi ? "Titolo non ancora scelto" : "Title not selected yet");
  const subtitle = chosenSubtitle || project?.config?.subtitle || (italianUi ? "Completa KDP Launch e crea la cover definitiva." : "Complete KDP Launch and create the final cover.");
  const hasCover = Boolean(coverDataUrl?.startsWith("data:image"));

  return (
    <section className="scriptora-brand-card scriptora-kdp-publishing-preview overflow-hidden rounded-[2rem] border border-[#f2c400]/20 bg-[#050505]/80">
      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-4">
          <div className="flex items-center gap-3">
            <ScriptoraLogoMark size="sm" />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#f2c400]/75">
                {italianUi ? "Publishing Preview" : "Publishing Preview"}
              </p>
              <h2 className="truncate text-2xl font-black tracking-tight text-white sm:text-3xl">
                {italianUi ? "Copertina e packaging devono vendere insieme." : "Cover and packaging must sell together."}
              </h2>
            </div>
          </div>

          <p className="max-w-2xl text-sm leading-6 text-white/60">
            {italianUi
              ? "Questa è la vetrina KDP del libro: titolo, promessa, categoria e copertina devono apparire come un prodotto editoriale unico. Niente mini finestre, niente zoom inutile."
              : "This is the KDP shelf view: title, promise, category and cover must feel like one premium publishing product."}
          </p>

          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">{italianUi ? "Titolo" : "Title"}</p>
              <p className="mt-1 line-clamp-2 font-black text-white">{title}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">{italianUi ? "Genere" : "Genre"}</p>
              <p className="mt-1 line-clamp-2 font-black text-[#f2c400]">{genre || project?.config?.genre || "KDP"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Cover</p>
              <p className="mt-1 line-clamp-2 font-black text-white">{hasCover ? (italianUi ? "Salvata" : "Saved") : (italianUi ? "Da creare" : "Missing")}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={onOpenCover} className="scriptora-brand-primary gap-2 rounded-2xl font-black">
              <ImagePlus className="h-4 w-4" />
              {hasCover ? (italianUi ? "Apri Cover Studio" : "Open Cover Studio") : (italianUi ? "Crea copertina" : "Create cover")}
            </Button>
            <Button variant="outline" className="gap-2 rounded-2xl border-[#f2c400]/25 text-[#f2c400]" onClick={onOpenCover}>
              <BookOpen className="h-4 w-4" />
              {italianUi ? "Vedi copertina intera" : "View full cover"}
            </Button>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[340px] xl:max-w-[400px]">
          <div className="relative rounded-[2rem] border border-[#f2c400]/20 bg-black/65 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
            <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_50%_20%,rgba(242,196,0,0.18),transparent_60%)]" />
            <div className="relative grid min-h-[420px] place-items-center overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0b0b0b] sm:min-h-[500px]">
              {hasCover ? (
                <img
                  src={coverDataUrl || ""}
                  alt={title}
                  className="max-h-[70dvh] w-full object-contain p-2"
                />
              ) : (
                <div className="flex h-full min-h-[420px] w-full flex-col items-center justify-center gap-4 p-8 text-center sm:min-h-[500px]">
                  <ScriptoraLogoMark size="lg" />
                  <div>
                    <p className="text-xl font-black text-white">{title}</p>
                    <p className="mt-2 text-sm leading-5 text-white/52">{subtitle}</p>
                  </div>
                  <p className="rounded-full border border-[#f2c400]/25 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#f2c400]">
                    {italianUi ? "Cover mancante" : "Cover missing"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


export default function KdpLaunchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { goBackToDashboard } = useDashboardReturn();
  const sessionIdRef = useRef(getOrCreateKdpSessionId());
  const [step, setStep] = useState<Step>("idea");
  const [loading, setLoading] = useState(false);
  const [narrativeStatus, setNarrativeStatus] = useState<KdpLaunchStatus>("idle");
  const [narrativeError, setNarrativeError] = useState<string | null>(null);
  const [narrativeFlow, setNarrativeFlow] = useState<KdpNarrativeFlow | null>(null);
  const [narrativeElapsed, setNarrativeElapsed] = useState(0);
  const [showRecovery, setShowRecovery] = useState(false);
  const [pendingRecovery, setPendingRecovery] = useState<KdpLaunchSession | null>(null);
  const [sessionDirty, setSessionDirty] = useState(false);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const narrativeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // KDP base (market analysis + titles + packaging) requires Pro.
  const baseGate = useFeatureGate("kdp_market_base");
  // Bestseller prediction requires Premium.
  const predictGate = useFeatureGate("bestseller_prediction");

  // Inputs
  const [idea, setIdea] = useState("");
  const [genre, setGenre] = useState("Self-help");
  const [language, setLanguage] = useState("Italian");

  // Results
  const [market, setMarket] = useState<MarketAnalysis | null>(null);
  const [titles, setTitles] = useState<TitleVariants | null>(null);
  const [packaging, setPackaging] = useState<KDPPackaging | null>(null);
  const [prediction, setPrediction] = useState<SuccessPrediction | null>(null);
  const [chosenTitle, setChosenTitle] = useState<string>("");
  const [chosenSubtitle, setChosenSubtitle] = useState<string>("");
  const italianUi = language.toLowerCase().includes("ital");
  const devCreditMode = isDevMode();
  const previewProject = useMemo(() => loadKdpPreviewProject(), []);
  const previewCoverDataUrl = previewProject?.id ? getProjectCoverDataUrl(previewProject.id) : null;
  const openCoverStudio = useCallback(() => {
    if (previewProject?.id) setLastProjectId(previewProject.id);
    navigate("/cover", { state: previewProject?.id ? { projectId: previewProject.id } : undefined });
  }, [navigate, previewProject?.id]);
  const stepLabels: Record<Step, string> = italianUi
    ? { idea: "idea", market: "mercato", title: "titoli", packaging: "packaging", predict: "previsione", "narrative-flow": "flusso narrativo" }
    : { idea: "idea", market: "market", title: "title", packaging: "packaging", predict: "predict", "narrative-flow": "narrative flow" };
  const marketMetricLabels = italianUi
    ? {
        hookStrength: "Forza hook",
        bingeability: "Continuita lettura",
        emotionalMomentum: "Slancio emotivo",
        genreAlignment: "Allineamento genere",
        bookTokPotential: "Potenziale social",
        retentionRisk: "Rischio retention",
        conversionProbability: "Probabilita conversione",
        promiseClarity: "Chiarezza promessa",
        nicheDominance: "Dominanza nicchia",
        authorityTrust: "Autorita e fiducia",
        categoryFit: "Fit categoria",
        commercialMomentum: "Momentum commerciale",
      }
    : {
        hookStrength: "Hook strength",
        bingeability: "Bingeability",
        emotionalMomentum: "Emotional momentum",
        genreAlignment: "Genre alignment",
        bookTokPotential: "BookTok potential",
        retentionRisk: "Retention risk",
        conversionProbability: "Conversion probability",
        promiseClarity: "Promise clarity",
        nicheDominance: "Niche dominance",
        authorityTrust: "Authority trust",
        categoryFit: "Category fit",
        commercialMomentum: "Commercial momentum",
      };
  const predictionCopy = italianUi
    ? {
        title: "Previsione bestseller",
        strengths: "Punti forti",
        weaknesses: "Rischi commerciali",
        improvements: "Prossime azioni",
        action: "Prevedi potenziale",
      }
    : {
        title: "Bestseller prediction",
        strengths: "Strengths",
        weaknesses: "Commercial risks",
        improvements: "Next actions",
        action: "Predict potential",
      };

  const marketPremium = useMemo(() => {
    try {
      const content = [idea, market?.recommendedAngle, market?.subNiche].filter(Boolean).join("\n\n");
      if (content.split(/\s+/).filter(Boolean).length < 40) return null;
      return computeMarketPremiumScores({ content, genre, language });
    } catch {
      return null;
    }
  }, [idea, market?.recommendedAngle, market?.subNiche, genre, language]);
  const predictionMetrics = useMemo(() => {
    if (!prediction) return [];
    const base = prediction.successScore || 0;
    const titleWords = chosenTitle.split(/\s+/).filter(Boolean).length;
    const subtitleWords = chosenSubtitle.split(/\s+/).filter(Boolean).length;
    const keywordCount = packaging?.backendKeywords?.length || 0;
    const categoryCount = packaging?.categories?.length || 0;
    const hasMarketAngle = Boolean(market?.recommendedAngle);
    const hasPackaging = Boolean(packaging?.amazonDescription);
    const labels = italianUi
      ? {
          hook: "Forza hook",
          promise: "Chiarezza promessa",
          differentiation: "Differenziazione mercato",
          trust: "Fit autorità/fiducia",
          conversion: "Potenziale conversione Amazon",
          keyword: "Fit keyword/categoria",
          momentum: "Momentum commerciale",
        }
      : {
          hook: "Hook strength",
          promise: "Promise clarity",
          differentiation: "Market differentiation",
          trust: "Authority/trust fit",
          conversion: "Amazon conversion potential",
          keyword: "Keyword/category fit",
          momentum: "Commercial momentum",
        };
    return [
      { label: labels.hook, score: clampKdpScore(base + (titleWords >= 2 && titleWords <= 7 ? 6 : -5)), detail: italianUi ? "Titolo memorabile e leggibile a scaffale." : "Title memorability and shelf readability." },
      { label: labels.promise, score: clampKdpScore(base + (subtitleWords >= 4 ? 7 : -4) + (hasMarketAngle ? 3 : 0)), detail: italianUi ? "Promessa comprensibile senza spiegazioni extra." : "Promise is understandable without extra explanation." },
      { label: labels.differentiation, score: clampKdpScore(base + (market?.subNiche ? 8 : -3) - Math.max(0, prediction.weaknesses.length - 2) * 3), detail: italianUi ? "Quanto il libro evita l'effetto titolo generico." : "How much the book avoids generic title territory." },
      { label: labels.trust, score: clampKdpScore(base + (hasPackaging ? 5 : -2)), detail: italianUi ? "Coerenza tra autore, promessa e descrizione." : "Fit between author promise, description, and trust." },
      { label: labels.conversion, score: clampKdpScore(base), detail: italianUi ? "Sintesi del potenziale di acquisto Amazon." : "Summary of Amazon purchase potential." },
      { label: labels.keyword, score: clampKdpScore(58 + keywordCount * 5 + categoryCount * 4), detail: italianUi ? "Keyword e categorie pronte per metadata KDP." : "Backend keywords and categories readiness." },
      { label: labels.momentum, score: clampKdpScore(base + prediction.strengths.length * 2 - prediction.weaknesses.length * 3), detail: italianUi ? "Forza complessiva dopo rischi e opportunità." : "Overall force after risks and opportunities." },
    ];
  }, [chosenSubtitle, chosenTitle, italianUi, market?.recommendedAngle, market?.subNiche, packaging, prediction]);

  const buildSessionSnapshot = useCallback((): KdpLaunchSession => {
    const currentStepMap: Record<Step, KdpLaunchSession["currentStep"]> = {
      idea: "config",
      market: "analysis",
      title: "title",
      packaging: "packaging",
      predict: "predict",
      "narrative-flow": "narrative-flow",
    };
    return {
      sessionId: sessionIdRef.current,
      projectId: previewProject?.id,
      currentStep: currentStepMap[step],
      config: { idea, genre, language, chosenTitle, chosenSubtitle },
      analysis: market,
      titles,
      packaging,
      prediction,
      narrativeFlow,
      status: narrativeStatus,
      error: narrativeError || undefined,
      updatedAt: new Date().toISOString(),
      dirty: sessionDirty,
    };
  }, [chosenSubtitle, chosenTitle, genre, idea, language, market, narrativeError, narrativeFlow, narrativeStatus, packaging, prediction, previewProject?.id, sessionDirty, step, titles]);

  const syncKdpProjectSeed = useCallback((overrides?: {
    title?: string;
    subtitle?: string;
    marketOverride?: MarketAnalysis | null;
    packagingOverride?: KDPPackaging | null;
  }) => {
    const selectedTitle = overrides?.title || chosenTitle || previewProject?.config?.title || "";
    const selectedSubtitle = overrides?.subtitle || chosenSubtitle || previewProject?.config?.subtitle || "";
    const activeMarket = overrides?.marketOverride ?? market;
    const activePackaging = overrides?.packagingOverride ?? packaging;
    const seed = saveProjectHandoffSeed(buildProjectHandoffSeed("kdp-launch", {
      projectId: previewProject?.id,
      title: selectedTitle,
      subtitle: selectedSubtitle,
      idea: idea || previewProject?.config?.idea,
      genre: genre || previewProject?.config?.genre,
      category: previewProject?.config?.category || genre,
      subcategory: activeMarket?.subNiche || previewProject?.config?.subcategory || genre,
      niche: activeMarket?.subNiche || activePackaging?.categories?.[0] || previewProject?.config?.subcategory,
      language: language || previewProject?.config?.language,
      marketplace: previewProject?.config?.amazonMarketplace || "amazon.it",
      targetReader: narrativeFlow?.targetReader || previewProject?.config?.targetReader,
      promise: narrativeFlow?.centralPromise || selectedSubtitle || activeMarket?.recommendedAngle,
      transformation: narrativeFlow?.centralPromise || activeMarket?.recommendedAngle,
      commercialAngle: narrativeFlow?.positioningAngle || activeMarket?.recommendedAngle,
      tone: narrativeFlow?.commercialTone,
      backendKeywords: activePackaging?.backendKeywords,
      keywords: activePackaging?.backendKeywords,
      kdpCategories: activePackaging?.categories,
      comparableBooks: activeMarket?.competitionLevel ? [`Competition: ${activeMarket.competitionLevel}`] : undefined,
      coverSaved: Boolean(previewCoverDataUrl?.startsWith("data:image")),
    }));

    if (previewProject?.id) {
      void saveProjectAsync(applyProjectHandoffSeed(previewProject, seed));
    }

    return seed;
  }, [
    chosenSubtitle,
    chosenTitle,
    genre,
    idea,
    language,
    market,
    narrativeFlow,
    packaging,
    previewCoverDataUrl,
    previewProject,
  ]);

  const applySessionSnapshot = useCallback((session: KdpLaunchSession) => {
    const stepMap: Record<KdpLaunchSession["currentStep"], Step> = {
      config: "idea",
      analysis: "market",
      title: "title",
      packaging: "packaging",
      predict: "predict",
      "narrative-flow": "narrative-flow",
      review: "predict",
      done: "predict",
    };
    setIdea(session.config.idea);
    setGenre(session.config.genre);
    setLanguage(session.config.language);
    setChosenTitle(session.config.chosenTitle);
    setChosenSubtitle(session.config.chosenSubtitle);
    setMarket(session.analysis);
    setTitles(session.titles);
    setPackaging(session.packaging);
    setPrediction(session.prediction);
    setNarrativeFlow(session.narrativeFlow ?? null);
    setNarrativeStatus(session.status);
    setNarrativeError(session.error ?? null);
    setStep(stepMap[session.currentStep] || "idea");
    setSessionDirty(false);
  }, []);

  const persistSession = useCallback((dirty = sessionDirty) => {
    saveKdpLaunchSession({ ...buildSessionSnapshot(), dirty });
  }, [buildSessionSnapshot, sessionDirty]);

  const queuePersist = useCallback((dirty = true) => {
    setSessionDirty(dirty);
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      saveKdpLaunchSession({ ...buildSessionSnapshot(), dirty });
      persistTimerRef.current = null;
    }, 400);
  }, [buildSessionSnapshot]);

  useEffect(() => {
    const saved = loadKdpLaunchSession(sessionIdRef.current);
    if (isKdpSessionRecoverable(saved)) {
      setPendingRecovery(saved);
      setShowRecovery(true);
      return;
    }
    if (!previewProject) return;
    if (!idea.trim() && previewProject.config.idea) setIdea(previewProject.config.idea);
    if (!chosenTitle.trim() && previewProject.config.title) setChosenTitle(previewProject.config.title);
    if (!chosenSubtitle.trim() && previewProject.config.subtitle) setChosenSubtitle(previewProject.config.subtitle);
    if (previewProject.config.genre) setGenre(previewProject.config.subcategory || previewProject.config.genre);
    if (previewProject.config.language) setLanguage(previewProject.config.language);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (showRecovery) return;
    queuePersist(narrativeStatus === "running");
  }, [
    idea, genre, language, market, titles, packaging, prediction,
    chosenTitle, chosenSubtitle, step, narrativeFlow, narrativeStatus, narrativeError,
    showRecovery, queuePersist,
  ]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      const session = buildSessionSnapshot();
      if (!sessionNeedsUnloadGuard(session)) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [buildSessionSnapshot]);

  useEffect(() => () => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    if (narrativeTimerRef.current) clearInterval(narrativeTimerRef.current);
  }, []);

  const narrativeInputs = useMemo(() => {
    const labels = italianUi
      ? ["Configurazione libro", "Analisi mercato", "Promessa lettore", "Genere", "Target", "Angolo commerciale"]
      : ["Book configuration", "Market analysis", "Reader promise", "Genre", "Target", "Commercial angle"];
    return [
      { label: labels[0], ok: Boolean(idea.trim()) },
      { label: labels[1], ok: Boolean(market) },
      { label: labels[2], ok: Boolean(market?.recommendedAngle || chosenSubtitle || idea.trim()) },
      { label: labels[3], ok: Boolean(genre.trim()) },
      { label: labels[4], ok: Boolean(market?.subNiche || chosenSubtitle) },
      { label: labels[5], ok: Boolean(market?.recommendedAngle) },
    ];
  }, [chosenSubtitle, genre, idea, italianUi, market]);

  const runNarrativeFlow = useCallback(async () => {
    if (!market) {
      const msg = italianUi ? "Analisi mercato mancante." : "Market analysis missing.";
      setNarrativeError(msg);
      setNarrativeStatus("error");
      toast.error(msg);
      return;
    }
    setNarrativeStatus("running");
    setNarrativeError(null);
    setNarrativeElapsed(0);
    setStep("narrative-flow");
    if (narrativeTimerRef.current) clearInterval(narrativeTimerRef.current);
    narrativeTimerRef.current = setInterval(() => setNarrativeElapsed((s) => s + 1), 1000);
    try {
      const flow = await generateKdpNarrativeFlowAsync({
        idea,
        genre,
        language,
        title: chosenTitle,
        subtitle: chosenSubtitle,
        market,
        packaging,
        targetReader: market.subNiche,
      });
      setNarrativeFlow(flow);
      setNarrativeStatus("done");
      setSessionDirty(false);
      persistSession(false);
      toast.success(italianUi ? "Flusso narrativo creato" : "Narrative flow created");
    } catch (e: any) {
      const msg = getUserFriendlyError(e, {
        area: "generic",
        fallback: italianUi
          ? "Non sono riuscito a completare il flusso al primo tentativo. La sessione resta salvata e puoi riprovare."
          : "I could not complete the flow on the first try. Your session is saved and you can retry.",
      });
      setNarrativeError(msg);
      setNarrativeStatus("error");
      persistSession(true);
      toast.error(msg);
    } finally {
      if (narrativeTimerRef.current) {
        clearInterval(narrativeTimerRef.current);
        narrativeTimerRef.current = null;
      }
      setLoading(false);
    }
  }, [chosenSubtitle, chosenTitle, genre, idea, italianUi, language, market, packaging, persistSession]);

  const saveNarrativeToProject = useCallback(() => {
    if (!narrativeFlow) return;
    try {
      sessionStorage.setItem(KDP_NARRATIVE_PREFILL_KEY, JSON.stringify({
        idea,
        genre,
        language,
        title: chosenTitle,
        subtitle: chosenSubtitle,
        market,
        narrativeFlow,
      }));
      persistSession(false);
      toast.success(italianUi ? "Flusso narrativo salvato — apri la dashboard per creare il progetto" : "Narrative flow saved — open dashboard to create project");
    } catch {
      toast.error(italianUi ? "Salvataggio non riuscito" : "Save failed");
    }
  }, [chosenSubtitle, chosenTitle, genre, idea, italianUi, language, market, narrativeFlow, persistSession]);

  const buildKdpBookForgeHandoff = useCallback((titleOverride?: string, subtitleOverride?: string) => {
    const selectedTitle = titleOverride || chosenTitle || previewProject?.config?.title || "";
    const selectedSubtitle = subtitleOverride || chosenSubtitle || previewProject?.config?.subtitle || "";
    const selectedGenre = genre || previewProject?.config?.genre || "Self-help";
    const selectedLanguage = language || previewProject?.config?.language || "Italian";
    syncKdpProjectSeed({ title: selectedTitle, subtitle: selectedSubtitle });
    return buildBookForgeHandoff("kdp-launch", {
      title: selectedTitle,
      subtitle: selectedSubtitle,
      idea: idea || previewProject?.config?.idea,
      genre: selectedGenre,
      category: previewProject?.config?.category || selectedGenre,
      subcategory: market?.subNiche || previewProject?.config?.subcategory || selectedGenre,
      niche: market?.subNiche || packaging?.categories?.[0],
      language: selectedLanguage,
      marketplace: previewProject?.config?.amazonMarketplace || "amazon.it",
      targetReader: narrativeFlow?.targetReader || previewProject?.config?.targetReader,
      promise: narrativeFlow?.centralPromise || selectedSubtitle || market?.recommendedAngle,
      transformation: narrativeFlow?.centralPromise || market?.recommendedAngle,
      structureMode: narrativeFlow?.chapterProgression?.length ? "chapter progression from KDP Launch" : undefined,
      plot: narrativeFlow?.chapterProgression?.join("\n"),
      conflict: narrativeFlow?.initialHook,
      commercialAngle: narrativeFlow?.positioningAngle || market?.recommendedAngle,
      tone: narrativeFlow?.commercialTone,
      keywords: packaging?.backendKeywords,
      comparableBooks: market?.competitionLevel ? [`Competition: ${market.competitionLevel}`] : undefined,
    });
  }, [chosenSubtitle, chosenTitle, genre, idea, language, market, narrativeFlow, packaging, previewProject, syncKdpProjectSeed]);

  const goToBlueprint = useCallback(() => {
    saveNarrativeToProject();
    openBookForgeWithHandoff(navigate, buildKdpBookForgeHandoff());
  }, [buildKdpBookForgeHandoff, navigate, saveNarrativeToProject]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KDP_PREFILL_KEY);
      if (!raw) return;
      sessionStorage.removeItem(KDP_PREFILL_KEY);
      const data = JSON.parse(raw) as { idea?: string; genre?: string; keyword?: string };
      const prefillIdea = [data.keyword, data.idea].filter(Boolean).join(" — ");
      if (prefillIdea) setIdea(prefillIdea);
      if (data.genre) setGenre(mapRadarGenre(data.genre));
      toast.info("Brief importato da Market OS — completa l'analisi KDP");
    } catch {
      // non-blocking
    }
  }, []);

  useEffect(() => {
    if (location.hash !== "#title-domination") return;
    window.setTimeout(() => {
      document.getElementById("title-domination")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, [location.hash]);

  async function getPlan(): Promise<PlanTier> {
    return await fetchPlan().catch(() => "free");
  }

  const runMarket = baseGate.guard(async () => {
    if (!idea.trim()) return toast.error("Inserisci un'idea per iniziare");
    setLoading(true);
    try {
      await chargePremiumOperation("market_intelligence", { source: "kdp_launch_market", genre }, undefined, ["market", idea.slice(0, 40)]);
      const plan = await getPlan();
      const m = await analyzeMarket(idea, { genre, language, plan });
      setMarket(m);
      setStep("market");
      syncKdpProjectSeed({ marketOverride: m });
    } catch (e: any) {
      toast.error(getUserFriendlyError(e, {
        fallback: italianUi ? "Analisi mercato non completata. La sessione resta salvata: riprova tra poco." : "Market analysis was not completed. Your session is saved; retry shortly.",
      }));
    } finally { setLoading(false); }
  });

  const runTitles = baseGate.guard(async () => {
    setLoading(true);
    try {
      await chargePremiumOperation("kdp_launch", { source: "kdp_launch_titles", genre }, undefined, ["titles", idea.slice(0, 40)]);
      const plan = await getPlan();
      const t = await generateTitleVariants(market?.recommendedAngle || idea, {
        genre,
        language,
        plan,
        subNiche: market?.subNiche,
        recommendedAngle: market?.recommendedAngle,
      });
      setTitles(t);
      const top = t.topPicks?.[0];
      if (top) { setChosenTitle(top.title); setChosenSubtitle(top.subtitle); }
      setStep("title");
      if (top) syncKdpProjectSeed({ title: top.title, subtitle: top.subtitle });
    } catch (e: any) {
      toast.error(getUserFriendlyError(e, {
        fallback: italianUi ? "Generazione titoli non completata. Mantengo i dati attuali e puoi riprovare." : "Title generation was not completed. Current data is preserved.",
      }));
    } finally { setLoading(false); }
  });

  const runPackaging = baseGate.guard(async () => {
    if (!chosenTitle) return toast.error("Scegli un titolo");
    setLoading(true);
    try {
      const plan = await getPlan();
      const p = await kdpPackaging(
        { title: chosenTitle, subtitle: chosenSubtitle, promise: market?.recommendedAngle, genre, language },
        plan,
      );
      setPackaging(p);
      setStep("packaging");
      syncKdpProjectSeed({ packagingOverride: p });
      if (previewProject?.id) toast.success(italianUi ? "Packaging KDP collegato al progetto attivo" : "KDP package linked to active project");
    } catch (e: any) {
      toast.error(getUserFriendlyError(e, {
        fallback: italianUi ? "Packaging KDP non completato. Titolo e mercato restano salvati." : "KDP packaging was not completed. Title and market data are preserved.",
      }));
    } finally { setLoading(false); }
  });

  const runPredict = predictGate.guard(async () => {
    setLoading(true);
    try {
      const plan = await getPlan();
      const pr = await predictSuccess(
        { title: chosenTitle, subtitle: chosenSubtitle, promise: market?.recommendedAngle, genre, language },
        plan,
      );
      setPrediction(pr);
      setStep("narrative-flow");
      toast.success(italianUi ? "Previsione completata — passo al flusso narrativo" : "Prediction done — moving to narrative flow");
    } catch (e: any) {
      toast.error(getUserFriendlyError(e, {
        fallback: italianUi ? "Previsione non completata. Puoi rilanciarla senza perdere il packaging." : "Prediction was not completed. You can rerun it without losing packaging.",
      }));
    } finally { setLoading(false); }
  });

  return (
    <div className="scriptora-feature-page scriptora-brand-shell bg-[#050505]">
      <main className="scriptora-feature-scroll mx-auto max-w-7xl space-y-5 p-4 sm:space-y-6 sm:p-6">
        <header className="flex items-center justify-between gap-2 min-w-0">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 break-words">
              <Rocket className="h-6 w-6 shrink-0 text-primary" /> KDP Launch
            </h1>
            <p className="text-sm text-muted-foreground break-words">
              Crea un prodotto che vende su Amazon — non solo un libro.
            </p>
          </div>
          <Button variant="ghost" className="shrink-0" onClick={goBackToDashboard}>← Indietro</Button>
        </header>

        {showRecovery && pendingRecovery && (
          <section className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm">
            <p className="font-semibold">
              {italianUi ? "Sessione KDP Launch trovata." : "KDP Launch session found."}
            </p>
            <p className="mt-1 text-muted-foreground">
              {italianUi
                ? "Puoi riprendere dall'ultimo punto salvato."
                : "You can resume from the last saved point."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  applySessionSnapshot(pendingRecovery);
                  setShowRecovery(false);
                  toast.success(italianUi ? "Sessione ripristinata" : "Session restored");
                }}
              >
                {italianUi ? "Continua" : "Continue"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  clearKdpLaunchSession(sessionIdRef.current);
                  sessionIdRef.current = getOrCreateKdpSessionId();
                  const fresh = createEmptyKdpSession(sessionIdRef.current);
                  applySessionSnapshot(fresh);
                  setShowRecovery(false);
                  setPendingRecovery(null);
                  toast.info(italianUi ? "Nuova sessione KDP" : "New KDP session");
                }}
              >
                {italianUi ? "Ricomincia" : "Start over"}
              </Button>
            </div>
          </section>
        )}

        {/* Step indicator */}
        <div className="scriptora-kdp-stepper flex flex-wrap items-center gap-2 text-xs text-muted-foreground overflow-x-hidden max-w-full">
          {(["idea", "market", "title", "packaging", "predict", "narrative-flow"] as Step[]).map((s, i) => (
            <div key={s} className="flex shrink-0 items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full border ${step === s ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
                {i + 1}. {stepLabels[s]}
              </span>
              {i < 5 && <ArrowRight className="h-3 w-3" />}
            </div>
          ))}
        </div>

        <section className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-xs text-emerald-50/82">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold">{creditModeLabel(devCreditMode)}</span>
            <span>
              Market {operationCreditLabel("kdp_market", devCreditMode)} · Titoli {operationCreditLabel("kdp_titles", devCreditMode)} · Predict {operationCreditLabel("kdp_prediction", devCreditMode)}
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-4 text-emerald-50/64">{creditModeDisclosure(devCreditMode)}</p>
        </section>

        <KdpPublishingPreview
          project={previewProject}
          coverDataUrl={previewCoverDataUrl}
          chosenTitle={chosenTitle}
          chosenSubtitle={chosenSubtitle}
          genre={genre}
          italianUi={italianUi}
          onOpenCover={openCoverStudio}
        />

        {/* STEP 1 — Idea */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> La tua idea</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="scriptora-kdp-mobile-grid grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>Genere</Label>
                <Input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Self-help, Romance…" />
              </div>
              <div>
                <Label>Lingua</Label>
                <Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="Italian" />
              </div>
            </div>
            <div>
              <Label>Idea / promessa</Label>
              <Textarea
                rows={3}
                placeholder="Es. Un metodo in 30 giorni per smettere di procrastinare per imprenditori in burnout"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
              />
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <Button onClick={runMarket} disabled={loading || !idea.trim()}>
                {loading && step === "idea" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TrendingUp className="h-4 w-4 mr-2" />}
                Analizza mercato
              </Button>
              <CreditCostBadge operation="kdp_launch" prominent />
            </div>
          </CardContent>
        </Card>

        {/* STEP 2 — Market */}
        {market && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Mercato</span>
                <div className="flex gap-2">
                  <KdpScoreBadge kind="profitability" score={market.profitabilityScore} />
                  <Badge variant="outline">Niche {market.nicheScore.toFixed(1)}/10</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="scriptora-kdp-mobile-grid grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><span className="text-muted-foreground">Domanda:</span> <Badge variant="secondary">{levelLabel(market.demandLevel, italianUi)}</Badge></div>
                <div><span className="text-muted-foreground">Competizione:</span> <Badge variant="secondary">{levelLabel(market.competitionLevel, italianUi)}</Badge></div>
              </div>
              {market.subNiche && <p><span className="text-muted-foreground">Sotto-nicchia:</span> <strong>{market.subNiche}</strong></p>}
              <p className="leading-relaxed"><span className="text-muted-foreground">Angolo consigliato:</span><br />{market.recommendedAngle}</p>
              {market.reasoning && <p className="text-xs text-muted-foreground italic">{market.reasoning}</p>}
              {market.groundingUsed && (
                <p className="text-xs text-primary">✓ Dati di mercato in tempo reale</p>
              )}

              {marketPremium && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wide">{italianUi ? "Intelligenza mercato premium" : "Market Intelligence Premium"}</p>
                    <span className="text-sm font-black text-primary">{marketPremium.composite}/100</span>
                  </div>
                  <div className="scriptora-kdp-mobile-grid grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 xl:grid-cols-3">
                    {[
                      [marketMetricLabels.hookStrength, marketPremium.hookStrength],
                      [marketMetricLabels.bingeability, marketPremium.bingeability],
                      [marketMetricLabels.emotionalMomentum, marketPremium.emotionalMomentum],
                      [marketMetricLabels.genreAlignment, marketPremium.genreAlignment],
                      [marketMetricLabels.conversionProbability, marketPremium.conversionProbability],
                      [marketMetricLabels.promiseClarity, marketPremium.promiseClarity],
                      [marketMetricLabels.nicheDominance, marketPremium.nicheDominance],
                      [marketMetricLabels.authorityTrust, marketPremium.authorityTrust],
                      [marketMetricLabels.categoryFit, marketPremium.categoryFit],
                      [marketMetricLabels.commercialMomentum, marketPremium.commercialMomentum],
                      ...(marketPremium.bookTokPotential != null ? [[marketMetricLabels.bookTokPotential, marketPremium.bookTokPotential]] : []),
                    ].map(([label, score]) => (
                      <div key={label} className="rounded-lg bg-background/80 border border-border/50 px-2.5 py-2">
                        <p className="text-muted-foreground">{label}</p>
                        <p className="font-semibold">{score}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {marketMetricLabels.retentionRisk}:{" "}
                    <span className={`font-semibold ${marketPremium.readerRetentionRisk === "high" ? "text-rose-500" : marketPremium.readerRetentionRisk === "medium" ? "text-amber-600" : "text-emerald-600"}`}>
                      {levelLabel(marketPremium.readerRetentionRisk, italianUi)}
                    </span>
                    {" · "}
                    {marketPremium.genreAlignmentNote}
                  </p>
                </div>
              )}

              <div className="flex flex-col items-end gap-1.5">
                <Button onClick={runTitles} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                  Genera titoli
                </Button>
                <CreditCostBadge operation="kdp_launch" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3 — Titles */}
        {titles && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2"><Wand2 className="h-4 w-4 text-primary" /> Top 3 combinazioni</span>
                <GroundingBadge meta={titles} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {titles.topPicks.map((p, i) => {
                const selected = chosenTitle === p.title;
                return (
                  <button
                    key={`stable-${i}`}
                    onClick={() => { setChosenTitle(p.title); setChosenSubtitle(p.subtitle); }}
                    className={`w-full text-left p-3 rounded-lg border transition ${selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
                  >
                    <div className="font-semibold">{p.title}</div>
                    <div className="text-sm text-muted-foreground">{p.subtitle}</div>
                    <div className="text-xs text-muted-foreground italic mt-1">{p.reason}</div>
                  </button>
                );
              })}
              <Separator />
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">Tutti i {titles.titles.length} titoli + {titles.subtitles.length} sottotitoli</summary>
                <div className="scriptora-kdp-mobile-grid grid grid-cols-1 gap-3 mt-2 sm:grid-cols-2">
                  <ul className="space-y-1">{titles.titles.map((t, i) => <li key={`stable-${i}`}>• {t}</li>)}</ul>
                  <ul className="space-y-1">{titles.subtitles.map((s, i) => <li key={`stable-${i}`}>• {s}</li>)}</ul>
                </div>
              </details>
              <div className="flex justify-end">
                <div className="flex flex-col items-end gap-1.5">
                  <Button onClick={runPackaging} disabled={loading || !chosenTitle}>
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Rocket className="h-4 w-4 mr-2" />}
                    Crea packaging
                  </Button>
                  <CreditCostBadge operation="kdp_launch" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 4 — Packaging */}
        {packaging && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Packaging Amazon</span>
                <GroundingBadge meta={packaging} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <Label>Descrizione</Label>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyText("Descrizione", packaging.amazonDescription)}>
                    Copia
                  </Button>
                </div>
                <Textarea rows={8} readOnly value={packaging.amazonDescription} />
              </div>
              <div className="scriptora-kdp-mobile-grid grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Label>Keyword backend</Label>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyText("Keyword", packaging.backendKeywords.join(", "))}>
                      Copia
                    </Button>
                  </div>
                  <ul className="text-xs space-y-1 mt-1">{packaging.backendKeywords.map((k, i) => <li key={`stable-${i}`}>• {k}</li>)}</ul>
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Label>Categorie KDP</Label>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyText("Categorie", packaging.categories.join(" · "))}>
                      Copia
                    </Button>
                  </div>
                  <ul className="text-xs space-y-1 mt-1">{packaging.categories.map((c, i) => <li key={`stable-${i}`}>• {c}</li>)}</ul>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <Label>Bullet di vendita</Label>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyText("Bullet", packaging.bulletPoints.join("\n"))}>
                    Copia tutti
                  </Button>
                </div>
                <ul className="text-xs space-y-1 mt-1">{packaging.bulletPoints.map((b, i) => <li key={`stable-${i}`}>• {b}</li>)}</ul>
              </div>
              <div className="flex justify-end">
                <div className="flex flex-col items-end gap-1.5">
                  <Button onClick={runPredict} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trophy className="h-4 w-4 mr-2" />}
                    {predictionCopy.action}
                  </Button>
                  <CreditCostBadge operation="kdp_launch" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 5 — Prediction */}
        {prediction && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{predictionCopy.title}</span>
                <KdpScoreBadge kind="bestseller" score={prediction.successScore} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="scriptora-kdp-mobile-grid grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {predictionMetrics.map((metric) => (
                  <div key={metric.label} className="rounded-xl border border-border/70 bg-muted/25 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                      <p className="text-lg font-bold tabular-nums text-foreground">{metric.score}</p>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${metric.score}%` }} />
                    </div>
                    <p className="mt-2 text-[11px] leading-4 text-muted-foreground">{metric.detail}</p>
                  </div>
                ))}
              </div>
              <div className="scriptora-kdp-mobile-grid grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3">
                  <div className="text-xs font-semibold text-primary mb-1">{predictionCopy.strengths}</div>
                  <ul className="space-y-1 leading-5">{prediction.strengths.map((x, i) => <li key={`stable-${i}`}>✓ {x}</li>)}</ul>
                </div>
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3">
                  <div className="text-xs font-semibold text-destructive mb-1">{predictionCopy.weaknesses}</div>
                  <ul className="space-y-1 leading-5">{prediction.weaknesses.map((x, i) => <li key={`stable-${i}`}>✗ {x}</li>)}</ul>
                </div>
                <div className="rounded-xl border border-primary/20 bg-primary/10 p-3">
                  <div className="text-xs font-semibold mb-1">{predictionCopy.improvements}</div>
                  <ul className="space-y-1 leading-5">{prediction.improvements.map((x, i) => <li key={`stable-${i}`}>→ {x}</li>)}</ul>
                </div>
              </div>
              <Separator />
              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => { setStep("idea"); setMarket(null); setTitles(null); setPackaging(null); setPrediction(null); setNarrativeFlow(null); setNarrativeStatus("idle"); setNarrativeError(null); setChosenTitle(""); setChosenSubtitle(""); setIdea(""); clearKdpLaunchSession(sessionIdRef.current); sessionIdRef.current = getOrCreateKdpSessionId(); }}>
                  {italianUi ? "Nuova idea" : "New idea"}
                </Button>
                <Button onClick={() => { setStep("narrative-flow"); void runNarrativeFlow(); }}>
                  {italianUi ? "Continua al flusso narrativo" : "Continue to narrative flow"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 6 — Narrative flow (stable panel — never navigates away on error) */}
        {(step === "narrative-flow" || narrativeFlow || narrativeStatus === "running" || narrativeStatus === "error") && market && (
          <KdpNarrativeFlowPanel
            italianUi={italianUi}
            status={narrativeStatus}
            error={narrativeError}
            result={narrativeFlow}
            inputs={narrativeInputs}
            elapsedSec={narrativeElapsed}
            onGenerate={() => void runNarrativeFlow()}
            onRetry={() => void runNarrativeFlow()}
            onBackToAnalysis={() => setStep("market")}
            onSaveToProject={saveNarrativeToProject}
            onGoBlueprint={goToBlueprint}
            onRegenerate={() => void runNarrativeFlow()}
          />
        )}

        {narrativeFlow && narrativeStatus === "done" && (
          <Card>
            <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={saveNarrativeToProject}>
                {italianUi ? "Salva sessione" : "Save session"}
              </Button>
              <Button onClick={goToBlueprint}>
                {italianUi ? "Vai a scrivere il libro" : "Go write the book"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* === KDP Title Domination — incremental, isolated section === */}
        <section id="title-domination" className="scroll-mt-24">
          <KdpTitleDomination
            defaults={{
              idea,
              genre,
              language,
              mainProblem: market?.subNiche,
              desiredPromise: market?.recommendedAngle,
            }}
            onUseTitle={(t, s) => {
              setChosenTitle(t);
              setChosenSubtitle(s);
              syncKdpProjectSeed({ title: t, subtitle: s });
              openBookForgeWithHandoff(
                navigate,
                buildBookForgeHandoff("title-domination", {
                  title: t,
                  subtitle: s,
                  idea,
                  genre,
                  category: genre,
                  subcategory: market?.subNiche || genre,
                  niche: market?.subNiche || genre,
                  language,
                  marketplace: "amazon.it",
                  promise: s || market?.recommendedAngle,
                  commercialAngle: market?.recommendedAngle,
                  comparableBooks: market?.competitionLevel ? [`Competition: ${market.competitionLevel}`] : undefined,
                }),
              );
            }}
          />
        </section>
      </main>
    </div>
  );
}
