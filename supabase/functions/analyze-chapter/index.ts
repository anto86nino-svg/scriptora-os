import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callDeepSeekTracked } from "../_shared/ai-tracking.ts";
import { applyAuthContext, enforceEdgeGuard, EDGE_GUARD_PROFILES } from "../_shared/edge-guard.ts";

let __trackCtx: { projectId?: string | null; userId?: string | null } = {};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const rawBody = await req.json().catch(() => ({})) as Record<string, unknown>;
    const guard = await enforceEdgeGuard(req, rawBody, EDGE_GUARD_PROFILES["analyze-chapter"]);
    if (guard instanceof Response) return guard;
    const body = applyAuthContext(guard, rawBody);
    const { chapterTitle, chapterText, genre, tone, language, projectId = null } = body;
    __trackCtx = { projectId, userId: guard.userId };
    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY not configured");

    // Split chapter into paragraphs (preserve indices for surgical rewrites)
    const rawParas = chapterText.split(/\n\s*\n/).map((p: string) => p.trim()).filter(Boolean);
    const paragraphs = rawParas.map((text: string, idx: number) => ({ idx, text }));

    // Compact representation for the model
    const numbered = paragraphs
      .map((p) => `[¶${p.idx}] ${p.text.substring(0, 600)}${p.text.length > 600 ? "…" : ""}`)
      .join("\n\n");

    const systemPrompt = `You are a Big-5 publishing house senior editor + literary craft coach.
You DO NOT flatter. You give brutal, honest, surgical feedback.
You speak ENTIRELY in ${language}. Every word of your output must be in ${language}.

Your job: score the chapter on 5 real dimensions (1-10), identify the WEAKEST paragraphs by index,
explain WHAT is wrong, and run an EDITORIAL MASTERY DIAGNOSTIC covering AI patterns, show-vs-tell,
sentence weakness, opening hook, and memorability.

Return ONLY valid JSON. No prose outside JSON.`;

    const userPrompt = `Genre: ${genre} | Tone: ${tone}
Chapter title: "${chapterTitle}"

Paragraphs (numbered):
${numbered}

Return EXACTLY this JSON shape (every text value in ${language}):
{
  "scores": {
    "impact": <1-10>,
    "clarity": <1-10>,
    "originality": <1-10>,
    "rhythm": <1-10>,
    "redundancy": <1-10 — HIGHER = LESS redundant, cleaner>
  },
  "finalScore": <1-10, weighted realistic average>,
  "verdict": "<one sharp sentence — what level this chapter is at>",
  "keyIssues": [
    "<max 5 short, concrete issues — no fluff>"
  ],
  "weakParagraphs": [
    {
      "idx": <paragraph index from [¶N]>,
      "severity": "high" | "medium" | "low",
      "problem": "<one short reason — redundancy / weak / too long / generic / pacing>",
      "action": "tighten" | "rewrite" | "compress" | "intensify" | "remove"
    }
  ],
  "globalActions": [
    "<2-4 chapter-wide actions to reach 9/10+>"
  ],
  "editorialMastery": {
    "aiPatterns": [
      { "idx": <¶N>, "phrase": "<exact AI cliché found, max 80 chars>", "fix": "<short suggestion>" }
    ],
    "showVsTell": [
      { "idx": <¶N>, "told": "<told emotion phrase>", "showSuggestion": "<how to show it via gesture/sense>" }
    ],
    "weakSentences": [
      { "idx": <¶N>, "sentence": "<weak sentence, max 120 chars>", "why": "<filler / vague / passive / generic>" }
    ],
    "missingHook": {
      "issue": <true|false>,
      "currentOpening": "<first sentence of the chapter>",
      "suggestion": "<one stronger hook the author could use, in ${language}>"
    },
    "memorability": {
      "score": <1-10 — how many highlight-worthy lines exist>,
      "quotableCount": <number>,
      "advice": "<one sentence on how to add memorable lines>"
    }
  }
}

Rules:
- Be CRITICAL. If chapter is mediocre, score 5-6. If it's good, 7. Reserve 9+ for truly bestseller-level work.
- weakParagraphs must reference ACTUAL [¶N] indices from the input.
- Identify at least 1 weakParagraph unless the chapter scores ≥9 on every dimension.
- editorialMastery arrays: max 5 items each; only report REAL findings (do not invent).
- aiPatterns target generic AI phrases ("in today's fast-paced world", "let's dive in", "game-changer", "buckle up", empty triadic lists).
- showVsTell flags emotions stated rather than dramatized ("she was sad", "he felt anxious").
- All output text in ${language}.`;

    let content = "{}";
    try {
      const result = await callDeepSeekTracked({
        apiKey: DEEPSEEK_API_KEY,
        systemPrompt,
        userPrompt,
        temperature: 0.7,
        maxTokens: 4096,
        jsonMode: true,
        taskType: "analyze_chapter",
        projectId,
        userId: __trackCtx.userId || null,
        metadata: { genre, language, paragraphs: paragraphs.length },
      });
      content = result.content || "{}";
    } catch (err: any) {
      const status = err?.status;
      console.error("AI gateway error:", status);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Wait a moment and retry.", code: "rate_limit" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "DeepSeek credits esauriti. Aggiungi fondi sul tuo account DeepSeek.", code: "credits_exhausted" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: `AI gateway error: ${status || "unknown"}`, code: "ai_error" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const parsed = JSON.parse(content.replace(/```json\n?|```/g, "").trim());

    // Attach original paragraph text so client can render highlights
    const weakWithText = (parsed.weakParagraphs || []).map((w: any) => {
      const p = paragraphs.find((pp) => pp.idx === w.idx);
      return { ...w, text: p?.text || "" };
    });

    return new Response(
      JSON.stringify({
        ...parsed,
        weakParagraphs: weakWithText,
        totalParagraphs: paragraphs.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analyze-chapter error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
