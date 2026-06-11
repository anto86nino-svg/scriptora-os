// Reconciles plan after checkout redirect while webhook delivery may still be in flight.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  checkoutPlanToTier,
  resolveTierFromStripePrice,
} from "../_shared/payment-plan-mapping.ts";
import { applySubscriptionPlan, createServiceClient } from "../_shared/payment-sync.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ ok: false, error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData?.user) return json({ ok: false, error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const sessionId = body.sessionId ? String(body.sessionId) : null;
    const userId = authData.user.id;

    const service = createServiceClient();
    const { data: planRow } = await service
      .from("user_plans")
      .select("plan, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (planRow?.plan && planRow.plan !== "free") {
      return json({ ok: true, plan: planRow.plan, pending: false });
    }

    if (!sessionId) {
      return json({ ok: true, plan: planRow?.plan || "free", pending: true });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    if (!stripeKey) {
      return json({ ok: true, plan: planRow?.plan || "free", pending: true });
    }

    const stripeRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      { headers: { Authorization: `Bearer ${stripeKey}` } },
    );
    const session = await stripeRes.json();
    if (!stripeRes.ok) {
      return json({ ok: false, error: session?.error?.message || "Stripe lookup failed" }, 502);
    }

    if (session.client_reference_id && session.client_reference_id !== userId) {
      return json({ ok: false, error: "Session does not belong to this user" }, 403);
    }

    if (session.payment_status !== "paid" && session.status !== "complete") {
      return json({ ok: true, plan: planRow?.plan || "free", pending: true });
    }

    const metaPlan = session.metadata?.scriptora_plan as string | undefined;
    const metaTier = session.metadata?.scriptora_tier as string | undefined;
    let tier = metaPlan
      ? checkoutPlanToTier(metaPlan)
      : (metaTier === "pro" || metaTier === "premium" ? metaTier : null)
        || resolveTierFromStripePrice(session.metadata?.price_id);
    if (!tier || tier === "free") {
      return json({ ok: true, plan: planRow?.plan || "free", pending: true });
    }

    await applySubscriptionPlan(service, {
      userId,
      tier,
      provider: "stripe",
      customerId: session.customer || null,
      subscriptionId: session.subscription || null,
      checkoutPlanId: metaPlan || null,
    });

    return json({ ok: true, plan: tier, pending: false });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
