import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DEEPSEEK_PRICING_NOTE, getUsageDiagnostics, getUserUsage, getRecentUsage, getUsageRowCost, formatCost, formatTokens, type UsageSummary, type UsageRow } from "@/lib/ai-usage";
import { ArrowLeft, Loader2, Activity, DollarSign, Hash, Zap, RefreshCw, AlertTriangle } from "lucide-react";

export default function UsagePage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [recent, setRecent] = useState<UsageRow[]>([]);
  const [usageIssue, setUsageIssue] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      setLoading(true);
      Promise.all([getUserUsage(), getRecentUsage(50)])
        .then(([s, r]) => {
          setSummary(s);
          setRecent(r);
          setUsageIssue(getUsageDiagnostics());
        })
        .catch((error) => {
          console.error("[usage-page] load error", error);
          setSummary(emptyUsageSummary());
          setRecent([]);
          setUsageIssue(error instanceof Error ? error.message : "Impossibile caricare il conteggio AI.");
        })
        .finally(() => setLoading(false));
    };
    load();
    window.addEventListener("nexora-usage-change", load);
    return () => window.removeEventListener("nexora-usage-change", load);
  }, []);

  const refresh = () => {
    setLoading(true);
    Promise.all([getUserUsage(), getRecentUsage(50)])
      .then(([s, r]) => {
        setSummary(s);
        setRecent(r);
        setUsageIssue(getUsageDiagnostics());
      })
      .catch((error) => {
        console.error("[usage-page] refresh error", error);
        setSummary(emptyUsageSummary());
        setRecent([]);
        setUsageIssue(error instanceof Error ? error.message : "Impossibile aggiornare il conteggio AI.");
      })
      .finally(() => setLoading(false));
  };

  const usingScriptoraWords = usageIssue?.startsWith("SCRIPTORA_WORDS:");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b border-border/50">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </button>
          <div className="flex items-center gap-3">
            <button onClick={refresh} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40">
              <RefreshCw className="h-3.5 w-3.5" /> Aggiorna
            </button>
            <div className="text-[11px] font-mono tracking-widest text-muted-foreground">DEV · USAGE</div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <section>
          <h1 className="text-2xl font-bold tracking-tight">AI Usage & Cost</h1>
          <p className="text-sm text-muted-foreground mt-1">Tracking reale di tutte le chiamate AI · DeepSeek</p>
        </section>

        {usageIssue && (
          <section className={`rounded-lg border p-4 text-xs ${
            usingScriptoraWords
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-50/85"
              : "border-amber-400/30 bg-amber-400/10 text-amber-50/85"
          }`}>
            <div className={`flex items-center gap-2 font-semibold ${usingScriptoraWords ? "text-emerald-50" : "text-amber-50"}`}>
              <AlertTriangle className="h-4 w-4" />
              {usingScriptoraWords ? "Conteggio da parole reali Scriptora" : "Conteggio cloud non leggibile"}
            </div>
            <div className="mt-1 leading-relaxed">
              {usingScriptoraWords
                ? "Uso le parole effettive salvate nei tuoi libri, capitoli e parti del libro. I token sono una stima DeepSeek basata sul testo reale prodotto da Scriptora."
                : usageIssue.includes("Invalid API key")
                ? "La key Supabase attuale non puo leggere le tabelle via REST. La dashboard ora usa la Edge Function ai-usage-summary: deployala sul progetto Supabase per leggere i log reali con service role."
                : usageIssue}
            </div>
          </section>
        )}

        <section className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-4 text-xs text-cyan-50/80">
          <div className="font-semibold text-cyan-50">Prezzi DeepSeek reali attivi</div>
          <div className="mt-1 leading-relaxed">
            V4 Flash / deepseek-chat / deepseek-reasoner: ${DEEPSEEK_PRICING_NOTE.flash.cacheHitInputPerMillion}/M input cache-hit,
            ${DEEPSEEK_PRICING_NOTE.flash.cacheMissInputPerMillion}/M input cache-miss,
            ${DEEPSEEK_PRICING_NOTE.flash.outputPerMillion}/M output. V4 Pro promo:
            ${DEEPSEEK_PRICING_NOTE.proPromo.cacheMissInputPerMillion}/M input cache-miss,
            ${DEEPSEEK_PRICING_NOTE.proPromo.outputPerMillion}/M output fino al {DEEPSEEK_PRICING_NOTE.proPromo.validUntilUtc} UTC.
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat icon={<DollarSign className="h-4 w-4" />} label="Costo totale" value={formatCost(summary?.totalCost || 0)} />
          <Stat icon={<Hash className="h-4 w-4" />} label="Token totali" value={formatTokens(summary?.totalTokens || 0)} />
          <Stat icon={<Activity className="h-4 w-4" />} label={usingScriptoraWords ? "Progetti stimati" : "Chiamate"} value={String(summary?.callsCount || 0)} />
          <Stat icon={<Zap className="h-4 w-4" />} label="Costo medio" value={formatCost(summary?.callsCount ? summary.totalCost / summary.callsCount : 0)} />
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <Panel title="Per task type">
            {summary && Object.keys(summary.byTask).length === 0 && <Empty />}
            {summary && Object.entries(summary.byTask)
              .sort((a, b) => b[1].cost - a[1].cost)
              .map(([task, v]) => (
                <Row key={task} label={taskLabel(task)} cost={v.cost} tokens={v.tokens} calls={v.calls} max={summary.totalCost} />
              ))}
          </Panel>
          <Panel title="Per provider">
            {summary && Object.keys(summary.byProvider).length === 0 && <Empty />}
            {summary && Object.entries(summary.byProvider)
              .sort((a, b) => b[1].cost - a[1].cost)
              .map(([prov, v]) => (
                <Row key={prov} label={prov} cost={v.cost} tokens={v.tokens} calls={v.calls} max={summary.totalCost} />
              ))}
          </Panel>
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Ultimi 50 log</h2>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Quando</th>
                  <th className="text-left px-3 py-2 font-medium">Task</th>
                  <th className="text-left px-3 py-2 font-medium">Model</th>
                  <th className="text-left px-3 py-2 font-medium">Provider</th>
                  <th className="text-right px-3 py-2 font-medium">Tokens</th>
                  <th className="text-right px-3 py-2 font-medium">Costo</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Nessun log ancora.</td></tr>
                )}
                {recent.map((r) => (
                  <tr key={r.id} className="border-t border-border/50 hover:bg-muted/20">
                    <td className="px-3 py-2 text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{taskLabel(r.task_type)}</div>
                      {getRealWordCount(r) > 0 && (
                        <div className="text-[11px] text-muted-foreground">
                          {getRealWordCount(r).toLocaleString()} parole reali · {String(r.metadata?.project_title || "Libro Scriptora")}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{r.model}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.provider}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatTokens(r.total_tokens)}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatCost(getUsageRowCost(r))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-[11px] uppercase tracking-wider">
        {icon}{label}
      </div>
      <div className="mt-2 text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, cost, tokens, calls, max }: { label: string; cost: number; tokens: number; calls: number; max: number }) {
  const pct = max > 0 ? Math.max(2, Math.round((cost / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-muted-foreground">{formatCost(cost)} · {formatTokens(tokens)} · {calls}x</span>
      </div>
      <div className="mt-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Empty() {
  return <p className="text-xs text-muted-foreground">Nessun dato ancora.</p>;
}

function taskLabel(task: string): string {
  if (task === "scriptora_real_words") return "Parole reali Scriptora";
  return task;
}

function getRealWordCount(row: UsageRow): number {
  const value = row.metadata?.real_word_count;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function emptyUsageSummary(): UsageSummary {
  return {
    totalTokens: 0,
    totalCost: 0,
    inputCost: 0,
    outputCost: 0,
    callsCount: 0,
    byTask: {},
    byProvider: {},
  };
}
