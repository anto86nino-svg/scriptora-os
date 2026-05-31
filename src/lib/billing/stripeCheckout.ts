import { invokeSupabaseFunction } from "@/lib/supabase-function-auth";
import type { ScriptoraPlan } from "@/lib/billing/creditPolicy";
import { captureException } from "@/lib/monitoring";
import { trackEvent } from "@/lib/analytics";

export type StripeCheckoutType = "subscription" | "credit_pack";

export type StripeCheckoutResult =
  | { status: "redirect"; url: string }
  | { status: "not_configured" }
  | { status: "error"; message: string };

export interface StartStripeCheckoutInput {
  type: StripeCheckoutType;
  planKey?: ScriptoraPlan;
  packId?: string;
  successUrl?: string;
  cancelUrl?: string;
}

interface CheckoutSessionResponse {
  ok?: boolean;
  url?: string;
  code?: string;
  error?: string;
}

function defaultSuccessUrl(): string {
  if (typeof window === "undefined") return "/pricing?checkout=success";
  return `${window.location.origin}/pricing?checkout=success`;
}

function defaultCancelUrl(): string {
  if (typeof window === "undefined") return "/pricing?checkout=cancelled";
  return `${window.location.origin}/pricing?checkout=cancelled`;
}

/** Map credit pack size to server packId (mirrors stripe-config CREDIT_PACK_CATALOG). */
export function creditsToPackId(credits: number): string {
  return `credits_${credits}`;
}

/** Paid commercial plans only — free has no checkout. */
export function isPaidScriptoraPlan(planId: ScriptoraPlan): boolean {
  return planId !== "free";
}

export async function startStripeCheckout(
  input: StartStripeCheckoutInput,
): Promise<StripeCheckoutResult> {
  const { data, error } = await invokeSupabaseFunction<CheckoutSessionResponse>(
    "create-stripe-checkout-session",
    {
      body: {
        type: input.type,
        planKey: input.planKey,
        packId: input.packId,
        successUrl: input.successUrl ?? defaultSuccessUrl(),
        cancelUrl: input.cancelUrl ?? defaultCancelUrl(),
      },
    },
  );

  if (error) {
    captureException(error, { area: "checkout", extra: { type: input.type, planKey: input.planKey, packId: input.packId } });
    if (/checkout_not_configured/i.test(error.message)) {
      return { status: "not_configured" };
    }
    return { status: "error", message: error.message };
  }

  if (data?.code === "checkout_not_configured") {
    return { status: "not_configured" };
  }

  if (!data?.ok || !data.url) {
    return { status: "error", message: data?.error || "Checkout unavailable" };
  }

  return { status: "redirect", url: data.url };
}

export async function redirectToStripeCheckout(
  input: StartStripeCheckoutInput,
): Promise<"redirected" | "not_configured" | "error"> {
  trackEvent("checkout_started", {
    type: input.type,
    plan: input.planKey ?? "",
    pack: input.packId ?? "",
  });

  const result = await startStripeCheckout(input);
  if (result.status === "redirect") {
    window.location.href = result.url;
    return "redirected";
  }
  if (result.status === "not_configured") return "not_configured";
  if (result.status === "error") {
    captureException(new Error(result.message), { area: "checkout", extra: { stage: "redirect" } });
  }
  return "error";
}
