import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Coins,
  History,
  BarChart3,
  ShoppingBag,
  AlertTriangle,
} from "lucide-react";
import { useCreditWallet } from "@/hooks/useCreditWallet";
import {
  CATEGORY_DISPLAY_LABELS,
  OPERATION_DISPLAY_LABELS,
  type CreditConsumptionCategory,
} from "@/lib/billing/walletAnalytics";
import {
  canDevSimulateCreditPurchase,
  creditSimulationBadge,
  isDevUnlimitedCredits,
  setDevUnlimitedCredits,
  resolvePaymentProvider,
} from "@/lib/billing";
import { formatCredits } from "@/lib/credit-economy";
import { isDevMode } from "@/lib/dev-mode";
import { CreditPurchasePanel } from "@/components/billing/CreditPurchasePanel";
import { DevCreditQuickBuy } from "@/components/billing/DevCreditQuickBuy";
import { GlobalCreditBar } from "@/components/billing/GlobalCreditBar";

export default function UsagePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focus = searchParams.get("focus");
  const purchaseRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const devMode = isDevMode();
  const { wallet, analytics, lowCreditHint, refresh } = useCreditWallet();
  const simulationBadge = creditSimulationBadge();
  const paymentProvider = resolvePaymentProvider();

  useEffect(() => {
    if (focus === "purchase") purchaseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (focus === "history") historyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focus]);

  const consumptionRows = useMemo(() => {
    const cats = Object.entries(analytics.byCategory)
      .filter(([cat, amount]) => cat !== "purchases" && amount > 0)
      .sort((a, b) => b[1] - a[1]) as [CreditConsumptionCategory, number][];
    return cats;
  }, [analytics.byCategory]);

  return (
    <div className="scriptora-feature-page bg-background text-foreground">
      <GlobalCreditBar variant="bar" />

      <header className="shrink-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </button>
          <div className="flex items-center gap-3">
            <button onClick={refresh} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40">
              <RefreshCw className="h-3.5 w-3.5" /> Aggiorna
            </button>
            <div className="text-[11px] font-mono tracking-widest text-muted-foreground">CREDITI E UTILIZZO</div>
          </div>
        </div>
      </header>

      <main className="scriptora-feature-scroll mx-auto max-w-5xl space-y-8 px-6 py-8">
        <section>
          <h1 className="text-2xl font-bold tracking-tight">Crediti e Utilizzo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Wallet, storico consumi e acquisti
            {!import.meta.env.PROD && paymentProvider ? ` · ${paymentProvider}` : ""}
          </p>
        </section>

        {simulationBadge && !import.meta.env.PROD && (
          <section className="rounded-lg border-2 border-amber-500/50 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-50/90">
            <div className="font-bold tracking-[0.14em] text-amber-100">{simulationBadge}</div>
            <div className="mt-1">Build di sviluppo — il saldo può essere simulato.</div>
          </section>
        )}

        {lowCreditHint && (
          <section className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100/90 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {lowCreditHint}
          </section>
        )}

        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Coins className="h-4 w-4 text-primary" />
                Wallet
              </div>
              <div className="mt-2 text-4xl font-bold tabular-nums">{formatCredits(wallet.balance)}</div>
              <p className="mt-1 text-sm text-muted-foreground">Piano {analytics.planLabel}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <MiniStat label="Consumo mese" value={formatCredits(analytics.monthUsed)} />
              <MiniStat label="Acquistati mese" value={formatCredits(analytics.monthPurchased)} />
            </div>
          </div>
        </section>

        <section ref={purchaseRef}>
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" /> Acquista Crediti
          </h2>
          {canDevSimulateCreditPurchase() && (
            <div className="mb-4">
              <DevCreditQuickBuy variant="panel" onPurchased={refresh} />
            </div>
          )}
          <CreditPurchasePanel onPurchased={refresh} />
          {canDevSimulateCreditPurchase() && (
            <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={isDevUnlimitedCredits()}
                onChange={(e) => setDevUnlimitedCredits(e.target.checked)}
                className="rounded border-border"
              />
              Salta gli addebiti in Dev Mode. Disattiva per testare consumo crediti reale.
            </label>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Consumi per categoria (mese)
          </h2>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {consumptionRows.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">Nessun consumo registrato questo mese.</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Categoria</th>
                    <th className="text-right px-3 py-2 font-medium">Crediti</th>
                  </tr>
                </thead>
                <tbody>
                  {consumptionRows.map(([cat, amount]) => (
                    <tr key={cat} className="border-t border-border/50">
                      <td className="px-3 py-2 font-medium">{CATEGORY_DISPLAY_LABELS[cat]}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">-{formatCredits(amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section ref={historyRef}>
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <History className="h-4 w-4" /> Ledger — Storico completo
          </h2>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Quando</th>
                  <th className="text-left px-3 py-2 font-medium">Operazione</th>
                  <th className="text-right px-3 py-2 font-medium">Importo</th>
                  <th className="text-right px-3 py-2 font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recentLedger.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Nessuna transazione ancora.</td></tr>
                ) : (
                  analytics.recentLedger.map((entry) => (
                    <tr key={entry.id} className="border-t border-border/50 hover:bg-muted/20">
                      <td className="px-3 py-2 text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{OPERATION_DISPLAY_LABELS[entry.operation] || entry.operation}</div>
                        {entry.simulated && <div className="text-[10px] text-amber-500/80">simulato</div>}
                      </td>
                      <td className={`px-3 py-2 text-right font-mono tabular-nums ${entry.amount >= 0 ? "text-emerald-500" : "text-foreground"}`}>
                        {entry.amount >= 0 ? `+${formatCredits(entry.amount)}` : `-${formatCredits(Math.abs(entry.amount))}`}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">{formatCredits(entry.balanceAfter)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {analytics.purchases.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Storico acquisti</h2>
            <div className="rounded-lg border border-border bg-card divide-y divide-border/50">
              {analytics.purchases.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <div className="font-medium">{OPERATION_DISPLAY_LABELS[entry.operation] || entry.operation}</div>
                    <div className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="font-semibold tabular-nums text-emerald-500">+{formatCredits(entry.amount)}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-semibold tabular-nums">{value}</div>
    </div>
  );
}
