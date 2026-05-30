import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callDeepSeekTracked } from "../_shared/ai-tracking.ts";
import { applyAuthContext, enforceEdgeGuard, EDGE_GUARD_PROFILES } from "../_shared/edge-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const rawBody = await req.json().catch(() => ({})) as Record<string, unknown>;
    const guard = await enforceEdgeGuard(req, rawBody, EDGE_GUARD_PROFILES["title-intelligence"]);
    if (guard instanceof Response) return guard;
    const body = applyAuthContext(guard, rawBody);
    const {
      bookTitle = "",
      bookGenre,
      targetAudience,
      bookPromise,
      tone = "professionale",
      language = "English",
      regenerate = false,
      projectId = null,
      // Optional: pre-resolved Genre Intelligence profile from the client
      // (sent by TitleIntelligenceDialog using getGenreProfile)
      genreProfile = null as null | {
        key?: string;
        tone?: string;
        readerPromise?: string;
        vocabulary?: string;
        dos?: string[];
        donts?: string[];
        hookTypes?: string[];
        authorsDNA?: string;
      },
    } = body || {};

    if (!bookGenre || !targetAudience || !bookPromise) {
      return new Response(
        JSON.stringify({ error: "bookGenre, targetAudience, bookPromise are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY not configured");

    const seed = regenerate ? Math.floor(Math.random() * 100000) : 0;

    const systemPrompt = `You are a senior Amazon KDP + Apple Books market analyst and bestselling-book title strategist. You have analyzed thousands of #1 bestsellers across all categories and you understand:
- Amazon Best Seller Rank (BSR) dynamics
- Apple Books charts and category structure
- Keyword search volume vs competition (the core of "high demand / low competition" niches)
- Title patterns that win in low-saturation sub-niches

You DO NOT produce poetic, generic, or vague titles. You produce titles that SELL: clear promise, strong emotional hook, searchable keywords, BSR-optimized structure, AND target underserved sub-niches when possible.

You write the OUTPUT in ${language}. You always return STRICT JSON only — no prose, no markdown fences.`;

    const userPrompt = `Generate an INTELLIGENZA TITOLI™ premium analysis package for this book.
This is a PRO market-intelligence run: simulate Amazon KDP + Apple Books bestseller research and surface HIGH-DEMAND / LOW-COMPETITION title opportunities.

INPUT
- Working title: ${bookTitle || "(none — propose from scratch)"}
- Genre / category: ${bookGenre}
- Target audience: ${targetAudience}
- Core promise / transformation: ${bookPromise}
- Tone: ${tone}
- Output language: ${language}
${regenerate ? `- Variation seed: ${seed} (produce DIFFERENT titles than a previous run, explore new angles and new sub-niches)` : ""}
${genreProfile ? `
GENRE INTELLIGENCE PROFILE (active — titles MUST be coherent with this):
- Profile key: ${genreProfile.key || bookGenre}
- Tone signature: ${genreProfile.tone || ""}
- Vocabulary register: ${genreProfile.vocabulary || ""}
- Reader promise: ${genreProfile.readerPromise || ""}
- Authors-DNA reference: ${genreProfile.authorsDNA || ""}
- Hook patterns to echo in titles: ${(genreProfile.hookTypes || []).join(" | ")}
- ALWAYS: ${(genreProfile.dos || []).join(" | ")}
- NEVER: ${(genreProfile.donts || []).join(" | ")}
` : ""}
METHOD (apply silently — be rigorous, this is a paid premium tool)
1. NICHE MAPPING — Simulate analysis of Amazon KDP top-100 + Apple Books charts in "${bookGenre}" for the ${language} market.
2. SUB-NICHE DISCOVERY — Identify 3-5 sub-niches inside "${bookGenre}" with this profile:
   - HIGH search demand (buyers actively type these queries)
   - LOW-MEDIUM competition (few well-optimized books, weak titles, BSR top-20 reachable)
   - Aligned with the user's promise + audience
3. KEYWORD INTEL — Extract 6-10 high-intent Amazon search keywords with realistic demand vs competition estimates.
4. TITLE CONSTRUCTION — Build 5 TOP titles that target the BEST sub-niches found. Each title combines:
   - Emotional hook + primary keyword + clear specific promise
   - SEO-readable subtitle with concrete benefit + (when relevant) timeframe/mechanism/audience
   - Voice/tone faithful to the GENRE INTELLIGENCE PROFILE above
   - NO keyword stuffing, NO vague poetry
5. SHADOW TITLES — Build 2 more aggressive / commercial variants (bolder hooks, stronger promise) — still on-tone for the genre profile.
6. SCORING — For EACH title compute realistic 0-100 scores:
   - conversionScore: CTR x clarity x emotional pull x keyword fit
   - opportunityScore: demand HIGH + competition LOW = high opportunity (this is the KEY metric the user asked for)
   - demandLevel + competitionLevel as labels: "low" | "medium" | "high"

OUTPUT — return EXACTLY this JSON shape (and NOTHING else):
{
  "marketSnapshot": {
    "platformsAnalyzed": ["Amazon KDP", "Apple Books"],
    "topSubNiches": [
      {
        "name": "string (sub-niche name in ${language})",
        "demandLevel": "high|medium|low",
        "competitionLevel": "low|medium|high",
        "opportunityScore": 88,
        "rationale": "1 sentence in ${language}: why this sub-niche is underserved/winnable"
      }
      // 3-5 items, sorted by opportunityScore desc
    ],
    "marketInsight": "2-3 sentences in ${language}: macro pattern across bestsellers and where the GAP is"
  },
  "topTitles": [
    {
      "title": "string (main title, punchy)",
      "subtitle": "string (SEO subtitle, 8-15 words, specific)",
      "subNiche": "which sub-niche it targets",
      "conversionScore": 87,
      "opportunityScore": 84,
      "demandLevel": "high|medium|low",
      "competitionLevel": "low|medium|high",
      "rationale": "1-2 sentences in ${language}: why this converts AND why it wins the niche"
    }
    // EXACTLY 5 items
  ],
  "shadowTitles": [
    {
      "title": "string (more aggressive / commercial variant)",
      "subtitle": "string",
      "subNiche": "which sub-niche it targets",
      "conversionScore": 86,
      "opportunityScore": 80,
      "demandLevel": "high|medium|low",
      "competitionLevel": "low|medium|high",
      "rationale": "why this is the bolder commercial bet"
    }
    // EXACTLY 2 items
  ],
  "coreKeywords": [
    {
      "keyword": "string",
      "demand": "high|medium|low",
      "competition": "low|medium|high"
    }
    // 6-10 items
  ]
}

RULES
- Titles MUST be sellable, not poetic.
- Subtitles MUST contain a concrete benefit + (when relevant) timeframe or mechanism.
- Scores MUST be realistic (range 65-96, no inflation, vary across titles).
- Prioritize titles whose opportunityScore is HIGH (the user explicitly asked for high demand + low competition).
- Write all user-facing strings in ${language}.
- Return ONLY the JSON object. No markdown. No commentary.`;

    let content = "{}";
    try {
      const result = await callDeepSeekTracked({
        apiKey: DEEPSEEK_API_KEY,
        systemPrompt,
        userPrompt,
        temperature: regenerate ? 0.95 : 0.8,
        maxTokens: 6144,
        jsonMode: true,
        taskType: "title_intelligence",
        projectId,
        metadata: { language, regenerate, bookGenre },
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

    if (!parsed || !Array.isArray(parsed.topTitles)) {
      throw new Error("Invalid AI response shape");
    }

    // Normalize: sort top titles by opportunityScore desc
    if (Array.isArray(parsed.topTitles)) {
      parsed.topTitles.sort((a: any, b: any) => (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0));
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("title-intelligence error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
