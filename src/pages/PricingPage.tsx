import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  paymentsConfig,
  resolvePlanAction,
  type PaymentPlan,
} from "@/config/payments";
import { useSubscription } from "@/hooks/useSubscription";
import { PricingCard } from "@/components/payments/PricingCard";
import { PaymentStatusBanner } from "@/components/payments/PaymentStatusBanner";
import { ComingSoonPaymentModal } from "@/components/payments/ComingSoonPaymentModal";
import { t, useUILanguage } from "@/lib/i18n";
import { toast } from "sonner";

const FAQ_ITEMS = [
  { q: "pricing_faq_1_q", a: "pricing_faq_1_a" },
  { q: "pricing_faq_2_q", a: "pricing_faq_2_a" },
  { q: "pricing_faq_3_q", a: "pricing_faq_3_a" },
  { q: "pricing_faq_4_q", a: "pricing_faq_4_a" },
] as const;

export default function PricingPage() {
  useUILanguage();
  const { currentPlan } = useSubscription();
  const [comingSoonPlan, setComingSoonPlan] = useState<PaymentPlan | null>(null);

  const handleAction = (plan: PaymentPlan) => {
    const action = resolvePlanAction(plan);
    switch (action.kind) {
      case "free":
        window.location.href = "/dashboard";
        return;
      case "external":
        window.open(action.url, "_blank", "noopener,noreferrer");
        return;
      case "missing_link":
        toast.error(t("pricing_payment_not_configured"), {
          description: t("pricing_payment_not_configured_desc"),
        });
        return;
      case "coming_soon":
      default:
        setComingSoonPlan(plan);
        return;
    }
  };

  const isCurrentPlan = (planId: string) => {
    if (planId === "free") return currentPlan === "free";
    if (planId === "pro_monthly" || planId === "pro_yearly") return currentPlan === "pro";
    if (planId === "premium_monthly" || planId === "premium_yearly" || planId === "lifetime") {
      return currentPlan === "lifetime";
    }
    return false;
  };

  const PRIMARY_IDS = ["free", "pro_monthly", "pro_yearly", "premium_monthly"] as const;
  const primaryPlans = paymentsConfig.plans.filter((p) => (PRIMARY_IDS as readonly string[]).includes(p.id));
  const extraPlans = paymentsConfig.plans.filter((p) => !(PRIMARY_IDS as readonly string[]).includes(p.id));

  return (
    <div className="scriptora-feature-page bg-background text-foreground">
      <header className="shrink-0 border-b border-border bg-card/40 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> {t("back")}
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("pricing_page_label")}</span>
        </div>
      </header>

      <main className="scriptora-feature-scroll mx-auto max-w-6xl px-6 py-14">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            {t("pricing_hero_badge")}
          </div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            {t("pricing_hero_title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {t("pricing_hero_subtitle")}
          </p>
        </div>

        <PaymentStatusBanner />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {primaryPlans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              comingSoon={paymentsConfig.mode === "coming_soon" || !paymentsConfig.enabled}
              isCurrent={isCurrentPlan(plan.id)}
              onAction={handleAction}
            />
          ))}
        </div>

        {extraPlans.length > 0 && (
          <div className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-5 md:grid-cols-2">
            {extraPlans.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                comingSoon={paymentsConfig.mode === "coming_soon" || !paymentsConfig.enabled}
                isCurrent={isCurrentPlan(plan.id)}
                onAction={handleAction}
              />
            ))}
          </div>
        )}

        <p className="mt-10 text-center text-xs text-muted-foreground">
          {t("pricing_footer_note")}
        </p>

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

      <ComingSoonPaymentModal
        open={!!comingSoonPlan}
        onClose={() => setComingSoonPlan(null)}
        planName={comingSoonPlan?.name}
        showPricingLink={false}
      />
    </div>
  );
}
