import { cn } from "@/lib/utils";
import type { ForgeLiveMapSnapshot } from "@/lib/guided-interview/forge-live-map";

export type ForgeDirectionCardProps = {
  summary: ForgeLiveMapSnapshot["directionSummary"];
  confidencePct: number;
  onContinue?: () => void;
  onCorrect?: () => void;
  onDeepen?: () => void;
  compact?: boolean;
};

export function ForgeDirectionCard({
  summary,
  confidencePct,
  onContinue,
  onCorrect,
  onDeepen,
  compact,
}: ForgeDirectionCardProps) {
  return (
    <section
      className={cn(
        "scriptora-forge-direction-card rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm",
        compact ? "p-3" : "p-4",
      )}
    >
      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">Direzione attuale</p>

      <dl className={cn("mt-2 space-y-1.5 text-[11px] leading-5", compact && "text-[10px]")}>
        <div>
          <dt className="text-white/45">Libro</dt>
          <dd className="font-medium text-white/90">{summary.bookLabel}</dd>
        </div>
        <div>
          <dt className="text-white/45">Centro</dt>
          <dd className="line-clamp-2 text-white/75">{summary.center}</dd>
        </div>
        <div>
          <dt className="text-white/45">Tono</dt>
          <dd className="line-clamp-2 text-white/75">{summary.tone}</dd>
        </div>
        {summary.stillMissing.length > 0 && (
          <div>
            <dt className="text-white/45">Manca ancora</dt>
            <dd className="text-amber-100/85">{summary.stillMissing.join(" · ")}</dd>
          </div>
        )}
      </dl>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[10px] text-white/45">
          Confidenza <span className="font-semibold tabular-nums text-violet-200">{confidencePct}%</span>
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {onContinue && (
          <button
            type="button"
            onClick={onContinue}
            className="rounded-xl bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-950"
          >
            → Continua
          </button>
        )}
        {onCorrect && (
          <button
            type="button"
            onClick={onCorrect}
            className="rounded-xl border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-white/80"
          >
            ✏ Correggi
          </button>
        )}
        {onDeepen && (
          <button
            type="button"
            onClick={onDeepen}
            className="rounded-xl border border-violet-400/25 bg-violet-500/10 px-3 py-1.5 text-[11px] font-semibold text-violet-100"
          >
            🔍 Approfondisci
          </button>
        )}
      </div>
    </section>
  );
}
