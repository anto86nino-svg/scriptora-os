import { useState, useCallback, useRef } from "react";
import {
  BookProject,
  BookConfig,
  ChatMessage,
  GenerationPhase,
  GenerationStatus,
  AIQualityRating,
  ChapterEditorialSnapshot,
  isGenerationFailureStatus,
} from "@/types/book";
import { saveProjectAsync, createProjectId, setLastProjectId, loadProjects as loadScopedProjects } from "@/services/storageService";
import { saveProject } from "@/lib/storage";
import type { RewriteLevel, ChunkProgress } from "@/lib/generation-types";
import { buildBookTypeLock as buildGenreLock } from "@/lib/book-type-engine";
import { sanitizeBookConfiguration } from "@/lib/book-config-engine";
import { isBackMatterEnabled, isFrontMatterEnabled } from "@/lib/matter-options";
import {
  runGenerateBlueprint,
  runGenerateFrontMatter,
  runGenerateBackMatter,
  runGenerateChapter,
  runGenerateChapterChunked,
  runGenerateSubchapter,
  runRewriteChapter,
  runEvaluateChapterQuality,
} from "@/lib/generation-runtime";
import { initialPhaseAfterBlueprint, phaseAfterAllChapters } from "@/lib/matter-options";
import { scaffoldMatterForApprovedBlueprint } from "@/lib/matter-scaffold";
import { refreshProjectLongBookMemory } from "@/lib/long-book-memory";
import { isMemoryConsistencyV25Enabled, refreshProjectMemoryConsistencyV25 } from "@/lib/memory-consistency-v25";

function refreshProjectNarrativeMemory(project: BookProject): BookProject {
  return isMemoryConsistencyV25Enabled()
    ? refreshProjectMemoryConsistencyV25(project)
    : refreshProjectLongBookMemory(project);
}
import { BlueprintValidationError, buildFallbackBlueprintFromConfig } from "@/lib/blueprint-recovery";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { fetchPlan } from "@/lib/plan";
import { isDevMode } from "@/lib/dev-mode";
import { getDevPlanOverride } from "@/lib/dev-plan-override";
import { classifyError, formatUserMessage, formatToastMessage } from "@/lib/scriptora-error";
import { assertProjectReadyForGeneration, ProjectGenerationBlockedError } from "@/lib/project-generation-readiness";
import { scriptoraLog } from "@/lib/scriptora-logger";
import { getPlanLimits } from "@/lib/subscription";
import { normalizeProjectChapterTitles, resolveChapterTitle, formatChapterDisplayTitle } from "@/lib/chapter-titles";
import { ensureBookTitleMetadata } from "@/lib/title-shadow";
import { applyAuthorIdentityToConfig, getSelectedAuthorIdentity, resolveAuthorIdentity } from "@/lib/author-identity";
import { normalizeBookConfig, normalizeBookProject } from "@/lib/book-config-studio/defaults";
import type { BookBlueprint } from "@/types/book";
import { getActiveSubchaptersPerChapter, getBookStructureTruth, getMissingActiveSubchapterRefs } from "@/lib/book-structure-truth";
import {
  autoCompleteBookConfig,
  validateBookReadinessForBlueprint,
} from "@/lib/book-config-engine/blueprint-readiness";
import {
  buildCreditIdempotencyKey,
  chargeChapterGeneration,
  chargeRewriteChapter,
  resolveChapterGenerationOperation,
} from "@/lib/billing";

const FREE_MAX_PROJECT_WORDS = 10_000;

function createRuntimeGenerationId(prefix: string): string {
  try {
    return `${prefix}-${(
typeof crypto !== "undefined" &&
typeof crypto.randomUUID === "function"
? crypto.randomUUID()
: `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
)}`;
  } catch {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function countWordsSafe(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + countWordsSafe(item), 0);
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).reduce((sum, item) => sum + countWordsSafe(item), 0);
  }
  return 0;
}

function countProjectWordsHard(project: BookProject | null | undefined): number {
  if (!project) return 0;
  let total = 0;
  total += countWordsSafe(project.frontMatter);
  total += countWordsSafe(project.backMatter);
  for (const chapter of project.chapters || []) {
    total += countWordsSafe(chapter?.content);
    for (const sub of chapter?.subchapters || []) total += countWordsSafe(sub?.content);
  }
  return total;
}

function trimTextToWordLimit(text: string, maxWords: number): string {
  if (maxWords <= 0) return "";
  const marker = "[Limite parole del piano raggiunto.]";
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;

  const markerWords = marker.split(/\s+/).filter(Boolean);
  const allowedBodyWords = Math.max(0, maxWords - markerWords.length);
  return [...words.slice(0, allowedBodyWords), ...markerWords].join(" ");
}

function chapterGenerationKey(projectId: string, index: number): string {
  return `${projectId}:${index}`;
}

function stripGeneratedHeading(text: string): string {
  return String(text || "")
    .replace(/^#\s+.*(?:\r?\n)+/, "")
    .trim();
}

function recoveredStatusForContent(content: string): GenerationStatus {
  const words = countWordsSafe(content);
  if (words >= 120) return "completed_with_warning";
  if (words >= 35) return "recovered_partial";
  return "failed_empty";
}

function hasRecoverableChapterContent(content: unknown): boolean {
  return recoveredStatusForContent(String(content || "")) !== "failed_empty";
}

async function getActivePlanForEngine() {
  return isDevMode() ? getDevPlanOverride() : await fetchPlan();
}

async function getMaxProjectWordsForActivePlan(): Promise<number> {
  const activePlan = await getActivePlanForEngine();
  return getPlanLimits(activePlan).maxWordsPerBook;
}

function planLimitLabel(maxWords: number): string {
  return `${maxWords.toLocaleString("it-IT")} parole`;
}

function getMissingChapterIndexes(project: BookProject): number[] {
  const total = Math.max(0, project.config?.numberOfChapters || 0);
  return Array.from({ length: total }, (_, i) => i)
    .filter((i) => !((project.chapters?.[i]?.content || "").trim().length > 50));
}

function allTargetChaptersGenerated(project: BookProject): boolean {
  return getMissingChapterIndexes(project).length === 0;
}

function getMissingSubchapterRefs(project: BookProject): Array<{ chapterIndex: number; subIndex: number }> {
  return getMissingActiveSubchapterRefs(project);
}

async function isFreeAiToolsLockedForProject(project: BookProject | null | undefined): Promise<boolean> {
  const activePlan = await getActivePlanForEngine();
  if (activePlan !== "free") return false;
  return countProjectWordsHard(project) > 0;
}

function showFreeAiToolsLockedMessage(addMessage: (role: ChatMessage["role"], content: string) => void) {
  const msg = "Strumenti AI bloccati nel piano Free dopo il libro gratuito. Passa a Pro/Premium per analisi, riscritture e upgrade capitoli.";
  addMessage("assistant", `🔒 ${msg}`);
  toast.error(msg);
}

function notifyGenerationBlocked(err: ProjectGenerationBlockedError) {
  window.dispatchEvent(new CustomEvent("scriptora-generation-blocked", {
    detail: { focusSection: err.focusSection },
  }));
}

function humanBlueprintErrorMessage(raw: unknown): string {
  const text = raw instanceof Error ? raw.message : String(raw || "");
  if (/failed to fetch|network|abort|timeout|non json|empty blueprint/i.test(text)) {
    return "Il motore Blueprint non ha restituito una risposta completa. Ho preparato una bozza locale sicura dalla configurazione.";
  }
  if (/json|schema|validation|capitoli|chapter/i.test(text)) {
    return "La risposta Blueprint era incompleta o non valida. Ho recuperato una struttura locale pulita dalla configurazione.";
  }
  return "Il blueprint AI non è arrivato integro. Ho creato una struttura locale sicura per non lasciarti fermo.";
}

function handleGenerationBlocked(
  err: ProjectGenerationBlockedError,
  addMessage: (role: ChatMessage["role"], content: string) => void,
  operation?: string,
  chapterIndex?: number,
) {
  notifyGenerationBlocked(err);
  const classified = classifyError(err, { operation, chapterIndex });
  addMessage("assistant", formatUserMessage(classified));
  toast.error(classified.cause);
}

function resolveProjectChapterTitle(project: BookProject, index: number, rawTitle?: string): string {
  const outline = project.blueprint?.chapterOutlines?.[index];
  return resolveChapterTitle(rawTitle || outline?.title, index, {
    config: project.config,
    summary: outline?.summary,
    totalChapters: project.config?.numberOfChapters,
  });
}

// Debounce remote saves: local save is instant, but Supabase upserts are
// throttled to avoid flooding the network during chunked generation.
let remoteSaveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingRemoteSave: { project: BookProject; cbs?: any } | null = null;
function scheduleRemoteSave(project: BookProject, cbs?: any) {
  pendingRemoteSave = { project, cbs };
  if (remoteSaveTimer) return;
  remoteSaveTimer = setTimeout(() => {
    remoteSaveTimer = null;
    const p = pendingRemoteSave;
    pendingRemoteSave = null;
    if (p) {
      saveProjectAsync(p.project, p.cbs).catch((err) => {
        console.warn("[sync] remote save failed", err);
        p.cbs?.onPending?.();
      });
    }
  }, 1500);
}

export interface SyncCallbacks {
  onSaving?: () => void;
  onSaved?: () => void;
  onPending?: () => void;
  onOffline?: () => void;
}
export function useBookEngine(syncCallbacks?: SyncCallbacks) {
  const [project, setProject] = useState<BookProject | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [generatingSet, setGeneratingSet] = useState<Set<string>>(new Set());
  const [chunkProgress, setChunkProgress] = useState<Record<string, ChunkProgress>>({});
  const projectRef = useRef<BookProject | null>(null);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  // Throttle UI updates during streaming to keep the app fluid even when
  // multiple chapters generate in parallel and emit hundreds of token events.
  const lastProgressRenderAt = useRef<Map<string, number>>(new Map());
  const lastSaveAt = useRef<Map<string, number>>(new Map());
  const chapterGenerationIds = useRef<Map<string, string>>(new Map());
  const rewriteLocks = useRef<Set<number>>(new Set());
  const PROGRESS_RENDER_MS = 150; // ~6fps for streaming text — perceptually smooth
  const SAVE_THROTTLE_MS = 1000;  // local IDB save throttled during streaming

  const syncRef = (p: BookProject | null) => { projectRef.current = p; };
  const isAnythingGenerating = generatingSet.size > 0;

  const addGenerating = (key: string) => setGeneratingSet(prev => new Set(prev).add(key));
  const removeGenerating = (key: string) => setGeneratingSet(prev => {
    const next = new Set(prev);
    next.delete(key);
    return next;
  });

  const addMessage = useCallback((role: ChatMessage["role"], content: string) => {
    const msg: ChatMessage = { id: (
typeof crypto !== "undefined" &&
typeof crypto.randomUUID === "function"
? crypto.randomUUID()
: `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
), role, content, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, msg]);
  }, []);

  const updateAndSave = useCallback((updater: (p: BookProject) => BookProject) => {
    setProject(prev => {
      if (!prev) return prev;
      const updated = updater({ ...prev, updatedAt: new Date().toISOString() });
      saveProject(updated); // local — instant, compressed + IDB fallback
      scheduleRemoteSave(updated, syncCallbacks); // remote — debounced 1.5s
      syncRef(updated);
      return updated;
    });
  }, [syncCallbacks]);

  const getLatestProject = (): BookProject | null => projectRef.current;

  const startChapterGeneration = (projectId: string, index: number, prefix: string) => {
    const generationId = createRuntimeGenerationId(prefix);
    chapterGenerationIds.current.set(chapterGenerationKey(projectId, index), generationId);
    return generationId;
  };

  const isCurrentChapterGeneration = (projectId: string, index: number, generationId: string) => {
    const latest = projectRef.current;
    return latest?.id === projectId && chapterGenerationIds.current.get(chapterGenerationKey(projectId, index)) === generationId;
  };

  const clearChapterGenerationIfCurrent = (projectId: string, index: number, generationId: string) => {
    const key = chapterGenerationKey(projectId, index);
    if (chapterGenerationIds.current.get(key) === generationId) chapterGenerationIds.current.delete(key);
  };

  const prepareNewBookConfig = useCallback(async (config: BookConfig): Promise<BookConfig | null> => {
    const activePlan = await getActivePlanForEngine();
    if (activePlan === "free") {
      const existingProjects = await loadScopedProjects().catch(() => []);
      if (existingProjects.length > 0) {
        const msg = "Hai già usato il libro gratuito. Passa a Pro/Premium per creare altri libri.";
        addMessage("assistant", `🔒 ${msg}`);
        toast.error(msg);
        return null;
      }
    }

    const normalized = normalizeBookConfig(config);
    const { config: sanitized } = sanitizeBookConfiguration(normalized);
    const titleSafeInput = ensureBookTitleMetadata(sanitized, {
      genre: sanitized.genre,
      category: sanitized.category,
      subcategory: sanitized.subcategory,
      targetAudience: sanitized.tone,
      language: sanitized.language,
    });
    const authorSafeInput = applyAuthorIdentityToConfig(
      titleSafeInput,
      resolveAuthorIdentity(titleSafeInput.authorIdentity, titleSafeInput.authorIdentityId) || getSelectedAuthorIdentity(),
    ) as BookConfig;
    const maxProjectWords = getPlanLimits(activePlan).maxWordsPerBook;
    return activePlan === "free"
      ? {
          ...authorSafeInput,
          bookLength: "short",
          customTotalWords: Math.min(authorSafeInput.customTotalWords ?? FREE_MAX_PROJECT_WORDS, FREE_MAX_PROJECT_WORDS),
        }
      : {
          ...authorSafeInput,
          customTotalWords: authorSafeInput.bookLength === "custom"
            ? Math.min(authorSafeInput.customTotalWords ?? maxProjectWords, maxProjectWords)
            : authorSafeInput.customTotalWords,
        };
  }, [addMessage]);

  const createProjectDraft = useCallback(async (config: BookConfig): Promise<BookProject | null> => {
    const safeConfig = await prepareNewBookConfig(config);
    if (!safeConfig) return null;

    const genreLock = buildGenreLock(safeConfig);
    const newProject: BookProject = {
      id: createProjectId(),
      config: { ...safeConfig, configStatus: safeConfig.configStatus || "validated" },
      blueprint: null,
      frontMatter: null,
      chapters: [],
      backMatter: null,
      phase: "blueprint",
      genreLock,
      blueprintApproved: false,
      configStatus: safeConfig.configStatus || "validated",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setProject(newProject);
    syncRef(newProject);
    setMessages([]);
    saveProject(newProject);
    saveProjectAsync(newProject, syncCallbacks).catch((err) => {
      console.warn("[sync] remote save failed", err);
      syncCallbacks?.onPending?.();
    });
    addMessage("system", `Progetto creato: "${safeConfig.title}" — configurazione salvata. Genera e approva il blueprint prima della scrittura.`);
    return newProject;
  }, [prepareNewBookConfig, addMessage, syncCallbacks]);

  const createProjectWithApprovedBlueprint = useCallback(async (
    config: BookConfig,
    blueprint: BookBlueprint,
    source: BookProject["blueprintSource"] = "ai",
  ): Promise<BookProject | null> => {
    const safeConfig = await prepareNewBookConfig({ ...config, configStatus: "approved" });
    if (!safeConfig) return null;

    const genreLock = buildGenreLock(safeConfig);
    const now = new Date().toISOString();
    const newProject: BookProject = normalizeBookProject({
      id: createProjectId(),
      config: safeConfig,
      blueprint,
      frontMatter: null,
      chapters: [],
      backMatter: null,
      phase: initialPhaseAfterBlueprint(safeConfig),
      genreLock,
      blueprintApproved: true,
      blueprintApprovedAt: now,
      blueprintStatus: "completed",
      blueprintSource: source,
      configStatus: "approved",
      createdAt: now,
      updatedAt: now,
    });

    setProject(newProject);
    syncRef(newProject);
    setMessages([]);
    saveProject(newProject);
    saveProjectAsync(newProject, syncCallbacks).catch((err) => {
      console.warn("[sync] remote save failed", err);
      syncCallbacks?.onPending?.();
    });
    addMessage("system", `Libro approvato: "${safeConfig.title}" — ${blueprint.chapterOutlines.length} capitoli pronti per la generazione.`);
    addMessage("assistant", `Blueprint approvato! ${blueprint.chapterOutlines.length} capitoli pianificati.`);
    return newProject;
  }, [prepareNewBookConfig, addMessage, syncCallbacks]);

  const generateBlueprintForProject = useCallback(async () => {
    const p = getLatestProject() || project;
    if (!p) return;

    const readiness = validateBookReadinessForBlueprint(p.config);
    if (!readiness.ready) {
      const issues = [...readiness.missingFields, ...readiness.weakFields, ...readiness.genreSpecificWarnings];
      updateAndSave(pr => ({
        ...pr,
        blueprintStatus: "idle" as GenerationStatus,
        blueprintLastError: null,
        blueprintValidationErrors: issues,
      }));
      const msg = "Prima mettiamo fondamenta solide: completa o migliora la configurazione, poi genero il blueprint.";
      addMessage("assistant", `🧭 ${msg}`);
      toast.warning(msg);
      return;
    }

    addGenerating("blueprint");
    updateAndSave(pr => ({
      ...pr,
      blueprintStatus: "generating" as GenerationStatus,
      blueprintLastError: null,
      blueprintValidationErrors: [],
      blueprintApproved: false,
    }));

    try {
      addMessage("assistant", "Generazione blueprint in corso... 🏗️");
      const { blueprint, source } = await runGenerateBlueprint(p.config, p.genreLock || buildGenreLock(p.config), { projectId: p.id });
      updateAndSave(proj => ({
        ...proj,
        blueprint,
        blueprintSource: source,
        blueprintStatus: "completed" as GenerationStatus,
        blueprintLastError: null,
        blueprintValidationErrors: [],
        blueprintApproved: false,
        phase: "blueprint" as GenerationPhase,
      }));
      if (source === "repaired") toast.success("Blueprint recuperato e validato.");
      addMessage("assistant", `Blueprint pronto! ${blueprint.chapterOutlines.length} capitoli pianificati. Approva la struttura per iniziare a scrivere.`);
    } catch (e: any) {
      const fallbackBlueprint = buildFallbackBlueprintFromConfig(p.config);
      const validationErrors = e instanceof BlueprintValidationError ? e.errors : [];
      const errorMessage = humanBlueprintErrorMessage(e);
      updateAndSave(proj => ({
        ...proj,
        blueprint: fallbackBlueprint,
        blueprintSource: "config_fallback",
        blueprintStatus: "completed" as GenerationStatus,
        blueprintLastError: errorMessage,
        blueprintValidationErrors: validationErrors,
        phase: "blueprint" as GenerationPhase,
      }));
      const err = classifyError(e, { operation: "blueprint" });
      scriptoraLog.error("blueprint", formatUserMessage(err), { projectId: p?.id, raw: e?.message });
      addMessage("assistant", `⚠️ ${errorMessage} Nessun errore tecnico è stato salvato nel libro.`);
      toast.warning("Blueprint locale sicuro creato. Puoi raffinarlo o rigenerare con AI.");
    } finally {
      removeGenerating("blueprint");
    }
  }, [project, addMessage, updateAndSave]);

  const approveBlueprint = useCallback(async () => {
    const p = getLatestProject() || project;
    if (!p?.blueprint) {
      toast.error("Genera prima il blueprint.");
      return;
    }
    const now = new Date().toISOString();
    const matterPatch = scaffoldMatterForApprovedBlueprint(p);
    updateAndSave(proj => ({
      ...proj,
      blueprintApproved: true,
      blueprintApprovedAt: now,
      configStatus: "approved",
      phase: initialPhaseAfterBlueprint(proj.config),
      ...matterPatch,
    }));
    addMessage("assistant", "✅ Struttura approvata. Front/back matter pronti. Puoi generare capitoli ed esportare.");
    toast.success("Blueprint approvato — generazione sbloccata");
  }, [project, addMessage, updateAndSave]);

  const startNewBook = useCallback(async (config: BookConfig) => {
    const created = await createProjectDraft(config);
    if (!created) return;
    await generateBlueprintForProject();
  }, [createProjectDraft, generateBlueprintForProject]);

  const regenerateBlueprint = useCallback(async () => {
    const p = getLatestProject() || project;
    if (!p) return;

    const readiness = validateBookReadinessForBlueprint(p.config);
    if (!readiness.ready) {
      const issues = [...readiness.missingFields, ...readiness.weakFields, ...readiness.genreSpecificWarnings];
      updateAndSave(pr => ({
        ...pr,
        blueprintStatus: "idle" as GenerationStatus,
        blueprintValidationErrors: issues,
      }));
      const msg = "Configurazione non ancora abbastanza solida per rigenerare un blueprint affidabile.";
      addMessage("assistant", `🧭 ${msg}`);
      toast.warning(msg);
      return;
    }

    addGenerating("blueprint");
    updateAndSave(pr => ({
      ...pr,
      blueprintStatus: "generating" as GenerationStatus,
      blueprintLastError: null,
      blueprintValidationErrors: [],
    }));

    try {
      addMessage("assistant", "Rigenerazione blueprint in corso... 🏗️");
      const { blueprint, source } = await runGenerateBlueprint(p.config, p.genreLock, { projectId: p.id });
      updateAndSave(pr => ({
        ...pr,
        blueprint,
        blueprintSource: source,
        blueprintStatus: "completed" as GenerationStatus,
        blueprintLastError: null,
        blueprintValidationErrors: [],
        blueprintApproved: false,
        phase: "blueprint" as GenerationPhase,
      }));
      if (source === "repaired") toast.success("Blueprint recuperato e validato.");
      else toast.success("Blueprint rigenerato con successo.");
      addMessage("assistant", `Blueprint pronto! ${blueprint.chapterOutlines.length} capitoli pianificati.`);
    } catch (e: any) {
      const validationErrors = e instanceof BlueprintValidationError ? e.errors : [];
      const errorMessage = humanBlueprintErrorMessage(e);
      updateAndSave(pr => ({
        ...pr,
        blueprint: pr.blueprint || buildFallbackBlueprintFromConfig(p.config),
        blueprintSource: pr.blueprint ? pr.blueprintSource : "config_fallback",
        blueprintStatus: pr.blueprint ? "completed" as GenerationStatus : "completed" as GenerationStatus,
        blueprintLastError: errorMessage,
        blueprintValidationErrors: validationErrors,
        phase: "blueprint" as GenerationPhase,
      }));
      const err = classifyError(e, { operation: "blueprint" });
      scriptoraLog.error("blueprint", formatUserMessage(err), { projectId: p.id, raw: e?.message });
      addMessage("assistant", `⚠️ ${errorMessage} La struttura precedente è stata preservata o recuperata.`);
      toast.warning("Rigenerazione AI non completata: struttura sicura preservata.");
    } finally {
      removeGenerating("blueprint");
    }
  }, [project, addMessage, updateAndSave]);

  const autoCompleteBlueprintConfig = useCallback(() => {
    const p = getLatestProject() || project;
    if (!p) return;
    const result = autoCompleteBookConfig(p.config);
    updateAndSave(pr => ({
      ...pr,
      config: result.config,
      genreLock: buildGenreLock(result.config),
      configStatus: "validated",
      blueprintValidationErrors: [],
    }));
    if (result.completedFields.length) {
      const fields = result.completedFields.join(", ");
      addMessage("assistant", `Ho completato questi dettagli per rendere il blueprint più solido: ${fields}. Puoi modificarli prima di generare.`);
      toast.success(`Configurazione migliorata: ${fields}`);
    } else {
      toast.info("La configurazione è già completa.");
    }
  }, [project, addMessage, updateAndSave]);

  const createSafeBlueprint = useCallback(() => {
    const p = getLatestProject() || project;
    if (!p) return;

    const blueprint = buildFallbackBlueprintFromConfig(p.config);
    updateAndSave(pr => ({
      ...pr,
      blueprint,
      blueprintSource: "config_fallback",
      blueprintStatus: "completed" as GenerationStatus,
      blueprintLastError: null,
      blueprintValidationErrors: [],
      phase: pr.phase === "idle" || pr.phase === "blueprint" ? initialPhaseAfterBlueprint(pr.config) : pr.phase,
    }));
    toast.success("Struttura base creata dalla configurazione. Puoi raffinarla con AI.");
    addMessage("assistant", "Struttura base sicura creata dalla configurazione. Puoi raffinarla capitolo per capitolo o rigenerare con AI.");
  }, [project, addMessage, updateAndSave]);

  const generateFrontMatterSection = useCallback(async () => {
    const p = getLatestProject() || project;
    if (!p?.blueprint) return;

    if (!isFrontMatterEnabled(p.config)) {
      updateAndSave(pr => ({
        ...pr,
        frontMatter: null,
        frontMatterStatus: "completed" as GenerationStatus,
        phase: pr.phase === "front-matter" ? "chapters" as GenerationPhase : pr.phase,
      }));
      return;
    }

    const maxProjectWords = await getMaxProjectWordsForActivePlan();
    if (countProjectWordsHard(p) >= maxProjectWords) {
      const msg = `Limite piano raggiunto: hai completato ${planLimitLabel(maxProjectWords)}.`;
      addMessage("assistant", `🔒 ${msg}`);
      toast.error(msg);
      updateAndSave(pr => ({ ...pr, phase: "complete" as GenerationPhase }));
      return;
    }

    addGenerating("front-matter");
    updateAndSave(pr => ({ ...pr, frontMatterStatus: "generating" as GenerationStatus }));
    try {
      addMessage("assistant", p.frontMatter ? "Regenerating front matter... 📖" : "Generating front matter... 📖");
      const latestP = getLatestProject() || p;
      const fm = await runGenerateFrontMatter(latestP.config, latestP.blueprint!, latestP.genreLock, { projectId: latestP.id });
      updateAndSave(pr => ({
        ...pr,
        frontMatter: fm,
        phase: pr.phase === "front-matter" ? "chapters" : pr.phase,
        frontMatterStatus: "completed" as GenerationStatus,
      }));
      addMessage("assistant", "Front matter complete!");
    } catch (e: any) {
      updateAndSave(pr => ({ ...pr, frontMatterStatus: "error" as GenerationStatus }));
      const err = classifyError(e);
      scriptoraLog.error("front-matter", formatUserMessage(err), { raw: e?.message });
      addMessage("assistant", `❌ ${formatUserMessage(err)}`);
      toast.error(formatToastMessage(err));
    } finally {
      removeGenerating("front-matter");
    }
  }, [project, addMessage, updateAndSave]);

  const generateBackMatterSection = useCallback(async () => {
    const p = getLatestProject() || project;
    if (!p?.blueprint) return;

    if (!isBackMatterEnabled(p.config)) {
      updateAndSave(pr => ({
        ...pr,
        backMatter: null,
        backMatterStatus: "completed" as GenerationStatus,
        phase: "complete" as GenerationPhase,
      }));
      addMessage("assistant", "Back matter disabilitato — libro completato.");
      return;
    }

    const missing = getMissingChapterIndexes(p);
    if (missing.length > 0) {
      const shown = missing.slice(0, 5).map((i) => i + 1).join(", ");
      const suffix = missing.length > 5 ? ` +${missing.length - 5}` : "";
      const msg = `Completa prima tutti i capitoli. Mancano: ${shown}${suffix}.`;
      addMessage("assistant", `⚠️ ${msg}`);
      toast.error(msg);
      updateAndSave(pr => ({ ...pr, phase: "chapters" as GenerationPhase }));
      return;
    }

    const missingSubchapters = getMissingSubchapterRefs(p);
    const structureTruth = getBookStructureTruth(p);
    if (structureTruth.diagnostics.length > 0) {
      scriptoraLog.warn("book-structure", structureTruth.diagnostics[0], {
        projectId: p.id,
        reason: structureTruth.reason,
        configRequestsSubchapters: structureTruth.configRequestsSubchapters,
        blueprintHasSubchapters: structureTruth.blueprintHasSubchapters,
      });
    }
    if (missingSubchapters.length > 0) {
      const shown = missingSubchapters.slice(0, 4).map((item) => `${item.chapterIndex + 1}.${item.subIndex + 1}`).join(", ");
      const suffix = missingSubchapters.length > 4 ? ` +${missingSubchapters.length - 4}` : "";
      const msg = `Completa prima i sottocapitoli attivati. Mancano: ${shown}${suffix}.`;
      addMessage("assistant", `⚠️ ${msg}`);
      toast.error(msg);
      updateAndSave(pr => ({ ...pr, phase: "chapters" as GenerationPhase }));
      return;
    }

    const maxProjectWords = await getMaxProjectWordsForActivePlan();
    if (countProjectWordsHard(p) >= maxProjectWords) {
      const msg = `Limite piano raggiunto: hai completato ${planLimitLabel(maxProjectWords)}.`;
      addMessage("assistant", `🔒 ${msg}`);
      toast.error(msg);
      updateAndSave(pr => ({ ...pr, phase: "complete" as GenerationPhase }));
      return;
    }

    addGenerating("back-matter");
    updateAndSave(pr => ({
      ...pr,
      phase: "back-matter" as GenerationPhase,
      backMatterStatus: "generating" as GenerationStatus,
    }));
    try {
      addMessage("assistant", p.backMatter ? "Regenerating back matter... 📝" : "Generating back matter... 📝");
      const latestP = getLatestProject() || p;
      const bm = await runGenerateBackMatter(latestP.config, latestP.blueprint!, latestP.chapters, latestP.genreLock, { projectId: latestP.id });
      updateAndSave(pr => ({ ...pr, backMatter: bm, phase: "complete", backMatterStatus: "completed" as GenerationStatus }));
      addMessage("assistant", "🎉 Book generation complete!");
    } catch (e: any) {
      updateAndSave(pr => ({ ...pr, backMatterStatus: "error" as GenerationStatus }));
      const err = classifyError(e);
      scriptoraLog.error("back-matter", formatUserMessage(err), { raw: e?.message });
      addMessage("assistant", `❌ ${formatUserMessage(err)}`);
      toast.error(formatToastMessage(err));
    } finally {
      removeGenerating("back-matter");
    }
  }, [project, addMessage, updateAndSave]);

  const generateNext = useCallback(async () => {
    const p = getLatestProject() || project;
    if (!p) return;

    if (isFrontMatterEnabled(p.config) && (!p.frontMatter || p.phase === "front-matter")) {
      await generateFrontMatterSection();
      return;
    }

    if (!isFrontMatterEnabled(p.config) && p.phase === "front-matter") {
      updateAndSave(pr => ({ ...pr, phase: "chapters" as GenerationPhase }));
    }

    if (!allTargetChaptersGenerated(p)) {
      const missing = getMissingChapterIndexes(p);
      const first = missing[0] + 1;
      const msg = `Prima del back matter devi generare i capitoli mancanti. Prossimo: capitolo ${first}.`;
      addMessage("assistant", `⚠️ ${msg}`);
      toast.error(msg);
      updateAndSave(pr => ({ ...pr, phase: "chapters" as GenerationPhase }));
      return;
    }

    if (isBackMatterEnabled(p.config) && (!p.backMatter || p.phase === "back-matter")) {
      await generateBackMatterSection();
    } else if (!isBackMatterEnabled(p.config)) {
      updateAndSave(pr => ({ ...pr, phase: "complete" as GenerationPhase }));
    }
  }, [project, addMessage, updateAndSave, generateFrontMatterSection, generateBackMatterSection]);

  const generateSingleChapter = useCallback(async (index: number) => {
    const p = getLatestProject() || project;
    if (!p?.blueprint) return;
    const genKey = `chapter-${index}`;
    if (generatingSet.has(genKey)) return;

    try {
      assertProjectReadyForGeneration(p, index);
    } catch (e) {
      if (e instanceof ProjectGenerationBlockedError) {
        handleGenerationBlocked(e, addMessage, "chapter", index);
        return;
      }
      throw e;
    }

    const maxProjectWords = await getMaxProjectWordsForActivePlan();
    if (countProjectWordsHard(p) >= maxProjectWords) {
      const msg = `Limite piano raggiunto: hai completato ${planLimitLabel(maxProjectWords)}.`;
      addMessage("assistant", `🔒 ${msg}`);
      toast.error(msg);
      updateAndSave(pr => ({ ...pr, phase: "complete" as GenerationPhase }));
      return;
    }

    addGenerating(genKey);
    const targetProjectId = p.id;
    const generationId = startChapterGeneration(targetProjectId, index, "chapter");
    updateAndSave(proj => {
      if (proj.id !== targetProjectId) return proj;
      const chapters = [...proj.chapters];
      while (chapters.length <= index) {
        chapters.push({ title: resolveProjectChapterTitle(proj, chapters.length), content: "", subchapters: [], status: "idle" });
      }
      chapters[index] = {
        ...chapters[index],
        title: resolveProjectChapterTitle(proj, index, chapters[index]?.title),
        status: "generating",
        lastGenerationId: generationId,
        rewriteInProgress: false,
        rewriteAttemptCount: 0,
      };
      return { ...proj, chapters };
    });

    try {
      addMessage("assistant", `Writing Chapter ${index + 1}... ✍️`);
      const latestP = getLatestProject() || p;
      const prevChapters = latestP.chapters.filter((_, i) => i < index && latestP.chapters[i]?.content?.length > 0);
      const chapterOverride = latestP.chapters[index]?.lengthOverride;
      const activePlanForChapter = await getActivePlanForEngine();
      const creditOperation = resolveChapterGenerationOperation(latestP.config);
      const idempotencyKey = await chargeChapterGeneration(
        latestP.config,
        { projectId: latestP.id, chapterIndex: index + 1, source: "generate_chapter" },
        index,
      );

      const chapter = await runGenerateChapterChunked(
        latestP.config, latestP.blueprint!, index, prevChapters, chapterOverride,
        (progress) => {
          if (!isCurrentChapterGeneration(targetProjectId, index, generationId)) return;
          // Throttle: skip UI/state churn when tokens arrive faster than ~6fps.
          // Always allow phase-change events through so UI feels responsive.
          const key = `chapter-${index}`;
          const now = performance.now();
          const lastRender = lastProgressRenderAt.current.get(key) ?? 0;
          if (now - lastRender < PROGRESS_RENDER_MS) return;
          lastProgressRenderAt.current.set(key, now);

          setChunkProgress(prev => ({ ...prev, [key]: progress }));
          // Heavier work (setProject + IDB save) throttled more aggressively.
          const lastSave = lastSaveAt.current.get(key) ?? 0;
          if (now - lastSave < SAVE_THROTTLE_MS) return;
          lastSaveAt.current.set(key, now);
          updateAndSave(proj => {
            if (proj.id !== targetProjectId) return proj;
            const chapters = [...proj.chapters];
            while (chapters.length <= index) {
              chapters.push({ title: resolveProjectChapterTitle(proj, chapters.length), content: "", subchapters: [], status: "idle" });
            }
            chapters[index] = {
              ...chapters[index],
              title: resolveProjectChapterTitle(proj, index, chapters[index]?.title),
              content: progress.content,
              status: "generating" as GenerationStatus,
              lastGenerationId: generationId,
            };
            return { ...proj, chapters };
          });
        },
        latestP.genreLock,
        {
          adaptive: { plan: activePlanForChapter },
          usage: {
            projectId: latestP.id,
            creditOperation,
            idempotencyKey,
            taskType: "generate_chapter_chunk",
          },
          longBookMemory: latestP.longBookMemory,
        },
      );

      const activePlanAfterGeneration = await getActivePlanForEngine();
      const maxProjectWordsAfterGeneration = getPlanLimits(activePlanAfterGeneration).maxWordsPerBook;

      if (!isCurrentChapterGeneration(targetProjectId, index, generationId)) {
        scriptoraLog.warn("chapter", "Ignored stale chapter generation result", { chapterIndex: index + 1, generationId });
        return;
      }

      updateAndSave(proj => {
        if (proj.id !== targetProjectId) return proj;
        const chapters = [...proj.chapters];
        while (chapters.length <= index) {
          chapters.push({ title: resolveProjectChapterTitle(proj, chapters.length), content: "", subchapters: [], status: "idle" });
        }

        let finalChapter = { ...chapter };
        let nextPhase: GenerationPhase = proj.phase;

        const existingChapter = chapters[index];
        chapters[index] = { ...existingChapter, content: "", subchapters: [] } as any;
        const usedWithoutThisChapter = countProjectWordsHard({ ...proj, chapters });
        const remaining = Math.max(0, maxProjectWordsAfterGeneration - usedWithoutThisChapter);

        finalChapter = {
          ...chapter,
          title: resolveProjectChapterTitle(proj, index, chapter.title),
          content: trimTextToWordLimit(chapter.content, remaining),
          subchapters: remaining < countWordsSafe(chapter.content) ? [] : chapter.subchapters,
        };

        if (remaining <= 0 || countWordsSafe(finalChapter.content) >= remaining) {
          nextPhase = "complete" as GenerationPhase;
        }

        chapters[index] = {
          ...finalChapter,
          status: "completed" as GenerationStatus,
          lengthOverride: proj.chapters[index]?.lengthOverride,
          lastGenerationId: generationId,
          rewriteInProgress: false,
        };
        const allGenerated = chapters.length >= proj.config.numberOfChapters && chapters.every(c => c.content.length > 0);
        const donePhase = allGenerated ? phaseAfterAllChapters(proj.config) : proj.phase;
        const refreshed = refreshProjectNarrativeMemory({ ...proj, chapters, phase: nextPhase === "complete" ? nextPhase : donePhase });
        return { ...refreshed, chapters, phase: nextPhase === "complete" ? nextPhase : donePhase };
      });

      const latestAfterSave = getLatestProject();
      const finalWords = countWordsSafe((latestAfterSave?.chapters?.[index]?.content || chapter.content));
      const finalTitle = latestAfterSave
        ? formatChapterDisplayTitle(index, latestAfterSave.chapters?.[index]?.title || chapter.title, {
            config: latestAfterSave.config,
            summary: latestAfterSave.blueprint?.chapterOutlines?.[index]?.summary,
          })
        : formatChapterDisplayTitle(index, chapter.title, { config: p.config });
      addMessage("assistant", `${finalTitle} complete! ✅ (${finalWords} words)`);
      if (countProjectWordsHard(getLatestProject()) >= maxProjectWordsAfterGeneration) {
        const msg = `Limite piano raggiunto: il libro è arrivato a ${planLimitLabel(maxProjectWordsAfterGeneration)}.`;
        addMessage("assistant", `🔒 ${msg}`);
        toast.error(msg);
      }
    } catch (e: any) {
      if (!isCurrentChapterGeneration(targetProjectId, index, generationId)) {
        scriptoraLog.warn("chapter", "Ignored stale chapter generation error", { chapterIndex: index + 1, generationId, raw: e?.message });
        return;
      }
      let recoveredStatus: GenerationStatus | null = null;
      updateAndSave(proj => {
        if (proj.id !== targetProjectId) return proj;
        const chapters = [...proj.chapters];
        const existing = chapters[index];
        const recoveredContent = stripGeneratedHeading(existing?.content || "");
        if (existing && hasRecoverableChapterContent(recoveredContent)) {
          recoveredStatus = recoveredStatusForContent(recoveredContent);
          chapters[index] = {
            ...existing,
            content: recoveredContent,
            status: recoveredStatus,
            rewriteInProgress: false,
            lastGenerationId: generationId,
          };
        } else if (existing) {
          chapters[index] = { ...existing, status: "failed_empty" as GenerationStatus, rewriteInProgress: false };
        }
        return { ...proj, chapters };
      });
      const err = classifyError(e);
      scriptoraLog.error("chapter", formatUserMessage(err), { chapterIndex: index + 1, raw: e?.message, recoveredStatus });
      if (recoveredStatus) {
        addMessage("assistant", `⚠️ Capitolo ${index + 1} scritto e salvato, ma con warning finale: ${formatUserMessage(err)}`);
        toast.warning(`Capitolo ${index + 1} salvato con warning non bloccante.`);
      } else {
        addMessage("assistant", `❌ Capitolo ${index + 1}: ${formatUserMessage(err)}`);
        toast.error(formatToastMessage(err));
      }
    } finally {
      clearChapterGenerationIfCurrent(targetProjectId, index, generationId);
      removeGenerating(genKey);
      setChunkProgress(prev => { const next = { ...prev }; delete next[genKey]; return next; });
      lastProgressRenderAt.current.delete(`chapter-${index}`);
      lastSaveAt.current.delete(`chapter-${index}`);
    }
  }, [project, generatingSet, addMessage, updateAndSave]);

  const generateSingleSubchapter = useCallback(async (chapterIndex: number, subIndex: number) => {
    const p = getLatestProject() || project;
    if (!p?.blueprint) return;
    const chapter = p.chapters[chapterIndex];
    if (!chapter) return;
    const genKey = `chapter-${chapterIndex}-sub-${subIndex}`;
    if (generatingSet.has(genKey)) return;

    addGenerating(genKey);
    try {
      addMessage("assistant", `Writing Subchapter ${subIndex + 1} of Chapter ${chapterIndex + 1}... ✍️`);
      const prevChapters = p.chapters.filter((_, i) => i < chapterIndex);
      const creditOperation = resolveChapterGenerationOperation(p.config);
      const idempotencyKey = await chargeChapterGeneration(
        p.config,
        { projectId: p.id, chapterIndex: chapterIndex + 1, subchapterIndex: subIndex + 1, source: "generate_subchapter" },
        chapterIndex,
        buildCreditIdempotencyKey("subchapter", p.id, chapterIndex + 1, subIndex + 1),
      );
      const sub = await runGenerateSubchapter(p.config, p.blueprint, chapterIndex, subIndex, chapter, prevChapters, p.genreLock, {
        projectId: p.id,
        creditOperation,
        idempotencyKey,
        taskType: "generate_subchapter",
      });
      updateAndSave(proj => {
        const chapters = [...proj.chapters];
        const ch = { ...chapters[chapterIndex] };
        const subs = [...ch.subchapters];
        while (subs.length <= subIndex) subs.push({ title: "", content: "" });
        subs[subIndex] = sub;
        ch.subchapters = subs;
        chapters[chapterIndex] = ch;
        return { ...proj, chapters };
      });
      addMessage("assistant", `Subchapter "${sub.title}" complete!`);
    } catch (e: any) {
      const err = classifyError(e);
      scriptoraLog.error("subchapter", formatUserMessage(err), { raw: e?.message });
      addMessage("assistant", `❌ ${formatUserMessage(err)}`);
      toast.error(formatToastMessage(err));
    } finally {
      removeGenerating(genKey);
    }
  }, [project, generatingSet, addMessage, updateAndSave]);

  const regenerateChapter = useCallback(async (index: number) => {
    const p = getLatestProject() || project;
    if (!p?.blueprint) return;
    const genKey = `chapter-${index}`;
    if (generatingSet.has(genKey)) return;

    try {
      assertProjectReadyForGeneration(p, index);
    } catch (e) {
      if (e instanceof ProjectGenerationBlockedError) {
        handleGenerationBlocked(e, addMessage, "chapter", index);
        return;
      }
      throw e;
    }

    addGenerating(genKey);
    const targetProjectId = p.id;
    const generationId = startChapterGeneration(targetProjectId, index, "regenerate");
    updateAndSave(proj => {
      if (proj.id !== targetProjectId) return proj;
      const chapters = [...proj.chapters];
      if (chapters[index]) {
        chapters[index] = {
          ...chapters[index],
          status: "generating" as GenerationStatus,
          lastGenerationId: generationId,
          rewriteInProgress: false,
        };
      }
      return { ...proj, chapters };
    });

    try {
      addMessage("assistant", `Regenerating Chapter ${index + 1}... 🔄`);
      const latestP = getLatestProject() || p;
      const prevChapters = latestP.chapters.slice(0, index);
      const creditOperation = resolveChapterGenerationOperation(latestP.config);
      const idempotencyKey = await chargeChapterGeneration(
        latestP.config,
        { projectId: latestP.id, chapterIndex: index + 1, source: "regenerate_chapter" },
        index,
        buildCreditIdempotencyKey("regenerate", latestP.id, index + 1),
      );
      const chapter = await runGenerateChapter(latestP.config, latestP.blueprint!, index, prevChapters, latestP.chapters[index]?.lengthOverride, latestP.genreLock, {
        projectId: latestP.id,
        creditOperation,
        idempotencyKey,
        taskType: "generate_chapter_chunk",
      });
      if (!isCurrentChapterGeneration(targetProjectId, index, generationId)) {
        scriptoraLog.warn("regenerate-chapter", "Ignored stale regenerate result", { chapterIndex: index + 1, generationId });
        return;
      }
      updateAndSave(proj => {
        if (proj.id !== targetProjectId) return proj;
        const chapters = [...proj.chapters];
        chapters[index] = {
          ...chapter,
          title: resolveProjectChapterTitle(proj, index, chapter.title),
          status: "completed" as GenerationStatus,
          lengthOverride: proj.chapters[index]?.lengthOverride,
          lastGenerationId: generationId,
          rewriteInProgress: false,
        };
        return { ...proj, chapters };
      });
      addMessage("assistant", `Chapter ${index + 1} regenerated!`);
      } catch (e: any) {
        if (!isCurrentChapterGeneration(targetProjectId, index, generationId)) {
          scriptoraLog.warn("regenerate-chapter", "Ignored stale regenerate error", { chapterIndex: index + 1, generationId, raw: e?.message });
          return;
        }
        let recoveredStatus: GenerationStatus | null = null;

        updateAndSave(proj => {
          if (proj.id !== targetProjectId) return proj;
          const chapters = [...proj.chapters];
          const existing = chapters[index];
          const existingContent = stripGeneratedHeading(typeof existing?.content === "string" ? existing.content : "");

          if (existing && hasRecoverableChapterContent(existingContent)) {
            recoveredStatus = recoveredStatusForContent(existingContent);
            chapters[index] = {
              ...existing,
              content: existingContent,
              status: recoveredStatus,
              lastGenerationId: generationId,
              rewriteInProgress: false,
            };
          } else if (existing) {
            chapters[index] = { ...existing, status: "failed_empty" as GenerationStatus, rewriteInProgress: false };
          }

          return { ...proj, chapters };
        });

        const err = classifyError(e);
        scriptoraLog.error("regenerate-chapter", formatUserMessage(err), {
          chapterIndex: index + 1,
          raw: e?.message,
          recoveredStatus,
        });

        if (recoveredStatus) {
          addMessage("assistant", `⚠️ Capitolo ${index + 1} generato, ma con un warning finale: ${formatUserMessage(err)}`);
          toast.warning(`Capitolo ${index + 1} generato. Warning finale non bloccante.`);
        } else {
          addMessage("assistant", `❌ Capitolo ${index + 1}: ${formatUserMessage(err)}`);
          toast.error(formatToastMessage(err));
        }
    } finally {
      clearChapterGenerationIfCurrent(targetProjectId, index, generationId);
      removeGenerating(genKey);
    }
  }, [project, generatingSet, addMessage, updateAndSave]);

  // AI Quality Evaluation
  const evaluateChapter = useCallback(async (index: number) => {
    const p = getLatestProject() || project;
    if (await isFreeAiToolsLockedForProject(p)) {
      showFreeAiToolsLockedMessage(addMessage);
      return;
    }
    if (!p?.chapters[index]?.content) return;
    const genKey = `eval-${index}`;
    if (generatingSet.has(genKey)) return;

    addGenerating(genKey);
    try {
      addMessage("assistant", `Evaluating Chapter ${index + 1} quality... 🔍`);
      const rating = await runEvaluateChapterQuality(p.config, p.chapters[index], index, { projectId: p.id });
      updateAndSave(proj => {
        const chapters = [...proj.chapters];
        chapters[index] = { ...chapters[index], aiRating: rating, qualityRating: rating.score };
        return { ...proj, chapters };
      });
      addMessage("assistant", `Chapter ${index + 1} rated ${rating.score}/5 ⭐ — ${rating.explanation}`);
    } catch (e: any) {
      addMessage("assistant", `❌ Evaluation error: ${e.message}`);
    } finally {
      removeGenerating(genKey);
    }
  }, [project, generatingSet, addMessage, updateAndSave]);

  const updateChapterEditorialAnalysis = useCallback((
    index: number,
    snapshot: ChapterEditorialSnapshot,
    aiRating: AIQualityRating,
  ) => {
    updateAndSave((proj) => {
      const chapters = [...proj.chapters];
      chapters[index] = {
        ...chapters[index],
        editorialAnalysis: snapshot,
        aiRating,
        qualityRating: aiRating.score,
      };
      return { ...proj, chapters };
    });
  }, [updateAndSave]);

  // Smart Rewrite with levels
  const rewriteChapterWithDepth = useCallback(async (index: number, level: RewriteLevel = "deep") => {
    const p = getLatestProject() || project;
    if (await isFreeAiToolsLockedForProject(p)) {
      showFreeAiToolsLockedMessage(addMessage);
      return;
    }
    if (!p?.blueprint || !p.chapters[index]) return;
    const genKey = `chapter-${index}`;
    if (generatingSet.has(genKey)) return;
    if (rewriteLocks.current.has(index)) {
      const msg = `Rewrite del capitolo ${index + 1} gia' in corso. Attendo la fine dell'operazione corrente.`;
      addMessage("assistant", `⏳ ${msg}`);
      toast.info(msg);
      return;
    }

    addGenerating(genKey);
    rewriteLocks.current.add(index);
    const targetProjectId = p.id;
    const generationId = startChapterGeneration(targetProjectId, index, "rewrite");
    updateAndSave(proj => {
      if (proj.id !== targetProjectId) return proj;
      const chapters = [...proj.chapters];
      chapters[index] = {
        ...chapters[index],
        status: "generating" as GenerationStatus,
        rewriteInProgress: true,
        lastGenerationId: generationId,
        rewriteAttemptCount: (chapters[index]?.rewriteAttemptCount || 0) + 1,
      };
      return { ...proj, chapters };
    });

    const levelLabels = { light: "Light Polish", deep: "Deep Rewrite", bestseller: "Bestseller Upgrade" };

    try {
      const aiRating = p.chapters[index].aiRating;
      const instruction = aiRating
        ? `Address these weaknesses: ${aiRating.missing}. Improvements needed: ${aiRating.improvements}. Push toward 5/5 quality.`
        : "Increase emotional depth, add more nuanced insights, and strengthen the prose.";

      addMessage("assistant", `${levelLabels[level]} on Chapter ${index + 1}... ✨`);
      const latestP = getLatestProject() || p;
      const idempotencyKey = await chargeRewriteChapter(
        { projectId: latestP.id, chapterIndex: index + 1, source: "rewrite_chapter", level },
        index,
        buildCreditIdempotencyKey("rewrite", latestP.id, index + 1, level),
      );
      const chapter = await runRewriteChapter(
        latestP.config, latestP.blueprint!, latestP.chapters[index], index,
        latestP.chapters.slice(0, index), instruction, aiRating, level, {
          projectId: latestP.id,
          creditOperation: "rewrite_chapter",
          idempotencyKey,
          taskType: "rewrite_chapter",
        }
      );
      if (!isCurrentChapterGeneration(targetProjectId, index, generationId)) {
        scriptoraLog.warn("rewrite-chapter", "Ignored stale rewrite result", { chapterIndex: index + 1, generationId, level });
        return;
      }
      updateAndSave(proj => {
        if (proj.id !== targetProjectId) return proj;
        const chapters = [...proj.chapters];
        chapters[index] = {
          ...chapter,
          title: resolveProjectChapterTitle(proj, index, chapter.title),
          status: "completed" as GenerationStatus,
          aiRating: undefined,
          qualityRating: undefined,
          lengthOverride: proj.chapters[index]?.lengthOverride,
          rewriteInProgress: false,
          lastGenerationId: generationId,
          rewriteAttemptCount: chapters[index]?.rewriteAttemptCount || 1,
        };
        return { ...proj, chapters };
      });
      addMessage("assistant", `Chapter ${index + 1} — ${levelLabels[level]} complete! Re-evaluate to measure improvement.`);
    } catch (e: any) {
      if (!isCurrentChapterGeneration(targetProjectId, index, generationId)) {
        scriptoraLog.warn("rewrite-chapter", "Ignored stale rewrite error", { chapterIndex: index + 1, generationId, level, raw: e?.message });
        return;
      }
      updateAndSave(proj => {
        if (proj.id !== targetProjectId) return proj;
        const chapters = [...proj.chapters];
        if (chapters[index]) {
          const currentContent = stripGeneratedHeading(chapters[index].content || "");
          chapters[index] = {
            ...chapters[index],
            content: currentContent || chapters[index].content,
            status: hasRecoverableChapterContent(currentContent)
              ? "completed_with_warning" as GenerationStatus
              : "failed_empty" as GenerationStatus,
            rewriteInProgress: false,
            lastGenerationId: generationId,
          };
        }
        return { ...proj, chapters };
      });
      const err = classifyError(e);
      scriptoraLog.error("rewrite-chapter", formatUserMessage(err), { chapterIndex: index + 1, level, raw: e?.message });
      addMessage("assistant", `⚠️ Riscrittura capitolo ${index + 1} non completata: ${formatUserMessage(err)}. Ho conservato il testo esistente.`);
      toast.warning(`Riscrittura non completata. Testo esistente conservato.`);
    } finally {
      rewriteLocks.current.delete(index);
      clearChapterGenerationIfCurrent(targetProjectId, index, generationId);
      removeGenerating(genKey);
    }
  }, [project, generatingSet, addMessage, updateAndSave]);

  // Auto-rewrite until quality threshold met
  const autoRewriteToThreshold = useCallback(async (index: number, threshold: number, maxAttempts: number = 3) => {
    const p = getLatestProject() || project;
    if (await isFreeAiToolsLockedForProject(p)) {
      showFreeAiToolsLockedMessage(addMessage);
      return;
    }
    if (!p?.blueprint || !p.chapters[index]?.content) return;
    const genKey = `chapter-${index}`;
    if (generatingSet.has(genKey)) return;
    if ((p.chapters[index]?.rewriteAttemptCount || 0) >= 1) {
      addMessage("assistant", `⚠️ Capitolo ${index + 1}: rewrite automatico gia' usato. Evito un secondo passaggio per proteggere la versione migliore.`);
      return;
    }

    addMessage("assistant", `🎯 Auto-quality targeting ${threshold}/5 for Chapter ${index + 1}...`);

    const safeMaxAttempts = Math.min(maxAttempts, 1);
    for (let attempt = 0; attempt < safeMaxAttempts; attempt++) {
      // Evaluate
      addGenerating(`eval-${index}`);
      let rating: AIQualityRating;
      try {
        const latestP = getLatestProject() || p;
        rating = await runEvaluateChapterQuality(latestP.config, latestP.chapters[index], index, { projectId: latestP.id });
        updateAndSave(proj => {
          const chapters = [...proj.chapters];
          chapters[index] = { ...chapters[index], aiRating: rating, qualityRating: rating.score };
          return { ...proj, chapters };
        });
      } catch (evalErr: any) {
        scriptoraLog.warn("auto-rewrite", "Eval step failed — breaking auto-rewrite loop", { chapterIndex: index, raw: evalErr?.message });
        break;
      } finally {
        removeGenerating(`eval-${index}`);
      }

      if (rating!.score >= threshold) {
        addMessage("assistant", `✅ Chapter ${index + 1} reached ${rating!.score}/5 — threshold met!`);
        return;
      }

      // Rewrite with escalating levels
      const level: RewriteLevel = attempt === 0 ? "light" : attempt === 1 ? "deep" : "bestseller";
      addMessage("assistant", `Attempt ${attempt + 1}: Score ${rating!.score}/5 < ${threshold} — applying ${level} rewrite...`);
      await rewriteChapterWithDepth(index, level);

      // Wait for rewrite to finish
      await new Promise(resolve => setTimeout(resolve, 1000));

      addGenerating(`eval-${index}`);
      try {
        const afterRewrite = getLatestProject() || p;
        const postRating = await runEvaluateChapterQuality(afterRewrite.config, afterRewrite.chapters[index], index, { projectId: afterRewrite.id });
        updateAndSave(proj => {
          const chapters = [...proj.chapters];
          chapters[index] = { ...chapters[index], aiRating: postRating, qualityRating: postRating.score, rewriteInProgress: false };
          return { ...proj, chapters };
        });
        addMessage("assistant", `✅ Capitolo ${index + 1}: rewrite automatico completato. Nuovo score: ${postRating.score}/5.`);
      } catch (postEvalErr: any) {
        scriptoraLog.warn("auto-rewrite", "Post-rewrite eval failed", { chapterIndex: index, raw: postEvalErr?.message });
        addMessage("assistant", `✅ Capitolo ${index + 1}: rewrite automatico completato. Rivalutazione non disponibile ora.`);
      } finally {
        removeGenerating(`eval-${index}`);
      }

      return;
    }
    addMessage("assistant", `⚠️ Chapter ${index + 1}: limite rewrite automatico raggiunto. Revisiona manualmente se serve.`);
  }, [project, generatingSet, addMessage, updateAndSave, rewriteChapterWithDepth]);

  const updateConfig = useCallback((key: keyof BookConfig, value: any) => {
    updateAndSave(p => {
      const nextConfig = { ...p.config, [key]: value };
      const shouldSanitize = key === "bookTypeId" || key === "genre" || key === "subcategory" || key === "subgenre" || key === "category";
      const finalConfig = shouldSanitize ? sanitizeBookConfiguration(nextConfig).config : nextConfig;
      const genreLock = (key === "bookTypeId" || key === "genre" || key === "subcategory")
        ? buildGenreLock(finalConfig)
        : p.genreLock;
      return { ...p, config: finalConfig, genreLock };
    });
  }, [updateAndSave]);

  const updateChapterContent = useCallback((chapterIndex: number, content: string) => {
    updateAndSave(p => {
      const chapters = [...p.chapters];
      chapters[chapterIndex] = { ...chapters[chapterIndex], content };
      return { ...p, chapters };
    });
  }, [updateAndSave]);

  const updateChapterTitle = useCallback((chapterIndex: number, title: string) => {
    updateAndSave(p => {
      const chapters = [...p.chapters];
      while (chapters.length <= chapterIndex) {
        chapters.push({ title: resolveProjectChapterTitle(p, chapters.length), content: "", subchapters: [], status: "idle" });
      }
      const safeTitle = resolveProjectChapterTitle(p, chapterIndex, title);
      chapters[chapterIndex] = { ...chapters[chapterIndex], title: safeTitle };
      // Also sync the blueprint outline title so TOC, exports & sidebar stay aligned
      const blueprint = p.blueprint
        ? {
            ...p.blueprint,
            chapterOutlines: p.blueprint.chapterOutlines.map((o, i) =>
              i === chapterIndex ? { ...o, title: safeTitle } : o
            ),
          }
        : p.blueprint;
      return { ...p, chapters, blueprint };
    });
  }, [updateAndSave]);

  const updateSubchapterTitle = useCallback((chapterIndex: number, subIndex: number, title: string) => {
    updateAndSave(p => {
      const chapters = [...p.chapters];
      const ch = { ...chapters[chapterIndex] };
      const subs = [...ch.subchapters];
      subs[subIndex] = { ...subs[subIndex], title };
      ch.subchapters = subs;
      chapters[chapterIndex] = ch;
      return { ...p, chapters };
    });
  }, [updateAndSave]);

  const updateSubchapterContent = useCallback((chapterIndex: number, subIndex: number, content: string) => {
    updateAndSave(p => {
      const chapters = [...p.chapters];
      const ch = { ...chapters[chapterIndex] };
      const subs = [...ch.subchapters];
      subs[subIndex] = { ...subs[subIndex], content };
      ch.subchapters = subs;
      chapters[chapterIndex] = ch;
      return { ...p, chapters };
    });
  }, [updateAndSave]);

  const setChapterLengthOverride = useCallback((chapterIndex: number, length: string) => {
    updateAndSave(p => {
      const chapters = [...p.chapters];
      while (chapters.length <= chapterIndex) {
        chapters.push({ title: resolveProjectChapterTitle(p, chapters.length), content: "", subchapters: [], status: "idle" });
      }
      chapters[chapterIndex] = { ...chapters[chapterIndex], lengthOverride: length as any };
      return { ...p, chapters };
    });
  }, [updateAndSave]);

  // Manual edits to AI-generated structural content (blueprint, front/back matter)
  const updateBlueprintField = useCallback((field: "overview" | "emotionalArc", value: string) => {
    updateAndSave(p => {
      if (!p.blueprint) return p;
      return { ...p, blueprint: { ...p.blueprint, [field]: value } };
    });
  }, [updateAndSave]);

  const updateBlueprintOutlineTitle = useCallback((index: number, title: string) => {
    updateAndSave(p => {
      if (!p.blueprint) return p;
      const chapterOutlines = [...p.blueprint.chapterOutlines];
      if (!chapterOutlines[index]) return p;
      chapterOutlines[index] = {
        ...chapterOutlines[index],
        title: resolveChapterTitle(title, index, {
          config: p.config,
          summary: chapterOutlines[index]?.summary,
          totalChapters: p.config.numberOfChapters,
        }),
      };
      return { ...p, blueprint: { ...p.blueprint, chapterOutlines } };
    });
  }, [updateAndSave]);

  const updateBlueprintOutlineSummary = useCallback((index: number, summary: string) => {
    updateAndSave(p => {
      if (!p.blueprint) return p;
      const chapterOutlines = [...p.blueprint.chapterOutlines];
      if (!chapterOutlines[index]) return p;
      chapterOutlines[index] = { ...chapterOutlines[index], summary };
      return { ...p, blueprint: { ...p.blueprint, chapterOutlines } };
    });
  }, [updateAndSave]);

  const updateFrontMatterField = useCallback((field: string, value: string) => {
    updateAndSave(p => {
      const fm = { ...(p.frontMatter || {}) } as any;
      fm[field] = value;
      return { ...p, frontMatter: fm };
    });
  }, [updateAndSave]);

  const updateBackMatterField = useCallback((field: string, value: string) => {
    updateAndSave(p => {
      const bm = { ...(p.backMatter || {}) } as any;
      bm[field] = value;
      return { ...p, backMatter: bm };
    });
  }, [updateAndSave]);

  const loadProject = useCallback((p: BookProject) => {
    const baseConfig: BookConfig = {
      ...p.config,
      category: p.config.category || "Self Help",
      subcategory: p.config.subcategory || "Mindset",
      genre: p.config.genre || "self-help",
      bookLength: p.config.bookLength || "medium",
    };
    const resolvedAuthor = resolveAuthorIdentity(baseConfig.authorIdentity, baseConfig.authorIdentityId);
    const hasAuthorName = !!String(baseConfig.authorName || baseConfig.author || baseConfig.writerName || "").trim();
    const hydrated: BookProject = normalizeBookProject({
      ...p,
      config: normalizeBookConfig(
        resolvedAuthor
          ? applyAuthorIdentityToConfig(baseConfig, resolvedAuthor) as BookConfig
          : hasAuthorName
            ? baseConfig
            : applyAuthorIdentityToConfig(baseConfig, getSelectedAuthorIdentity()) as BookConfig,
      ),
    });
    const normalized = normalizeProjectChapterTitles(hydrated);

    setProject(normalized);
    syncRef(normalized);
    setLastProjectId(normalized.id);
    saveProject(normalized);
    scheduleRemoteSave(normalized, syncCallbacks);
    setMessages([{ id: (
typeof crypto !== "undefined" &&
typeof crypto.randomUUID === "function"
? crypto.randomUUID()
: `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
), role: "system", content: `Loaded project: "${normalized.config.title}" — Phase: ${normalized.phase}`, timestamp: new Date().toISOString() }]);
  }, [syncCallbacks]);

  const handleUserMessage = useCallback((content: string) => {
    addMessage("user", content);
    addMessage("assistant", "I'm here to help! Use the controls to generate your book step by step.");
  }, [addMessage]);

  const isGeneratingSection = useCallback((key: string) => generatingSet.has(key), [generatingSet]);

  // === ONE-CLICK FULL BOOK GENERATION ===
  // Esegue tutta la pipeline in sequenza: front-matter -> tutti i capitoli -> back-matter
  // onSectionFocus permette al chiamante di auto-navigare alla sezione corrente
  const generateFullBook = useCallback(async (onSectionFocus?: (section: any) => void) => {
    const start = getLatestProject() || project;
    try {
      assertProjectReadyForGeneration(start);
    } catch (e) {
      if (e instanceof ProjectGenerationBlockedError) {
        handleGenerationBlocked(e, addMessage, "generation");
        onSectionFocus?.("blueprint");
        return;
      }
      throw e;
    }
    addMessage("assistant", "🚀 Avvio generazione completa del libro...");
    toast.success("Generazione libro completo avviata");

    try {
      // 1) Front matter (se abilitato e mancante)
      let cur = getLatestProject() || start;
      if (isFrontMatterEnabled(cur.config) && !cur.frontMatter) {
        onSectionFocus?.("front-matter");
        await generateFrontMatterSection();
        await new Promise(r => setTimeout(r, 300));
      } else if (!isFrontMatterEnabled(cur.config) && cur.phase === "front-matter") {
        updateAndSave(pr => ({ ...pr, phase: "chapters" as GenerationPhase }));
      }

      // 2) Tutti i capitoli in sequenza (coerenza garantita: ogni capitolo legge i precedenti)
      cur = getLatestProject() || start;
      const fullBookPlan = await getActivePlanForEngine();
      const fullBookMaxWords = getPlanLimits(fullBookPlan).maxWordsPerBook;
      const total = cur.config.numberOfChapters;
      let chapterFailures = 0;
      for (let i = 0; i < total; i++) {
        const latest = getLatestProject() || cur;

        if (countProjectWordsHard(latest) >= fullBookMaxWords) {
          updateAndSave(p => ({ ...p, phase: "complete" as GenerationPhase }));
          const msg = `Limite piano raggiunto: generazione fermata a ${planLimitLabel(fullBookMaxWords)}.`;
          addMessage("assistant", `🔒 ${msg}`);
          toast.error(msg);
          break;
        }

        if (latest.chapters[i]?.content && latest.chapters[i].content.length > 200) {
          continue; // già scritto, salta
        }
        onSectionFocus?.(`chapter-${i}`);
        await generateSingleChapter(i);
        const afterChapterGen = getLatestProject();
        if (isGenerationFailureStatus(afterChapterGen?.chapters[i]?.status)) chapterFailures += 1;
        await new Promise(r => setTimeout(r, 400));

        const afterChapter = getLatestProject() || latest;
        const targetSubchapters = getActiveSubchaptersPerChapter(afterChapter);
        if (targetSubchapters > 0) {
          for (let subIndex = 0; subIndex < targetSubchapters; subIndex += 1) {
            const current = getLatestProject() || afterChapter;
            const existingSub = current.chapters?.[i]?.subchapters?.[subIndex];
            if (existingSub?.content && existingSub.content.length > 50) continue;
            onSectionFocus?.(`chapter-${i}-sub-${subIndex}`);
            await generateSingleSubchapter(i, subIndex);
            await new Promise(r => setTimeout(r, 250));
          }
        }
      }

      // 3) Back matter
      cur = getLatestProject() || start;
      if (countProjectWordsHard(cur) >= fullBookMaxWords) {
        updateAndSave(p => ({ ...p, phase: "complete" as GenerationPhase }));
        const msg = `Limite piano raggiunto: libro completato a ${planLimitLabel(fullBookMaxWords)}.`;
        addMessage("assistant", `🔒 ${msg}`);
        toast.error(msg);
        return;
      }

      if (isBackMatterEnabled(cur.config) && !cur.backMatter) {
        if (cur.phase !== "back-matter") {
          updateAndSave(p => ({ ...p, phase: "back-matter" as GenerationPhase }));
          await new Promise(r => setTimeout(r, 200));
        }
        onSectionFocus?.("back-matter");
        await generateBackMatterSection();
      } else if (!isBackMatterEnabled(cur.config)) {
        updateAndSave(pr => ({ ...pr, phase: "complete" as GenerationPhase }));
      }

      const finalProject = getLatestProject() || cur;
      const incompleteChapters = finalProject.chapters.filter(
        (ch, idx) => idx < total && (!ch?.content || ch.content.length <= 200),
      ).length;
      const failedCount = chapterFailures + incompleteChapters;

      if (failedCount > 0) {
        addMessage("assistant", `⚠️ Libro parzialmente generato: ${failedCount} capitolo/i non completati. Riprova dalle sezioni in errore.`);
        toast.warning(`Generazione parziale: ${failedCount} capitolo/i da completare.`);
      } else {
        addMessage("assistant", "🎉 Libro completo! Pronto per l'esportazione.");
        toast.success("Libro completato! Esporta in EPUB, PDF, DOCX o TXT");
      }
    } catch (e: any) {
      const err = classifyError(e);
      scriptoraLog.error("generate-complete", formatUserMessage(err), { raw: e?.message });
      addMessage("assistant", `❌ Errore generazione: ${formatUserMessage(err)}`);
      toast.error(formatToastMessage(err) || "Generazione interrotta — riprova dalla sezione fallita");
    }
  }, [project, addMessage, generateFrontMatterSection, generateBackMatterSection, generateSingleChapter, generateSingleSubchapter, updateAndSave]);

  // === PARALLEL CHAPTER GENERATION (max 3 in flight) ===
  // Permette di generare più capitoli contemporaneamente mentre l'utente
  // continua a scrivere/chattare con Molly. Usa un semaforo a 3 slot.
  const PARALLEL_LIMIT = 3;
  const generateChaptersParallel = useCallback(async (indices: number[]) => {
    const p = getLatestProject() || project;
    if (!p?.blueprint) {
      toast.error("Genera prima il blueprint");
      return;
    }
    const queue = indices.filter((i) => {
      const ch = p.chapters[i];
      return !(ch?.content && ch.content.length > 200) && !generatingSet.has(`chapter-${i}`);
    });
    if (queue.length === 0) {
      toast.info("Nessun capitolo da generare");
      return;
    }
    addMessage("assistant", `🚀 Avvio ${queue.length} capitoli in parallelo (max ${PARALLEL_LIMIT} alla volta)...`);
    toast.success(`Generazione parallela avviata su ${queue.length} capitoli`);

    let cursor = 0;
    const runOne = async (): Promise<void> => {
      while (cursor < queue.length) {
        const idx = queue[cursor++];
        try {
          await generateSingleChapter(idx);
        } catch (e: any) {
          const err = classifyError(e);
          scriptoraLog.error("parallel-chapter", formatUserMessage(err), { chapterIndex: idx, raw: e?.message });
        }
      }
    };
    const workers = Array.from({ length: Math.min(PARALLEL_LIMIT, queue.length) }, () => runOne());
    await Promise.all(workers);
    addMessage("assistant", `✅ Generazione parallela completata.`);
    toast.success("Tutti i capitoli selezionati sono stati generati");
  }, [project, generatingSet, addMessage, generateSingleChapter]);

  const generateAllChaptersParallel = useCallback(async () => {
    const p = getLatestProject() || project;
    if (!p?.blueprint) return;
    const all = Array.from({ length: p.config.numberOfChapters }, (_, i) => i);
    await generateChaptersParallel(all);
  }, [project, generateChaptersParallel]);

  const cancelGeneration = useCallback((key?: string) => {
    if (key) {
      const ctrl = abortControllers.current.get(key);
      if (ctrl) { ctrl.abort(); abortControllers.current.delete(key); }
      removeGenerating(key);
      addMessage("assistant", `⛔ Generation cancelled.`);
    } else {
      abortControllers.current.forEach(ctrl => ctrl.abort());
      abortControllers.current.clear();
      setGeneratingSet(new Set());
      addMessage("assistant", `⛔ All generation cancelled.`);
    }
  }, [addMessage]);

  return {
    project, messages, isAnythingGenerating, generatingSet, chunkProgress,
    startNewBook, createProjectDraft, createProjectWithApprovedBlueprint,
    generateBlueprintForProject, approveBlueprint,
    regenerateBlueprint, createSafeBlueprint, autoCompleteBlueprintConfig,
    generateNext, generateFrontMatterSection, generateBackMatterSection, generateSingleChapter, generateSingleSubchapter,
    regenerateChapter, rewriteChapterWithDepth, evaluateChapter, autoRewriteToThreshold,
    updateChapterEditorialAnalysis,
    updateConfig, updateChapterContent, updateChapterTitle, updateSubchapterContent, updateSubchapterTitle,
    updateBlueprintField, updateBlueprintOutlineTitle, updateBlueprintOutlineSummary,
    updateFrontMatterField, updateBackMatterField,
    setChapterLengthOverride,
    loadProject, handleUserMessage, isGeneratingSection, cancelGeneration,
    generateFullBook,
    generateChaptersParallel, generateAllChaptersParallel,
  };
}
