import { applyAuthContext, enforceEdgeGuard, EDGE_GUARD_PROFILES } from "../_shared/edge-guard.ts";
import { getOrCreateCreditWallet } from "../_shared/credit-ledger.ts";

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
      EDGE_GUARD_PROFILES["reserve-credits"],
    );
    if (guard instanceof Response) return guard;
    applyAuthContext(guard, rawBody);

    const admin = guard.admin;
    if (!admin) {
      return json({ ok: false, error: "Service unavailable" }, 503);
    }

    const operation = String(rawBody.operation || "").trim();
    const requiredCredits = Math.max(0, Math.floor(Number(rawBody.requiredCredits) || 0));
    const provider = rawBody.provider ? String(rawBody.provider) : null;
    const referenceId = rawBody.referenceId ? String(rawBody.referenceId) : null;
    const metadata = (rawBody.metadata && typeof rawBody.metadata === "object")
      ? rawBody.metadata
      : {};

    if (!operation || requiredCredits <= 0) {
      return json({ ok: false, error: "Invalid operation or requiredCredits" }, 400);
    }

    await getOrCreateCreditWallet(admin, guard.userId);

    const { data, error } = await admin.rpc("credit_wallet_reserve", {
      p_user_id: guard.userId,
      p_operation: operation,
      p_credits: requiredCredits,
      p_provider: provider,
      p_reference_id: referenceId,
      p_metadata: metadata,
    });

    if (error) {
      return json({ ok: false, error: error.message }, 500);
    }

    return json(data ?? { ok: false, error: "Empty reserve response" });
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
