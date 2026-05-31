import { Sparkles, ArrowRight } from "lucide-react";
import type { RequirementGatePayload } from "@/lib/scriptora-requirement-gate";
import { t } from "@/lib/i18n";

interface MissingRequirementCardProps {
  payload: RequirementGatePayload;
  onPrimary?: () => void;
  onSecondary?: () => void;
  compact?: boolean;
  className?: string;
}

export function MissingRequirementCard({
  payload,
  onPrimary,
  onSecondary,
  compact = false,
  className = "",
}: MissingRequirementCardProps) {
  return (
    <div
      className={`scriptora-requirement-card rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] to-transparent p-4 sm:p-5 ${compact ? "p-3" : ""} ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/80">
              {t("req_diagnosis_label")}
            </p>
            <p className="text-sm font-semibold leading-snug text-foreground">{payload.title}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{payload.why}</p>
            {payload.detail && (
              <p className="rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground/80">{t("req_detail_label")}: </span>
                {payload.detail}
              </p>
            )}
            <p className="text-sm leading-relaxed text-foreground/90">
              <span className="font-medium">{t("req_next_step_label")}: </span>
              {payload.actionHint}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={onPrimary}
              className="inline-flex h-11 min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
            >
              {payload.primaryAction.label}
              <ArrowRight className="h-4 w-4 shrink-0" />
            </button>
            {payload.secondaryAction && onSecondary && (
              <button
                type="button"
                onClick={onSecondary}
                className="inline-flex h-11 min-h-[44px] w-full items-center justify-center rounded-lg border border-border bg-background/80 px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground sm:w-auto"
              >
                {payload.secondaryAction.label}
              </button>
            )}
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground/75">
            {t("req_guided_hint")}
          </p>
        </div>
      </div>
    </div>
  );
}
