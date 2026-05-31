import { beforeEach, describe, expect, it } from "vitest";
import {
  dismissOnboarding,
  isOnboardingDismissed,
  ONBOARDING_DISMISSED_KEY,
  shouldShowBetaOnboarding,
} from "./first-visit-onboarding";

describe("first-visit-onboarding", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows beta onboarding for empty library until dismissed", () => {
    expect(shouldShowBetaOnboarding(0)).toBe(true);
    dismissOnboarding();
    expect(isOnboardingDismissed()).toBe(true);
    expect(shouldShowBetaOnboarding(0)).toBe(false);
  });

  it("hides beta onboarding when user has projects", () => {
    expect(shouldShowBetaOnboarding(1)).toBe(false);
  });

  it("persists dismiss flag", () => {
    dismissOnboarding();
    expect(localStorage.getItem(ONBOARDING_DISMISSED_KEY)).toBe("1");
  });
});
