// Modal shown when checkout is not yet active in private beta.

import { Link } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onClose: () => void;
  planName?: string;
  showPricingLink?: boolean;
}

export function ComingSoonPaymentModal({ open, onClose, planName, showPricingLink = true }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-gradient-to-br from-primary/30 to-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">
            {planName ? `${planName} — accesso anticipato` : "Accesso anticipato"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-center text-sm text-muted-foreground">
          <p>
            Il checkout non è ancora attivo in questa beta privata.
            Puoi continuare a usare Scriptora con i crediti disponibili o richiedere accesso anticipato.
          </p>
          <p className="text-xs">
            Nessun pagamento viene elaborato in questa versione. Quando i piani saranno attivi, ti avviseremo dalla stessa pagina prezzi.
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {showPricingLink && (
            <Link
              to="/pricing"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Vedi piani e crediti <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-center text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Continua con la beta
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}