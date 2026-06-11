import { paymentsConfig, type PlanId } from "@/config/payments";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/services/storageService";

/** Build absolute redirect URLs for checkout providers. */
export function resolvePaymentRedirectUrls(): { success: string; cancel: string } {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const successPath = paymentsConfig.successUrl.startsWith("http")
    ? paymentsConfig.successUrl
    : `${origin}${paymentsConfig.successUrl}`;
  const cancelPath = paymentsConfig.cancelUrl.startsWith("http")
    ? paymentsConfig.cancelUrl
    : `${origin}${paymentsConfig.cancelUrl}`;
  return { success: successPath, cancel: cancelPath };
}

/**
 * Append client reference metadata to hosted checkout URLs when the provider supports it.
 * Stripe Payment Links: prefilled_email only (success URL configured in dashboard).
 */
export function buildExternalCheckoutUrl(baseUrl: string, planId: PlanId): string {
  try {
    const url = new URL(baseUrl);
    const userId = getCurrentUserId();
    if (userId && userId !== "public-user" && !userId.startsWith("local-user-")) {
      url.searchParams.set("client_reference_id", userId);
    }
    url.searchParams.set("scriptora_plan", planId);
    return url.toString();
  } catch {
    return baseUrl;
  }
}

/** Provider SDK mode — creates a server-side checkout session (Stripe, etc.). */
export async function startProviderCheckout(planId: PlanId): Promise<{ url: string } | { error: string }> {
  const redirects = resolvePaymentRedirectUrls();
  const { data, error } = await supabase.functions.invoke("create-checkout", {
    body: {
      planId,
      successUrl: redirects.success,
      cancelUrl: redirects.cancel,
    },
  });
  if (error) return { error: error.message };
  if (!data?.ok || !data?.url) {
    return { error: data?.error || "Checkout non disponibile" };
  }
  return { url: data.url as string };
}

/** After redirect from checkout, ask the server to reconcile plan state (webhook may lag). */
export async function refreshPaymentStatus(sessionId?: string | null): Promise<{
  ok: boolean;
  plan?: string;
  pending?: boolean;
  error?: string;
}> {
  const { data, error } = await supabase.functions.invoke("refresh-payment-status", {
    body: { sessionId: sessionId || null },
  });
  if (error) return { ok: false, error: error.message };
  return data as { ok: boolean; plan?: string; pending?: boolean; error?: string };
}
