// Public pricing page — Free / Pro Monthly / Pro Yearly / Lifetime.
// Driven by src/config/payments.ts (env-aware). Defaults to "coming soon" mode:
// Pro CTAs open an elegant modal instead of redirecting to a checkout.

import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { t } from "@/lib/i18n";
import { ArrowLeft } from "lucide-react";
import { isPaymentsLive, paymentsConfig, type PaymentPlan } from "@/config/payments";
import { executePlanAction } from "@/lib/payments/executePlanAction";
import { FeatureStatusBadge } from "@/components/payments/FeatureStatusBadge";
import { usePlan } from "@/lib/plan";
import { PricingCard } from "@/components/payments/PricingCard";
import { PaymentStatusBanner } from "@/components/payments/PaymentStatusBanner";
import { ComingSoonPaymentModal } from "@/components/payments/ComingSoonPaymentModal";
import { toast } from "sonner";

export default function PricingPage() {
  const { plan: legacyPlan } = usePlan();
  const paymentsLive = isPaymentsLive();
  const location = useLocation();
  const navigate = useNavigate();
  const [comingSoonPlan, setComingSoonPlan] = useState<PaymentPlan | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("payment") !== "cancelled") return;
    toast.info(t("payment_cancelled_title"), { description: t("payment_cancelled_desc") });
    navigate(location.pathname, { replace: true });
  }, [location.pathname, location.search, navigate]);

  const handleAction = async (plan: PaymentPlan) => {
    const result = await executePlanAction(plan);
    if (result.showComingSoon) setComingSoonPlan(plan);
  };

  const isCurrentPlan = (planId: string) => {
    if (planId === "free") return legacyPlan === "free";
    if (planId === "pro_monthly" || planId === "pro_yearly") {
      return legacyPlan === "pro" || legacyPlan === "beta";
    }
    if (planId === "premium_monthly" || planId === "premium_yearly" || planId === "lifetime") {
      return legacyPlan === "premium";
    }
    return false;
  };

  // Show the 4 primary plans on the main grid; secondary plans (yearly + lifetime)
  // are listed in a compact footer to keep the hero layout clean.
  const PRIMARY_IDS = ["free", "pro_monthly", "pro_yearly", "premium_monthly"] as const;
  const primaryPlans = paymentsConfig.plans.filter((p) => (PRIMARY_IDS as readonly string[]).includes(p.id));
  const extraPlans = paymentsConfig.plans.filter((p) => !(PRIMARY_IDS as readonly string[]).includes(p.id));

  return (
    <div className="scriptora-feature-page bg-background text-foreground">
      <header className="shrink-0 border-b border-border bg-card/40 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> {t("back")}
          </Link>
          <span className="text-xs font-bold tracking-wider uppercase text-muted-foreground">Scriptora · Pricing</span>
        </div>
      </header>

      <main className="scriptora-feature-scroll mx-auto max-w-6xl px-6 py-14">
        <div className="text-center mb-10">
          <div className="mb-4 flex justify-center">
            <FeatureStatusBadge featureId="payments" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
            {isPaymentsLive() ? "Sblocca il pieno potenziale di Scriptora" : "Piani premium in arrivo"}
          </h1>
          <p className="mt-4 text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {isPaymentsLive()
              ? "Scegli il piano adatto al tuo percorso editoriale."
              : "I pagamenti non sono ancora attivi. Puoi usare Scriptora e ti avviseremo al lancio dei piani premium."}
          </p>
        </div>

        <PaymentStatusBanner />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
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
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {extraPlans.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                comingSoon={!paymentsLive}
                isCurrent={isCurrentPlan(plan.id)}
                onAction={handleAction}
              />
            ))}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-10">
          Cancellazione in qualsiasi momento · Pagamento sicuro · IVA inclusa dove applicabile
        </p>

        <section className="mt-20 max-w-3xl mx-auto space-y-6">
          <h2 className="text-2xl font-bold text-center">FAQ</h2>
          {paymentsLive ? (
            <Faq q="Come funziona l'abbonamento?">
              Scegli il piano, completa il checkout sicuro del provider, e il tuo account si
              aggiorna automaticamente entro pochi secondi. Puoi gestire o cancellare dal portale
              di fatturazione del provider.
            </Faq>
          ) : (
            <Faq q="Quando saranno attivi i pagamenti?">
              L'infrastruttura è già pronta. I checkout si attivano non appena configuri provider
              e link — senza riscrittura dell'app.
            </Faq>
          )}
          <Faq q="Posso usare Scriptora gratis?">
            Sì. Il piano Free resta sempre disponibile con gli strumenti essenziali per iniziare
            il tuo primo progetto editoriale.
          </Faq>
          {!paymentsLive && (
            <Faq q="Cosa succede se clicco un piano Pro adesso?">
              Vedrai un messaggio informativo. Nessun pagamento viene richiesto né elaborato finché
              i checkout non sono attivi.
            </Faq>
          )}
          <Faq q="Posso cancellare in qualsiasi momento?">
            Sì. Quando i pagamenti saranno attivi, potrai gestire o cancellare l'abbonamento dal
            tuo portale di fatturazione, e mantenere l'accesso fino alla fine del periodo pagato.
          </Faq>
          <Faq q="I libri che creo sono miei?">
            Al 100%. Tutto ciò che generi è tuo, royalty-free, pronto per KDP o qualsiasi altro
            publisher.
          </Faq>
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

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      <h3 className="text-sm font-semibold mb-1.5">{q}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}
