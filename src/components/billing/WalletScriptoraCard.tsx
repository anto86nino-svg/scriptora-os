import { useNavigate } from "react-router-dom";
import { Coins, History, CreditCard, TrendingDown, TrendingUp, Settings2 } from "lucide-react";
import { useCreditWallet } from "@/hooks/useCreditWallet";
import { formatCredits } from "@/lib/credit-economy";
import { getPurchaseCtaLabel } from "@/lib/billing/creditUx";
import { creditSimulationBadge } from "@/lib/billing/devMode";
import { SmartCreditRecommendation } from "./SmartCreditRecommendation";
import { DevCreditQuickBuy } from "./DevCreditQuickBuy";
import { canDevSimulateCreditPurchase } from "@/lib/billing";

export function WalletScriptoraCard() {
  const navigate = useNavigate();
  const { wallet, analytics, lowCreditHint } = useCreditWallet();
  const simulationBadge = creditSimulationBadge();
  const purchaseLabel = getPurchaseCtaLabel();

  return (
    <section className="ios-panel border-white/15 bg-gradient-to-br from-slate-950/50 to-sky-950/20 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <Coins className="h-4 w-4 text-sky-300" />
              Wallet Scriptora
            </div>
            {simulationBadge && (
              <span className="rounded-full border-2 border-amber-500/55 bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold tracking-[0.16em] text-amber-100">
                {simulationBadge}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Piano {analytics.planLabel}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold tabular-nums text-foreground">{formatCredits(wallet.balance)}</div>
          <p className="text-[11px] text-muted-foreground">crediti disponibili</p>
        </div>
      </div>

      {lowCreditHint && (
        <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100/90">
          {lowCreditHint}
        </p>
      )}

      <SmartCreditRecommendation />

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatMini icon={<TrendingDown className="h-3.5 w-3.5" />} label="Consumo mese" value={formatCredits(analytics.monthUsed)} />
        <StatMini icon={<TrendingUp className="h-3.5 w-3.5" />} label="Acquistati mese" value={formatCredits(analytics.monthPurchased)} />
        <StatMini icon={<CreditCard className="h-3.5 w-3.5" />} label="Piano" value={analytics.planLabel} />
        <StatMini icon={<Coins className="h-3.5 w-3.5" />} label="Allocazione" value={formatCredits(analytics.planAllocation)} />
      </div>

      {canDevSimulateCreditPurchase() && (
        <div className="mt-4">
          <DevCreditQuickBuy variant="panel" onPurchased={() => window.dispatchEvent(new Event("scriptora-credits-change"))} />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {canDevSimulateCreditPurchase() ? (
          <DevCreditQuickBuy variant="toolbar" purchaseLabel={purchaseLabel} buttonClassName="inline-flex h-9 items-center gap-1.5 px-3 text-xs font-semibold" />
        ) : (
          <button
            type="button"
            onClick={() => navigate("/usage?focus=purchase")}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            {purchaseLabel}
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate("/usage?focus=history")}
          className="ios-toolbar-button h-9 px-3 text-xs font-medium"
        >
          <History className="h-3.5 w-3.5" /> Storico
        </button>
        <button
          type="button"
          onClick={() => navigate("/pricing")}
          className="ios-toolbar-button h-9 px-3 text-xs font-medium"
        >
          <Settings2 className="h-3.5 w-3.5" /> Gestisci Piano
        </button>
      </div>
    </section>
  );
}

function StatMini({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}
