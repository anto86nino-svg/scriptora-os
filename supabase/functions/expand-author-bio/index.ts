import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callDeepSeekTracked } from "../_shared/ai-tracking.ts";
import { applyAuthContext, enforceEdgeGuard, EDGE_GUARD_PROFILES } from "../_shared/edge-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const rawBody = await req.json().catch(() => ({})) as Record<string, unknown>;
    const guard = await enforceEdgeGuard(req, rawBody, EDGE_GUARD_PROFILES["expand-author-bio"]);
    if (guard instanceof Response) return guard;
    const body = applyAuthContext(guard, rawBody);
    const {
      seed = "",
      penName = "Author",
      language = "Italian",
      archetype = "",
      voice = "",
      recurringThemes = "",
      authorPresence = [],
      readerEmotionalGoals = [],
      authorMessage = "",
      toneDirective = "",
      userId = null,
    } = body || {};

    const trimmedSeed = String(seed || "").trim();
    if (trimmedSeed.length < 12) {
      return new Response(JSON.stringify({ error: "seed is required (min 12 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY not configured");

    const contextBlock = [
      archetype ? `Author archetype: ${archetype}` : "",
      voice ? `Voice / tone: ${voice}` : "",
      recurringThemes ? `Recurring themes: ${recurringThemes}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const voiceBlock = [
      Array.isArray(authorPresence) && authorPresence.length
        ? `Author presence: ${authorPresence.slice(0, 6).join(", ")}`
        : "",
      Array.isArray(readerEmotionalGoals) && readerEmotionalGoals.length
        ? `Reader emotional goals: ${readerEmotionalGoals.slice(0, 5).join(", ")}`
        : "",
      authorMessage ? `Author message (intent only, do not quote): ${String(authorMessage).slice(0, 200)}` : "",
      toneDirective ? String(toneDirective).slice(0, 600) : "",
    ]
      .filter(Boolean)
      .join("\n");

    const systemPrompt = `You are a professional author bio writer for serious publishing workflows.
Write in ${language}. Output STRICT JSON only — no markdown, no commentary.

RULES:
- Transform rough author notes into ONE professional author bio paragraph (2-4 sentences).
- Sound human, credible, and specific — never generic AI fluff.
- Match the author's genre/tone when context is provided.
- Author Voice Memory (if provided) may nudge cadence by AT MOST 10-15% — never caricature, never cliché.
- No hype, no fake credentials, no "bestselling" claims unless explicitly stated in the seed.
- No marketing slogans. Professional author bio tone only.
- Use the pen name naturally in third person.
- Preserve the author's actual interests and voice from the seed.
- If tone signals are weak or conflicting, stay neutral and professional.`;

    const userPrompt = `Expand this rough author self-description into a professional author bio.

PEN NAME: ${penName}
${contextBlock ? `\nAUTHOR CONTEXT:\n${contextBlock}\n` : ""}${voiceBlock ? `\nAUTHOR VOICE MEMORY (subtle only):\n${voiceBlock}\n` : ""}
RAW SELF-DESCRIPTION:
"""
${trimmedSeed.slice(0, 2000)}
"""

Return EXACTLY this JSON:
{
  "biography": "Professional author bio paragraph in ${language}"
}`;

    let content = "{}";
    try {
      const result = await callDeepSeekTracked({
        apiKey: DEEPSEEK_API_KEY,
        systemPrompt,
        userPrompt,
        temperature: 0.72,
        maxTokens: 512,
        jsonMode: true,
        taskType: "expand_author_bio",
        userId,
        metadata: { language, penName },
      });
      content = result.content || "{}";
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please wait and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402 || status === 401) {
        return new Response(JSON.stringify({ error: "AI service unavailable. Try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw err;
    }

    let parsed: { biography?: string } | null = null;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : null;
    }

    const biography = String(parsed?.biography || "").trim();
    if (!biography) throw new Error("Invalid AI response shape");

    return new Response(JSON.stringify({ biography }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("expand-author-bio error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
