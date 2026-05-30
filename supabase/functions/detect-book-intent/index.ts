import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callDeepSeekTracked } from "../_shared/ai-tracking.ts";
import { applyAuthContext, enforceEdgeGuard, EDGE_GUARD_PROFILES } from "../_shared/edge-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =====================================================================
// DETECT-BOOK-INTENT — DeepSeek primary
// =====================================================================

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY")!;

const SUPPORTED_GENRES = [
  "self-help", "romance", "dark-romance", "thriller", "fantasy", "philosophy",
  "business", "memoir",
  "cookbook", "technical-manual", "software-guide", "ai-tools-guide",
  "gardening", "beekeeping", "health-medicine", "diet-nutrition",
  "fitness", "productivity", "education",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const rawBody = await req.json().catch(() => ({})) as Record<string, unknown>;
    const guard = await enforceEdgeGuard(req, rawBody, EDGE_GUARD_PROFILES["detect-book-intent"]);
    if (guard instanceof Response) return guard;
    const body = applyAuthContext(guard, rawBody);
    const { idea, language = "English", projectId = null } = body;
    if (!idea || typeof idea !== "string" || idea.trim().length < 4) {
      return new Response(JSON.stringify({ error: "idea required (4+ chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY not configured");

    const system = `You are a senior Amazon KDP acquisitions editor. From a vague book idea you infer the most commercially viable genre, audience, level and titles. Output STRICT JSON only.`;
    const user = `IDEA: "${idea.trim()}"
LANGUAGE: ${language}

Allowed genres (pick exactly ONE):
${SUPPORTED_GENRES.join(", ")}

Return JSON with this exact shape:
{
  "genre": "<one of the allowed genres>",
  "subcategory": "<short niche, max 4 words>",
  "level": "beginner|intermediate|advanced",
  "readerPromise": "<one outcome sentence, max 18 words, concrete benefit>",
  "targetAudience": "<one audience sentence, max 18 words, concrete demographic + pain>",
  "tone": "<one of: practical, conversational, intense, warm, academic, narrative, instructional>",
  "numberOfChapters": <integer 7-12>,
  "suggestedTitles": ["<title1>", "<title2>", "<title3>"],
  "suggestedSubtitles": ["<sub1>", "<sub2>", "<sub3>"],
  "bestTitleIndex": <0|1|2>
}

RULES:
- titles: 2-7 words, scroll-stopping, specific outcome or pain
- subtitles: 6-15 words, concrete promise + keywords
- NO generic patterns (The Art of, How to, A Journey)
- NO buzzwords (mindful, journey, essence, unleash, thrive, secrets)
- bestTitleIndex = the most KDP-commercial of the three`;

    let raw = "";
    try {
      const result = await callDeepSeekTracked({
        apiKey: DEEPSEEK_API_KEY,
        systemPrompt: system,
        userPrompt: user,
        temperature: 0.7,
        jsonMode: true,
        taskType: "detect_book_intent",
        projectId,
        metadata: { language },
      });
      raw = result.content;
    } catch (err: any) {
      const status = err?.status;
      if (status === 429) {
        return new Response(JSON.stringify({
          error: "Rate limit, please retry shortly.",
          code: "RATE_LIMIT",
          fallback: true,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (status === 402 || status === 401) {
        return new Response(JSON.stringify({
          error: "DeepSeek credits exhausted or key invalid. Top up at platform.deepseek.com or fill the brief manually in Advanced.",
          code: "CREDITS_EXHAUSTED",
          fallback: true,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw err;
    }

    const cleaned = raw.replace(/```json\n?|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (!SUPPORTED_GENRES.includes(parsed.genre)) {
      parsed.genre = "self-help";
    }
    parsed.numberOfChapters = Math.max(7, Math.min(12, Number(parsed.numberOfChapters) || 8));
    parsed.bestTitleIndex = Math.max(0, Math.min(2, Number(parsed.bestTitleIndex) || 0));

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("detect-book-intent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
