// Small banner shown at the top of the Pricing page to communicate that
// payment infrastructure is ready but no live checkout is wired yet.

import { paymentsConfig, isPaymentsLive } from "@/config/payments";
import { BetaAccessNotice } from "@/components/ui/BetaAccessNotice";

export function PaymentStatusBanner() {
  if (isPaymentsLive()) return null;

  return (
    <div className="mx-auto mb-10 max-w-3xl">
      <BetaAccessNotice
        title="Beta privata · Pagamenti non ancora attivi"
        message="Puoi continuare a usare Scriptora con i crediti disponibili, il piano Free e le funzioni della beta. I checkout abbonamenti e pacchetti si attiveranno in una fase successiva — nessun addebito in questa versione."
      />
    </div>
  );
}