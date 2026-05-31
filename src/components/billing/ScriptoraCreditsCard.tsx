import { useNavigate } from "react-router-dom";
import { Coins, Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { t, tt } from "@/lib/i18n";
import { useCreditWallet } from "@/hooks/useCreditWallet";
import { getCommercialPlanLabel } from "@/lib/billing/commercialPlans";
import { showPremiumActivationNotice } from "@/lib/billing/premiumActivation";

interface ScriptoraCreditsCardProps {
  className?: string;
}

/** Premium glass card showing Scriptora credit wallet on the dashboard gateway. */
export function ScriptoraCreditsCard({ className }: ScriptoraCreditsCardProps) {
  const navigate = useNavigate();
  const { availableCredits, scriptoraPlan, failed } = useCreditWallet();
  const planLabel = getCommercialPlanLabel(scriptoraPlan);

  return (
    <section
      className={cn(
        "scriptora-credits-card ios-panel relative overflow-hidden rounded-[22px] border border-white/12 bg-white/[0.05] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-5",
        className,
      )}
      aria-label={t("credits_scriptora_title")}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/[0.08] via-transparent to-sky-500/[0.06]"
        aria-hidden
      />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="ios-icon ios-icon-pink flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px]">
              <Coins className="h-5 w-5 text-amber-200" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-foreground sm:text-base">{t("credits_scriptora_title")}</h2>
              <p className="text-[11px] text-muted-foreground sm:text-xs">
                {tt("credits_current_plan", { plan: planLabel })}
              </p>
            </div>
          </div>

          <p className="text-lg font-black tracking-tight text-foreground sm:text-xl">
            {failed
              ? t("credits_label_short")
              : tt("credits_balance_available", { count: availableCredits })}
          </p>

          <p className="max-w-xl text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
            {t("credits_fuel_copy")}
          </p>

          <p className="text-[10px] leading-relaxed text-muted-foreground/75 italic sm:text-[11px]">
            {t("credits_wallet_pending_note")}
          </p>
        </div>

        <div className="flex shrink-0 flex-row gap-2 sm:flex-col sm:items-stretch">
          <button
            type="button"
            onClick={() => showPremiumActivationNotice("wallet")}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.08] px-3 py-2 text-[11px] font-semibold text-foreground transition-colors hover:bg-white/[0.12] sm:flex-none sm:min-w-[130px] sm:text-xs"
          >
            {t("credits_manage")}
            <ArrowRight className="h-3 w-3 opacity-70" />
          </button>
          <button
            type="button"
            onClick={() => navigate("/pricing")}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary/35 bg-primary/15 px-3 py-2 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/25 sm:flex-none sm:min-w-[130px] sm:text-xs"
          >
            <Sparkles className="h-3 w-3" />
            {t("credits_view_plans")}
          </button>
        </div>
      </div>
    </section>
  );
}
