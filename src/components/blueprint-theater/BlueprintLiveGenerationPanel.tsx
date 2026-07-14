import { CheckCircle2, Clock3, Loader2, Sparkles, Zap } from "lucide-react";
import type { ChapterPipelineItem, BlueprintTheaterLiveStats } from "@/lib/blueprint-theater/blueprint-theater-state";
import { cn } from "@/lib/utils";

type Props = {
  pipeline: ChapterPipelineItem[];
  stats: BlueprintTheaterLiveStats;
  narrativeEvents: string[];
  generatingBlueprint?: boolean;
  blueprintElapsedSeconds?: number;
  italianUi?: boolean;
};

function statusLabel(status: ChapterPipelineItem["status"], italian: boolean) {
  if (status === "done") return italian ? "completato" : "done";
  if (status === "generating") return italian ? "in corso" : "generating";
  return italian ? "in attesa" : "waiting";
}

function StatusIcon({ status }: { status: ChapterPipelineItem["status"] }) {
  if (status === "done") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === "generating") return <Loader2 className="h-4 w-4 animate-spin text-amber-300" />;
  return <Clock3 className="h-4 w-4 text-white/30" />;
}

export function BlueprintLiveGenerationPanel({
  pipeline,
  stats,
  narrativeEvents,
  generatingBlueprint = false,
  blueprintElapsedSeconds = 0,
  italianUi = true,
}: Props) {
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <aside className="blueprint-theater-live glass-premium flex min-h-0 flex-col overflow-hidden rounded-[1.75rem] border border-white/10">
      <header className="shrink-0 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-cyan-300" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/80">
            {italianUi ? "Forgia del Blueprint" : "Blueprint forge"}
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <div className="grid gap-3 rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.05] p-4">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/45">
                {italianUi ? "Blueprint preparato" : "Blueprint prepared"}
              </p>
              <p className="text-3xl font-bold tabular-nums text-white">{stats.bookPercent}%</p>
            </div>
            {generatingBlueprint && (
              <div className="rounded-xl border border-cyan-300/25 bg-black/30 px-2.5 py-1.5 font-mono text-sm tabular-nums text-cyan-100">
                {formatTime(blueprintElapsedSeconds)}
              </div>
            )}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 via-cyan-400 to-emerald-400 transition-all duration-700"
              style={{ width: `${Math.max(4, stats.bookPercent)}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-xl bg-black/25 px-3 py-2">
              <p className="text-white/45">{italianUi ? "Capitoli" : "Chapters"}</p>
              <p className="font-bold tabular-nums text-white">
                {stats.chaptersDone}/{stats.chaptersTotal || "—"}
              </p>
            </div>
            <div className="rounded-xl bg-black/25 px-3 py-2">
              <p className="text-white/45">{italianUi ? "Parole manoscritto" : "Manuscript words"}</p>
              <p className="font-bold tabular-nums text-white">{stats.wordsGenerated.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
            {italianUi ? "Pipeline" : "Pipeline"}
          </p>
          {pipeline.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors",
                item.status === "generating"
                  ? "border-amber-300/30 bg-amber-400/10 text-amber-50"
                  : item.status === "done"
                    ? "border-emerald-300/20 bg-emerald-400/8 text-emerald-50/90"
                    : "border-white/8 bg-white/[0.02] text-white/50",
              )}
            >
              <StatusIcon status={item.status} />
              <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
              <span className="shrink-0 text-[10px] uppercase tracking-wide opacity-70">
                {statusLabel(item.status, italianUi)}
              </span>
            </div>
          ))}
        </div>

        {narrativeEvents.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
              <Sparkles className="h-3 w-3 text-violet-300" />
              {italianUi ? "Feedback editoriale" : "Editorial feed"}
            </p>
            {narrativeEvents.map((event, i) => (
              <p
                key={`${event}-${i}`}
                className="animate-in fade-in rounded-xl border border-violet-300/15 bg-violet-400/[0.06] px-3 py-2 text-[11px] text-violet-100/90"
              >
                {event}
              </p>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
