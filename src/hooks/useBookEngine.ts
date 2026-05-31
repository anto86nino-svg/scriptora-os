import { useState, useCallback, useRef } from "react";
import { BookProject, BookConfig, ChatMessage, GenerationPhase, GenerationStatus, AIQualityRating, getSubchaptersPerChapter } from "@/types/book";
import { saveProjectAsync, createProjectId, setLastProjectId, loadProjects as loadScopedProjects } from "@/services/storageService";
import { saveProject } from "@/lib/storage";
import { generateBlueprint, generateFrontMatter, generateChapter, generateChapterChunked, generateSubchapter, generateBackMatter, rewriteChapter, evaluateChapterQuality, RewriteLevel, ChunkProgress, buildGenreLock } from "@/lib/generation";
import { applyAuthorBrainToBackMatter, applyAuthorBrainToFrontMatter } from "@/lib/author-brain";
import type { BackMatter, FrontMatter } from "@/types/book";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { captureException } from "@/lib/monitoring";
import { trackEvent, trackFirstProjectCreated } from "@/lib/analytics";
import { fetchPlan } from "@/lib/plan";
import { isDevMode } from "@/lib/dev-mode";
import { getDevPlanOverride } from "@/lib/dev-plan-override";
import { getPlanLimits } from "@/lib/subscription";
import { normalizeProjectChapterTitles, resolveChapterTitle, formatChapterDisplayTitle } from "@/lib/chapter-titles";
import { ensureBookTitleMetadata } from "@/lib/title-shadow";
import { applyAuthorIdentityToConfig, enforceAuthorIdentityLock, getSelectedAuthorIdentity, resolveAuthorIdentity } from "@/lib/author-identity";
import { applyBookIntelligenceToConfig } from "@/lib/book-intelligence";
import { consumeAutoBestsellerHandoffPack } from "@/lib/auto-bestseller-architect";
import { refreshProjectNarrativeIntelligenceV2 } from "@/lib/narrative-intelligence-v2";
import { validateBookConfig, repairBookConfigBasics, configsDiffer, type ConfigBlockedPayload } from "@/lib/project-config-validation";
import { isSupabaseJwtAuthError, normalizeFunctionErrorMessage } from "@/lib/supabase-function-auth";
import { recordDailyWords } from "@/lib/immersive/gateway-daily-goal";

const FREE_MAX_PROJECT_WORDS = 10_000;

type ProjectWordCountCache = {
  id: string;
  updatedAt: string;
  count: number;
} | null;

let projectWordCountCache: ProjectWordCountCache = null;

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
  if (projectWordCountCache?.id === project.id && projectWordCountCache.updatedAt === project.updatedAt) {
    return projectWordCountCache.count;
  }

  let total = 0;
  total += countWordsSafe(project.frontMatter);
  total += countWordsSafe(project.backMatter);
  for (const chapter of project.chapters || []) {
    total += countWordsSafe(chapter?.content);
    for (const sub of chapter?.subchapters || []) total += countWordsSafe(sub?.content);
  }

  projectWordCountCache = { id: project.id, updatedAt: project.updatedAt, count: total };
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
  const target = getSubchaptersPerChapter(project.config);
  if (target <= 0) return [];
  const missing: Array<{ chapterIndex: number; subIndex: number }> = [];
  for (let chapterIndex = 0; chapterIndex < Math.max(0, project.config?.numberOfChapters || 0); chapterIndex += 1) {
    const chapter = project.chapters?.[chapterIndex];
    if (!chapter?.content || chapter.content.trim().length <= 50) continue;
    for (let subIndex = 0; subIndex < target; subIndex += 1) {
      const sub = chapter.subchapters?.[subIndex];
      if (!sub?.content || sub.content.trim().length <= 50) missing.push({ chapterIndex, subIndex });
    }
  }
  return missing;
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
    if (p) saveProjectAsync(p.project, p.cbs).catch(() => {
      toast.warning(t("toast_saved_locally"));
    });
  }, 1500);
}

export interface SyncCallbacks {
  onSaving?: () => void;
  onSaved?: () => void;
  onPending?: () => void;
  onOffline?: () => void;
  onConfigBlocked?: (payload: ConfigBlockedPayload) => void;
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
  const PROGRESS_RENDER_MS = 150; // ~6fps for streaming text — perceptually smooth
  const SAVE_THROTTLE_MS = 1000;  // local IDB save throttled during streaming

  const syncRef = (p: BookProject | null) => { projectRef.current = p; };
  const isAnythingGenerating = generatingSet.size > 0;
  const configBlockedRef = useRef(syncCallbacks?.onConfigBlocked);
  configBlockedRef.current = syncCallbacks?.onConfigBlocked;

  const addGenerating = (key: string) => setGeneratingSet(prev => new Set(prev).add(key));
  const removeGenerating = (key: string) => setGeneratingSet(prev => {
    const next = new Set(prev);
    next.delete(key);
    return next;
  });

  const addMessage = useCallback((role: ChatMessage["role"], content: string) => {
    const msg: ChatMessage = { id: crypto.randomUUID(), role, content, timestamp: new Date().toISOString() };
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

  const blockIfConfigInvalid = useCallback((p: BookProject | null): boolean => {
    if (!p) {
      configBlockedRef.current?.({ issues: [{ id: "missing_title" }] });
      return true;
    }

    const repaired = repairBookConfigBasics(p.config);
    const issues = validateBookConfig(repaired);
    if (issues.length === 0) {
      if (configsDiffer(repaired, p.config)) {
        updateAndSave((prev) => ({ ...prev, config: repaired }));
      }
      return false;
    }

    configBlockedRef.current?.({ issues, config: p.config });
    return true;
  }, [updateAndSave]);

  const blockIfBookConfigInvalid = useCallback((config: BookConfig): boolean => {
    const repaired = repairBookConfigBasics(config);
    const issues = validateBookConfig(repaired);
    if (issues.length === 0) return false;
    configBlockedRef.current?.({ issues, config });
    return true;
  }, []);

  const reportGenerationFailure = useCallback((e: unknown, p: BookProject | null) => {
    captureException(e, { area: "generation", extra: { projectId: p?.id } });
    if (blockIfConfigInvalid(p)) return;

    const message = normalizeFunctionErrorMessage(e);
    if (isSupabaseJwtAuthError(message)) {
      toast.error("Sessione non valida. Esci e accedi di nuovo, poi riprova.");
      return;
    }
    if (/credits exhausted|API key invalid|Missing Supabase|DEEPSEEK_API_KEY not configured|Servizio AI/i.test(message)) {
      toast.error(message);
      return;
    }
    toast.error(message.trim() || t("toast_gen_failed"));
  }, [blockIfConfigInvalid]);

  const ensureBlueprintOrNotify = useCallback((p: BookProject | null): p is BookProject & { blueprint: NonNullable<BookProject["blueprint"]> } => {
    if (!p) {
      configBlockedRef.current?.({ issues: [{ id: "missing_title" }] });
      return false;
    }
    if (blockIfConfigInvalid(p)) return false;
    if (!p.blueprint) {
      toast.error(t("writer_pipeline_hint_blueprint"));
      return false;
    }
    return true;
  }, [blockIfConfigInvalid]);

  const getLatestProject = (): BookProject | null => projectRef.current;

  const startNewBook = useCallback(async (config: BookConfig) => {
    const activePlan = await getActivePlanForEngine();

    if (activePlan === "free") {
      const existingProjects = await loadScopedProjects().catch(() => []);
      if (existingProjects.length > 0) {
        const msg = "Hai già usato il libro gratuito. Passa a Pro/Premium per creare altri libri.";
        addMessage("assistant", `🔒 ${msg}`);
        toast.error(msg);
        return;
      }
    }

    const handoff = consumeAutoBestsellerHandoffPack();

    const titleSafeInput = ensureBookTitleMetadata(handoff?.config || config, {
      genre: (handoff?.config || config).genre,
      category: (handoff?.config || config).category,
      subcategory: (handoff?.config || config).subcategory,
      targetAudience: (handoff?.config || config).tone,
      language: (handoff?.config || config).language,
    });
    const authorSafeInput = enforceAuthorIdentityLock(
      applyAuthorIdentityToConfig(
        titleSafeInput,
        resolveAuthorIdentity(titleSafeInput.authorIdentity, titleSafeInput.authorIdentityId) || getSelectedAuthorIdentity(),
      ) as BookConfig,
    );
    const intelligenceSafeInput = applyBookIntelligenceToConfig(authorSafeInput);
    const maxProjectWords = getPlanLimits(activePlan).maxWordsPerBook;
    const safeConfig: BookConfig = activePlan === "free"
      ? {
          ...intelligenceSafeInput,
          bookLength: "short",
          customTotalWords: Math.min(intelligenceSafeInput.customTotalWords ?? FREE_MAX_PROJECT_WORDS, FREE_MAX_PROJECT_WORDS),
        }
      : {
          ...intelligenceSafeInput,
          customTotalWords: intelligenceSafeInput.bookLength === "custom"
            ? Math.min(intelligenceSafeInput.customTotalWords ?? maxProjectWords, maxProjectWords)
            : intelligenceSafeInput.customTotalWords,
        };

    if (blockIfBookConfigInvalid(safeConfig)) return;

    // Genre Lock — capture editorial blueprint at creation time so the
    // entire book stays consistent (no drift between chapters/front/back).
    const genreLock = buildGenreLock(safeConfig);
    const newProject: BookProject = {
      id: createProjectId(),
      config: safeConfig,
      blueprint: null, frontMatter: null, chapters: [], backMatter: null,
      phase: "blueprint",
      genreLock,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProject(newProject);
    syncRef(newProject);
    setMessages([]);
    saveProject(newProject);
    saveProjectAsync(newProject, syncCallbacks).catch(() => {
      toast.warning(t("toast_saved_locally"));
    });

    trackFirstProjectCreated({ genre: safeConfig.genre });
    trackEvent("book_generation_started", { phase: "blueprint" });

    addMessage("system", `Starting book: "${safeConfig.title}" — ${safeConfig.numberOfChapters} chapters, ${safeConfig.language}, ${safeConfig.genre}, ${safeConfig.bookLength} book`);

    if (handoff?.blueprint) {
      addMessage("assistant", `Market-aware blueprint loaded for "${handoff.summary.selectedTitle}".`);
      addMessage(
        "assistant",
        `✓ Market analyzed\n✓ Blueprint created (${handoff.blueprint.chapterOutlines.length} chapters)\n✓ Emotional architecture prepared\n✓ Writing memory initialized\n\nReview the narrative architecture, then generate front matter or chapters when you're ready.`,
      );
      updateAndSave((p) => ({
        ...p,
        blueprint: handoff.blueprint,
        longBookMemory: handoff.memorySeed,
        phase: "front-matter" as GenerationPhase,
      }));
      return;
    }

    addGenerating("blueprint");

    try {
      addMessage("assistant", "Building narrative blueprint…");
      const blueprint = await generateBlueprint(safeConfig, genreLock, { projectId: newProject.id });
      updateAndSave(p => ({ ...p, blueprint, phase: "front-matter" as GenerationPhase }));
      addMessage("assistant", `Blueprint ready! ${blueprint.chapterOutlines.length} chapters planned.`);
    } catch (e: any) {
      addMessage("assistant", `❌ Error: ${e.message}`);
      reportGenerationFailure(e, newProject);
    } finally {
      removeGenerating("blueprint");
    }
  }, [addMessage, updateAndSave, blockIfBookConfigInvalid, reportGenerationFailure]);

  const generateBlueprintSection = useCallback(async () => {
    const p = getLatestProject() || project;
    if (!p || p.blueprint || generatingSet.has("blueprint")) return;
    if (blockIfConfigInvalid(p)) return;

    addGenerating("blueprint");
    try {
      addMessage("assistant", "Building narrative blueprint…");
      const blueprint = await generateBlueprint(p.config, p.genreLock, { projectId: p.id });
      updateAndSave((pr) => ({ ...pr, blueprint, phase: "front-matter" as GenerationPhase }));
      addMessage("assistant", `Blueprint ready! ${blueprint.chapterOutlines.length} chapters planned.`);
    } catch (e: any) {
      addMessage("assistant", `❌ Error: ${e.message}`);
      reportGenerationFailure(e, getLatestProject() || p);
    } finally {
      removeGenerating("blueprint");
    }
  }, [project, addMessage, updateAndSave, generatingSet, blockIfConfigInvalid, reportGenerationFailure]);

  const generateFrontMatterSection = useCallback(async () => {
    const p = getLatestProject() || project;
    if (!ensureBlueprintOrNotify(p)) return;

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
      const fm = await generateFrontMatter(latestP.config, latestP.blueprint!, latestP.genreLock, { projectId: latestP.id });
      updateAndSave(pr => ({
        ...pr,
        frontMatter: fm,
        phase: pr.phase === "front-matter" ? "chapters" : pr.phase,
        frontMatterStatus: "completed" as GenerationStatus,
      }));
      addMessage("assistant", "Front matter complete!");
    } catch (e: any) {
      updateAndSave(pr => ({ ...pr, frontMatterStatus: "error" as GenerationStatus }));
      addMessage("assistant", `❌ Error: ${e.message}`);
      reportGenerationFailure(e, getLatestProject() || p);
    } finally {
      removeGenerating("front-matter");
    }
  }, [project, addMessage, updateAndSave, ensureBlueprintOrNotify, reportGenerationFailure]);

  const generateBackMatterSection = useCallback(async () => {
    const p = getLatestProject() || project;
    if (!ensureBlueprintOrNotify(p)) return;

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
      const bm = await generateBackMatter(latestP.config, latestP.blueprint!, latestP.chapters, latestP.genreLock, { projectId: latestP.id });
      updateAndSave(pr => ({ ...pr, backMatter: bm, phase: "complete", backMatterStatus: "completed" as GenerationStatus }));
      addMessage("assistant", "🎉 Book generation complete!");
      trackEvent("book_generation_completed", { projectId: latestP.id });
    } catch (e: any) {
      updateAndSave(pr => ({ ...pr, backMatterStatus: "error" as GenerationStatus }));
      addMessage("assistant", `❌ Error: ${e.message}`);
      reportGenerationFailure(e, getLatestProject() || p);
    } finally {
      removeGenerating("back-matter");
    }
  }, [project, addMessage, updateAndSave, ensureBlueprintOrNotify, reportGenerationFailure]);

  const generateNext = useCallback(async () => {
    const p = getLatestProject() || project;
    if (!p) return;
    if (blockIfConfigInvalid(p)) return;

    if (!p.frontMatter || p.phase === "front-matter") {
      await generateFrontMatterSection();
      return;
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

    if (!p.backMatter || p.phase === "back-matter") {
      await generateBackMatterSection();
    }
  }, [project, addMessage, updateAndSave, generateFrontMatterSection, generateBackMatterSection, blockIfConfigInvalid]);

  const generateSingleChapter = useCallback(async (index: number) => {
    const p = getLatestProject() || project;
    if (!ensureBlueprintOrNotify(p)) return;
    const genKey = `chapter-${index}`;
    if (generatingSet.has(genKey)) return;

    const maxProjectWords = await getMaxProjectWordsForActivePlan();
    if (countProjectWordsHard(p) >= maxProjectWords) {
      const msg = `Limite piano raggiunto: hai completato ${planLimitLabel(maxProjectWords)}.`;
      addMessage("assistant", `🔒 ${msg}`);
      toast.error(msg);
      updateAndSave(pr => ({ ...pr, phase: "complete" as GenerationPhase }));
      return;
    }

    addGenerating(genKey);
    trackEvent("book_generation_started", { phase: "chapter", chapter: index });
    updateAndSave(proj => {
      const chapters = [...proj.chapters];
      while (chapters.length <= index) {
        chapters.push({ title: resolveProjectChapterTitle(proj, chapters.length), content: "", subchapters: [], status: "idle" });
      }
      chapters[index] = { ...chapters[index], title: resolveProjectChapterTitle(proj, index, chapters[index]?.title), status: "generating" };
      return { ...proj, chapters };
    });

    try {
      addMessage("assistant", `Writing Chapter ${index + 1}... ✍️`);
      const latestP = getLatestProject() || p;
      const prevChapters = latestP.chapters.filter((_, i) => i < index && latestP.chapters[i]?.content?.length > 0);
      const chapterOverride = latestP.chapters[index]?.lengthOverride;

      const chapter = await generateChapterChunked(
        latestP.config, latestP.blueprint!, index, prevChapters, chapterOverride,
        (progress) => {
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
            const chapters = [...proj.chapters];
            while (chapters.length <= index) {
              chapters.push({ title: resolveProjectChapterTitle(proj, chapters.length), content: "", subchapters: [], status: "idle" });
            }
            chapters[index] = {
              ...chapters[index],
              title: resolveProjectChapterTitle(proj, index, chapters[index]?.title),
              content: progress.content,
              status: "generating" as GenerationStatus,
            };
            return { ...proj, chapters };
          });
        },
        latestP.genreLock,
        { usage: { projectId: latestP.id }, longBookMemory: latestP.longBookMemory },
      );

      const activePlanAfterGeneration = await getActivePlanForEngine();
      const maxProjectWordsAfterGeneration = getPlanLimits(activePlanAfterGeneration).maxWordsPerBook;

      updateAndSave(proj => {
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

        chapters[index] = { ...finalChapter, status: "completed" as GenerationStatus, lengthOverride: proj.chapters[index]?.lengthOverride };
        const allGenerated = chapters.length >= proj.config.numberOfChapters && chapters.every(c => c.content.length > 0);
        return refreshProjectNarrativeIntelligenceV2({
          ...proj,
          chapters,
          phase: nextPhase === "complete" ? nextPhase : (allGenerated ? "back-matter" as GenerationPhase : proj.phase),
        });
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
      updateAndSave(proj => {
        const chapters = [...proj.chapters];
        if (chapters[index]) chapters[index] = { ...chapters[index], status: "error" as GenerationStatus };
        return { ...proj, chapters };
      });
      addMessage("assistant", `❌ Error generating Chapter ${index + 1}: ${e.message}`);
      reportGenerationFailure(e, getLatestProject() || p);
    } finally {
      removeGenerating(genKey);
      setChunkProgress(prev => { const next = { ...prev }; delete next[genKey]; return next; });
      lastProgressRenderAt.current.delete(`chapter-${index}`);
      lastSaveAt.current.delete(`chapter-${index}`);
    }
  }, [project, generatingSet, addMessage, updateAndSave, ensureBlueprintOrNotify, reportGenerationFailure]);

  const generateSingleSubchapter = useCallback(async (chapterIndex: number, subIndex: number) => {
    const p = getLatestProject() || project;
    if (!ensureBlueprintOrNotify(p)) return;
    const chapter = p.chapters[chapterIndex];
    if (!chapter) return;
    const genKey = `chapter-${chapterIndex}-sub-${subIndex}`;
    if (generatingSet.has(genKey)) return;

    addGenerating(genKey);
    try {
      addMessage("assistant", `Writing Subchapter ${subIndex + 1} of Chapter ${chapterIndex + 1}... ✍️`);
      const prevChapters = p.chapters.filter((_, i) => i < chapterIndex);
      const sub = await generateSubchapter(p.config, p.blueprint, chapterIndex, subIndex, chapter, prevChapters, p.genreLock, { projectId: p.id });
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
      addMessage("assistant", `❌ Error: ${e.message}`);
      reportGenerationFailure(e, getLatestProject() || p);
    } finally {
      removeGenerating(genKey);
    }
  }, [project, generatingSet, addMessage, updateAndSave, ensureBlueprintOrNotify, reportGenerationFailure]);

  const regenerateChapter = useCallback(async (index: number) => {
    const p = getLatestProject() || project;
    if (!ensureBlueprintOrNotify(p)) return;
    const genKey = `chapter-${index}`;
    if (generatingSet.has(genKey)) return;

    addGenerating(genKey);
    updateAndSave(proj => {
      const chapters = [...proj.chapters];
      if (chapters[index]) chapters[index] = { ...chapters[index], status: "generating" as GenerationStatus };
      return { ...proj, chapters };
    });

    try {
      addMessage("assistant", `Regenerating Chapter ${index + 1}... 🔄`);
      const latestP = getLatestProject() || p;
      const prevChapters = latestP.chapters.slice(0, index);
      const chapter = await generateChapter(
        latestP.config,
        latestP.blueprint!,
        index,
        prevChapters,
        latestP.chapters[index]?.lengthOverride,
        latestP.genreLock,
        { projectId: latestP.id },
        latestP.longBookMemory,
      );
      updateAndSave(proj => {
        const chapters = [...proj.chapters];
        chapters[index] = {
          ...chapter,
          title: resolveProjectChapterTitle(proj, index, chapter.title),
          status: "completed" as GenerationStatus,
          lengthOverride: proj.chapters[index]?.lengthOverride,
        };
        return refreshProjectNarrativeIntelligenceV2({ ...proj, chapters });
      });
      addMessage("assistant", `Chapter ${index + 1} regenerated!`);
    } catch (e: any) {
      updateAndSave(proj => {
        const chapters = [...proj.chapters];
        if (chapters[index]) chapters[index] = { ...chapters[index], status: "error" as GenerationStatus };
        return { ...proj, chapters };
      });
      addMessage("assistant", `❌ Error: ${e.message}`);
      reportGenerationFailure(e, getLatestProject() || p);
    } finally {
      removeGenerating(genKey);
    }
  }, [project, generatingSet, addMessage, updateAndSave, ensureBlueprintOrNotify, reportGenerationFailure]);

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
      const rating = await evaluateChapterQuality(p.config, p.chapters[index], index, { projectId: p.id });
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

  // Smart Rewrite with levels
  const rewriteChapterWithDepth = useCallback(async (index: number, level: RewriteLevel = "deep") => {
    const p = getLatestProject() || project;
    if (await isFreeAiToolsLockedForProject(p)) {
      showFreeAiToolsLockedMessage(addMessage);
      return;
    }
    if (!ensureBlueprintOrNotify(p) || !p.chapters[index]) return;
    const genKey = `chapter-${index}`;
    if (generatingSet.has(genKey)) return;

    addGenerating(genKey);
    updateAndSave(proj => {
      const chapters = [...proj.chapters];
      chapters[index] = { ...chapters[index], status: "generating" as GenerationStatus };
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
      const chapter = await rewriteChapter(
        latestP.config, latestP.blueprint!, latestP.chapters[index], index,
        latestP.chapters.slice(0, index), instruction, aiRating, level, { projectId: latestP.id }
      );
      updateAndSave(proj => {
        const chapters = [...proj.chapters];
        chapters[index] = {
          ...chapter,
          title: resolveProjectChapterTitle(proj, index, chapter.title),
          status: "completed" as GenerationStatus,
          aiRating: undefined,
          qualityRating: undefined,
          lengthOverride: proj.chapters[index]?.lengthOverride,
        };
        return { ...proj, chapters };
      });
      addMessage("assistant", `Chapter ${index + 1} — ${levelLabels[level]} complete! Re-evaluate to measure improvement.`);
    } catch (e: any) {
      updateAndSave(proj => {
        const chapters = [...proj.chapters];
        if (chapters[index]) chapters[index] = { ...chapters[index], status: "error" as GenerationStatus };
        return { ...proj, chapters };
      });
      addMessage("assistant", `❌ Error: ${e.message}`);
      reportGenerationFailure(e, getLatestProject() || p);
    } finally {
      removeGenerating(genKey);
    }
  }, [project, generatingSet, addMessage, updateAndSave, ensureBlueprintOrNotify, reportGenerationFailure]);

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

    addMessage("assistant", `🎯 Auto-quality targeting ${threshold}/5 for Chapter ${index + 1}...`);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Evaluate
      addGenerating(`eval-${index}`);
      let rating: AIQualityRating;
      try {
        const latestP = getLatestProject() || p;
        rating = await evaluateChapterQuality(latestP.config, latestP.chapters[index], index, { projectId: latestP.id });
        updateAndSave(proj => {
          const chapters = [...proj.chapters];
          chapters[index] = { ...chapters[index], aiRating: rating, qualityRating: rating.score };
          return { ...proj, chapters };
        });
      } catch {
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
    }
    addMessage("assistant", `⚠️ Chapter ${index + 1}: max attempts reached. Review manually.`);
  }, [project, generatingSet, addMessage, updateAndSave, rewriteChapterWithDepth]);

  const updateConfig = useCallback((key: keyof BookConfig, value: any) => {
    updateAndSave(p => ({ ...p, config: { ...p.config, [key]: value } }));
  }, [updateAndSave]);

  const updateChapterContent = useCallback((chapterIndex: number, content: string) => {
    updateAndSave(p => {
      const previous = p.chapters[chapterIndex]?.content ?? "";
      const delta = countWordsSafe(content) - countWordsSafe(previous);
      if (delta > 0) recordDailyWords(delta);

      const chapters = [...p.chapters];
      while (chapters.length <= chapterIndex) {
        chapters.push({
          title: resolveProjectChapterTitle(p, chapters.length),
          content: "",
          subchapters: [],
          status: "idle",
        });
      }
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
      const previous = p.chapters[chapterIndex]?.subchapters?.[subIndex]?.content ?? "";
      const delta = countWordsSafe(content) - countWordsSafe(previous);
      if (delta > 0) recordDailyWords(delta);

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

  const applyAuthorBrainFrontMatter = useCallback(() => {
    updateAndSave((p) => {
      const merged = applyAuthorBrainToFrontMatter(p.frontMatter || {}, p.config, "regenerate");
      if (!merged.aboutAuthor?.trim()) return p;
      return {
        ...p,
        frontMatter: { ...(p.frontMatter || {}), ...merged } as FrontMatter,
      };
    });
    toast.success(t("author_brain_apply_front_success"));
  }, [updateAndSave]);

  const applyAuthorBrainBackMatter = useCallback(() => {
    updateAndSave((p) => {
      const merged = applyAuthorBrainToBackMatter(p.backMatter || {}, p.config, "regenerate");
      const hasAuthorSections = Boolean(merged.otherBooks?.trim() || merged.followAuthor?.trim());
      if (!hasAuthorSections) return p;
      return {
        ...p,
        backMatter: { ...(p.backMatter || {}), ...merged } as BackMatter,
      };
    });
    toast.success(t("author_brain_apply_back_success"));
  }, [updateAndSave]);

  const loadProject = useCallback((p: BookProject) => {
    const baseConfig: BookConfig = {
      ...p.config,
      category: p.config.category || "Self Help",
      subcategory: p.config.subcategory || "Mindset",
      genre: p.config.genre || "self-help",
      bookLength: p.config.bookLength || "medium",
    };
    const hydrated: BookProject = {
      ...p,
      config: enforceAuthorIdentityLock(baseConfig),
    };
    const normalized = refreshProjectNarrativeIntelligenceV2(normalizeProjectChapterTitles(hydrated));

    setProject(normalized);
    syncRef(normalized);
    setLastProjectId(normalized.id);
    saveProject(normalized);
    scheduleRemoteSave(normalized, syncCallbacks);
    setMessages([{ id: crypto.randomUUID(), role: "system", content: `Loaded project: "${normalized.config.title}" — Phase: ${normalized.phase}`, timestamp: new Date().toISOString() }]);
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
    if (!ensureBlueprintOrNotify(start)) return;
    addMessage("assistant", "🚀 Avvio generazione completa del libro...");
    toast.success("Generazione libro completo avviata");

    try {
      // 1) Front matter (se mancante)
      let cur = getLatestProject() || start;
      if (!cur.frontMatter) {
        onSectionFocus?.("front-matter");
        await generateFrontMatterSection();
        await new Promise(r => setTimeout(r, 300));
      }

      // 2) Tutti i capitoli in sequenza (coerenza garantita: ogni capitolo legge i precedenti)
      cur = getLatestProject() || start;
      const fullBookPlan = await getActivePlanForEngine();
      const fullBookMaxWords = getPlanLimits(fullBookPlan).maxWordsPerBook;
      const total = cur.config.numberOfChapters;
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
        await new Promise(r => setTimeout(r, 400));

        const afterChapter = getLatestProject() || latest;
        const targetSubchapters = getSubchaptersPerChapter(afterChapter.config);
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

      if (!cur.backMatter) {
        // forza phase a back-matter se necessario
        if (cur.phase !== "back-matter") {
          updateAndSave(p => ({ ...p, phase: "back-matter" as GenerationPhase }));
          await new Promise(r => setTimeout(r, 200));
        }
        onSectionFocus?.("back-matter");
        await generateBackMatterSection();
      }

      addMessage("assistant", "🎉 Libro completo! Pronto per l'esportazione.");
      toast.success("Libro completato! Esporta in EPUB, PDF, DOCX o TXT");
    } catch (e: any) {
      addMessage("assistant", `❌ Errore generazione completa: ${e.message}`);
      toast.error("Generazione interrotta — riprova dalla sezione fallita");
    }
  }, [project, addMessage, generateFrontMatterSection, generateBackMatterSection, generateSingleChapter, generateSingleSubchapter, updateAndSave, ensureBlueprintOrNotify]);

  // === PARALLEL CHAPTER GENERATION (max 3 in flight) ===
  // Permette di generare più capitoli contemporaneamente mentre l'utente
  // continua a scrivere/chattare con Molly. Usa un semaforo a 3 slot.
  const PARALLEL_LIMIT = 3;
  const generateChaptersParallel = useCallback(async (indices: number[]) => {
    const p = getLatestProject() || project;
    if (!ensureBlueprintOrNotify(p)) return;
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
        } catch (e) {
          console.error(`Parallel chapter ${idx} failed:`, e);
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
    if (!ensureBlueprintOrNotify(p)) return;
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

  const clearProject = useCallback(() => {
    setProject(null);
    syncRef(null);
    setMessages([]);
    setGeneratingSet(new Set());
    setChunkProgress({});
    setLastProjectId("");
  }, []);

  const applyProjectConfig = useCallback((config: BookConfig) => {
    const p = getLatestProject() || project;
    if (!p) return;

    const titleSafeInput = ensureBookTitleMetadata(config, {
      genre: config.genre,
      category: config.category,
      subcategory: config.subcategory,
      targetAudience: config.tone,
      language: config.language,
    });
    const authorSafeInput = enforceAuthorIdentityLock(
      applyAuthorIdentityToConfig(
        titleSafeInput,
        resolveAuthorIdentity(titleSafeInput.authorIdentity, titleSafeInput.authorIdentityId) || getSelectedAuthorIdentity(),
      ) as BookConfig,
    );
    const intelligenceSafeInput = applyBookIntelligenceToConfig(authorSafeInput);
    const genreLock = buildGenreLock(intelligenceSafeInput);

    updateAndSave((prev) => ({
      ...prev,
      config: intelligenceSafeInput,
      genreLock,
    }));
    addMessage("system", `Configuration updated: "${intelligenceSafeInput.title}"`);
    toast.success(t("project_config_updated"));
  }, [project, addMessage, updateAndSave]);

  return {
    project, messages, isAnythingGenerating, generatingSet, chunkProgress,
    startNewBook, generateBlueprintSection, generateNext, generateFrontMatterSection, generateBackMatterSection, generateSingleChapter, generateSingleSubchapter,
    regenerateChapter, rewriteChapterWithDepth, evaluateChapter, autoRewriteToThreshold,
    updateConfig, updateChapterContent, updateChapterTitle, updateSubchapterContent, updateSubchapterTitle,
    updateBlueprintField, updateBlueprintOutlineTitle, updateBlueprintOutlineSummary,
    updateFrontMatterField, updateBackMatterField,
    applyAuthorBrainFrontMatter, applyAuthorBrainBackMatter,
    setChapterLengthOverride,
    loadProject, handleUserMessage, isGeneratingSection, cancelGeneration,
    generateFullBook,
    generateChaptersParallel, generateAllChaptersParallel,
    applyProjectConfig, clearProject,
  };
}
