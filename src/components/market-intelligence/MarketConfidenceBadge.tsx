import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import {
  marketConfidenceLabelKey,
  marketConfidenceMicrocopyKey,
  type MarketConfidenceLevel,
} from "@/lib/market-intelligence/marketConfidence";

const LEVEL_STYLES: Record<MarketConfidenceLevel, string> = {
  high: "border-slate-400/30 bg-slate-500/8 text-slate-100",
  medium: "border-slate-400/25 bg-slate-500/5 text-slate-200/90",
  exploratory: "border-border/70 bg-muted/30 text-muted-foreground",
};

interface MarketConfidenceBadgeProps {
  level: MarketConfidenceLevel;
  className?: string;
  /** Show one-line microcopy beneath the badge. */
  showMicrocopy?: boolean;
}

/** Subtle Apple-grade confidence indicator — non-alarmist, mobile-safe. */
export function MarketConfidenceBadge({
  level,
  className,
  showMicrocopy = false,
}: MarketConfidenceBadgeProps) {
  return (
    <div className={cn("inline-flex max-w-full min-w-0 flex-col gap-0.5", className)}>
      <span
        className={cn(
          "inline-flex max-w-full shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium leading-snug tracking-wide",
          LEVEL_STYLES[level],
        )}
      >
        {t(marketConfidenceLabelKey(level))}
      </span>
      {showMicrocopy && (
        <span className="text-[10px] leading-snug text-muted-foreground">
          {t(marketConfidenceMicrocopyKey(level))}
        </span>
      )}
    </div>
  );
}

interface MarketTrustHeaderProps {
  confidence: MarketConfidenceLevel | null;
  className?: string;
  children?: React.ReactNode;
}

/** Compact row: optional slot + confidence badge with microcopy. */
export function MarketTrustHeader({ confidence, className, children }: MarketTrustHeaderProps) {
  if (!confidence) return children ? <div className={className}>{children}</div> : null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-start gap-2 sm:items-center",
        className,
      )}
    >
      {children}
      <MarketConfidenceBadge level={confidence} showMicrocopy className="min-w-0 flex-1 sm:flex-initial" />
    </div>
  );
}
