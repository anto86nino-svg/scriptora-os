/**
 * NicheTrendingPlaylist
 * ---------------------
 * Real-time "playlist" of dominant / rising sub-niches across Amazon.com,
 * Amazon.it and Apple Books. Powered by Brave Search + DeepSeek (no Lovable
 * AI gateway). Lets the user:
 *  - browse the trending niches
 *  - pin them to a personal watchlist (localStorage, no DB)
 *  - import a niche into a parent form (genre + audience + promise + angle)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchTrendingNiches,
  type TrendingNiche,
  type TrendingNichesResult,
} from "@/lib/kdp/money-engine";
import { fetchPlan } from "@/lib/plan";
import {
  getTrendingGate,
  logTrendingClick,
  TRENDING_PRICE_EUR,
  type TrendingGate,
} from "@/lib/kdp/trending-paywall";
import {
  Loader2,
  RefreshCw,
  TrendingUp,
  Star,
  Check,
  Flame,
  ArrowUpRight,
  Minus,
  ArrowDownRight,
  Globe2,
  Sparkles,
  Lock,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

const WATCHLIST_KEY = "kdp.niche.watchlist.v1";

export interface NicheImport {
  genre: string;
  targetAudience: string;
  bookPromise: string;
  angle: string;
  keywords: string[];
}

interface Props {
  language?: string;
  onImport?: (data: NicheImport) => void;
  /** Optional initial focus topic (e.g. current genre input). */
  initialFocus?: string;
}

type TabKey = "trending" | "watchlist";

function buildDevFallbackTrending(input: {
  focus: string;
  language: string;
  marketplaces: TrendingNichesResult["marketplaces"];
  seed?: number;
}): TrendingNichesResult {
  const topic = input.focus.trim() || "self-help";
  const parent = topic
    .replace(/\s+/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
  const market = (i: number): TrendingNiche["marketplace"] =>
    i % 4 === 0 ? "amazon.com" : i % 4 === 1 ? "amazon.it" : i % 4 === 2 ? "apple-books" : "cross-market";

  const ideas = [
    ["30 giorni pratici", "lettori che vogliono risultati misurabili", "un piano guidato con micro-azioni quotidiane", "trasforma il tema in una challenge progressiva"],
    ["per principianti assoluti", "chi parte da zero e teme la complessità", "una strada semplice senza gergo", "posizionati come guida chiara e rassicurante"],
    ["anti-burnout", "professionisti saturi e creator stanchi", "recuperare energia senza mollare tutto", "usa esempi concreti e rituali minimi"],
    ["per genitori occupati", "famiglie con poco tempo", "ottenere benefici in sessioni brevi", "promessa low-friction con checklist"],
    ["con AI e template", "autori indie e solopreneur", "risparmiare tempo con sistemi pronti", "offri prompt, schede e workflow replicabili"],
    ["minimalista", "lettori che vogliono meno teoria", "fare meglio con meno passaggi", "taglia il superfluo e vendi chiarezza"],
    ["per over 40", "lettori maturi con bisogni specifici", "adattare il metodo alla vita reale", "nicchia per età e contesto emotivo"],
    ["workbook guidato", "lettori che comprano libri esercizi", "passare dalla lettura all'azione", "aggiungi esercizi, tracker e autovalutazioni"],
    ["errori da evitare", "chi ha già provato senza riuscire", "capire cosa blocca i risultati", "angolo diagnostico ad alta conversione"],
    ["premium checklist", "utenti che vogliono una soluzione pronta", "controllare ogni passaggio prima di agire", "formato operativo, vendibile anche come companion"],
  ];

  const niches: TrendingNiche[] = ideas.map(([name, reader, promise, angle], i) => ({
    name: `${parent} ${name}`,
    parentGenre: parent,
    marketplace: market(i),
    demandLevel: i % 5 === 2 ? "medium" : "high",
    competitionLevel: i % 4 === 0 ? "low" : "medium",
    opportunityScore: Math.max(68, 92 - i * 3 + ((input.seed || 0) % 3)),
    trendDirection: i % 3 === 1 ? "stable" : "rising",
    dominantPromise: promise,
    targetReader: reader,
    suggestedAngle: angle,
    dominantKeywords: [
      topic,
      "workbook",
      "passo passo",
      "principianti",
      "piano pratico",
    ].slice(0, 5),
    whyItMatters: "Fallback dev per testare UI, import e playlist quando la Edge Function non risponde.",
    saturationRisk: i % 4 === 0 ? "low" : "medium",
  }));

  return {
    groundingUsed: false,
    groundingProvider: null,
    groundingResultsCount: 0,
    groundingQueries: [],
    marketplaces: input.marketplaces,
    analyzedAt: new Date().toISOString(),
    marketOverview:
      input.language === "Italian"
        ? "Analisi base locale: Scriptora ha generato nicchie strategiche senza consumare click o addebiti."
        : "Local base analysis: Scriptora generated strategic niches without consuming clicks or charges.",
    fallbackReason:
      input.language === "Italian"
        ? "Analisi base locale: il radar live non e' disponibile in questo ambiente."
        : "Local base analysis: the live radar is unavailable in this environment.",
    niches,
  };
}

function friendlyTrendingError(e: any): string {
  const raw = String(e?.message || e || "");
  if (raw.includes("non-2xx") || raw.includes("FunctionsHttpError")) {
    return "Radar temporaneamente non disponibile: la Edge Function ha risposto con errore.";
  }
  if (raw.toLowerCase().includes("deepseek")) return raw;
  if (raw.toLowerCase().includes("api key")) return "Backend AI non configurato: manca una chiave API.";
  return raw || "Errore nel caricamento delle nicchie.";
}

export function NicheTrendingPlaylist({ language = "Italian", onImport, initialFocus = "" }: Props) {
  const [tab, setTab] = useState<TabKey>("trending");
  const [focus, setFocus] = useState(initialFocus);
  const [data, setData] = useState<TrendingNichesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState<TrendingNiche[]>([]);
  const [gate, setGate] = useState<TrendingGate | null>(null);

  // ---- watchlist persistence ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(WATCHLIST_KEY);
      if (raw) setWatchlist(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // ---- paywall gate (refresh on usage / plan / dev-mode change) ----
  const refreshGate = useCallback(async () => {
    try { setGate(await getTrendingGate()); } catch { /* noop */ }
  }, []);
  useEffect(() => {
    refreshGate();
    const sync = () => refreshGate();
    window.addEventListener("nexora-usage-change", sync);
    window.addEventListener("nexora-plan-change", sync);
    window.addEventListener("nexora-dev-mode-change", sync);
    return () => {
      window.removeEventListener("nexora-usage-change", sync);
      window.removeEventListener("nexora-plan-change", sync);
      window.removeEventListener("nexora-dev-mode-change", sync);
    };
  }, [refreshGate]);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingListRef = useRef<TrendingNiche[] | null>(null);
  const persist = useCallback((list: TrendingNiche[]) => {
    // UI updates immediately; localStorage write is debounced so quick
    // pin/unpin actions don't trigger a heavy JSON.stringify per click.
    setWatchlist(list);
    pendingListRef.current = list;
    if (persistTimerRef.current) return;
    persistTimerRef.current = setTimeout(() => {
      const pending = pendingListRef.current;
      persistTimerRef.current = null;
      pendingListRef.current = null;
      if (!pending) return;
      try { localStorage.setItem(WATCHLIST_KEY, JSON.stringify(pending)); } catch { /* ignore */ }
    }, 400);
  }, []);

  const isPinned = useCallback(
    (n: TrendingNiche) => watchlist.some((w) => w.name === n.name && w.parentGenre === n.parentGenre),
    [watchlist],
  );

  const togglePin = useCallback((n: TrendingNiche) => {
    if (isPinned(n)) {
      persist(watchlist.filter((w) => !(w.name === n.name && w.parentGenre === n.parentGenre)));
      toast.success("Rimossa dalla playlist");
    } else {
      persist([n, ...watchlist].slice(0, 30));
      toast.success("Salvata nella playlist");
    }
  }, [watchlist, isPinned, persist]);

  // ---- load trending (paywalled) ----
  const load = useCallback(async (regen = false) => {
    // Re-check the gate at click time (avoid stale state).
    const g = await getTrendingGate();
    setGate(g);
    if (!g.allowed) {
      const msg =
        g.reason === "free-blocked"
          ? "Feature a pagamento — passa a Pro o Premium per usarla."
          : g.reason === "beta-exhausted"
          ? "Hai già usato il tuo click gratuito beta. Passa a Pro o Premium per continuare."
          : "Feature non disponibile sul tuo piano.";
      toast.error(msg);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const plan = g.plan;
      const res = await fetchTrendingNiches(
        {
          language,
          focus: focus.trim() || undefined,
          marketplaces: ["amazon.com", "amazon.it", "apple-books"],
          seed: regen ? Math.floor(Math.random() * 1_000_000) : undefined,
        },
        plan,
      );
      setData(res);
      if (res.fallbackReason) {
        toast.success("Analisi base generata · nessun addebito");
        return;
      }
      // Log click ONLY on success (so failed Brave/DeepSeek don't burn beta credit
      // or charge paid plans).
      await logTrendingClick(plan);
      if (g.reason === "paid") {
        toast.success(`Trend aggiornati · addebitati €${TRENDING_PRICE_EUR.toFixed(2)}`);
      } else if (g.reason === "beta-free") {
        toast.success("Trend aggiornati · click beta gratuito utilizzato");
      }
    } catch (e: any) {
      const message = friendlyTrendingError(e);
      if (g.isDev) {
        const fallback = buildDevFallbackTrending({
          language,
          focus,
          marketplaces: ["amazon.com", "amazon.it", "apple-books"],
          seed: regen ? Math.floor(Math.random() * 1_000_000) : undefined,
        });
        setData(fallback);
        setError(null);
        toast.success("Fallback dev attivo · nessun addebito");
        return;
      }
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [focus, language]);

  const visible = tab === "trending" ? (data?.niches ?? []) : watchlist;

  const sortedVisible = useMemo(
    () => [...visible].sort((a, b) => (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0)),
    [visible],
  );

  const handleImport = (n: TrendingNiche) => {
    onImport?.({
      genre: `${n.parentGenre} → ${n.name}`,
      targetAudience: n.targetReader,
      bookPromise: n.dominantPromise,
      angle: n.suggestedAngle,
      keywords: n.dominantKeywords ?? [],
    });
    toast.success(`Nicchia importata: ${n.name}`);
  };

  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-amber-500/5 via-card to-purple-500/5 p-4 space-y-3">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-purple-500/20 text-amber-400">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              Radar Nicchie Vincenti
              {data?.groundingUsed && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live · Brave
                </span>
              )}
              {data && !data.groundingUsed && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-muted text-muted-foreground border border-border">
                  Analisi base
                </span>
              )}
            </h3>
            <p className="text-[10px] text-muted-foreground">
              Cosa sta dominando Amazon.com · Amazon.it · Apple Books in tempo reale
            </p>
          </div>
        </div>

        {/* TABS */}
        <div className="flex rounded-lg border border-border overflow-hidden text-xs">
          <button
            onClick={() => setTab("trending")}
            className={`px-3 py-1.5 font-semibold transition-colors flex items-center gap-1 ${
              tab === "trending"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <Flame className="h-3 w-3" /> Trending
          </button>
          <button
            onClick={() => setTab("watchlist")}
            className={`px-3 py-1.5 font-semibold transition-colors flex items-center gap-1 border-l border-border ${
              tab === "watchlist"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <Star className="h-3 w-3" /> Playlist
            {watchlist.length > 0 && (
              <span className="ml-1 px-1 rounded bg-amber-500/30 text-amber-200 text-[9px]">
                {watchlist.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* PAYWALL BANNER (trending only) */}
      {tab === "trending" && gate && !gate.isDev && (
        <div
          className={`flex items-center justify-between gap-2 text-[10px] px-2.5 py-1.5 rounded-md border ${
            gate.allowed
              ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300"
              : "bg-rose-500/5 border-rose-500/20 text-rose-300"
          }`}
        >
          <span className="flex items-center gap-1.5">
            {gate.allowed ? <Zap className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            {gate.reason === "paid" && (
              <>Piano <strong className="uppercase">{gate.plan}</strong> · €{TRENDING_PRICE_EUR.toFixed(2)} per generazione</>
            )}
            {gate.reason === "beta-free" && (
              <>Beta · <strong>{gate.betaRemaining}</strong> generazione gratuita disponibile</>
            )}
            {gate.reason === "beta-exhausted" && (
              <>Beta · click gratuito esaurito · passa a Pro/Premium per continuare</>
            )}
            {gate.reason === "free-blocked" && (
              <>Feature a pagamento · sblocca con Pro o Premium</>
            )}
          </span>
        </div>
      )}
      {tab === "trending" && gate?.isDev && (
        <div className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-md border bg-cyan-500/5 border-cyan-500/20 text-cyan-300">
          <Zap className="h-3 w-3" /> Dev mode · trend illimitati senza addebito
        </div>
      )}

      {/* CONTROLS (trending only) */}
      {tab === "trending" && (
        <div className="flex gap-2">
          <input
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="Focus opzionale: es. self-help, romance, business…"
            className="flex-1 px-3 py-2 text-xs rounded-md bg-background border border-border focus:border-primary outline-none"
          />
          <button
            onClick={() => load(false)}
            disabled={loading || (gate ? !gate.allowed : false)}
            className="px-3 py-2 rounded-md bg-gradient-to-r from-amber-500 to-purple-500 text-primary-foreground text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            title={gate && !gate.allowed ? "Feature a pagamento" : undefined}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : gate && !gate.allowed ? <Lock className="h-3.5 w-3.5" />
              : <Sparkles className="h-3.5 w-3.5" />}
            {data ? "Ricarica" : "Scopri nicchie vincenti"}
            {gate?.reason === "paid" && (
              <span className="ml-1 px-1 rounded bg-background/20 text-[9px] font-bold">€{TRENDING_PRICE_EUR.toFixed(2)}</span>
            )}
          </button>
          {data && (
            <button
              onClick={() => load(true)}
              disabled={loading || (gate ? !gate.allowed : false)}
              title={gate && !gate.allowed ? "Feature a pagamento" : "Rigenera con altre nicchie"}
              className="px-2 py-2 rounded-md border border-border hover:bg-muted text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* OVERVIEW */}
      {tab === "trending" && data?.fallbackReason && (
        <p className="text-[11px] text-amber-950 dark:text-amber-100 leading-relaxed px-2 py-1.5 rounded bg-amber-500/10 border border-amber-500/30">
          {data.fallbackReason}
        </p>
      )}
      {tab === "trending" && data?.marketOverview && (
        <p className="text-[11px] text-foreground/80 leading-relaxed px-2 py-1.5 rounded bg-card/50 border border-border/50">
          <Globe2 className="inline h-3 w-3 mr-1 text-cyan-400" />
          {data.marketOverview}
        </p>
      )}

      {/* META */}
      {tab === "trending" && data && (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
          {data.groundingUsed ? (
            <>
              <span>📡 {data.groundingResultsCount} risultati live</span>
              <span>·</span>
            </>
          ) : (
            <>
              <span>Analisi base locale</span>
              <span>·</span>
            </>
          )}
          <span>🌍 {data.marketplaces?.join(" / ")}</span>
          {data.groundingQueries?.length ? (
            <>
              <span>·</span>
              <span>🔎 {data.groundingQueries.length} query Brave</span>
            </>
          ) : null}
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive px-2">{error}</p>
      )}

      {/* EMPTY STATES */}
      {tab === "trending" && !data && !loading && (
        <p className="text-xs text-muted-foreground text-center py-6">
          Clicca <strong>Scopri nicchie vincenti</strong> per vedere le nicchie che stanno dominando ora.
        </p>
      )}
      {tab === "watchlist" && watchlist.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-6">
          La tua playlist è vuota. Salva una nicchia con la <Star className="inline h-3 w-3" /> per ritrovarla qui.
        </p>
      )}

      {/* LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {sortedVisible.map((n, i) => (
          <NicheCard
            key={`${n.parentGenre}-${n.name}-${i}`}
            niche={n}
            pinned={isPinned(n)}
            onTogglePin={() => togglePin(n)}
            onImport={onImport ? () => handleImport(n) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------- card ---------- */

function NicheCard({
  niche, pinned, onTogglePin, onImport,
}: {
  niche: TrendingNiche;
  pinned: boolean;
  onTogglePin: () => void;
  onImport?: () => void;
}) {
  const opp = niche.opportunityScore ?? 0;
  const oppCls =
    opp >= 85 ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" :
    opp >= 70 ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" :
    "bg-amber-500/15 text-amber-300 border-amber-500/30";

  const TrendIcon =
    niche.trendDirection === "rising" ? ArrowUpRight :
    niche.trendDirection === "declining" ? ArrowDownRight : Minus;
  const trendCls =
    niche.trendDirection === "rising" ? "text-emerald-400" :
    niche.trendDirection === "declining" ? "text-rose-400" : "text-muted-foreground";

  return (
    <div className="p-3 rounded-lg bg-card border border-border hover:border-primary/40 transition-colors group">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-xs font-bold text-foreground leading-tight truncate">{niche.name}</p>
            <TrendIcon className={`h-3 w-3 shrink-0 ${trendCls}`} />
          </div>
          <p className="text-[10px] text-muted-foreground truncate">
            {niche.parentGenre} · {niche.marketplace}
          </p>
        </div>
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0 ${oppCls}`}>
          OPP {opp}
        </span>
      </div>

      <div className="flex flex-wrap gap-1 mb-1.5">
        <Chip label={`Domanda: ${niche.demandLevel}`} positive={niche.demandLevel === "high"} negative={niche.demandLevel === "low"} />
        <Chip label={`Concorrenza: ${niche.competitionLevel}`} positive={niche.competitionLevel === "low"} negative={niche.competitionLevel === "high"} />
        <Chip label={`Saturazione: ${niche.saturationRisk}`} positive={niche.saturationRisk === "low"} negative={niche.saturationRisk === "high"} />
      </div>

      <p className="text-[11px] text-foreground/85 leading-snug mb-1">
        <span className="text-muted-foreground">Promessa: </span>{niche.dominantPromise}
      </p>
      <p className="text-[10px] text-muted-foreground leading-snug mb-1.5">
        <span className="font-semibold text-foreground/80">Angolo libero:</span> {niche.suggestedAngle}
      </p>

      {niche.dominantKeywords?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {niche.dominantKeywords.slice(0, 5).map((k, i) => (
            <span key={`stable-${i}`} className="px-1.5 py-0.5 rounded text-[9px] bg-muted text-muted-foreground border border-border/60">
              {k}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-1.5 pt-1.5 border-t border-border/50">
        <button
          onClick={onTogglePin}
          className={`flex-1 h-7 rounded text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors ${
            pinned
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
          }`}
        >
          {pinned ? <><Check className="h-3 w-3" /> In playlist</> : <><Star className="h-3 w-3" /> Salva</>}
        </button>
        {onImport && (
          <button
            onClick={onImport}
            className="flex-1 h-7 rounded text-[10px] font-semibold bg-gradient-to-r from-amber-500 to-purple-500 text-white flex items-center justify-center gap-1 hover:opacity-90"
          >
            Configura progetto <ArrowUpRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function Chip({ label, positive, negative }: { label: string; positive?: boolean; negative?: boolean }) {
  const cls = positive
    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
    : negative
    ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
    : "bg-muted text-muted-foreground border-border";
  return <span className={`px-1.5 py-0.5 rounded text-[9px] border ${cls}`}>{label}</span>;
}
