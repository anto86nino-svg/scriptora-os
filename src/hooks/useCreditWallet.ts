import { useEffect, useMemo, useState } from "react";
import { loadCreditWallet } from "@/lib/billing/wallet";
import { fetchServerWalletState } from "@/lib/billing/serverWallet";
import { getBillingExecutionMode } from "@/lib/billing/billingMode";
import { loadCreditLedger } from "@/lib/billing/ledger";
import {
  computeWalletAnalytics,
  getLowCreditLevel,
  lowCreditMessage,
  type WalletAnalytics,
  type LowCreditLevel,
} from "@/lib/billing/walletAnalytics";
import type { CreditWallet } from "@/lib/billing/types";

export function useCreditWallet() {
  const [wallet, setWallet] = useState<CreditWallet>(() => loadCreditWallet());
  const [ledgerVersion, setLedgerVersion] = useState(0);

  useEffect(() => {
    const refresh = async () => {
      if (getBillingExecutionMode() === "server") {
        await fetchServerWalletState().catch(() => null);
      }
      setWallet(loadCreditWallet());
      setLedgerVersion((v) => v + 1);
    };
    void refresh();
    const onRefresh = () => { void refresh(); };
    window.addEventListener("scriptora-credits-change", onRefresh);
    return () => window.removeEventListener("scriptora-credits-change", onRefresh);
  }, []);

  const analytics: WalletAnalytics = useMemo(
    () => computeWalletAnalytics(wallet, loadCreditLedger()),
    [wallet, ledgerVersion],
  );

  const lowCreditLevel: LowCreditLevel = useMemo(() => getLowCreditLevel(wallet), [wallet]);
  const lowCreditHint = lowCreditMessage(lowCreditLevel);

  const refreshFromSource = async () => {
    if (getBillingExecutionMode() === "server") {
      await fetchServerWalletState().catch(() => null);
    }
    setWallet(loadCreditWallet());
    setLedgerVersion((v) => v + 1);
  };

  return {
    wallet,
    analytics,
    lowCreditLevel,
    lowCreditHint,
    refresh: () => { void refreshFromSource(); },
  };
}
