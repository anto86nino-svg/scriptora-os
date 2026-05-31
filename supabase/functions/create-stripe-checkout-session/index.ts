import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { applyAuthContext, enforceEdgeGuard, EDGE_GUARD_PROFILES } from "../_shared/edge-guard.ts";
import {
  CREDIT_PACK_CATALOG,
  getSiteUrl,
  isCreditPackId,
  isStripeConfigured,
  isSubscriptionPlanKey,
  resolveStripePriceId,
  SUBSCRIPTION_CATALOG,
} from "../_shared/stripe-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json().catch(() => ({})) as Record<string, unknown>;
    const guard = await enforceEdgeGuard(
      req,
      rawBody,
      EDGE_GUARD_PROFILES["create-stripe-checkout-session"],
    );
    if (guard instanceof Response) return guard;
    applyAuthContext(guard, rawBody);

    if (!isStripeConfigured()) {
      return json({ ok: false, code: "checkout_not_configured", error: "Stripe is not configured" }, 503);
    }

    const checkoutType = String(rawBody.type || "").trim();
    const planKey = String(rawBody.planKey || "").trim();
    const packId = String(rawBody.packId || "").trim();
    const siteUrl = getSiteUrl();
    const successUrl = String(rawBody.successUrl || `${siteUrl}/pricing?checkout=success`);
    const cancelUrl = String(rawBody.cancelUrl || `${siteUrl}/pricing?checkout=cancelled`);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    const metadata: Record<string, string> = {
      user_id: guard.userId,
      scriptora_checkout_type: checkoutType,
    };

    let session: Stripe.Checkout.Session;

    if (checkoutType === "subscription") {
      if (!isSubscriptionPlanKey(planKey)) {
        return json({ ok: false, error: "Invalid planKey" }, 400);
      }

      const catalog = SUBSCRIPTION_CATALOG[planKey];
      const priceId = resolveStripePriceId(catalog.priceEnvKey);
      if (!priceId) {
        return json({ ok: false, code: "checkout_not_configured", error: "Plan price not configured" }, 503);
      }

      metadata.plan_key = planKey;
      metadata.scriptora_plan = planKey;

      session = await stripe.checkout.sessions.create({
        mode: "subscription",
        client_reference_id: guard.userId,
        customer_email: guard.email,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
        subscription_data: { metadata },
      });
    } else if (checkoutType === "credit_pack") {
      if (!isCreditPackId(packId)) {
        return json({ ok: false, error: "Invalid packId" }, 400);
      }

      const catalog = CREDIT_PACK_CATALOG[packId];
      const priceId = resolveStripePriceId(catalog.priceEnvKey);
      if (!priceId) {
        return json({ ok: false, code: "checkout_not_configured", error: "Pack price not configured" }, 503);
      }

      metadata.pack_id = packId;
      metadata.credit_pack_credits = String(catalog.credits);

      session = await stripe.checkout.sessions.create({
        mode: "payment",
        client_reference_id: guard.userId,
        customer_email: guard.email,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
      });
    } else {
      return json({ ok: false, error: "Invalid checkout type" }, 400);
    }

    if (!session.url) {
      return json({ ok: false, error: "Checkout session missing URL" }, 500);
    }

    return json({ ok: true, url: session.url, sessionId: session.id });
  } catch (e) {
    return json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      500,
    );
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
