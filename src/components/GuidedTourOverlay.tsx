import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, ChevronLeft, Compass, X } from "lucide-react";
import type { GuidedTourPlacement, GuidedTourStep } from "@/lib/guided-tour";
import { t, tt } from "@/lib/i18n";

interface GuidedTourOverlayProps {
  active: boolean;
  stepIndex: number;
  totalSteps: number;
  currentStep: GuidedTourStep | null;
  isLastStep: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

type ResolvedPlacement = Exclude<GuidedTourPlacement, "auto">;

const SPOTLIGHT_PAD = 18;
const SPOTLIGHT_SCALE = 1.08;
const TARGET_ACTIVE_CLASS = "scriptora-guided-tour-target-active";

function resolvePlacement(rect: DOMRect, preferred: GuidedTourPlacement = "auto"): ResolvedPlacement {
  if (preferred !== "auto") return preferred;

  const spaceTop = rect.top;
  const spaceBottom = window.innerHeight - rect.bottom;
  const spaceLeft = rect.left;
  const spaceRight = window.innerWidth - rect.right;

  const best = [
    { placement: "bottom" as const, space: spaceBottom },
    { placement: "top" as const, space: spaceTop },
    { placement: "right" as const, space: spaceRight },
    { placement: "left" as const, space: spaceLeft },
  ].sort((a, b) => b.space - a.space)[0];

  return best?.placement ?? "bottom";
}

function buildSpotlightStyle(rect: DOMRect) {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const width = rect.width * SPOTLIGHT_SCALE + SPOTLIGHT_PAD * 2;
  const height = rect.height * SPOTLIGHT_SCALE + SPOTLIGHT_PAD * 2;

  return {
    top: Math.max(8, centerY - height / 2),
    left: Math.max(8, centerX - width / 2),
    width: Math.min(window.innerWidth - 16, width),
    height: Math.min(window.innerHeight - 16, height),
  };
}

function getTooltipPosition(rect: DOMRect, placement: ResolvedPlacement) {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  switch (placement) {
    case "top":
      return { top: rect.top - 16, left: centerX, transform: "translate(-50%, -100%)" };
    case "bottom":
      return { top: rect.bottom + 16, left: centerX, transform: "translate(-50%, 0)" };
    case "left":
      return { top: centerY, left: rect.left - 16, transform: "translate(-100%, -50%)" };
    case "right":
      return { top: centerY, left: rect.right + 16, transform: "translate(0, -50%)" };
    default:
      return { top: rect.bottom + 16, left: centerX, transform: "translate(-50%, 0)" };
  }
}

export function GuidedTourOverlay({
  active,
  stepIndex,
  totalSteps,
  currentStep,
  isLastStep,
  onNext,
  onBack,
  onSkip,
}: GuidedTourOverlayProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [placement, setPlacement] = useState<ResolvedPlacement>("bottom");
  const [missingTarget, setMissingTarget] = useState(false);

  useLayoutEffect(() => {
    if (!active || !currentStep) {
      setRect(null);
      setMissingTarget(false);
      return;
    }

    let highlightedElement: Element | null = null;

    const clearHighlight = () => {
      highlightedElement?.classList.remove(TARGET_ACTIVE_CLASS);
      highlightedElement = null;
    };

    const updateRect = () => {
      clearHighlight();

      if (!currentStep.target) {
        setRect(null);
        setMissingTarget(false);
        return;
      }

      const element = document.querySelector(currentStep.target);
      if (!element) {
        setRect(null);
        setMissingTarget(true);
        return;
      }

      highlightedElement = element;
      element.classList.add(TARGET_ACTIVE_CLASS);

      element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      window.setTimeout(() => {
        const nextRect = element.getBoundingClientRect();
        setRect(nextRect);
        setMissingTarget(false);
        setPlacement(resolvePlacement(nextRect, currentStep.placement));
      }, 260);
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      clearHighlight();
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [active, currentStep, stepIndex]);

  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);

  const tooltipStyle = useMemo(() => {
    if (!rect) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }
    return getTooltipPosition(rect, placement);
  }, [placement, rect]);

  const handleAction = (action: () => void) => (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    action();
  };

  if (!active || !currentStep || typeof document === "undefined") return null;

  const spotlightStyle = rect ? buildSpotlightStyle(rect) : null;
  const hasTarget = Boolean(rect && spotlightStyle);

  return createPortal(
    <div className="scriptora-guided-tour-root" role="dialog" aria-modal="true" aria-label={currentStep.title}>
      {!hasTarget && <div className="scriptora-guided-tour-backdrop" aria-hidden="true" />}

      {spotlightStyle && (
        <>
          <div className="scriptora-guided-tour-spotlight" style={spotlightStyle} />
          <div className="scriptora-guided-tour-pointer" style={spotlightStyle} aria-hidden="true">
            <span className="scriptora-guided-tour-pointer-arrow" data-placement={placement} />
          </div>
        </>
      )}

      <div
        className={`scriptora-guided-tour-tooltip ${rect ? "has-target" : "is-centered"}`}
        style={tooltipStyle}
      >
        <div className="scriptora-guided-tour-tooltip-head">
          <span className="scriptora-guided-tour-tooltip-icon">
            <Compass className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="scriptora-guided-tour-kicker">
              {tt("guided_tour_step_counter", { current: stepIndex + 1, total: totalSteps })}
            </p>
            <h3 className="scriptora-guided-tour-title">{currentStep.title}</h3>
          </div>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleAction(onSkip)}
            className="scriptora-guided-tour-close"
            aria-label={t("guided_tour_skip")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="scriptora-guided-tour-description">{currentStep.description}</p>

        {missingTarget && (
          <p className="scriptora-guided-tour-missing">{t("guided_tour_target_missing")}</p>
        )}

        <div className="scriptora-guided-tour-actions">
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleAction(onSkip)}
            className="scriptora-guided-tour-skip"
          >
            {t("guided_tour_skip")}
          </button>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={handleAction(onBack)}
                className="scriptora-guided-tour-back"
              >
                <ChevronLeft className="h-4 w-4" />
                {t("back")}
              </button>
            )}
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={handleAction(onNext)}
              className="scriptora-modal-cta-primary scriptora-guided-tour-next"
            >
              {isLastStep ? t("guided_tour_finish") : t("guided_tour_next")}
              {!isLastStep && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
