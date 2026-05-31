export type PremiumActivationVariant = "wallet" | "credits" | "plan";

export const PREMIUM_ACTIVATION_EVENT = "scriptora-premium-activation-notice";

export interface PremiumActivationDetail {
  variant: PremiumActivationVariant;
}

export function showPremiumActivationNotice(variant: PremiumActivationVariant = "wallet"): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(PREMIUM_ACTIVATION_EVENT, {
      detail: { variant } satisfies PremiumActivationDetail,
    }),
  );
}
