// Edge function: exit-editorial-preview
// Downgrades editorial preview (beta) → free. Only service_role writes user_plans.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
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
      EDGE_GUARD_PROFILES["exit-editorial-preview"],
    );
    if (guard instanceof Response) return guard;
    applyAuthContext(guard, rawBody);

    const userId = guard.userId;
    const admin = guard.admin;
    if (!admin) {
      return json({ ok: false, error: "Service unavailable" }, 503);
    }

    const { data: row, error: readErr } = await admin
      .from("user_plans")
      .select("plan")
      .eq("user_id", userId)
      .maybeSingle();

    if (readErr) {
      return json({ ok: false, error: readErr.message }, 500);
    }

    if (!row || row.plan !== "beta") {
      return json(
        { ok: false, error: "Editorial preview exit is only available from the preview plan." },
        400,
      );
    }

    const now = new Date().toISOString();
    const { error: upErr } = await admin
      .from("user_plans")
      .update({
        plan: "free",
        period_start: now,
        beta_activated_at: null,
        beta_code_used: null,
        suspicious: false,
      })
      .eq("user_id", userId);

    if (upErr) {
      return json({ ok: false, error: upErr.message }, 500);
    }

    return json({ ok: true, plan: "free" });
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
