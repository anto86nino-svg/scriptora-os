import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { t, tt } from "@/lib/i18n";
import { useCreditWallet } from "@/hooks/useCreditWallet";

interface CreditsBalanceBadgeProps {
  className?: string;
  onClick?: () => void;
}

/** Compact credit balance for dashboard / header toolbars. */
export function CreditsBalanceBadge({ className, onClick }: CreditsBalanceBadgeProps) {
  const navigate = useNavigate();
  const { availableCredits, failed, isLocalFallback } = useCreditWallet();

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    navigate("/pricing");
  };

  if (failed) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "inline-flex h-8 shrink-0 items-center rounded-lg border border-white/10 bg-white/[0.07] px-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-white/[0.12] hover:text-foreground",
          className,
        )}
        title={t("credits_scriptora_title")}
      >
        {t("credits_label_short")}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex h-8 max-w-[120px] shrink-0 items-center gap-1 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 text-[11px] font-semibold text-amber-100/95 transition-colors hover:bg-amber-500/15 sm:max-w-none sm:px-2.5",
        className,
      )}
      title={
        isLocalFallback
          ? t("credits_wallet_local_estimate")
          : tt("credits_balance_available", { count: availableCredits })
      }
    >
      <Sparkles className="hidden h-3 w-3 shrink-0 text-amber-200/90 sm:block" aria-hidden />
      <span className="hidden sm:inline">
        {tt("credits_header_desktop", { count: availableCredits })}
      </span>
      <span className="sm:hidden">{availableCredits}</span>
    </button>
  );
}
