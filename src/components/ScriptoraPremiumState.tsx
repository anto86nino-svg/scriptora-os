import type { ReactNode } from "react";
import { ArrowRight, BookOpen, FolderOpen, Loader2, Shield, Sparkles } from "lucide-react";
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
  label?: string;
  title?: string;
  description?: string;
  nextStep?: string;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  detail?: string;
  fullPage?: boolean;
  inPanel?: boolean;
  compact?: boolean;
  className?: string;
  hideFooter?: boolean;
  hideBrand?: boolean;
  loadingMessage?: string;
  children?: ReactNode;
}

function PremiumParticles() {
  return (
    <div className="scriptora-premium-state__particles" aria-hidden>
      {Array.from({ length: 4 }).map((_, index) => (
        <span key={index} className="scriptora-premium-state__particle" />
      ))}
    </div>
  );
}

function PremiumBrand() {
  return (
    <div className="scriptora-premium-state__brand" aria-hidden>
      <div className="scriptora-premium-state__brand-mark">S</div>
      <p className="scriptora-premium-state__brand-name">SCRIPTORIA</p>
      <p className="scriptora-premium-state__brand-tag">AI STORY DOCTOR</p>
    </div>
  );
}

export function ScriptoraPremiumState({
  variant = "generic-error",
  payload,
  label,
  title,
  description,
  nextStep,
  primaryActionLabel,
  secondaryActionLabel,
  onPrimary,
  onSecondary,
  detail,
  fullPage = false,
  inPanel = false,
  compact = false,
  className = "",
  hideFooter = false,
  hideBrand = false,
  loadingMessage,
  children,
}: ScriptoraPremiumStateProps) {
  const isLoading = variant === "loading-project";
  const basePayload =
    payload ??
    (isLoading
      ? null
      : buildRequirement(VARIANT_REQUIREMENT[variant as Exclude<ScriptoraPremiumStateVariant, "loading-project">], {
          detail,
        }));

  const resolvedLabel = label ?? (isLoading ? t("req_diagnosis_label") : t("req_diagnosis_label"));
  const resolvedTitle =
    title ?? basePayload?.title ?? (isLoading ? t("req_loading_project_title") : "");
  const resolvedDescription =
    description ?? basePayload?.why ?? (isLoading ? loadingMessage ?? t("req_loading_project_why") : "");
  const resolvedNextStep =
    nextStep ?? basePayload?.actionHint ?? (isLoading ? t("req_loading_project_action") : "");
  const resolvedPrimaryLabel = primaryActionLabel ?? basePayload?.primaryAction.label;
  const resolvedSecondaryLabel =
    secondaryActionLabel ?? basePayload?.secondaryAction?.label;

  const rootClass = [
    "scriptora-premium-state",
    fullPage ? "scriptora-premium-state--full" : "",
    inPanel ? "scriptora-premium-state--panel" : "",
    compact ? "scriptora-premium-state--compact" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const Icon = isLoading ? Loader2 : variant === "empty-book" ? BookOpen : Sparkles;
  const showBrand = fullPage && !compact && !hideBrand;
  const showDivider = fullPage && !compact && !isLoading;

  return (
    <div
      className={rootClass}
      role={isLoading ? "status" : "alert"}
      aria-live="polite"
      aria-label={resolvedTitle || t("req_loading_project_title")}
    >
      {fullPage && !compact && <PremiumParticles />}

      <div className="scriptora-premium-state__scene">
        {showBrand && <PremiumBrand />}

        <div className="scriptora-premium-state__card">
          <div className="scriptora-premium-state__icon" aria-hidden>
            <Icon className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
          </div>

          <p className="scriptora-premium-state__label">
            <Sparkles className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
            {resolvedLabel}
          </p>

          <h2 className="scriptora-premium-state__title">{resolvedTitle}</h2>

          {!isLoading && (
            <>
              <p className="scriptora-premium-state__text">{resolvedDescription}</p>

              {(basePayload?.detail || detail) && (
                <p className="scriptora-premium-state__detail">
                  <span className="font-medium text-white/80">{t("req_detail_label")}: </span>
                  {basePayload?.detail ?? detail}
                </p>
              )}

              {showDivider ? (
                <>
                  <div className="scriptora-premium-state__divider">{t("req_next_step_label")}</div>
                  <p className="scriptora-premium-state__next">{resolvedNextStep}</p>
                </>
              ) : (
                <p className="scriptora-premium-state__next">
                  <strong>{t("req_next_step_label")}: </strong>
                  {resolvedNextStep}
                </p>
              )}

              <div className="scriptora-premium-state__actions">
                {onPrimary && resolvedPrimaryLabel && (
                  <button
                    type="button"
                    onClick={onPrimary}
                    className="scriptora-premium-state__btn scriptora-premium-state__btn--primary"
                  >
                    {resolvedPrimaryLabel}
                    <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                  </button>
                )}
                {onSecondary && resolvedSecondaryLabel && (
                  <button
                    type="button"
                    onClick={onSecondary}
                    className="scriptora-premium-state__btn scriptora-premium-state__btn--secondary"
                  >
                    {variant === "empty-book" && (
                      <FolderOpen className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                    )}
                    {resolvedSecondaryLabel}
                  </button>
                )}
              </div>

              {children && <div className="scriptora-premium-state__slot">{children}</div>}

              {!hideFooter && (
                <p className="scriptora-premium-state__footer">
                  <Shield className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                  {t("req_guided_hint")}
                </p>
              )}
            </>
          )}

          {isLoading && (
            <div className="mt-2 flex items-center justify-center gap-2 text-sm text-white/60">
              <span className="scriptora-premium-state__spinner" aria-hidden />
              <span>{resolvedNextStep}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
