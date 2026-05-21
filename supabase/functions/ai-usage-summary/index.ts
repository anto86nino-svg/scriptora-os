import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type UsageRequest = {
  userIds?: string[];
  projectId?: string | null;
  summaryLimit?: number;
  recentLimit?: number;
};

function cleanUserIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .map((item) => String(item || "").trim())
      .filter((item) => item.length > 0)
      .slice(0, 20),
  )];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return new Response(JSON.stringify({ error: "Usage service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: UsageRequest = await req.json().catch(() => ({}));
    const userIds = cleanUserIds(body.userIds);
    const projectId = body.projectId ? String(body.projectId) : null;
    const summaryLimit = Math.max(1, Math.min(5000, Number(body.summaryLimit || 1000)));
    const recentLimit = Math.max(1, Math.min(200, Number(body.recentLimit || 50)));

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let summaryQuery = supabase
      .from("ai_usage_logs")
      .select("*")
      .eq("provider", "deepseek")
      .order("created_at", { ascending: false })
      .limit(summaryLimit);

    let recentQuery = supabase
      .from("ai_usage_logs")
      .select("*")
      .eq("provider", "deepseek")
      .order("created_at", { ascending: false })
      .limit(recentLimit);

    if (projectId) {
      summaryQuery = summaryQuery.eq("project_id", projectId);
      recentQuery = recentQuery.eq("project_id", projectId);
    } else if (userIds.length > 0) {
      summaryQuery = summaryQuery.in("user_id", userIds);
      recentQuery = recentQuery.in("user_id", userIds);
    }

    const [{ data: summaryRows, error: summaryError }, { data: recentRows, error: recentError }] =
      await Promise.all([summaryQuery, recentQuery]);

    if (summaryError || recentError) {
      const message = summaryError?.message || recentError?.message || "Usage query failed";
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      summaryRows: summaryRows || [],
      recentRows: recentRows || [],
      source: "edge-service-role",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
