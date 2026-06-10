import { isPaymentsLive, paymentsConfig } from "@/config/payments";
import type { BillingPurchaseResult, PaymentProviderId } from "./types";

function readEnv(key: string, fallback = ""): string {
  try {
    const value = import.meta.env[key];
    return typeof value === "string" ? value : fallback;
  } catch {
    return fallback;
  }
}

export function resolvePaymentProvider(): PaymentProviderId {
  const env = String(import.meta.env.VITE_PAYMENT_PROVIDER || "dev").toLowerCase();
  if (env === "stripe" || env === "lemon") return env;
  if (isPaymentsLive()) {
    const provider = paymentsConfig.provider;
    if (provider === "stripe" || provider === "lemonsqueezy") return provider === "lemonsqueezy" ? "lemon" : "stripe";
    if (provider === "paddle" || provider === "paypal") return "stripe";
  }
  if (env === "dev") return "dev";
  return "dev";
}

function resolveCreditsCheckoutUrl(amount: number): string | null {
  const amountUrl = readEnv(`VITE_PAYMENT_CREDITS_URL_${amount}`);
  if (amountUrl) return amountUrl;
  const genericUrl = readEnv("VITE_PAYMENT_CREDITS_URL");
  if (genericUrl) return genericUrl;
  const stripeUrl = readEnv("VITE_STRIPE_CREDITS_URL");
  return stripeUrl || null;
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

  async purchaseCredits(amount: number): Promise<BillingPurchaseResult> {
    const checkoutUrl = resolveCreditsCheckoutUrl(amount);
    if (isPaymentsLive() && paymentsConfig.mode === "external_links" && checkoutUrl) {
      window.open(checkoutUrl, "_blank", "noopener,noreferrer");
      return {
        ok: true,
        creditsAdded: 0,
        balanceAfter: 0,
        provider: "stripe",
        simulated: false,
      };
    }
    return {
      ok: false,
      creditsAdded: 0,
      balanceAfter: 0,
      provider: "stripe",
      simulated: false,
      error: "Checkout Stripe non configurato. Imposta VITE_ENABLE_PAYMENTS=true, VITE_PAYMENT_MODE=external_links e VITE_PAYMENT_CREDITS_URL.",
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
