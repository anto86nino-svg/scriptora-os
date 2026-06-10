import { useState } from "react";
import { Loader2, PlusCircle } from "lucide-react";
import { DEV_PURCHASE_AMOUNTS, purchaseCreditsSimulator, resolvePaymentProvider } from "@/lib/billing";
import { getPurchaseCtaLabel } from "@/lib/billing/creditUx";
import { formatCredits } from "@/lib/credit-economy";
import { isDevMode } from "@/lib/dev-mode";
import { toast } from "sonner";
import { getBillingProvider } from "@/lib/billing/billingProvider";

interface CreditPurchasePanelProps {
  onPurchased?: () => void;
  compact?: boolean;
}

export function CreditPurchasePanel({ onPurchased, compact = false }: CreditPurchasePanelProps) {
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const provider = resolvePaymentProvider();
  const ctaLabel = getPurchaseCtaLabel();
  const canSimulate = provider === "dev" && isDevMode();

  const handlePurchase = async (amount: number) => {
    setPurchasing(amount);
    try {
      if (canSimulate) {
        const result = await purchaseCreditsSimulator(amount);
        if (!result.ok) throw new Error(result.error || "Acquisto fallito");
        onPurchased?.();
        return;
      }
      const billing = getBillingProvider();
      const result = await billing.purchaseCredits(amount);
      if (!result.ok) throw new Error(result.error || "Checkout non disponibile");
      onPurchased?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Acquisto non disponibile");
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div className={compact ? "space-y-3" : "rounded-lg border border-border bg-card p-4 space-y-4"}>
      <div>
        <h3 className="text-sm font-semibold">{ctaLabel}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {canSimulate
            ? "Modalità sviluppo: ricarica istantanea sul wallet locale."
            : `Provider: ${provider}. Il checkout verrà attivato con ${provider === "stripe" ? "Stripe" : "Lemon Squeezy"}.`}
        </p>
      </div>
      <div className={`grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
        {DEV_PURCHASE_AMOUNTS.map((amount) => (
          <button
            key={amount}
            type="button"
            disabled={purchasing !== null}
            onClick={() => void handlePurchase(amount)}
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted/40 disabled:opacity-50"
          >
            {purchasing === amount ? <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" /> : formatCredits(amount)}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={purchasing !== null}
        onClick={() => void handlePurchase(5_000)}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {purchasing === -1 ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />}
        {ctaLabel}
      </button>
    </div>
  );
}
