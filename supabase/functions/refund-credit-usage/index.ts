import { applyAuthContext, enforceEdgeGuard, EDGE_GUARD_PROFILES } from "../_shared/edge-guard.ts";

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
      EDGE_GUARD_PROFILES["refund-credit-usage"],
    );
    if (guard instanceof Response) return guard;
    applyAuthContext(guard, rawBody);

    const admin = guard.admin;
    if (!admin) {
      return json({ ok: false, error: "Service unavailable" }, 503);
    }

    const ledgerId = String(rawBody.ledgerId || rawBody.referenceId || "").trim();
    if (!ledgerId) {
      return json({ ok: false, error: "ledgerId required" }, 400);
    }

    const { data, error } = await admin.rpc("credit_wallet_refund", {
      p_user_id: guard.userId,
      p_ledger_id: ledgerId,
    });

    if (error) {
      return json({ ok: false, error: error.message }, 500);
    }

    return json(data ?? { ok: false, error: "Empty refund response" });
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
