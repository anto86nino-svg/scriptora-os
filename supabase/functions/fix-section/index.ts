import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callDeepSeekTracked } from "../_shared/ai-tracking.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Action = "tighten" | "rewrite" | "compress" | "intensify" | "remove";

const ACTION_INSTRUCTIONS: Record<Action, string> = {
  tighten: "Tighten the prose. Remove every unnecessary word. Same meaning, sharper rhythm.",
  rewrite: "Rewrite from scratch with stronger language and a clearer angle. Same meaning, new voice.",
  compress: "Compress into a shorter, denser version. Cut redundancy. Keep only the essence.",
  intensify: "Intensify the emotional impact. Add sensory detail, vary rhythm, end on a strong beat.",
  remove: "Return an empty string — this paragraph is filler.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { paragraphText, action, problem, genre, tone, language, chapterContext, blueprintIntegrityBlock = "", mode, projectId = null } = await req.json();
    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY not configured");

    const act: Action = (action as Action) || "rewrite";
    const fixMode: "clean" | "power" = mode === "power" ? "power" : "clean";

    if (act === "remove") {
      return new Response(JSON.stringify({ improvedText: "" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const systemPrompt = fixMode === "power"
      ? `You are a Big-5 bestseller editor performing a POWER UPGRADE on a single paragraph.
Respond ENTIRELY in ${language}. Every word must be in ${language}.

YOUR MISSION: do NOT just correct. TRANSFORM this paragraph into a stronger, sharper, more memorable version.

NON-NEGOTIABLE RULES:
- Decide surgically: CUT, MERGE, or REPLACE with a stronger version. Never just "polish".
- Eliminate weak/repeated metaphors. Prefer raw, direct, simple-but-strong language.
- Kill explanations the reader can infer.
- Aim to produce AT LEAST ONE underline-worthy line — a sentence that could end a chapter or sell the book.
- Default: SHORTER than the original. Density > length.
- Keep the original MEANING and POSITION in the chapter.
- Do NOT repeat ideas already present in the chapter context.
- NO preambles, NO explanations, NO quotes around the output.
- Return ONLY the rewritten paragraph as plain text.`
      : `You are a senior Big-5 publishing house editor performing a SURGICAL paragraph rewrite.
Respond ENTIRELY in ${language}. Every word must be in ${language}.

CRITICAL RULES:
- Rewrite ONLY the paragraph given. Nothing else.
- Keep the original MEANING and POSITION in the chapter.
- DO NOT lengthen unless explicitly told to. Default: same length or shorter.
- DO NOT repeat ideas already present elsewhere in the chapter context.
- NO preambles, NO explanations, NO quotes around the output.
- Return ONLY the rewritten paragraph as plain text.`;

    const userPrompt = `Genre: ${genre} | Tone: ${tone}
Mode: ${fixMode === "power" ? "POWER UPGRADE — transform, don't just fix" : "CLEAN FIX — surgical correction"}
Action: ${ACTION_INSTRUCTIONS[act]}
Problem to fix: ${problem || "low impact"}

${blueprintIntegrityBlock ? `${blueprintIntegrityBlock}\n` : ""}

${chapterContext ? `Chapter context (for coherence — do NOT rewrite this):\n${chapterContext.substring(0, 1500)}\n\n` : ""}Paragraph to rewrite:
"""
${paragraphText}
"""

Return ONLY the rewritten paragraph in ${language}. No JSON, no quotes, no commentary.`;

    let improvedText = "";
    try {
      const result = await callDeepSeekTracked({
        apiKey: DEEPSEEK_API_KEY,
        systemPrompt,
        userPrompt,
        temperature: fixMode === "power" ? 0.95 : 0.7,
        maxTokens: 2048,
        taskType: `fix_section_${act}`,
        projectId,
        metadata: { mode: fixMode, action: act, genre, language },
      });
      improvedText = (result.content || "").trim();
    } catch (err: any) {
      const status = err?.status;
      console.error("fix-section AI error:", status);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Riprova tra poco.", code: "rate_limit" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "DeepSeek credits esauriti. Aggiungi fondi sul tuo account DeepSeek.", code: "credits_exhausted" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: `AI gateway error: ${status || "unknown"}`, code: "ai_error" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ improvedText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("fix-section error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
