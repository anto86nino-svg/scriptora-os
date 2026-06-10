import { useState } from "react";
import { ChevronDown, Coins, Loader2, Plus } from "lucide-react";
import {
  DEV_PURCHASE_AMOUNTS,
  canDevSimulateCreditPurchase,
  purchaseCreditsSimulator,
} from "@/lib/billing";
import { formatCredits } from "@/lib/credit-economy";
import { useCreditWallet } from "@/hooks/useCreditWallet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type DevCreditQuickBuyVariant = "panel" | "pill" | "toolbar";

interface DevCreditQuickBuyProps {
  className?: string;
  variant?: DevCreditQuickBuyVariant;
  /** Label for toolbar variant (e.g. "Aggiungi crediti") */
  purchaseLabel?: string;
  buttonClassName?: string;
  onPurchased?: () => void;
}

export function DevCreditQuickBuy({
  className,
  variant = "panel",
  purchaseLabel = "Aggiungi crediti",
  buttonClassName,
  onPurchased,
}: DevCreditQuickBuyProps) {
  const { wallet, refresh } = useCreditWallet();
  const [buying, setBuying] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  if (!canDevSimulateCreditPurchase()) return null;

  const notifyPurchased = () => {
    window.dispatchEvent(new Event("scriptora-credits-change"));
    refresh();
    onPurchased?.();
  };

  const buy = async (amount: number) => {
    setBuying(amount);
    try {
      const result = await purchaseCreditsSimulator(amount);
      if (!result.ok) throw new Error(result.error || "Acquisto fallito");
      notifyPurchased();
      setMenuOpen(false);
      toast.success(`+${formatCredits(amount)} crediti · saldo ${formatCredits(result.balanceAfter)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Acquisto non riuscito");
    } finally {
      setBuying(null);
    }
  };

  if (variant === "pill") {
    return (
      <div className={cn("inline-flex items-center gap-1", className)}>
        <button
          type="button"
          disabled={buying !== null}
          onClick={() => void buy(5_000)}
          title="Aggiungi 5.000 crediti (simulato, dev)"
          className="inline-flex h-7 items-center gap-1 rounded-full bg-amber-400 px-2.5 text-[10px] font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-50"
        >
          {buying === 5_000 ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          +5k
        </button>
      </div>
    );
  }

  if (variant === "toolbar") {
    return (
      <div className={cn("relative inline-flex", className)}>
        <div className="inline-flex overflow-hidden rounded-lg border border-amber-400/40 bg-amber-400/15">
          <button
            type="button"
            disabled={buying !== null}
            onClick={() => void buy(5_000)}
            className={cn(
              "inline-flex h-7 items-center gap-1 px-2.5 text-[10px] font-semibold text-amber-50 hover:bg-amber-400/25 disabled:opacity-50",
              buttonClassName,
            )}
          >
            {buying === 5_000 ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
            {purchaseLabel}
          </button>
          <button
            type="button"
            disabled={buying !== null}
            onClick={() => setMenuOpen((open) => !open)}
            title="Altri importi"
            className="inline-flex h-7 w-7 items-center justify-center border-l border-amber-400/30 text-amber-50 hover:bg-amber-400/25 disabled:opacity-50"
          >
            <ChevronDown className={cn("h-3 w-3 transition-transform", menuOpen && "rotate-180")} />
          </button>
        </div>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} aria-hidden />
            <div className="absolute left-0 top-full z-50 mt-1 min-w-[140px] rounded-lg border border-border bg-popover p-1 shadow-xl">
              {DEV_PURCHASE_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  disabled={buying !== null}
                  onClick={() => void buy(amount)}
                  className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs font-medium text-popover-foreground hover:bg-muted/60 disabled:opacity-50"
                >
                  <span>+{formatCredits(amount)}</span>
                  {buying === amount && <Loader2 className="h-3 w-3 animate-spin" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-amber-500/40 bg-amber-500/10 p-3", className)}>
      <div className="flex items-center gap-2 text-xs font-semibold text-amber-100">
        <Coins className="h-4 w-4 text-amber-300" />
        Ricarica crediti (simulata · solo dev)
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-amber-100/75">
        Saldo attuale: <span className="font-bold tabular-nums">{formatCredits(wallet.balance)}</span>
        {" · "}Nessun pagamento reale.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {DEV_PURCHASE_AMOUNTS.map((amount) => (
          <button
            key={amount}
            type="button"
            disabled={buying !== null}
            onClick={() => void buy(amount)}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/15 px-2 py-2 text-xs font-bold text-amber-50 hover:bg-amber-400/25 disabled:opacity-50"
          >
            {buying === amount ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>+{formatCredits(amount)}</>
            )}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={buying !== null}
        onClick={() => void buy(5_000)}
        className="mt-2 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 text-sm font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-50"
      >
        {buying === 5_000 ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Aggiungi 5.000 crediti
      </button>
    </div>
  );
}
