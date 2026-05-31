// PlansSection — commercial plans snapshot (aligned with PricingPage / COMMERCIAL_PLANS).

import { Link } from "react-router-dom";
import { Check, Crown, Zap, Sparkles, ArrowRight, Terminal } from "lucide-react";
import { PlanTier, usePlan } from "@/lib/plan";
import { COMMERCIAL_PLANS } from "@/lib/billing/commercialPlans";
import { mapPlanTierToScriptoraPlan } from "@/lib/billing";
import { showPremiumActivationNotice } from "@/lib/billing/premiumActivation";
import type { ScriptoraPlan } from "@/lib/billing/creditPolicy";
import { setDevPlanOverride } from "@/lib/dev-plan-override";
import { toast } from "sonner";
import { t, tt, useUILanguage } from "@/lib/i18n";

function formatCommercialPrice(priceEur: number | null): string {
  if (priceEur == null || priceEur === 0) return "€0";
  return `€${priceEur.toFixed(2).replace(".", ",")}`;
}

function commercialToDevTier(id: ScriptoraPlan): PlanTier {
  switch (id) {
    case "free":
      return "free";
    case "starter":
      return "beta";
    case "pro":
      return "pro";
    case "studio":
    case "publisher":
      return "premium";
    default:
      return "free";
  }
}

export function PlansSection() {
  useUILanguage();
  const { plan: currentPlan, isDev } = usePlan();
  const activeCommercialPlan = mapPlanTierToScriptoraPlan(currentPlan);

  const handleDevSimulate = (id: ScriptoraPlan) => {
    setDevPlanOverride(commercialToDevTier(id));
    toast.success(tt("dev_plan_toast", { plan: t(COMMERCIAL_PLANS.find((p) => p.id === id)!.nameKey) }));
  };

  const handleSelect = (id: ScriptoraPlan) => {
    if (id === "free") return;
    showPremiumActivationNotice("plan");
  };

  return (
    <section className="mt-12 mb-6">
      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{t("plans_section_title")}</h2>
        <p className="text-xs text-muted-foreground mt-1">{t("plans_section_subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {COMMERCIAL_PLANS.map((p) => {
          const isActive = activeCommercialPlan === p.id;
          const isPro = p.id === "pro";
          const isStudio = p.id === "studio";
          const Icon =
            p.id === "free" ? Sparkles : p.id === "publisher" || isStudio ? Crown : Zap;

          return (
            <div
              key={p.id}
              className={`relative rounded-xl border p-5 flex flex-col transition-all ${
                isPro
                  ? "border-primary bg-gradient-to-b from-primary/10 to-transparent shadow-[0_0_28px_-10px_hsl(var(--primary)/0.4)]"
                  : isStudio
                    ? "border-amber-500/40 bg-gradient-to-b from-amber-500/5 to-transparent"
                    : "border-border bg-card"
              }`}
            >
              {p.recommended && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold bg-primary text-primary-foreground">
                  {t("commercial_plan_recommended")}
                </span>
              )}

              {isActive && (
                <span className="absolute top-3 right-3 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-bold border border-emerald-500/30">
                  {t("pricing_plan_active")}
                </span>
              )}

              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="h-4 w-4" />
                <h3 className="text-base font-bold text-foreground">{t(p.nameKey)}</h3>
              </div>
              <p className="text-[11px] text-muted-foreground mb-3">{t(p.taglineKey)}</p>

              <div className="mb-2">
                <span className="text-2xl font-black text-foreground">{formatCommercialPrice(p.priceEur)}</span>
                {p.priceEur !== 0 && (
                  <span className="text-xs text-muted-foreground">{t(p.periodKey)}</span>
                )}
              </div>
              <p className="text-[11px] font-semibold text-primary mb-3">
                {p.id === "free"
                  ? t("commercial_plan_credits_initial", { count: p.monthlyCredits })
                  : t("commercial_plan_credits_included", { count: p.monthlyCredits })}
              </p>

              <ul className="space-y-1.5 mb-4 flex-1">
                {p.featureKeys.slice(0, 4).map((key) => (
                  <li key={key} className="flex items-start gap-1.5 text-xs text-foreground/85">
                    <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{t(key)}</span>
                  </li>
                ))}
              </ul>

              {isActive ? (
                <div className="text-center px-3 py-2 rounded-lg text-xs font-semibold bg-muted/50 text-muted-foreground">
                  {t("pricing_plan_current")}
                </div>
              ) : isDev ? (
                <button
                  type="button"
                  onClick={() => handleDevSimulate(p.id)}
                  title="Solo Dev Mode: simula questo piano"
                  className={`text-center px-3 py-2 rounded-lg text-xs font-bold transition-all hover:scale-[1.02] inline-flex items-center justify-center gap-1.5 ${
                    isPro
                      ? "bg-primary text-primary-foreground shadow-md"
                      : isStudio
                        ? "bg-gradient-to-r from-amber-500 to-amber-400 text-amber-950 shadow-md"
                        : "bg-foreground/90 text-background"
                  }`}
                >
                  <Terminal className="h-3 w-3" />
                  {tt("plans_section_simulate", { plan: t(p.nameKey) })}
                </button>
              ) : p.id === "free" ? (
                <Link
                  to="/dashboard"
                  className="text-center px-3 py-2 rounded-lg text-xs font-bold bg-foreground/90 text-background transition-all hover:scale-[1.02]"
                >
                  {t("commercial_plan_cta_free")}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSelect(p.id)}
                  className={`text-center px-3 py-2 rounded-lg text-xs font-bold transition-all hover:scale-[1.02] ${
                    isPro
                      ? "bg-primary text-primary-foreground shadow-md"
                      : isStudio
                        ? "bg-gradient-to-r from-amber-500 to-amber-400 text-amber-950 shadow-md"
                        : "bg-foreground/90 text-background"
                  }`}
                >
                  {t("commercial_plan_cta_upgrade")}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {isDev && (
        <p className="text-center text-[10px] text-muted-foreground mt-3 inline-flex items-center justify-center gap-1.5 w-full">
          <Terminal className="h-2.5 w-2.5" />
          {t("plans_section_dev_hint")}
        </p>
      )}

      <div className="text-center mt-5">
        <Link
          to="/pricing"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("plans_section_compare")}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </section>
  );
}
