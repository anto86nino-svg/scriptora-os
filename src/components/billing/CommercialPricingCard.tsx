import { Check, Crown, Sparkles, Zap, Gem, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import type { CommercialPlanOffer } from "@/lib/billing/commercialPlans";

interface CommercialPricingCardProps {
  plan: CommercialPlanOffer;
  isCurrent?: boolean;
  onSelect: (plan: CommercialPlanOffer) => void;
  disabled?: boolean;
}

const ICONS: Record<CommercialPlanOffer["id"], React.ReactNode> = {
  free: <Sparkles className="h-4 w-4" />,
  starter: <Zap className="h-4 w-4" />,
  pro: <Crown className="h-4 w-4" />,
  studio: <Gem className="h-4 w-4" />,
  publisher: <Building2 className="h-4 w-4" />,
};

function formatPrice(priceEur: number | null): string {
  if (priceEur == null || priceEur === 0) return "€0";
  return `€${priceEur.toFixed(2).replace(".", ",")}`;
}

export function CommercialPricingCard({ plan, isCurrent, onSelect, disabled }: CommercialPricingCardProps) {
  const isFree = plan.id === "free";

  return (
    <div
      className={cn(
        "relative flex h-full flex-col rounded-2xl border p-6 transition-all",
        plan.recommended
          ? "border-primary bg-gradient-to-b from-primary/10 to-transparent shadow-[0_0_40px_-12px_hsl(var(--primary)/0.4)]"
          : plan.id === "studio"
            ? "border-amber-500/35 bg-gradient-to-b from-amber-500/5 to-transparent"
            : "border-border bg-card",
      )}
    >
      {plan.recommended && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
          {t("commercial_plan_recommended")}
        </span>
      )}

      {isCurrent && (
        <span className="absolute right-3 top-3 rounded border border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-500">
          {t("pricing_plan_active")}
        </span>
      )}

      <div className="mb-1 flex items-center gap-2">
        {ICONS[plan.id]}
        <h3 className="text-base font-bold text-foreground">{t(plan.nameKey)}</h3>
      </div>
      <p className="mb-4 min-h-[2.25rem] text-xs text-muted-foreground">{t(plan.taglineKey)}</p>

      <div className="mb-4">
        <span className="text-3xl font-black text-foreground">{formatPrice(plan.priceEur)}</span>
        {!isFree && (
          <span className="ml-1 text-xs text-muted-foreground">{t(plan.periodKey)}</span>
        )}
      </div>

      <p className="mb-4 text-xs font-semibold text-primary">
        {isFree
          ? t("commercial_plan_credits_initial", { count: plan.monthlyCredits })
          : t("commercial_plan_credits_included", { count: plan.monthlyCredits })}
      </p>

      <ul className="mb-6 flex-1 space-y-2">
        {plan.featureKeys.map((key) => (
          <li key={key} className="flex items-start gap-2 text-xs">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="text-foreground/90">{t(key)}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onSelect(plan)}
        disabled={isCurrent || disabled}
        className={cn(
          "w-full rounded-lg px-4 py-2.5 text-center text-sm font-bold transition-all",
          isCurrent
            ? "cursor-default bg-muted text-muted-foreground"
            : plan.recommended
              ? "bg-primary text-primary-foreground shadow-md hover:scale-[1.02] hover:bg-primary/90"
              : isFree
                ? "border border-border bg-muted/60 text-foreground hover:scale-[1.02] hover:bg-muted"
                : "bg-foreground/90 text-background hover:scale-[1.02]",
        )}
      >
        {isCurrent ? t("pricing_plan_current") : isFree ? t("commercial_plan_cta_free") : t("commercial_plan_cta_upgrade")}
      </button>
    </div>
  );
}
