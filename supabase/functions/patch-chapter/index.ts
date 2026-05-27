import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logAIUsage, estimateTokens } from "../_shared/ai-tracking.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

let __trackCtx: { projectId?: string | null; userId?: string | null } = {};

async function callDeepSeek(apiKey: string, system: string, user: string, jsonMode = false, temperature = 0.4, maxTokens = 4000, taskType = "patch_chapter") {
  const body: any = {
    model: "deepseek-chat",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature,
    max_tokens: maxTokens,
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  const r = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
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

// Process a small batch of paragraphs in parallel
async function patchBatch(
  apiKey: string,
  batch: { idx: number; text: string }[],
  ctx: { genre: string; tone: string; language: string; chapterTitle: string; maxPatchesInBatch: number; blueprintIntegrityBlock?: string }
) {
  const numbered = batch.map((p) => `[¶${p.idx}]\n${p.text}`).join("\n\n");

  const system = `Sei un editor narrativo bestseller. Lavori in ${ctx.language}.
REGOLA D'ORO: NON riscrivere. INTERVIENI solo dove serve.
Se un paragrafo è già forte, NON toccarlo. Mantieni voce, struttura, ritmo.
Output SOLO JSON valido.`;

  const user = `Genere: ${ctx.genre} | Tono: ${ctx.tone} | Capitolo: "${ctx.chapterTitle}"

${ctx.blueprintIntegrityBlock ? `${ctx.blueprintIntegrityBlock}\n` : ""}

PARAGRAFI (batch):
${numbered}

Per ognuno:
- "strong" 🟢 = forte, NON toccare
- "improvable" 🟡 = migliorabile
- "weak" 🔴 = ridondanza/debolezza reale

Genera patch SOLO per i più critici (max ${ctx.maxPatchesInBatch} patch in questo batch). Lunghezza ±20%, stessa voce.

Restituisci JSON in ${ctx.language}:
{
  "segments": [{ "idx": <num>, "level": "strong"|"improvable"|"weak", "reason": "<solo se non strong>" }],
  "patches": [{ "idx": <num>, "original": "<testo esatto>", "patched": "<nuovo>", "type": "tighten"|"strengthen-dialogue"|"remove-redundancy"|"intensify", "reason": "<una frase>" }]
}`;

  const raw = await callDeepSeek(apiKey, system, user, true, 0.4, 3500);
  return JSON.parse(raw.replace(/```json\n?|```/g, "").trim());
}

// Final editorial evaluation on the whole patched chapter (lightweight)
async function evaluateChapter(
  apiKey: string,
  patchedText: string,
  ctx: { genre: string; tone: string; language: string; chapterTitle: string }
) {
  const system = `Sei un editor bestseller. Output SOLO JSON. Lingua: ${ctx.language}.`;
  const preview = patchedText.length > 6000 ? patchedText.substring(0, 6000) + "\n[…]" : patchedText;
  const user = `Genere: ${ctx.genre} | Tono: ${ctx.tone} | Capitolo: "${ctx.chapterTitle}"

CAPITOLO:
${preview}

Restituisci JSON in ${ctx.language}:
{
  "score": <1-10 realistico>,
  "strengths": ["<2-4 punti di forza>"],
  "improvements": ["<2-4 cose migliorate>"],
  "commercialLevel": "<una frase>"
}`;
  const raw = await callDeepSeek(apiKey, system, user, true, 0.3, 800);
  return JSON.parse(raw.replace(/```json\n?|```/g, "").trim());
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { chapterTitle, chapterText, genre, tone, language, blueprintIntegrityBlock = "", projectId = null, userId = null } = await req.json();
    __trackCtx = { projectId, userId };
    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY not configured");

    const paragraphs: { idx: number; text: string }[] = chapterText
      .split(/\n\s*\n/)
      .map((p: string) => p.trim())
      .filter(Boolean)
      .map((text: string, idx: number) => ({ idx, text }));

    if (paragraphs.length === 0) {
      return new Response(JSON.stringify({ error: "Empty chapter" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Split into batches of ~6 paragraphs each — keeps each DeepSeek call under ~30s
    const BATCH_SIZE = 6;
    const batches: { idx: number; text: string }[][] = [];
    for (let i = 0; i < paragraphs.length; i += BATCH_SIZE) {
      batches.push(paragraphs.slice(i, i + BATCH_SIZE));
    }

    // 15% global cap → distribute per batch
    const globalMaxPatches = Math.max(1, Math.ceil(paragraphs.length * 0.15));
    const perBatchCap = Math.max(1, Math.ceil(globalMaxPatches / batches.length));

    const ctx = { genre, tone, language, chapterTitle, maxPatchesInBatch: perBatchCap, blueprintIntegrityBlock };

    // Run all batches IN PARALLEL — total wall time ≈ slowest batch (~30s)
    const batchResults = await Promise.all(
      batches.map((b) => patchBatch(DEEPSEEK_API_KEY, b, ctx))
    );

    // Merge segments + patches
    const segments: any[] = [];
    const patches: any[] = [];
    for (const br of batchResults) {
      if (Array.isArray(br.segments)) segments.push(...br.segments);
      if (Array.isArray(br.patches)) patches.push(...br.patches);
    }

    // Enforce global 15% cap (keep most severe = "weak" segments first)
    const weakSet = new Set(segments.filter((s) => s.level === "weak").map((s) => s.idx));
    patches.sort((a, b) => (weakSet.has(b.idx) ? 1 : 0) - (weakSet.has(a.idx) ? 1 : 0));
    const cappedPatches = patches.slice(0, globalMaxPatches);

    // Build patched text
    const patchMap = new Map<number, string>();
    cappedPatches.forEach((p: any) => {
      if (typeof p.idx === "number" && typeof p.patched === "string") {
        patchMap.set(p.idx, p.patched.trim());
      }
    });
    const patchedText = paragraphs.map((p) => patchMap.get(p.idx) ?? p.text).join("\n\n");

    // Evaluation runs after — small payload, fast
    let evaluation: any = null;
    try {
      evaluation = await evaluateChapter(DEEPSEEK_API_KEY, patchedText, { genre, tone, language, chapterTitle });
    } catch (e) {
      console.error("evaluation failed:", e);
    }

    const originalLen = chapterText.length;
    const changedChars = cappedPatches.reduce(
      (sum: number, p: any) => sum + Math.abs((p.patched?.length || 0) - (p.original?.length || 0)) + (p.original?.length || 0),
      0
    );
    const modificationPercent = Math.min(100, Math.round((changedChars / Math.max(originalLen, 1)) * 100));

    return new Response(
      JSON.stringify({
        segments,
        patches: cappedPatches,
        evaluation,
        patchedText,
        originalText: chapterText,
        modificationPercent,
        totalParagraphs: paragraphs.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("patch-chapter error:", e);
    const status = e.status || 0;
    if (status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit. Aspetta e riprova.", code: "rate_limit" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (status === 402) {
      return new Response(JSON.stringify({ error: "DeepSeek credits esauriti.", code: "credits_exhausted" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
