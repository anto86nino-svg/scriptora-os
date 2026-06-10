import { useEffect, useMemo, useState } from "react";
import { loadCreditWallet } from "@/lib/billing/wallet";
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
    const refresh = () => {
      setWallet(loadCreditWallet());
      setLedgerVersion((v) => v + 1);
    };
    refresh();
    window.addEventListener("scriptora-credits-change", refresh);
    return () => window.removeEventListener("scriptora-credits-change", refresh);
  }, []);

  const analytics: WalletAnalytics = useMemo(
    () => computeWalletAnalytics(wallet, loadCreditLedger()),
    [wallet, ledgerVersion],
  );

  const lowCreditLevel: LowCreditLevel = useMemo(() => getLowCreditLevel(wallet), [wallet]);
  const lowCreditHint = lowCreditMessage(lowCreditLevel);

  return {
    wallet,
    analytics,
    lowCreditLevel,
    lowCreditHint,
    refresh: () => {
      setWallet(loadCreditWallet());
      setLedgerVersion((v) => v + 1);
    },
  };
}
