import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, BookOpen, ChevronDown, ChevronUp, Loader2, RefreshCw,
  Rocket, Sparkles, Target, TrendingUp, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BookProject } from "@/types/book";
import {
  runBestsellerRadarEngine,
  validateRadarScan,
  buildRadarInput,
  honestyBadgeLabel,
  confidenceLabel,
  potentialTier,
  formatScanTime,
  type BestsellerRadarResult,
  type RadarStatus,
} from "@/lib/bestseller-radar";
import { ScriptoraWorkingState } from "@/components/ui/ScriptoraWorkingState";
import { WORKING_STEP_PRESETS } from "@/lib/scriptora-working-state";
import { getUserFriendlyError } from "@/lib/user-friendly-error";

const KDP_PREFILL_KEY = "scriptora-kdp-prefill";

interface Props {
  projects: BookProject[];
  initialProjectId?: string | null;
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="truncate">{label}</span>
        <span className="tabular-nums text-foreground">{score}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
      </div>
    </div>
  );
}

export function BestsellerRadarCommercialPanel({ projects, initialProjectId }: Props) {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState(initialProjectId || projects[0]?.id || "");
  const [status, setStatus] = useState<RadarStatus>("idle");
  const [result, setResult] = useState<BestsellerRadarResult | null>(null);
  const [error, setError] = useState("");
  const [scanStartedAt, setScanStartedAt] = useState<number | undefined>();
  const [showDetails, setShowDetails] = useState(true);

  const project = useMemo(
    () => projects.find((p) => p.id === projectId) || null,
    [projects, projectId],
  );
  const italian = project ? String(project.config.language || "").toLowerCase().includes("ital") : true;

  useEffect(() => {
    if (!projectId && projects[0]?.id) setProjectId(projects[0].id);
  }, [projects, projectId]);

  async function runScan() {
    setError("");
    const validation = validateRadarScan(project);
    if (validation) {
      setError(validation);
      setStatus("error");
      return;
    }
    setStatus("scanning");
    setScanStartedAt(Date.now());
    await new Promise((r) => setTimeout(r, 350));
    try {
      const input = buildRadarInput(project);
      const res = runBestsellerRadarEngine(input);
      setResult(res);
      setStatus("done");
    } catch (e) {
      setError(getUserFriendlyError(e, {
        fallback: italian ? "Impossibile calcolare il radar su questo progetto. Controlla titolo, genere e manoscritto." : "Cannot compute radar for this project. Check title, genre and manuscript.",
      }));
      setStatus("error");
    }
  }

  function actionNavigate(target: string) {
    if (!project) return;
    switch (target) {
      case "kdp-launch":
        sessionStorage.setItem(KDP_PREFILL_KEY, JSON.stringify({
          idea: project.config.idea || project.config.subtitle,
          genre: project.config.genre,
          keyword: project.config.subcategory,
        }));
        navigate("/kdp-launch");
        break;
      case "title-domination":
        navigate("/kdp-launch#title-domination");
        break;
      case "blueprint":
      case "editor":
        navigate("/app");
        break;
      case "cover-studio":
        navigate("/dashboard", { state: { openCover: true, projectId: project.id } });
        break;
      case "export":
        navigate("/dashboard", { state: { openExport: true, projectId: project.id } });
        break;
      default:
        break;
    }
  }

  return (
    <section className="scriptora-bestseller-radar-commercial min-w-0 max-w-full overflow-x-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/8 to-transparent p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Target className="h-3.5 w-3.5" />
            {italian ? "Radar commerciale progetto" : "Project commercial radar"}
          </div>
          <h2 className="text-xl font-bold tracking-tight break-words sm:text-2xl">
            {italian ? "Bestseller Radar" : "Bestseller Radar"}
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground break-words">
            {italian
              ? "Valuta potenziale commerciale reale del tuo libro — titolo, promessa, mercato, KDP, blueprint e manoscritto."
              : "Evaluate your book's real commercial potential — title, promise, market, KDP, blueprint and manuscript."}
          </p>
        </div>
        {result && (
          <div className="shrink-0 text-right">
            <div className="text-4xl font-black tabular-nums text-primary sm:text-5xl">{result.score.overall}</div>
            <p className="text-xs text-muted-foreground">/100</p>
            <p className="mt-1 text-sm font-semibold">{potentialTier(result.score.overall, italian)}</p>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <select
          value={projectId}
          onChange={(e) => { setProjectId(e.target.value); setResult(null); setStatus("idle"); }}
          className="h-11 min-w-0 max-w-full rounded-xl border border-border bg-background px-3 text-sm outline-none"
        >
          {projects.length === 0 && <option value="">{italian ? "Nessun progetto" : "No project"}</option>}
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.config.title || p.config.idea || p.id}</option>
          ))}
        </select>
        <Button onClick={() => void runScan()} disabled={!project || status === "scanning"} className="h-11 gap-2 shrink-0">
          {status === "scanning" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {status === "scanning"
            ? (italian ? "Scansione…" : "Scanning…")
            : (italian ? "Aggiorna Radar" : "Refresh Radar")}
        </Button>
      </div>

      {status === "scanning" && (
        <div className="mt-4">
          <ScriptoraWorkingState
          title={italian ? "Scansione commerciale in corso…" : "Commercial scan in progress…"}
          description={italian
            ? "Sto leggendo progetto, KDP, titolo, cover e capitoli."
            : "Reading project, KDP, title, cover and chapters."}
          tone="market"
          variant="panel"
          startedAt={scanStartedAt}
          steps={[...WORKING_STEP_PRESETS.radar]}
          />
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive break-words">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {result && status === "done" && (
        <div className="mt-5 space-y-4 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{honestyBadgeLabel(result.mode, italian)}</Badge>
            <Badge variant="secondary">{confidenceLabel(result.confidence, italian)}</Badge>
            {result.delta != null && (
              <Badge variant={result.delta >= 0 ? "default" : "destructive"}>
                {result.delta >= 0 ? "+" : ""}{result.delta} {italian ? "vs precedente" : "vs previous"}
              </Badge>
            )}
          </div>

          {result.previousOverall != null && (
            <p className="text-xs text-muted-foreground">
              {italian ? "Ultima scansione" : "Last scan"}: {formatScanTime(result.createdAt, italian)}
              {" · "}
              {italian ? "Score precedente" : "Previous score"}: {result.previousOverall}
              {" · "}
              {italian ? "Score attuale" : "Current score"}: {result.score.overall}
            </p>
          )}

          <div className="rounded-xl border border-border/60 bg-background/70 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {italian ? "Verdetto" : "Verdict"}
            </p>
            <p className="mt-2 text-sm font-medium leading-relaxed break-words">{result.verdict}</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {result.map.map((row) => (
              <ScoreBar key={row.key} label={row.label} score={row.score} />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs font-semibold"
          >
            {italian ? "Diagnosi commerciale" : "Commercial diagnosis"}
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showDetails && (
            <div className="grid gap-3 md:grid-cols-3 min-w-0">
              <DiagBlock title={italian ? "Punti forti" : "Strengths"} items={result.strengths} tone="good" />
              <DiagBlock title={italian ? "Rischi commerciali" : "Commercial risks"} items={result.risks} tone="warn" />
              <DiagBlock title={italian ? "Leve di crescita" : "Growth levers"} items={result.growthLevers} tone="neutral" />
            </div>
          )}

          {result.missingData.length > 0 && (
            <p className="text-xs text-muted-foreground break-words">
              {italian ? "Dati mancanti" : "Missing data"}: {result.missingData.join(", ")}.
              {italian ? " Il radar usa stime editoriali, non dati Amazon live." : " Radar uses editorial estimates, not live Amazon data."}
            </p>
          )}

          {result.actions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-bold">{italian ? "Azioni ad alto impatto" : "High-impact actions"}</p>
              {result.actions.map((action, i) => (
                <div key={`action-${i}`} className="rounded-xl border border-border/60 bg-card/60 p-3 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={action.priority === "high" ? "default" : "secondary"} className="text-[10px] uppercase">
                      {action.priority}
                    </Badge>
                    <p className="text-sm font-semibold break-words">{action.title}</p>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground break-words">{action.reason}</p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => actionNavigate(action.targetModule)}>
                    {action.ctaLabel}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {!result.missingData.some((m) => /kdp|analisi/i.test(m)) ? null : (
            <div className="flex flex-col gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm break-words">
                {italian
                  ? "Completa KDP Launch per rendere il Radar più preciso."
                  : "Complete KDP Launch to make the Radar more accurate."}
              </p>
              <Button size="sm" className="shrink-0 gap-2" onClick={() => actionNavigate("kdp-launch")}>
                <Rocket className="h-4 w-4" />
                {italian ? "Apri KDP Launch" : "Open KDP Launch"}
              </Button>
            </div>
          )}

          {result.score.titlePower < 62 && (
            <div className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm break-words">
                {italian
                  ? "Il titolo è il collo di bottiglia. Apri Title Domination e genera varianti più vendibili."
                  : "Title is the bottleneck. Open Title Domination for more sellable variants."}
              </p>
              <Button size="sm" variant="outline" className="shrink-0 gap-2" onClick={() => actionNavigate("title-domination")}>
                <Wand2 className="h-4 w-4" />
                {italian ? "Migliora titolo" : "Improve title"}
              </Button>
            </div>
          )}
        </div>
      )}

      {projects.length === 0 && (
        <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
          <BookOpen className="mb-2 h-5 w-5" />
          {italian
            ? "Crea un progetto nella dashboard per attivare il radar commerciale basato sul tuo libro."
            : "Create a project in the dashboard to enable book-based commercial radar."}
        </div>
      )}
    </section>
  );
}

function DiagBlock({ title, items, tone }: { title: string; items: string[]; tone: "good" | "warn" | "neutral" }) {
  const border = tone === "good" ? "border-emerald-400/25 bg-emerald-400/10" : tone === "warn" ? "border-destructive/20 bg-destructive/10" : "border-border/60 bg-background/50";
  return (
    <div className={`rounded-xl border p-3 min-w-0 ${border}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="mt-2 space-y-1 text-xs leading-relaxed break-words">
        {items.length ? items.map((item, i) => <li key={`${title}-${i}`}>• {item}</li>) : <li>—</li>}
      </ul>
    </div>
  );
}
