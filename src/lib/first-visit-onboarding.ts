import { GUIDED_FLOW_KEY, writeGuidedFlowEnabled } from "@/lib/guided-flow";

export const ONBOARDING_DISMISSED_KEY = "scriptora-beta-onboarding-dismissed";
export const FIRST_SESSION_KEY = "scriptora-first-session-seen";

export function isOnboardingDismissed(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissOnboarding(): void {
  try {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** First dashboard visit: enable step guide so new authors aren't lost. */
export function ensureFirstVisitGuidedFlow(): void {
  try {
    if (localStorage.getItem(GUIDED_FLOW_KEY)) return;
    if (localStorage.getItem(FIRST_SESSION_KEY)) return;
    localStorage.setItem(FIRST_SESSION_KEY, "1");
    writeGuidedFlowEnabled(true);
  } catch {
    /* ignore */
  }
}

export function shouldShowBetaOnboarding(projectsCount: number): boolean {
  return projectsCount === 0 && !isOnboardingDismissed();
}
