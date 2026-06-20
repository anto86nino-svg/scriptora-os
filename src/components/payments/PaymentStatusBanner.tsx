// Small banner shown at the top of the Pricing page to communicate that
// payment infrastructure is ready but no live checkout is wired yet.

import { isPaymentsLive } from "@/config/payments";
import { BetaAccessNotice } from "@/components/ui/BetaAccessNotice";

export function PaymentStatusBanner() {
  if (isPaymentsLive()) return null;

  return (
    <div className="mx-auto mb-10 max-w-3xl">
      <BetaAccessNotice
        title="Beta privata · Pagamenti non ancora attivi"
        message="Checkout Stripe/Lemon predisponibile via env, ma non attivo in questa beta. Nessun addebito viene elaborato: piani autore, crediti extra e Study OS Pro sono pronti per il collegamento reale."
      />
    </div>
  );
}
