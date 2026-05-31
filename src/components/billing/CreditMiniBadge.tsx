import { cn } from "@/lib/utils";
import { t, tt } from "@/lib/i18n";
import { Coins } from "lucide-react";

interface CreditMiniBadgeProps {
  credits: number;
  className?: string;
}

/** Informative, non-blocking credit cost badge for launch paths and actions. */
export function CreditMiniBadge({ credits, className }: CreditMiniBadgeProps) {
  const label =
    credits === 0
      ? t("credit_cost_free")
      : tt("credit_cost_from", { count: credits });

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-100/90",
        className,
      )}
    >
      <Coins className="h-2.5 w-2.5 shrink-0 opacity-80" aria-hidden />
      {label}
    </span>
  );
}
