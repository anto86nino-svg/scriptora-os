// Creates a hosted checkout session (Stripe Checkout). Used when VITE_PAYMENT_MODE=provider_sdk.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  checkoutPlanToTier,
  resolveCheckoutPlanPriceId,
  type CheckoutPlanId,
} from "../_shared/payment-plan-mapping.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_PLANS = new Set([
  "pro_monthly",
  "pro_yearly",
  "premium_monthly",
  "premium_yearly",
  "lifetime",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ ok: false, error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const planId = String(body.planId || "") as CheckoutPlanId;
    const successUrl = String(body.successUrl || "");
    const cancelUrl = String(body.cancelUrl || "");

    if (!VALID_PLANS.has(planId)) {
      return json({ ok: false, error: "Invalid plan" }, 400);
    }
    if (!successUrl || !cancelUrl) {
      return json({ ok: false, error: "Missing redirect URLs" }, 400);
    }

    const provider = (Deno.env.get("PAYMENT_PROVIDER") || "stripe").toLowerCase();
    if (provider !== "stripe") {
      return json({
        ok: false,
        error: `provider_sdk checkout not implemented for ${provider}. Use external_links mode.`,
      }, 501);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const priceId = resolveCheckoutPlanPriceId(planId);
    if (!stripeKey) return json({ ok: false, error: "STRIPE_SECRET_KEY not configured" }, 503);
    if (!priceId) return json({ ok: false, error: `Price ID not configured for ${planId}` }, 503);

    const user = authData.user;
    const params = new URLSearchParams();
    params.set("mode", planId === "lifetime" ? "payment" : "subscription");
    params.set("success_url", appendSessionPlaceholder(successUrl));
    params.set("cancel_url", cancelUrl);
    params.set("client_reference_id", user.id);
    params.set("customer_email", user.email || "");
    params.set("line_items[0][price]", priceId);
    params.set("line_items[0][quantity]", "1");
    params.set("metadata[scriptora_plan]", planId);
    params.set("metadata[scriptora_tier]", checkoutPlanToTier(planId));
    params.set("metadata[supabase_user_id]", user.id);

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();
    if (!stripeRes.ok) {
      return json({ ok: false, error: session?.error?.message || "Stripe error" }, 502);
    }

    return json({ ok: true, url: session.url, sessionId: session.id });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function appendSessionPlaceholder(url: string): string {
  const joiner = url.includes("?") ? "&" : "?";
  return `${url}${joiner}session_id={CHECKOUT_SESSION_ID}`;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
