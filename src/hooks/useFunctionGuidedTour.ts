import { useCallback, useEffect, useRef, useState } from "react";
import type { GuidedTourStep } from "@/lib/guided-tour";
import { GUIDED_TOUR_REQUEST_EVENT, type GuidedTourId } from "@/lib/guided-tour-events";

interface UseFunctionGuidedTourOptions {
  tourId: GuidedTourId | string;
  steps: GuidedTourStep[];
  enabled: boolean;
  activeWhen?: boolean;
}

export function useFunctionGuidedTour({
  tourId,
  steps,
  enabled,
  activeWhen = true,
}: UseFunctionGuidedTourOptions) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const dismissLockRef = useRef(false);

  useEffect(() => {
    if (!activeWhen) {
      setSessionComplete(false);
      setActive(false);
      setStepIndex(0);
    }
  }, [activeWhen]);

  useEffect(() => {
    if (!enabled) setActive(false);
  }, [enabled]);

  const start = useCallback(() => {
    if (!enabled || !activeWhen || steps.length === 0) return;
    dismissLockRef.current = false;
    setSessionComplete(false);
    setStepIndex(0);
    setActive(true);
  }, [enabled, activeWhen, steps.length]);

  useEffect(() => {
    const handler = (event: Event) => {
      const requestedTourId = (event as CustomEvent<{ tourId?: string }>).detail?.tourId;
      if (requestedTourId !== tourId) return;
      start();
    };

    window.addEventListener(GUIDED_TOUR_REQUEST_EVENT, handler);
    return () => window.removeEventListener(GUIDED_TOUR_REQUEST_EVENT, handler);
  }, [tourId, start]);

  useEffect(() => {
    if (!active) return;
    steps[stepIndex]?.onEnter?.();
  }, [active, stepIndex, steps]);

  const dismiss = useCallback(() => {
    if (dismissLockRef.current) return;
    dismissLockRef.current = true;
    setSessionComplete(true);
    setActive(false);
    window.setTimeout(() => {
      dismissLockRef.current = false;
    }, 180);
  }, []);

  const skip = useCallback(() => {
    dismiss();
  }, [dismiss]);

  const back = useCallback(() => {
    setStepIndex((current) => Math.max(0, current - 1));
  }, []);

  const next = useCallback(() => {
    setStepIndex((current) => {
      if (current >= steps.length - 1) {
        window.setTimeout(() => dismiss(), 0);
        return current;
      }
      return current + 1;
    });
  }, [dismiss, steps.length]);

  const isLastStep = stepIndex >= steps.length - 1;

  return {
    active,
    stepIndex,
    currentStep: steps[stepIndex] ?? null,
    skip,
    back,
    next,
    start,
    isLastStep,
    totalSteps: steps.length,
  };
}
