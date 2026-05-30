import type { GuidedTourStep } from "@/lib/guided-tour";
import { GuidedTourOverlay } from "@/components/GuidedTourOverlay";
import { useFunctionGuidedTour } from "@/hooks/useFunctionGuidedTour";

interface FunctionGuidedTourProps {
  tourId: string;
  steps: GuidedTourStep[];
  enabled: boolean;
  activeWhen?: boolean;
}

export function FunctionGuidedTour({ tourId, steps, enabled, activeWhen = true }: FunctionGuidedTourProps) {
  const tour = useFunctionGuidedTour({ tourId, steps, enabled, activeWhen });

  if (!enabled || steps.length === 0) return null;

  return (
    <GuidedTourOverlay
      active={tour.active}
      stepIndex={tour.stepIndex}
      totalSteps={tour.totalSteps}
      currentStep={tour.currentStep}
      isLastStep={tour.isLastStep}
      onNext={tour.next}
      onBack={tour.back}
      onSkip={tour.skip}
    />
  );
}
