import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logAIUsage, estimateTokens } from "../_shared/ai-tracking.ts";

let __trackCtx: { projectId?: string | null; userId?: string | null } = {};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MarketResult {
  marketScore: number;            // 1-10
  competitionLevel: "low" | "medium" | "high";
  positioningClarity: number;     // 1-10
  hookStrength: number;           // 1-10
  keywordPotential: number;       // 1-10
  verdict: "strong" | "weak" | "saturated";
  improvements: string[];
}

const GENERIC_TITLE_PATTERNS = [
  /^the\s+(art|power|secret|guide|book|way)\s+of\b/i,
  /^how\s+to\b/i,
  /^a\s+(journey|guide|story)\b/i,
  /^my\s+(life|story|journey)\b/i,
  /\b(ultimate|complete|essential)\s+guide\b/i,
  /\b(unleash|unlock|discover)\s+your\b/i,
];

const OVERUSED_WORDS = [
  "journey", "essence", "wisdom", "harmony", "soul", "magic",
  "mindful", "awakening", "transformative", "empower", "thrive",
];

function computePriors(input: { title: string; subtitle?: string; genre?: string; description?: string }) {
  const title = (input.title || "").trim();
  const subtitle = (input.subtitle || "").trim();
  const blob = `${title} ${subtitle} ${input.description || ""}`.toLowerCase();

  const titleWords = title.split(/\s+/).filter(Boolean);
  const titleTooShort = titleWords.length < 2;
  const titleTooLong = titleWords.length > 9;
  const subtitleMissing = !subtitle;
  const subtitleTooLong = subtitle.split(/\s+/).filter(Boolean).length > 18;

  const genericMatches = GENERIC_TITLE_PATTERNS.filter((rx) => rx.test(title)).length;
  const overusedHits = OVERUSED_WORDS.filter((w) => blob.includes(w)).length;

  const hardWarnings: string[] = [];
  if (titleTooShort) hardWarnings.push("title too short for KDP discoverability");
  if (titleTooLong) hardWarnings.push("title too long — loses thumbnail readability");
  if (subtitleMissing) hardWarnings.push("missing subtitle — loses keyword real estate");
  if (subtitleTooLong) hardWarnings.push("subtitle too long — Amazon truncates in search");
  if (genericMatches > 0) hardWarnings.push("title uses generic/overused pattern");
  if (overusedHits >= 2) hardWarnings.push(`prose contains ${overusedHits} overused buzzwords`);

  return {
    titleWords: titleWords.length,
    subtitleWords: subtitle.split(/\s+/).filter(Boolean).length,
    genericMatches,
    overusedHits,
    hardWarnings,
  };
}

async function callDeepSeek(apiKey: string, system: string, user: string, temperature = 0.3, maxTokens = 1200, taskType = "market_validator") {
  const r = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) {
    const text = await r.text();
    const err: any = new Error(`DeepSeek ${r.status}: ${text}`);
    err.status = r.status;
    throw err;
  }
  const data = await r.json();
  const content = data.choices?.[0]?.message?.content || "";
  const usage = data.usage || {};
  logAIUsage({
    provider: "deepseek",
    model: "deepseek-chat",
    taskType,
    promptTokens: usage.prompt_tokens ?? estimateTokens(system + user),
    completionTokens: usage.completion_tokens ?? estimateTokens(content),
    promptCacheHitTokens: usage.prompt_cache_hit_tokens,
    promptCacheMissTokens: usage.prompt_cache_miss_tokens,
    projectId: __trackCtx.projectId || null,
    userId: __trackCtx.userId || null,
  });
  return content;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, subtitle, genre, description, targetAudience, projectId = null, userId = null } = await req.json();
    __trackCtx = { projectId, userId };

    if (!title || typeof title !== "string") {
      return new Response(JSON.stringify({ error: "title required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY not configured");

    const priors = computePriors({ title, subtitle, genre, description });

    const system = `You are a senior Amazon KDP acquisitions analyst.
You think like the Amazon search algorithm + a category-savvy buyer scrolling thumbnails.
You do NOT encourage. You do NOT cheerlead. You output STRICT JSON only.

EVALUATION FRAMEWORK:
1. Compare positioning against the TOP 100 books in the category — would this stand out or vanish?
2. Detect generic titles, vague promises, and overused buzzwords (mindful, journey, essence, unleash, etc.).
3. Reward specificity, concrete outcomes, emotional payoff, niche targeting.
4. Penalize vague abstractions, derivative concepts, and unfocused subtitles.
5. Keyword potential = does it match real KDP search behavior in this category/audience?

HARD RULES:
- Generic title pattern → hookStrength ≤ 5 and verdict cannot be "strong".
- Missing subtitle → keywordPotential ≤ 5.
- 2+ overused buzzwords → marketScore ≤ 6.
- Vague/cliché positioning → competitionLevel = "high" and verdict = "saturated" or "weak".
- Be specific in improvements. Never say "make it stronger" — say what to change and why.`;

    const user = `BOOK META
Title: ${title}
Subtitle: ${subtitle || "(none)"}
Genre: ${genre || "(unspecified)"}
Target audience: ${targetAudience || "(unspecified)"}
Description: ${description || "(none)"}

DETERMINISTIC PRIORS (computed, not opinions — respect them):
- Title words: ${priors.titleWords}
- Subtitle words: ${priors.subtitleWords}
- Generic title pattern matches: ${priors.genericMatches}
- Overused buzzword hits: ${priors.overusedHits}
- Hard warnings: ${priors.hardWarnings.length ? priors.hardWarnings.join("; ") : "none"}

Return STRICT JSON:
{
  "marketScore": 1-10 (overall KDP market potential),
  "competitionLevel": "low" | "medium" | "high",
  "positioningClarity": 1-10 (is the promise crystal clear in <3 seconds?),
  "hookStrength": 1-10 (does the title stop a scrolling buyer?),
  "keywordPotential": 1-10 (matches real KDP search behavior?),
  "verdict": "strong" | "weak" | "saturated",
  "improvements": ["3-6 surgical, specific improvements citing concrete title/subtitle/positioning changes"]
}

If hard warnings exist, reflect them in scores AND improvements.`;

    const raw = await callDeepSeek(DEEPSEEK_API_KEY, system, user, 0.3, 1200);
    const cleaned = raw.replace(/```json\n?|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<MarketResult>;

    // Normalize + enforce hard rules
    const clamp = (n: any, min = 1, max = 10) => {
      const v = Number(n);
      if (!Number.isFinite(v)) return min;
      return Math.max(min, Math.min(max, Math.round(v)));
    };

    let marketScore = clamp(parsed.marketScore);
    let positioningClarity = clamp(parsed.positioningClarity);
    let hookStrength = clamp(parsed.hookStrength);
    let keywordPotential = clamp(parsed.keywordPotential);
    let competitionLevel = (parsed.competitionLevel as MarketResult["competitionLevel"]) || "medium";
    let verdict = (parsed.verdict as MarketResult["verdict"]) || "weak";

    // Enforce priors
    if (priors.genericMatches > 0) {
      hookStrength = Math.min(hookStrength, 5);
      if (verdict === "strong") verdict = "weak";
    }
    if (priors.subtitleWords === 0) {
      keywordPotential = Math.min(keywordPotential, 5);
    }
    if (priors.overusedHits >= 2) {
      marketScore = Math.min(marketScore, 6);
    }
    if (priors.hardWarnings.length >= 3) {
      competitionLevel = "high";
      if (verdict !== "weak") verdict = "saturated";
    }

    const improvements = Array.isArray(parsed.improvements) && parsed.improvements.length
      ? parsed.improvements.slice(0, 6)
      : priors.hardWarnings.length ? priors.hardWarnings : ["no specific improvements returned"];

    const result: MarketResult & { priors: typeof priors } = {
      marketScore,
      competitionLevel,
      positioningClarity,
      hookStrength,
      keywordPotential,
      verdict,
      improvements,
      priors,
    };

    return new Response(JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("market-validator error:", e);
    const status = e.status || 0;
    if (status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit. Retry shortly.", code: "rate_limit" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (status === 402) {
      return new Response(JSON.stringify({ error: "DeepSeek credits exhausted.", code: "credits_exhausted" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
