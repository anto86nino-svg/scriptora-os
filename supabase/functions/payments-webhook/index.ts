// Unified payment webhook: Stripe, Lemon Squeezy, Paddle (basic).
// Configure provider secrets in Supabase → Edge Functions → Secrets.

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import {
  checkoutPlanToTier,
  resolveTierFromLemonVariant,
  resolveTierFromStripePrice,
  type ScriptoraPlanTier,
} from "../_shared/payment-plan-mapping.ts";
import {
  applySubscriptionPlan,
  createServiceClient,
  downgradeToFree,
  findUserIdByEmail,
  recordPaymentEvent,
} from "../_shared/payment-sync.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature, x-signature, x-event-name, paddle-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const provider = (url.searchParams.get("provider") || Deno.env.get("PAYMENT_PROVIDER") || "stripe")
    .toLowerCase();
  const rawBody = await req.text();

  try {
    const supabase = createServiceClient();

    if (provider === "stripe") {
      await handleStripeWebhook(supabase, rawBody, req.headers.get("stripe-signature"));
    } else if (provider === "lemonsqueezy" || provider === "lemon") {
      await handleLemonWebhook(supabase, rawBody, req.headers.get("x-signature") || "");
    } else if (provider === "paddle") {
      await handlePaddleWebhook(supabase, rawBody);
    } else {
      return json({ ok: false, error: `Unsupported provider: ${provider}` }, 400);
    }

    return json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Webhook error";
    console.error("[payments-webhook]", provider, message);
    return json({ ok: false, error: message }, 400);
  }
});

async function handleStripeWebhook(
  supabase: ReturnType<typeof createServiceClient>,
  rawBody: string,
  signature: string | null,
) {
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
  if (!secret || !stripeKey) throw new Error("Stripe webhook secrets not configured");
  if (!signature) throw new Error("Missing stripe-signature header");

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  const event = stripe.webhooks.constructEvent(rawBody, signature, secret);

  const shouldProcess = await recordPaymentEvent(
    supabase,
    "stripe",
    event.id,
    event.type,
    null,
    event.data.object,
  );
  if (!shouldProcess) return;

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = await resolveStripeUserId(supabase, session);
      if (!userId) return;

      const metaPlan = session.metadata?.scriptora_plan;
      const tier = metaPlan
        ? checkoutPlanToTier(metaPlan)
        : resolveTierFromStripePrice(session.metadata?.price_id) || "pro";

      if (tier === "free") return;

      await applySubscriptionPlan(supabase, {
        userId,
        tier,
        provider: "stripe",
        customerId: typeof session.customer === "string" ? session.customer : null,
        subscriptionId: typeof session.subscription === "string" ? session.subscription : null,
        checkoutPlanId: metaPlan || null,
      });
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = await resolveStripeSubscriptionUserId(supabase, sub);
      if (!userId) return;

      const priceId = sub.items?.data?.[0]?.price?.id;
      const tier = resolveTierFromStripePrice(priceId);
      if (!tier || sub.status === "canceled" || sub.status === "unpaid") {
        await downgradeToFree(supabase, userId, "stripe");
        return;
      }
      if (["active", "trialing", "past_due"].includes(sub.status)) {
        await applySubscriptionPlan(supabase, {
          userId,
          tier,
          provider: "stripe",
          customerId: typeof sub.customer === "string" ? sub.customer : null,
          subscriptionId: sub.id,
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = await resolveStripeSubscriptionUserId(supabase, sub);
      if (userId) await downgradeToFree(supabase, userId, "stripe");
      break;
    }
    default:
      break;
  }
}

async function resolveStripeUserId(
  supabase: ReturnType<typeof createServiceClient>,
  session: Stripe.Checkout.Session,
): Promise<string | null> {
  if (session.metadata?.supabase_user_id) return session.metadata.supabase_user_id;
  if (session.client_reference_id) return session.client_reference_id;
  if (session.customer_email) return findUserIdByEmail(supabase, session.customer_email);
  return null;
}

async function resolveStripeSubscriptionUserId(
  supabase: ReturnType<typeof createServiceClient>,
  sub: Stripe.Subscription,
): Promise<string | null> {
  const { data } = await supabase
    .from("user_plans")
    .select("user_id")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();
  if (data?.user_id) return data.user_id;

  const customerId = typeof sub.customer === "string" ? sub.customer : null;
  if (customerId) {
    const { data: byCustomer } = await supabase
      .from("user_plans")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (byCustomer?.user_id) return byCustomer.user_id;
  }
  return null;
}

async function handleLemonWebhook(
  supabase: ReturnType<typeof createServiceClient>,
  rawBody: string,
  signature: string,
) {
  const secret = Deno.env.get("LEMON_WEBHOOK_SECRET") || "";
  if (!secret) throw new Error("LEMON_WEBHOOK_SECRET not configured");
  if (!signature || !(await verifyLemonSignature(rawBody, signature, secret))) {
    throw new Error("Invalid Lemon Squeezy signature");
  }

  const payload = JSON.parse(rawBody);
  const eventName = payload?.meta?.event_name || "unknown";
  const eventId = String(payload?.meta?.event_id || payload?.data?.id || crypto.randomUUID());

  const shouldProcess = await recordPaymentEvent(
    supabase,
    "lemonsqueezy",
    eventId,
    eventName,
    null,
    payload,
  );
  if (!shouldProcess) return;

  const attrs = payload?.data?.attributes || {};
  const custom = attrs?.custom_data || attrs?.checkout_data?.custom || {};
  const email = attrs?.user_email || attrs?.customer_email || custom?.email;
  const userId = custom?.supabase_user_id
    || custom?.user_id
    || (email ? await findUserIdByEmail(supabase, email) : null);

  if (!userId) return;

  const variantId = String(attrs?.variant_id || attrs?.first_order_item?.variant_id || "");
  const tier = resolveTierFromLemonVariant(variantId) || resolveTierFromCustom(custom);

  if (eventName === "order_created" || eventName === "subscription_created") {
    if (tier && tier !== "free") {
      await applySubscriptionPlan(supabase, {
        userId,
        tier,
        provider: "lemonsqueezy",
        customerId: String(attrs?.customer_id || ""),
        subscriptionId: String(attrs?.subscription_id || payload?.data?.id || ""),
        checkoutPlanId: custom?.scriptora_plan || null,
      });
    }
    return;
  }

  if (
    eventName === "subscription_cancelled"
    || eventName === "subscription_expired"
    || eventName === "order_refunded"
  ) {
    await downgradeToFree(supabase, userId, "lemonsqueezy");
  }
}

function resolveTierFromCustom(custom: Record<string, unknown>): ScriptoraPlanTier | null {
  const plan = String(custom?.scriptora_plan || "");
  if (!plan) return null;
  const tier = checkoutPlanToTier(plan);
  return tier === "free" ? null : tier;
}

async function verifyLemonSignature(body: string, signature: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const hex = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return timingSafeEqual(hex, signature);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function handlePaddleWebhook(
  supabase: ReturnType<typeof createServiceClient>,
  rawBody: string,
) {
  const payload = JSON.parse(rawBody);
  const eventId = String(payload?.event_id || payload?.alert_id || crypto.randomUUID());
  const eventType = String(payload?.event_type || payload?.alert_name || "paddle_event");

  const shouldProcess = await recordPaymentEvent(
    supabase,
    "paddle",
    eventId,
    eventType,
    null,
    payload,
  );
  if (!shouldProcess) return;

  const passthrough = tryParseJson(payload?.passthrough);
  const userId = passthrough?.supabase_user_id || passthrough?.user_id;
  const tier = passthrough?.scriptora_plan
    ? checkoutPlanToTier(passthrough.scriptora_plan)
    : null;

  if (!userId) return;

  if (eventType.includes("subscription_cancelled") || eventType.includes("subscription_payment_failed")) {
    await downgradeToFree(supabase, userId, "paddle");
    return;
  }

  if (tier && tier !== "free") {
    await applySubscriptionPlan(supabase, {
      userId,
      tier,
      provider: "paddle",
      customerId: String(payload?.customer_id || ""),
      subscriptionId: String(payload?.subscription_id || ""),
      checkoutPlanId: passthrough?.scriptora_plan || null,
    });
  }
}

function tryParseJson(value: unknown): Record<string, any> | null {
  if (!value) return null;
  if (typeof value === "object") return value as Record<string, any>;
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
