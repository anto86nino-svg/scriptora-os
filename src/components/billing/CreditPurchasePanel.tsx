import { useState } from "react";
import { Loader2, PlusCircle } from "lucide-react";
import { DEV_PURCHASE_AMOUNTS, purchaseCreditsSimulator, resolvePaymentProvider } from "@/lib/billing";
import { getPurchaseCtaLabel } from "@/lib/billing/creditUx";
import { formatCredits } from "@/lib/credit-economy";
import { isDevMode } from "@/lib/dev-mode";
import { isDevUnlimitedCredits } from "@/lib/billing/devMode";
import { isPaymentsLive } from "@/config/payments";
import { toast } from "sonner";
import { getBillingProvider } from "@/lib/billing/billingProvider";
import { CreditMarketplacePanel } from "./CreditMarketplacePanel";

interface CreditPurchasePanelProps {
  onPurchased?: () => void;
  compact?: boolean;
}

export function CreditPurchasePanel({ onPurchased, compact = false }: CreditPurchasePanelProps) {
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const provider = resolvePaymentProvider();
  const ctaLabel = getPurchaseCtaLabel();
  const isProd = import.meta.env.PROD;
  const canSimulate = !isProd && isDevMode() && isDevUnlimitedCredits();
  const checkoutLive = provider === "stripe" || provider === "lemon" || (isPaymentsLive() && !canSimulate);

  const handlePurchase = async (amount: number) => {
    if (!checkoutLive && !canSimulate) return;
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
      if (!result.ok) {
        throw new Error("Acquisti temporaneamente non disponibili. Riprova più tardi.");
      }
      onPurchased?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Acquisto non disponibile";
      toast.error(isProd && /stripe|mock|dev|local|simulation/i.test(msg)
        ? "Acquisti temporaneamente non disponibili. Riprova più tardi."
        : msg);
    } finally {
      setPurchasing(null);
    }
  };

  if (!checkoutLive && !canSimulate) {
    return <CreditMarketplacePanel compact={compact} checkoutLive={false} />;
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <CreditMarketplacePanel compact checkoutLive={checkoutLive} />
      <div className={compact ? "space-y-3" : "rounded-lg border border-border bg-card p-4 space-y-4"}>
        <h3 className="text-sm font-semibold">Ricarica rapida</h3>
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
          {purchasing === 5_000 ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />}
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}
