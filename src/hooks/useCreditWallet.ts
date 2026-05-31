import { useEffect, useState } from "react";
import {
  getMonthlyCreditsForPlan,
  loadCreditWallet,
  mapPlanTierToScriptoraPlan,
  type CreditWalletSnapshot,
} from "@/lib/billing";
import { usePlan } from "@/lib/plan";

export function useCreditWallet() {
  const { plan } = usePlan();
  const scriptoraPlan = mapPlanTierToScriptoraPlan(plan);
  const [wallet, setWallet] = useState<CreditWalletSnapshot | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      loadCreditWallet(plan)
        .then((snapshot) => {
          if (!cancelled) {
            setWallet(snapshot);
            setFailed(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setWallet(null);
            setFailed(true);
          }
        });
    };

    refresh();
    window.addEventListener("scriptora-credit-wallet-change", refresh);
    window.addEventListener("nexora-plan-change", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("scriptora-credit-wallet-change", refresh);
      window.removeEventListener("nexora-plan-change", refresh);
    };
  }, [plan]);

  const fallbackBalance = getMonthlyCreditsForPlan(scriptoraPlan);

  return {
    wallet,
    failed,
    scriptoraPlan,
    planTier: plan,
    availableCredits: wallet?.availableCredits ?? fallbackBalance,
    planLabel: wallet ? scriptoraPlan : scriptoraPlan,
  };
}
