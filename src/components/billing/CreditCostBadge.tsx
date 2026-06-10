import type { BookLength } from "@/types/book";
import type { CreditOperationId } from "@/lib/billing/types";
import { formatCreditCostLabel, formatCreditCostDetail } from "@/lib/billing/creditUx";
import { cn } from "@/lib/utils";

interface CreditCostBadgeProps {
  operation: CreditOperationId;
  bookLength?: BookLength;
  className?: string;
  prominent?: boolean;
}

export function CreditCostBadge({ operation, bookLength, className, prominent = false }: CreditCostBadgeProps) {
  const label = formatCreditCostLabel(operation, bookLength);
  const detail = formatCreditCostDetail(operation, bookLength);
  return (
    <span
      title={detail}
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 font-medium tabular-nums",
        prominent
          ? "border-primary/25 bg-primary/10 text-[11px] text-primary"
          : "border-border/60 bg-muted/30 text-[10px] text-muted-foreground",
        className,
      )}
    >
      {label}
    </span>
  );
}
