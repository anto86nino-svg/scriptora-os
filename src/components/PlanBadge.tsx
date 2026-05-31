// PlanBadge — visible plan indicator in TopBar.
// Shows current tier (FREE / PRO / PREMIUM) + dynamic usage hint. Click opens UpgradeModal.

import { useState } from "react";
import { Crown, Zap, Sparkles, FlaskConical, LogOut, Loader2 } from "lucide-react";
import { usePlan, useBooksThisMonth, PLAN_LIMITS, setPlan } from "@/lib/plan";
import { UpgradeModal } from "@/components/UpgradeModal";
import { t } from "@/lib/i18n";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

interface PlanBadgeProps {
  /** Optional: token usage on current project (drives free-plan hint when present). */
  tokensUsed?: number;
}

export function PlanBadge({ tokensUsed }: PlanBadgeProps) {
  const { plan, isDev, refresh } = usePlan();
  const booksThisMonth = useBooksThisMonth();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [exiting, setExiting] = useState(false);

  const tier = plan;

  const tierLabel =
    tier === "beta"
      ? t("editorial_preview_label")
      : tier === "premium"
        ? "Premium"
        : tier === "pro"
          ? "Pro"
          : "Free";

  const styles =
    tier === "premium"
      ? "bg-gradient-to-r from-amber-500/20 to-amber-300/10 text-amber-500 border-amber-500/40 shadow-[0_0_12px_-2px_hsl(45_93%_55%/0.4)]"
      : tier === "pro"
      ? "bg-primary/15 text-primary border-primary/40"
      : tier === "beta"
      ? "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/40"
      : "bg-muted text-muted-foreground border-border";

  const Icon =
    tier === "premium" ? Crown :
    tier === "pro" ? Zap :
    tier === "beta" ? FlaskConical :
    Sparkles;

  // Sub-text hint
  let hint = "";
  if (tier === "free") {
    const max = PLAN_LIMITS.free.maxTokensPerBook!;
    if (typeof tokensUsed === "number") {
      hint = `${formatTokens(tokensUsed)} / ${formatTokens(max)} tokens`;
    } else {
      const remaining = Math.max(0, 1 - booksThisMonth);
      hint = `${remaining} book remaining`;
    }
  } else if (tier === "beta") {
    hint = `${booksThisMonth} / 3 books`;
  } else if (tier === "pro") {
    hint = `${booksThisMonth} / 10 books`;
  } else {
    hint = "Unlimited";
  }

  const handleExitBeta = async () => {
    if (exiting) return;
    setExiting(true);
    try {
      await setPlan("free");
      toast.success("Sei tornato al piano Free");
      setPopoverOpen(false);
      refresh();
    } catch {
      toast.error("Impossibile uscire dalla beta. Riprova.");
    } finally {
      setExiting(false);
    }
  };

  const badgeButton = (
    <button
      onClick={() => {
        if (isDev) return;
        if (tier === "beta") setPopoverOpen((o) => !o);
        else if (tier !== "premium") setShowUpgrade(true);
      }}
      disabled={isDev}
      title={
        isDev
          ? "Developer mode active"
          : tier === "beta"
          ? `${t("editorial_preview_label")} · clicca per opzioni`
          : tier === "premium"
          ? "You're on Premium"
          : "Click to upgrade"
      }
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider shrink-0 transition-all hover:scale-[1.03] disabled:cursor-default disabled:hover:scale-100 ${styles}`}
    >
      <Icon className="h-3 w-3" />
      <div className="flex flex-col items-start leading-tight">
        <span>{tierLabel}</span>
        <span className="text-[8px] font-normal opacity-80 normal-case tracking-normal">{hint}</span>
      </div>
    </button>
  );

  return (
    <>
      {tier === "beta" && !isDev ? (
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>{badgeButton}</PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-fuchsia-400" />
              <div>
                <p className="text-xs font-semibold text-foreground">{t("editorial_preview_label")}</p>
                <p className="text-[10px] text-muted-foreground">{hint} · export sbloccato</p>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground leading-snug">
              Stai usando l&apos;{t("editorial_preview_label").toLowerCase()}. Puoi tornare al piano Free in qualsiasi momento — i tuoi libri restano salvati.
            </div>
            <button
              onClick={handleExitBeta}
              disabled={exiting}
              className="w-full h-8 rounded-md border border-border bg-muted/40 text-foreground text-[11px] font-medium hover:bg-muted/60 transition-colors inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {exiting ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
              {exiting ? "Uscita in corso…" : "Torna al piano Free"}
            </button>
            <button
              onClick={() => { setPopoverOpen(false); setShowUpgrade(true); }}
              className="w-full h-8 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-colors"
            >
              Passa a Pro o Premium
            </button>
          </PopoverContent>
        </Popover>
      ) : (
        badgeButton
      )}
      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        reason={tier === "free" ? "export" : "dominate"}
        currentPlan={tier}
      />
    </>
  );
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
}
