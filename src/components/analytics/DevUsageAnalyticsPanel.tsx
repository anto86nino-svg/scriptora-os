import { useEffect, useMemo, useState } from "react";
import { BarChart3, Download, Trash2 } from "lucide-react";
import {
  clearUsageEvents,
  getUsageEvents,
  summarizeUsageEvents,
  type ScriptoraUsageEvent,
} from "@/lib/usage-analytics";

export function DevUsageAnalyticsPanel() {
  const [events, setEvents] = useState<ScriptoraUsageEvent[]>(() => getUsageEvents());
  const [filter, setFilter] = useState("");
  const summary = useMemo(() => summarizeUsageEvents(events), [events]);
  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return events.slice(-80).reverse();
    return events
      .filter((event) => [event.eventName, event.tool, event.route, event.cta].join(" ").toLowerCase().includes(q))
      .slice(-80)
      .reverse();
  }, [events, filter]);

  useEffect(() => {
    const refresh = () => setEvents(getUsageEvents());
    window.addEventListener("scriptora-usage-analytics-change", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("scriptora-usage-analytics-change", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scriptora-dev-usage-events.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    clearUsageEvents();
    setEvents([]);
  };

  return (
    <section className="rounded-lg border border-sky-400/25 bg-sky-400/10 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-sky-100">
            <BarChart3 className="h-4 w-4" />
            Dev Usage Analytics
          </h2>
          <p className="mt-1 text-xs text-sky-50/75">
            Locale, dev-only, senza contenuto manoscritto. Serve a capire funnel, strumenti usati e fallback.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={exportJson} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold">
            <Download className="h-3.5 w-3.5" /> JSON
          </button>
          <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold">
            <Trash2 className="h-3.5 w-3.5" /> Reset
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <MiniStat label="Eventi" value={summary.totalEvents} />
        <MiniStat label="Blueprint" value={summary.blueprintGenerated} />
        <MiniStat label="Paywall" value={summary.paywallViews} />
        <MiniStat label="Fallback" value={summary.fallbackCount} />
      </div>

      <div className="mt-3 rounded-lg border border-white/10 bg-background/30 p-3 text-xs text-muted-foreground">
        Funnel: Home {summary.funnel.home} → Book Forge {summary.funnel.bookForge} → Blueprint {summary.funnel.blueprint} → Paywall {summary.funnel.paywall} → Writing {summary.funnel.writing}
      </div>

      <input
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Filtra evento/tool/route..."
        className="mt-4 h-10 w-full rounded-lg border border-white/10 bg-background/50 px-3 text-sm outline-none"
      />

      <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-white/10 bg-background/35">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-background/95 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Quando</th>
              <th className="px-3 py-2 text-left font-medium">Evento</th>
              <th className="px-3 py-2 text-left font-medium">Tool</th>
              <th className="px-3 py-2 text-left font-medium">Esito</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-5 text-center text-muted-foreground">Nessun evento registrato.</td></tr>
            ) : (
              visible.map((event) => (
                <tr key={event.id} className="border-t border-white/8">
                  <td className="px-3 py-2 text-muted-foreground">{new Date(event.timestamp).toLocaleString()}</td>
                  <td className="px-3 py-2 font-medium">{event.eventName}</td>
                  <td className="px-3 py-2 text-muted-foreground">{event.tool || event.route || "-"}</td>
                  <td className="px-3 py-2">{event.success === false ? "warning" : "ok"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-background/35 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}
