// Fast blueprint generator — DeepSeek Chat in NON-streaming JSON mode.
// Optimized for speed: smaller max_tokens, json_object response, 60s timeout.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { estimateTokens, logAIUsage } from "../_shared/ai-tracking.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { systemPrompt, userPrompt, taskType = "generate_blueprint", projectId = null, userId = null, metadata = {} } = await req.json();
    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY not configured");

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 90000); // 90s hard cap

    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        // SPEED-FIRST settings:
        stream: false,            // no streaming — single fast call
        response_format: { type: "json_object" },
        max_tokens: 4096,         // blueprint never needs more
        temperature: 0.7,
      }),
    }).finally(() => clearTimeout(t));

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please retry." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (res.status === 402 || res.status === 401) {
        return new Response(JSON.stringify({ error: "DeepSeek credits exhausted or API key invalid." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("DeepSeek error:", res.status, text);
      return new Response(JSON.stringify({ error: `DeepSeek error (${res.status})` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    const usage = data?.usage || {};
    const promptTokens = typeof usage.prompt_tokens === "number"
      ? usage.prompt_tokens
      : estimateTokens(`${systemPrompt}${userPrompt}`);
    const completionTokens = typeof usage.completion_tokens === "number"
      ? usage.completion_tokens
      : estimateTokens(content);
    logAIUsage({
      provider: "deepseek",
      model: "deepseek-chat",
      taskType,
      promptTokens,
      completionTokens,
      promptCacheHitTokens: typeof usage.prompt_cache_hit_tokens === "number" ? usage.prompt_cache_hit_tokens : 0,
      promptCacheMissTokens: typeof usage.prompt_cache_miss_tokens === "number" ? usage.prompt_cache_miss_tokens : promptTokens,
      projectId,
      userId,
      metadata: { ...metadata, jsonMode: true, estimated: !data?.usage },
    });
    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    const msg = e?.name === "AbortError" ? "Blueprint timed out (90s)" : (e?.message || "Unknown error");
    console.error("generate-blueprint-fast error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
