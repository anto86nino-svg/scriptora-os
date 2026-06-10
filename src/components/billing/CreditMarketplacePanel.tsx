import { useState } from "react";
import { Bell, Sparkles, Crown, Building2, PenLine } from "lucide-react";
import { formatCredits } from "@/lib/credit-economy";
import { toast } from "sonner";

const TIERS = [
  {
    id: "starter",
    name: "Starter",
    credits: 500,
    price: "€9",
    icon: PenLine,
    benefits: ["Generazione capitoli", "Diagnostica base", "Export DOCX"],
  },
  {
    id: "pro",
    name: "Pro Author",
    credits: 2_500,
    price: "€29",
    icon: Sparkles,
    highlight: true,
    benefits: ["Rewrite premium", "Character Studio AI", "Market intelligence"],
  },
  {
    id: "studio",
    name: "Studio",
    credits: 8_000,
    price: "€79",
    icon: Crown,
    benefits: ["Auto Bestseller", "KDP Launch", "Cover Studio avanzato"],
  },
  {
    id: "publisher",
    name: "Publisher",
    credits: 25_000,
    price: "€199",
    icon: Building2,
    benefits: ["Volume team", "Priorità generazione", "Supporto dedicato"],
  },
] as const;

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
    toast.success("Ti avviseremo quando il marketplace sarà attivo.");
  };

  return (
    <div className={compact ? "space-y-4" : "rounded-xl border border-border/80 bg-gradient-to-b from-card to-card/60 p-5 space-y-5"}>
      <div className="text-center sm:text-left">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
          <Sparkles className="h-3 w-3" /> Premium Marketplace
        </p>
        <h3 className="mt-3 text-lg font-bold tracking-tight">
          {checkoutLive ? "Scegli il tuo pacchetto crediti" : "Marketplace Scriptora in attivazione"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {checkoutLive
            ? "Ogni credito alimenta generazione, rewrite e strumenti editoriali professionali."
            : "Stiamo attivando il checkout sicuro. Esplora i pacchetti e ricevi una notifica al lancio."}
        </p>
      </div>

      <div className={`grid gap-3 ${compact ? "grid-cols-1" : "sm:grid-cols-2"}`}>
        {TIERS.map((tier) => {
          const Icon = tier.icon;
          return (
            <div
              key={tier.id}
              className={`relative rounded-xl border p-4 transition-all ${
                "highlight" in tier && tier.highlight
                  ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                  : "border-border/60 bg-background/40"
              }`}
            >
              {"highlight" in tier && tier.highlight && (
                <span className="absolute -top-2 right-3 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase text-primary-foreground">
                  Popolare
                </span>
              )}
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <span className="font-semibold">{tier.name}</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums">{formatCredits(tier.credits)}</p>
              <p className="text-xs text-muted-foreground">crediti · {tier.price}</p>
              <ul className="mt-3 space-y-1">
                {tier.benefits.map((b) => (
                  <li key={b} className="text-[11px] text-muted-foreground">· {b}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {!checkoutLive && (
        <button
          type="button"
          onClick={handleNotify}
          disabled={notified}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm font-semibold hover:bg-muted/50 disabled:opacity-60"
        >
          <Bell className="h-4 w-4" />
          {notified ? "Sei in lista — ti avviseremo" : "Avvisami al lancio"}
        </button>
      )}
    </div>
  );
}
