// Small banner shown at the top of the Pricing page to communicate that
// payment infrastructure is ready but no live checkout is wired yet.

import { Sparkles } from "lucide-react";
import { paymentsConfig, isPaymentsLive } from "@/config/payments";

export function PaymentStatusBanner() {
  if (isPaymentsLive()) return null;

  return (
    <div className="mx-auto max-w-3xl mb-10 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-5 py-4 flex items-start gap-3">
      <div className="mt-0.5 h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
        <Sparkles className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-foreground">Pagamenti in preparazione</span>
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold border border-primary/30">
            In preparazione
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          L'infrastruttura pagamenti è già pronta. I checkout esterni non sono ancora attivi in
          questa versione — verranno abilitati automaticamente non appena verranno configurati
          provider e link.
        </p>
      </div>
    </div>
  );
}