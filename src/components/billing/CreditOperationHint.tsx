import { useEffect, useMemo, useState } from "react";
import { Coins } from "lucide-react";
import {
  calculateCreditCost,
  canRunCreditOperation,
  getRecommendedCreditPack,
  isCreditEnforcementActive,
  loadCreditWallet,
  mapPlanTierToScriptoraPlan,
  type CreditCostParams,
} from "@/lib/billing";
import { usePlan } from "@/lib/plan";
import { t, tt } from "@/lib/i18n";

interface CreditOperationHintProps {
  operation: CreditCostParams["operation"];
  intensity?: CreditCostParams["intensity"];
  estimatedWords?: number;
  provider?: CreditCostParams["provider"];
  /** When true, shows available balance if wallet loaded. */
  showBalance?: boolean;
  className?: string;
}

/**
 * Lightweight, non-invasive credit cost hint for paywall-adjacent UI.
 * Does not block actions unless VITE_SCRIPTORA_CREDIT_ENFORCEMENT is enabled server-side parity exists.
 */
export function CreditOperationHint({
  operation,
  intensity,
  estimatedWords,
  provider,
  showBalance = true,
  className = "",
}: CreditOperationHintProps) {
  const { plan } = usePlan();
  const scriptoraPlan = mapPlanTierToScriptoraPlan(plan);
  const [availableCredits, setAvailableCredits] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const applyWallet = (wallet: Awaited<ReturnType<typeof loadCreditWallet>>) => {
      if (!cancelled) setAvailableCredits(wallet.availableCredits);
    };
    loadCreditWallet(plan).then(applyWallet).catch(() => {
      if (!cancelled) setAvailableCredits(null);
    });
    const sync = () => {
      loadCreditWallet(plan).then(applyWallet).catch(() => {
        if (!cancelled) setAvailableCredits(null);
      });
    };
    window.addEventListener("scriptora-credit-wallet-change", sync);
    window.addEventListener("nexora-plan-change", sync);
    return () => {
      cancelled = true;
      window.removeEventListener("scriptora-credit-wallet-change", sync);
      window.removeEventListener("nexora-plan-change", sync);
    };
  }, [plan]);

  const requiredCredits = useMemo(
    () =>
      calculateCreditCost({
        operation,
        plan: scriptoraPlan,
        provider,
        intensity,
        estimatedWords,
      }),
    [operation, scriptoraPlan, provider, intensity, estimatedWords],
  );

  const check = useMemo(() => {
    if (availableCredits == null) {
      return { allowed: true, requiredCredits, missingCredits: 0 };
    }
    return canRunCreditOperation({
      availableCredits,
      operation,
      plan: scriptoraPlan,
      provider,
      intensity,
      estimatedWords,
    });
  }, [availableCredits, operation, scriptoraPlan, provider, intensity, estimatedWords, requiredCredits]);

  const enforce = isCreditEnforcementActive();
  const showShortfall = enforce && !check.allowed;
  const pack = showShortfall ? getRecommendedCreditPack(check.missingCredits) : null;
  const showLengthNote = estimatedWords != null && estimatedWords > 3000;

  return (
    <div
      className={`space-y-0.5 text-[11px] leading-snug text-muted-foreground ${className}`}
      role="note"
    >
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <Coins className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
        <span>{tt("credit_operation_requires", { count: requiredCredits })}</span>
        {showBalance && availableCredits != null && (
          <span className="text-muted-foreground/80">
            · {tt("credit_available_balance", { count: availableCredits })}
          </span>
        )}
        {showShortfall && (
          <>
            <span className="text-amber-600/90 dark:text-amber-300/90">
              {tt("credit_missing", { count: check.missingCredits })}
            </span>
            <span>{t("credit_top_up_hint")}</span>
            {pack && (
              <span className="text-muted-foreground/75">
                ({pack.label} · €{pack.priceEur.toFixed(2).replace(".", ",")})
              </span>
            )}
          </>
        )}
      </p>
      {showLengthNote && (
        <p className="pl-[1.125rem] text-[10px] italic text-muted-foreground/75">
          {t("credit_cost_varies_by_length")}
        </p>
      )}
      {!enforce && (
        <p className="pl-[1.125rem] text-[10px] text-muted-foreground/65">
          {t("credit_server_control_note")}
        </p>
      )}
    </div>
  );
}
