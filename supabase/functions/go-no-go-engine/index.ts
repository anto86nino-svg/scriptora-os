import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GoNoGoVerdict {
  verdict: "GO" | "BORDERLINE" | "NO";
  confidence: number; // 0-1
  coreProblem: string;
  reasons: string[];
  action: "continue" | "rewrite" | "discard";
}

import { logAIUsage, estimateTokens } from "../_shared/ai-tracking.ts";

let __trackCtx: { projectId?: string | null; userId?: string | null } = {};

async function callDeepSeek(apiKey: string, system: string, user: string, temperature = 0.3, maxTokens = 1200, taskType = "go_no_go") {
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

/** Heuristic priors so GPT can't bullshit its way to GO. */
function computePriors(input: {
  chapterText: string;
  marketData?: any;
  voiceData?: any;
  genreAnalysis?: any;
}) {
  const wordCount = (input.chapterText || "").trim().split(/\s+/).filter(Boolean).length;
  const tooShort = wordCount < 400;
  const tooLong = wordCount > 6000;

  const marketScore = Number(input.marketData?.score ?? input.marketData?.marketScore ?? 0);
  const voiceIdentity = Number(input.voiceData?.identityScore ?? 0);
  const antiGeneric = Number(input.voiceData?.antiGeneric ?? 0);
  const genreFit = Number(input.genreAnalysis?.genreFitScore ?? 0);

  const hardBlocks: string[] = [];
  if (tooShort) hardBlocks.push("chapter too short for market competition");
  if (tooLong) hardBlocks.push("chapter exceeds attention budget for genre");
  if (voiceIdentity && voiceIdentity < 5) hardBlocks.push("identity collapse — sounds like generic AI");
  if (antiGeneric && antiGeneric < 5) hardBlocks.push("prose reads as standard AI output");
  if (genreFit && genreFit < 5) hardBlocks.push("fails core genre conventions");
  if (marketScore && marketScore < 4) hardBlocks.push("market positioning is weak");

  return { wordCount, marketScore, voiceIdentity, antiGeneric, genreFit, hardBlocks };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      chapterText,
      title,
      subtitle,
      genre,
      marketData,
      voiceData,
      genreAnalysis,
      projectId = null,
      userId = null,
    } = await req.json();
    __trackCtx = { projectId, userId };

    if (!chapterText || typeof chapterText !== "string") {
      return new Response(JSON.stringify({ error: "chapterText required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY not configured");

    const priors = computePriors({ chapterText, marketData, voiceData, genreAnalysis });

    const system = `You are a ruthless Amazon KDP acquisitions editor and market analyst.
You do NOT encourage. You do NOT cheerlead. You decide whether a chapter can compete with the TOP 20 books in its category.
Output STRICT JSON only. No prose outside JSON. No hedging.

DECISION FRAMEWORK:
- GO = could realistically compete with top 20 in its KDP category as-is
- BORDERLINE = strong potential but at least one specific weakness blocks top performance
- NO = will fail in market — generic, unclear, derivative, or off-genre

PRIORITIES (in order):
1. Reader engagement (does the first paragraph hook? does tension sustain?)
2. Market positioning (does title/subtitle/opening match a buyer's expectation?)
3. Emotional impact (does it move the reader or stay flat?)
4. Originality (does it sound like a human voice or generic AI/derivative?)
5. Clarity (is it readable without friction?)

HARD RULES:
- If voice identity is collapsed or prose reads as generic AI → never GO.
- If chapter fails core genre conventions → never GO.
- If market data signals weak positioning → at best BORDERLINE.
- Be specific. Cite sentences, paragraphs, or structural beats. Never say "improve pacing" — say what to cut and why.`;

    const user = `BOOK META
Title: ${title || "(untitled)"}
Subtitle: ${subtitle || "(none)"}
Genre: ${genre || "(unspecified)"}

DETERMINISTIC PRIORS (do not ignore these — they are computed, not opinions):
- Word count: ${priors.wordCount}
- Market score (0-10): ${priors.marketScore || "n/a"}
- Voice identity score (0-10): ${priors.voiceIdentity || "n/a"}
- Anti-generic score (0-10): ${priors.antiGeneric || "n/a"}
- Genre fit score (0-10): ${priors.genreFit || "n/a"}
- Hard blocks detected: ${priors.hardBlocks.length ? priors.hardBlocks.join("; ") : "none"}

MARKET DATA:
${marketData ? JSON.stringify(marketData, null, 2) : "(none)"}

VOICE DATA:
${voiceData ? JSON.stringify(voiceData, null, 2) : "(none)"}

GENRE ANALYSIS:
${genreAnalysis ? JSON.stringify(genreAnalysis, null, 2) : "(none)"}

CHAPTER TEXT:
"""
${chapterText}
"""

Return STRICT JSON:
{
  "verdict": "GO" | "BORDERLINE" | "NO",
  "confidence": 0.0-1.0,
  "coreProblem": "single sentence — the ONE thing blocking top-20 performance (or 'none' if GO)",
  "reasons": ["3-6 specific, surgical reasons citing concrete elements of the text/data"],
  "action": "continue" | "rewrite" | "discard"
}

ACTION MAPPING:
- GO → action: "continue"
- BORDERLINE → action: "rewrite"
- NO → action: "discard"

If hard blocks exist, you MUST reflect them in coreProblem and reasons, and verdict cannot be GO.`;

    const raw = await callDeepSeek(DEEPSEEK_API_KEY, system, user, 0.3, 1200);
    const cleaned = raw.replace(/```json\n?|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<GoNoGoVerdict>;

    // Normalize + enforce hard blocks
    let verdict = (parsed.verdict || "BORDERLINE").toUpperCase() as GoNoGoVerdict["verdict"];
    if (priors.hardBlocks.length > 0 && verdict === "GO") {
      verdict = "BORDERLINE";
    }
    const action: GoNoGoVerdict["action"] =
      verdict === "GO" ? "continue" : verdict === "NO" ? "discard" : "rewrite";

    let confidence = Number(parsed.confidence);
    if (!Number.isFinite(confidence)) confidence = 0.5;
    confidence = Math.max(0, Math.min(1, confidence));
    // Penalize confidence when hard blocks were ignored
    if (priors.hardBlocks.length > 0 && verdict !== "NO") {
      confidence = Math.min(confidence, 0.6);
    }

    const result: GoNoGoVerdict & { priors: typeof priors } = {
      verdict,
      confidence: Math.round(confidence * 100) / 100,
      coreProblem: parsed.coreProblem || (verdict === "GO" ? "none" : "unspecified weakness"),
      reasons: Array.isArray(parsed.reasons) && parsed.reasons.length
        ? parsed.reasons.slice(0, 6)
        : priors.hardBlocks.length ? priors.hardBlocks : ["no specific reasons returned"],
      action,
      priors,
    };

    return new Response(JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("go-no-go-engine error:", e);
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
