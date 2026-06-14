import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Coins, X } from "lucide-react";
import type { InsufficientCreditsDetail } from "@/lib/billing/creditUx";
import { getPurchaseCtaLabel } from "@/lib/billing/creditUx";
import { formatCredits } from "@/lib/credit-economy";
import { DevCreditQuickBuy } from "@/components/billing/DevCreditQuickBuy";

export function InsufficientCreditsPaywall() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<InsufficientCreditsDetail | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<InsufficientCreditsDetail>;
      if (!custom.detail) return;
      setDetail(custom.detail);
      setOpen(true);
    };
    window.addEventListener("scriptora-insufficient-credits", handler);
    return () => window.removeEventListener("scriptora-insufficient-credits", handler);
  }, []);

  if (!open || !detail) return null;

  const purchaseLabel = getPurchaseCtaLabel();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Crediti insufficienti</h2>
              <p className="text-xs text-muted-foreground">{detail.operationLabel}</p>
            </div>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-foreground">
          Ti servono <span className="font-semibold tabular-nums">{formatCredits(detail.cost)} crediti</span> per questa operazione.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Saldo disponibile: <span className="font-semibold tabular-nums text-foreground">{formatCredits(detail.balance)}</span>
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Puoi ricaricare crediti dal wallet o consultare i pacchetti in prezzi. In beta privata il checkout può non essere ancora attivo.
        </p>

        <div className="mt-4">
          <DevCreditQuickBuy variant="panel" onPurchased={() => setOpen(false)} />
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate("/pricing#credit-packs");
            }}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {purchaseLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate("/pricing");
            }}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Vedi prezzi
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground hover:text-foreground sm:hidden"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
