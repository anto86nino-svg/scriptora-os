// PlansSection — sezione "Piani" ben visibile in basso alla Dashboard.
// Mostra Free / Pro / Premium con cosa puoi fare con ciascun piano.

import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Crown, Zap, Sparkles, ArrowRight, Terminal } from "lucide-react";
import { PLAN_PRICING, PlanTier, usePlan } from "@/lib/plan";
import { paymentsConfig, resolvePlanAction, type PaymentPlan } from "@/config/payments";
import { ComingSoonPaymentModal } from "@/components/payments/ComingSoonPaymentModal";
import { setDevPlanOverride } from "@/lib/dev-plan-override";
import { toast } from "sonner";
import { t, tt, useUILanguage } from "@/lib/i18n";

interface PlanInfo {
  tier: PlanTier;
  name: string;
  icon: React.ReactNode;
  tagline: string;
  features: string[];
  cta: string;
  /** Maps to a plan id in paymentsConfig (drives env-aware checkout). */
  paymentPlanId?: PaymentPlan["id"];
  /** Used only for the Free tier (in-app navigation). */
  internalHref?: string;
  badge?: string;
  highlight?: boolean;
  premium?: boolean;
}

const PLANS: PlanInfo[] = [
  {
    tier: "free",
    name: "Free",
    icon: <Sparkles className="h-4 w-4" />,
    tagline: "Try Scriptora and write your first book.",
    features: [
      "1 active book",
      "Up to 10,000 words",
      "Core book creation",
      "Limited chapter generation",
      "Premium tools preview",
      "No live market intelligence",
      "No export",
    ],
    cta: "Start free",
    internalHref: "/dashboard",
  },
  {
    tier: "pro",
    name: "Pro",
    icon: <Zap className="h-4 w-4" />,
    tagline: "For authors who write, refine, and publish for real.",
    features: [
      "10 books per month",
      "Up to 80,000 words per book",
      "Full Book Engine",
      "Advanced chapters, rewrites & polish",
      "EPUB, PDF, DOCX export",
      "KDP market analysis (idea, niche, promise)",
      "Title Intelligence (base)",
      "Limited editorial trends",
      "Cover Studio (templates)",
      "In-app & email support",
    ],
    cta: "Upgrade to Pro",
    paymentPlanId: "pro_monthly",
    badge: "Most popular",
    highlight: true,
  },
  {
    tier: "premium",
    name: "Premium",
    icon: <Crown className="h-4 w-4" />,
    tagline: "For authors who want to dominate the market.",
    features: [
      "Unlimited books (fair use)",
      "Up to 200,000 words per book",
      "Full Dominate Mode",
      "Live market intelligence",
      "Advanced KDP analysis",
      "Title Domination (advanced)",
      "Editorial trends from public signals",
      "Commercial potential estimates",
      "Amazon packaging: blurb, keywords & categories",
      "Premium flow for long works",
      "Dominate Mode with advanced QA",
      "All export formats",
    ],
    cta: "Unlock Premium",
    paymentPlanId: "premium_monthly",
    badge: "Max Power",
    premium: true,
  },
];

export function PlansSection() {
  useUILanguage();
  const { plan: currentPlan, isDev } = usePlan();
  // In dev mode `currentPlan` already reflects the simulated tier (see usePlan + dev-plan-override).
  const activeTier: PlanTier = currentPlan;
  const [comingSoonName, setComingSoonName] = useState<string | null>(null);

  const handlePaidClick = (planId: PaymentPlan["id"], fallbackName: string) => {
    const plan = paymentsConfig.plans.find((p) => p.id === planId);
    if (!plan) {
      setComingSoonName(fallbackName);
      return;
    }
    const action = resolvePlanAction(plan);
    if (action.kind === "external") {
      window.open(action.url, "_blank", "noopener,noreferrer");
      return;
    }
    setComingSoonName(plan.name);
  };

  // Dev-only: clicking a card simulates that tier instantly. Public users never reach this.
  const handleDevSimulate = (tier: PlanTier) => {
    setDevPlanOverride(tier);
    toast.success(tt("dev_plan_toast", { plan: tier.toUpperCase() }));
  };

  return (
    <section className="mt-12 mb-6">
      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{t("plans_section_title")}</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {t("plans_section_subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((p) => {
          const isActive = activeTier === p.tier;
          return (
            <div
              key={p.tier}
              className={`relative rounded-xl border p-5 flex flex-col transition-all ${
                p.highlight
                  ? "border-primary bg-gradient-to-b from-primary/10 to-transparent shadow-[0_0_28px_-10px_hsl(var(--primary)/0.4)]"
                  : p.premium
                  ? "border-amber-500/40 bg-gradient-to-b from-amber-500/5 to-transparent"
                  : "border-border bg-card"
              }`}
            >
              {p.badge && (
                <span
                  className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${
                    p.highlight ? "bg-primary text-primary-foreground" : "bg-amber-500 text-amber-950"
                  }`}
                >
                  {p.badge}
                </span>
              )}

              {isActive && (
                <span className="absolute top-3 right-3 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-bold border border-emerald-500/30">
                  {t("pricing_plan_active")}
                </span>
              )}

              <div className="flex items-center gap-1.5 mb-1">
                {p.icon}
                <h3 className="text-base font-bold text-foreground">{p.name}</h3>
              </div>
              <p className="text-[11px] text-muted-foreground mb-3">{p.tagline}</p>

              <div className="mb-4">
                <span className="text-2xl font-black text-foreground">{PLAN_PRICING[p.tier].price}</span>
                <span className="text-xs text-muted-foreground">{PLAN_PRICING[p.tier].period}</span>
              </div>

              <ul className="space-y-1.5 mb-4 flex-1">
                {p.features.map((f, i) => (
                  <li key={`stable-${i}`} className="flex items-start gap-1.5 text-xs text-foreground/85">
                    <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
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
                  onClick={() => handleDevSimulate(p.tier)}
                  title="Solo Dev Mode: simula questo piano"
                  className={`text-center px-3 py-2 rounded-lg text-xs font-bold transition-all hover:scale-[1.02] inline-flex items-center justify-center gap-1.5 ${
                    p.highlight
                      ? "bg-primary text-primary-foreground shadow-md"
                      : p.premium
                      ? "bg-gradient-to-r from-amber-500 to-amber-400 text-amber-950 shadow-md"
                      : "bg-foreground/90 text-background"
                  }`}
                >
                  <Terminal className="h-3 w-3" />
                  {tt("plans_section_simulate", { plan: p.name })}
                </button>
              ) : p.paymentPlanId ? (
                <button
                  type="button"
                  onClick={() => handlePaidClick(p.paymentPlanId!, p.name)}
                  className={`text-center px-3 py-2 rounded-lg text-xs font-bold transition-all hover:scale-[1.02] ${
                    p.highlight
                      ? "bg-primary text-primary-foreground shadow-md"
                      : p.premium
                      ? "bg-gradient-to-r from-amber-500 to-amber-400 text-amber-950 shadow-md"
                      : "bg-foreground/90 text-background"
                  }`}
                >
                  {p.cta}
                </button>
              ) : (
                <Link
                  to={p.internalHref ?? "/dashboard"}
                  className="text-center px-3 py-2 rounded-lg text-xs font-bold bg-foreground/90 text-background transition-all hover:scale-[1.02]"
                >
                  {p.cta}
                </Link>
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

      <ComingSoonPaymentModal
        open={!!comingSoonName}
        onClose={() => setComingSoonName(null)}
        planName={comingSoonName ?? undefined}
      />
    </section>
  );
}
