// Premium pricing card used by the Pricing page.
// Pure presentational — action handling lives in the parent (PricingPage).

import { Check, X, Crown, Zap, Sparkles, Gem } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import type { PaymentPlan } from "@/config/payments";

interface PricingCardProps {
  plan: PaymentPlan;
  comingSoon: boolean;
  isCurrent?: boolean;
  onAction: (plan: PaymentPlan) => void;
}

const ICONS: Record<string, React.ReactNode> = {
  free: <Sparkles className="h-4 w-4" />,
  pro_monthly: <Zap className="h-4 w-4" />,
  pro_yearly: <Crown className="h-4 w-4" />,
  premium_monthly: <Crown className="h-4 w-4" />,
  premium_yearly: <Crown className="h-4 w-4" />,
  lifetime: <Gem className="h-4 w-4" />,
};

export function PricingCard({ plan, comingSoon, isCurrent, onAction }: PricingCardProps) {
  const isFree = plan.id === "free";
  const isLocked = !isFree && comingSoon;

  return (
    <div
      className={cn(
        "relative rounded-2xl border p-6 flex flex-col transition-all",
        plan.highlight
          ? "border-primary bg-gradient-to-b from-primary/10 to-transparent shadow-[0_0_40px_-12px_hsl(var(--primary)/0.4)]"
          : plan.premium
          ? "border-amber-500/40 bg-gradient-to-b from-amber-500/5 to-transparent"
          : "border-border bg-card",
      )}
    >
      {plan.badge && (
        <span
          className={cn(
            "absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold whitespace-nowrap",
            plan.highlight
              ? "bg-primary text-primary-foreground"
              : plan.premium
              ? "bg-amber-500 text-amber-950"
              : "bg-foreground text-background",
          )}
        >
          {plan.badge}
        </span>
      )}

      {isCurrent && (
        <span className="absolute top-3 right-3 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-bold border border-emerald-500/30">
          {t("pricing_plan_active")}
        </span>
      )}

      <div className="flex items-center gap-2 mb-1">
        {ICONS[plan.id]}
        <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4 min-h-[2.25rem]">{plan.description}</p>

      <div className="mb-5">
        <span className="text-3xl font-black text-foreground">{plan.price}</span>
        <span className="text-xs text-muted-foreground ml-1">{plan.period}</span>
      </div>

      <ul className="space-y-2 mb-6 flex-1">
        {plan.features.map((f, i) => (
          <li key={`stable-${i}`} className="flex items-start gap-2 text-xs">
            {f.included ? (
              <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
            ) : (
              <X className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
            )}
            <span className={cn(f.included ? "text-foreground/90" : "text-muted-foreground/60")}>
              {f.label}
            </span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => onAction(plan)}
        disabled={isCurrent}
        className={cn(
          "w-full text-center px-4 py-2.5 rounded-lg text-sm font-bold transition-all",
          isCurrent
            ? "bg-muted text-muted-foreground cursor-default"
            : isLocked
            ? "bg-muted/60 text-foreground/80 hover:bg-muted border border-border hover:scale-[1.02]"
            : plan.highlight
            ? "bg-primary text-primary-foreground shadow-md hover:scale-[1.02]"
            : plan.premium
            ? "bg-gradient-to-r from-amber-500 to-amber-400 text-amber-950 shadow-md hover:scale-[1.02]"
            : "bg-foreground/90 text-background hover:scale-[1.02]",
        )}
      >
        {isCurrent ? t("pricing_plan_current") : isLocked ? t("pricing_join_waitlist") : plan.ctaLabel}
      </button>
    </div>
  );
}
