import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Scores {
  impact: number;
  clarity: number;
  rhythm: number;
  originality: number;
  redundancy: number;
}

interface VoiceScores {
  /** 1-10 — how much the original author's voice survives */
  voicePreserved: number;
  /** 1-10 — how much emotional intensity is retained vs original */
  emotionalIntensity: number;
  /** 1-10 — how well original metaphors / stylistic choices are kept */
  metaphorPreservation: number;
  /** 1-10 — HIGHER = LESS generic / less AI-standard */
  antiGeneric: number;
  /** 1-10 — overall identity preservation */
  identityScore: number;
  /** brutal one-liner: what was lost, what was gained */
  voiceVerdict: string;
}

interface PassResult {
  iteration: number;
  scoresBefore: Scores;
  finalScoreBefore: number;
  diagnosis: string[];
  scoresAfter: Scores;
  finalScoreAfter: number;
  improvedText: string;
  improvementSummary: string;
  voice?: VoiceScores;
  revertedForVoice?: boolean;
  revertReason?: string;
  voiceProfileUsed?: string;
  rewriteConfidence?: number;
}

// =====================================================================
// VOICE GUARD PROFILES (mirror of src/lib/voice-guard-profiles.ts —
// kept inline because edge functions can't import from src/).
// =====================================================================
type VoicePriority = "voice" | "clarity" | "emotion";
interface VoiceGuardProfile {
  minVoicePreserved: number;
  minEmotionalIntensity: number;
  minMetaphorPreservation: number;
  minAntiGeneric: number;
  priority: VoicePriority;
}

const VOICE_PROFILES: Record<string, VoiceGuardProfile> = {
  horror:         { minVoicePreserved: 7, minEmotionalIntensity: 8, minMetaphorPreservation: 6, minAntiGeneric: 7, priority: "emotion" },
  thriller:       { minVoicePreserved: 7, minEmotionalIntensity: 7, minMetaphorPreservation: 5, minAntiGeneric: 7, priority: "emotion" },
  romance:        { minVoicePreserved: 7, minEmotionalIntensity: 8, minMetaphorPreservation: 6, minAntiGeneric: 7, priority: "emotion" },
  "dark-romance": { minVoicePreserved: 7, minEmotionalIntensity: 9, minMetaphorPreservation: 6, minAntiGeneric: 8, priority: "emotion" },
  fantasy:        { minVoicePreserved: 7, minEmotionalIntensity: 7, minMetaphorPreservation: 7, minAntiGeneric: 7, priority: "voice" },
  "sci-fi":       { minVoicePreserved: 6, minEmotionalIntensity: 6, minMetaphorPreservation: 6, minAntiGeneric: 7, priority: "voice" },
  historical:     { minVoicePreserved: 7, minEmotionalIntensity: 7, minMetaphorPreservation: 7, minAntiGeneric: 7, priority: "voice" },
  memoir:         { minVoicePreserved: 8, minEmotionalIntensity: 8, minMetaphorPreservation: 7, minAntiGeneric: 7, priority: "voice" },
  children:       { minVoicePreserved: 6, minEmotionalIntensity: 6, minMetaphorPreservation: 5, minAntiGeneric: 6, priority: "clarity" },
  poetry:         { minVoicePreserved: 8, minEmotionalIntensity: 8, minMetaphorPreservation: 9, minAntiGeneric: 8, priority: "voice" },
  "self-help":    { minVoicePreserved: 6, minEmotionalIntensity: 6, minMetaphorPreservation: 5, minAntiGeneric: 6, priority: "clarity" },
  business:       { minVoicePreserved: 6, minEmotionalIntensity: 5, minMetaphorPreservation: 5, minAntiGeneric: 6, priority: "clarity" },
  philosophy:     { minVoicePreserved: 7, minEmotionalIntensity: 6, minMetaphorPreservation: 7, minAntiGeneric: 7, priority: "voice" },
  spirituality:   { minVoicePreserved: 7, minEmotionalIntensity: 7, minMetaphorPreservation: 7, minAntiGeneric: 7, priority: "emotion" },
};

const FALLBACK_PROFILE: VoiceGuardProfile = {
  minVoicePreserved: 6, minEmotionalIntensity: 6, minMetaphorPreservation: 6, minAntiGeneric: 6, priority: "voice",
};

/** Lightweight resolver mirroring src/lib/genre-intelligence resolveGenreKey heuristics. */
function resolveGenreKeyInline(genre: string, subcategory?: string): string {
  const direct = (genre || "").toLowerCase().trim();
  if (VOICE_PROFILES[direct]) return direct;
  const sub = (subcategory || "").toLowerCase();
  const blob = `${direct} ${sub}`;
  if (blob.includes("horror")) return "horror";
  if (blob.includes("dark") && blob.includes("romance")) return "dark-romance";
  if (blob.includes("romance")) return "romance";
  if (blob.includes("thriller") || blob.includes("mystery")) return "thriller";
  if (blob.includes("fantasy")) return "fantasy";
  if (blob.includes("sci") || blob.includes("science")) return "sci-fi";
  if (blob.includes("histor")) return "historical";
  if (blob.includes("child") || blob.includes("kid") || blob.includes("bambini") || blob.includes("ragazzi")) return "children";
  if (blob.includes("poetry") || blob.includes("poesia")) return "poetry";
  if (blob.includes("spiritual") || blob.includes("meditat")) return "spirituality";
  if (blob.includes("self") || blob.includes("help") || blob.includes("ansia") || blob.includes("crescita")) return "self-help";
  if (blob.includes("business") || blob.includes("entrepren")) return "business";
  if (blob.includes("philosoph")) return "philosophy";
  if (blob.includes("memoir") || blob.includes("autobio")) return "memoir";
  return direct || "self-help";
}

/** Compute rewrite confidence (0-1) from voice scores weighted by profile priority. */
function computeRewriteConfidence(voice: VoiceScores, profile: VoiceGuardProfile, qualityDelta: number): number {
  // Per-priority weights (sum=1)
  const weights = profile.priority === "emotion"
    ? { voice: 0.25, emo: 0.40, meta: 0.10, anti: 0.15, quality: 0.10 }
    : profile.priority === "clarity"
    ? { voice: 0.20, emo: 0.15, meta: 0.10, anti: 0.20, quality: 0.35 }
    : /* voice */ { voice: 0.40, emo: 0.20, meta: 0.15, anti: 0.15, quality: 0.10 };

  const norm = (v: number) => Math.max(0, Math.min(1, v / 10));
  // Quality delta normalized: +2 pts → 1.0, 0 → 0.5, -2 → 0
  const qualityNorm = Math.max(0, Math.min(1, 0.5 + qualityDelta / 4));

  const score =
    weights.voice * norm(voice.voicePreserved) +
    weights.emo * norm(voice.emotionalIntensity) +
    weights.meta * norm(voice.metaphorPreservation) +
    weights.anti * norm(voice.antiGeneric) +
    weights.quality * qualityNorm;

  return Math.round(score * 100) / 100;
}

import { logAIUsage, estimateTokens } from "../_shared/ai-tracking.ts";

let __trackCtx: { projectId?: string | null; userId?: string | null } = {};

async function callDeepSeek(apiKey: string, system: string, user: string, jsonMode = false, temperature = 0.8, maxTokens = 8000, taskType = "dominate_chapter", model = "deepseek-chat") {
  const body: any = {
    model,
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
    model,
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

function genreFinalElement(genre: string, language: string): string {
  const g = (genre || "").toLowerCase();
  if (g.includes("self") || g.includes("help") || g.includes("business") || g.includes("philosophy")) {
    return `Add a final section titled appropriately in ${language} (e.g. "Esercizio pratico" / "Practical Exercise") — concrete, applicable, brief, transformative. Max 120 words.`;
  }
  if (g.includes("romance") || g.includes("relation")) {
    return `Add a final guided reflection in ${language} with one powerful question that haunts the reader. Max 100 words.`;
  }
  if (g.includes("thriller") || g.includes("fantasy") || g.includes("fiction") || g.includes("memoir")) {
    return `Add a final scene or hook in ${language} that creates tension or opens the next chapter. Max 120 words.`;
  }
  return `Add a final synthesis + application in ${language}. Max 120 words.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { chapterTitle, chapterText, genre, subcategory, genreKey: clientGenreKey, tone, language, threshold = 8.5, iteration = 1, genreAutoFixBlock = "", blueprintIntegrityBlock = "", masteryMode = false, projectId = null, userId = null } = await req.json();
    __trackCtx = { projectId, userId };
    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY not configured");

    const finalElementInstruction = genreFinalElement(genre, language);
    const currentText: string = chapterText;

    // PHASE 1 — ANALYSIS
    const analysisSystem = `You are a senior international editor. Brutally honest. Output ONLY JSON. Speak entirely in ${language}.`;
    const analysisUser = `Genre: ${genre} | Tone: ${tone}
Chapter title: "${chapterTitle}"

${blueprintIntegrityBlock ? `${blueprintIntegrityBlock}\n` : ""}

CHAPTER:
${currentText}

Return JSON:
{
  "scores": { "impact": 1-10, "clarity": 1-10, "rhythm": 1-10, "originality": 1-10, "redundancy": 1-10 (higher = less redundant) },
  "finalScore": 1-10 (realistic, no inflation),
  "diagnosis": ["max 7 short surgical points in ${language}: redundancies, weak parts, what to cut, where it loses force"]
}`;
    // Analysis: always fast model (cheap, structured JSON)
    const analysisRaw = await callDeepSeek(DEEPSEEK_API_KEY, analysisSystem, analysisUser, true, 0.5, 2000, "dominate_analysis", "deepseek-chat");
    const analysis = JSON.parse(analysisRaw.replace(/```json\n?|```/g, "").trim());

    // PHASE 2+3 — TARGETED REWRITE WITH VOICE-PRESERVATION CONSTRAINTS
    const masteryAmplifier = masteryMode ? `

EDITORIAL MASTERY AMPLIFIER — DOMINATE MODE (active):
- Operate at MAX literary craft level for this genre.
- Every paragraph must pass: subtext / sensory layering / show-not-tell / anti-AI / memorability.
- Aggressive cuts on filler ("very", "really", "in order to", "the fact that").
- Kill triadic empty lists, mirror sentences, AI clichés ("in today's world", "let's dive in", "game-changer", "buckle up").
- Convert told emotions into shown gestures or sensory beats.
- At least 2 lines per chapter must be quote-worthy / underline-worthy.
- Sentence rhythm: alternate short punches and longer breathing sentences. No homogenized cadence.
- The output must read as the SAME author at the top of their craft, never as a different writer.` : "";

    const rewriteSystem = `You are a bestseller-level author and senior editor. Write in ${language}. Never use AI clichés. Aggressive, surgical, memorable prose.

VOICE PRESERVATION LAW (non-negotiable):
- The output must read as the SAME author, only more precise. NEVER as a different writer rewriting the chapter.
- Preserve the author's signature metaphors, idiosyncrasies, and rhythm asymmetries.
- Preserve sentence-length variation: do NOT homogenize cadence.
- Preserve emotional intensity peaks: never flatten a strong stylistic choice into something safer.
- If a fix would improve structure but weaken voice → SKIP IT.
- If a fix would remove emotional uniqueness → SKIP IT.
- If a fix would make the text sound more "standard AI" → SKIP IT.
- Sharper, clearer, more intentional. Never safer, flatter, generic.

BLUEPRINT INTEGRITY LAW:
- Do not change names, places, relationship status, wounds, motivations, lore, timeline, reveals or canon facts.
- Canon continuity outranks prose upgrade. If a stronger sentence would mutate canon, skip it.
- Rewrite texture, clarity and rhythm only; never rewrite the book identity.${masteryAmplifier}`;

    const rewriteUser = `Genre: ${genre} | Tone: ${tone}
Chapter title: "${chapterTitle}"

DIAGNOSIS to fix (apply ONLY where it does not violate VOICE PRESERVATION LAW):
${analysis.diagnosis.map((d: string, i: number) => `${i + 1}. ${d}`).join("\n")}

${genreAutoFixBlock ? genreAutoFixBlock + "\n" : ""}
${blueprintIntegrityBlock ? `${blueprintIntegrityBlock}\n` : ""}
ORIGINAL CHAPTER:
${currentText}

YOUR TASK — TARGETED REWRITE:
- Eliminate ONLY redundancies that don't carry stylistic intent
- Cut weak/slow paragraphs WITHOUT erasing tonal fingerprints
- Every paragraph must serve a purpose
- Insert at most 2 memorable lines IN THE AUTHOR'S existing register (no new voice imported)
- Improve rhythm and readability without flattening sentence variation
- KEEP original metaphors where possible — only replace if cliché AND weak
${genreAutoFixBlock ? "- Apply the GENRE AUTO-FIX DIRECTIVES above. Respect the 15% rewrite cap and never alter narrative meaning OR voice." : "- Make it shorter if needed, never longer without reason"}
- ${finalElementInstruction}

Return ONLY the rewritten chapter text in ${language}. No preamble, no markdown headers, no explanations. Just the new chapter.`;
    // Rewrite: reasoner only when Dominate Mode is on (premium quality, slower).
    // Default uses deepseek-chat for ~3-4× lower latency.
    const rewriteModel = masteryMode ? "deepseek-reasoner" : "deepseek-chat";
    const rewritten = (await callDeepSeek(DEEPSEEK_API_KEY, rewriteSystem, rewriteUser, false, 0.85, 8000, "dominate_rewrite", rewriteModel)).trim();

    // PHASE 4 — RE-EVALUATION (quality)
    const evalUser = `Genre: ${genre} | Tone: ${tone}
Chapter title: "${chapterTitle}"

NEW CHAPTER (after rewrite):
${rewritten}

Return JSON:
{
  "scores": { "impact": 1-10, "clarity": 1-10, "rhythm": 1-10, "originality": 1-10, "redundancy": 1-10 },
  "finalScore": 1-10,
  "improvementSummary": "1-2 sentences in ${language}: what really changed, what's stronger now"
}`;
    const evalRaw = await callDeepSeek(DEEPSEEK_API_KEY, analysisSystem, evalUser, true, 0.4, 1200, "dominate_eval", "deepseek-chat");
    const evaluation = JSON.parse(evalRaw.replace(/```json\n?|```/g, "").trim());

    // PHASE 5 — VOICE GUARD (compare ORIGINAL vs REWRITTEN for voice loss)
    const voiceSystem = `You are a forensic literary identity auditor. You compare two versions of the SAME chapter and judge — without mercy — whether the rewrite preserved the author's voice or replaced it with a smoother, more generic, more "AI" version. Output strict JSON only. Speak in ${language}.`;
    const voiceUser = `ORIGINAL CHAPTER (author's true voice):
"""
${currentText}
"""

REWRITTEN CHAPTER (after editorial pass):
"""
${rewritten}
"""

Compare ORIGINAL vs REWRITTEN. Score 1-10 each:
- voicePreserved: does the rewrite sound like the same author? (10 = identical voice, more precise; 1 = different writer)
- emotionalIntensity: did the rewrite keep the emotional peaks? (10 = preserved/sharpened; 1 = flattened)
- metaphorPreservation: were original metaphors kept where valuable? (10 = preserved; 1 = wiped)
- antiGeneric: how NON-generic / NON-AI-standard is the rewrite? (10 = highly singular; 1 = bland AI prose)
- identityScore: weighted overall (1-10).

Return JSON:
{
  "voicePreserved": 1-10,
  "emotionalIntensity": 1-10,
  "metaphorPreservation": 1-10,
  "antiGeneric": 1-10,
  "identityScore": 1-10,
  "voiceVerdict": "<one brutal sentence in ${language}: what was lost, what was gained>"
}`;
    let voice: VoiceScores | null = null;
    try {
      const voiceRaw = await callDeepSeek(DEEPSEEK_API_KEY, voiceSystem, voiceUser, true, 0.3, 800, "dominate_voice", "deepseek-chat");
      voice = JSON.parse(voiceRaw.replace(/```json\n?|```/g, "").trim());
    } catch (vErr) {
      console.error("voice guard failed:", vErr);
    }

    // VOICE GUARD VERDICT — GENRE-AWARE adaptive thresholds
    const resolvedKey = clientGenreKey || resolveGenreKeyInline(genre, subcategory);
    const guardProfile = VOICE_PROFILES[resolvedKey] || FALLBACK_PROFILE;

    let finalText = rewritten;
    let revertedForVoice = false;
    let revertReason: string | undefined;
    let rewriteConfidence = 0.5;

    if (voice) {
      // Per-priority adaptive thresholds (small relaxations on non-critical axes)
      let { minVoicePreserved, minEmotionalIntensity, minMetaphorPreservation, minAntiGeneric } = guardProfile;
      if (guardProfile.priority === "emotion") {
        // Emotion is critical → tolerate -1 on metaphor (clarity drops OK)
        minMetaphorPreservation = Math.max(4, minMetaphorPreservation - 1);
      } else if (guardProfile.priority === "clarity") {
        // Clarity wins → tolerate -1 on metaphor preservation
        minMetaphorPreservation = Math.max(4, minMetaphorPreservation - 1);
      } else {
        // voice priority → strict on voice + anti-generic, slight room on emotion
        minEmotionalIntensity = Math.max(5, minEmotionalIntensity - 1);
      }

      const voiceLost = voice.voicePreserved < minVoicePreserved;
      const flattened = voice.emotionalIntensity < minEmotionalIntensity;
      const metaphorLost = voice.metaphorPreservation < minMetaphorPreservation;
      const generic = voice.antiGeneric < minAntiGeneric;
      const identityCollapsed = voice.identityScore < 6;

      // Decide revert: priority axis is hard-blocking, secondary axes need 2+ failures
      const criticalFail =
        guardProfile.priority === "emotion" ? flattened || generic
        : guardProfile.priority === "voice" ? voiceLost || generic
        : /* clarity */ identityCollapsed;

      const secondaryFails = [voiceLost, flattened, metaphorLost, generic, identityCollapsed].filter(Boolean).length;

      if (criticalFail || secondaryFails >= 3) {
        finalText = currentText;
        revertedForVoice = true;
        revertReason = criticalFail
          ? (guardProfile.priority === "emotion" ? (flattened ? "emotion flattened" : "too generic for genre")
            : guardProfile.priority === "voice" ? (voiceLost ? "voice lost" : "too generic for genre")
            : "identity collapse")
          : `multiple voice failures (${secondaryFails}/5)`;
        console.log(`[voice-guard:${resolvedKey}/${guardProfile.priority}] REVERTED — ${revertReason}`, voice);
      }

      // Confidence: 0-1, lower if reverted, weighted by priority
      const qualityDelta = (evaluation.finalScore || 0) - (analysis.finalScore || 0);
      rewriteConfidence = revertedForVoice
        ? Math.min(0.3, computeRewriteConfidence(voice, guardProfile, qualityDelta))
        : computeRewriteConfidence(voice, guardProfile, qualityDelta);
    } else {
      // No voice data → low confidence by default
      rewriteConfidence = 0.4;
    }

    const pass: PassResult = {
      iteration,
      scoresBefore: analysis.scores,
      finalScoreBefore: analysis.finalScore,
      diagnosis: analysis.diagnosis,
      scoresAfter: evaluation.scores,
      finalScoreAfter: revertedForVoice ? analysis.finalScore : evaluation.finalScore,
      improvedText: finalText,
      improvementSummary: revertedForVoice
        ? `⚠️ Riscrittura scartata dal Voice Guard [${resolvedKey} / ${guardProfile.priority}] — ${revertReason}. Originale preservato.`
        : evaluation.improvementSummary,
      voice: voice || undefined,
      revertedForVoice,
      revertReason,
      voiceProfileUsed: resolvedKey,
      rewriteConfidence,
    };

    return new Response(
      JSON.stringify({
        pass,
        finalText,
        finalScore: revertedForVoice ? analysis.finalScore : evaluation.finalScore,
        finalScores: revertedForVoice ? analysis.scores : evaluation.scores,
        reachedThreshold: !revertedForVoice && evaluation.finalScore >= threshold,
        voice,
        revertedForVoice,
        revertReason,
        voiceProfileUsed: resolvedKey,
        voiceProfile: guardProfile,
        rewriteConfidence,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("dominate-chapter error:", e);
    const status = e.status || 0;
    if (status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit. Wait and retry.", code: "rate_limit" }),
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
