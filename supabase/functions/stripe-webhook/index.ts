import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { getAdminClient } from "../_shared/edge-guard.ts";
import {
  downgradeUserToFree,
  grantWalletCredits,
  isStripeEventProcessed,
  markStripeEventProcessed,
  upsertUserPlanFromStripe,
} from "../_shared/stripe-billing.ts";
import {
  CREDIT_PACK_CATALOG,
  isCreditPackId,
  isSubscriptionPlanKey,
  planKeyFromStripePriceId,
  SUBSCRIPTION_CATALOG,
} from "../_shared/stripe-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return json({ ok: false, error: "Stripe webhook not configured" }, 503);
  }

  const admin = getAdminClient();
  if (!admin) {
    return json({ ok: false, error: "Service unavailable" }, 503);
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return json({ ok: false, error: "Missing stripe-signature" }, 400);
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (e) {
    return json(
      { ok: false, error: e instanceof Error ? e.message : "Invalid signature" },
      400,
    );
  }

  if (await isStripeEventProcessed(admin, event.id)) {
    return json({ ok: true, idempotent: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(admin, event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionChange(admin, event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(admin, event.data.object as Stripe.Subscription);
        break;
      case "invoice.paid":
        await handleInvoicePaid(admin, event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(admin, event.data.object as Stripe.Invoice);
        break;
      default:
        break;
    }

    await markStripeEventProcessed(admin, event.id, event.type, { livemode: event.livemode });
  } catch (e) {
    console.error("[stripe-webhook]", event.type, e);
    return json(
      { ok: false, error: e instanceof Error ? e.message : "Webhook handler failed" },
      500,
    );
  }

  return json({ ok: true });
});

async function handleCheckoutCompleted(
  admin: NonNullable<ReturnType<typeof getAdminClient>>,
  session: Stripe.Checkout.Session,
) {
  const userId = resolveUserId(session.metadata, session.client_reference_id);
  if (!userId) return;

  if (session.mode === "payment") {
    const packId = session.metadata?.pack_id;
    if (!isCreditPackId(packId || "")) return;

    const pack = CREDIT_PACK_CATALOG[packId];
    const referenceId = `stripe_session_${session.id}`;

    await grantWalletCredits(
      admin,
      userId,
      pack.credits,
      "credit_pack_purchase",
      referenceId,
      {
        packId,
        sessionId: session.id,
        paymentIntent: session.payment_intent,
      },
      true,
    );
    return;
  }

  if (session.mode === "subscription" && session.subscription) {
    const planKey = session.metadata?.plan_key;
    if (!isSubscriptionPlanKey(planKey || "")) return;

    const catalog = SUBSCRIPTION_CATALOG[planKey];
    await upsertUserPlanFromStripe(
      admin,
      userId,
      catalog.legacyPlan,
      typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
      typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null,
      planKey,
    );
  }
}

async function handleSubscriptionChange(
  admin: NonNullable<ReturnType<typeof getAdminClient>>,
  subscription: Stripe.Subscription,
) {
  const userId = resolveUserId(subscription.metadata, subscription.metadata?.user_id);
  if (!userId) return;

  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) return;

  const planKey = planKeyFromMetadata(subscription.metadata) ?? planKeyFromStripePriceId(priceId);
  if (!planKey) return;

  const catalog = SUBSCRIPTION_CATALOG[planKey];
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer?.id ?? null;

  if (subscription.status === "active" || subscription.status === "trialing") {
    await upsertUserPlanFromStripe(
      admin,
      userId,
      catalog.legacyPlan,
      customerId,
      subscription.id,
      planKey,
    );
  } else if (subscription.status === "canceled" || subscription.status === "unpaid") {
    await downgradeUserToFree(admin, userId);
  }
}

async function handleSubscriptionDeleted(
  admin: NonNullable<ReturnType<typeof getAdminClient>>,
  subscription: Stripe.Subscription,
) {
  const userId = resolveUserId(subscription.metadata, subscription.metadata?.user_id);
  if (!userId) return;
  await downgradeUserToFree(admin, userId);
}

async function handleInvoicePaid(
  admin: NonNullable<ReturnType<typeof getAdminClient>>,
  invoice: Stripe.Invoice,
) {
  if (!invoice.subscription) return;

  const subscriptionId = typeof invoice.subscription === "string"
    ? invoice.subscription
    : invoice.subscription.id;

  let userId = resolveUserId(invoice.metadata, invoice.metadata?.user_id);
  if (!userId) {
    const subMeta = (invoice as Stripe.Invoice & { subscription_details?: { metadata?: Stripe.Metadata } })
      .subscription_details?.metadata;
    userId = resolveUserId(subMeta, subMeta?.user_id);
  }
  if (!userId) {
    const { data } = await admin
      .from("user_plans")
      .select("user_id")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle();
    userId = (data as { user_id?: string } | null)?.user_id ?? null;
  }
  if (!userId) return;

  await grantMonthlyCreditsForInvoice(admin, userId, invoice, subscriptionId);
}

async function grantMonthlyCreditsForInvoice(
  admin: NonNullable<ReturnType<typeof getAdminClient>>,
  userId: string,
  invoice: Stripe.Invoice,
  subscriptionId: string,
) {
  const line = invoice.lines.data[0];
  const priceId = line?.price?.id;
  if (!priceId) return;

  const planKey = planKeyFromStripePriceId(priceId);
  if (!planKey) return;

  const catalog = SUBSCRIPTION_CATALOG[planKey];
  const referenceId = `stripe_invoice_${invoice.id}`;

  await upsertUserPlanFromStripe(
    admin,
    userId,
    catalog.legacyPlan,
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null,
    subscriptionId,
    planKey,
  );

  await grantWalletCredits(
    admin,
    userId,
    catalog.monthlyCredits,
    "subscription_monthly_grant",
    referenceId,
    {
      invoiceId: invoice.id,
      subscriptionId,
      planKey,
    },
    false,
  );
}

async function handleInvoicePaymentFailed(
  admin: NonNullable<ReturnType<typeof getAdminClient>>,
  invoice: Stripe.Invoice,
) {
  const userId = resolveUserId(invoice.metadata, invoice.metadata?.user_id);
  if (!userId) return;

  await admin
    .from("user_plans")
    .update({ suspicious: true, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}

function resolveUserId(
  metadata: Stripe.Metadata | null | undefined,
  fallback?: string | null,
): string | null {
  const fromMeta = metadata?.user_id?.trim();
  if (fromMeta) return fromMeta;
  const fb = fallback?.trim();
  return fb || null;
}

function planKeyFromMetadata(metadata: Stripe.Metadata | null | undefined) {
  const key = metadata?.plan_key?.trim();
  return isSubscriptionPlanKey(key || "") ? key : null;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
