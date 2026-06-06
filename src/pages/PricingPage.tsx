// Public pricing page — Free / Pro Monthly / Pro Yearly / Lifetime.
// Driven by src/config/payments.ts (env-aware). Defaults to "coming soon" mode:
// Pro CTAs open an elegant modal instead of redirecting to a checkout.

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
import { toast } from "sonner";

export default function PricingPage() {
  const { currentPlan } = useSubscription();
  const [comingSoonPlan, setComingSoonPlan] = useState<PaymentPlan | null>(null);

  const handleAction = (plan: PaymentPlan) => {
    const action = resolvePlanAction(plan);
    switch (action.kind) {
      case "free":
        // Free CTA — already on the app, just send back to dashboard.
        window.location.href = "/dashboard";
        return;
      case "external":
        window.open(action.url, "_blank", "noopener,noreferrer");
        return;
      case "missing_link":
        toast.error("Pagamento non configurato.", {
          description: "Il link di checkout non è ancora stato impostato per questo piano.",
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
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
          <span className="text-xs font-bold tracking-wider uppercase text-muted-foreground">Scriptora · Pricing</span>
        </div>
      </header>

      <main className="scriptora-feature-scroll mx-auto max-w-6xl px-6 py-14">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-[10px] font-bold uppercase tracking-wider text-primary mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Payments infrastructure ready
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
            Sblocca il pieno potenziale di Scriptora
          </h1>
          <p className="mt-4 text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            I piani premium saranno presto disponibili. La struttura pagamenti è già predisposta
            per l'attivazione.
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
                comingSoon={paymentsConfig.mode === "coming_soon" || !paymentsConfig.enabled}
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
          <Faq q="Quando saranno attivi i pagamenti?">
            L'infrastruttura è già pronta. I checkout verranno attivati non appena verranno
            configurati provider e link di pagamento. Nessuna riscrittura dell'app sarà necessaria.
          </Faq>
          <Faq q="Posso usare Scriptora gratis nel frattempo?">
            Sì. Il piano Free resta sempre disponibile e ti dà accesso agli strumenti essenziali
            per iniziare a scrivere e pubblicare i tuoi primi progetti.
          </Faq>
          <Faq q="Cosa succede se clicco un piano Pro adesso?">
            Vedrai un messaggio "presto disponibile". Nessun pagamento viene richiesto né
            elaborato in questa versione.
          </Faq>
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
