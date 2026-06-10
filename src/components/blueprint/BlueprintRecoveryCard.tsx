import { useState } from "react";
import { AlertTriangle, ChevronDown, RefreshCw, Shield, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface BlueprintRecoveryCardProps {
  errorMessage?: string | null;
  validationErrors?: string[];
  isGenerating?: boolean;
  onRegenerate: () => void;
  onCreateSafe: () => void;
  className?: string;
}

const GENERATION_STEPS = [
  "Analisi idea e genere",
  "Mappa capitoli",
  "Controllo schema",
  "Validazione struttura",
  "Salvataggio",
] as const;

export function BlueprintRecoveryCard({
  errorMessage,
  validationErrors = [],
  isGenerating = false,
  onRegenerate,
  onCreateSafe,
  className,
}: BlueprintRecoveryCardProps) {
  const [showTechnical, setShowTechnical] = useState(false);

  if (isGenerating) {
    return (
      <div className={cn("rounded-xl border border-primary/30 bg-primary/10 p-4 space-y-3", className)}>
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Sparkles className="h-4 w-4 animate-pulse" />
          Sto creando la struttura…
        </div>
        <ol className="space-y-1.5">
          {GENERATION_STEPS.map((step, index) => (
            <li key={step} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-amber-500/35 bg-amber-500/10 p-4 space-y-3", className)}>
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <div>
          <h3 className="text-sm font-bold text-foreground">Blueprint non valido</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Scriptora ha bloccato il salvataggio perché la struttura generata non era completa. Il tuo libro non è stato corrotto.
          </p>
          {errorMessage && (
            <p className="mt-2 text-xs text-amber-100/90">{errorMessage}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onRegenerate}
          className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Rigenera Blueprint
        </button>
        <button
          type="button"
          onClick={onCreateSafe}
          className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted/40"
        >
          <Shield className="h-3.5 w-3.5" />
          Crea struttura base sicura
        </button>
      </div>

      {(validationErrors.length > 0 || errorMessage) && (
        <div>
          <button
            type="button"
            onClick={() => setShowTechnical((open) => !open)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={cn("h-3 w-3 transition-transform", showTechnical && "rotate-180")} />
            Mostra dettagli tecnici
          </button>
          {showTechnical && (
            <ul className="mt-2 space-y-1 rounded-lg border border-border/60 bg-background/50 p-3 text-[11px] text-muted-foreground">
              {validationErrors.map((err) => (
                <li key={err}>• {err}</li>
              ))}
              {!validationErrors.length && errorMessage && <li>• {errorMessage}</li>}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
