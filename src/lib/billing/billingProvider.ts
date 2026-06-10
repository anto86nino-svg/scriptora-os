import type { BillingPurchaseResult, PaymentProviderId } from "./types";

export function resolvePaymentProvider(): PaymentProviderId {
  const env = String(import.meta.env.VITE_PAYMENT_PROVIDER || "dev").toLowerCase();
  if (env === "stripe" || env === "lemon" || env === "dev") return env;
  return "dev";
}

export interface BillingProvider {
  id: PaymentProviderId;
  purchaseCredits(amount: number, packLabel?: string): Promise<BillingPurchaseResult>;
}

class DevBillingProvider implements BillingProvider {
  id: PaymentProviderId = "dev";

  async purchaseCredits(amount: number): Promise<BillingPurchaseResult> {
    return {
      ok: true,
      creditsAdded: amount,
      balanceAfter: 0,
      provider: "dev",
      simulated: true,
    };
  }
}

class StripeBillingProvider implements BillingProvider {
  id: PaymentProviderId = "stripe";

  async purchaseCredits(): Promise<BillingPurchaseResult> {
    return {
      ok: false,
      creditsAdded: 0,
      balanceAfter: 0,
      provider: "stripe",
      simulated: false,
      error: "Stripe checkout not activated yet. Set PAYMENT_PROVIDER=dev for local testing.",
    };
  }
}

class LemonBillingProvider implements BillingProvider {
  id: PaymentProviderId = "lemon";

  async purchaseCredits(): Promise<BillingPurchaseResult> {
    return {
      ok: false,
      creditsAdded: 0,
      balanceAfter: 0,
      provider: "lemon",
      simulated: false,
      error: "Lemon Squeezy checkout not activated yet. Set PAYMENT_PROVIDER=dev for local testing.",
    };
  }
}

export function getBillingProvider(): BillingProvider {
  const id = resolvePaymentProvider();
  if (id === "stripe") return new StripeBillingProvider();
  if (id === "lemon") return new LemonBillingProvider();
  return new DevBillingProvider();
}
