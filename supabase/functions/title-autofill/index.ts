import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callDeepSeekTracked } from "../_shared/ai-tracking.ts";
import { routeRequest, type PlanTier } from "../_shared/intelligence-router.ts";
import { applyAuthContext, enforceEdgeGuard, EDGE_GUARD_PROFILES } from "../_shared/edge-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const rawBody = await req.json().catch(() => ({})) as Record<string, unknown>;
    const guard = await enforceEdgeGuard(req, rawBody, EDGE_GUARD_PROFILES["title-autofill"]);
    if (guard instanceof Response) return guard;
    const body = applyAuthContext(guard, rawBody);
    const { bookGenre = "", language = "Italian", seed = 0, currentTitle = "", projectId = null, plan = "free" } = body;

    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY not configured");

    // Invisible routing: title generation is always low-complexity → fast mode.
    const { config } = routeRequest(
      { task: "title-autofill", contentType: "title", genre: bookGenre },
      plan as PlanTier,
    );

    const systemPrompt = `You are a senior Amazon KDP market analyst. You generate sellable, specific book concepts for high-demand low-competition niches. Output STRICT JSON only — no prose, no markdown.`;

    const userPrompt = `Generate a complete book concept idea (title + subtitle + central promise + target audience) optimized for Amazon KDP.

INPUT
- Genre / category: ${bookGenre || "(any high-opportunity niche)"}
- Output language: ${language}
- Variation seed: ${seed} (produce a DIFFERENT concept than previous runs, explore new angles)
${currentTitle ? `- Previous title to evolve from (keep the spirit but propose a fresh different angle): "${currentTitle}"` : ""}

RULES
- Title: punchy, sellable (3-8 words), NOT poetic
- Subtitle: 8-15 words, concrete benefit + (when relevant) timeframe/mechanism
- Central promise: 1-2 sentences, specific transformation the reader gets
- Target audience: 1 sentence, concrete demographic + pain point
- All strings in ${language}
- Pick a HIGH-DEMAND / LOW-COMPETITION sub-niche inside the genre

OUTPUT — return EXACTLY this JSON (and nothing else):
{
  "bookTitle": "string",
  "subtitle": "string",
  "bookPromise": "string",
  "targetAudience": "string",
  "subNiche": "string (the sub-niche it targets)"
}`;

    let content = "{}";
    try {
      const result = await callDeepSeekTracked({
        apiKey: DEEPSEEK_API_KEY,
        systemPrompt,
        userPrompt,
        temperature: 0.95,
        maxTokens: Math.min(config.maxTokens, 1024),
        jsonMode: true,
        taskType: "title_autofill",
        projectId,
        metadata: { language, bookGenre, seed, mode: config.mode },
      });
      content = result.content || "{}";
    } catch (err: any) {
      const status = err?.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please wait and try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402 || status === 401) {
        return new Response(JSON.stringify({ error: "DeepSeek API key invalid or credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw err;
    }

    let parsed: any = null;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : null;
    }

    if (!parsed || !parsed.bookTitle) {
      throw new Error("Invalid AI response shape");
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("title-autofill error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
