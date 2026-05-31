import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { applyAuthContext, enforceEdgeGuard, EDGE_GUARD_PROFILES } from "../_shared/edge-guard.ts";
import {
  getOrCreateCreditWallet,
  resolveUserPlanTier,
  walletToResponse,
} from "../_shared/credit-ledger.ts";

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
      EDGE_GUARD_PROFILES["get-credit-wallet"],
    );
    if (guard instanceof Response) return guard;
    applyAuthContext(guard, rawBody);

    const admin = guard.admin;
    if (!admin) {
      return json({ ok: false, error: "Service unavailable" }, 503);
    }

    const userId = guard.userId;
    const wallet = await getOrCreateCreditWallet(admin, userId);
    const planTier = await resolveUserPlanTier(admin, userId);

    return json(walletToResponse(wallet, planTier));
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
