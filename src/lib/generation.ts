import { BookConfig, Chapter, FrontMatter, BackMatter, BookBlueprint, BookProject, Genre, AIQualityRating, BOOK_LENGTH_CONFIG, getBookTotalWords, getSubchaptersPerChapter, GenreLock } from "@/types/book";
import type { ChunkProgress, RewriteLevel } from "@/lib/generation-types";
export type { ChunkProgress, RewriteLevel } from "@/lib/generation-types";
import { supabase } from "@/integrations/supabase/client";
import { scriptoraLog, logGenerationStart, logGenerationEnd, logEdgeError } from "@/lib/scriptora-logger";
import { buildGenreSystemBlock, buildGenreBlueprintBlock, buildGenreEditorialBlock, getGenreBlueprint, buildPromptByGenre, resolveGenreKey } from "@/lib/genre-intelligence";
import { buildBookTypeEngineBlock, buildBookTypeLock, resolveBookTypeDefinition } from "@/lib/book-type-engine";
import { runManuscriptQualityV3 } from "@/lib/manuscript-quality-v3";
import { finalManuscriptGuard } from "@/lib/final-manuscript-guard";
import { sanitizeGeneratedChapterContent } from "@/lib/manuscript/manuscript-integrity-guard";
import { applySafeManuscriptCleanup } from "@/lib/manuscript/safe-manuscript-cleanup";
import { safeSubchapters } from "@/lib/manuscript/chapter-normalization";
import {
  buildChapterWritingPlan,
  buildChapterWritingPlanPromptBlock,
  type ChapterWritingPlan,
} from "@/lib/writing-director/chapter-writing-director";
import { buildLongBookMemory, buildLongBookMemoryPromptBlock } from "@/lib/long-book-memory";
import {
  applyMatterOptionsToBackMatter,
  applyMatterOptionsToFrontMatter,
  filterBackMatterTemplateSections,
  filterFrontMatterTemplateSections,
  isBackMatterEnabled,
  isFrontMatterEnabled,
  matterOptionsPromptNote,
  resolveMatterOptions,
} from "@/lib/matter-options";
import { buildWritingStyleBlock, findStylePresetById, findStylePresetByLabel } from "@/lib/writing-styles";
import { buildEditorialMasteryBlock } from "@/lib/editorial-mastery";
import { validateEditorial } from "@/lib/editorial-validator";
import { withRetry, getBreakerCooldown } from "@/lib/api-resilience";
import {
  normalizeAuthorIdentity,
  resolveAuthorIdentityForPublishing,
} from "@/lib/author-identity";
import { resolveChapterTitle, resolveSubchapterTitle, formatChapterDisplayTitle } from "@/lib/chapter-titles";
import { getCurrentUserId } from "@/services/storageService";
import { buildHumanizerPromptBlock, humanizeChapter, humanizeNarrativeText } from "@/lib/HumanizerLayer";
import { buildHumanBestsellerModeV11Block } from "@/lib/human-bestseller-mode-v11";
import { buildHumanBestsellerModeV12Block } from "@/lib/human-bestseller-mode-v12";
import { runWritingEngineV13Audit } from "@/lib/writing-engine-v13";
import { validateCanonChunkBeforeMerge } from "@/lib/writing-engine/canon-lock-v2";
import { buildPremiumWritingBlock, runUltraHumanFinalPass, buildWriterMemorySource, buildContinuationCanonBlock, extractCompactNarrativeContinuity } from "@/lib/premium-writing";
import {
  runEditorialPassSupreme,
  buildStoryConstitutionRetryInstruction,
} from "@/lib/story-constitution-engine";
import { buildForgeWriterContextBlock } from "@/lib/guided-interview/forge-writer-bridge";
import { buildPromptFromCanonicalConfig, sanitizeBookConfiguration } from "@/lib/book-config-engine";
import { getBillingSimulationHeaders, withBillingSimulationBody } from "@/lib/billing/billingHeaders";
import {
  buildBlueprintIntegrityBlueprintRequest,
  buildBlueprintIntegrityFoundationBlock,
  buildBlueprintIntegrityRuntimeBlock,
  normalizeBlueprintIntegrity,
  normalizeChapterOutlineExtras,
  normalizeSubchapterOutlineExtras,
} from "@/lib/BlueprintIntegrityEngine";
import {
  BlueprintValidationError,
  buildBlueprintCorrectivePrompt,
  buildFallbackBlueprintFromConfig,
  buildFormatCoherenceCorrectivePrompt,
  enforceBlueprintFormatCoherence,
  normalizeBlueprintShape,
  resolveBlueprintFromAiResponse,
  type BlueprintSource,
} from "@/lib/blueprint-recovery";
import { buildBlueprintEntityPromptBlock, enrichBlueprintFromIdeaSeed } from "@/lib/blueprint-entity-enrichment";
import { applyCleanTextPass } from "@/lib/writer/clean-text-pass";
import { buildEditorialNovelModeBlock } from "@/lib/writer/editorial-novel-mode";
import {
  TRADITIONAL_EDITOR_SYSTEM_PROMPT,
  applyTraditionalEditorLocalPrep,
  buildTraditionalEditorUserPrompt,
  meetsTraditionalEditorWordCountGuard,
  shouldApplyTraditionalEditorPass,
  shouldShowTraditionalEditorStatus,
} from "@/lib/writer/traditional-editor-pass";
import {
  buildTimelineCoherencePromptBlock,
  validateNarrativeTimeline,
} from "@/lib/writer/narrative-timeline-validator";
import {
  assembleChapterFromSubchapters,
  auditSubchapterContinuity,
  buildSubchapterContextBlock,
  ensureNarrativeSubchapterOutlines,
  finalizeAssembledChapter,
  repairSubchapterContinuityIfNeeded,
  shouldUseRealSubchapterPipeline,
  syncChapterContentWithSubchapters,
  validateSubchapterNarrativeUnit,
} from "@/lib/writer/subchapter-pipeline";
import {
  repairChapterContinuityAssembly,
} from "@/lib/writer/chapter-continuity-assembly";
import {
  runNarrativeContinuityGate,
} from "@/lib/writer/narrative-continuity-gate";
import {
  applyEditorialQualityToMatterFields,
  buildMaximumEditorialQualityPromptBlock,
  runEditorialQualityPipeline,
  runEditorialQualityPipelineOnChapter,
  validateFrontBackMatterQuality,
} from "@/lib/writer/editorial-quality-pipeline";
import {
  assertProjectReadyForGeneration,
  sanitizeEditorialSummary,
} from "@/lib/project-generation-readiness";
import {
  buildEditorialToolsMaxLevelProtocol,
  PROFESSIONAL_PREMIUM_NO_SIGNIFICANT_IMPROVEMENTS,
} from "@/lib/editorial-tools-protocol";
import {
  buildCanonBrainV3PromptBlock,
  validateCanonBrainV3ChunkBeforeMerge,
} from "@/lib/canon-brain-v3";
import {
  buildFormatQualityRepairPrompt,
  buildNarrativeQualityRepairPrompt,
  buildUniversalWritingQualityRulesBlock,
  requiresFormatQualityRepair,
  validateFormatChapterQuality,
  validateNarrativeChapterQuality,
  type WritingQualityReport,
} from "@/lib/writing-quality-gate";
import { resolveBookKernel, validateFormatCoherence } from "@/lib/book-intelligence";
import {
  repairFormatPurityText,
  validateFormatPurity,
} from "../../supabase/functions/_shared/format-purity-engine.ts";
import {
  applyMemorabilityLocalPatch,
  evaluateMemorability,
  MAX_QUALITY_REPAIR_ATTEMPTS,
  runMemorabilityPreHumanPass,
} from "@/lib/writer/memorability-engine";
import {
  getWriterRetryCount,
  incrementWriterRetryCount,
  recordWriterPerformanceMetric,
  resetWriterRetryCount,
} from "@/lib/writer/writer-performance-metrics";

/**
 * Verbose streaming logs are off by default — they intasavano la console
 * during chunked generation (12+ logs per chunk × ~5 chunks × 12 chapters
 * = ~700 entries per book). Enable in DevTools with:
 *   window.__SCRIPTORA_DEBUG_STREAM__ = true
 * or set localStorage key 'scriptora-debug-stream' = '1'.
 * Critical events (start, completion, errors, warnings) always log.
 */
const DEV_DEBUG_STREAM: boolean = (() => {
  try {
    if (typeof window === "undefined") return false;
    if ((window as any).__SCRIPTORA_DEBUG_STREAM__ === true) return true;
    return localStorage.getItem("scriptora-debug-stream") === "1";
  } catch { return false; }
})();

/* ============ Genre Lock helper ============ */
/**
 * Build a GenreLock from a config. Called once at project creation
 * so the entire book stays editorially consistent.
 */
export function buildGenreLock(config: BookConfig): GenreLock {
  return buildBookTypeLock(config);
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
  creditOperation?: import("@/lib/billing/types").CreditOperationId;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

function usagePayload(usage?: AIUsageContext) {
  const metadata = { ...(usage?.metadata || {}) };
  if (usage?.creditOperation && !metadata.creditOperation) {
    metadata.creditOperation = usage.creditOperation;
  }
  if (usage?.idempotencyKey && !metadata.idempotencyKey) {
    metadata.idempotencyKey = usage.idempotencyKey;
  }
  return {
    taskType: usage?.taskType || "generate_book",
    projectId: usage?.projectId || null,
    userId: usage?.userId || getCurrentUserId(),
    metadata,
  };
}

function notifyUsageChanged() {
  try {
    window.dispatchEvent(new Event("scriptora-usage-change"));
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
  const clean = message.trim();
  if (status === 429) return clean || "AI rate limit reached. Please retry in a moment.";
  if (status === 401 || status === 402) return clean || "AI provider credentials or credits need attention.";
  if (status >= 500) return clean || "AI provider temporarily unavailable. Please try again.";
  return clean || `AI generation failed (${status})`;
}

function safeParseJson<T = any>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function extractErrorMessageFromBody(text: string): string {
  const parsed = safeParseJson<{ error?: unknown; message?: unknown; code?: unknown }>(text);
  const message = parsed?.error || parsed?.message || parsed?.code;
  return typeof message === "string" && message.trim() ? message.trim() : text.trim();
}

function getSupabasePublicKey(): string {
  return import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "";
}

function blueprintDebug(event: string, payload?: Record<string, unknown>) {
  try {
    const enabled = import.meta.env.DEV
      || (typeof window !== "undefined" && (
        (window as any).__SCRIPTORA_BLUEPRINT_DEBUG__ === true
        || localStorage.getItem("scriptora-blueprint-debug") === "1"
      ));
    if (enabled) console.info(`[${event}]`, payload || {});
  } catch {
    /* diagnostics must never block generation */
  }
}

const BLUEPRINT_NETWORK_USER_MESSAGE =
  "Scriptora non riesce a raggiungere il motore Blueprint in questo momento. Riprova tra pochi secondi.";

export const GENERATION_DELTA_MARKER = "__DELTA__";
export const GENERATION_RESULT_MARKER = "__RESULT__";

function streamAuditEnabled(usage?: AIUsageContext): boolean {
  return import.meta.env.DEV
    || DEV_DEBUG_STREAM
    || usage?.metadata?.debugStream === true
    || usage?.metadata?.streamDebug === true;
}

function streamAuditLog(event: string, details: Record<string, unknown> = {}, usage?: AIUsageContext) {
  if (!streamAuditEnabled(usage)) return;
  console.debug("[Scriptora stream audit]", {
    ts: new Date().toISOString(),
    event,
    taskType: usage?.taskType,
    projectId: usage?.projectId,
    ...details,
  });
}

function findCompleteJsonPayloadEnd(source: string, startIndex: number): number | null {
  let index = startIndex;
  while (index < source.length && /\s/.test(source[index])) index += 1;
  if (index >= source.length) return null;

  const opening = source[index];
  const closing = opening === "{" ? "}" : opening === "[" ? "]" : "";
  if (!closing) return null;

  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let i = index; i < source.length; i += 1) {
    const char = source[i];

    if (inString) {
      if (escaping) {
        escaping = false;
      } else if (char === "\\") {
        escaping = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      depth += 1;
    } else if (char === "}" || char === "]") {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }

  return null;
}

export interface GenerationDeltaParseState {
  markerBuffer: string;
  partialAccumulated: string;
  resultMarkerSeen: boolean;
}

export function createGenerationDeltaParseState(): GenerationDeltaParseState {
  return {
    markerBuffer: "",
    partialAccumulated: "",
    resultMarkerSeen: false,
  };
}

export function consumeGenerationDeltaMarkers(
  state: GenerationDeltaParseState,
  chunk: string,
  onDelta: (delta: string, fullPartialText: string) => void,
  onResultMarker?: (fullPartialText: string) => void,
): void {
  if (chunk) state.markerBuffer += chunk;

  while (state.markerBuffer.length > 0) {
    const resultIndex = state.markerBuffer.indexOf(GENERATION_RESULT_MARKER);
    const deltaIndex = state.markerBuffer.indexOf(GENERATION_DELTA_MARKER);

    if (resultIndex >= 0 && (deltaIndex < 0 || resultIndex < deltaIndex)) {
      state.resultMarkerSeen = true;
      onResultMarker?.(state.partialAccumulated);
      state.markerBuffer = "";
      return;
    }

    if (deltaIndex < 0) {
      const keep = Math.max(GENERATION_DELTA_MARKER.length, GENERATION_RESULT_MARKER.length);
      if (state.markerBuffer.length > keep) {
        state.markerBuffer = state.markerBuffer.slice(-keep);
      }
      return;
    }

    if (deltaIndex > 0) state.markerBuffer = state.markerBuffer.slice(deltaIndex);

    const payloadStart = GENERATION_DELTA_MARKER.length;
    const payloadEnd = findCompleteJsonPayloadEnd(state.markerBuffer, payloadStart);
    if (payloadEnd == null) return;

    const payloadText = state.markerBuffer.slice(payloadStart, payloadEnd).trim();
    const parsed = safeParseJson<{ content?: unknown }>(payloadText);
    const delta = typeof parsed?.content === "string" ? parsed.content : "";

    if (delta) {
      state.partialAccumulated += delta;
      onDelta(delta, state.partialAccumulated);
    }

    state.markerBuffer = state.markerBuffer.slice(payloadEnd);
  }
}

function parseGenerationResultPayload(
  body: string,
  contentType: string,
  taskType?: string,
): { content: string } {
  const trimmed = body.trim();
  const lineMarker = body.lastIndexOf(`\n${GENERATION_RESULT_MARKER}`);
  const marker = lineMarker >= 0
    ? lineMarker + 1
    : body.lastIndexOf(GENERATION_RESULT_MARKER);
  const payloadText = marker >= 0
    ? body.slice(marker + GENERATION_RESULT_MARKER.length).trim()
    : trimmed;

  const expectsJson = marker >= 0
    || contentType.toLowerCase().includes("application/json")
    || /^[\[{]/.test(payloadText);

  if (expectsJson) {
    const parsed = safeParseJson<{ success?: boolean; content?: unknown; error?: unknown; message?: unknown }>(payloadText);
    if (!parsed) {
      scriptoraLog.error("generation", "Failed to parse generation payload", {
        taskType,
        contentType,
        markerFound: marker >= 0,
        payloadPreview: payloadText.slice(0, 240),
      });
      throw new Error("Risposta non JSON valida dalla funzione di generazione. Riprova.");
    }
    if (parsed.success === false || parsed.error || parsed.message) {
      const message = String(parsed.error || parsed.message || "La generazione non e' riuscita.").trim();
      if (message.includes("credits exhausted") || /crediti insufficienti/i.test(message)) {
        throw new AICreditsError(message);
      }
      throw new Error(message);
    }
    if (typeof parsed.content !== "string" || !parsed.content.trim()) {
      throw new Error("La funzione di generazione ha risposto senza testo del capitolo.");
    }
    return { content: parsed.content };
  }

  if (/<!doctype html|<html/i.test(trimmed)) {
    scriptoraLog.error("generation", "Generation endpoint returned HTML instead of stream/JSON", {
      taskType,
      contentType,
      preview: trimmed.slice(0, 240),
    });
    throw new Error("Risposta HTML dalla funzione di generazione: controlla deploy/env della Edge Function.");
  }

  if (trimmed.length > 80) {
    scriptoraLog.warn("generation", "Generation response had no marker; using plain text body as fallback", {
      taskType,
      contentType,
      chars: trimmed.length,
    });
    return { content: trimmed };
  }

  scriptoraLog.error("generation", "No result marker found in AI response", {
    taskType,
    contentType,
    bufferLength: body.length,
    preview: trimmed.slice(0, 240),
  });
  throw new Error("La risposta AI e' incompleta o vuota. Riprova la generazione.");
}

async function callAIOnce(
  systemPrompt: string,
  userPrompt: string,
  timeoutMs: number = 300000,
  usage?: AIUsageContext,
  onPartial?: (partialText: string, fullPartialText: string) => void,
): Promise<string> {
  const controller = new AbortController();
  // Use a watchdog: reset whenever we receive bytes (DeepSeek can be slow but
  // streaming → we only abort on TRUE silence).
  let lastByteAt = Date.now();
  const partialState = createGenerationDeltaParseState();
  let loggedFirstDelta = false;
  let loggedResultMarker = false;
  const logStreamDiagnostics = streamAuditEnabled(usage);

  const consumePartialMarkers = (chunk = "") => {
    if (!onPartial) return;
    consumeGenerationDeltaMarkers(
      partialState,
      chunk,
      (delta, fullPartialText) => {
        if (logStreamDiagnostics && !loggedFirstDelta) {
          streamAuditLog("frontend_first_delta", {
            deltaChars: delta.length,
          }, usage);
          loggedFirstDelta = true;
        }
        onPartial(delta, fullPartialText);
      },
      (fullPartialText) => {
        if (logStreamDiagnostics && !loggedResultMarker) {
          streamAuditLog("frontend_result_marker_received", {
            partialChars: fullPartialText.length,
          }, usage);
          loggedResultMarker = true;
        }
      },
    );
  };

  const watchdog = setInterval(() => {
    if (Date.now() - lastByteAt > timeoutMs) {
      scriptoraLog.warn("generation", `No bytes received for ${timeoutMs}ms — aborting stream`, { taskType: usage?.taskType });
      controller.abort();
    }
  }, 15000);

  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-book`;
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("Missing Supabase configuration for AI generation.");
    }
    streamAuditLog("frontend_fetch_start", { timeoutMs }, usage);
    const currentUsage = usagePayload(usage);
    const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } } as any));
    const bearer = sessionData?.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const jwtKind = bearer === import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? "anon" : "user";
    logGenerationStart("GENERATION", "callAIOnce", {
      jwtPresent: jwtKind === "user",
      userId: sessionData?.session?.user?.id ?? null,
      taskType: usage?.taskType,
      projectId: usage?.projectId,
    });
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        "Authorization": `Bearer ${bearer}`,
        ...getBillingSimulationHeaders(),
      },
      body: JSON.stringify(withBillingSimulationBody({ systemPrompt, userPrompt, ...currentUsage })),
      signal: controller.signal,
    });

    const contentType = res.headers.get("content-type") || "";
    streamAuditLog("frontend_response", { status: res.status, ok: res.ok, contentType }, usage);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const errMsg = extractErrorMessageFromBody(text);
      logEdgeError("GENERATION", "generate-book", {
        status: res.status,
        body: errMsg,
        jwtKind,
        taskType: usage?.taskType,
        projectId: usage?.projectId,
      });
      if (res.status === 401) {
        throw new Error("Sessione utente non valida. Effettua nuovamente il login.");
      }
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
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      if (onPartial) consumePartialMarkers(chunk);
    }
    clearInterval(watchdog);
    if (onPartial) consumePartialMarkers();

    const parsed = parseGenerationResultPayload(buffer, contentType, usage?.taskType);
    if (onPartial && logStreamDiagnostics && !loggedResultMarker) {
      streamAuditLog("frontend_result_parsed", {
        partialChars: partialState.partialAccumulated.length,
        resultChars: parsed.content.length,
      }, usage);
    }
    logGenerationEnd("GENERATION", "callAIOnce", { chars: parsed.content.length, taskType: usage?.taskType });
    notifyUsageChanged();

    const cleanedContent = finalManuscriptGuard(
      parsed.content,
      {
        language: String(
          usage?.metadata?.language || "italian"
        ),
      }
    );

    // V13 SHADOW MODE — observe only, never changes generated manuscript text.
    try {
      const v13Audit = runWritingEngineV13Audit(cleanedContent, {
        language: String(usage?.metadata?.language || "italian"),
        genre: String(usage?.metadata?.genre || ""),
        bookTypeId: String(usage?.metadata?.bookTypeId || ""),
        family: "unknown",
      });

      if (typeof console !== "undefined" && import.meta.env.DEV) {
        console.debug("[SCRIPTORA V13 SHADOW]", {
          score: v13Audit.score,
          topRisks: v13Audit.signals.slice(0, 5),
        });
      }
    } catch (err) {
      if (typeof console !== "undefined" && import.meta.env.DEV) {
        console.warn("[SCRIPTORA V13 SHADOW FAILED]", err);
      }
    }

    return cleanedContent;
  } catch (e: any) {
    clearInterval(watchdog);

    if (e.name === "AbortError") {
      scriptoraLog.error(
        "generation",
        "Generation aborted by watchdog",
        {
          taskType: usage?.taskType,
          timeoutMs,
          lastByteAgo: Date.now() - lastByteAt,
        }
      );

      throw new Error("Generation timed out (no response)");
    }

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
    () => callAIOnce(systemPrompt, userPrompt, 420000, usage),
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
  return callAIOnce(systemPrompt, userPrompt, 420000, usage);
}

/**
 * FAST blueprint call — uses DeepSeek non-streaming JSON mode.
 * 90s hard timeout; faster than streaming for short structured output.
 */
async function callBlueprintFast(systemPrompt: string, userPrompt: string, usage?: AIUsageContext): Promise<string> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const supabasePublicKey = getSupabasePublicKey();
  if (!supabaseUrl || !supabasePublicKey) {
    blueprintDebug("BLUEPRINT_ERROR", {
      reason: "missing_supabase_env",
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasSupabasePublicKey: Boolean(supabasePublicKey),
    });
    throw new Error("Configurazione Supabase mancante per il motore Blueprint. Controlla le variabili Vercel e riprova.");
  }

  let url: string;
  try {
    url = new URL("/functions/v1/generate-blueprint-fast", supabaseUrl).toString();
  } catch {
    blueprintDebug("BLUEPRINT_ERROR", { reason: "invalid_supabase_url", supabaseUrl });
    throw new Error("URL Supabase non valido per il motore Blueprint. Controlla VITE_SUPABASE_URL in Vercel.");
  }

  let attemptNumber = 0;
  const callOnce = async (): Promise<string> => {
    attemptNumber += 1;
    if (attemptNumber > 1) {
      blueprintDebug("BLUEPRINT_RETRY", {
        attempt: attemptNumber,
        projectId: usage?.projectId,
        taskType: usage?.taskType || "generate_blueprint",
      });
      await supabase.auth.refreshSession().catch((err) => {
        blueprintDebug("BLUEPRINT_RETRY", {
          attempt: attemptNumber,
          refreshSession: "failed",
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);
    // Resolve bearer: prefer the authenticated user JWT (same strategy as callAIOnce).
    // Falls back to anon key only when there is genuinely no session.
    const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } } as any));
    const bearer = sessionData?.session?.access_token || supabasePublicKey;
    const jwtKind = bearer === supabasePublicKey ? "anon" : "user";
    blueprintDebug("BLUEPRINT_START", {
      attempt: attemptNumber,
      endpoint: url,
      jwtKind,
      hasSession: Boolean(sessionData?.session),
      userId: sessionData?.session?.user?.id ?? null,
      projectId: usage?.projectId,
    });
    logGenerationStart("BLUEPRINT", "callBlueprintFast", {
      jwtPresent: jwtKind === "user",
      userId: sessionData?.session?.user?.id ?? null,
      taskType: usage?.taskType,
      projectId: usage?.projectId,
    });
    let res: Response;
    try {
      blueprintDebug("BLUEPRINT_REQUEST", {
        attempt: attemptNumber,
        taskType: usage?.taskType || "generate_blueprint",
        projectId: usage?.projectId,
      });
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bearer}`,
          apikey: supabasePublicKey,
          ...getBillingSimulationHeaders(),
        },
        body: JSON.stringify(withBillingSimulationBody({
          systemPrompt,
          userPrompt,
          ...usagePayload({ ...usage, taskType: usage?.taskType || "generate_blueprint" }),
        })),
        signal: controller.signal,
      });
    } catch (err: any) {
      clearTimeout(timeout);
      if (err?.name === "AbortError") {
        blueprintDebug("BLUEPRINT_ERROR", {
          attempt: attemptNumber,
          reason: "timeout",
          timeoutMs: 90_000,
          taskType: usage?.taskType,
        });
        scriptoraLog.error("generation", "Blueprint timed out (AbortError)", { taskType: usage?.taskType });
        throw new Error("Il motore Blueprint sta impiegando più tempo del previsto. Riprova tra pochi secondi.");
      }
      blueprintDebug("BLUEPRINT_ERROR", {
        attempt: attemptNumber,
        reason: "fetch_failed",
        error: err?.message || String(err),
        endpoint: url,
        taskType: usage?.taskType,
      });
      scriptoraLog.error("generation", "Blueprint fetch failed", {
        error: err?.message,
        taskType: usage?.taskType,
        endpoint: url,
        attempt: attemptNumber,
      });
      throw new Error(BLUEPRINT_NETWORK_USER_MESSAGE);
    }
    clearTimeout(timeout);
    blueprintDebug("BLUEPRINT_RESPONSE", {
      attempt: attemptNumber,
      status: res.status,
      ok: res.ok,
      contentType: res.headers.get("content-type") || "",
    });
    scriptoraLog.info("BLUEPRINT", `Blueprint response: ${res.status}`, { jwtKind, taskType: usage?.taskType });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let errMsg = text;
      try { errMsg = JSON.parse(text).error || text; } catch {}
      logEdgeError("BLUEPRINT", "generate-blueprint-fast", {
        status: res.status,
        body: errMsg,
        jwtKind,
        taskType: usage?.taskType,
        projectId: usage?.projectId,
      });
      if (res.status === 401) {
        throw new Error("Sessione utente non valida. Effettua nuovamente il login.");
      }
      if (res.status === 402) throw new AICreditsError(errMsg || "AI credits exhausted");
      throw new Error(errMsg || `Blueprint generation failed (${res.status})`);
    }
    const responseText = await res.text().catch(() => "");
    const parsedResponse = safeParseJson<{ success?: boolean; content?: unknown; error?: unknown; message?: unknown }>(responseText);
    if (!parsedResponse) {
      scriptoraLog.error("generation", "Blueprint endpoint returned malformed response", {
        taskType: usage?.taskType,
        status: res.status,
        contentType: res.headers.get("content-type") || "",
        preview: responseText.slice(0, 240),
      });
      throw new Error("Risposta non JSON dalla funzione blueprint. Controlla deploy/env e riprova.");
    }
    const { content, error, message, success } = parsedResponse;
    if (success === false || error || message) {
      const serverMessage = String(error || message || "La generazione Blueprint non e' riuscita.").trim();
      if (serverMessage.includes("credits")) throw new AICreditsError(serverMessage);
      throw new Error(serverMessage);
    }
    if (typeof content !== "string" || !content.trim()) throw new Error("Empty blueprint response");
    notifyUsageChanged();
    blueprintDebug("BLUEPRINT_SUCCESS", {
      attempt: attemptNumber,
      chars: content.length,
      taskType: usage?.taskType || "generate_blueprint",
    });
    logGenerationEnd("BLUEPRINT", "callBlueprintFast", { chars: content.length, taskType: usage?.taskType });
    return content;
  };
  return withRetry(callOnce, {
    maxAttempts: 3,
    baseDelayMs: 1500,
    maxDelayMs: 4000,
    serviceKey: "deepseek-blueprint",
    shouldRetry: (err) => !(err instanceof AICreditsError),
    onAttempt: (attempt, err) => {
      if (err) {
        blueprintDebug("BLUEPRINT_RETRY", {
          attempt,
          failed: true,
          error: err.message,
          willRetry: attempt < 3 && !(err instanceof AICreditsError),
        });
      }
    },
  });
}

/* ============ Context Memory Engine ============ */

export type WriterMemoryLabel = "NARRATIVE MEMORY" | "POETIC CONTINUITY" | "PRACTICAL CONTINUITY";

export function resolveWriterMemoryLabel(config: BookConfig): WriterMemoryLabel {
  const def = resolveBookTypeDefinition(config.genre, config.subcategory, config.subgenre, config.bookTypeId);
  const kernel = resolveBookKernel({ config });
  const hay = `${config.genre} ${config.subcategory || ""} ${config.subgenre || ""}`.toLowerCase();

  if (def.family === "poetry" || kernel.contentMode === "poetic") return "POETIC CONTINUITY";

  const isMemoir = def.id === "memoir" || def.id === "biography" || /memoir|biograph/.test(hay);
  if (def.family === "narrative" || isMemoir) return "NARRATIVE MEMORY";

  if (
    def.family === "manual"
    || def.family === "educational"
    || def.family === "nonfiction"
    || def.family === "cookbook"
    || kernel.contentMode === "instructional"
    || kernel.contentMode === "practical"
    || kernel.contentMode === "reference"
    || kernel.contentMode === "academic"
    || kernel.contentMode === "educational"
    || kernel.bookFormat === "study_material"
    || kernel.bookFormat === "workbook"
    || kernel.bookFormat === "manual"
    || kernel.bookFormat === "self_help"
    || kernel.bookFormat === "psychology_guide"
  ) {
    return "PRACTICAL CONTINUITY";
  }

  return "NARRATIVE MEMORY";
}

function shouldSkipNarrativeQualityRepair(config: BookConfig): boolean {
  return requiresFormatQualityRepair(config);
}

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
  opts?: { skipLongBookMemory?: boolean },
): string {
  if (previousChapters.length === 0) return "This is the FIRST chapter — establish the tone, introduce the core premise, and hook the reader immediately.";

  const summaries = previousChapters.map((c, i) => {
    const wordCount = c.content.split(/\s+/).length;
    const keyIdeas = extractKeyIdeas(c.content);
    const subTitles = safeSubchapters(c).map((s) => s.title).join(", ");
    return `Ch ${i + 1} "${c.title}" (${wordCount} words):
  Opening: ${c.content.substring(0, 150)}...
  Key ideas: ${keyIdeas.join(" | ")}
  Ending: ...${c.content.substring(Math.max(0, c.content.length - 150))}${subTitles ? `\n  Subchapters: ${subTitles}` : ""}`;
  }).join("\n\n");

  // Compact scene-state snapshot from the most recent chapter's closing passage.
  // Deterministic, no AI call — extracts the last 600 chars and surfaces it as structured continuity signal.
  const lastChapter = previousChapters[previousChapters.length - 1];
  const closingPassage = lastChapter.content.length > 600
    ? lastChapter.content.substring(lastChapter.content.length - 600)
    : lastChapter.content;
  const lastSceneState = `LAST SCENE STATE (closing passage of Ch ${previousChapters.length} — maintain direct continuity):
${closingPassage.trim()}

Continuity signal — you MUST carry forward:
- The emotional charge present at that moment
- Any unresolved tension, open question, or dangling thread
- The last visible action or physical detail
- Who was present or implied in that final moment`;

  const arcPosition = chapterIndex / config.numberOfChapters;
  const arcPhase = arcPosition < 0.25 ? "OPENING — establishing foundations"
    : arcPosition < 0.5 ? "RISING — deepening and developing"
    : arcPosition < 0.75 ? "CLIMAX — peak tension and transformation"
    : "RESOLUTION — integration and closure";

  // Track emotional progression across chapters
  const emotionalTrack = previousChapters.length >= 2
    ? `Emotional trajectory: The book has moved from "${previousChapters[0].title}" through "${previousChapters[previousChapters.length - 1].title}". Continue escalating.`
    : "";

  return `${resolveWriterMemoryLabel(config)} (you MUST maintain perfect continuity):

PREVIOUS CHAPTERS:
${summaries}

${lastSceneState}

${emotionalTrack}

BOOK ARCHITECTURE:
- Emotional arc: ${blueprint.emotionalArc}
- Arc position: Chapter ${chapterIndex + 1} of ${config.numberOfChapters} — ${arcPhase}
- Core themes: ${blueprint.themes.join(", ")}

${buildBlueprintIntegrityRuntimeBlock(config, blueprint, { chapterIndex })}

${(() => {
    if (opts?.skipLongBookMemory) return "";
    const family = resolveBookTypeDefinition(config.genre, config.subcategory, config.subgenre, config.bookTypeId).family;
    if (family !== "narrative" && family !== "poetry") return "";
    const memory = buildLongBookMemory({ config, blueprint, chapters: previousChapters });
    return buildLongBookMemoryPromptBlock(memory, chapterIndex);
  })()}

CONTINUITY RULES (MANDATORY):
- Reference and BUILD UPON ideas from previous chapters — create callbacks
- NEVER repeat examples, metaphors, anecdotes, or structural patterns
- Progress the emotional arc naturally — escalate, deepen, transform
- Each chapter must feel like the NEXT step in a journey, not a standalone piece
- The reader must sense ONE author mind behind the entire book
- Use restraint with highlight-worthy sentences: one strong line should land because the surrounding prose is concrete and alive
- Never stack quotable lines until the chapter sounds written instead of lived`;
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

export const AUTHOR_IDENTITY_MISSING_COPY = "Nessuna identità autore configurata";

function buildAuthorIdentityBlock(config: BookConfig): string {
  const identity = resolveAuthorIdentityForPublishing(config.authorIdentity);
  if (!identity) {
    return `AUTHOR IDENTITY:
- No configured author identity.
- Do NOT invent author names, pen names, or biographies.
- Never use "Scriptora Studio" or placeholder authors.
- Front/back matter must show exactly: "${AUTHOR_IDENTITY_MISSING_COPY}"`;
  }

  const penName = identity.penName;
  const copyrightName = identity.copyrightName || identity.realName || penName;

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
  const identity = resolveAuthorIdentityForPublishing(config.authorIdentity);
  return (identity?.penName || "").trim();
}

function getAuthorCopyrightName(config: BookConfig): string {
  const identity = resolveAuthorIdentityForPublishing(config.authorIdentity);
  return (identity?.copyrightName || identity?.realName || identity?.penName || "").trim();
}

function buildAuthorBookDeclaration(config: BookConfig): string {
  const identity = resolveAuthorIdentityForPublishing(config.authorIdentity);
  const penName = getAuthorPenName(config);
  const copyrightName = getAuthorCopyrightName(config);
  if (!identity) {
    return `AUTHOR DECLARATION:
- No configured author identity. Do NOT invent an author name or biography.
- Front matter "About the Author" must use exactly: "${AUTHOR_IDENTITY_MISSING_COPY}"
- Never use "Scriptora Studio" or any placeholder pen name.`;
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
   Emotional triggers: ${c.emotionalTriggers || "not specified"}
   Dominant flaw: ${c.dominantFlaw || "not specified"}
   Blind spot: ${c.blindSpot || "not specified"}
   Vulnerability: ${c.vulnerability || "not specified"}
   Recurring behavior: ${c.recurringBehavior || "not specified"}
   Personal language: ${c.personalLanguage || "not specified"}
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
- Before writing any reaction, ask: "Is this response coherent with this character's wound, fear, desire, contradiction, and recurring behavior?"
- Never make every character react the same way.
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

export function buildScriptoraOmegaDirective(
  config: BookConfig,
  opts: { chapterIndex?: number; mode?: "generation" | "subchapter" | "rewrite" } = {},
): string {
  const genre = String(config.genre || "").toLowerCase();
  const subgenre = String(config.subgenre || config.subcategory || "").toLowerCase();
  const genreSignal = `${genre} ${subgenre}`;
  const isRomance = genreSignal.includes("romance");
  const isDarkRomance = genreSignal.includes("dark") && genreSignal.includes("romance");
  const isThriller = ["thriller", "crime", "noir", "mystery"].some((key) => genreSignal.includes(key));
  const isFantasy = ["fantasy", "romantasy", "sci-fi", "science fiction"].some((key) => genreSignal.includes(key));
  const isSelfHelp = ["self-help", "self help", "personal development"].some((key) => genreSignal.includes(key));
  const isBusiness = ["business", "entrepreneur", "marketing", "leadership"].some((key) => genreSignal.includes(key));
  const isPoetry = ["poetry", "poesia"].some((key) => genreSignal.includes(key));
  const chapterLabel = typeof opts.chapterIndex === "number" ? `Chapter ${opts.chapterIndex + 1}` : "Current section";
  const modeLabel = opts.mode === "rewrite"
    ? "rewrite quality pass"
    : opts.mode === "subchapter"
      ? "subchapter generation"
      : "chapter generation";

  return `
SCRIPTORA OMEGA DIRECTIVE — FINAL EDITORIAL QUALITY GATE (${modeLabel})
Treat this as the active editorial brain for ${chapterLabel}. It is a silent writing standard, never visible in the manuscript.

TRUTH HIERARCHY:
- Book Configuration, Author Identity, Blueprint, Book Type Engine, Character Studio, Canon Memory, Long Book Memory, Genre Brain, Narrative Intelligence, Human Bestseller Mode, Market Intelligence and Editorial Intelligence are all binding.
- No sentence may contradict title, language, genre, blueprint, character facts, timeline, locations, secrets, objects, prior events or established emotional state.
- If a detail is missing, bridge it with context that preserves canon. Do not invent a shortcut that creates a contradiction.

BLUEPRINT AND STRUCTURE:
- The blueprint is law: every chapter, subchapter, scene, emotional arc and objective must exist in the manuscript when requested.
- Do not summarize, merge, skip, flatten or replace planned beats.
- Every scene needs a concrete objective, obstacle, conflict and change. If nothing changes, rewrite the scene mentally before output.

CHARACTER AND CANON LOCK:
- Each character must preserve wound, desire, fear, contradiction, voice, language, habits, relationships and memory of lived events.
- Before every reaction, verify age, timeline, place, knowledge, secrets and objects.
- Characters must behave like real people under pressure, not like plot devices explaining the theme.

ANTI-REPETITION OMEGA:
- Do not repeat metaphors, images, physical tics, sentence structures, emotional labels or equivalent dialogue from prior text.
- If a formula was already used, create a new concrete behavior, image or pressure point.
- Give this section its own identity while remaining part of the same book.

GENRE ABSOLUTE MODE:
${isRomance ? "- Romance: tension, desire, vulnerability, emotional conflict, restraint and earned intimacy must drive the scene." : ""}
${isDarkRomance ? "- Dark romance: attraction, danger, obsession, moral conflict and consent clarity must coexist without cartoon melodrama." : ""}
${isThriller ? "- Thriller/suspense: increase risk, pressure, consequence, clues and dread. Every scene should leave a live question." : ""}
${isFantasy ? "- Fantasy/speculative: maintain wonder, immersion, world-rule coherence, cost and consequence." : ""}
${isSelfHelp ? "- Self-help: deliver transformation, clarity, applicability and concrete action, not motivational fog." : ""}
${isBusiness ? "- Business: write with authority, evidence, examples and practical value." : ""}
${isPoetry ? "- Poetry: protect original imagery, musicality, emotional depth and compression." : ""}

PAGE-TURN AND HUMAN BESTSELLER MODE:
- Build forward pull with mystery, tension, promise, consequence, revelation or open emotion.
- Show through action, detail, environment, subtext and dialogue. Reduce explanation and emotional labels.
- The prose must feel authored by a high-end human writer: concrete details, psychological contradiction, natural imperfection, varied rhythm.

SUPREME QUALITY CHECK BEFORE OUTPUT:
- Blueprint respected; canon respected; memory active; characters coherent; no obvious repetition; rhythm varied; conflict present; emotional progression real; genre rules active; no narrative shortcut.
- Deliver professional manuscript prose, not a draft.`;
}

function buildHumanNarrativeRealismV4Block(config: BookConfig, chapterIndex?: number): string {
  const genre = String(config.genre || "").toLowerCase();
  const subgenre = String(config.subgenre || config.subcategory || "").toLowerCase();
  const isRomance = genre.includes("romance") || subgenre.includes("romance");
  const isDarkRomance = genre.includes("dark") || subgenre.includes("dark");
  const isSuspense = ["thriller", "crime", "horror"].some((key) => genre.includes(key) || subgenre.includes(key));
  const isSpeculative = ["fantasy", "sci-fi", "science fiction"].some((key) => genre.includes(key) || subgenre.includes(key));
  const chapterLabel = typeof chapterIndex === "number" ? `Chapter ${chapterIndex + 1}` : "This chapter";

  return `
HUMAN NARRATIVE REALISM V4 — HARD RUNTIME RULES:
- ${chapterLabel} must advance through behavior, pressure, choice and consequence, not emotional explanation.
- Show before explaining: breath, body, silence, objects, delayed replies, unfinished sentences, defensive humor, avoidance, contradiction.
- Never let a character perfectly diagnose their trauma in polished therapeutic dialogue.
- After vulnerability, add friction: distance, embarrassment, misunderstanding, anger, practical consequence, or a reason to retreat.
- Preserve unresolved tension. Do not heal the relationship, solve the wound, or complete the payoff too early.
- If a beat already appeared in previous chapters, transform it into action or consequence. Do not repeat the same confession, fear, promise, or ending in prettier words.
- Protect canon: character names, relationships, setting, timeline, wounds, secrets, rules of the world and emotional state must not drift.

${isRomance ? `ROMANCE PACING / EMOTIONAL STARVATION:
- Use tension -> micro reward -> distance -> craving -> new obstacle -> almost payoff -> frustration -> earned payoff later.
- Do not make the love interest emotionally available too soon.
- Avoid instant safety, instant forgiveness, instant confession and instant healing.
- After a charged scene, leave the reader wanting the kiss/conversation/resolution, not receiving the whole emotional answer.` : ""}

${isDarkRomance ? `DARK ROMANCE CONTROL:
- Keep danger, obsession, moral tension and consent clarity alive without cartoon melodrama.
- Let attraction create risk. Let tenderness cost something.
- Never flatten a dangerous character into immediate emotional fluency.` : ""}

${isSuspense ? `SUSPENSE BREATHING:
- Before payoff, make the reader wait: sound, absence, wrong detail, repeated signal, delayed reveal, physical dread.
- Do not compress call -> attack -> blood -> confession into one rush unless the outline demands it.
- Every chapter must raise a question, danger, clue, suspicion, deadline or consequence.` : ""}

${isSpeculative ? `FANTASY / SCI-FI CANON:
- Show worldbuilding through conflict, limits, cost and consequence.
- Never change magic/technology/world rules midstream.
- Avoid encyclopedia paragraphs; reveal rules when they hurt, help, tempt or trap a character.` : ""}
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
  return buildPromptFromCanonicalConfig(config, lock, opts).prompt;
}

/** Sanitize config at generation boundaries — returns clean config for downstream use. */
function withSanitizedConfig(config: BookConfig): BookConfig {
  return sanitizeBookConfiguration(config).config;
}

/* ============ Phase Logic for Chunked Writing ============ */

type ChunkPhase = "OPENING" | "DEVELOPMENT" | "EXPANSION" | "TRANSITION" | "CLOSURE";

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

function writingQualityGateDevLog(event: string, payload: Record<string, unknown>) {
  try {
    if (import.meta.env.DEV || DEV_DEBUG_STREAM) {
      console.info(event, {
        ts: new Date().toISOString(),
        ...payload,
      });
    }
  } catch {
    /* diagnostics must never block generation */
  }
}

function summarizeWritingQualityReport(report: WritingQualityReport) {
  return report.issues.map((issue) => ({
    kind: issue.kind,
    severity: issue.severity,
    evidence: issue.evidence.slice(0, 2),
  }));
}

async function repairFormatChapterQualityIfNeeded(
  chapterText: string,
  context: {
    config: BookConfig;
    usage?: AIUsageContext;
    chapterIndex: number;
    chapterTitle: string;
  },
): Promise<string> {
  const report = validateFormatChapterQuality(chapterText, {
    language: context.config.language,
    genre: context.config.genre,
    config: context.config as BookConfig & Record<string, unknown>,
    chapterTitle: context.chapterTitle,
  });

  if (!report.needsRepair) {
    if (DEV_DEBUG_STREAM) {
      writingQualityGateDevLog("FORMAT_QUALITY_GATE_PASS", {
        chapterIndex: context.chapterIndex + 1,
        score: report.score,
        issues: summarizeWritingQualityReport(report),
      });
    }
    return chapterText;
  }

  writingQualityGateDevLog("FORMAT_QUALITY_REPAIR_TRIGGERED", {
    chapterIndex: context.chapterIndex + 1,
    score: report.score,
    issues: summarizeWritingQualityReport(report),
  });

  try {
    const kernel = resolveBookKernel({ config: context.config });
    const repairedText = await callAIReduced(
      `${getSystemPrompt(context.config)}

Surgical ${kernel.bookFormat} format repair. Preserve section goal, author voice and factual content. Never add fiction plot or characters when forbidden.`,
      buildFormatQualityRepairPrompt({
        chapterText,
        report,
        config: context.config,
        language: context.config.language,
        chapterTitle: context.chapterTitle,
      }),
      withUsage(context.usage, {
        taskType: "generate_chapter_quality_retry",
        metadata: {
          chapterIndex: context.chapterIndex + 1,
          formatQualityGate: true,
          bookFormat: kernel.bookFormat,
          writingQualityIssues: report.issues.map((issue) => issue.kind),
          noExtraCharge: true,
          language: context.config.language,
          genre: context.config.genre,
        },
      }),
    );
    const cleanRepairedText = repairedText.replace(/^```[a-z]*\n?/g, "").replace(/\n?```$/g, "").trim();
    if (!cleanRepairedText) {
      writingQualityGateDevLog("FORMAT_QUALITY_REPAIR_FAILED", {
        chapterIndex: context.chapterIndex + 1,
        reason: "empty_repair",
      });
      return chapterText;
    }

    const repairedReport = validateFormatChapterQuality(cleanRepairedText, {
      language: context.config.language,
      genre: context.config.genre,
      config: context.config as BookConfig & Record<string, unknown>,
      chapterTitle: context.chapterTitle,
    });

    if (repairedReport.needsRepair && repairedReport.score < report.score) {
      writingQualityGateDevLog("FORMAT_QUALITY_REPAIR_FAILED", {
        chapterIndex: context.chapterIndex + 1,
        reason: "repair_regressed",
        originalScore: report.score,
        repairedScore: repairedReport.score,
        issues: summarizeWritingQualityReport(repairedReport),
      });
      return chapterText;
    }

    writingQualityGateDevLog("FORMAT_QUALITY_REPAIR_PASSED", {
      chapterIndex: context.chapterIndex + 1,
      originalScore: report.score,
      repairedScore: repairedReport.score,
      remainingIssues: summarizeWritingQualityReport(repairedReport),
    });
    return cleanRepairedText;
  } catch (error) {
    writingQualityGateDevLog("FORMAT_QUALITY_REPAIR_FAILED", {
      chapterIndex: context.chapterIndex + 1,
      reason: error instanceof Error ? error.message : String(error),
    });
    return chapterText;
  }
}

async function enforceChapterFormatPurityBeforeSave(
  chapterText: string,
  context: {
    config: BookConfig;
    blueprint?: BookBlueprint;
    genreLock?: GenreLock;
    usage?: AIUsageContext;
    chapterIndex: number;
    chapterTitle: string;
    skipFormatAiRepair?: boolean;
  },
): Promise<string> {
  const kernel = resolveBookKernel({ config: context.config });
  const purityInput = {
    bookFormat: kernel.bookFormat,
    genre: kernel.genre,
    subcategory: kernel.subgenre,
    generationStrategy: kernel.generationStrategy,
    blueprintType: kernel.blueprintType,
    text: chapterText,
    requireMandatorySections: false,
  };

  const coherenceReport = validateFormatCoherence(context.config, context.blueprint ?? null, chapterText);
  const purityReport = validateFormatPurity(purityInput);

  if (coherenceReport.passed && purityReport.passed) {
    return chapterText;
  }

  writingQualityGateDevLog("FORMAT_PURITY_POST_CHAPTER_TRIGGERED", {
    chapterIndex: context.chapterIndex + 1,
    purityScore: purityReport.score,
    coherenceIssues: coherenceReport.issues.length,
  });

  const deterministic = repairFormatPurityText(purityInput);
  if (deterministic.changed) {
    const recheckPurity = validateFormatPurity({ ...purityInput, text: deterministic.text });
    const recheckCoherence = validateFormatCoherence(context.config, context.blueprint ?? null, deterministic.text);
    if (recheckPurity.passed && recheckCoherence.passed) {
      writingQualityGateDevLog("FORMAT_PURITY_DETERMINISTIC_REPAIR_PASSED", {
        chapterIndex: context.chapterIndex + 1,
      });
      return deterministic.text;
    }
  }

  if (requiresFormatQualityRepair(context.config) && !context.skipFormatAiRepair) {
    const repaired = await repairFormatChapterQualityIfNeeded(deterministic.changed ? deterministic.text : chapterText, {
      config: context.config,
      usage: context.usage,
      chapterIndex: context.chapterIndex,
      chapterTitle: context.chapterTitle,
    });
    const finalPurity = validateFormatPurity({ ...purityInput, text: repaired });
    const finalCoherence = validateFormatCoherence(context.config, context.blueprint ?? null, repaired);
    if (finalPurity.passed && finalCoherence.passed) {
      return repaired;
    }
    if (repaired !== chapterText) return repaired;
  }

  return deterministic.changed ? deterministic.text : chapterText;
}

function applyMemorabilityRepairFallback(
  chapterText: string,
  context: {
    config: BookConfig;
    chapterIndex: number;
    chapterTitle: string;
  },
  reason: string,
): string {
  const memorability = evaluateMemorability(chapterText, {
    language: context.config.language,
    genre: context.config.genre,
    bookTitle: context.config.title,
    chapterTitle: context.chapterTitle,
    chapterIndex: context.chapterIndex,
    config: context.config,
  });
  const patched = applyMemorabilityLocalPatch(
    chapterText,
    memorability.localPatchHints,
    context.config.language,
  );
  if (patched !== chapterText) {
    recordWriterPerformanceMetric({
      chapterIndex: context.chapterIndex,
      retryCount: getWriterRetryCount(),
      repairType: "local",
      memorabilityBefore: memorability.scores.memorability,
      memorabilityAfter: evaluateMemorability(patched, {
        language: context.config.language,
        genre: context.config.genre,
        bookTitle: context.config.title,
        chapterTitle: context.chapterTitle,
        chapterIndex: context.chapterIndex,
        config: context.config,
      }).scores.memorability,
    });
    writingQualityGateDevLog("WRITING_QUALITY_LOCAL_PATCH_APPLIED", {
      chapterIndex: context.chapterIndex + 1,
      reason,
    });
    return patched;
  }
  return chapterText;
}

async function applyTraditionalEditorPassIfNeeded(
  text: string,
  context: {
    config: BookConfig;
    genreLock?: GenreLock;
    usage?: AIUsageContext;
    chapterIndex: number;
    chapterTitle?: string;
    outlineSummary?: string;
    onStatus?: (message: string) => void;
  },
): Promise<string> {
  if (!shouldApplyTraditionalEditorPass(context.config)) return text;

  const prepped = applyTraditionalEditorLocalPrep(text);
  const inputWords = countWords(prepped);
  if (shouldShowTraditionalEditorStatus(context.config)) {
    context.onStatus?.("Editor tradizionale in corso…");
  }

  try {
    const repairedText = await callAIReduced(
      TRADITIONAL_EDITOR_SYSTEM_PROMPT(context.config),
      buildTraditionalEditorUserPrompt(prepped, {
        config: context.config,
        chapterIndex: context.chapterIndex,
        chapterTitle: context.chapterTitle,
        outlineSummary: context.outlineSummary,
        language: context.config.language,
      }),
      withUsage(context.usage, {
        taskType: "traditional_editor_pass",
        metadata: {
          chapterIndex: context.chapterIndex + 1,
          genre: context.config.genre,
          noExtraCharge: true,
          language: context.config.language,
        },
      }),
    );
    const cleaned = repairedText.replace(/^```[a-z]*\n?/g, "").replace(/\n?```$/g, "").trim();
    if (!cleaned) return prepped;

    const outputWords = countWords(cleaned);
    if (!meetsTraditionalEditorWordCountGuard(inputWords, outputWords)) {
      writingQualityGateDevLog("TRADITIONAL_EDITOR_WORD_COUNT_REJECTED", {
        chapterIndex: context.chapterIndex + 1,
        inputWords,
        outputWords,
      });
      return prepped;
    }

    recordWriterPerformanceMetric({
      chapterIndex: context.chapterIndex,
      retryCount: getWriterRetryCount(),
      repairType: "surgical_ai",
      editorialPass: "traditional_editor",
    });
    return cleaned;
  } catch {
    writingQualityGateDevLog("TRADITIONAL_EDITOR_PASS_FAILED", {
      chapterIndex: context.chapterIndex + 1,
    });
    return prepped;
  }
}

async function applyChapterEditorialFinishingPasses(
  text: string,
  context: {
    config: BookConfig;
    genreLock?: GenreLock;
    usage?: AIUsageContext;
    chapterIndex: number;
    chapterTitle?: string;
    outlineSummary?: string;
    onChunkProgress?: (progress: ChunkProgress) => void;
  },
): Promise<string> {
  const pipeline = runEditorialQualityPipeline(text, {
    config: context.config,
    language: context.config.language,
    genre: context.config.genre,
    chapterTitle: context.chapterTitle,
    contentKind: "chapter",
  });
  const editorialContent = pipeline.text;

  const traditionalContent = await applyTraditionalEditorPassIfNeeded(editorialContent, {
    config: context.config,
    genreLock: context.genreLock,
    usage: context.usage,
    chapterIndex: context.chapterIndex,
    chapterTitle: context.chapterTitle,
    outlineSummary: context.outlineSummary,
    onStatus: (message) => {
      context.onChunkProgress?.({
        chunkIndex: 0,
        totalChunks: 1,
        currentWords: countWords(editorialContent),
        targetWords: countWords(editorialContent),
        phase: "CLOSURE",
        content: editorialContent,
        statusMessage: message,
      });
    },
  });

  const timelineAudit = validateNarrativeTimeline(traditionalContent);
  if (!timelineAudit.valid && import.meta.env.DEV) {
    console.warn("[Scriptora] Timeline coherence issues in chapter", {
      chapterIndex: context.chapterIndex,
      issues: timelineAudit.issues,
    });
  }

  return applyCleanTextPass(traditionalContent, context.config.language);
}

async function repairChapterWritingQualityIfNeeded(
  chapterText: string,
  context: {
    config: BookConfig;
    genreLock?: GenreLock;
    usage?: AIUsageContext;
    chapterIndex: number;
    chapterTitle: string;
  },
): Promise<string> {
  if (shouldSkipNarrativeQualityRepair(context.config)) {
    return repairFormatChapterQualityIfNeeded(chapterText, {
      config: context.config,
      usage: context.usage,
      chapterIndex: context.chapterIndex,
      chapterTitle: context.chapterTitle,
    });
  }

  const report = validateNarrativeChapterQuality(chapterText, {
    language: context.config.language,
    genre: context.config.genre,
    config: context.config as BookConfig & Record<string, unknown>,
  });

  if (!report.needsRepair) {
    if (DEV_DEBUG_STREAM) {
      writingQualityGateDevLog("WRITING_QUALITY_GATE_PASS", {
        chapterIndex: context.chapterIndex + 1,
        score: report.score,
        issues: summarizeWritingQualityReport(report),
      });
    }
    recordWriterPerformanceMetric({
      chapterIndex: context.chapterIndex,
      retryCount: getWriterRetryCount(),
      repairType: "none",
    });
    return chapterText;
  }

  writingQualityGateDevLog("WRITING_QUALITY_REPAIR_TRIGGERED", {
    chapterIndex: context.chapterIndex + 1,
    score: report.score,
    issues: summarizeWritingQualityReport(report),
  });

  if (getWriterRetryCount() >= MAX_QUALITY_REPAIR_ATTEMPTS) {
    return applyMemorabilityRepairFallback(chapterText, context, "retry_cap_reached");
  }

  try {
    incrementWriterRetryCount();
    const repairedText = await callAIReduced(
      `${getSystemPrompt(context.config, context.genreLock)}

Surgical narrative quality repair. Preserve canon, blueprint, plot, POV, character facts, timeline intent and author voice.`,
      buildNarrativeQualityRepairPrompt({
        chapterText,
        report,
        language: context.config.language,
        chapterTitle: context.chapterTitle,
      }),
      withUsage(context.usage, {
        taskType: "generate_chapter_quality_retry",
        metadata: {
          chapterIndex: context.chapterIndex + 1,
          writingQualityGate: true,
          writingQualityIssues: report.issues.map((issue) => issue.kind),
          noExtraCharge: true,
          language: context.config.language,
          genre: context.config.genre,
          bookTypeId: String((context.config as any).bookTypeId || (context.config as any).bookType || ""),
        },
      }),
    );
    const cleanRepairedText = repairedText.replace(/^```[a-z]*\n?/g, "").replace(/\n?```$/g, "").trim();
    if (!cleanRepairedText) {
      writingQualityGateDevLog("WRITING_QUALITY_REPAIR_FAILED", {
        chapterIndex: context.chapterIndex + 1,
        reason: "empty_repair",
      });
      return applyMemorabilityRepairFallback(chapterText, context, "empty_repair");
    }

    const repairedReport = validateNarrativeChapterQuality(cleanRepairedText, {
      language: context.config.language,
      genre: context.config.genre,
      config: context.config as BookConfig & Record<string, unknown>,
    });

    if (repairedReport.needsRepair && repairedReport.score < report.score) {
      writingQualityGateDevLog("WRITING_QUALITY_REPAIR_FAILED", {
        chapterIndex: context.chapterIndex + 1,
        reason: "repair_regressed",
        originalScore: report.score,
        repairedScore: repairedReport.score,
        issues: summarizeWritingQualityReport(repairedReport),
      });
      return applyMemorabilityRepairFallback(chapterText, context, "repair_regressed");
    }

    writingQualityGateDevLog("WRITING_QUALITY_REPAIR_PASSED", {
      chapterIndex: context.chapterIndex + 1,
      originalScore: report.score,
      repairedScore: repairedReport.score,
      remainingIssues: summarizeWritingQualityReport(repairedReport),
    });
    recordWriterPerformanceMetric({
      chapterIndex: context.chapterIndex,
      retryCount: getWriterRetryCount(),
      repairType: "surgical_ai",
    });
    return cleanRepairedText;
  } catch (error) {
    writingQualityGateDevLog("WRITING_QUALITY_REPAIR_FAILED", {
      chapterIndex: context.chapterIndex + 1,
      reason: error instanceof Error ? error.message : String(error),
    });
    return applyMemorabilityRepairFallback(chapterText, context, "repair_error");
  }
}

export function buildChapterLivePreview(accumulatedContent: string, partialAccumulated: string): string {
  const base = String(accumulatedContent || "").trim();
  const partial = String(partialAccumulated || "").trim();
  if (!base) return partial;
  if (!partial) return base;
  return `${base}\n\n${partial}`;
}

const CHAPTER_PARTIAL_PROGRESS_MIN_MS = 350;
const CHAPTER_PARTIAL_PROGRESS_MIN_CHARS = 100;

export interface ChapterPartialProgressThrottleState {
  lastPartialProgressAt: number;
  lastPartialChars: number;
  hasReportedPartialProgress: boolean;
}

export function createChapterPartialProgressThrottleState(): ChapterPartialProgressThrottleState {
  return {
    lastPartialProgressAt: 0,
    lastPartialChars: 0,
    hasReportedPartialProgress: false,
  };
}

export function shouldEmitChapterPartialProgress(
  state: ChapterPartialProgressThrottleState,
  partialChars: number,
  now: number,
): boolean {
  const isFirstPartialProgress = !state.hasReportedPartialProgress;
  if (
    !isFirstPartialProgress
    && now - state.lastPartialProgressAt < CHAPTER_PARTIAL_PROGRESS_MIN_MS
    && partialChars - state.lastPartialChars < CHAPTER_PARTIAL_PROGRESS_MIN_CHARS
  ) {
    return false;
  }

  state.hasReportedPartialProgress = true;
  state.lastPartialProgressAt = now;
  state.lastPartialChars = partialChars;
  return true;
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

function normalizeForChunkCompare(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[“”"']/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripChunkHeading(chunk: string, chapterIndex: number, chapterTitle: string): string {
  const titleNorm = normalizeForChunkCompare(chapterTitle);
  const lines = String(chunk || "").split("\n");
  while (lines.length) {
    const first = lines[0].trim();
    const firstNorm = normalizeForChunkCompare(first);
    const looksLikeHeading = /^#{1,3}\s+/.test(first)
      || /^chapter\s+\d+/i.test(first)
      || /^capitolo\s+\d+/i.test(first)
      || (titleNorm.length > 8 && firstNorm === titleNorm)
      || firstNorm === `chapter ${chapterIndex + 1}`
      || firstNorm === `capitolo ${chapterIndex + 1}`;
    if (!looksLikeHeading) break;
    lines.shift();
  }
  return lines.join("\n").trim();
}

function mergeChapterChunk(existingText: string, nextChunk: string, chapterIndex: number, chapterTitle: string): string {
  const existing = String(existingText || "").trim();
  let next = stripChunkHeading(nextChunk, chapterIndex, chapterTitle);
  if (!existing) return next.trim();
  if (!next.trim()) return existing;

  const existingNorm = normalizeForChunkCompare(existing);
  const nextNorm = normalizeForChunkCompare(next);
  if (nextNorm.length > 80 && existingNorm.includes(nextNorm)) return existing;

  const paragraphs = next.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  while (paragraphs.length) {
    const firstNorm = normalizeForChunkCompare(paragraphs[0]);
    if (firstNorm.length < 60 || !existingNorm.includes(firstNorm)) break;
    paragraphs.shift();
  }
  next = paragraphs.join("\n\n").trim();
  if (!next) return existing;

  const existingTail = normalizeForChunkCompare(existing.split(/[.!?]+/).filter(Boolean).slice(-1)[0] || "");
  const nextSentences = next.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (existingTail.length > 30 && nextSentences.length > 1 && normalizeForChunkCompare(nextSentences[0]).includes(existingTail.slice(0, 80))) {
    next = nextSentences.slice(1).join(" ").trim();
  }

  return next ? `${existing}\n\n${next}` : existing;
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

function priorTextFromChapters(chapters: Array<Pick<Chapter, "content">> = []): string {
  return chapters.map((chapter) => chapter.content || "").filter(Boolean).join("\n");
}

function applyFinalManuscriptGuardToText(
  text: string,
  context: {
    config: BookConfig;
    previousChapters?: Array<Pick<Chapter, "content">>;
    chapterIndex?: number;
    chapterTitle?: string;
    writingPlan?: ChapterWritingPlan;
  },
): string {
  const label = context.chapterIndex != null ? `Capitolo ${context.chapterIndex + 1}` : "Output";
  const result = applySafeManuscriptCleanup(
    text,
    (source) => {
      const cleaned = runManuscriptQualityV3(source, {
        language: context.config.language ?? "Italian",
        priorText: priorTextFromChapters(context.previousChapters),
        config: context.config,
        chapterIndex: context.chapterIndex,
      }).text;

      const integrity = sanitizeGeneratedChapterContent(cleaned, {
        language: context.config.language ?? "Italian",
        chapterTitle: context.chapterTitle,
        chapterNumber: context.chapterIndex,
        bookSetting: context.config.idea?.slice(0, 400) || context.config.subgenre,
        expectedSetting: context.config.subgenre || context.config.subcategory,
        genre: context.config.genre,
        chapterLength: context.config.chapterLength,
        writingPlan: context.writingPlan,
      });

      return finalManuscriptGuard(integrity.content, {
        language: context.config.language ?? "Italian",
      });
    },
    { label, minWords: 300 },
  );

  if (result.status === "failed") {
    throw new Error(result.blockingError || `${label}: output finale non valido dopo la pulizia del manoscritto.`);
  }

  if (result.warning) {
    writingQualityGateDevLog("[Scriptora] Safe manuscript cleanup fallback", {
      label,
      warning: result.warning,
      originalWords: countWords(text),
      returnedWords: countWords(result.content),
    });
  }

  return result.content;
}

function applyUltraHumanAndFinalGuardToText(
  text: string,
  context: { config: BookConfig; previousChapters?: Array<Pick<Chapter, "content">>; chapterIndex?: number },
): string {
  const priorText = priorTextFromChapters(context.previousChapters);
  const ultraPass = runUltraHumanFinalPass(text, {
    language: context.config.language ?? "Italian",
    priorText,
    config: context.config,
    chapterIndex: context.chapterIndex,
  });
  return applyFinalManuscriptGuardToText(ultraPass.text, context);
}

function normalizeBlueprint(raw: unknown, config: BookConfig): BookBlueprint {
  return normalizeBlueprintShape(raw, config);
}

function normalizeFrontMatter(raw: unknown, config: BookConfig): FrontMatter {
  const source = raw && typeof raw === "object" ? raw as Partial<FrontMatter> : {};
  const identity = resolveAuthorIdentityForPublishing(config.authorIdentity);
  const penName = getAuthorPenName(config);
  const copyrightName = getAuthorCopyrightName(config);
  const year = new Date().getFullYear();
  const titlePageFallback = [config.title, config.subtitle, penName ? `di ${penName}` : ""].filter(Boolean).join("\n\n");
  const copyrightFallback = copyrightName
    ? `© ${year} ${copyrightName}. Tutti i diritti riservati.\nAutore / pen name: ${penName || copyrightName}.`
    : `© ${year}`;
  const aboutAuthorFallback = identity?.biography
    ? `${penName ? `${penName}. ` : ""}${identity.biography}`
    : AUTHOR_IDENTITY_MISSING_COPY;
  const result: FrontMatter = {
    titlePage: stringifyField(source.titlePage).trim() || titlePageFallback,
    copyright: stringifyField(source.copyright).trim() || copyrightFallback,
    dedication: stringifyField(source.dedication).trim(),
    aboutAuthor: stringifyField(source.aboutAuthor).trim() || aboutAuthorFallback,
    howToUse: stringifyField(source.howToUse).trim(),
    letterToReader: stringifyField(source.letterToReader).trim() || (typeof raw === "string" ? raw : ""),
  };

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
  const identity = config ? resolveAuthorIdentityForPublishing(config.authorIdentity) : null;
  const penName = config ? getAuthorPenName(config) : "";
  const authorNoteFallback = identity?.authorNote
    || (identity?.biography ? `${penName ? `${penName}. ` : ""}${identity.biography}` : AUTHOR_IDENTITY_MISSING_COPY);
  return {
    conclusion: stringifyField(source.conclusion).trim() || (typeof raw === "string" ? raw : ""),
    authorNote: stringifyField(source.authorNote).trim() || authorNoteFallback,
    callToAction: stringifyField(source.callToAction).trim(),
    reviewRequest: stringifyField(source.reviewRequest).trim(),
    otherBooks: stringifyField(source.otherBooks).trim(),
  };
}

/* ============ Chunked Chapter Generation ============ */

export async function generateChapterChunked(
  config: BookConfig,
  blueprint: BookBlueprint,
  chapterIndex: number,
  previousChapters: Chapter[],
  chapterLengthOverride?: string,
  onChunkProgress?: (progress: ChunkProgress) => void,
  genreLock?: GenreLock,
  opts?: {
    adaptive?: { plan: import("@/lib/plan").PlanTier };
    usage?: AIUsageContext;
    longBookMemory?: import("@/lib/long-book-memory/types").LongBookMemorySnapshot;
    writerIntelBlock?: string;
    memoryGraph?: import("@/lib/memory-graph/types").MemoryGraphSnapshot;
  },
): Promise<Chapter> {
  config = withSanitizedConfig(config);
  resetWriterRetryCount();
  const runtimeProject: BookProject = {
    id: opts?.usage?.projectId || "runtime",
    config,
    blueprint,
    chapters: previousChapters,
    frontMatter: null,
    backMatter: null,
    phase: "chapters",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    longBookMemory: opts?.longBookMemory,
  };
  assertProjectReadyForGeneration(runtimeProject, chapterIndex);

  const rawOutline = blueprint.chapterOutlines[chapterIndex] || {
    title: "",
    summary: `Develop chapter ${chapterIndex + 1} of "${config.title}".`,
  };
  const safeSummary = sanitizeEditorialSummary(rawOutline.summary, chapterIndex, config.language);
  const outline = {
    ...rawOutline,
    summary: safeSummary,
    title: resolveChapterTitle(rawOutline.title, chapterIndex, {
      config,
      summary: safeSummary,
      totalChapters: config.numberOfChapters,
    }),
  };
  const targetWords = getChapterTargetWords(config, chapterIndex, config.numberOfChapters, chapterLengthOverride);
  const longBookMemory = opts?.longBookMemory ?? runtimeProject.longBookMemory;
  const intelligenceBlock = opts?.writerIntelBlock?.trim() || "";
  const writerMemorySource = buildWriterMemorySource({
    config,
    previousChapters,
    chapterIndex,
    blueprint,
    longBookMemory,
    intelligenceBlock,
  });
  const contextMemory = buildContextMemory(config, blueprint, previousChapters, chapterIndex, {
    skipLongBookMemory: Boolean(writerMemorySource.trim()),
  });
  const canonBrainV3Block = buildCanonBrainV3PromptBlock(runtimeProject);
  const systemBase = getSystemPrompt(config, genreLock);
  const scriptoraWritingBrain = buildScriptoraWritingBrain(config);
  const characterLock = buildCharacterLock(config);
  const forgeWriterBlock = intelligenceBlock ? "" : buildForgeWriterContextBlock(config);
  const continuationCanonBlock = buildContinuationCanonBlock({
    writerMemorySource,
    characterLock,
    narrativeContinuity: extractCompactNarrativeContinuity(contextMemory),
  });
  const priorText = previousChapters.map((c) => c.content).join("\n");
  const humanNarrativeRealismV4 = buildHumanNarrativeRealismV4Block(config, chapterIndex);
  const humanBestsellerModeV11 = buildHumanBestsellerModeV11Block(config, { chapterIndex, mode: "generation" });
  const humanBestsellerModeV12 = buildHumanBestsellerModeV12Block(config, {
    chapterIndex,
    mode: "generation",
    previousChapters,
  });
  const scriptoraOmegaDirective = buildScriptoraOmegaDirective(config, { chapterIndex, mode: "generation" });
  const universalWritingQualityRules = buildUniversalWritingQualityRulesBlock(config.language);
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
  const bookTypeEngineBlock = buildBookTypeEngineBlock(config);
  const chapterWritingPlan = buildChapterWritingPlan(config, blueprint, chapterIndex, previousChapters);
  const chapterDirectorBlock = buildChapterWritingPlanPromptBlock(chapterWritingPlan);

  let accumulatedContent = "";
  let chapterTitle = outline.title;
  let chunkIndex = 0;
  let consecutiveFailures = 0;
  let lastChunkError: string | null = null;
  const maxChunks = Math.ceil(targetWords / 600) + 5; // generous safety cap for adaptive sizing

  if (DEV_DEBUG_STREAM) console.log(`[Scriptora] Adaptive chunked generation: target=${targetWords} words, maxChunks=${maxChunks}`);

  while (chunkIndex < maxChunks) {
    const currentWords = countWords(accumulatedContent);
    const phase = getChunkPhase(currentWords, targetWords);
    const phaseInstruction = getPhaseInstruction(phase);
    const remainingWords = targetWords - currentWords;

    // Stop if past target
    if (currentWords >= targetWords * 1.1) {
      if (DEV_DEBUG_STREAM) console.log(`[Scriptora] Target exceeded (${currentWords}/${targetWords}), stopping`);
      break;
    }

    // Stop if CLOSURE was already written
    if (phase === "CLOSURE" && currentWords >= targetWords * 0.9 && chunkIndex > 1) {
      if (DEV_DEBUG_STREAM) console.log(`[Scriptora] Closure already written, stopping`);
      break;
    }

    // Adaptive chunk size selection
    // Il primo blocco deve essere ultra-leggero: serve ad accendere subito il manoscritto live.
    // Se parte come LARGE, la UI resta muta troppo a lungo prima del primo onChunkProgress.
    const chunkSize = chunkIndex === 0 ? "MICRO" : selectChunkSize(consecutiveFailures);
    const sizeConfig = CHUNK_SIZES[chunkSize];

    let chunkTarget = phase === "CLOSURE"
      ? Math.min(remainingWords + 100, sizeConfig.max)
      : Math.min(Math.max(sizeConfig.min, remainingWords), sizeConfig.max);

    // Primo chunk: scintilla narrativa breve, non blocco completo.
    if (chunkIndex === 0) {
      chunkTarget = Math.min(chunkTarget, 160);
    }

    if (DEV_DEBUG_STREAM) console.log(`[Scriptora] Chunk ${chunkIndex + 1}: size=${chunkSize} (${sizeConfig.label}), failures=${consecutiveFailures}`);

    const isFirstChunk = chunkIndex === 0;
    const lastTextSegment = accumulatedContent.slice(-1200);
    const adaptiveSuffix = getAdaptivePromptSuffix(chunkSize);
    const chunkPremiumBlock = buildPremiumWritingBlock({
      config,
      previousChapters,
      chapterIndex,
      outlineSummary: outline.summary,
      blueprint,
      longBookMemory,
      writerMemorySource: isFirstChunk ? writerMemorySource : "",
      storyConstitution: {
        memoryGraph: opts?.memoryGraph ?? null,
        priorText,
      },
    });

    const chunkPrompt = isFirstChunk
      ? `Write the OPENING of Chapter ${chapterIndex + 1} of "${config.title}".
Chapter title: "${outline.title}"
Chapter plan: ${outline.summary}
Genre: ${config.genre}
Language: ${config.language} — WRITE ENTIRELY IN ${config.language}

${genreDirective}

${contextMemory}

${canonBrainV3Block}

TARGET: Write approximately ${chunkTarget} words for this segment.
TOTAL CHAPTER TARGET: ${targetWords} words (you will write more chunks after this).
PHASE: ${phase} — ${phaseInstruction}

${scriptoraWritingBrain}

${characterLock}

${forgeWriterBlock ? `${forgeWriterBlock}\n` : ""}

${humanNarrativeRealismV4}

${humanBestsellerModeV11}

${humanBestsellerModeV12}

${buildEditorialNovelModeBlock(config)}

${scriptoraOmegaDirective}

${humanizerBlock}

${chapterDirectorBlock}

${chunkPremiumBlock}

${bookTypeEngineBlock}

BESTSELLER QUALITY REQUIREMENTS:
- Open with a line that stops the reader — a hook they'll remember
- Use only restrained highlight-worthy moments; do not stack quotable lines
- Write like a human bestselling author, not like a polished AI sample
- Use varied sentence rhythm
- HONOR the GENRE DIRECTIVE above — chapter style and content rules are MANDATORY

${universalWritingQualityRules}

${buildMaximumEditorialQualityPromptBlock(config, { contentKind: "chapter", language: config.language })}

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

${continuationCanonBlock ? `${continuationCanonBlock}\n\n` : ""}

${canonBrainV3Block}

${humanizerBlock}

${chapterDirectorBlock}

${humanNarrativeRealismV4}

${humanBestsellerModeV11}

${humanBestsellerModeV12}

${buildEditorialNovelModeBlock(config)}

${scriptoraOmegaDirective}

${chunkPremiumBlock}

${bookTypeEngineBlock}

TARGET for this chunk: Write approximately ${chunkTarget} words.

CRITICAL RULES:
- Continue EXACTLY from where the previous text ended
- DO NOT restart, summarize, or repeat what was already written
- DO NOT repeat ideas, metaphors, or phrases from previous text
- Maintain narrative coherence and emotional continuity
- HONOR the GENRE DIRECTIVE — same chapter style throughout the book
- Increase depth and quality with each chunk

${universalWritingQualityRules}

${buildMaximumEditorialQualityPromptBlock(config, { contentKind: "chapter", language: config.language })}
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

    const chunkUsage = withUsage(opts?.usage, {
      taskType: "generate_chapter_chunk",
      metadata: {
        chapterIndex: chapterIndex + 1,
        chunkIndex: chunkIndex + 1,
        phase,
        chunkSize,
      },
    });
    let chunkText: string | null = null;
    const createChunkPartialReporter = () => {
      const throttle = createChapterPartialProgressThrottleState();

      return (_delta: string, partialAccumulated: string) => {
        const partialChars = partialAccumulated.length;
        const now = Date.now();
        const preview = buildChapterLivePreview(accumulatedContent, partialAccumulated);
        if (!preview.trim()) return;
        if (!shouldEmitChapterPartialProgress(throttle, partialChars, now)) return;

        onChunkProgress?.({
          chunkIndex,
          totalChunks: Math.max(1, Math.ceil(targetWords / 1400)),
          currentWords: countWords(preview),
          targetWords,
          phase,
          content: preview,
          chunkSize,
          statusMessage: "Scrittura live del capitolo...",
        });
      };
    };

    try {
      chunkText = await withRetry(
        () => callAIOnce(
          systemPrompt,
          chunkPrompt,
          sizeConfig.timeout,
          chunkUsage,
          createChunkPartialReporter(),
        ),
        {
          maxAttempts: 2,
          baseDelayMs: 1500,
          maxDelayMs: 6000,
          serviceKey: "deepseek-chunk",
          shouldRetry: (err) => !(err instanceof AICreditsError),
        },
      );
      consecutiveFailures = 0; // Reset on success
      lastChunkError = null;
    } catch (e: any) {
      consecutiveFailures++;
      lastChunkError = e?.message || String(e);
      console.error(`[Scriptora] Chunk ${chunkIndex + 1} failed (failures=${consecutiveFailures}):`, lastChunkError);

      // Credit/auth errors = bail immediately
      if (e instanceof AICreditsError) throw e;

      // After 6 consecutive failures, try emergency fallback or stop gracefully
      if (consecutiveFailures > 6) {
        if (chunkIndex === 0) {
          // Last-resort fallback for first chunk: smaller/simpler prompt
          console.warn(`[Scriptora] Emergency fallback for first chunk`);
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
            lastChunkError = null;
          } catch (fallbackErr: any) {
            const reason = fallbackErr?.message || lastChunkError || "errore sconosciuto";
            throw new Error(`Generazione non riuscita dopo vari tentativi: ${reason}`);
          }
        } else {
          console.warn(`[Scriptora] Stopping with ${countWords(accumulatedContent)} words after ${consecutiveFailures} failures`);
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

    const validateChunkForMerge = (candidateText: string): { reject: boolean; reason?: string } => {
      const v2Check = validateCanonChunkBeforeMerge(candidateText, {
        config,
        chapterIndex,
        previousChapters,
        accumulatedContent,
      });
      const v3Project: BookProject = {
        ...runtimeProject,
        chapters: [
          ...previousChapters,
          ...(accumulatedContent.trim()
            ? [{ title: chapterTitle, content: accumulatedContent, subchapters: [] }]
            : []),
        ],
      };
      const v3Check = validateCanonBrainV3ChunkBeforeMerge(v3Project, candidateText);
      const reasons = [
        v2Check.reject ? `Canon Lock V2: ${v2Check.reason || "canon_drift"}` : "",
        !v3Check.passed ? `Canon Brain V3: ${v3Check.reason || "project_isolation"}` : "",
      ].filter(Boolean);
      return {
        reject: reasons.length > 0,
        reason: reasons.join(" | "),
      };
    };

    let canonChunkCheck = validateChunkForMerge(chunkText);
    if (canonChunkCheck.reject) {
      console.warn(`[Scriptora] Chunk ${chunkIndex + 1} canon drift (${canonChunkCheck.reason}) — regenerating`);
      onChunkProgress?.({
        chunkIndex,
        totalChunks: Math.max(1, Math.ceil(targetWords / 1400)),
        currentWords: countWords(accumulatedContent),
        targetWords,
        phase,
        content: accumulatedContent,
        chunkSize,
        statusMessage: "Canon Brain sta rigenerando un blocco non coerente...",
      });

      for (let canonAttempt = 1; canonAttempt <= 2 && canonChunkCheck.reject; canonAttempt++) {
        try {
          chunkText = await callAI(
            `${systemPrompt} CRITICAL CANON BRAIN V3 ENFORCEMENT: the previous output was rejected before merge. Use ONLY the active project's canon, character locks, places, objects, timeline and relationship state.`,
            `${chunkPrompt}

CANON BRAIN V3 ENFORCEMENT RETRY ${canonAttempt}/2:
The previous chunk was BLOCKED before merge.
Reason: ${canonChunkCheck.reason}

Rewrite ONLY this chunk.
Do not import new named characters, locations, timelines, objects or relationships unless they are present in the active blueprint/canon above.
Do not summarize. Do not apologize. Return only clean chapter prose.`,
            withUsage(opts?.usage, {
              taskType: "generate_chapter_canon_fix",
              metadata: {
                chapterIndex: chapterIndex + 1,
                chunkIndex: chunkIndex + 1,
                canonAttempt,
                reason: canonChunkCheck.reason,
              },
            }),
          );
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
          canonChunkCheck = validateChunkForMerge(chunkText);
        } catch (canonError: any) {
          canonChunkCheck = {
            reject: true,
            reason: canonError?.message || canonChunkCheck.reason || "canon_fix_failed",
          };
        }
      }

      if (canonChunkCheck.reject) {
        const reason = canonChunkCheck.reason || "canon_drift";
        lastChunkError = `Canon Brain V3 ha bloccato il chunk ${chunkIndex + 1}: ${reason}`;
        throw new Error(lastChunkError);
      }
    }

    // Anti-repetition check
    if (!isFirstChunk && accumulatedContent.length > 0) {
      const overlap = checkOverlap(accumulatedContent, chunkText);
      if (overlap > 0.12) {
        console.warn(`[Scriptora] Chunk ${chunkIndex + 1} has ${(overlap * 100).toFixed(0)}% overlap — regenerating`);
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

    accumulatedContent = mergeChapterChunk(accumulatedContent, chunkText, chapterIndex, chapterTitle);
    chunkIndex++;

    const updatedWords = countWords(accumulatedContent);
    if (DEV_DEBUG_STREAM) console.log(`[Scriptora] Chunk ${chunkIndex} complete: ${updatedWords}/${targetWords} words, phase=${phase}, size=${chunkSize}`);

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

    // Stop conditions
    if (phase === "CLOSURE" && updatedWords >= targetWords * 0.85) {
      if (DEV_DEBUG_STREAM) console.log(`[Scriptora] Closure phase complete at ${updatedWords} words`);
      break;
    }
    if (updatedWords >= targetWords * 1.05) {
      if (DEV_DEBUG_STREAM) console.log(`[Scriptora] Target reached at ${updatedWords} words`);
      break;
    }
  }

  if (DEV_DEBUG_STREAM) console.log(`[Scriptora] Chapter ${chapterIndex + 1} complete: ${countWords(accumulatedContent)} words in ${chunkIndex} chunks`);

  if (!accumulatedContent.trim()) {
    const reason = lastChunkError || "nessun testo restituito dal modello";
    throw new Error(`Capitolo ${chapterIndex + 1}: generazione non riuscita (${reason}).`);
  }

  // Editorial QA gate (non-blocking — surfaces in console + Mastery diagnostic)
  let qaScore: number | undefined;
  try {
    const report = validateEditorial(accumulatedContent);
    qaScore = report.score;
    if (DEV_DEBUG_STREAM) {
      console.log(
        `[Scriptora] Editorial QA — Ch${chapterIndex + 1}: score ${report.score}/10` +
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
      console.warn("[Scriptora] Adaptive rewrite skipped:", e);
    }
  }

  const ultraPass = runUltraHumanFinalPass(accumulatedContent, {
    language: config.language ?? "Italian",
    priorText,
    config,
    chapterIndex,
  });
  accumulatedContent = runManuscriptQualityV3(ultraPass.text, {
    language: config.language ?? "Italian",
    priorText,
    config,
    chapterIndex,
  }).text;

  const supremePass = runEditorialPassSupreme(accumulatedContent, {
    config,
    blueprint,
    previousChapters,
    chapterIndex,
    outlineSummary: outline.summary,
    memoryGraph: opts?.memoryGraph ?? null,
    priorText,
  });
  accumulatedContent = supremePass.text;
  const constitutionRetry = buildStoryConstitutionRetryInstruction(supremePass.analysis);

  if (!ultraPass.quality.passed && ultraPass.quality.composite < 58 && (ultraPass.retryInstruction || constitutionRetry)) {
    if (getWriterRetryCount() < MAX_QUALITY_REPAIR_ATTEMPTS) {
      try {
        incrementWriterRetryCount();
        const retryText = await callAIReduced(
        getSystemPrompt(config, genreLock) + " Surgical quality retry — preserve author voice and genre. Fix only the listed issues.",
        `Improve this chapter text surgically. Scores: repetition=${ultraPass.quality.emotionalRepetition}, dialogue=${ultraPass.quality.dialogueHumanity}, progression=${ultraPass.quality.sceneProgression}.\n${ultraPass.retryInstruction}\n${constitutionRetry}\n\nTEXT (last segment):\n${accumulatedContent.slice(-4000)}`,
        withUsage(opts?.usage, {
          taskType: "generate_chapter_quality_retry",
          metadata: {
            chapterIndex: chapterIndex + 1,
            qualityComposite: ultraPass.quality.composite,
            issues: ultraPass.quality.issues,
            noExtraCharge: true,
          },
        }),
      );
      if (retryText?.trim()) {
        const retryUltra = runUltraHumanFinalPass(retryText, {
          language: config.language ?? "Italian",
          priorText,
          config,
          chapterIndex,
        });
        accumulatedContent = runManuscriptQualityV3(retryUltra.text, {
          language: config.language ?? "Italian",
          priorText,
          config,
          chapterIndex,
        }).text;
        accumulatedContent = runEditorialPassSupreme(accumulatedContent, {
          config,
          blueprint,
          previousChapters,
          chapterIndex,
          outlineSummary: outline.summary,
          memoryGraph: opts?.memoryGraph ?? null,
          priorText,
        }).text;
      }
      } catch {
        accumulatedContent = applyMemorabilityLocalPatch(
          accumulatedContent,
          evaluateMemorability(accumulatedContent, {
            language: config.language,
            genre: config.genre,
            bookTitle: config.title,
            chapterIndex,
            config,
          }).localPatchHints,
          config.language,
        );
      }
    } else {
      accumulatedContent = applyMemorabilityLocalPatch(
        accumulatedContent,
        evaluateMemorability(accumulatedContent, {
          language: config.language,
          genre: config.genre,
          bookTitle: config.title,
          chapterIndex,
          config,
        }).localPatchHints,
        config.language,
      );
      recordWriterPerformanceMetric({
        chapterIndex,
        retryCount: getWriterRetryCount(),
        repairType: "local",
      });
    }
  }

  const memorabilityPass = runMemorabilityPreHumanPass(accumulatedContent, {
    language: config.language,
    genre: config.genre,
    bookTitle: config.title,
    chapterIndex,
    config,
  });
  accumulatedContent = memorabilityPass.text;
  if (memorabilityPass.appliedLocalPatch) {
    recordWriterPerformanceMetric({
      chapterIndex,
      retryCount: getWriterRetryCount(),
      repairType: "local",
      memorabilityBefore: evaluateMemorability(memorabilityPass.text, { language: config.language, genre: config.genre }).scores.memorability,
      memorabilityAfter: memorabilityPass.report.scores.memorability,
    });
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
  const qualityCheckedContent = await repairChapterWritingQualityIfNeeded(finalChapter.content, {
    config,
    genreLock,
    usage: opts?.usage,
    chapterIndex,
    chapterTitle: finalChapter.title,
  });
  const purityCheckedContent = await enforceChapterFormatPurityBeforeSave(qualityCheckedContent, {
    config,
    blueprint,
    genreLock,
    usage: opts?.usage,
    chapterIndex,
    chapterTitle: finalChapter.title,
    skipFormatAiRepair: shouldSkipNarrativeQualityRepair(config),
  });

  const guardedContent = applyFinalManuscriptGuardToText(purityCheckedContent, {
    config,
    previousChapters,
    chapterIndex,
    chapterTitle: finalChapter.title,
    writingPlan: chapterWritingPlan,
  });
  const finishedContent = await applyChapterEditorialFinishingPasses(guardedContent, {
    config,
    genreLock,
    usage: opts?.usage,
    chapterIndex,
    chapterTitle: finalChapter.title,
    outlineSummary: outline.summary,
    onChunkProgress,
  });

  return {
    ...finalChapter,
    content: finishedContent,
  };
}

/* ============ Blueprint ============ */

export interface BlueprintGenerationResult {
  blueprint: BookBlueprint;
  source: BlueprintSource;
}

export async function generateBlueprint(config: BookConfig, genreLock?: GenreLock, usage?: AIUsageContext): Promise<BlueprintGenerationResult> {
  config = withSanitizedConfig(config);
  const bookInfo = BOOK_LENGTH_CONFIG[config.bookLength];
  const totalWords = getBookTotalWords(config);
  const subchapterCount = getSubchaptersPerChapter(config);
  const editorialBP = resolveLockedBlueprint(config, genreLock);
  const structureScaffold = editorialBP.structure.length
    ? `\nGENRE STRUCTURE SCAFFOLD${genreLock ? " (LOCKED)" : ""} (use as backbone, expand into ${config.numberOfChapters} chapters):\n${editorialBP.structure.map((s, i) => `${i + 1}. ${s}`).join("\n")}\nMap and expand this scaffold across the ${config.numberOfChapters} chapters — fold/split sections so EVERY chapter advances the editorial structure above.`
    : "";

  const ideaSeed = String((config as BookConfig & { idea?: string }).idea || "").trim();
  const entityBlock = buildBlueprintEntityPromptBlock(ideaSeed);

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

${buildBookTypeEngineBlock(config)}

${buildBlueprintIntegrityBlueprintRequest(config)}

${entityBlock}

CRITICAL — BESTSELLER QUALITY TITLES:
- Chapter titles must be EMOTIONALLY COMPELLING — the kind that make readers flip to that page
- Titles should be evocative, intriguing, or provocative — NOT generic or descriptive
- NEVER use bare titles like "Chapter 1", "Chapter 2", "Capitolo 1", "Capitolo 2"
- Every chapter must have a real specific title; the app will display it as "${formatChapterDisplayTitle(0, "Real specific title", { config })}"
- Think bestseller table of contents that sells the book on its own

BLUEPRINT EDITORIAL QUALITY — MANDATORY:
- NEVER repeat the same chapter title or subchapter beat title across the book.
- Emotional arc must move FORWARD — no backward arc labels without explicit flashback chapter.
- For romance/literary fiction: NO philosophy beats (ontological paradox, existential implication, etc.).
- When the idea is entity-rich, every chapter must anchor to concrete story elements — no generic template beats.

Return a JSON object with:
- overview: A 2-3 paragraph overview of the book's thesis and emotional journey (in ${config.language})
- chapterOutlines: Array of {title, summary${subchapterCount > 0 ? `, subchapters: exactly ${subchapterCount} items [{title, summary}]` : ''}} (in ${config.language})
- themes: Array of core themes (in ${config.language})
- emotionalArc: Description of the emotional progression (in ${config.language})

  Return ONLY valid JSON. No markdown fences. No commentary before or after the JSON object.`;

  const systemBase = getSystemPrompt(config, genreLock)
    + " You are creating a book architecture optimized for the genre profile above. Output MUST be a single JSON object only.";

  const attempt = async (userPrompt: string) => callBlueprintFast(
    systemBase,
    userPrompt,
    withUsage(usage, { taskType: "generate_blueprint" }),
  );

  const finalizeBlueprint = async (
    blueprint: BookBlueprint,
    source: BlueprintSource,
  ): Promise<BlueprintGenerationResult> =>
    enforceBlueprintFormatCoherence(config, enrichBlueprintFromIdeaSeed(blueprint, config, ideaSeed), source, async () => {
      try {
        const report = validateFormatCoherence(config, blueprint);
        const corrective = buildFormatCoherenceCorrectivePrompt(config, report);
        const rawRepair = await attempt(`${prompt}\n\n${corrective}`);
        const repaired = resolveBlueprintFromAiResponse(rawRepair, config);
        return repaired.ok ? repaired.blueprint : null;
      } catch {
        return null;
      }
    });

  let rawPrimary = "";
  try {
    rawPrimary = await attempt(prompt);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "");
    if (/credit|402|wallet|unauthorized/i.test(message)) throw error;
    console.warn("Blueprint AI call failed before JSON response — using safe config fallback", {
      reason: message.slice(0, 180),
      title: config.title,
      genre: config.genre,
    });
    return finalizeBlueprint(buildFallbackBlueprintFromConfig(config), "config_fallback");
  }
  const primary = resolveBlueprintFromAiResponse(rawPrimary, config);

  if (primary.ok) {
    return finalizeBlueprint(primary.blueprint, primary.source);
  }

  const corrective = buildBlueprintCorrectivePrompt(config, primary.errors);
  const rawRetry = await attempt(`${prompt}\n\n${corrective}`);
  const retry = resolveBlueprintFromAiResponse(rawRetry, config);
  if (retry.ok) {
    return finalizeBlueprint(retry.blueprint, retry.source);
  }

  console.error("========== BLUEPRINT FAILURE ==========");
  console.error("PRIMARY ERRORS:", primary.errors);
  console.error("RETRY ERRORS:", retry.errors);
  console.error("RAW PRIMARY PREVIEW:", rawPrimary?.slice(0, 4000));
  console.error("RAW RETRY PREVIEW:", rawRetry?.slice(0, 4000));
  console.error("CONFIG:", {
    title: config.title,
    genre: config.genre,
    language: config.language,
    numberOfChapters: config.numberOfChapters,
    subchapters: getSubchaptersPerChapter(config),
  });
  console.error("======================================");

  console.warn("Blueprint AI invalid after retry — using safe config fallback", {
    primaryErrors: primary.errors,
    retryErrors: retry.errors,
  });

  return finalizeBlueprint(buildFallbackBlueprintFromConfig(config), "config_fallback");
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
  config = withSanitizedConfig(config);
  const bp = resolveLockedBlueprint(config, genreLock);
  const genreKey = resolveGenreKey(config.genre, (config as any).subcategory, (config as any).bookFormat);
  const matterOpts = resolveMatterOptions(config);
  const sectionsList = filterFrontMatterTemplateSections(
    bp.frontMatterTemplate.length
      ? bp.frontMatterTemplate
      : ["Pagina titolo", "Copyright", "Dedica", "Nota sull’autore", "Come usare questo libro", "Lettera al lettore"],
    matterOpts,
  );

  const prompt = `Generate FRONT MATTER for a ${genreKey.toUpperCase()} book — sections must read as if written by a domain expert in this genre.

${matterOptionsPromptNote(config)}

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
- Do NOT repeat the book synopsis/overview verbatim in dedication, letter to reader, or about author.
- No backward time references (e.g. "tomorrow") unless the narrative timeline supports them.
- Forward momentum only — each section has a distinct editorial purpose.

${buildEditorialNovelModeBlock(config)}

${buildMaximumEditorialQualityPromptBlock(config, { contentKind: "front_matter", language: config.language })}

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
    const parsed = normalizeFrontMatter(JSON.parse(cleanJsonFence(result)), config);
    const polished = applyEditorialQualityToMatterFields(parsed, {
      config,
      language: config.language,
      genre: config.genre,
      contentKind: "front_matter",
      synopsis: blueprint.overview,
      overview: blueprint.overview,
    });
    const matterErrors = validateFrontBackMatterQuality(polished, {
      kind: "front",
      synopsis: blueprint.overview,
      overview: blueprint.overview,
      language: config.language,
    });
    if (matterErrors.length && import.meta.env.DEV) {
      console.warn("[Scriptora] Front matter quality issues", matterErrors.slice(0, 5));
    }
    return applyMatterOptionsToFrontMatter(polished, matterOpts);
  } catch {
    const fallback = normalizeFrontMatter({ titlePage: config.title, letterToReader: result }, config);
    return applyMatterOptionsToFrontMatter(
      applyEditorialQualityToMatterFields(fallback, {
        config,
        language: config.language,
        genre: config.genre,
        contentKind: "front_matter",
        synopsis: blueprint.overview,
      }),
      matterOpts,
    );
  }
}

/* ============ Chapter (legacy single-call, kept for subchapters) ============ */

export async function generateChapter(
  config: BookConfig, blueprint: BookBlueprint, chapterIndex: number,
  previousChapters: Chapter[], chapterLengthOverride?: string,
  genreLock?: GenreLock,
  usage?: AIUsageContext,
): Promise<Chapter> {
  // Delegate to chunked generation
  return generateChapterChunked(config, blueprint, chapterIndex, previousChapters, chapterLengthOverride, undefined, genreLock, { usage });
}

/* ============ Subchapter ============ */

export async function generateSubchapter(
  config: BookConfig, blueprint: BookBlueprint, chapterIndex: number,
  subchapterIndex: number, chapter: Chapter, previousChapters: Chapter[],
  genreLock?: GenreLock,
  usage?: AIUsageContext,
  opts?: { repairPrompt?: string },
): Promise<{ title: string; content: string }> {
  config = withSanitizedConfig(config);
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
  const existingSubs = safeSubchapters(chapter)
    .map((s, i) => `Subchapter ${i + 1} "${s.title}": ${s.content.substring(0, 200)}...`)
    .join("\n");

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
  const premiumWritingBlock = buildPremiumWritingBlock({
    config,
    previousChapters,
    chapterIndex,
    outlineSummary: subOutline?.summary || outline.summary,
  });
  const scriptoraOmegaDirective = buildScriptoraOmegaDirective(config, { chapterIndex, mode: "subchapter" });
  const editorialNovelMode = buildEditorialNovelModeBlock(config);
  const subchapterContext = buildSubchapterContextBlock(safeSubchapters(chapter));

  const prompt = `Write Subchapter ${subchapterIndex + 1} of ${subchapterCount} for Chapter ${chapterIndex + 1} "${chapter.title}" in "${config.title}".
${subOutline ? `Subchapter plan: "${subOutline.title}" — ${subOutline.summary}${subOutline.purpose ? ` (Purpose: ${subOutline.purpose})` : ""}` : `Write the ${subchapterIndex + 1}th subchapter.`}
Genre: ${config.genre}
Language: ${config.language} — WRITE ENTIRELY IN ${config.language}
Write approximately ${subMin}–${subMax} words.

${genreDirective}

${subchapterContext ? `${subchapterContext}\n` : ""}
${opts?.repairPrompt ? `${opts.repairPrompt}\n` : ""}
Parent chapter context: ${chapter.content.substring(0, 500) || outline.summary}...
${existingSubs ? `Already written subchapters (do NOT repeat):\n${existingSubs}` : ""}
${contextMemory}

${buildBlueprintIntegrityRuntimeBlock(config, blueprint, { chapterIndex, subchapterIndex, compact: true })}

${humanizerBlock}

${premiumWritingBlock}

${editorialNovelMode}

${scriptoraOmegaDirective}

${buildMaximumEditorialQualityPromptBlock(config, { contentKind: "subchapter", language: config.language })}

SUBCHAPTER STRUCTURE — MANDATORY:
- Opening: enter the scene or emotional beat without recap.
- Development: advance one concrete narrative unit only.
- Mini-climax: a turn, revelation or pressure spike inside this subchapter.
- Closure: land a specific consequence that hands context to the next subchapter.

SUBCHAPTER CONTINUITY — ABSOLUTE:
- Inizia esattamente dove termina il sottocapitolo precedente. Non ripetere eventi già accaduti.
- I sottocapitoli NON sono storie indipendenti: sono UNA sequenza narrativa continua.
- Vietato: telefonate/incontri/decisioni duplicate, salti temporali all'indietro, riaprire conflitti già risolti.
- Ogni scena deve produrre una conseguenza per la scena successiva.

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
    const rawContent = humanizeNarrativeText(stringifyField(parsed?.content).trim() || result, {
      config,
      previousChapters,
      chapterIndex,
      outlineSummary: subOutline?.summary || outline.summary,
    });
    const title = resolveSubchapterTitle(stringifyField(parsed?.title).trim() || subOutline?.title, subchapterIndex, outline.title, {
      config,
      summary: subOutline?.summary || outline.summary,
      content: rawContent,
      totalChapters: config.numberOfChapters,
    });
    const guarded = applyUltraHumanAndFinalGuardToText(rawContent, { config, previousChapters, chapterIndex });
    const pipelined = runEditorialQualityPipeline(guarded, {
      config,
      language: config.language,
      genre: config.genre,
      chapterTitle: outline.title,
      contentKind: "subchapter",
    }).text;
    return {
      title,
      content: applyCleanTextPass(pipelined, config.language),
    };
  } catch {
    const rawContent = humanizeNarrativeText(result, {
      config,
      previousChapters,
      chapterIndex,
      outlineSummary: subOutline?.summary || outline.summary,
    });
    const title = resolveSubchapterTitle(subOutline?.title, subchapterIndex, outline.title, {
      config,
      summary: subOutline?.summary || outline.summary,
      content: rawContent,
      totalChapters: config.numberOfChapters,
    });
    const guarded = applyUltraHumanAndFinalGuardToText(rawContent, { config, previousChapters, chapterIndex });
    const pipelined = runEditorialQualityPipeline(guarded, {
      config,
      language: config.language,
      genre: config.genre,
      chapterTitle: outline.title,
      contentKind: "subchapter",
    }).text;
    return {
      title,
      content: applyCleanTextPass(pipelined, config.language),
    };
  }
}

export async function generateChapterViaSubchapterPipeline(
  config: BookConfig,
  blueprint: BookBlueprint,
  chapterIndex: number,
  previousChapters: Chapter[],
  chapterLengthOverride?: string,
  onChunkProgress?: (progress: ChunkProgress) => void,
  genreLock?: GenreLock,
  opts?: {
    adaptive?: { plan: import("@/lib/plan").PlanTier };
    usage?: AIUsageContext;
    longBookMemory?: import("@/lib/long-book-memory/types").LongBookMemorySnapshot;
    writerIntelBlock?: string;
    memoryGraph?: import("@/lib/memory-graph/types").MemoryGraphSnapshot;
  },
): Promise<Chapter> {
  config = withSanitizedConfig(config);
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
    subchapters: ensureNarrativeSubchapterOutlines(
      Array.isArray(rawOutline.subchapters) ? rawOutline.subchapters : [],
      rawOutline.summary,
      getSubchaptersPerChapter(config),
      config,
    ),
  };

  let chapterShell: Chapter = {
    title: outline.title,
    content: "",
    subchapters: [],
  };

  const subchapterCount = outline.subchapters?.length || getSubchaptersPerChapter(config);
  for (let subIndex = 0; subIndex < subchapterCount; subIndex += 1) {
    onChunkProgress?.({
      chunkIndex: subIndex,
      totalChunks: subchapterCount,
      currentWords: countWords(assembleChapterFromSubchapters(chapterShell.subchapters || [])),
      targetWords: getChapterTargetWords(config, chapterIndex, config.numberOfChapters, chapterLengthOverride),
      phase: subIndex === subchapterCount - 1 ? "CLOSURE" : "DEVELOPMENT",
      content: assembleChapterFromSubchapters(chapterShell.subchapters || []),
      subchapters: safeSubchapters(chapterShell),
      statusMessage: `Scrittura sottocapitolo ${subIndex + 1}/${subchapterCount}...`,
    });

    const sub = await generateSubchapter(
      config,
      {
        ...blueprint,
        chapterOutlines: blueprint.chapterOutlines.map((item, idx) =>
          idx === chapterIndex ? outline : item,
        ),
      },
      chapterIndex,
      subIndex,
      chapterShell,
      previousChapters,
      genreLock,
      opts?.usage,
    );

    const validation = validateSubchapterNarrativeUnit(sub.content);
    if (!validation.valid && import.meta.env.DEV) {
      console.warn("[Scriptora] Subchapter narrative validation", { chapterIndex, subIndex, issues: validation.issues });
    }

    chapterShell = {
      ...chapterShell,
      subchapters: [...safeSubchapters(chapterShell), { title: sub.title, content: sub.content }],
    };
  }

  const continuityRepair = repairSubchapterContinuityIfNeeded(chapterShell, { language: config.language });
  if (continuityRepair.repaired) {
    chapterShell = continuityRepair.chapter;
    if (import.meta.env.DEV) {
      console.warn("[Scriptora] Subchapter continuity auto-repair", {
        chapterIndex,
        scoreBefore: continuityRepair.analysis.score,
        patch: continuityRepair.analysis.narrativePatch,
      });
    }
  }

  const assemblyRepair = await repairChapterContinuityAssembly(chapterShell, {
    language: config.language,
    maxRegenAttemptsPerSubchapter: 2,
    regenerateSubchapter: async (subIndex, ch, repairPrompt) =>
      generateSubchapter(
        config,
        {
          ...blueprint,
          chapterOutlines: blueprint.chapterOutlines.map((item, idx) =>
            idx === chapterIndex ? outline : item,
          ),
        },
        chapterIndex,
        subIndex,
        ch,
        previousChapters,
        genreLock,
        opts?.usage,
        { repairPrompt },
      ),
  });
  chapterShell = assemblyRepair.chapter;

  const pipelineChapter = runEditorialQualityPipelineOnChapter(chapterShell, {
    config,
    language: config.language,
    genre: config.genre,
    chapterTitle: outline.title,
    contentKind: "chapter",
    chapterIndex,
  });
  chapterShell = pipelineChapter.chapter;

  const continuityGate = runNarrativeContinuityGate(chapterShell, { language: config.language });
  if (!continuityGate.pass && import.meta.env.DEV) {
    console.warn("[Scriptora] Narrative continuity gate FAILED after repair", {
      chapterIndex,
      score: continuityGate.score,
      failures: continuityGate.criticalFailures.slice(0, 5),
      regenAttempts: assemblyRepair.regenAttempts,
    });
  } else {
    const continuityAudit = auditSubchapterContinuity(safeSubchapters(chapterShell), { language: config.language });
    const hasCritical = continuityAudit.errors.some((e) => e.severity === "critical");
    if ((continuityAudit.score < 70 || hasCritical) && import.meta.env.DEV) {
      console.warn("[Scriptora] Subchapter continuity issues", {
        chapterIndex,
        score: continuityAudit.score,
        errors: continuityAudit.errors.slice(0, 5),
      });
    }
  }

  const assembled = finalizeAssembledChapter(chapterShell);
  const finishedContent = await applyChapterEditorialFinishingPasses(assembled.content, {
    config,
    genreLock,
    usage: opts?.usage,
    chapterIndex,
    chapterTitle: outline.title,
    outlineSummary: outline.summary,
    onChunkProgress,
  });

  return {
    ...syncChapterContentWithSubchapters(
      { ...assembled, content: finishedContent },
      chapterIndex,
    ),
    title: outline.title,
  };
}

export { shouldUseRealSubchapterPipeline };

/* ============ Back Matter ============ */

export async function generateBackMatter(
  config: BookConfig,
  blueprint: BookBlueprint,
  chapters: Chapter[],
  genreLock?: GenreLock,
  usage?: AIUsageContext,
): Promise<BackMatter> {
  config = withSanitizedConfig(config);
  const bp = resolveLockedBlueprint(config, genreLock);
  const genreKey = resolveGenreKey(config.genre, (config as any).subcategory, (config as any).bookFormat);
  const chapterTitles = chapters.map((c, i) => formatChapterDisplayTitle(i, c.title, {
    config,
    summary: blueprint.chapterOutlines[i]?.summary,
    totalChapters: config.numberOfChapters,
  })).join("\n");
  const matterOpts = resolveMatterOptions(config);
  const sectionsList = filterBackMatterTemplateSections(
    bp.backMatterTemplate.length
      ? bp.backMatterTemplate
      : ["Conclusione", "Nota dell’autore", "Prossimo passo", "Richiesta recensione", "Letture consigliate"],
    matterOpts,
  );

  const prompt = `Generate BACK MATTER for a ${genreKey.toUpperCase()} book — read as if written by a domain expert.

${matterOptionsPromptNote(config)}

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
- Do NOT repeat the book synopsis/overview verbatim in conclusion or author note.
- No backward time contradictions — back matter closes the narrative arc forward.
- Each section must be distinct — no duplicate paragraphs across fields.

${buildEditorialNovelModeBlock(config)}

${buildMaximumEditorialQualityPromptBlock(config, { contentKind: "back_matter", language: config.language })}

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
    const parsed = normalizeBackMatter(JSON.parse(cleanJsonFence(result)), config);
    const polished = applyEditorialQualityToMatterFields(parsed, {
      config,
      language: config.language,
      genre: config.genre,
      contentKind: "back_matter",
      synopsis: blueprint.overview,
      overview: blueprint.overview,
    });
    const matterErrors = validateFrontBackMatterQuality(polished, {
      kind: "back",
      synopsis: blueprint.overview,
      overview: blueprint.overview,
      language: config.language,
    });
    if (matterErrors.length && import.meta.env.DEV) {
      console.warn("[Scriptora] Back matter quality issues", matterErrors.slice(0, 5));
    }
    return applyMatterOptionsToBackMatter(polished, matterOpts);
  } catch {
    const fallback = normalizeBackMatter({ conclusion: result }, config);
    return applyMatterOptionsToBackMatter(
      applyEditorialQualityToMatterFields(fallback, {
        config,
        language: config.language,
        genre: config.genre,
        contentKind: "back_matter",
        synopsis: blueprint.overview,
      }),
      matterOpts,
    );
  }
}

export { isFrontMatterEnabled, isBackMatterEnabled } from "@/lib/matter-options";

/* ============ AI Quality Evaluation ============ */

export async function evaluateChapterQuality(
  config: BookConfig, chapter: Chapter, chapterIndex: number, usage?: AIUsageContext
): Promise<AIQualityRating> {
  const editorialProtocol = buildEditorialToolsMaxLevelProtocol(config.language);
  const prompt = `You are a professional book editor and literary critic. Evaluate this chapter with BRUTAL HONESTY.

${editorialProtocol}

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
  "explanation": "<2-3 sentences explaining the score honestly; include concrete evidence>",
  "missing": "<what is missing or weak in this chapter; if nothing significant, use the exact premium message>",
  "improvements": "<specific actionable improvements to reach 5 stars; if no material gain, use the exact premium message>"
}

Be HONEST. Most AI-generated content is 2-3 stars. Only truly exceptional writing deserves 4-5.
If the chapter is already professionally premium, say exactly: "${PROFESSIONAL_PREMIUM_NO_SIGNIFICANT_IMPROVEMENTS}"
Language: Respond in ${config.language}.
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

function getRewriteLevelInstruction(level: RewriteLevel): string {
  switch (level) {
    case "light":
      return `LIGHT IMPROVEMENT:
- Polish prose: fix awkward phrasing, tighten sentences
- Improve word choice for precision and rhythm
- Strengthen transitions between paragraphs
- Keep the same structure and core ideas
- Make one or two key moments more readable without over-polishing the voice`;
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
- Create moments of genuine surprise and emotional power through action, subtext and consequence
- Use literary techniques: foreshadowing, callback, rhythm breaks
- The reader must need the next chapter after reading this one
- Channel the DNA of bestsellers in this genre
- Zero generic phrasing, but avoid decorative over-writing`;
  }
}

export async function rewriteChapter(
  config: BookConfig, blueprint: BookBlueprint, chapter: Chapter,
  chapterIndex: number, previousChapters: Chapter[], instruction: string,
  aiRating?: AIQualityRating, level: RewriteLevel = "deep", usage?: AIUsageContext,
): Promise<Chapter> {
  config = withSanitizedConfig(config);
  const weaknessTarget = aiRating
    ? `\n\nAI EDITOR FEEDBACK (you MUST address these weaknesses):
- Current Score: ${aiRating.score}/5
- Issues: ${aiRating.explanation}
- Missing: ${aiRating.missing}
- Required Improvements: ${aiRating.improvements}`
    : "";

  const intelligenceBlock = String(usage?.metadata?.writerIntelBlock || "").trim();
  const longBookMemory = usage?.metadata?.longBookMemory as import("@/lib/long-book-memory/types").LongBookMemorySnapshot | undefined;
  const memoryGraph = (usage?.metadata?.memoryGraph as import("@/lib/memory-graph/types").MemoryGraphSnapshot | undefined) ?? null;
  const priorText = previousChapters.map((c) => c.content).join("\n");
  const writerMemorySource = buildWriterMemorySource({
    config,
    previousChapters,
    chapterIndex,
    blueprint,
    longBookMemory,
    intelligenceBlock,
  });
  const contextMemory = buildContextMemory(config, blueprint, previousChapters, chapterIndex, {
    skipLongBookMemory: Boolean(writerMemorySource.trim()),
  });
  const lengthInstruction = getChapterLengthInstruction(config, chapterIndex, config.numberOfChapters);
  const levelInstruction = getRewriteLevelInstruction(level);
  const characterLock = buildCharacterLock(config);
  const forgeWriterBlock = intelligenceBlock ? "" : buildForgeWriterContextBlock(config);
  const humanNarrativeRealismV4 = buildHumanNarrativeRealismV4Block(config, chapterIndex);
  const humanBestsellerModeV11 = buildHumanBestsellerModeV11Block(config, { chapterIndex, mode: "rewrite" });
  const humanBestsellerModeV12 = buildHumanBestsellerModeV12Block(config, {
    chapterIndex,
    mode: "rewrite",
    previousChapters,
  });
  const scriptoraOmegaDirective = buildScriptoraOmegaDirective(config, { chapterIndex, mode: "rewrite" });
  const bookTypeEngineBlock = buildBookTypeEngineBlock(config);
  const humanizerBlock = buildHumanizerPromptBlock({
    config,
    previousChapters,
    chapterIndex,
    outlineSummary: blueprint.chapterOutlines?.[chapterIndex]?.summary,
  });
  const premiumWritingBlock = buildPremiumWritingBlock({
    config,
    previousChapters,
    chapterIndex,
    outlineSummary: blueprint.chapterOutlines?.[chapterIndex]?.summary,
    blueprint,
    longBookMemory,
    writerMemorySource,
    storyConstitution: {
      memoryGraph,
      priorText,
    },
  });

  const rewriteProtocol = buildEditorialToolsMaxLevelProtocol(config.language);
  const prompt = `${level.toUpperCase()} REWRITE — Chapter ${chapterIndex + 1}: "${chapter.title}"

${levelInstruction}

Instruction: "${instruction}"
${weaknessTarget}

Current content (to be rewritten):
${chapter.content.substring(0, 2500)}...

${contextMemory}

${characterLock}

${forgeWriterBlock ? `${forgeWriterBlock}\n` : ""}

${humanNarrativeRealismV4}

${humanBestsellerModeV11}

${humanBestsellerModeV12}

${buildEditorialNovelModeBlock(config)}

${scriptoraOmegaDirective}

${buildMaximumEditorialQualityPromptBlock(config, { contentKind: "chapter", language: config.language })}

${rewriteProtocol}

${humanizerBlock}

${premiumWritingBlock}

${bookTypeEngineBlock}

Book: "${config.title}"
Genre: ${config.genre}
Language: ${config.language} — WRITE ENTIRELY IN ${config.language}
${lengthInstruction}

EVOLUTION RULES:
- Produce NEW PROSE — zero repeated sentences from original
- Maintain continuity with previous chapters
- The rewrite must be MEASURABLY BETTER than the original
- Before rewriting, silently run Analysis. If the expected quality gain is below 5%, keep the original content and return it unchanged.
- Never rewrite strong passages for the sake of novelty.
- Never import new plot, new characters, or a different narrative line.

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
    const rewrittenContent = applyUltraHumanAndFinalGuardToText(
      runEditorialPassSupreme(
        stringifyField(parsed?.content).trim() || chapter.content,
        {
          config,
          blueprint,
          previousChapters,
          chapterIndex,
          outlineSummary: blueprint.chapterOutlines?.[chapterIndex]?.summary,
          memoryGraph,
          priorText,
        },
      ).text,
      { config, previousChapters, chapterIndex },
    );
    const rewrittenChapter = humanizeChapter(
      {
        ...chapter,
        ...parsed,
        content: rewrittenContent,
        subchapters: Array.isArray(parsed?.subchapters) ? parsed.subchapters : safeSubchapters(chapter),
      },
      { config, previousChapters, chapterIndex, outlineSummary: blueprint.chapterOutlines?.[chapterIndex]?.summary },
    );
    return {
      ...rewrittenChapter,
      content: applyFinalManuscriptGuardToText(rewrittenChapter.content, { config, previousChapters, chapterIndex }),
    };
  } catch {
    const fallbackContent = applyUltraHumanAndFinalGuardToText(
      humanizeNarrativeText(result, {
        config,
        previousChapters,
        chapterIndex,
        outlineSummary: blueprint.chapterOutlines?.[chapterIndex]?.summary,
      }),
      { config, previousChapters, chapterIndex },
    );
    return {
      ...chapter,
      content: applyFinalManuscriptGuardToText(fallbackContent, { config, previousChapters, chapterIndex }),
    };
  }
}
