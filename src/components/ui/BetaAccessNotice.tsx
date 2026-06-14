import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type BetaAccessNoticeProps = {
  title?: string;
  message: string;
  className?: string;
  compact?: boolean;
};

export function BetaAccessNotice({
  title = "Beta privata",
  message,
  className,
  compact = false,
}: BetaAccessNoticeProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-primary/25 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent",
        compact ? "px-3 py-2.5" : "px-4 py-3",
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary",
          compact ? "h-7 w-7" : "h-8 w-8",
        )}>
          <Sparkles className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("font-bold text-foreground", compact ? "text-xs" : "text-sm")}>{title}</span>
            <span className="rounded-full border border-primary/30 bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
              Accesso anticipato
            </span>
          </div>
          <p className={cn("mt-1 leading-relaxed text-muted-foreground", compact ? "text-[11px]" : "text-xs")}>
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
