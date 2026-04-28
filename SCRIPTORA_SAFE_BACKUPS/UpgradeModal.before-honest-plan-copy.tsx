// Reusable upgrade modal triggered when free users hit a paywall (export, dominate, token limit).
// Behaviour: if payments are live (env-configured) the CTA opens the configured checkout URL;
// otherwise it opens an elegant in-app "Coming Soon" modal — never a blank external page.

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Lock, Check, Crown, Zap } from "lucide-react";
import { PLAN_PRICING, PlanTier } from "@/lib/plan";
import { paymentsConfig, resolvePlanAction, type PaymentPlan } from "@/config/payments";
import { ComingSoonPaymentModal } from "@/components/payments/ComingSoonPaymentModal";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  reason?: "export" | "dominate" | "token-limit" | "books-limit";
  currentPlan?: PlanTier;
}

const REASON_COPY: Record<NonNullable<UpgradeModalProps["reason"]>, { title: string; subtitle: string }> = {
  export:        { title: "Il tuo libro è pronto. Ora sbloccalo.",     subtitle: "Esporta in EPUB, PDF e DOCX e porta il tuo manoscritto ovunque." },
  dominate:      { title: "Sblocca la massima potenza di scrittura.",  subtitle: "Dominate Mode riscrive i capitoli finché non raggiungono qualità bestseller." },
  "token-limit": { title: "Sei vicino al limite del tuo libro.",       subtitle: "Continua a scrivere senza limiti e completa il tuo manoscritto." },
  "books-limit": { title: "Sei pronto per il tuo prossimo libro.",     subtitle: "Il piano Free copre 1 libro — passa a Pro per continuare." },
};

export function UpgradeModal({ open, onClose, reason = "export", currentPlan = "free" }: UpgradeModalProps) {
  const copy = REASON_COPY[reason];
  const recommendPremium = reason === "dominate";
  const [comingSoonName, setComingSoonName] = useState<string | null>(null);

  const proPlan = paymentsConfig.plans.find((p) => p.id === "pro_monthly");
  const premiumPlan =
    paymentsConfig.plans.find((p) => p.id === "premium_monthly") ??
    paymentsConfig.plans.find((p) => p.id === "lifetime");

  const handlePick = (plan: PaymentPlan | undefined, fallbackName: string) => {
    if (!plan) {
      setComingSoonName(fallbackName);
      return;
    }
    const action = resolvePlanAction(plan);
    if (action.kind === "external") {
      window.open(action.url, "_blank", "noopener,noreferrer");
      onClose();
      return;
    }
    // coming_soon | missing_link | free → stay in-app
    setComingSoonName(plan.name);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-background border-border">
        <div className="bg-gradient-to-br from-primary/15 via-background to-background p-6 border-b border-border">
          <DialogHeader>
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center mb-3">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center text-xl">{copy.title}</DialogTitle>
            <DialogDescription className="text-center max-w-md mx-auto">{copy.subtitle}</DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PlanCard
              name="Pro"
              price={PLAN_PRICING.pro.price}
              period={PLAN_PRICING.pro.period}
              features={[
                "10 libri al mese",
                "Fino a 80.000 parole per libro",
                "Export EPUB, PDF, DOCX",
                "Cover Studio a template",
              ]}
              cta="Passa a Pro"
              badge={!recommendPremium ? "Più scelto" : undefined}
              highlight={!recommendPremium}
              icon={<Zap className="h-3.5 w-3.5" />}
              onPick={() => handlePick(proPlan, "Pro")}
            />
            <PlanCard
              name="Premium"
              price={PLAN_PRICING.premium.price}
              period={PLAN_PRICING.premium.period}
              features={[
                "Libri illimitati (fair use)",
                "Dominate Mode completo",
                "Ricerche di mercato in tempo reale",
                "Massima qualità di output",
              ]}
              cta="Sblocca Premium"
              badge={recommendPremium ? "Max Power" : undefined}
              highlight={recommendPremium}
              icon={<Crown className="h-3.5 w-3.5" />}
              onPick={() => handlePick(premiumPlan, "Premium")}
            />
          </div>

          <p className="text-[11px] text-muted-foreground text-center">
            Pagamento sicuro · Cancellazione in qualsiasi momento.
          </p>
        </div>
      </DialogContent>
      <ComingSoonPaymentModal
        open={!!comingSoonName}
        onClose={() => { setComingSoonName(null); onClose(); }}
        planName={comingSoonName ?? undefined}
      />
    </Dialog>
  );
}

interface PlanCardProps {
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  badge?: string;
  highlight?: boolean;
  icon?: React.ReactNode;
  onPick: () => void;
}

function PlanCard({ name, price, period, features, cta, badge, highlight, icon, onPick }: PlanCardProps) {
  return (
    <div
      className={`relative rounded-xl border p-5 flex flex-col transition-all ${
        highlight
          ? "border-primary bg-gradient-to-b from-primary/10 to-primary/5 shadow-[0_0_32px_-8px_hsl(var(--primary)/0.4)]"
          : "border-border bg-surface"
      }`}
    >
      {badge && (
        <span
          className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${
            highlight ? "bg-primary text-primary-foreground" : "bg-amber-500 text-amber-950"
          }`}
        >
          {badge}
        </span>
      )}
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <h4 className="text-sm font-bold text-foreground">{name}</h4>
      </div>
      <div className="mb-4">
        <span className="text-3xl font-black text-foreground">{price}</span>
        <span className="text-xs text-muted-foreground">{period}</span>
      </div>
      <ul className="space-y-2 mb-5 flex-1">
        {features.map((f, i) => (
          <li key={`stable-${i}`} className="flex items-start gap-1.5 text-xs text-foreground/85">
            <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onPick}
        className={`text-center px-3 py-2.5 rounded-lg text-xs font-bold transition-all hover:scale-[1.02] ${
          highlight
            ? "bg-primary text-primary-foreground shadow-lg"
            : "bg-foreground/90 text-background hover:bg-foreground"
        }`}
      >
        {cta}
      </button>
    </div>
  );
}

// Tiny inline "Locked" pill for buttons
export function LockedBadge({ label = "PRO" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500">
      <Lock className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}
