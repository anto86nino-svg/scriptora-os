import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Coins,
  Crown,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  AUTHOR_COST_EXAMPLES,
  AUTHOR_SUBSCRIPTION_PLANS,
  GENERAL_CREDIT_PACKS,
  UNIVERSAL_CREDITS_MESSAGE,
  type SubscriptionPlanDefinition,
} from "@/lib/billing/pricingCatalog";
import { formatCredits } from "@/lib/credit-economy";
import { paymentsConfig } from "@/config/payments";
import { executePlanAction } from "@/lib/payments/executePlanAction";
import { ComingSoonPaymentModal } from "@/components/payments/ComingSoonPaymentModal";
import { creditSimulationBadge } from "@/lib/billing/devMode";
import { canDevSimulateCreditPurchase } from "@/lib/billing";
import { isPaymentsLive } from "@/config/payments";
import { BetaAccessNotice } from "@/components/ui/BetaAccessNotice";
import { PAY_PER_PROJECT_TIERS } from "@/lib/pay-per-project";

interface ScriptoraPricingCatalogProps {
  showBackLink?: boolean;
}

const AUTHOR_TRANSPARENCY_BULLETS = [
  "Ogni azione mostra il costo in crediti prima di partire.",
  "Se un'operazione supera il saldo, puoi ricaricare senza cambiare piano.",
  "Piani, crediti extra e sblocco singolo libro restano chiaramente separati.",
] as const;

export function ScriptoraPricingCatalog({ showBackLink = true }: ScriptoraPricingCatalogProps) {
  const navigate = useNavigate();
  const [comingSoonPlan, setComingSoonPlan] = useState<string | null>(null);
  const simulationBadge = creditSimulationBadge();
  const canSimulate = canDevSimulateCreditPurchase();
  const paymentsLive = isPaymentsLive();

  const handlePlanAction = async (plan: SubscriptionPlanDefinition) => {
    if (plan.priceNumeric === 0) {
      navigate("/auth");
      return;
    }

    if (!paymentsLive || !plan.legacyCheckoutPlanId) {
      toast.message("Checkout non ancora attivo in questa beta.", {
        description: "Puoi continuare a usare Scriptora con i crediti disponibili o richiedere accesso anticipato.",
      });
      setComingSoonPlan(plan.name);
      return;
    }

    const legacyPlan = paymentsConfig.plans.find((p) => p.id === plan.legacyCheckoutPlanId);
    if (!legacyPlan) {
      toast.message("Checkout non ancora attivo in questa beta.", {
        description: "Puoi continuare a usare Scriptora con i crediti disponibili.",
      });
      setComingSoonPlan(plan.name);
      return;
    }

    const result = await executePlanAction(legacyPlan);
    if (result.showComingSoon) setComingSoonPlan(plan.name);
  };

  const handleCreditPack = () => {
    if (canSimulate) {
      navigate("/usage?focus=purchase");
      return;
    }
    if (paymentsLive) {
      navigate("/usage?focus=purchase");
      return;
    }
    document.getElementById("credit-packs")?.scrollIntoView({ behavior: "smooth", block: "start" });
    toast.message("Pacchetti crediti — beta privata", {
      description: "Consulta i pack qui sotto. Il checkout si attiverà nella prossima fase; intanto usa i crediti del tuo account.",
    });
  };

  const plans = AUTHOR_SUBSCRIPTION_PLANS;
  const costExamples = AUTHOR_COST_EXAMPLES;

  return (
    <div className="space-y-16">
      {!paymentsLive && (
        <BetaAccessNotice
          compact
          title="Beta privata"
          message="I piani autore sono pronti per il checkout reale. In questa beta nessun pagamento viene elaborato: abbonamenti e crediti restano predisposti per l'attivazione Stripe/Lemon."
        />
      )}
      <section className="text-center">
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
          <Sparkles className="h-3 w-3" /> Crediti universali
        </p>
        <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
          Scegli come creare con Scriptora.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Puoi iniziare gratis oppure passare a un piano autore con crediti mensili.
          I crediti extra restano dedicati alle operazioni più intensive: capitoli, KDP, cover, export e audit.
        </p>
        {simulationBadge && (
          <p className="mt-3 text-xs font-semibold text-amber-400">{simulationBadge}</p>
        )}
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/auth"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Inizia gratis <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={handleCreditPack}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-border px-5 text-sm font-semibold hover:bg-muted/40"
          >
            <Coins className="h-4 w-4" /> Acquista crediti
          </button>
          <a
            href="#compare-plans"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-border/60 px-5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Confronta piani
          </a>
        </div>
      </section>

      <section id="compare-plans" className="space-y-6">
        <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold">
          <BookOpen className="h-4 w-4" /> Piani per scrivere e pubblicare libri
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} onAction={() => void handlePlanAction(plan)} />
          ))}
        </div>
      </section>

      <section id="credit-packs" className="scroll-mt-24">
        <CreditPackSection
          title="Crediti universali"
          message={UNIVERSAL_CREDITS_MESSAGE}
          packs={GENERAL_CREDIT_PACKS}
          onPurchase={handleCreditPack}
        />
      </section>

      <section className="rounded-2xl border border-sky-300/20 bg-sky-300/10 p-6 sm:p-8">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-sky-100">Pay-per-project</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Dopo il Blueprint puoi usare crediti, passare a un piano autore o sbloccare quel singolo projectId una volta.
            In beta il checkout reale resta disattivato se Stripe/Lemon non sono configurati.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PAY_PER_PROJECT_TIERS.map((tier) => (
            <article key={tier.id} className="rounded-xl border border-white/10 bg-background/45 p-4">
              <p className="text-sm font-bold">{tier.name}</p>
              <p className="mt-2 text-2xl font-black tabular-nums text-sky-100">{tier.priceLabel}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{tier.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card/60 p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Esempi di costo in crediti</h2>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {costExamples.map((example) => (
            <li key={example.label} className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/50 px-4 py-3 text-sm">
              <span className="text-muted-foreground">{example.label}</span>
              <span className="shrink-0 font-semibold tabular-nums text-foreground">{example.credits}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
        <h2 className="text-lg font-bold">Trasparenza totale</h2>
        <ul className="mt-4 space-y-2">
          {AUTHOR_TRANSPARENCY_BULLETS.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {bullet}
            </li>
          ))}
        </ul>
      </section>

      {showBackLink && (
        <p className="text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground underline-offset-4 hover:underline">
            Torna alla home pubblica
          </Link>
        </p>
      )}

      <ComingSoonPaymentModal
        open={!!comingSoonPlan}
        onClose={() => setComingSoonPlan(null)}
        planName={comingSoonPlan ?? undefined}
        showPricingLink={false}
      />
    </div>
  );
}

function PlanCard({
  plan,
  onAction,
}: {
  plan: SubscriptionPlanDefinition;
  onAction: () => void;
}) {
  const badgeLabel = plan.badge === "recommended"
    ? "Più scelto"
    : plan.badge === "premium"
      ? "Produzione intensiva"
      : null;

  return (
    <article
      className={`relative flex flex-col rounded-2xl border p-5 ${
        plan.badge === "recommended"
          ? "border-primary/50 bg-primary/5 ring-1 ring-primary/25"
          : "border-border bg-card"
      }`}
    >
      {badgeLabel && (
        <span className="absolute -top-2.5 left-4 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground">
          {plan.badge === "recommended" ? <Crown className="h-3 w-3" /> : null}
          {badgeLabel}
        </span>
      )}
      <div className="mb-4">
        <h3 className="text-lg font-bold">{plan.name}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{plan.tagline}</p>
      </div>
      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black tabular-nums">{plan.priceLabel}</span>
          <span className="text-xs text-muted-foreground">{plan.period}</span>
        </div>
        <p className="mt-1 text-sm font-semibold text-primary tabular-nums">
          {plan.includedUsageLabel || `${formatCredits(plan.monthlyCredits)} crediti/mese`}
        </p>
      </div>
      <ul className="mb-6 flex-1 space-y-2">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/80" />
            {feature}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onAction}
        className={`inline-flex h-10 w-full items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
          plan.badge === "recommended"
            ? "bg-primary text-primary-foreground hover:opacity-90"
            : "border border-border hover:bg-muted/40"
        }`}
      >
        {plan.priceNumeric === 0 ? "Inizia gratis" : "Scegli piano"}
      </button>
    </article>
  );
}

function CreditPackSection({
  title,
  message,
  packs,
  onPurchase,
}: {
  title: string;
  message: string;
  packs: Array<{ id: string; name: string; priceLabel: string; credits: number; tagline?: string }>;
  onPurchase: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {packs.map((pack) => (
          <button
            key={pack.id}
            type="button"
            onClick={onPurchase}
            className="rounded-xl border border-border/70 bg-background/50 p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="font-semibold">{pack.name}</div>
            {pack.tagline && <p className="mt-0.5 text-[11px] text-muted-foreground">{pack.tagline}</p>}
            <div className="mt-2 text-xl font-bold tabular-nums">{formatCredits(pack.credits)}</div>
            <div className="text-xs text-muted-foreground">{pack.priceLabel}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
