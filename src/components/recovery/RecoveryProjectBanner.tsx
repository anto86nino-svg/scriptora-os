import { AlertTriangle, RefreshCw, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RecoveryProjectBannerProps = {
  onRecover?: () => void;
  onContinueChapter?: () => void;
  showContinueChapter?: boolean;
  className?: string;
};

export function RecoveryProjectBanner({
  onRecover,
  onContinueChapter,
  showContinueChapter = false,
  className,
}: RecoveryProjectBannerProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 sm:flex-row sm:items-center",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Il tuo lavoro è al sicuro.</p>
          <p className="text-xs text-muted-foreground">
            {showContinueChapter
              ? "Contenuto recuperato. Alcune parti richiedono completamento."
              : "Possiamo ricostruire solo le parti mancanti senza rigenerare ciò che è già valido."}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {showContinueChapter && onContinueChapter && (
          <Button size="sm" variant="default" onClick={onContinueChapter} className="gap-1.5">
            <Play className="h-3.5 w-3.5" />
            Continua capitolo
          </Button>
        )}
        {onRecover && (
          <Button size="sm" variant="outline" onClick={onRecover} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Recupera progetto
          </Button>
        )}
      </div>
    </div>
  );
}
