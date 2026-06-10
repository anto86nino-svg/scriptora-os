import { useNavigate } from "react-router-dom";
import { CreditCard, History, Plus, AlertCircle } from "lucide-react";
import { useCreditWallet } from "@/hooks/useCreditWallet";
import { formatCredits } from "@/lib/credit-economy";
import { getPurchaseCtaLabel } from "@/lib/billing/creditUx";
import { creditSimulationBadge } from "@/lib/billing/devMode";
import { cn } from "@/lib/utils";

interface GlobalCreditBarProps {
  variant?: "bar" | "inline" | "compact";
  className?: string;
}

export function GlobalCreditBar({ variant = "bar", className }: GlobalCreditBarProps) {
  const navigate = useNavigate();
  const { wallet, analytics, lowCreditHint, lowCreditLevel } = useCreditWallet();
  const simulationBadge = creditSimulationBadge();
  const purchaseLabel = getPurchaseCtaLabel();

  const goUsage = (focus?: "purchase" | "history") => {
    navigate(focus ? `/usage?focus=${focus}` : "/usage");
  };

  if (variant === "compact") {
    return (
      <div className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-md safe-area-pb",
        className,
      )}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2 text-[11px]">
            <CreditCard className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="font-bold tabular-nums text-foreground">{formatCredits(wallet.balance)}</span>
            <span className="truncate text-muted-foreground">{analytics.planLabel}</span>
            {simulationBadge && (
              <span className="shrink-0 rounded-full border border-amber-500/50 bg-amber-500/15 px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-amber-200">
                SIM
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => goUsage("purchase")} className="rounded-lg bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground">
              <Plus className="h-3 w-3" />
            </button>
            <button type="button" onClick={() => goUsage()} className="rounded-lg border border-border px-2.5 py-1 text-[10px] text-muted-foreground">
              <History className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.06] px-2.5 py-1.5 text-xs">
          <CreditCard className="h-3.5 w-3.5 text-sky-300" />
          <span className="text-muted-foreground">Crediti:</span>
          <span className="font-semibold tabular-nums text-foreground">{formatCredits(wallet.balance)}</span>
        </div>
        <span className="hidden text-[10px] text-muted-foreground sm:inline">Piano: {analytics.planLabel}</span>
        {simulationBadge && (
          <span className="rounded-full border border-amber-400/50 bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold tracking-widest text-amber-200">
            {simulationBadge}
          </span>
        )}
        {lowCreditHint && (
          <span className={cn(
            "text-[10px] font-medium",
            lowCreditLevel === "critical" ? "text-amber-300" : "text-amber-200/80",
          )}>
            {lowCreditHint}
          </span>
        )}
        <button type="button" onClick={() => goUsage("purchase")} className="ios-toolbar-button h-7 px-2 text-[10px] font-semibold">
          <Plus className="h-3 w-3" /> {purchaseLabel}
        </button>
        <button type="button" onClick={() => goUsage("history")} className="ios-toolbar-button h-7 px-2 text-[10px]">
          <History className="h-3 w-3" /> Storico
        </button>
      </div>
    );
  }

  return (
    <div className={cn(
      "sticky top-0 z-[25] border-b border-border/50 bg-background/90 backdrop-blur-md",
      className,
    )}>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/80 px-2.5 py-1.5">
            <CreditCard className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">💳 Crediti:</span>
            <span className="font-bold tabular-nums text-foreground">{formatCredits(wallet.balance)}</span>
          </div>
          <span className="text-muted-foreground">Piano: <span className="font-medium text-foreground">{analytics.planLabel}</span></span>
          {simulationBadge && (
            <span className="rounded-full border-2 border-amber-500/60 bg-amber-500/20 px-2.5 py-0.5 text-[9px] font-bold tracking-[0.18em] text-amber-100">
              {simulationBadge}
            </span>
          )}
          {lowCreditHint && (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-500/90">
              <AlertCircle className="h-3 w-3" />
              {lowCreditHint}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => goUsage("purchase")}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-[11px] font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> {purchaseLabel}
          </button>
          <button
            type="button"
            onClick={() => goUsage("history")}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40"
          >
            <History className="h-3.5 w-3.5" /> Storico
          </button>
        </div>
      </div>
    </div>
  );
}
