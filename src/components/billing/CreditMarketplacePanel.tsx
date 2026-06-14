import { useState } from "react";
import { Bell, Sparkles } from "lucide-react";
import { formatCredits } from "@/lib/credit-economy";
import { GENERAL_CREDIT_PACKS, STUDENT_CREDIT_PACKS } from "@/lib/billing/pricingCatalog";
import { toast } from "sonner";

const WISHLIST_KEY = "scriptora-marketplace-notify";

interface CreditMarketplacePanelProps {
  compact?: boolean;
  checkoutLive?: boolean;
  onNotify?: () => void;
}

export function CreditMarketplacePanel({ compact = false, checkoutLive = false, onNotify }: CreditMarketplacePanelProps) {
  const [notified, setNotified] = useState(() => {
    try {
      return localStorage.getItem(WISHLIST_KEY) === "true";
    } catch {
      return false;
    }
  });

  const handleNotify = () => {
    try {
      localStorage.setItem(WISHLIST_KEY, "true");
    } catch { /* noop */ }
    setNotified(true);
    onNotify?.();
    toast.success("Ti avviseremo quando il checkout sarà attivo.");
  };

  return (
    <div className={compact ? "space-y-4" : "rounded-xl border border-border/80 bg-gradient-to-b from-card to-card/60 p-5 space-y-5"}>
      <div className="text-center sm:text-left">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
          <Sparkles className="h-3 w-3" /> Crediti universali
        </p>
        <h3 className="mt-3 text-lg font-bold tracking-tight">
          {checkoutLive ? "Scegli il tuo pacchetto crediti" : "Acquista crediti quando ti servono"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {checkoutLive
            ? "I crediti valgono per libri, KDP, cover, export e Study OS."
            : "Anche con il piano Free puoi acquistare crediti e usare funzioni premium."}
        </p>
      </div>

      <div className={`grid gap-3 ${compact ? "grid-cols-1" : "sm:grid-cols-2"}`}>
        {GENERAL_CREDIT_PACKS.map((pack) => (
          <div key={pack.id} className="rounded-xl border border-border/60 bg-background/40 p-4">
            <div className="font-semibold">{pack.name}</div>
            <p className="mt-2 text-2xl font-bold tabular-nums">{formatCredits(pack.credits)}</p>
            <p className="text-xs text-muted-foreground">crediti · {pack.priceLabel}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pack studenti</p>
        <div className={`grid gap-2 ${compact ? "grid-cols-1" : "sm:grid-cols-2"}`}>
          {STUDENT_CREDIT_PACKS.map((pack) => (
            <div key={pack.id} className="rounded-lg border border-border/50 bg-background/30 px-3 py-2.5 text-sm">
              <span className="font-medium">{pack.name}</span>
              <span className="mx-1 text-muted-foreground">·</span>
              <span className="tabular-nums font-semibold">{formatCredits(pack.credits)}</span>
              <span className="text-xs text-muted-foreground"> · {pack.priceLabel}</span>
            </div>
          ))}
        </div>
      </div>

      {!checkoutLive && (
        <button
          type="button"
          onClick={handleNotify}
          disabled={notified}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm font-semibold hover:bg-muted/50 disabled:opacity-60"
        >
          <Bell className="h-4 w-4" />
          {notified ? "Sei in lista — ti avviseremo" : "Avvisami al lancio checkout"}
        </button>
      )}
    </div>
  );
}
