// Edge function: activate-beta
// Validates beta code server-side, enforces anti-abuse via device_id + IP.
// Code is NEVER exposed to the frontend.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Server-side beta codes (could be moved to a secret later).
// Keep the legacy code active, but accept the public tester code requested for onboarding.
const BETA_CODES = new Set(["betatester", "betatester01"]);
const MAX_BETA_PER_IP = 2;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const code: string = (body.code || "").toString().trim();
    const normalizedCode = code.toLowerCase();
    const userId: string = (body.userId || "local-user").toString();
    const deviceId: string = (body.deviceId || "").toString();
    const userAgent: string = (body.userAgent || "").toString().slice(0, 500);

    if (!deviceId) {
      return json({ ok: false, error: "Missing device fingerprint" }, 400);
    }
    if (!BETA_CODES.has(normalizedCode)) {
      return json({ ok: false, error: "Invalid beta code" }, 401);
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Always log session
    await supabase.from("user_sessions").insert({
      user_id: userId,
      ip_address: ip,
      device_id: deviceId,
      user_agent: userAgent,
    });

    // Anti-abuse 1: same device already activated beta?
    const { data: deviceBeta } = await supabase
      .from("user_plans")
      .select("user_id, beta_code_used")
      .eq("plan", "beta")
      .not("beta_activated_at", "is", null);

    // Get distinct devices that activated beta via user_sessions join
    const { data: deviceUsers } = await supabase
      .from("user_sessions")
      .select("user_id")
      .eq("device_id", deviceId);

    const deviceUserIds = new Set((deviceUsers || []).map((r: any) => r.user_id));
    const sameDeviceBeta = (deviceBeta || []).some(
      (p: any) => deviceUserIds.has(p.user_id) && p.user_id !== userId
    );
    if (sameDeviceBeta) {
      // mark current as suspicious
      await supabase
        .from("user_plans")
        .upsert(
          { user_id: userId, plan: "free", suspicious: true },
          { onConflict: "user_id" }
        );
      return json(
        { ok: false, error: "Beta limit reached for this device" },
        403
      );
    }

    // Anti-abuse 2: same IP > MAX_BETA_PER_IP
    if (ip !== "unknown") {
      const { data: ipSessions } = await supabase
        .from("user_sessions")
        .select("user_id")
        .eq("ip_address", ip);
      const ipUserIds = new Set(
        (ipSessions || []).map((r: any) => r.user_id)
      );
      const ipBetaCount = (deviceBeta || []).filter((p: any) =>
        ipUserIds.has(p.user_id)
      ).length;
      if (ipBetaCount >= MAX_BETA_PER_IP) {
        return json(
          { ok: false, error: "Beta limit reached for this network" },
          403
        );
      }
    }

    // Activate beta
    const now = new Date().toISOString();
    const { error: upErr } = await supabase
      .from("user_plans")
      .upsert(
        {
          user_id: userId,
          plan: "beta",
          period_start: now,
          beta_activated_at: now,
          beta_code_used: code,
          suspicious: false,
        },
        { onConflict: "user_id" }
      );
    if (upErr) {
      return json({ ok: false, error: upErr.message }, 500);
    }

    return json({ ok: true, plan: "beta" });
  } catch (e) {
    return json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      500
    );
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
