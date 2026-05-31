import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Coins } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { PaymentStatusBanner } from "@/components/payments/PaymentStatusBanner";
import { CommercialPricingCard } from "@/components/billing/CommercialPricingCard";
import { PremiumActivationNoticeDialog } from "@/components/billing/PremiumActivationNoticeDialog";
import { CheckoutReturnBanner } from "@/components/billing/CheckoutReturnBanner";
import {
  COMMERCIAL_PLANS,
  CREDIT_PACKS,
  creditsToPackId,
  mapPlanTierToScriptoraPlan,
  redirectToStripeCheckout,
} from "@/lib/billing";
import type { CommercialPlanOffer } from "@/lib/billing/commercialPlans";
import { t, useUILanguage } from "@/lib/i18n";
import { MissingRequirementCard } from "@/components/MissingRequirementCard";
import { buildRequirement } from "@/lib/scriptora-requirement-gate";
import type { FeatureKey } from "@/lib/subscription";

const FAQ_ITEMS = [
  { q: "pricing_faq_credits_q", a: "pricing_faq_credits_a" },
  { q: "pricing_faq_1_q", a: "pricing_faq_1_a" },
  { q: "pricing_faq_2_q", a: "pricing_faq_2_a" },
  { q: "pricing_faq_3_q", a: "pricing_faq_3_a" },
] as const;

export default function PricingPage() {
  useUILanguage();
  const location = useLocation();
  const blockedFeature = (location.state as { requirementFeature?: FeatureKey } | null)?.requirementFeature;
  const { currentPlan } = useSubscription();
  const scriptoraPlan = mapPlanTierToScriptoraPlan(currentPlan);
  const [activationOpen, setActivationOpen] = useState(false);
  const [activationVariant, setActivationVariant] = useState<"plan" | "credits">("plan");
  const [checkoutBusy, setCheckoutBusy] = useState<string | null>(null);

  const isCurrentCommercialPlan = (planId: CommercialPlanOffer["id"]) => planId === scriptoraPlan;

  const openNotConfigured = (variant: "plan" | "credits") => {
    setActivationVariant(variant);
    setActivationOpen(true);
  };

  const handlePlanSelect = async (plan: CommercialPlanOffer) => {
    if (plan.id === "free") return;

    setCheckoutBusy(plan.id);
    try {
      const outcome = await redirectToStripeCheckout({
        type: "subscription",
        planKey: plan.id,
      });
      if (outcome === "not_configured") openNotConfigured("plan");
    } finally {
      setCheckoutBusy(null);
    }
  };

  const handleCreditPack = async (credits: number) => {
    setCheckoutBusy(`pack-${credits}`);
    try {
      const outcome = await redirectToStripeCheckout({
        type: "credit_pack",
        packId: creditsToPackId(credits),
      });
      if (outcome === "not_configured") openNotConfigured("credits");
    } finally {
      setCheckoutBusy(null);
    }
  };

  return (
    <div className="scriptora-feature-page bg-background text-foreground">
      <header className="shrink-0 border-b border-border bg-card/40 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {t("back")}
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("pricing_page_label")}
          </span>
        </div>
      </header>

      <main className="scriptora-feature-scroll mx-auto max-w-6xl px-6 py-14">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            {t("pricing_hero_badge")}
          </div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{t("pricing_hero_title")}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {t("pricing_credits_monthly_note")}
          </p>
        </div>

        <CheckoutReturnBanner />
        <PaymentStatusBanner />

        {blockedFeature && (
          <div className="mb-8">
            <MissingRequirementCard
              payload={buildRequirement("plan_required", { feature: blockedFeature })}
              onPrimary={() => {
                document.getElementById("pricing-plans")?.scrollIntoView({ behavior: "smooth" });
              }}
              compact
            />
          </div>
        )}

        {checkoutBusy && (
          <p className="mb-6 text-center text-xs text-muted-foreground">{t("checkout_redirecting")}</p>
        )}

        <div
          id="pricing-plans"
          className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        >
          {COMMERCIAL_PLANS.map((plan) => (
            <CommercialPricingCard
              key={plan.id}
              plan={plan}
              isCurrent={isCurrentCommercialPlan(plan.id)}
              onSelect={handlePlanSelect}
              disabled={checkoutBusy !== null}
            />
          ))}
        </div>

        <section id="credit-packs" className="mx-auto mt-16 max-w-4xl">
          <div className="mb-6 text-center">
            <div className="mb-2 inline-flex items-center gap-1.5 text-primary">
              <Coins className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">{t("pricing_credit_packs_title")}</span>
            </div>
            <h2 className="text-2xl font-bold">{t("pricing_credit_packs_heading")}</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
              {t("pricing_credit_packs_subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CREDIT_PACKS.map((pack) => (
              <div
                key={pack.credits}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
              >
                <div>
                  <p className="text-sm font-bold text-foreground">{pack.label}</p>
                  <p className="text-xs text-muted-foreground">
                    €{pack.priceEur.toFixed(2).replace(".", ",")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCreditPack(pack.credits)}
                  disabled={checkoutBusy !== null}
                  className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
                >
                  {t("pricing_buy_credits")}
                </button>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-10 text-center text-xs text-muted-foreground">{t("pricing_footer_note")}</p>

        <section className="mx-auto mt-20 max-w-3xl space-y-6">
          <h2 className="text-center text-2xl font-bold">{t("pricing_faq_title")}</h2>
          {FAQ_ITEMS.map((item) => (
            <div key={item.q} className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-1.5 text-sm font-semibold">{t(item.q)}</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">{t(item.a)}</p>
            </div>
          ))}
        </section>
      </main>

      <PremiumActivationNoticeDialog
        open={activationOpen}
        onClose={() => setActivationOpen(false)}
        variant={activationVariant}
      />
    </div>
  );
}
