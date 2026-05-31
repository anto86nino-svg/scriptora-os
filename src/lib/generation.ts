import { BookConfig, Chapter, FrontMatter, BackMatter, BookBlueprint, Genre, AIQualityRating, BOOK_LENGTH_CONFIG, getBookTotalWords, getSubchaptersPerChapter, GenreLock } from "@/types/book";
import { fetchSupabaseFunction, formatEdgeFunctionFailure, parseEdgeFunctionErrorBody } from "@/lib/supabase-function-auth";
import { readSupabaseEnv } from "@/integrations/supabase/client";
import { buildGenreSystemBlock, buildGenreBlueprintBlock, buildGenreEditorialBlock, getGenreBlueprint, buildPromptByGenre, resolveGenreKey } from "@/lib/genre-intelligence";
import { buildBookIntelligencePromptBlock, resolveBookIntelligenceFromConfig } from "@/lib/book-intelligence";
import { buildLongBookMemory, buildLongBookMemoryPromptBlock } from "@/lib/long-book-memory";
import { buildNarrativeIntelligencePromptBlock } from "@/lib/narrative-intelligence-v2";
import type { LongBookMemorySnapshot } from "@/lib/long-book-memory/types";
import {
  buildBestsellerIntelligencePromptBlock,
  evaluateChapterBestsellerIntel,
  isBestsellerIntelligenceEnabled,
} from "@/lib/bestseller-intelligence";
import { getChapterTitleIntegration } from "@/lib/ChapterTitleIntegration";
import { buildWritingStyleBlock, findStylePresetById, findStylePresetByLabel } from "@/lib/writing-styles";
import { buildEditorialMasteryBlock } from "@/lib/editorial-mastery";
import { validateEditorial } from "@/lib/editorial-validator";
import { withRetry, getBreakerCooldown } from "@/lib/api-resilience";
import { normalizeAuthorIdentity } from "@/lib/author-identity";
import { applyAuthorBrainToBackMatter, applyAuthorBrainToFrontMatter } from "@/lib/author-brain";
import { resolveChapterTitle, formatChapterDisplayTitle } from "@/lib/chapter-titles";
import { getScriptoraLanguage } from "@/lib/i18n";
import { getCurrentUserId } from "@/services/storageService";
import { buildHumanizerPromptBlock, humanizeChapter, humanizeNarrativeText } from "@/lib/HumanizerLayer";
import {
  buildEditorialIntentPromptBlock,
  buildEditorialIntentSheet,
  isEditorialOrchestratorEnabled,
  runPreDeliveryGate,
} from "@/lib/editorial-orchestrator";
import {
  buildBlueprintIntegrityBlueprintRequest,
  buildBlueprintIntegrityFoundationBlock,
  buildBlueprintIntegrityRuntimeBlock,
  normalizeBlueprintIntegrity,
  normalizeChapterOutlineExtras,
  normalizeSubchapterOutlineExtras,
} from "@/lib/BlueprintIntegrityEngine";
import {
  buildNarrativeIntelligenceSystemBlock,
  buildNarrativeIntelligenceRuntimeBlock,
  getNarrativeTelemetrySnapshot,
} from "@/lib/narrative-intelligence";

/**
 * Verbose streaming logs are off by default — they intasavano la console
 * during chunked generation (12+ logs per chunk × ~5 chunks × 12 chapters
 * = ~700 entries per book). Enable in DevTools with:
 *   window.__NEXORA_DEBUG_STREAM__ = true
 * or set localStorage key 'nexora-debug-stream' = '1'.
 * Critical events (start, completion, errors, warnings) always log.
 */
const DEV_DEBUG_STREAM: boolean = (() => {
  try {
    if (typeof window === "undefined") return false;
    if ((window as any).__NEXORA_DEBUG_STREAM__ === true) return true;
    return localStorage.getItem("nexora-debug-stream") === "1";
  } catch { return false; }
})();

const DEV_DEBUG_NARRATIVE: boolean = (() => {
  try {
    if (typeof window === "undefined") return false;
    if ((window as any).__SCRIPTORA_DEBUG_NARRATIVE__ === true) return true;
    return localStorage.getItem("scriptora-debug-narrative") === "1";
  } catch {
    return false;
  }
})();

function emitNarrativeTelemetry(event: string, config: BookConfig, chapterIndex: number, text?: string) {
  if (!DEV_DEBUG_NARRATIVE) return;
  try {
    const snapshot = getNarrativeTelemetrySnapshot({ config, currentText: text });
    const payload = {
      event,
      chapterIndex: chapterIndex + 1,
      ...snapshot,
    };
    console.info("[NarrativeTelemetry]", payload);
    window.dispatchEvent(new CustomEvent("scriptora:narrative-telemetry", { detail: payload }));
  } catch (error) {
    console.warn("[NarrativeTelemetry] emission failed", error);
  }
}

/* ============ Genre Lock helper ============ */
/**
 * Build a GenreLock from a config. Called once at project creation
 * so the entire book stays editorially consistent.
 */
export function buildGenreLock(config: BookConfig): GenreLock {
  const bp = getGenreBlueprint(config.genre, (config as any).subcategory);
  return {
    genre: config.genre,
    subcategory: (config as any).subcategory,
    structure: bp.structure,
    rules: bp.contentRules,
    chapterStyle: bp.chapterStyle,
    tone: bp.tone,
    frontMatterTemplate: bp.frontMatterTemplate,
    backMatterTemplate: bp.backMatterTemplate,
    hasSubchapters: bp.hasSubchapters,
    lockedAt: new Date().toISOString(),
  };
}

/** Resolve effective blueprint: prefer locked one, else compute fresh. */
function resolveLockedBlueprint(config: BookConfig, lock?: GenreLock) {
  if (lock) {
    return {
      structure: lock.structure,
      tone: lock.tone,
      chapterStyle: lock.chapterStyle as any,
      hasSubchapters: lock.hasSubchapters,
      frontMatterTemplate: lock.frontMatterTemplate,
      backMatterTemplate: lock.backMatterTemplate,
      contentRules: lock.rules,
    };
  }
  return getGenreBlueprint(config.genre, (config as any).subcategory);
}

class AICreditsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AICreditsError";
  }
}

export interface AIUsageContext {
  projectId?: string | null;
  userId?: string | null;
  taskType?: string;
  metadata?: Record<string, unknown>;
}

function usagePayload(usage?: AIUsageContext) {
  return {
    taskType: usage?.taskType || "generate_book",
    projectId: usage?.projectId || null,
    userId: usage?.userId || getCurrentUserId(),
    metadata: usage?.metadata || {},
  };
}

function notifyUsageChanged() {
  try {
    window.dispatchEvent(new Event("nexora-usage-change"));
  } catch { /* noop */ }
}

function withUsage(base: AIUsageContext | undefined, patch: AIUsageContext): AIUsageContext {
  return {
    ...base,
    ...patch,
    metadata: { ...(base?.metadata || {}), ...(patch.metadata || {}) },
  };
}

function describeAIHttpError(status: number, message: string): string {
  return formatEdgeFunctionFailure(status, message);
}

async function callAIOnce(systemPrompt: string, userPrompt: string, timeoutMs: number = 300000, usage?: AIUsageContext): Promise<string> {
  const controller = new AbortController();
  // Use a watchdog: reset whenever we receive bytes (DeepSeek can be slow but
  // streaming → we only abort on TRUE silence).
  let lastByteAt = Date.now();
  const watchdog = setInterval(() => {
    if (Date.now() - lastByteAt > timeoutMs) {
      console.warn(`[Nexora] No bytes received for ${timeoutMs}ms — aborting`);
      controller.abort();
    }
  }, 5000);

  if (DEV_DEBUG_STREAM) console.log("[Nexora] AI request started (streaming)");
  try {
    const { url, key } = readSupabaseEnv();
    if (!url || !key) {
      throw new Error("Missing Supabase configuration for AI generation.");
    }
    const currentUsage = usagePayload(usage);
    const res = await fetchSupabaseFunction("generate-book", {
      method: "POST",
      json: { systemPrompt, userPrompt, ...currentUsage },
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const errMsg = parseEdgeFunctionErrorBody(text);
      if (errMsg.includes("credits exhausted") || errMsg.includes("API key invalid") || res.status === 402) {
        throw new AICreditsError(errMsg);
      }
      throw new Error(describeAIHttpError(res.status, errMsg));
    }

    if (!res.body) throw new Error("AI stream unavailable. Please retry generation.");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      lastByteAt = Date.now(); // reset watchdog on each byte
      buffer += decoder.decode(value, { stream: true });
    }
    clearInterval(watchdog);

    const marker = buffer.lastIndexOf("__RESULT__");
    if (marker === -1) {
      console.warn("[Nexora] No result marker found");
      throw new Error("Empty response from AI");
    }
    const jsonStr = buffer.slice(marker + "__RESULT__".length).trim();
    let parsed: { content?: string; error?: string };
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("[Nexora] Failed to parse AI result payload:", parseError);
      throw new Error("AI response was incomplete. Please retry generation.");
    }
    if (parsed.error) {
      if (parsed.error.includes("credits exhausted")) throw new AICreditsError(parsed.error);
      throw new Error(parsed.error);
    }
    if (!parsed.content) throw new Error("Empty response from AI");
    if (DEV_DEBUG_STREAM) console.log("[Nexora] AI response received:", parsed.content.length, "chars");
    notifyUsageChanged();
    return parsed.content;
  } catch (e: any) {
    clearInterval(watchdog);
    if (e.name === "AbortError") throw new Error("Generation timed out (no response)");
    throw e;
  }
}

/**
 * Resilient AI call with circuit breaker + exponential backoff.
 * Retries up to 3 times; never blocks the caller forever.
 */
async function callAI(systemPrompt: string, userPrompt: string, usage?: AIUsageContext): Promise<string> {
  const cooldown = getBreakerCooldown("deepseek");
  if (cooldown > 0) {
    throw new Error(`AI temporarily unavailable. Retry in ${Math.ceil(cooldown / 1000)}s.`);
  }
  return withRetry(
    () => callAIOnce(systemPrompt, userPrompt, 180000, usage),
    {
      maxAttempts: 3,
      baseDelayMs: 2000,
      maxDelayMs: 12000,
      serviceKey: "deepseek",
      shouldRetry: (err) => !(err instanceof AICreditsError),
    },
  );
}

// Reduced chunk size fallback for resilience
async function callAIReduced(systemPrompt: string, userPrompt: string, usage?: AIUsageContext): Promise<string> {
  return callAIOnce(systemPrompt, userPrompt, 180000, usage);
}

/**
 * FAST blueprint call — uses DeepSeek non-streaming JSON mode.
 * 90s hard timeout; faster than streaming for short structured output.
 */
async function callBlueprintFast(systemPrompt: string, userPrompt: string, usage?: AIUsageContext): Promise<string> {
  const callOnce = async (): Promise<string> => {
    const res = await fetchSupabaseFunction("generate-blueprint-fast", {
      method: "POST",
      json: { systemPrompt, userPrompt, ...usagePayload({ ...usage, taskType: usage?.taskType || "generate_blueprint" }) },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const errMsg = parseEdgeFunctionErrorBody(text);
      if (res.status === 402) throw new AICreditsError(errMsg || "AI credits exhausted");
      throw new Error(errMsg || `Blueprint generation failed (${res.status})`);
    }
    const { content, error } = await res.json();
    if (error) {
      if (String(error).includes("credits")) throw new AICreditsError(error);
      throw new Error(error);
    }
    if (!content) throw new Error("Empty blueprint response");
    notifyUsageChanged();
    return content as string;
  };
  return withRetry(callOnce, {
    maxAttempts: 2,
    baseDelayMs: 1500,
    maxDelayMs: 4000,
    serviceKey: "deepseek-blueprint",
    shouldRetry: (err) => !(err instanceof AICreditsError),
  });
}

/* ============ Context Memory Engine ============ */

function extractKeyIdeas(content: string): string[] {
  // Extract sentences that look like key insights (contain strong verbs, declarations)
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 40 && s.trim().length < 200);
  // Take the first and last meaningful sentences as bookends
  const first = sentences.slice(0, 2).map(s => s.trim());
  const last = sentences.slice(-2).map(s => s.trim());
  return [...new Set([...first, ...last])].slice(0, 4);
}

function buildContextMemory(
  config: BookConfig,
  blueprint: BookBlueprint,
  previousChapters: Chapter[],
  chapterIndex: number,
  longBookMemory?: LongBookMemorySnapshot,
): string {
  if (previousChapters.length === 0) {
    const openingMemory = longBookMemory ?? buildLongBookMemory({ config, blueprint, chapters: [] });
    const openingNarrative = buildNarrativeIntelligencePromptBlock(openingMemory, config);
    return `This is the FIRST chapter — establish the tone, introduce the core premise, and hook the reader immediately.

${buildLongBookMemoryPromptBlock(openingMemory, chapterIndex)}
${openingNarrative ? `\n${openingNarrative}` : ""}`;
  }

  const summaries = previousChapters.map((c, i) => {
    const wordCount = c.content.split(/\s+/).length;
    const keyIdeas = extractKeyIdeas(c.content);
    const subTitles = c.subchapters.map(s => s.title).join(", ");
    return `Ch ${i + 1} "${c.title}" (${wordCount} words):
  Opening: ${c.content.substring(0, 150)}...
  Key ideas: ${keyIdeas.join(" | ")}
  Ending: ...${c.content.substring(Math.max(0, c.content.length - 150))}${subTitles ? `\n  Subchapters: ${subTitles}` : ""}`;
  }).join("\n\n");

  const arcPosition = chapterIndex / config.numberOfChapters;
  const arcPhase = arcPosition < 0.25 ? "OPENING — establishing foundations"
    : arcPosition < 0.5 ? "RISING — deepening and developing"
    : arcPosition < 0.75 ? "CLIMAX — peak tension and transformation"
    : "RESOLUTION — integration and closure";

  // Track emotional progression across chapters
  const emotionalTrack = previousChapters.length >= 2
    ? `Emotional trajectory: The book has moved from "${previousChapters[0].title}" through "${previousChapters[previousChapters.length - 1].title}". Continue escalating.`
    : "";

  const memory = longBookMemory ?? buildLongBookMemory({ config, blueprint, chapters: previousChapters });
  const longMemoryBlock = buildLongBookMemoryPromptBlock(memory, chapterIndex);
  const narrativeIntelBlock = buildNarrativeIntelligencePromptBlock(memory, config);

  return `NARRATIVE MEMORY (you MUST maintain perfect continuity):

${longMemoryBlock}
${narrativeIntelBlock ? `\n${narrativeIntelBlock}\n` : ""}

PREVIOUS CHAPTERS:
${summaries}

${emotionalTrack}

BOOK ARCHITECTURE:
- Emotional arc: ${blueprint.emotionalArc}
- Arc position: Chapter ${chapterIndex + 1} of ${config.numberOfChapters} — ${arcPhase}
- Core themes: ${blueprint.themes.join(", ")}

${buildBlueprintIntegrityRuntimeBlock(config, blueprint, { chapterIndex })}

CONTINUITY RULES (MANDATORY):
- Reference and BUILD UPON ideas from previous chapters — create callbacks
- NEVER repeat examples, metaphors, anecdotes, or structural patterns
- Progress the emotional arc naturally — escalate, deepen, transform
- Each chapter must feel like the NEXT step in a journey, not a standalone piece
- The reader must sense ONE author mind behind the entire book
- Include 2-4 sentences per chapter that are highlight-worthy — emotionally powerful, quotable, shareable
- These "highlight sentences" must feel natural, not forced — embed them within the flow`;
}

/* ============ Style Lock ============ */

function getStyleLock(config: BookConfig): string {
  // Risolvi un eventuale preset (per id o per label legacy) per esporre il nome leggibile
  const preset = findStylePresetById(config.authorStyle) ?? findStylePresetByLabel(config.authorStyle);
  const styleLabel = preset?.label ?? config.authorStyle;
  const styleBlock = buildWritingStyleBlock(config.authorStyle);
  const authorBlock = buildAuthorIdentityBlock(config);

  return `STYLE LOCK — MAINTAIN CONSISTENTLY:
- Tone: "${config.tone}" — NEVER deviate from this voice
- Author/Style DNA: "${styleLabel}" — channel this voice's rhythm, vocabulary, and sensibility
- Genre conventions: ${config.genre} — honor genre expectations while transcending them
- Language: ${config.language} — EVERY word in ${config.language}, no exceptions

${styleBlock}

${authorBlock}

If previous chapters established a specific vocabulary, rhythm, or narrative device, CONTINUE using it. Style drift = failure.`;
}

function buildAuthorIdentityBlock(config: BookConfig): string {
  const identity = normalizeAuthorIdentity(config.authorIdentity);
  const penName = identity?.penName || config.authorName || config.author || config.writerName || "";
  const copyrightName = identity?.copyrightName || identity?.realName || penName;
  if (!identity && !String(penName || "").trim()) return "";

  if (!identity) {
    return `AUTHOR ATTRIBUTION LOCK:
- Publishing author / pen name: ${penName}
- Write as a coherent original authorial voice attributable to this name.
- Maintain one consistent sensibility, vocabulary, rhythm, and worldview across the entire book.`;
  }

  return `AUTHOR IDENTITY LOCK — THIS BOOK MUST SOUND ATTRIBUTABLE TO THIS AUTHOR:
Publishing author / pen name: ${identity.penName}
Real/legal author name: ${identity.realName || "not specified"}
Copyright holder: ${copyrightName || "not specified"}
Internal identity/profile name: ${identity.name}
Author archetype: ${identity.archetype || "not specified"}
Public author biography: ${identity.biography || "not specified"}
Author note / personal afterword: ${identity.authorNote || "not specified"}
Core voice: ${identity.voice || "not specified"}
Signature moves to repeat naturally: ${identity.signatureMoves || "not specified"}
Forbidden moves / never do this: ${identity.forbiddenMoves || "not specified"}
Recurring themes and obsessions: ${identity.recurringThemes || "not specified"}

MANDATORY AUTHORSHIP RULES:
- The prose must feel written by ${identity.penName}, not by a generic AI.
- Use this identity as the authorial worldview behind metaphors, examples, emotional priorities, and chapter endings.
- Use the public pen name exactly as "${identity.penName}" in book attribution, title page, cover metadata and author-facing sections.
- Use the copyright holder exactly as "${copyrightName || identity.penName}" when copyright/legal ownership is needed.
- Use the public biography and author note in front/back matter when those sections are generated.
- Keep the signature moves recognizable but never copy-paste the same sentence pattern.
- Never mention this identity block or explain the style rules inside the book.`;
}

function getAuthorPenName(config: BookConfig): string {
  const identity = normalizeAuthorIdentity(config.authorIdentity);
  return (identity?.penName || config.authorName || config.author || config.writerName || "").trim();
}

function getAuthorCopyrightName(config: BookConfig): string {
  const identity = normalizeAuthorIdentity(config.authorIdentity);
  return (identity?.copyrightName || identity?.realName || identity?.penName || config.authorName || config.author || config.writerName || "").trim();
}

function buildAuthorBookDeclaration(config: BookConfig): string {
  const identity = normalizeAuthorIdentity(config.authorIdentity);
  const penName = getAuthorPenName(config) || "Not specified";
  const copyrightName = getAuthorCopyrightName(config) || penName;
  if (!identity) {
    return `AUTHOR DECLARATION:
- Pen name/public author: ${penName}
- Copyright holder: ${copyrightName}`;
  }
  return `AUTHOR DECLARATION:
- Pen name/public author printed in the book: ${identity.penName}
- Real/legal name: ${identity.realName || "not specified"}
- Copyright holder: ${copyrightName}
- Public biography to use in "About the Author": ${identity.biography || "not specified"}
- Personal author note to use in back matter: ${identity.authorNote || "not specified"}
- Authorial voice: ${identity.voice || "not specified"}
- Signature moves: ${identity.signatureMoves || "not specified"}
- Forbidden moves: ${identity.forbiddenMoves || "not specified"}`;
}

/* ============ Word Budget System ============ */



function buildCharacterLock(config: BookConfig): string {
  const chars = Array.isArray((config as any).characters) ? (config as any).characters : [];
  const usable = chars.filter((c: any) => String(c?.name || "").trim());

  if (!usable.length) {
    return `
CHARACTER LOCK:
- No formal character bible was provided.
- Maintain every character name, role, backstory, relationship and emotional continuity already established in previous chapters.
- Never rename an existing character.
- Never invent a new major character unless the outline explicitly requires it.
`;
  }

  const rows = usable.map((c: any, i: number) => {
    const fullName = [c.name, c.surname].filter(Boolean).join(" ").trim();
    return `${i + 1}. ${fullName}
   Role: ${c.role || "not specified"}
   Age: ${c.age || "not specified"}
   Physical: ${c.physicalDescription || "not specified"}
   Personality: ${c.personality || "not specified"}
   Wound: ${c.wound || "not specified"}
   External desire: ${c.externalDesire || "not specified"}
   Internal need: ${c.internalNeed || "not specified"}
   Secret: ${c.secret || "not specified"}
   Relationships: ${c.relationships || "not specified"}
   Strict rules: ${c.strictRules || "Never rename this character. Never change their role, age, wound, desire, secret, or relationship continuity."}`;
  }).join("\\n\\n");

  return `
CHARACTER LOCK — ABSOLUTE CANON:
These are the canonical main characters. Treat this as law.

${rows}

MANDATORY RULES:
- Never rename a character. If the protagonist is Laura, she stays Laura in every chapter.
- Never replace a character with a similar name.
- Never change age, role, wound, desire, secret, relationship, nationality, or personality unless the user explicitly changes the bible.
- Never invent a new main character to solve a scene.
- New minor characters are allowed only when necessary, and must not steal the emotional role of the canonical cast.
- Every scene must respect the characters' established psychology and relationship tension.
`;
}

function buildScriptoraWritingBrain(config: BookConfig): string {
  const genre = String(config.genre || "").toLowerCase();

  const narrativeMode =
    genre.includes("romance") ||
    genre.includes("thriller") ||
    genre.includes("fantasy") ||
    genre.includes("memoir") ||
    genre.includes("fiction") ||
    genre.includes("dark");

  return `
SCRIPTORA WRITING BRAIN PRO — MANDATORY STORY INTELLIGENCE:
Before writing, silently plan the chapter as a real publishing editor would.

CORE SCENE LOGIC:
- Every chapter must change something. If nothing changes, the chapter fails.
- Every major scene needs: desire, obstacle, tension, choice, consequence.
- The protagonist must want something concrete in the moment, not only feel something abstract.
- Avoid emotional loops: do not restate the same realization in different words.
- Never repeat the same inner conclusion across paragraphs, especially phrases like "I am not running anymore", "I want to stay", "this changed everything", unless there is a new consequence.
- Show emotion through behavior, silence, physical detail, contradiction, and specific sensory images.
- Do not explain the theme after every scene. Let the scene carry the theme.

DIALOGUE AND SUBTEXT:
- Dialogue must hide as much as it reveals.
- Characters should avoid saying exactly what they feel too early.
- Use interruption, hesitation, avoidance, gesture, and silence.
- Every exchange must either increase intimacy, reveal danger, expose history, or create a new question.

CONTINUITY AND CONSEQUENCE:
- Respect what has actually happened. Do not imply physical or emotional events that have not occurred.
- Track emotional escalation carefully: attraction → hesitation → vulnerability → choice → consequence.
- Each chapter should build from the previous one, not restart the same emotional beat.
- If a kiss happened, explore its aftermath through altered behavior, not repeated declarations.

LANGUAGE QUALITY:
- Prefer concrete images over generic emotional statements.
- Cut AI-clichés, over-explaining, and repeated metaphors.
- Use one fresh dominant image per scene; do not pile metaphors.
- Make the ending create forward pull: a secret, a decision, a fear, a promise, or a complication.

${narrativeMode ? `FICTION / ROMANCE / MEMOIR EXTRA RULES:
- Build romantic tension through restraint, distance, almost-touch, timing, and emotional risk.
- Do not let characters confess everything too soon.
- Every intimate moment must have a cost, a fear, or a consequence.
- Avoid making every paragraph lyrical; vary rhythm with action, sharp dialogue, and grounded detail.
- The reader must feel: "I need the next scene."` : `NONFICTION / SELF-HELP / GUIDE EXTRA RULES:
- Every chapter must deliver a usable transformation, not just inspiration.
- Alternate story, principle, example, and practical application.
- Include at least one concrete framework, exercise, checklist, or diagnostic moment when appropriate.
- Avoid motivational fog. Make the advice specific enough to use today.`}
`;
}

function getChapterTargetWords(config: BookConfig, chapterIndex: number, totalChapters: number, chapterLengthOverride?: string): number {
  const configuredTotal = getBookTotalWords(config);
  const bookTotal = Number.isFinite(configuredTotal) && configuredTotal > 0
    ? configuredTotal
    : BOOK_LENGTH_CONFIG.medium.totalWords;
  const safeTotalChapters = Number.isFinite(totalChapters) && totalChapters > 0 ? totalChapters : 1;
  const chapterBase = Math.round(bookTotal / safeTotalChapters);
  const localLength = chapterLengthOverride || config.chapterLength;
  const multiplier = localLength === "short" ? 0.6 : localLength === "long" ? 1.5 : 1.0;
  return Math.round(chapterBase * multiplier);
}

function getChapterLengthInstruction(config: BookConfig, chapterIndex: number, totalChapters: number, chapterLengthOverride?: string): string {
  const target = getChapterTargetWords(config, chapterIndex, totalChapters, chapterLengthOverride);
  const min = Math.round(target * 0.8);
  const max = Math.round(target * 1.2);

  const langNote = config.language !== "English" ? ` Write in ${config.language}.` : "";
  const depthNote = config.bookLength === "long"
    ? " Write with deep, immersive, layered narrative."
    : config.bookLength === "short"
      ? " Concise, high-density writing."
      : "";

  return `Write approximately ${min}–${max} words.${depthNote}${langNote}`;
}

/* ============ Genre Prompts (delegated to Genre Intelligence Engine) ============ */

function getGenrePrompt(config: BookConfig): string {
  // Usa il modulo Genre Intelligence per profili profondi per genere/sottocategoria
  return buildGenreSystemBlock(config.genre, (config as any).subcategory);
}

function getSystemPrompt(config: BookConfig, lock?: GenreLock, opts?: { dominateMode?: boolean }): string {
  const langMap: Record<string, string> = {
    English: "English", Italian: "Italian (Italiano)", Spanish: "Spanish (Español)",
    French: "French (Français)", German: "German (Deutsch)",
  };
  const lang = langMap[config.language] || config.language;
  const genrePrompt = getGenrePrompt(config);
  const bp = resolveLockedBlueprint(config, lock);
  const editorialBlock = `EDITORIAL BLUEPRINT — ${resolveGenreKey(config.genre, (config as any).subcategory).toUpperCase()}${lock ? " (LOCKED)" : ""}
Book structure (sections): ${bp.structure.join(" → ")}
Editorial tone: ${bp.tone}
Chapter style: ${bp.chapterStyle}
Subchapters expected: ${bp.hasSubchapters ? "yes" : "no"}

CONTENT RULES (mandatory for every chapter):
${bp.contentRules.map(r => `• ${r}`).join("\n")}`;

  const masteryBlock = buildEditorialMasteryBlock({
    genre: config.genre,
    subcategory: (config as any).subcategory,
    language: lang,
    tone: config.tone,
    dominateMode: opts?.dominateMode,
  });
  const narrativeSystemBlock = buildNarrativeIntelligenceSystemBlock(config);
  const intelligenceSnapshot = resolveBookIntelligenceFromConfig(config, config.bookIntelligence);
  const intelligenceBlock = buildBookIntelligencePromptBlock(intelligenceSnapshot);

  return `${genrePrompt}

${intelligenceBlock}

${buildBlueprintIntegrityFoundationBlock(config)}

${editorialBlock}

${getStyleLock(config)}

${masteryBlock}

${narrativeSystemBlock}

ABSOLUTE RULES — BESTSELLER STANDARD:
1. WRITE EVERYTHING IN ${lang.toUpperCase()}. Every word, title, sentence MUST be in ${lang}. No exceptions.
2. START every chapter with a powerful HOOK — tension, uncomfortable truth, or scene-in-motion. Never throat-clearing.
3. Include at least 3–5 quotable, highlight-worthy sentences per chapter.
4. NEVER repeat ideas, phrases, examples, or structural patterns across chapters.
5. Each chapter must escalate — building emotional, cognitive, or narrative momentum.
6. Write at PUBLISHED BESTSELLER quality — superior to current market average.
7. Create sentences readers will screenshot, highlight, and share.
8. Use varied sentence rhythm — short punches mixed with flowing prose.
9. Book scope: ${BOOK_LENGTH_CONFIG[config.bookLength].description} (target: ~${getBookTotalWords(config).toLocaleString()} total words)
10. RESPECT THE EDITORIAL BLUEPRINT — chapter style and content rules are MANDATORY${lock ? " AND LOCKED" : ""}.
11. RESPECT THE EDITORIAL MASTERY LAYER — apply silently, never expose its rules in the text.
12. OUTPUT RULE: return ONLY the final content. No commentary, no explanations, no labels, no apologies.`;
}

/* ============ Phase Logic for Chunked Writing ============ */

export type ChunkPhase = "OPENING" | "DEVELOPMENT" | "EXPANSION" | "TRANSITION" | "CLOSURE";

function getChunkPhase(currentWords: number, targetWords: number): ChunkPhase {
  const ratio = currentWords / targetWords;
  if (ratio < 0.2) return "OPENING";
  if (ratio < 0.4) return "DEVELOPMENT";
  if (ratio < 0.7) return "EXPANSION";
  if (ratio < 0.85) return "TRANSITION";
  return "CLOSURE";
}

function getPhaseInstruction(phase: ChunkPhase): string {
  switch (phase) {
    case "OPENING":
      return "Hook the reader immediately. Build intrigue and establish the emotional premise. Create a compelling opening that demands continued reading.";
    case "DEVELOPMENT":
      return "Expand on the core ideas. Deepen the narrative with examples, insights, and emotional layers. Build momentum.";
    case "EXPANSION":
      return "Add richness: new perspectives, vivid examples, emotional complexity. This is the heart of the chapter — make it resonate deeply.";
    case "TRANSITION":
      return "Begin guiding toward resolution. Tie threads together. Start the emotional convergence toward the chapter's conclusion.";
    case "CLOSURE":
      return "Write a powerful, satisfying ending. Create emotional payoff. The final paragraph must feel inevitable and resonant. DO NOT expand further — CLOSE the chapter.";
  }
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function checkOverlap(existingText: string, newChunk: string): number {
  const existingSentences = existingText.split(/[.!?]+/).filter(s => s.trim().length > 20).slice(-10);
  const newSentences = newChunk.split(/[.!?]+/).filter(s => s.trim().length > 20);
  if (newSentences.length === 0) return 0;
  let overlapping = 0;
  for (const ns of newSentences) {
    const nsTrimmed = ns.trim().toLowerCase();
    for (const es of existingSentences) {
      if (es.trim().toLowerCase().includes(nsTrimmed.substring(0, 50)) || nsTrimmed.includes(es.trim().toLowerCase().substring(0, 50))) {
        overlapping++;
        break;
      }
    }
  }
  return overlapping / newSentences.length;
}

/* ============ Adaptive Chunk Intelligence ============ */

type ChunkSize = "LARGE" | "MEDIUM" | "SMALL" | "MICRO";

interface ChunkSizeConfig {
  min: number;
  max: number;
  timeout: number;
  label: string;
}

// Timeouts increased — DeepSeek streaming can take 60-90s for LARGE chunks
// Watchdog in callAIOnce resets on each received byte, so timeout = max IDLE time
const CHUNK_SIZES: Record<ChunkSize, ChunkSizeConfig> = {
  LARGE:  { min: 1200, max: 1700, timeout: 150000, label: "Large (1200–1700)" },
  MEDIUM: { min: 900,  max: 1200, timeout: 120000, label: "Medium (900–1200)" },
  SMALL:  { min: 600,  max: 900,  timeout: 90000,  label: "Small (600–900)" },
  MICRO:  { min: 300,  max: 600,  timeout: 60000,  label: "Micro (300–600)" },
};

function selectChunkSize(consecutiveFailures: number): ChunkSize {
  if (consecutiveFailures === 0) return "LARGE";
  if (consecutiveFailures === 1) return "MEDIUM";
  if (consecutiveFailures === 2) return "SMALL";
  return "MICRO";
}

function getAdaptivePromptSuffix(chunkSize: ChunkSize): string {
  if (chunkSize === "SMALL" || chunkSize === "MICRO") {
    return `\n\nIMPORTANT: You are writing a shorter, focused section of a larger chapter.
Develop ONE idea clearly and deeply.
Do NOT rush. Maintain high quality and emotional depth.
Every sentence must feel intentional and polished.`;
  }
  return "";
}

function cleanJsonFence(value: string): string {
  return String(value || "").replace(/```json\n?|```/g, "").trim();
}

function stringifyField(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(stringifyField).filter(Boolean).join("\n\n");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => `${key}: ${stringifyField(val)}`)
      .filter((line) => line.trim().length > 0)
      .join("\n");
  }
  return String(value);
}

function normalizeBlueprint(raw: unknown, config: BookConfig): BookBlueprint {
  const source = raw && typeof raw === "object" ? raw as Partial<BookBlueprint> : {};
  const outlines = Array.isArray(source.chapterOutlines) ? source.chapterOutlines : [];
  const chapterOutlines = Array.from({ length: config.numberOfChapters }, (_, i) => {
    const item = outlines[i] || {};
    const summary = stringifyField((item as any).summary).trim() || `Develop chapter ${i + 1} of "${config.title}".`;
    const title = resolveChapterTitle(stringifyField((item as any).title).trim(), i, {
      config,
      summary,
      totalChapters: config.numberOfChapters,
    });
    const rawSubs = Array.isArray((item as any).subchapters) ? (item as any).subchapters : [];
    const subchapterCount = getSubchaptersPerChapter(config);
    const subchapters = subchapterCount > 0
      ? Array.from({ length: subchapterCount }, (_, j) => {
          const sub = rawSubs[j] || {};
          const fallbackTitle = buildFallbackSubchapterTitle(title, j, config.language);
          return {
            title: stringifyField(sub?.title).trim() || fallbackTitle,
            summary: stringifyField(sub?.summary).trim() || `${summary} Focus this section on ${fallbackTitle.toLowerCase()}.`,
            ...normalizeSubchapterOutlineExtras(sub),
          };
        })
      : undefined;

    const extras = normalizeChapterOutlineExtras(item);
    return subchapters?.length ? { title, summary, ...extras, subchapters } : { title, summary, ...extras };
  });

  const themes = Array.isArray(source.themes)
    ? source.themes.map(stringifyField).map((x) => x.trim()).filter(Boolean)
    : [];

  return {
    overview: stringifyField(source.overview).trim() || stringifyField(raw).trim() || `Blueprint for "${config.title}".`,
    chapterOutlines,
    themes,
    emotionalArc: stringifyField(source.emotionalArc).trim(),
    integrity: normalizeBlueprintIntegrity((source as any).integrity || (source as any).blueprintIntegrity, config, chapterOutlines),
  };
}

function buildFallbackSubchapterTitle(chapterTitle: string, index: number, language: string): string {
  const italian = String(language || "").toLowerCase().includes("ital");
  const beats = italian
    ? ["Apertura", "Pressione", "Scelta", "Conseguenza", "Rivelazione", "Ferita", "Svolta", "Aftershock"]
    : ["Opening Move", "Pressure Point", "Choice", "Consequence", "Revelation", "Wound", "Turn", "Aftershock"];
  const beat = beats[index % beats.length];
  const cleanTitle = stringifyField(chapterTitle).replace(/^chapter\s+\d+[:.\-\s]*/i, "").trim();
  return cleanTitle ? `${cleanTitle} · ${beat}` : beat;
}

function normalizeFrontMatter(raw: unknown, config: BookConfig): FrontMatter {
  const source = raw && typeof raw === "object" ? raw as Partial<FrontMatter> : {};
  const identity = normalizeAuthorIdentity(config.authorIdentity);
  const penName = getAuthorPenName(config);
  const copyrightName = getAuthorCopyrightName(config);
  const year = new Date().getFullYear();
  const titlePageFallback = [config.title, config.subtitle, penName ? `di ${penName}` : ""].filter(Boolean).join("\n\n");
  const copyrightFallback = copyrightName
    ? `© ${year} ${copyrightName}. Tutti i diritti riservati.\nAutore / pen name: ${penName || copyrightName}.`
    : `© ${year}`;
  const base: FrontMatter = {
    titlePage: stringifyField(source.titlePage).trim() || titlePageFallback,
    copyright: stringifyField(source.copyright).trim() || copyrightFallback,
    dedication: stringifyField(source.dedication).trim(),
    aboutAuthor: stringifyField(source.aboutAuthor).trim(),
    howToUse: stringifyField(source.howToUse).trim(),
    letterToReader: stringifyField(source.letterToReader).trim() || (typeof raw === "string" ? raw : ""),
  };

  const result: FrontMatter = { ...base, ...applyAuthorBrainToFrontMatter(base, config, "soft") };

  if (penName && !result.titlePage.toLowerCase().includes(penName.toLowerCase())) {
    result.titlePage = [result.titlePage, `di ${penName}`].filter(Boolean).join("\n\n");
  }
  if (copyrightName && !result.copyright.toLowerCase().includes(copyrightName.toLowerCase())) {
    result.copyright = [result.copyright, `© ${year} ${copyrightName}.`].filter(Boolean).join("\n");
  }
  if (penName && !result.copyright.toLowerCase().includes(penName.toLowerCase())) {
    result.copyright = [result.copyright, `Autore / pen name: ${penName}.`].filter(Boolean).join("\n");
  }

  return result;
}

function normalizeBackMatter(raw: unknown, config?: BookConfig): BackMatter {
  const source = raw && typeof raw === "object" ? raw as Partial<BackMatter> : {};
  const identity = config ? normalizeAuthorIdentity(config.authorIdentity) : null;
  const penName = config ? getAuthorPenName(config) : "";
  const authorNoteFallback = identity?.authorNote || (identity?.biography ? `${penName ? `${penName}. ` : ""}${identity.biography}` : "");
  const base: BackMatter = {
    conclusion: stringifyField(source.conclusion).trim() || (typeof raw === "string" ? raw : ""),
    authorNote: stringifyField(source.authorNote).trim() || authorNoteFallback,
    callToAction: stringifyField(source.callToAction).trim(),
    reviewRequest: stringifyField(source.reviewRequest).trim(),
    otherBooks: stringifyField(source.otherBooks).trim(),
  };
  const existingFollow = stringifyField(source.followAuthor).trim();
  if (existingFollow) base.followAuthor = existingFollow;

  if (!config) return base;

  const injected = applyAuthorBrainToBackMatter(base, config, "soft");
  const merged: BackMatter = {
    ...base,
    otherBooks: injected.otherBooks || base.otherBooks,
  };
  const follow = injected.followAuthor || base.followAuthor;
  if (follow?.trim()) merged.followAuthor = follow.trim();
  return merged;
}

/* ============ Chunked Chapter Generation ============ */

export interface ChunkProgress {
  chunkIndex: number;
  totalChunks: number;
  currentWords: number;
  targetWords: number;
  phase: ChunkPhase;
  content: string;
  chunkSize?: ChunkSize;
}

export async function generateChapterChunked(
  config: BookConfig,
  blueprint: BookBlueprint,
  chapterIndex: number,
  previousChapters: Chapter[],
  chapterLengthOverride?: string,
  onChunkProgress?: (progress: ChunkProgress) => void,
  genreLock?: GenreLock,
  opts?: { adaptive?: { plan: import("@/lib/plan").PlanTier }; usage?: AIUsageContext; longBookMemory?: LongBookMemorySnapshot },
): Promise<Chapter> {
  const rawOutline = blueprint.chapterOutlines[chapterIndex] || {
    title: "",
    summary: `Develop chapter ${chapterIndex + 1} of "${config.title}".`,
  };
  const outline = {
    ...rawOutline,
    title: resolveChapterTitle(rawOutline.title, chapterIndex, {
      config,
      summary: rawOutline.summary,
      totalChapters: config.numberOfChapters,
    }),
  };
  const targetWords = getChapterTargetWords(config, chapterIndex, config.numberOfChapters, chapterLengthOverride);
  const contextMemory = buildContextMemory(config, blueprint, previousChapters, chapterIndex, opts?.longBookMemory);
  const systemBase = getSystemPrompt(config, genreLock);
  const scriptoraWritingBrain = buildScriptoraWritingBrain(config);
  const characterLock = buildCharacterLock(config);
  const genreDirective = buildPromptByGenre({
    genre: genreLock?.genre || config.genre,
    subcategory: genreLock?.subcategory || (config as any).subcategory,
    chapterTitle: outline.title,
    chapterSummary: outline.summary,
    language: config.language,
  });
  const humanizerBlock = buildHumanizerPromptBlock({
    config,
    previousChapters,
    chapterIndex,
    outlineSummary: outline.summary,
  });
  const narrativeRuntimeBlock = buildNarrativeIntelligenceRuntimeBlock({
    config,
    blueprint,
    previousChapters,
    chapterIndex,
  });
  const priorBestseller = previousChapters.at(-1)?.bestsellerIntel;
  const bestsellerBlock = isBestsellerIntelligenceEnabled()
    ? buildBestsellerIntelligencePromptBlock(config, chapterIndex, priorBestseller)
    : "";
  const orchestratorEnabled = isEditorialOrchestratorEnabled();
  const editorialIntentSheet = orchestratorEnabled
    ? buildEditorialIntentSheet({
        config,
        blueprint,
        chapterIndex,
        chapterTitle: outline.title,
        chapterSummary: outline.summary,
        previousChapters,
        longBookMemory: opts?.longBookMemory,
      })
    : undefined;
  const editorialIntentBlock = editorialIntentSheet
    ? buildEditorialIntentPromptBlock(editorialIntentSheet, config)
    : "";

  let accumulatedContent = "";
  let chapterTitle = outline.title;
  let chunkIndex = 0;
  let consecutiveFailures = 0;
  const maxChunks = Math.ceil(targetWords / 600) + 5; // generous safety cap for adaptive sizing

  if (DEV_DEBUG_STREAM) console.log(`[Nexora] Adaptive chunked generation: target=${targetWords} words, maxChunks=${maxChunks}`);

  while (chunkIndex < maxChunks) {
    const currentWords = countWords(accumulatedContent);
    const phase = getChunkPhase(currentWords, targetWords);
    const phaseInstruction = getPhaseInstruction(phase);
    const remainingWords = targetWords - currentWords;

    // Stop if past target
    if (currentWords >= targetWords * 1.1) {
      if (DEV_DEBUG_STREAM) console.log(`[Nexora] Target exceeded (${currentWords}/${targetWords}), stopping`);
      break;
    }

    // Stop if CLOSURE was already written
    if (phase === "CLOSURE" && currentWords >= targetWords * 0.9 && chunkIndex > 1) {
      if (DEV_DEBUG_STREAM) console.log(`[Nexora] Closure already written, stopping`);
      break;
    }

    // Adaptive chunk size selection
    const chunkSize = selectChunkSize(consecutiveFailures);
    const sizeConfig = CHUNK_SIZES[chunkSize];
    const chunkTarget = phase === "CLOSURE"
      ? Math.min(remainingWords + 100, sizeConfig.max)
      : Math.min(Math.max(sizeConfig.min, remainingWords), sizeConfig.max);

    if (DEV_DEBUG_STREAM) console.log(`[Nexora] Chunk ${chunkIndex + 1}: size=${chunkSize} (${sizeConfig.label}), failures=${consecutiveFailures}`);

    const isFirstChunk = chunkIndex === 0;
    const lastTextSegment = accumulatedContent.slice(-1200);
    const adaptiveSuffix = getAdaptivePromptSuffix(chunkSize);

    const chunkPrompt = isFirstChunk
      ? `Write the OPENING of Chapter ${chapterIndex + 1} of "${config.title}".
Chapter title: "${outline.title}"
Chapter plan: ${outline.summary}
Genre: ${config.genre}
Language: ${config.language} — WRITE ENTIRELY IN ${config.language}

${genreDirective}

${contextMemory}

TARGET: Write approximately ${chunkTarget} words for this segment.
TOTAL CHAPTER TARGET: ${targetWords} words (you will write more chunks after this).
PHASE: ${phase} — ${phaseInstruction}

${scriptoraWritingBrain}

${characterLock}

${narrativeRuntimeBlock}

${editorialIntentBlock}

${humanizerBlock}

${bestsellerBlock}

BESTSELLER QUALITY REQUIREMENTS:
- Open with a line that stops the reader — a hook they'll remember
- Include 2-3 highlight-worthy sentences
- Write like a PUBLISHED BESTSELLER
- Use varied sentence rhythm
- HONOR the GENRE DIRECTIVE above — chapter style and content rules are MANDATORY

Return ONLY the chapter text. Start with the chapter content directly.
Do NOT return JSON. Do NOT include the chapter title in the text.
Write in ${config.language}.${adaptiveSuffix}`

      : `CONTINUE writing Chapter ${chapterIndex + 1} of "${config.title}".
Chapter title: "${chapterTitle}"
Chapter plan: ${outline.summary}
Genre: ${config.genre}
Language: ${config.language}

${genreDirective}

PREVIOUS TEXT (last segment):
"""
${lastTextSegment}
"""

CURRENT PROGRESS: ${currentWords} / ${targetWords} words written
REMAINING: ~${remainingWords} words needed
PHASE: ${phase} — ${phaseInstruction}

${narrativeRuntimeBlock}

${editorialIntentBlock}

${humanizerBlock}

${bestsellerBlock}

TARGET for this chunk: Write approximately ${chunkTarget} words.

CRITICAL RULES:
- Continue EXACTLY from where the previous text ended
- DO NOT restart, summarize, or repeat what was already written
- DO NOT repeat ideas, metaphors, or phrases from previous text
- Maintain narrative coherence and emotional continuity
- HONOR the GENRE DIRECTIVE — same chapter style throughout the book
- Increase depth and quality with each chunk
${phase === "CLOSURE" ? `
ENDING RULES:
- Write toward a POWERFUL, SATISFYING conclusion
- The final lines must feel inevitable and emotionally resonant
- DO NOT leave the chapter unfinished
- Create a strong final paragraph that provides closure
- DO NOT exceed the remaining word budget significantly
` : ""}
Return ONLY the continuation text. No JSON. No titles. No meta-commentary.
Write in ${config.language}.${adaptiveSuffix}`;

    const systemPrompt = `${systemBase} You are writing ${isFirstChunk ? "the opening of" : "a continuation for"} chapter ${chapterIndex + 1} of ${config.numberOfChapters}. Phase: ${phase}. Chunk size: ${chunkSize}.`;

    let chunkText: string | null = null;

    try {
      chunkText = await callAIOnce(
        systemPrompt,
        chunkPrompt,
        sizeConfig.timeout,
        withUsage(opts?.usage, {
          taskType: "generate_chapter_chunk",
          metadata: { chapterIndex: chapterIndex + 1, chunkIndex: chunkIndex + 1, phase, chunkSize },
        }),
      );
      consecutiveFailures = 0; // Reset on success
    } catch (e: any) {
      consecutiveFailures++;
      console.error(`[Nexora] Chunk ${chunkIndex + 1} failed (failures=${consecutiveFailures}):`, e.message);

      // Credit/auth errors = bail immediately
      if (e instanceof AICreditsError) throw e;

      // After 6 consecutive failures, try emergency fallback or stop gracefully
      if (consecutiveFailures > 6) {
        if (chunkIndex === 0) {
          // Last-resort fallback for first chunk: smaller/simpler prompt
          console.warn(`[Nexora] Emergency fallback for first chunk`);
          try {
            chunkText = await callAIOnce(
              `You are a ${config.genre} author writing in ${config.language}. Be concise and complete.`,
              `Write the opening section (~600 words) of chapter "${outline.title}" for the book "${config.title}". Outline: ${outline.summary}. Plain prose only.`,
              90000,
              withUsage(opts?.usage, {
                taskType: "generate_chapter_fallback",
                metadata: { chapterIndex: chapterIndex + 1, chunkIndex: chunkIndex + 1 },
              }),
            );
            consecutiveFailures = 0;
          } catch {
            throw new Error(`Generation failed after multiple attempts. Try again or reduce chapter length.`);
          }
        } else {
          console.warn(`[Nexora] Stopping with ${countWords(accumulatedContent)} words after ${consecutiveFailures} failures`);
          break;
        }
      } else {
        // Exponential backoff before retry with smaller chunk
        const backoff = Math.min(8000, 1500 * consecutiveFailures);
        await new Promise(r => setTimeout(r, backoff));
        continue; // Loop back — selectChunkSize will downgrade
      }
    }

    if (!chunkText) {
      consecutiveFailures++;
      continue;
    }

    // Clean up
    chunkText = chunkText.replace(/^```[a-z]*\n?/g, "").replace(/\n?```$/g, "").trim();
    if (isFirstChunk) {
      const lines = chunkText.split("\n");
    if (lines[0] && lines[0].startsWith("#")) {
        chapterTitle = resolveChapterTitle(lines[0].replace(/^#+\s*/, "").trim(), chapterIndex, {
          config,
          summary: outline.summary,
          totalChapters: config.numberOfChapters,
        });
        chunkText = lines.slice(1).join("\n").trim();
      }
    }

    // Anti-repetition check
    if (!isFirstChunk && accumulatedContent.length > 0) {
      const overlap = checkOverlap(accumulatedContent, chunkText);
      if (overlap > 0.2) {
        console.warn(`[Nexora] Chunk ${chunkIndex + 1} has ${(overlap * 100).toFixed(0)}% overlap — regenerating`);
        try {
          chunkText = await callAI(
            systemPrompt + " CRITICAL: Your previous attempt repeated content. Write ENTIRELY NEW prose that continues from the last sentence.",
            chunkPrompt + "\n\nWARNING: Previous attempt overlapped. Write COMPLETELY NEW content.",
            withUsage(opts?.usage, {
              taskType: "generate_chapter_overlap_fix",
              metadata: { chapterIndex: chapterIndex + 1, chunkIndex },
            }),
          );
          chunkText = chunkText.replace(/^```[a-z]*\n?/g, "").replace(/\n?```$/g, "").trim();
        } catch {
          // Use original if regen fails
        }
      }
    }

    accumulatedContent += (accumulatedContent ? "\n\n" : "") + chunkText;
    chunkIndex++;

    const updatedWords = countWords(accumulatedContent);
    if (DEV_DEBUG_STREAM) console.log(`[Nexora] Chunk ${chunkIndex} complete: ${updatedWords}/${targetWords} words, phase=${phase}, size=${chunkSize}`);

    // Report progress
    onChunkProgress?.({
      chunkIndex,
      totalChunks: Math.ceil(targetWords / 1400),
      currentWords: updatedWords,
      targetWords,
      phase,
      content: accumulatedContent,
      chunkSize,
    });
    emitNarrativeTelemetry("chunk-progress", config, chapterIndex, accumulatedContent);

    // Stop conditions
    if (phase === "CLOSURE" && updatedWords >= targetWords * 0.85) {
      if (DEV_DEBUG_STREAM) console.log(`[Nexora] Closure phase complete at ${updatedWords} words`);
      break;
    }
    if (updatedWords >= targetWords * 1.05) {
      if (DEV_DEBUG_STREAM) console.log(`[Nexora] Target reached at ${updatedWords} words`);
      break;
    }
  }

  // Completion log is essential — kept always on (1 line per chapter).
  console.log(`[Nexora] Chapter ${chapterIndex + 1} complete: ${countWords(accumulatedContent)} words in ${chunkIndex} chunks`);
  emitNarrativeTelemetry("chapter-complete", config, chapterIndex, accumulatedContent);

  // Editorial QA gate (non-blocking — surfaces in console + Mastery diagnostic)
  let qaScore: number | undefined;
  try {
    const report = validateEditorial(accumulatedContent);
    qaScore = report.score;
    if (DEV_DEBUG_STREAM) {
      console.log(
        `[Nexora] Editorial QA — Ch${chapterIndex + 1}: score ${report.score}/10` +
        (report.issues.length ? ` · ${report.issues.length} issue(s): ${report.issues.map(i => i.kind).join(", ")}` : " · clean"),
      );
    }
  } catch { /* validator must never block */ }

  // Adaptive Rewrite Engine — invisible quality optimiser.
  // Runs only when the caller passes opts.adaptive (current callers stay unchanged).
  if (opts?.adaptive) {
    try {
      const { adaptiveRewritePipeline, estimateMetrics } = await import("@/lib/ai/adaptive-rewrite-engine");
      const { qualityScore, metrics } = estimateMetrics(accumulatedContent);
      const result = await adaptiveRewritePipeline(
        accumulatedContent,
        { contentType: "chapter", plan: opts.adaptive.plan, qualityScore: qaScore ?? qualityScore, metrics },
        {
          rewrite: async (text, instructions, _mode) => {
            const sysBase = getSystemPrompt(config, genreLock);
            const sysPrompt = `${sysBase}\n\n${instructions}`;
            const userPrompt = `Original chapter text to revise (in ${config.language}):\n\n${text}`;
            return await callAI(
              sysPrompt,
              userPrompt,
              withUsage(opts.usage, {
                taskType: "adaptive_rewrite",
                metadata: { chapterIndex: chapterIndex + 1, mode: _mode },
              }),
            );
          },
        },
      );
      if (result.rewritten) accumulatedContent = result.text;
    } catch (e) {
      console.warn("[Nexora] Adaptive rewrite skipped:", e);
    }
  }

  const finalChapter = humanizeChapter({
    title: resolveChapterTitle(chapterTitle, chapterIndex, {
      config,
      summary: outline.summary,
      totalChapters: config.numberOfChapters,
    }),
    content: accumulatedContent,
    subchapters: [],
  }, { config, previousChapters, chapterIndex, outlineSummary: outline.summary });

  if (orchestratorEnabled && editorialIntentSheet) {
    const { chapter } = runPreDeliveryGate({
      chapter: finalChapter,
      config,
      blueprint,
      chapterIndex,
      totalChapters: config.numberOfChapters,
      intent: editorialIntentSheet,
      previousChapters,
      outlineSummary: outline.summary,
      longBookMemory: opts?.longBookMemory,
    });
    return chapter;
  }

  return {
    ...finalChapter,
    bestsellerIntel: isBestsellerIntelligenceEnabled()
      ? evaluateChapterBestsellerIntel({ config, chapterIndex, content: finalChapter.content })
      : undefined,
  };
}

/* ============ Blueprint ============ */

export async function generateBlueprint(config: BookConfig, genreLock?: GenreLock, usage?: AIUsageContext): Promise<BookBlueprint> {
  const bookInfo = BOOK_LENGTH_CONFIG[config.bookLength];
  const totalWords = getBookTotalWords(config);
  const subchapterCount = getSubchaptersPerChapter(config);
  const editorialBP = resolveLockedBlueprint(config, genreLock);
  const structureScaffold = editorialBP.structure.length
    ? `\nGENRE STRUCTURE SCAFFOLD${genreLock ? " (LOCKED)" : ""} (use as backbone, expand into ${config.numberOfChapters} chapters):\n${editorialBP.structure.map((s, i) => `${i + 1}. ${s}`).join("\n")}\nMap and expand this scaffold across the ${config.numberOfChapters} chapters — fold/split sections so EVERY chapter advances the editorial structure above.`
    : "";

  const prompt = `Create a detailed book blueprint for:
Title: "${config.title}"
Subtitle: "${config.subtitle}"
Author / Pen name: "${config.authorIdentity?.penName || config.authorName || config.author || config.writerName || "Not specified"}"
${buildAuthorBookDeclaration(config)}
Genre: ${config.genre}
Tone: ${config.tone}
Language: ${config.language} — ALL content MUST be in ${config.language}
Book length: ${bookInfo.label} (~${totalWords.toLocaleString()} total words)
Number of chapters: ${config.numberOfChapters}
${subchapterCount > 0 ? `Include EXACTLY ${subchapterCount} real subchapters per chapter. Each subchapter must have a specific title, a clear narrative/editorial purpose, and a distinct beat. They must not be decorative labels.` : "No subchapters."}
${structureScaffold}

${buildGenreBlueprintBlock(config.genre, (config as any).subcategory)}

${buildBlueprintIntegrityBlueprintRequest(config)}

CRITICAL — BESTSELLER QUALITY TITLES:
- Chapter titles must be EMOTIONALLY COMPELLING — the kind that make readers flip to that page
- Titles should be evocative, intriguing, or provocative — NOT generic or descriptive
- NEVER use bare titles like "Chapter 1", "Chapter 2", "Capitolo 1", "Capitolo 2"
- Every chapter must have a real specific title; the app will display it as "${formatChapterDisplayTitle(0, "Real specific title", { config })}"
- Think bestseller table of contents that sells the book on its own

Return a JSON object with:
- overview: A 2-3 paragraph overview of the book's thesis and emotional journey (in ${config.language})
- chapterOutlines: Array of {title, summary${subchapterCount > 0 ? `, subchapters: exactly ${subchapterCount} items [{title, summary}]` : ''}} (in ${config.language})
- themes: Array of core themes (in ${config.language})
- emotionalArc: Description of the emotional progression (in ${config.language})

  Return ONLY valid JSON, no markdown.`;

  const result = await callBlueprintFast(
    getSystemPrompt(config, genreLock) + " You are creating a book architecture optimized for the genre profile above.",
    prompt,
    withUsage(usage, { taskType: "generate_blueprint" }),
  );
  try {
    return normalizeBlueprint(JSON.parse(cleanJsonFence(result)), config);
  } catch {
    return normalizeBlueprint({
      overview: result,
      chapterOutlines: Array.from({ length: config.numberOfChapters }, (_, i) => ({
        title: resolveChapterTitle("", i, { config, summary: "", totalChapters: config.numberOfChapters }),
        summary: "To be generated",
      })),
      themes: [], emotionalArc: "",
    }, config);
  }
}

/* ============ Front Matter — TEMPLATE-DRIVEN PER GENRE ============ */

/**
 * Map a genre's frontMatterTemplate sections to the canonical FrontMatter
 * fields. The AI is instructed to write each section as if it belongs in
 * that specific kind of book (e.g. "Kitchen Equipment Notes" for cookbook).
 */
export async function generateFrontMatter(
  config: BookConfig,
  blueprint: BookBlueprint,
  genreLock?: GenreLock,
  usage?: AIUsageContext,
): Promise<FrontMatter> {
  const bp = resolveLockedBlueprint(config, genreLock);
  const genreKey = resolveGenreKey(config.genre, (config as any).subcategory);
  const sectionsList = bp.frontMatterTemplate.length
    ? bp.frontMatterTemplate
    : ["Pagina titolo", "Copyright", "Dedica", "Nota sull’autore", "Come usare questo libro", "Lettera al lettore"];

  const prompt = `Generate FRONT MATTER for a ${genreKey.toUpperCase()} book — sections must read as if written by a domain expert in this genre.

BOOK:
- Title: "${config.title}"
- Subtitle: "${config.subtitle}"
- Author / Pen name: "${config.authorIdentity?.penName || config.authorName || config.author || config.writerName || "Not specified"}"
${buildAuthorBookDeclaration(config)}
- Genre: ${genreKey}
- Language: ${config.language} — ALL content MUST be in ${config.language}
- Overview: ${blueprint.overview}

${buildBlueprintIntegrityRuntimeBlock(config, blueprint, { compact: true })}

GENRE-SPECIFIC FRONT MATTER SECTIONS TO PRODUCE (in this exact spirit):
${sectionsList.map((s, i) => `${i + 1}. ${s}`).join("\n")}

CRITICAL EDITORIAL RULES:
- Tone of every section must match: ${bp.tone}
- Use the genre's authentic vocabulary and conventions (e.g. recipes → kitchen equipment notes; medical → disclaimers; software → version notes)
- Title page MUST declare the exact public pen name.
- Copyright MUST declare the exact copyright holder from AUTHOR DECLARATION.
- About Author MUST use the public biography from AUTHOR DECLARATION when available; never invent a different author history.
- NEVER produce generic placeholders. Each section must feel domain-native.
- Every field MUST be in ${config.language}.

Map your sections to this JSON shape (combine extra sections into the closest field, NEVER omit domain-specific content):
{
  "titlePage": "Title page content (Title + Subtitle + Author placeholder)",
  "copyright": "Professional copyright notice for current year + any genre-specific legal/disclaimer line",
  "dedication": "A heartfelt, brief dedication (or genre-equivalent: e.g. 'To every gardener who...' / 'To the cooks who...')",
  "aboutAuthor": "Compelling author bio paragraph (positioned as expert in this genre)",
  "howToUse": "How to read and apply THIS specific kind of book — include any genre-specific notes (equipment, prerequisites, climate zone, software version, medical disclaimer, safety, etc.)",
  "letterToReader": "Intimate, warm letter to the reader anchored in the genre's reader promise"
}

Return ONLY valid JSON. No markdown.`;

  const result = await callAI(getSystemPrompt(config, genreLock), prompt, withUsage(usage, { taskType: "generate_front_matter" }));
  try {
    return normalizeFrontMatter(JSON.parse(cleanJsonFence(result)), config);
  } catch {
    return normalizeFrontMatter({ titlePage: config.title, letterToReader: result }, config);
  }
}

/* ============ Chapter (legacy single-call, kept for subchapters) ============ */

export async function generateChapter(
  config: BookConfig, blueprint: BookBlueprint, chapterIndex: number,
  previousChapters: Chapter[], chapterLengthOverride?: string,
  genreLock?: GenreLock,
  usage?: AIUsageContext,
  longBookMemory?: LongBookMemorySnapshot,
): Promise<Chapter> {
  // Delegate to chunked generation
  return generateChapterChunked(config, blueprint, chapterIndex, previousChapters, chapterLengthOverride, undefined, genreLock, { usage, longBookMemory });
}

/* ============ Subchapter ============ */

export async function generateSubchapter(
  config: BookConfig, blueprint: BookBlueprint, chapterIndex: number,
  subchapterIndex: number, chapter: Chapter, previousChapters: Chapter[],
  genreLock?: GenreLock,
  usage?: AIUsageContext,
): Promise<{ title: string; content: string }> {
  const rawOutline = blueprint.chapterOutlines[chapterIndex] || {
    title: "",
    summary: `Develop chapter ${chapterIndex + 1} of "${config.title}".`,
  };
  const outline = {
    ...rawOutline,
    title: resolveChapterTitle(rawOutline.title, chapterIndex, {
      config,
      summary: rawOutline.summary,
      totalChapters: config.numberOfChapters,
    }),
  };
  const subOutline = (outline as any).subchapters?.[subchapterIndex];
  const contextMemory = buildContextMemory(config, blueprint, previousChapters, chapterIndex);
  const existingSubs = chapter.subchapters.map((s, i) =>
    `Subchapter ${i + 1} "${s.title}": ${s.content.substring(0, 200)}...`
  ).join("\n");

  const bookTotal = getBookTotalWords(config);
  const subchapterCount = getSubchaptersPerChapter(config) || 3;
  const subWordTarget = Math.round((bookTotal / config.numberOfChapters) / subchapterCount);
  const subMin = Math.max(400, Math.round(subWordTarget * 0.8));
  const subMax = Math.round(subWordTarget * 1.2);

  const genreDirective = buildPromptByGenre({
    genre: genreLock?.genre || config.genre,
    subcategory: genreLock?.subcategory || (config as any).subcategory,
    chapterTitle: subOutline?.title || `Subchapter ${subchapterIndex + 1}`,
    chapterSummary: subOutline?.summary || "",
    language: config.language,
  });
  const humanizerBlock = buildHumanizerPromptBlock({
    config,
    previousChapters,
    chapterIndex,
    outlineSummary: subOutline?.summary || outline.summary,
  });
  const narrativeRuntimeBlock = buildNarrativeIntelligenceRuntimeBlock({
    config,
    blueprint,
    previousChapters,
    chapterIndex,
    currentText: chapter.content,
  });

  const prompt = `Write Subchapter ${subchapterIndex + 1} of ${subchapterCount} for Chapter ${chapterIndex + 1} "${chapter.title}" in "${config.title}".
${subOutline ? `Subchapter plan: "${subOutline.title}" — ${subOutline.summary}` : `Write the ${subchapterIndex + 1}th subchapter.`}
Genre: ${config.genre}
Language: ${config.language} — WRITE ENTIRELY IN ${config.language}
Write approximately ${subMin}–${subMax} words.

${genreDirective}

Parent chapter intro: ${chapter.content.substring(0, 500)}...
${existingSubs ? `Already written subchapters (do NOT repeat):\n${existingSubs}` : ""}
${contextMemory}

${buildBlueprintIntegrityRuntimeBlock(config, blueprint, { chapterIndex, subchapterIndex, compact: true })}

${narrativeRuntimeBlock}

${humanizerBlock}

BESTSELLER QUALITY — same standard as main chapters. HONOR the genre directive above.
This must be a real written section with scene/argument progression, not a heading preview.

Return JSON: { "title": "...", "content": "..." }
ALL in ${config.language}. Return ONLY valid JSON.`;

  const result = await callAI(
    getSystemPrompt(config, genreLock) + ` You are writing a subchapter for chapter ${chapterIndex + 1}. Maintain style lock.`,
    prompt,
    withUsage(usage, {
      taskType: "generate_subchapter",
      metadata: { chapterIndex: chapterIndex + 1, subchapterIndex: subchapterIndex + 1 },
    }),
  );
  try {
    const parsed = JSON.parse(cleanJsonFence(result));
    return {
      title: stringifyField(parsed?.title).trim() || subOutline?.title || `Subchapter ${subchapterIndex + 1}`,
      content: humanizeNarrativeText(stringifyField(parsed?.content).trim() || result, {
        config,
        previousChapters,
        chapterIndex,
        outlineSummary: subOutline?.summary || outline.summary,
      }),
    };
  } catch {
    return {
      title: subOutline?.title || `Subchapter ${subchapterIndex + 1}`,
      content: humanizeNarrativeText(result, {
        config,
        previousChapters,
        chapterIndex,
        outlineSummary: subOutline?.summary || outline.summary,
      }),
    };
  }
}

/* ============ Back Matter ============ */

export async function generateBackMatter(
  config: BookConfig,
  blueprint: BookBlueprint,
  chapters: Chapter[],
  genreLock?: GenreLock,
  usage?: AIUsageContext,
): Promise<BackMatter> {
  const bp = resolveLockedBlueprint(config, genreLock);
  const genreKey = resolveGenreKey(config.genre, (config as any).subcategory);
  const chapterTitles = chapters.map((c, i) => formatChapterDisplayTitle(i, c.title, {
    config,
    summary: blueprint.chapterOutlines[i]?.summary,
    totalChapters: config.numberOfChapters,
  })).join("\n");
  const sectionsList = bp.backMatterTemplate.length
    ? bp.backMatterTemplate
    : ["Conclusione", "Nota dell’autore", "Prossimo passo", "Richiesta recensione", "Letture consigliate"];

  const prompt = `Generate BACK MATTER for a ${genreKey.toUpperCase()} book — read as if written by a domain expert.

BOOK:
- Title: "${config.title}"
- Author / Pen name: "${config.authorIdentity?.penName || config.authorName || config.author || config.writerName || "Not specified"}"
${buildAuthorBookDeclaration(config)}
- Genre: ${genreKey}
- Language: ${config.language} — ALL content MUST be in ${config.language}
- Chapters:\n${chapterTitles}

${buildBlueprintIntegrityRuntimeBlock(config, blueprint, { compact: true })}

GENRE-SPECIFIC BACK MATTER SECTIONS TO PRODUCE (in this exact spirit):
${sectionsList.map((s, i) => `${i + 1}. ${s}`).join("\n")}

CRITICAL EDITORIAL RULES:
- Tone: ${bp.tone}
- Use authentic genre conventions (cookbook → conversion tables; medical → references; software → shortcuts; fitness → progression tables; gardening → seasonal calendar; etc.)
- Author note MUST sound like the selected author and use the personal author note from AUTHOR DECLARATION when available.
- Review request and closing note must be attributable to the selected pen name, not a generic narrator.
- NEVER produce generic placeholders. Each section must feel domain-native.
- All in ${config.language}.

Map your sections to this JSON shape (combine extra/domain-specific sections into the closest field, NEVER omit them — fold them into authorNote/callToAction/otherBooks as needed):
{
  "conclusion": "Powerful, emotionally or practically resonant conclusion that closes the book in this genre's voice",
  "authorNote": "Personal note from the author — use it ALSO for any technical reference content (glossary, calendar, references) when it fits",
  "callToAction": "Concrete call to action specific to this genre (try the first recipe, schedule the workout week, set up the system today, etc.)",
  "reviewRequest": "Warm, specific request for a review",
  "otherBooks": "Placeholder for other books / further reading / resources in this genre"
}

Return ONLY valid JSON.`;

  const result = await callAI(getSystemPrompt(config, genreLock), prompt, withUsage(usage, { taskType: "generate_back_matter" }));
  try {
    return normalizeBackMatter(JSON.parse(cleanJsonFence(result)), config);
  } catch {
    return normalizeBackMatter({ conclusion: result }, config);
  }
}

/* ============ AI Quality Evaluation ============ */

export async function evaluateChapterQuality(
  config: BookConfig, chapter: Chapter, chapterIndex: number, usage?: AIUsageContext
): Promise<AIQualityRating> {
  const prompt = `You are a professional book editor and literary critic. Evaluate this chapter with BRUTAL HONESTY.

Book: "${config.title}"
Genre: ${config.genre}
Chapter ${chapterIndex + 1}: "${chapter.title}"

Content (first 3000 chars):
${chapter.content.substring(0, 3000)}

Rate this chapter on a scale of 1-5 stars using STRICT BESTSELLER STANDARDS:
1 = Poor (generic AI writing, repetitive, no emotional depth)
2 = Below Average (some good moments but mostly flat)
3 = Good (solid writing but lacks the spark of a bestseller)
4 = Very Good (publishable quality with memorable moments)
5 = Excellent (bestseller-level, quotable, emotionally powerful)

Return JSON:
{
  "score": <number 1-5>,
  "explanation": "<2-3 sentences explaining the score honestly>",
  "missing": "<what is missing or weak in this chapter>",
  "improvements": "<specific actionable improvements to reach 5 stars>"
}

Be HONEST. Most AI-generated content is 2-3 stars. Only truly exceptional writing deserves 4-5.
Language: Respond in ${getScriptoraLanguage()} (Scriptora UI language — diagnostic feedback for the author, not the book manuscript language).
Return ONLY valid JSON.`;

  const result = await callAI(
    "You are a world-class literary editor. Evaluate writing quality with precision and honesty. Never inflate scores.",
    prompt,
    withUsage(usage, {
      taskType: "evaluate_chapter_quality",
      metadata: { chapterIndex: chapterIndex + 1 },
    }),
  );
  try {
    return JSON.parse(result.replace(/```json\n?|```/g, "").trim());
  } catch {
    return { score: 3, explanation: result, missing: "", improvements: "" };
  }
}

/* ============ Smart Rewrite with Levels ============ */

export type RewriteLevel = "light" | "deep" | "bestseller";

function getRewriteLevelInstruction(level: RewriteLevel): string {
  switch (level) {
    case "light":
      return `LIGHT IMPROVEMENT:
- Polish prose: fix awkward phrasing, tighten sentences
- Improve word choice for precision and rhythm
- Strengthen transitions between paragraphs
- Keep the same structure and core ideas
- Enhance 2-3 key sentences for quotability`;
    case "deep":
      return `DEEP REWRITE:
- Restructure paragraphs for better flow and impact
- Add new metaphors, examples, or insights
- Deepen emotional resonance — make the reader FEEL more
- Strengthen the opening hook and closing thought
- Rewrite at least 60% of sentences with fresh prose
- Add layers of meaning and subtext`;
    case "bestseller":
      return `BESTSELLER UPGRADE — TOTAL TRANSFORMATION:
- COMPLETELY reimagine the prose from scratch
- Every paragraph must be publishable in a top-selling book
- Add 5+ highlight-worthy, screenshot-worthy sentences
- Create moments of genuine surprise and emotional power
- Use literary techniques: foreshadowing, callback, rhythm breaks
- The reader must feel changed after reading this chapter
- Channel the DNA of bestsellers in this genre
- Zero generic phrasing — every sentence must be SPECIFIC and VIVID`;
  }
}

export async function rewriteChapter(
  config: BookConfig, blueprint: BookBlueprint, chapter: Chapter,
  chapterIndex: number, previousChapters: Chapter[], instruction: string,
  aiRating?: AIQualityRating, level: RewriteLevel = "deep", usage?: AIUsageContext,
): Promise<Chapter> {
  const weaknessTarget = aiRating
    ? `\n\nAI EDITOR FEEDBACK (you MUST address these weaknesses):
- Current Score: ${aiRating.score}/5
- Issues: ${aiRating.explanation}
- Missing: ${aiRating.missing}
- Required Improvements: ${aiRating.improvements}`
    : "";

  const contextMemory = buildContextMemory(config, blueprint, previousChapters, chapterIndex, opts?.longBookMemory);
  const lengthInstruction = getChapterLengthInstruction(config, chapterIndex, config.numberOfChapters);
  const levelInstruction = getRewriteLevelInstruction(level);
  const humanizerBlock = buildHumanizerPromptBlock({
    config,
    previousChapters,
    chapterIndex,
    outlineSummary: blueprint.chapterOutlines?.[chapterIndex]?.summary,
  });
  const narrativeRuntimeBlock = buildNarrativeIntelligenceRuntimeBlock({
    config,
    blueprint,
    previousChapters,
    chapterIndex,
    currentText: chapter.content,
  });

  const prompt = `${level.toUpperCase()} REWRITE — Chapter ${chapterIndex + 1}: "${chapter.title}"

${levelInstruction}

Instruction: "${instruction}"
${weaknessTarget}

Current content (to be rewritten):
${chapter.content.substring(0, 2500)}...

${contextMemory}

${narrativeRuntimeBlock}

${humanizerBlock}

Book: "${config.title}"
Genre: ${config.genre}
Language: ${config.language} — WRITE ENTIRELY IN ${config.language}
${lengthInstruction}

EVOLUTION RULES:
- Produce NEW PROSE — zero repeated sentences from original
- Maintain continuity with previous chapters
- The rewrite must be MEASURABLY BETTER than the original

Return JSON: { "title": "...", "content": "...", "subchapters": [...] }
ALL in ${config.language}. Return ONLY valid JSON.`;

  const result = await callAI(
    getSystemPrompt(config) + ` You are performing a ${level.toUpperCase()} rewrite. The new version must be superior.`,
    prompt,
    withUsage(usage, {
      taskType: "rewrite_chapter",
      metadata: { chapterIndex: chapterIndex + 1, level },
    }),
  );
  try {
    const parsed = JSON.parse(result.replace(/```json\n?|```/g, "").trim());
    return humanizeChapter(
      {
        ...chapter,
        ...parsed,
        content: stringifyField(parsed?.content).trim() || chapter.content,
        subchapters: Array.isArray(parsed?.subchapters) ? parsed.subchapters : chapter.subchapters,
      },
      { config, previousChapters, chapterIndex, outlineSummary: blueprint.chapterOutlines?.[chapterIndex]?.summary },
    );
  } catch {
    return {
      ...chapter,
      content: humanizeNarrativeText(result, {
        config,
        previousChapters,
        chapterIndex,
        outlineSummary: blueprint.chapterOutlines?.[chapterIndex]?.summary,
      }),
    };
  }
}
