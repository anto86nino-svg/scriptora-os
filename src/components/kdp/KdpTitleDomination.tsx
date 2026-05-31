/**
 * Title Domination Studio — incremental section for /kdp-launch.
 * Performs real Brave Search market scan, then DeepSeek strategic analysis
 * to produce ORIGINAL, scored, sellable KDP titles.
 *
 * Self-contained: state lives here; nothing else in the app depends on it.
 */
import { useState, useRef } from "react";
import { Loader2, Crown, Search, Sparkles, RefreshCw, Save, Target } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dominateTitles, type TitleDominationResult, type DominateTitlesInput } from "@/lib/kdp/money-engine";
import { fetchPlan, type PlanTier } from "@/lib/plan";
import { useFeatureGate } from "@/components/PaywallGuard";
import { getScriptoraLanguage } from "@/lib/i18n";

interface Props {
  /** Optional callback when user wants to push title into a project. */
  onUseTitle?: (title: string, subtitle: string) => void;
  /** Pre-fill from parent state if available. */
  defaults?: Partial<DominateTitlesInput>;
}

const STATE_KEY = "kdp-title-domination-state";

function GroundingPill({ used, count }: { used?: boolean; count?: number }) {
  if (used) {
    return (
      <Badge variant="outline" className="border-primary/40 text-primary text-[10px] font-medium">
        ● Dati di mercato in tempo reale{count ? ` (${count})` : ""}
      </Badge>
    );
  }
  return <Badge variant="secondary" className="text-[10px]">Solo analisi AI · senza dati live</Badge>;
}

function ScoreBar({ value, label }: { value: number; label: string }) {
  const tone = value >= 75 ? "bg-primary" : value >= 50 ? "bg-amber-500" : "bg-muted-foreground/40";
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-20 text-muted-foreground">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <span className="w-8 text-right tabular-nums">{Math.round(value)}</span>
    </div>
  );
}

function riskTone(r: "low" | "medium" | "high") {
  return r === "high" ? "destructive" : r === "medium" ? "secondary" : "outline";
}

export function KdpTitleDomination({ onUseTitle, defaults }: Props) {
  // Premium gate — Title Domination is a premium feature (full dominate_mode).
  const gate = useFeatureGate("dominate_mode");

  // Restore prior state if user navigated away & back.
  const restored = (() => {
    try { return JSON.parse(sessionStorage.getItem(STATE_KEY) || "null"); } catch { return null; }
  })();

  const [input, setInput] = useState<DominateTitlesInput>({
    idea: defaults?.idea ?? restored?.input?.idea ?? "",
    genre: defaults?.genre ?? restored?.input?.genre ?? "Self-help",
    language: defaults?.language ?? restored?.input?.language ?? getScriptoraLanguage(),
    marketplace: defaults?.marketplace ?? restored?.input?.marketplace ?? "amazon.it",
    bookType: defaults?.bookType ?? restored?.input?.bookType ?? "guide",
    targetReader: defaults?.targetReader ?? restored?.input?.targetReader ?? "",
    mainProblem: defaults?.mainProblem ?? restored?.input?.mainProblem ?? "",
    desiredPromise: defaults?.desiredPromise ?? restored?.input?.desiredPromise ?? "",
    titleTone: defaults?.titleTone ?? restored?.input?.titleTone ?? "direct",
  });
  const [stage, setStage] = useState<"idle" | "brave" | "deepseek" | "done">(
    restored?.result ? "done" : "idle",
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TitleDominationResult | null>(restored?.result ?? null);
  const [error, setError] = useState<string | null>(null);

  // Debounce sessionStorage writes — typing in inputs called this on every
  // keystroke, blocking the main thread with JSON.stringify of large results.
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPersistRef = useRef<{ input?: DominateTitlesInput; result?: TitleDominationResult | null } | null>(null);
  function persist(next: { input?: DominateTitlesInput; result?: TitleDominationResult | null }) {
    pendingPersistRef.current = { ...(pendingPersistRef.current || {}), ...next };
    if (persistTimerRef.current) return;
    persistTimerRef.current = setTimeout(() => {
      const pending = pendingPersistRef.current;
      persistTimerRef.current = null;
      pendingPersistRef.current = null;
      if (!pending) return;
      try {
        sessionStorage.setItem(STATE_KEY, JSON.stringify({
          input: pending.input ?? input,
          result: pending.result === undefined ? result : pending.result,
        }));
      } catch { /* quota — ignore */ }
    }, 500);
  }

  function update<K extends keyof DominateTitlesInput>(k: K, v: DominateTitlesInput[K]) {
    const next = { ...input, [k]: v };
    setInput(next);
    persist({ input: next });
  }

  async function run(opts?: { differentAngle?: boolean }) {
    if (!gate.allowed) { gate.open(); return; }
    if (!input.idea.trim()) { toast.error("Inserisci un'idea libro"); return; }
    setLoading(true);
    setError(null);
    setStage("brave");
    try {
      const plan: PlanTier = await fetchPlan().catch(() => "free");
      // Tiny stage hint — Brave fires first inside the function, then DeepSeek.
      setTimeout(() => setStage((s) => (s === "brave" ? "deepseek" : s)), 1500);

      const tone = opts?.differentAngle
        ? input.titleTone === "provocative" ? "premium" : "provocative"
        : input.titleTone;
      const r = await dominateTitles({ ...input, titleTone: tone }, plan);
      setResult(r);
      setStage("done");
      persist({ result: r });
      if (!r?.titleCandidates?.length) toast.warning("Nessun candidato generato — riprova con un'idea più specifica");
      else toast.success(r.fallbackReason ? `${r.titleCandidates.length} titoli base generati` : `${r.titleCandidates.length} titoli generati`);
    } catch (e: any) {
      const msg = e?.message || "Errore sconosciuto";
      setError(msg);
      toast.error(msg);
      setStage(result ? "done" : "idle");
    } finally {
      setLoading(false);
    }
  }

  const winner = result?.winner;
  const sortedCandidates = result?.titleCandidates
    ? [...result.titleCandidates].sort((a, b) => (b.kdpScore ?? 0) - (a.kdpScore ?? 0))
    : [];

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-primary" />
            Title Domination Studio
          </span>
          {result && <GroundingPill used={result.groundingUsed} count={result.groundingResultsCount} />}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Ricerca di mercato in tempo reale → titoli originali → progetto pronto da sviluppare in Scriptora.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <Label>Idea libro *</Label>
            <Textarea
              rows={2}
              value={input.idea}
              onChange={(e) => update("idea", e.target.value)}
              placeholder="Es. Metodo in 30 giorni per smettere di procrastinare per imprenditori in burnout"
            />
          </div>
          <div>
            <Label>Genere / nicchia</Label>
            <Input value={input.genre || ""} onChange={(e) => update("genre", e.target.value)} />
          </div>
          <div>
            <Label>Tipo libro</Label>
            <Select value={input.bookType} onValueChange={(v) => update("bookType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["self-help","romance","business","spiritual","memoir","guide","cookbook","children","fiction"].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Lingua mercato</Label>
            <Select value={input.language} onValueChange={(v) => update("language", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="English">English</SelectItem>
                <SelectItem value="Italian">Italian</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Marketplace</Label>
            <Select value={input.marketplace} onValueChange={(v) => update("marketplace", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="amazon.com">Amazon.com</SelectItem>
                <SelectItem value="amazon.it">Amazon.it</SelectItem>
                <SelectItem value="amazon.co.uk">Amazon.co.uk</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Lettore target</Label>
            <Input
              value={input.targetReader || ""}
              onChange={(e) => update("targetReader", e.target.value)}
              placeholder="Es. Imprenditori 30-45 anni"
            />
          </div>
          <div>
            <Label>Tono titolo</Label>
            <Select value={input.titleTone} onValueChange={(v) => update("titleTone", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["emotional","premium","direct","provocative","elegant","viral","practical"].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Problema principale del lettore</Label>
            <Input
              value={input.mainProblem || ""}
              onChange={(e) => update("mainProblem", e.target.value)}
              placeholder="Es. Procrastinazione cronica e burnout"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Promessa desiderata</Label>
            <Input
              value={input.desiredPromise || ""}
              onChange={(e) => update("desiredPromise", e.target.value)}
              placeholder="Es. Riprendere il controllo in 30 giorni"
            />
          </div>
        </div>

        {/* Action */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {loading && stage === "brave"    && <span className="flex items-center gap-1"><Search className="h-3 w-3 animate-pulse" /> Scansione mercato in corso…</span>}
            {loading && stage === "deepseek" && <span className="flex items-center gap-1"><Sparkles className="h-3 w-3 animate-pulse" /> Analisi strategica avanzata…</span>}
            {!loading && error && <span className="text-destructive">⚠ {error}</span>}
          </div>
          <Button onClick={() => run()} disabled={loading || !input.idea.trim()} size="lg">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Target className="h-4 w-4 mr-2" />}
            Trova titoli e prepara progetto
          </Button>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4 pt-2">
            <Separator />

            {result.fallbackReason && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
                {result.fallbackReason}
              </div>
            )}

            {/* Queries used */}
            {result.groundingQueries && result.groundingQueries.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">
                  Query di mercato usate ({result.groundingQueries.length}) · {result.groundingResultsCount} risultati analizzati
                </summary>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {result.groundingQueries.map((q, i) => <li key={`stable-${i}`} className="font-mono">› {q}</li>)}
                </ul>
              </details>
            )}

            {/* Winner */}
            {winner && (
              <Card className="border-primary bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2"><Crown className="h-4 w-4 text-primary" /> Titolo vincitore</span>
                    <Badge variant="default">Score {Math.round(winner.finalScore)}/100</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-lg font-bold leading-tight">{winner.title}</div>
                  <div className="text-sm text-muted-foreground">{winner.subtitle}</div>
                  <p className="text-xs italic">{winner.reason}</p>
                  <p className="text-[11px] text-muted-foreground">Best marketplace: <strong>{winner.bestMarketplace}</strong></p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button size="sm" onClick={() => { onUseTitle?.(winner.title, winner.subtitle); toast.success("Titolo pronto per il progetto"); }}>
                      <Save className="h-3.5 w-3.5 mr-1.5" /> Crea progetto da questo titolo
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => run({ differentAngle: true })} disabled={loading}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Rigenera con angolo diverso
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => run()} disabled={loading}>
                      <Search className="h-3.5 w-3.5 mr-1.5" /> Cerca competitor più profondamente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Market signals */}
            {result.marketSignals && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <SignalBlock title="Keyword dominanti"   items={result.marketSignals.dominantKeywords} />
                <SignalBlock title="Promesse ricorrenti" items={result.marketSignals.recurringPromises} />
                <SignalBlock title="Pattern competitor"  items={result.marketSignals.competitorPatterns} />
                <SignalBlock title="Angoli saturi"       items={result.marketSignals.saturatedAngles} tone="warn" />
                <SignalBlock title="Angoli liberi"       items={result.marketSignals.openAngles} tone="good" />
                <SignalBlock title="Pain points"         items={result.marketSignals.readerPainPoints} />
                <SignalBlock title="Trigger emotivi"     items={result.marketSignals.emotionalTriggers} />
              </div>
            )}

            {/* Competitor insights */}
            {result.competitorInsights?.length > 0 && (
              <div>
                <div className="text-xs font-semibold mb-2 text-muted-foreground">Segnali competitor</div>
                <div className="space-y-2">
                  {result.competitorInsights.slice(0, 8).map((c, i) => (
                    <div key={`stable-${i}`} className="text-xs border border-border rounded-md p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{c.titleSignal}</span>
                        <Badge variant={riskTone(c.riskLevel) as any} className="text-[10px]">{c.riskLevel}</Badge>
                      </div>
                      <div className="text-muted-foreground mt-0.5">{c.source} — {c.whyItMatters}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Candidates */}
            <div>
              <div className="text-xs font-semibold mb-2 text-muted-foreground">
                Tutti i candidati ({sortedCandidates.length}) — ordinati per KDP score
              </div>
              <div className="grid grid-cols-1 gap-2">
                {sortedCandidates.map((c, i) => (
                  <div key={`stable-${i}`} className="border border-border rounded-lg p-3 hover:bg-muted/40 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{c.title}</div>
                        <div className="text-xs text-muted-foreground">{c.subtitle}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant="default" className="text-[10px]">KDP {Math.round(c.kdpScore)}</Badge>
                        <Badge variant={riskTone(c.saturationRisk) as any} className="text-[10px]">
                          sat: {c.saturationRisk}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                      <ScoreBar label="Clarity"     value={c.clarityScore} />
                      <ScoreBar label="Emotion"     value={c.emotionScore} />
                      <ScoreBar label="Keyword"     value={c.keywordScore} />
                      <ScoreBar label="Originality" value={c.originalityScore} />
                    </div>
                    <details className="text-[11px] mt-2">
                      <summary className="cursor-pointer text-muted-foreground">Strategia</summary>
                      <div className="mt-1 space-y-1">
                        <p><span className="text-muted-foreground">Positioning:</span> {c.positioning}</p>
                        <p><span className="text-muted-foreground">Hook:</span> {c.emotionalHook}</p>
                        <p><span className="text-muted-foreground">Promise:</span> {c.commercialPromise}</p>
                        <p><span className="text-muted-foreground">Differenziazione:</span> {c.differentiationAngle}</p>
                        <p className="text-primary">✓ {c.whyItCanSell}</p>
                        {c.weakness && <p className="text-destructive">✗ {c.weakness}</p>}
                        {c.improvementSuggestion && <p>→ {c.improvementSuggestion}</p>}
                      </div>
                    </details>
                    <div className="mt-2 flex justify-end">
                      <Button size="sm" variant="ghost" onClick={() => { onUseTitle?.(c.title, c.subtitle); toast.success("Titolo pronto per il progetto"); }}>
                        <Save className="h-3.5 w-3.5 mr-1.5" /> Crea progetto
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Next actions */}
            {result.nextActions?.length > 0 && (
              <div className="text-xs">
                <div className="font-semibold mb-1 text-muted-foreground">Prossime mosse</div>
                <ul className="space-y-1">
                  {result.nextActions.map((a, i) => <li key={`stable-${i}`}>→ {a}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
      {gate.modal}
    </Card>
  );
}

function SignalBlock({ title, items, tone }: { title: string; items: string[]; tone?: "good" | "warn" }) {
  if (!items?.length) return null;
  const color = tone === "good" ? "text-primary" : tone === "warn" ? "text-destructive" : "text-foreground";
  return (
    <div>
      <div className={`font-semibold mb-1 ${color}`}>{title}</div>
      <ul className="space-y-0.5 text-muted-foreground">
        {items.slice(0, 8).map((it, i) => <li key={`stable-${i}`}>• {it}</li>)}
      </ul>
    </div>
  );
}
