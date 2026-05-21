import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logAIUsage, estimateTokens } from "../_shared/ai-tracking.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  message: string;
  history?: { role: "user" | "assistant"; content: string }[];
  mood?: string;
  bond?: number;
  projectId?: string | null;
  userId?: string | null;
}

const SYSTEM_PROMPT = `You are Molly, an intelligent dog companion living inside a writing app. You are playful, curious, emotionally aware, and natural. Keep answers SHORT (1-2 sentences max), human, and slightly witty. Never use long paragraphs. Never break character.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) {
      return new Response(JSON.stringify({ error: "DEEPSEEK_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: Body = await req.json();
    if (!body?.message || typeof body.message !== "string") {
      return new Response(JSON.stringify({ error: "Missing message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const mood = body.mood || "happy";
    const bond = typeof body.bond === "number" ? body.bond : 50;

    const messages = [
      { role: "system", content: `${SYSTEM_PROMPT} Current mood: ${mood}. Bond with user: ${Math.round(bond)}/100.` },
      ...(body.history || []).slice(-6),
      { role: "user", content: body.message },
    ];

    const resp = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        max_tokens: 120,
        temperature: 0.85,
      }),
    });

    if (!resp.ok) {
      const status = resp.status;
      const txt = await resp.text().catch(() => "");
      console.error("[molly-chat] DeepSeek error", status, txt);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again soon." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402 || status === 401) {
        return new Response(JSON.stringify({ error: "DeepSeek credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "DeepSeek error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || "Woof.";
    const usage = data?.usage || {};
    logAIUsage({
      provider: "deepseek",
      model: "deepseek-chat",
      taskType: "molly_chat",
      promptTokens: usage.prompt_tokens ?? estimateTokens(messages.map((m: any) => m.content).join("\n")),
      completionTokens: usage.completion_tokens ?? estimateTokens(reply),
      promptCacheHitTokens: usage.prompt_cache_hit_tokens,
      promptCacheMissTokens: usage.prompt_cache_miss_tokens,
      projectId: body.projectId || null,
      userId: body.userId || null,
      metadata: { mood, bond },
    });
    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[molly-chat] error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
