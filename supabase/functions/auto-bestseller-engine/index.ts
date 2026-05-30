import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logAIUsage, estimateTokens } from "../_shared/ai-tracking.ts";
import { applyAuthContext, enforceEdgeGuard, EDGE_GUARD_PROFILES } from "../_shared/edge-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Per-request tracking context (set at request entry, used by all callDeepSeek* helpers)
let __trackCtx: { projectId?: string | null; runId?: string | null; userId?: string | null } = {};

// =====================================================================
// AUTO-BESTSELLER ENGINE — SSE-streaming Publishing Brain™ orchestrator
//
// Two modes:
//   - GET  ?stream=1&payload=<base64-json> → SSE event stream
//   - POST { ...input }                    → single JSON response (legacy)
//
// SSE event types emitted (data: JSON):
//   stage         — { stage, status: "running"|"done"|"error", label, meta? }
//   retry         — { attempt, reason }
//   chapter       — { index, total, phase: "writing"|"refining"|"done", title, score?, voiceConfidence? }
//   done          — { result: OrchestratorOutput }
//   error         — { message }
// =====================================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY")!;

interface OrchestratorInput {
  idea?: string;
  topic?: string;
  genre: string;
  subcategory?: string;
  targetAudience: string;
  language?: string;
  tone?: string;
  numberOfChapters?: number;
  level?: "beginner" | "intermediate" | "advanced";
  readerPromise?: string;
  totalWordTarget?: number; // default 30000
  prefilledTitle?: string;
  prefilledSubtitle?: string;
  charactersText?: string;
  bookType?: string;
  userId?: string;
}

// =============================================================
// CHAPTER LENGTH DISTRIBUTION
// Importance curve: opening + first 2 cores + climax > middle/closing
// =============================================================
function distributeChapterWords(totalChapters: number, totalTarget: number): number[] {
  // weights shaped like a soft bell with stronger opening
  const weights: number[] = [];
  for (let i = 0; i < totalChapters; i++) {
    const pos = i / Math.max(1, totalChapters - 1);
    // base weight 1.0, boost first third, slight boost last (climax/CTA)
    let w = 1.0;
    if (pos < 0.15) w = 1.25;          // strong intro
    else if (pos < 0.4) w = 1.15;      // setup/foundations
    else if (pos > 0.85) w = 1.1;      // climax/conclusion
    else w = 0.95;                     // middle
    weights.push(w);
  }
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => {
    const raw = Math.round((w / sum) * totalTarget);
    return Math.max(1500, Math.min(4000, raw));
  });
}

// =============================================================
// PRACTICAL SECTION DIRECTIVES PER GENRE
// =============================================================
function getPracticalDirective(genre: string): string {
  const map: Record<string, string> = {
    "cookbook": "Include AT LEAST ONE complete recipe block with: ingredients (metric + US), step-by-step numbered instructions, prep/cook time, servings, 2-3 variations.",
    "diet-nutrition": "Include a 1-day or 1-week meal plan table (breakfast/lunch/dinner/snacks) with macros and a shopping list snippet.",
    "fitness": "Include a complete workout block: exercise list, sets x reps, rest times, weekly schedule, progression notes.",
    "gardening": "Include a seasonal calendar (month-by-month or week-by-week) and a tools/materials checklist.",
    "beekeeping": "Include a hive inspection checklist and a seasonal task table.",
    "ai-tools-guide": "Include 2-3 ready-to-copy prompt templates and one full real-world workflow (input → steps → output).",
    "software-guide": "Include numbered click-by-click steps, keyboard shortcuts, and one full mini-tutorial.",
    "technical-manual": "Include numbered procedural steps, specs/parameters, and a troubleshooting table.",
    "productivity": "Include one ready-to-use template/system (table, framework, or daily protocol) with a worked example.",
    "health-medicine": "Include a clear safety disclaimer, a protocol/checklist, and warning signs to watch.",
    "education": "Include worked examples, key takeaways box, and 3-5 self-check questions.",
    "business": "Include a real case study (numbers, timeline) and one actionable framework with steps.",
    "self-help": "Include one concrete exercise the reader can do today (5-15 min) with clear instructions.",
  };
  return map[genre] || "Include at least one concrete, actionable element the reader can apply immediately.";
}

interface ScoredCandidate {
  title: string;
  subtitle: string;
  marketScore: number;
  hookStrength: number;
  verdict: string;
  full: any;
}

interface OrchestratorOutput {
  title: string;
  subtitle: string;
  blueprint: any;
  chapters: Array<{
    title: string;
    content: string;
    coachReport?: any;
    voice?: any;
    rewriteConfidence?: number;
    finalScore?: number;
  }>;
  finalScore: number;
  marketScore: number;
  characterBible?: string;
  status: "ready_for_kdp" | "needs_revision" | "failed";
  pipeline: {
    titleCandidates: Array<{ title: string; subtitle: string; marketScore: number; verdict: string }>;
    conceptVerdict: any;
    conceptRetries: number;
    chapterCount: number;
    avgVoiceConfidence: number;
  };
}

// ---- Helpers --------------------------------------------------------

/**
 * Call DeepSeek with automatic 1-retry on transient failures (5xx, timeout,
 * empty response). For JSON-mode calls we use `deepseek-chat` by default
 * (faster, no reasoning tokens eating the output budget). For prose
 * generation (json=false) we keep `deepseek-reasoner` for higher quality.
 * `model` overrides the default selection.
 */
async function callDeepSeek(
  system: string,
  user: string,
  json = false,
  temperature = 0.7,
  maxTokens = 4000,
  model?: string,
  taskType: string = "auto_bestseller",
): Promise<string> {
  const chosenModel = model || "deepseek-chat";
  const body: any = {
    model: chosenModel,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature,
    max_tokens: maxTokens,
  };
  if (json) body.response_format = { type: "json_object" };

  // Per-call timeout: never hang forever. Default 90s for non-stream calls.
  const PER_CALL_TIMEOUT_MS = 90_000;

  const doFetch = async (): Promise<{ ok: boolean; status: number; text: string; content: string; usage: any }> => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), PER_CALL_TIMEOUT_MS);
    try {
      const r = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${DEEPSEEK_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      const text = await r.text();
      let content = "";
      let usage: any = null;
      if (r.ok) {
        try {
          const data = JSON.parse(text);
          content = data.choices?.[0]?.message?.content || "";
          usage = data.usage || null;
        } catch { /* will retry */ }
      }
      return { ok: r.ok, status: r.status, text, content, usage };
    } catch (e: any) {
      const aborted = e?.name === "AbortError";
      return { ok: false, status: aborted ? 599 : 0, text: aborted ? "timeout" : String(e?.message || e), content: "", usage: null };
    } finally {
      clearTimeout(timer);
    }
  };

  // Up to 4 attempts with exponential backoff + jitter.
  // Retries on: 5xx, 429, network error, timeout, empty content.
  const MAX_ATTEMPTS = 4;
  let lastErr = "";
  let lastStatus = 0;
  for (let i = 1; i <= MAX_ATTEMPTS; i++) {
    const attempt = await doFetch();
    const transient = !attempt.ok
      ? attempt.status >= 500 || attempt.status === 429 || attempt.status === 0 || attempt.status === 599
      : !attempt.content || attempt.content.trim().length < 2;
    if (!transient && attempt.ok) {
      const promptTokens = attempt.usage?.prompt_tokens ?? estimateTokens(system + user);
      const completionTokens = attempt.usage?.completion_tokens ?? estimateTokens(attempt.content);
      await logAIUsage({
        provider: "deepseek",
        model: chosenModel,
        taskType,
        promptTokens,
        completionTokens,
        promptCacheHitTokens: attempt.usage?.prompt_cache_hit_tokens,
        promptCacheMissTokens: attempt.usage?.prompt_cache_miss_tokens,
        projectId: __trackCtx.projectId || null,
        userId: __trackCtx.userId || null,
        metadata: { runId: __trackCtx.runId || null, json, attempts: i },
      });
      return attempt.content;
    }
    if (!transient && !attempt.ok) {
      // Hard error (4xx other than 429) — no point retrying
      throw new Error(`DeepSeek ${attempt.status}: ${attempt.text.slice(0, 300)}`);
    }
    lastErr = attempt.text;
    lastStatus = attempt.status;
    if (i < MAX_ATTEMPTS) {
      const wait = Math.min(15_000, 1000 * Math.pow(2, i - 1)) + Math.floor(Math.random() * 800);
      console.warn(`[callDeepSeek] attempt ${i}/${MAX_ATTEMPTS} failed (status=${attempt.status}). Retrying in ${wait}ms`);
      await new Promise((res) => setTimeout(res, wait));
    }
  }
  throw new Error(`DeepSeek failed after ${MAX_ATTEMPTS} attempts (last status=${lastStatus}): ${lastErr.slice(0, 200)}`);
}

/**
 * Streaming variant of callDeepSeek for long-form prose.
 * Calls `onDelta(textChunk, accumulated)` for each token chunk and
 * returns the full accumulated text. Falls back to a single non-stream
 * retry on transient failure (no partial content yet).
 */
async function callDeepSeekStream(
  system: string,
  user: string,
  temperature: number,
  maxTokens: number,
  onDelta: (chunk: string, accumulated: string) => void | Promise<void>,
  model = "deepseek-chat",
  taskType: string = "auto_bestseller_stream",
): Promise<string> {
  const body = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature,
    max_tokens: maxTokens,
    stream: true,
  };

  const doStream = async (): Promise<string> => {
    // Idle + total watchdog: never let one chapter freeze the whole book.
    const STREAM_IDLE_MS = 45_000;
    const STREAM_TOTAL_MS = 150_000;
    const startedAt = Date.now();
    let lastByte = Date.now();
    let accumulated = "";
    const ctrl = new AbortController();
    const watchdog = setInterval(() => {
      const idleMs = Date.now() - lastByte;
      const totalMs = Date.now() - startedAt;
      if (idleMs > STREAM_IDLE_MS || totalMs > STREAM_TOTAL_MS) {
        console.warn(`[callDeepSeekStream] aborting stream — idle=${idleMs}ms total=${totalMs}ms partial=${accumulated.length} chars`);
        ctrl.abort();
      }
    }, 5000);
    try {
      const r = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${DEEPSEEK_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!r.ok || !r.body) {
        const errText = await r.text().catch(() => "");
        throw new Error(`DeepSeek stream ${r.status}: ${errText.slice(0, 300)}`);
      }
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        lastByte = Date.now();
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              accumulated += delta;
              await onDelta(delta, accumulated);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
      return accumulated;
    } catch (e) {
      // If the model produced enough usable text before stalling, keep it.
      // This prevents a single frozen stream from restarting forever or blocking the book.
      if (accumulated.trim().length > 800) {
        console.warn(`[callDeepSeekStream] returning partial chapter after stream error: ${e instanceof Error ? e.message : e}`);
        return accumulated;
      }
      throw e;
    } finally {
      clearInterval(watchdog);
    }
  };

  // Up to 2 stream attempts, then fall back to non-stream call (which itself
  // retries up to 4 times). This guarantees we always get text unless DeepSeek
  // is completely down.
  for (let i = 1; i <= 2; i++) {
    try {
      const text = await doStream();
      if (text && text.trim().length >= 2) {
        await logAIUsage({
          provider: "deepseek",
          model,
          taskType,
          promptTokens: estimateTokens(system + user),
          completionTokens: estimateTokens(text),
          projectId: __trackCtx.projectId || null,
          userId: __trackCtx.userId || null,
          metadata: { runId: __trackCtx.runId || null, stream: true, estimated: true, attempts: i },
        });
        return text;
      }
      throw new Error("Empty stream");
    } catch (e) {
      console.warn(`[callDeepSeekStream] attempt ${i}/2 failed:`, e instanceof Error ? e.message : e);
      if (i < 2) await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));
    }
  }
  console.warn("[callDeepSeekStream] all stream attempts failed — falling back to non-stream");
  const text = await callDeepSeek(system, user, false, temperature, maxTokens, model, taskType + "_fallback");
  await onDelta(text, text);
  return text;
}

/**
 * Wrap a JSON-returning DeepSeek call with one parse-retry on a slightly
 * higher temperature. Prevents a single malformed reply from breaking the
 * whole pipeline.
 */
async function callDeepSeekJson(
  system: string,
  user: string,
  temperature = 0.7,
  maxTokens = 4000,
): Promise<any> {
  try {
    const raw = await callDeepSeek(system, user, true, temperature, maxTokens);
    return parseJson(raw);
  } catch (e) {
    console.warn("[callDeepSeekJson] first parse failed, retrying:", e instanceof Error ? e.message : e);
    const raw = await callDeepSeek(
      system + "\n\nIMPORTANT: respond with VALID, COMPLETE JSON only. No prose, no markdown, no truncation.",
      user,
      true,
      Math.min(0.9, temperature + 0.1),
      maxTokens,
    );
    return parseJson(raw);
  }
}

async function invokeFunction(name: string, payload: any, timeoutMs = 30_000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });

    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(`${name} failed ${r.status}: ${t}`);
    }

    return r.json();
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    throw new Error(`${name} ${aborted ? "timed out" : "failed"} after ${timeoutMs}ms`);
  } finally {
    clearTimeout(timer);
  }
}

function parseJson(raw: string): any {
  if (!raw || typeof raw !== "string") {
    throw new Error("Empty AI response");
  }
  // Strip markdown fences
  let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  if (!cleaned) throw new Error("Empty AI response after cleanup");

  // Find JSON boundaries (object or array)
  const firstObj = cleaned.indexOf("{");
  const firstArr = cleaned.indexOf("[");
  let start = -1;
  let openChar = "{";
  let closeChar = "}";
  if (firstObj === -1 && firstArr === -1) {
    throw new Error("No JSON found in AI response");
  }
  if (firstObj === -1 || (firstArr !== -1 && firstArr < firstObj)) {
    start = firstArr; openChar = "["; closeChar = "]";
  } else {
    start = firstObj; openChar = "{"; closeChar = "}";
  }
  let end = cleaned.lastIndexOf(closeChar);
  if (end < start) end = -1;
  let candidate = end > start ? cleaned.substring(start, end + 1) : cleaned.substring(start);

  // First attempt
  try { return JSON.parse(candidate); } catch { /* repair below */ }

  // Repair common issues
  let repaired = candidate
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Auto-close unbalanced braces/brackets (truncation)
  const opens = (repaired.match(/[\{\[]/g) || []).length;
  const closes = (repaired.match(/[\}\]]/g) || []).length;
  if (opens > closes) {
    // close last open string if any
    const quoteCount = (repaired.match(/"/g) || []).length;
    if (quoteCount % 2 === 1) repaired += '"';
    // strip trailing partial property like ,"key":
    repaired = repaired.replace(/,\s*"[^"]*"\s*:\s*$/g, "");
    repaired = repaired.replace(/,\s*$/g, "");
    // append missing closers using a stack walk
    const stack: string[] = [];
    let inStr = false;
    let esc = false;
    for (const ch of repaired) {
      if (esc) { esc = false; continue; }
      if (ch === "\\") { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === "{") stack.push("}");
      else if (ch === "[") stack.push("]");
      else if (ch === "}" || ch === "]") stack.pop();
    }
    while (stack.length) repaired += stack.pop();
  }

  try { return JSON.parse(repaired); }
  catch (e) {
    console.error("[parseJson] failed. Raw head:", raw.slice(0, 500));
    throw new Error(`Invalid JSON from AI: ${e instanceof Error ? e.message : "parse error"}`);
  }
}

// ---- Pipeline stages -----------------------------------------------

async function generateTitleCandidates(input: OrchestratorInput): Promise<Array<{ title: string; subtitle: string }>> {
  const system = `You are a senior Amazon KDP title strategist. You write titles that STOP scrolling buyers in the ${input.genre} category. Output STRICT JSON only. Speak in ${input.language || "English"}.`;
  const user = `Generate 5 distinct title + subtitle options for this book.

CONCEPT: ${input.idea || input.topic}
GENRE: ${input.genre}${input.subcategory ? ` / ${input.subcategory}` : ""}
TARGET AUDIENCE: ${input.targetAudience}

RULES:
- Each title 2-7 words, specific, emotional, scroll-stopping
- Each subtitle 6-15 words with concrete promise + keyword density
- NO generic patterns ("The Art of...", "How to...", "A Journey...")
- NO overused buzzwords (mindful, journey, essence, unleash, thrive)
- 5 DIFFERENT angles (emotional / outcome-driven / contrarian / urgent / niche)

Return JSON: { "candidates": [{ "title": "...", "subtitle": "..." }, ...] }`;
  const parsed = await callDeepSeekJson(system, user, 0.9, 4000);
  return (parsed.candidates || []).slice(0, 5);
}

async function pickBestTitle(
  candidates: Array<{ title: string; subtitle: string }>,
  input: OrchestratorInput,
): Promise<{ winner: ScoredCandidate; allScored: ScoredCandidate[] }> {
  const scored: ScoredCandidate[] = await Promise.all(
    candidates.map(async (c) => {
      try {
        const res = await invokeFunction("market-validator", {
          title: c.title,
          subtitle: c.subtitle,
          genre: input.genre,
          targetAudience: input.targetAudience,
          description: input.idea || input.topic,
        });
        return {
          ...c,
          marketScore: Number(res.marketScore) || 0,
          hookStrength: Number(res.hookStrength) || 0,
          verdict: res.verdict || "weak",
          full: res,
        };
      } catch (e) {
        console.error("market-validator failed for candidate:", c.title, e);
        return { ...c, marketScore: 0, hookStrength: 0, verdict: "weak", full: null };
      }
    }),
  );
  scored.sort((a, b) => {
    const penalty = (v: string) => (v === "saturated" ? -2 : v === "weak" ? -1 : 0);
    return (b.marketScore + b.hookStrength + penalty(b.verdict)) - (a.marketScore + a.hookStrength + penalty(a.verdict));
  });
  return { winner: scored[0], allScored: scored };
}

async function buildBlueprint(input: OrchestratorInput, title: string, subtitle: string) {
  const numChapters = input.numberOfChapters || 8;
  const system = `You are a bestselling book architect for the ${input.genre} category on Amazon KDP. Design structures that compete with the TOP 100. Output STRICT JSON only. Speak in ${input.language || "English"}.`;
  const user = `Design a complete blueprint optimized for KDP sellability.

TITLE: ${title}
SUBTITLE: ${subtitle}
GENRE: ${input.genre}${input.subcategory ? ` / ${input.subcategory}` : ""}
TARGET AUDIENCE: ${input.targetAudience}
TONE: ${input.tone || "natural for genre"}
READER LEVEL: ${input.level || "beginner"}
READER PROMISE: ${input.readerPromise || "deliver a clear, concrete transformation"}

${buildBlueprintIntegrityEngineForAuto(input, title, subtitle)}

Return JSON:
{
  "overview": "2-3 sentences — the book's market promise + transformation",
  "themes": ["3-5 themes that sell in this category"],
  "emotionalArc": "the reader's emotional/practical journey from chapter 1 to last",
  "integrity": {
    "bookCoreDNA": { "title": "", "subtitle": "", "genre": "", "subgenre": "", "narrativePromise": "", "emotionalPromise": "", "coreTheme": "", "coreFear": "", "coreDesire": "", "readerFantasy": "", "tone": "", "atmosphere": "", "writingStyle": "", "emotionalDensity": "", "violenceLevel": "", "spiceRomanceLevel": "", "endingDirection": "", "targetAudience": "", "bestsellerPositioning": "" },
    "worldLoreFoundation": { "worldRules": "", "socialStructure": "", "geography": "", "politicalTensions": "", "religionsBeliefs": "", "technologyOrMagicSystems": "", "forbiddenElements": "", "historicalScars": "", "culturalTensions": "", "environmentalTone": "", "symbolicRecurringElements": "" },
    "characterMemoryEngine": [],
    "structuralStoryArchitecture": { "actStructure": "", "narrativeEscalation": "", "emotionalEscalation": "", "midpointShift": "", "characterReversals": "", "betrayals": "", "tensionSpikes": "", "quietMoments": "", "setupsPayoffs": "", "cliffhangers": "", "revelationTiming": "", "finalPayoffStrategy": "" },
    "relationshipTensionEngine": { "attraction": "", "resistance": "", "trustEvolution": "", "emotionalDependency": "", "jealousy": "", "vulnerability": "", "powerImbalance": "", "conflictChemistry": "", "emotionalDistance": "", "unresolvedTension": "", "emotionalPayoffTiming": "" },
    "canonProtectionLayer": { "immutableCanonRules": [], "forbiddenMutations": [], "priorityOrder": [] },
    "narrativeImmersionRules": { "prioritize": [], "avoid": [], "sceneLaws": [] }
  },
  "chapterOutlines": [
    { "title": "specific, hook-driven", "summary": "2-3 sentences: what this chapter delivers, what payoff", "purpose": "", "emotionalFunction": "", "narrativeProgression": "", "characterEvolutionCheckpoint": "", "conflictProgression": "", "tensionProgression": "", "romanceProgression": "", "psychologicalProgression": "", "canonNotes": [] }
  ]
}

CRITICAL RULES:
- Generate exactly ${numChapters} chapters
- Each chapter has a UNIQUE role — NO filler, NO concept duplication between chapters
- Order must be PROGRESSIVE: foundations first, advanced/synthesis last
- Each chapter title must be specific, scroll-stopping, and genre-appropriate
- The arc must take the reader from where they are to the readerPromise`;
  return await callDeepSeekJson(system, user, 0.7, 6500);
}

async function runGoNoGoOnConcept(input: OrchestratorInput, title: string, subtitle: string, blueprint: any, marketData: any) {
  const conceptText = `${blueprint.overview}\n\nTHEMES: ${(blueprint.themes || []).join(", ")}\n\nEMOTIONAL ARC: ${blueprint.emotionalArc}\n\nCHAPTERS:\n${(blueprint.chapterOutlines || []).map((c: any, i: number) => `${i + 1}. ${c.title} — ${c.summary}`).join("\n")}`;
  return invokeFunction("go-no-go-engine", {
    chapterText: conceptText,
    title, subtitle,
    genre: input.genre,
    marketData,
    voiceData: null,
    genreAnalysis: null,
  });
}




function isNarrativeGenre(input: OrchestratorInput): boolean {
  const g = String(input.genre || "").toLowerCase();
  const bt = String(input.bookType || "").toLowerCase();
  return [
    "romance",
    "dark-romance",
    "thriller",
    "fantasy",
    "fiction",
    "memoir",
    "novel",
    "suspense",
    "mystery",
    "young adult",
    "historical",
  ].some((x) => g.includes(x) || bt.includes(x));
}

async function generateAutomaticCharacterBible(
  input: OrchestratorInput,
  title: string,
  subtitle: string,
  blueprint: any,
): Promise<string> {
  const manual = String(input.charactersText || "").trim();
  if (manual) return manual;

  if (!isNarrativeGenre(input)) return "";

  const system = `You are Scriptora's Story Continuity Architect.
You create a strict Character Bible before chapter writing starts.
Output plain text only. No markdown table. No JSON.
Write in ${input.language || "English"}.

Your job:
- infer the minimum necessary main cast from the book idea, title, subtitle and chapter blueprint;
- create stable names, roles, wounds, desires, secrets and relationship rules;
- prevent future chapters from renaming, replacing, or confusing characters.`;

  const user = `BOOK IDEA:
${input.idea || ""}

TITLE:
${title}

SUBTITLE:
${subtitle || ""}

GENRE:
${input.genre || ""}

TARGET READER:
${input.targetAudience || ""}

TONE:
${input.tone || ""}

BLUEPRINT:
Overview: ${blueprint?.overview || ""}
Themes: ${(blueprint?.themes || []).join(", ")}
Emotional arc: ${blueprint?.emotionalArc || ""}
Chapters:
${(blueprint?.chapterOutlines || []).map((c: any, i: number) => `${i + 1}. ${c.title} — ${c.summary}`).join("\n")}

Create a CHARACTER BIBLE with 2-6 characters max.

For each character include:
Name:
Surname:
Age:
Role:
Physical description:
Personality:
Core wound:
External desire:
Internal need:
Secret:
Relationship to other characters:
Strict continuity rules:

ABSOLUTE RULES:
- Once you choose a name, it is canon forever.
- Do not create alternate versions of the same character.
- If a dead spouse, ex, parent or rival exists, mark their role clearly.
- Make the protagonist unmistakable.
- Keep it concise but specific.
`;

  try {
    const bible = await callDeepSeek(system, user, false, 0.55, 3500, "auto_character_bible", "deepseek-chat");
    return String(bible || "").trim();
  } catch (e) {
    console.warn("[auto-character-bible] failed:", e);
    return "";
  }
}


function buildCharacterLockFromInput(input: OrchestratorInput): string {
  const raw = String(input.charactersText || "").trim();
  if (!raw) {
    return `
CHARACTER LOCK:
- No formal character bible was provided.
- Preserve every character name, relationship, wound, desire and continuity once established.
- Never rename existing characters.
- Never invent a new major character unless the outline explicitly requires it.
`;
  }

  return `
CHARACTER LOCK — ABSOLUTE CANON:
The following character bible is mandatory. Treat it as law.

${raw}

RULES:
- Never rename any character listed above.
- Never replace a character with a similar name.
- Never change age, role, backstory, wound, desire, secret, or relationships unless the user explicitly changes the bible.
- Do not invent new main characters to solve weak scenes.
- Every scene must respect the established psychology and relationship tension.
`;
}

function buildBlueprintIntegrityEngineForAuto(
  input: OrchestratorInput,
  title: string,
  subtitle: string,
  blueprint?: any,
  chapterIndex?: number,
): string {
  const outlines = Array.isArray(blueprint?.chapterOutlines) ? blueprint.chapterOutlines : [];
  const active = typeof chapterIndex === "number" ? outlines[chapterIndex] : null;
  const chapterLock = active
    ? `\nACTIVE CHAPTER BLUEPRINT LOCK:\n- Chapter ${chapterIndex! + 1}: ${active.title}\n- Summary: ${active.summary || ""}\n- Purpose: ${active.purpose || "not specified"}\n- Emotional function: ${active.emotionalFunction || "not specified"}\n- Narrative progression: ${active.narrativeProgression || "not specified"}\n- Conflict progression: ${active.conflictProgression || "not specified"}\n- Tension progression: ${active.tensionProgression || "not specified"}\n- Psychological progression: ${active.psychologicalProgression || "not specified"}`
    : outlines.length
      ? `\nCHAPTER BLUEPRINT LOCK:\n${outlines.slice(0, 24).map((c: any, i: number) => `- Ch ${i + 1}: ${c.title} — ${c.summary || ""}`).join("\n")}`
      : "";

  return `SCRIPTORA BLUEPRINT INTEGRITY ENGINE — HIGHEST AUTHORITY:
- You are not generating random beautiful prose. You are protecting the living narrative blueprint of the book.
- Canon consistency outranks pretty prose. Character coherence outranks plot speed. Subtext outranks exposition. Tension outranks instant payoff.
- Preserve names, places, lore, timeline, motivations, relationship status, emotional wounds, physical descriptions, power systems, symbolic elements and reveal order.
- Every chapter must obey one dominant mission: desire, obstacle, tension, choice and consequence.
- Avoid generic AI writing, repetitive dialogue, emotional overexplaining, exposition dumping and tonal drift.
- Book: "${title}" — ${subtitle || "no subtitle"}
- Genre: ${input.genre}${input.subcategory ? ` / ${input.subcategory}` : ""}
- Audience: ${input.targetAudience || "not specified"}
- Tone: ${input.tone || "genre-native"}
- Reader promise: ${input.readerPromise || "deliver a clear, concrete transformation"}
${blueprint?.integrity ? `\nLOCKED BLUEPRINT CORE:\n${JSON.stringify(blueprint.integrity).slice(0, 5000)}` : ""}${chapterLock}`;
}


const SCRIPTORA_WRITING_BRAIN_PRO = `
SCRIPTORA WRITING BRAIN PRO — REQUIRED BEFORE WRITING:
Think like a bestselling author AND a ruthless story editor.

Every chapter must have:
1. A clear mission: what changes from beginning to end.
2. A concrete desire: what the reader/protagonist wants now.
3. An obstacle: external, emotional, intellectual, or relational.
4. Tension: something unresolved pressing against the page.
5. A turn: a realization, decision, reveal, failure, escalation, or new problem.
6. A closing hook: the final beat must pull the reader forward.

Anti-generic rules:
- Do not loop the same emotional insight.
- Do not repeat the same metaphor in new clothing.
- Do not explain the theme after every scene.
- Do not use filler transitions or safe AI phrasing.
- Do not make every paragraph lyrical; mix image, action, dialogue, and consequence.

For fiction, romance, memoir:
- Build intimacy through subtext, restraint, timing, and consequence.
- Characters must not confess everything too quickly.
- After an intimate moment, show changed behavior, not repeated declarations.
- Respect continuity: never imply events that have not happened.

For nonfiction, self-help, business, guide:
- Deliver transformation through practical structure.
- Include concrete examples, frameworks, exercises, or steps.
- Inspiration without usable specificity is failure.
`;

async function writeChapter(
  input: OrchestratorInput,
  title: string,
  subtitle: string,
  blueprint: any,
  chapterIndex: number,
  ctx: {
    targetWords: number;
    previousSummaries: string[];
    coveredConcepts: string[];
    practicalDirective: string;
    isFirst: boolean;
    isLast: boolean;
  },
  onDelta?: (accumulated: string) => void | Promise<void>,
) {
  const outline = blueprint.chapterOutlines[chapterIndex];
  const characterLock = buildCharacterLockFromInput(input);
  const total = blueprint.chapterOutlines.length;
  const level = input.level || "beginner";
  const promise = input.readerPromise || "deliver a clear transformation for the reader";

  const previousBlock = ctx.previousSummaries.length
    ? `\nPREVIOUS CHAPTERS (do NOT repeat any of these points):\n${ctx.previousSummaries.map((s, i) => `Ch${i + 1}: ${s}`).join("\n")}\n`
    : "";
  const avoidBlock = ctx.coveredConcepts.length
    ? `\nALREADY COVERED CONCEPTS (forbidden to repeat — must extend or skip):\n- ${ctx.coveredConcepts.slice(0, 30).join("\n- ")}\n`
    : "";

  const positionRole = ctx.isFirst
    ? "OPENING CHAPTER — establish stakes, hook reader, set the foundation, NO advanced material yet."
    : ctx.isLast
      ? "CLOSING CHAPTER — synthesize, give a final actionable framework, leave the reader empowered."
      : `MIDDLE CHAPTER ${chapterIndex + 1}/${total} — build PROGRESSIVELY on previous chapters, introduce a new angle, deepen.`;

  const system = `You are a bestselling ${input.genre} author writing for Amazon KDP top-100 competition. Write in ${input.language || "English"}. Voice: ${input.tone || "native to genre"}. Reader level: ${level}. Never generic, never AI-flat, never safe. NEVER repeat content from earlier chapters.`;
  const user = `BOOK: "${title}" — ${subtitle}
GENRE: ${input.genre}${input.subcategory ? ` (${input.subcategory})` : ""}
AUDIENCE: ${input.targetAudience}
READER PROMISE: ${promise}

CHAPTER ${chapterIndex + 1} OF ${total}: "${outline.title}"
OUTLINE: ${outline.summary}
ROLE: ${positionRole}

BOOK OVERVIEW: ${blueprint.overview}
${previousBlock}${avoidBlock}
PRACTICAL REQUIREMENT (mandatory):
${ctx.practicalDirective}

${SCRIPTORA_WRITING_BRAIN_PRO}

${buildBlueprintIntegrityEngineForAuto(input, title, subtitle, blueprint, chapterIndex)}

${characterLock}

WRITE THIS CHAPTER NOW.
- Target length: ${ctx.targetWords} words (±10%)
- Open with a hook that stops the reader cold
- Genre-native rhythm and structure
- Specific examples, numbers, sensory detail — NO abstractions
- Build on what was already covered, do NOT repeat it
- End on a beat that pulls into the next chapter
- Use markdown headings (##) for major sections inside the chapter

Return ONLY the chapter prose. No chapter title line, no preamble, no meta.`;

  const maxTokens = Math.min(8000, Math.ceil(ctx.targetWords * 2.5));
  if (onDelta) {
    const text = await callDeepSeekStream(system, user, 0.85, maxTokens, async (_chunk, acc) => {
      await onDelta(acc);
    });
    return text.trim();
  }
  const text = await callDeepSeek(system, user, false, 0.85, maxTokens);
  return text.trim();
}

// Compress a chapter into editorial memory (summary + concept list)
async function summarizeChapter(chapterTitle: string, chapterText: string): Promise<{ summary: string; concepts: string[] }> {
  try {
    const truncated = chapterText.slice(0, 6000);
    const parsed = await callDeepSeekJson(
      "You compress book chapters into editorial memory. Output STRICT JSON only.",
      `Chapter title: "${chapterTitle}"
Chapter text:
${truncated}

Return JSON: { "summary": "2-3 sentence factual recap of what this chapter actually delivered", "concepts": ["5-8 short noun phrases — the specific concepts/techniques/examples introduced"] }`,
      0.3,
      600,
    );
    return {
      summary: String(parsed.summary || "").slice(0, 400),
      concepts: Array.isArray(parsed.concepts) ? parsed.concepts.slice(0, 8).map((c: any) => String(c)) : [],
    };
  } catch (e) {
    console.error("summarizeChapter failed:", e);
    return { summary: chapterTitle, concepts: [] };
  }
}

async function refineChapter(input: OrchestratorInput, chapterTitle: string, chapterText: string) {
  let coachReport: any = null;
  let autoFixBlock = "";
  try {
    const coach = await invokeFunction("genre-coach", {
      chapterTitle, chapterText,
      language: input.language || "English",
      genreProfile: { genre: input.genre, subcategory: input.subcategory },
    }, 18_000);
    coachReport = coach.parsed || coach;
    autoFixBlock = coachReport?.autoFixPromptBlock || coach?.autoFixPromptBlock || "";
  } catch (e) {
    console.error("genre-coach failed:", e);
  }

  let dominate: any = null;
  try {
    dominate = await invokeFunction("dominate-chapter", {
      chapterTitle, chapterText,
      genre: input.genre,
      subcategory: input.subcategory,
      tone: input.tone || "",
      language: input.language || "English",
      threshold: 8.5,
      iteration: 1,
      genreAutoFixBlock: autoFixBlock,
    }, 25_000);
  } catch (e) {
    console.error("dominate-chapter failed:", e);
  }

  return {
    coachReport,
    finalText: dominate?.finalText || chapterText,
    voice: dominate?.voice,
    rewriteConfidence: dominate?.rewriteConfidence ?? 0.5,
    finalScore: dominate?.finalScore ?? coachReport?.genreFitScore ?? 7,
  };
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
  fallback: T,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => {
          console.warn(`[auto-bestseller] ${label} timed out after ${ms}ms — using safe fallback`);
          resolve(fallback);
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}


function countWordsLoose(text: string): number {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

function minUsableChapterWords(targetWords: number): number {
  // Soglia severa ma non suicida:
  // un capitolo deve avere almeno il 45% del target,
  // mai meno di 450 parole, mai più di 900 come soglia minima.
  return Math.min(900, Math.max(450, Math.floor(targetWords * 0.45)));
}

// ---- Core pipeline (callable from both modes) ----------------------

async function runPipeline(
  input: OrchestratorInput,
  emit?: (event: string, data: any) => Promise<void> | void,
): Promise<OrchestratorOutput> {
  const send = async (event: string, data: any) => {
    if (emit) await emit(event, data);
  };

  // STAGE 1: titles
  await send("stage", { stage: "titles", status: "running", label: "Generating 5 title candidates" });
  const candidates = await generateTitleCandidates(input);
  if (!candidates.length) throw new Error("No title candidates generated");
  await send("stage", { stage: "titles", status: "done", label: `${candidates.length} candidates generated`, meta: { candidates } });

  // STAGE 2: market-validate
  await send("stage", { stage: "market", status: "running", label: "Validating market potential" });
  const { winner, allScored } = await pickBestTitle(candidates, input);
  await send("stage", { stage: "market", status: "done", label: `Winner: "${winner.title}" (score ${winner.marketScore})`, meta: { allScored, winner: { title: winner.title, subtitle: winner.subtitle, marketScore: winner.marketScore, verdict: winner.verdict } } });
  // LIVE PREVIEW: emit title/subtitle immediately so UI can render header
  await send("book", { kind: "header", title: winner.title, subtitle: winner.subtitle });

  // STAGES 3+4: blueprint + go/no-go (with up to 2 retries on NO)
  let blueprint: any = null;
  let conceptVerdict: any = null;
  let retries = 0;
  let title = winner.title;
  let subtitle = winner.subtitle;

  for (let attempt = 0; attempt < 3; attempt++) {
    await send("stage", { stage: "blueprint", status: "running", label: `Building blueprint (attempt ${attempt + 1})` });
    blueprint = await buildBlueprint(input, title, subtitle);
    await send("stage", { stage: "blueprint", status: "done", label: `${blueprint.chapterOutlines?.length || 0} chapters outlined` });
    // LIVE PREVIEW: emit blueprint outlines so UI can render TOC
    await send("book", {
      kind: "blueprint",
      title,
      subtitle,
      outlines: (blueprint.chapterOutlines || []).map((o: any) => ({ title: o.title, summary: o.summary })),
    });

    await send("stage", { stage: "gono", status: "running", label: "Go/No-Go decision on concept" });
    conceptVerdict = await runGoNoGoOnConcept(input, title, subtitle, blueprint, winner.full);
    await send("stage", { stage: "gono", status: "done", label: `Verdict: ${conceptVerdict.verdict}`, meta: { conceptVerdict } });

    if (conceptVerdict.verdict !== "NO") break;

    retries++;
    await send("retry", { attempt: retries, reason: `Concept rejected: ${conceptVerdict.coreProblem || "NO"}` });
    const next = allScored[Math.min(retries, allScored.length - 1)];
    if (next && next !== winner) {
      title = next.title;
      subtitle = next.subtitle;
    }
  }

  if (conceptVerdict?.verdict === "NO") {
    const failed: OrchestratorOutput = {
      title, subtitle, blueprint, chapters: [],
      finalScore: 0, marketScore: winner.marketScore, status: "failed",
      pipeline: {
        titleCandidates: allScored.map((c) => ({ title: c.title, subtitle: c.subtitle, marketScore: c.marketScore, verdict: c.verdict })),
        conceptVerdict, conceptRetries: retries, chapterCount: 0, avgVoiceConfidence: 0,
      },
    };
    await send("stage", { stage: "aggregate", status: "error", label: "Concept rejected after 3 attempts" });
    return failed;
  }

  // STAGE 4.5: automatic Character Bible / Character Lock
  const generatedCharacterBible = await withTimeout(
    generateAutomaticCharacterBible(input, title, subtitle, blueprint),
    35000,
    "generateAutomaticCharacterBible",
    "",
  );

  const inputForWriting: OrchestratorInput = {
    ...input,
    charactersText: String(input.charactersText || generatedCharacterBible || "").trim(),
  };

  // STAGE 5: chapters with progressive context engine + length distribution
  const chapters: OrchestratorOutput["chapters"] = [];
  const total = blueprint.chapterOutlines.length;
  const genreKeyForLength = String(input.genre || "").toLowerCase();
  const subKeyForLength = String(input.subcategory || "").toLowerCase();
  const ideaKeyForLength = String(input.idea || "").toLowerCase();

  const isPracticalBook =
    genreKeyForLength.includes("garden") ||
    genreKeyForLength.includes("gardening") ||
    genreKeyForLength.includes("manual") ||
    genreKeyForLength.includes("how-to") ||
    genreKeyForLength.includes("business") ||
    genreKeyForLength.includes("self-help") ||
    genreKeyForLength.includes("health") ||
    genreKeyForLength.includes("fitness") ||
    genreKeyForLength.includes("cooking") ||
    subKeyForLength.includes("manual") ||
    subKeyForLength.includes("how-to") ||
    ideaKeyForLength.includes("orto") ||
    ideaKeyForLength.includes("coltivazione") ||
    ideaKeyForLength.includes("giardin") ||
    ideaKeyForLength.includes("fragole") ||
    ideaKeyForLength.includes("manuale") ||
    ideaKeyForLength.includes("guida pratica");

  const defaultTotalTarget = isPracticalBook ? 42000 : 30000;
  const minTotalTarget = isPracticalBook ? 26000 : 15000;
  const totalTarget = Math.max(minTotalTarget, Math.min(70000, input.totalWordTarget || defaultTotalTarget));
  const wordTargets = distributeChapterWords(total, totalTarget);
  const practicalDirective = getPracticalDirective(input.genre);

  // Editorial memory accumulated across chapters
  const previousSummaries: string[] = [];
  const coveredConcepts: string[] = [];

  for (let i = 0; i < total; i++) {
    const outline = blueprint.chapterOutlines[i];
    let draft = "";
    let writeAttempts = 0;
    const MAX_WRITE_ATTEMPTS = 3;

    // ====== Phase A: WRITE — never give up, scale down on failure ======
    while (writeAttempts < MAX_WRITE_ATTEMPTS && !draft) {
      writeAttempts++;
      try {
        await send("chapter", { index: i, total, phase: "writing", title: outline.title, content: "" });
        let lastEmitTs = 0;
        let lastEmitLen = 0;
        // On retry, reduce target to give the model a smaller/safer task
        const adjustedTarget = writeAttempts === 1
          ? wordTargets[i]
          : Math.max(800, Math.floor(wordTargets[i] * (writeAttempts === 2 ? 0.7 : 0.5)));
        draft = await writeChapter(inputForWriting, title, subtitle, blueprint, i, {
          targetWords: adjustedTarget,
          previousSummaries,
          coveredConcepts,
          practicalDirective,
          isFirst: i === 0,
          isLast: i === total - 1,
        }, async (accumulated) => {
          const now = Date.now();
          if (now - lastEmitTs < 250 && accumulated.length - lastEmitLen < 120) return;
          lastEmitTs = now;
          lastEmitLen = accumulated.length;
          await send("chapter", { index: i, total, phase: "writing", title: outline.title, content: accumulated });
        });

        const producedWords = countWordsLoose(draft);
        const minWords = minUsableChapterWords(adjustedTarget);
        if (producedWords < minWords) {
          const tinyPreview = draft.slice(0, 220).replace(/\s+/g, " ");
          draft = "";
          throw new Error(`Chapter too short: ${producedWords}/${minWords} words. Restarting from scratch. Preview: ${tinyPreview}`);
        }
      } catch (e) {
        console.error(`[runPipeline] writeChapter ch${i + 1} attempt ${writeAttempts} failed:`, e);
        await send("retry", { attempt: writeAttempts, reason: `Chapter ${i + 1}: ${e instanceof Error ? e.message : "error"}` });
        // brief backoff between attempts
        await new Promise((r) => setTimeout(r, 1500 * writeAttempts));
      }
    }

    // ====== Phase B: EMERGENCY FALLBACK — guarantee non-empty content ======
    if (!draft || countWordsLoose(draft) < 250) {
      console.warn(`[runPipeline] ch${i + 1} write failed or too short after all attempts — using emergency fallback`);
      try {
        const fallbackSystem = `You are a professional ${input.genre} author. Write in ${input.language || "English"}. Be concise but complete.`;
        const fallbackUser = `Write a complete chapter for the book "${title}".
Chapter ${i + 1} of ${total}: "${outline.title}"
Outline: ${outline.summary}
Audience: ${input.targetAudience}
Length: ~800 words. Self-contained, no preamble. Plain prose, no JSON.`;
        draft = await callDeepSeek(fallbackSystem, fallbackUser, false, 0.7, 2500);
      } catch (e) {
        // Truly last resort — short placeholder so the book still completes
        console.error(`[runPipeline] ch${i + 1} emergency fallback also failed:`, e);
        draft = `## ${outline.title}\n\n${outline.summary}\n\n*[This chapter could not be fully generated. Please regenerate it from the editor.]*`;
      }
    }

    // emit final draft
    await send("chapter", { index: i, total, phase: "writing", title: outline.title, content: draft });

    // ====== Phase C: REFINE — best-effort, never blocks completion ======
    await send("chapter", { index: i, total, phase: "refining", title: outline.title, content: draft });
    let refined: { finalText: string; coachReport?: any; voice?: any; rewriteConfidence: number; finalScore: number };
    try {
      refined = await withTimeout(
        refineChapter(inputForWriting, outline.title, draft),
        30_000,
        `refineChapter ch${i + 1}`,
        { finalText: draft, coachReport: null, voice: null, rewriteConfidence: 0.5, finalScore: 6 },
      );
    } catch (e) {
      console.error(`[runPipeline] refineChapter ch${i + 1} failed — using draft as-is:`, e);
      refined = { finalText: draft, coachReport: null, voice: null, rewriteConfidence: 0.5, finalScore: 6 };
    }

    chapters.push({
      title: outline.title,
      content: refined.finalText,
      coachReport: refined.coachReport,
      voice: refined.voice,
      rewriteConfidence: refined.rewriteConfidence,
      finalScore: refined.finalScore,
    });

    // ====== Phase D: MEMORY — best-effort ======
    try {
      const mem = await withTimeout(
        summarizeChapter(outline.title, refined.finalText),
        35_000,
        `summarizeChapter ch${i + 1}`,
        { summary: `${outline.title} — ${outline.summary}`, concepts: [] },
      );
      previousSummaries.push(mem.summary);
      for (const c of mem.concepts) {
        if (!coveredConcepts.includes(c)) coveredConcepts.push(c);
      }
    } catch (e) {
      console.error("memory update failed:", e);
      previousSummaries.push(`${outline.title} — ${outline.summary}`);
    }

    await send("chapter", {
      index: i, total, phase: "done", title: outline.title,
      score: refined.finalScore, voiceConfidence: refined.rewriteConfidence,
      content: refined.finalText,
    });
  }


  // STAGE 6: aggregate
  await send("stage", { stage: "aggregate", status: "running", label: "Aggregating final score" });
  const valid = chapters.filter((c) => (c.finalScore || 0) > 0);
  const avgScore = valid.length ? valid.reduce((s, c) => s + (c.finalScore || 0), 0) / valid.length : 0;
  const avgConfidence = valid.length ? valid.reduce((s, c) => s + (c.rewriteConfidence || 0), 0) / valid.length : 0;
  const finalScore = Math.round(avgScore * 10) / 10;
  const marketScore = winner.marketScore;
  const status: OrchestratorOutput["status"] =
    finalScore >= 7.5 && marketScore >= 7 && conceptVerdict.verdict === "GO" ? "ready_for_kdp"
    : finalScore >= 6 && marketScore >= 5 ? "needs_revision"
    : "failed";

  const result: OrchestratorOutput = {
    title, subtitle, blueprint, chapters, finalScore, marketScore, status,
    characterBible: String(inputForWriting?.charactersText || "").trim(),
    pipeline: {
      titleCandidates: allScored.map((c) => ({ title: c.title, subtitle: c.subtitle, marketScore: c.marketScore, verdict: c.verdict })),
      conceptVerdict, conceptRetries: retries, chapterCount: chapters.length,
      avgVoiceConfidence: Math.round(avgConfidence * 100) / 100,
    },
  };
  await send("stage", { stage: "aggregate", status: "done", label: `Final score ${finalScore} • status ${status}` });
  return result;
}

// ---- Server ---------------------------------------------------------

// ---- Background-safe progress writer (so the run keeps progressing even if the client disconnects) ----
async function persistProgressToDb(runId: string, progressLog: any[], extra: Record<string, unknown> = {}) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/auto_bestseller_runs?id=eq.${runId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": SERVICE_ROLE,
        "Authorization": `Bearer ${SERVICE_ROLE}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ progress: progressLog, ...extra }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[persistProgressToDb] non-OK ${res.status}: ${text}`);
    }
  } catch (e) {
    console.warn("[persistProgressToDb] failed:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // ---- SSE mode (GET ?stream=1&payload=base64-json) ----
  const url = new URL(req.url);
  if (req.method === "GET" && url.searchParams.get("stream") === "1") {
    const guard = await enforceEdgeGuard(req, {}, EDGE_GUARD_PROFILES["auto-bestseller-engine"]);
    if (guard instanceof Response) return guard;

    const payloadParam = url.searchParams.get("payload");
    if (!payloadParam) {
      return new Response("Missing payload param", { status: 400, headers: corsHeaders });
    }

    let input: OrchestratorInput & { runId?: string; userId?: string };
    try {
      input = JSON.parse(atob(payloadParam));
    } catch {
      return new Response("Invalid payload (must be base64 JSON)", { status: 400, headers: corsHeaders });
    }

    if (!input.genre || !(input.idea || input.topic) || !input.targetAudience) {
      return new Response("genre, idea/topic, and targetAudience are required", { status: 400, headers: corsHeaders });
    }
    if (!DEEPSEEK_API_KEY || !SUPABASE_URL || !SERVICE_ROLE) {
      return new Response("Missing env config", { status: 500, headers: corsHeaders });
    }

    input.userId = guard.userId;
    const runId = input.runId;
    __trackCtx = { projectId: runId || null, runId: runId || null, userId: guard.userId };

    // Buffer of all progress events — used to PATCH the DB row periodically so
    // the run keeps making visible progress even if the client tab disconnects.
    const progressLog: any[] = [];
    let dbFlushTimer: number | null = null;
    const queueDbFlush = () => {
      if (!runId || dbFlushTimer !== null) return;
      dbFlushTimer = setTimeout(() => {
        dbFlushTimer = null;
        // fire-and-forget — never block the pipeline
        void persistProgressToDb(runId, [...progressLog], { status: "running" });
      }, 1000) as unknown as number;
    };

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let clientClosed = false;

        const safeEnqueue = (chunk: Uint8Array) => {
          if (clientClosed) return;
          try { controller.enqueue(chunk); } catch { clientClosed = true; }
        };

        const send = async (event: string, data: any) => {
          // 1) record into progress log for DB persistence
          progressLog.push({ type: event, ...(typeof data === "object" && data ? data : { value: data }), ts: Date.now() });
          queueDbFlush();
          // 2) push to client (best-effort — ok if client disconnected)
          const chunk = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          safeEnqueue(encoder.encode(chunk));
        };

        // keepalive comment every ~15s while pipeline runs
        const keepalive = setInterval(() => safeEnqueue(encoder.encode(": ping\n\n")), 15000);

        // Background-safe pipeline: keeps running even after client disconnects.
        const pipelineWork = (async () => {
          try {
            const result = await runPipeline(input, send);
            await send("done", { result });
            if (runId) {
              await persistProgressToDb(runId, [...progressLog], {
                status: result.status,
                result,
                final_score: result.finalScore,
                market_score: result.marketScore,
              });
            }
          } catch (e: any) {
            console.error("[SSE pipeline error]", e);
            const message = e instanceof Error ? e.message : "Unknown error";
            await send("error", { message });
            if (runId) {
              await persistProgressToDb(runId, [...progressLog], { status: "failed", error: message });
            }
          } finally {
            clearInterval(keepalive);
            if (dbFlushTimer !== null) {
              clearTimeout(dbFlushTimer);
              dbFlushTimer = null;
              if (runId) await persistProgressToDb(runId, [...progressLog], {});
            }
            try { controller.close(); } catch { /* ignore */ }
          }
        })();

        // Detach: keep the worker alive past the HTTP response lifecycle
        // so navigating away in the browser does not kill the generation.
        const ER: any = (globalThis as any).EdgeRuntime;
        if (ER && typeof ER.waitUntil === "function") {
          ER.waitUntil(pipelineWork);
        }
      },
      cancel() {
        // Browser/client closed the SSE — DO NOT abort the pipeline.
        // The work continues via EdgeRuntime.waitUntil and progress is written to DB.
        console.log("[SSE] client disconnected — pipeline continues in background");
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }

  // ---- Legacy POST mode (single JSON response) ----
  try {
    const rawBody = await req.json().catch(() => ({})) as Record<string, unknown>;
    const guard = await enforceEdgeGuard(req, rawBody, EDGE_GUARD_PROFILES["auto-bestseller-engine"]);
    if (guard instanceof Response) return guard;
    const input = applyAuthContext(guard, rawBody) as OrchestratorInput & { runId?: string; userId?: string };
    input.userId = guard.userId;
    if (!input.genre || !(input.idea || input.topic) || !input.targetAudience) {
      return new Response(JSON.stringify({ error: "genre, idea/topic, and targetAudience are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!DEEPSEEK_API_KEY || !SUPABASE_URL || !SERVICE_ROLE) {
      throw new Error("Missing required environment configuration");
    }
    __trackCtx = { projectId: input.runId || null, runId: input.runId || null, userId: guard.userId };
    const result = await runPipeline(input);
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("auto-bestseller-engine error:", e);
    return new Response(JSON.stringify({ status: "failed", error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
