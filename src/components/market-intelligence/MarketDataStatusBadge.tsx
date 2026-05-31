import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import {
  marketDataStatusDescriptionKey,
  marketDataStatusLabelKey,
  type MarketDataStatus,
} from "@/lib/market-intelligence/marketDataStatus";

const STATUS_STYLES: Record<MarketDataStatus, string> = {
  live: "border-emerald-500/35 bg-emerald-500/10 text-emerald-200",
  estimated: "border-amber-500/35 bg-amber-500/10 text-amber-100",
  example: "border-border/80 bg-muted/40 text-muted-foreground border-dashed",
  unavailable: "border-slate-500/35 bg-slate-500/10 text-slate-200",
};

interface MarketDataStatusBadgeProps {
  status: MarketDataStatus;
  className?: string;
}

/** Compact premium badge — mobile-safe, non-invasive. */
export function MarketDataStatusBadge({ status, className }: MarketDataStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-snug",
        STATUS_STYLES[status],
        className,
      )}
    >
      {t(marketDataStatusLabelKey(status))}
    </span>
  );
}

interface MarketDataStatusNoticeProps {
  status: MarketDataStatus;
  className?: string;
  /** Optional extra line (e.g. title intel microcopy). */
  extra?: string;
}

/** Soft contextual notice with badge + description. */
export function MarketDataStatusNotice({ status, className, extra }: MarketDataStatusNoticeProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-xl border border-border/60 bg-muted/25 px-3 py-2.5 sm:flex-row sm:items-start sm:gap-3",
        className,
      )}
      role="note"
    >
      <MarketDataStatusBadge status={status} className="self-start" />
      <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-muted-foreground">
        {t(marketDataStatusDescriptionKey(status))}
        {extra ? ` ${extra}` : ""}
      </p>
    </div>
  );
}
