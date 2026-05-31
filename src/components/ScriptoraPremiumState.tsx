import { ArrowRight, BookOpen, Loader2, Sparkles } from "lucide-react";
import { buildRequirement, type RequirementId } from "@/lib/scriptora-requirement-gate";
import type { RequirementGatePayload } from "@/lib/scriptora-requirement-gate";
import { t } from "@/lib/i18n";

export type ScriptoraPremiumStateVariant =
  | "empty-book"
  | "import-error"
  | "generic-error"
  | "loading-project";

const VARIANT_REQUIREMENT: Record<
  Exclude<ScriptoraPremiumStateVariant, "loading-project">,
  RequirementId
> = {
  "empty-book": "missing_project",
  "import-error": "unexpected_error",
  "generic-error": "unexpected_error",
};

interface ScriptoraPremiumStateProps {
  variant?: ScriptoraPremiumStateVariant;
  payload?: RequirementGatePayload;
  onPrimary?: () => void;
  onSecondary?: () => void;
  detail?: string;
  fullPage?: boolean;
  compact?: boolean;
  className?: string;
  hideFooter?: boolean;
  loadingMessage?: string;
}

function PremiumBackdrop() {
  return (
    <div className="scriptora-premium-state__backdrop" aria-hidden>
      <div className="scriptora-premium-state__wave scriptora-premium-state__wave--a" />
      <div className="scriptora-premium-state__wave scriptora-premium-state__wave--b" />
      <div className="scriptora-premium-state__particles">
        {Array.from({ length: 5 }).map((_, index) => (
          <span key={index} className="scriptora-premium-state__particle" />
        ))}
      </div>
    </div>
  );
}

export function ScriptoraPremiumState({
  variant = "generic-error",
  payload,
  onPrimary,
  onSecondary,
  detail,
  fullPage = false,
  compact = false,
  className = "",
  hideFooter = false,
  loadingMessage,
}: ScriptoraPremiumStateProps) {
  const isLoading = variant === "loading-project";
  const resolvedPayload =
    payload ??
    (isLoading
      ? null
      : buildRequirement(VARIANT_REQUIREMENT[variant as Exclude<ScriptoraPremiumStateVariant, "loading-project">], {
          detail,
        }));

  const rootClass = [
    "scriptora-premium-state",
    fullPage ? "scriptora-premium-state--full" : "",
    compact ? "scriptora-premium-state--compact" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const Icon = isLoading ? Loader2 : variant === "empty-book" ? BookOpen : Sparkles;

  return (
    <div
      className={rootClass}
      role={isLoading ? "status" : "alert"}
      aria-live="polite"
      aria-label={resolvedPayload?.title ?? loadingMessage ?? t("req_loading_project_title")}
    >
      {(fullPage || compact) && <PremiumBackdrop />}

      <div className="scriptora-premium-state__card">
        <div className="scriptora-premium-state__icon" aria-hidden>
          <Icon className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
        </div>

        {!isLoading && resolvedPayload && (
          <>
            <p className="scriptora-premium-state__label">{t("req_diagnosis_label")}</p>
            <h2 className="scriptora-premium-state__title">{resolvedPayload.title}</h2>
            <p className="scriptora-premium-state__text">{resolvedPayload.why}</p>
            {resolvedPayload.detail && (
              <p className="scriptora-premium-state__detail">
                <span className="font-medium text-foreground/80">{t("req_detail_label")}: </span>
                {resolvedPayload.detail}
              </p>
            )}
            <p className="scriptora-premium-state__next">
              <strong>{t("req_next_step_label")}: </strong>
              {resolvedPayload.actionHint}
            </p>

            <div className="scriptora-premium-state__actions">
              {onPrimary && (
                <button
                  type="button"
                  onClick={onPrimary}
                  className="scriptora-premium-state__btn scriptora-premium-state__btn--primary w-full sm:w-auto"
                >
                  {resolvedPayload.primaryAction.label}
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                </button>
              )}
              {resolvedPayload.secondaryAction && onSecondary && (
                <button
                  type="button"
                  onClick={onSecondary}
                  className="scriptora-premium-state__btn scriptora-premium-state__btn--secondary w-full sm:w-auto"
                >
                  {resolvedPayload.secondaryAction.label}
                </button>
              )}
            </div>

            {!hideFooter && (
              <p className="scriptora-premium-state__footer">{t("req_guided_hint")}</p>
            )}
          </>
        )}

        {isLoading && (
          <>
            <p className="scriptora-premium-state__label">{t("req_diagnosis_label")}</p>
            <h2 className="scriptora-premium-state__title">{t("req_loading_project_title")}</h2>
            <p className="scriptora-premium-state__text">
              {loadingMessage ?? t("req_loading_project_why")}
            </p>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="scriptora-premium-state__spinner" aria-hidden />
              <span>{t("req_loading_project_action")}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
