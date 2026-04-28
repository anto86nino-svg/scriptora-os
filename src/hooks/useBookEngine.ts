import { useState, useCallback, useRef } from "react";
import { BookProject, BookConfig, ChatMessage, GenerationPhase, GenerationStatus, AIQualityRating } from "@/types/book";
import { saveProjectAsync, createProjectId, setLastProjectId, loadProjects as loadScopedProjects } from "@/services/storageService";
import { saveProject } from "@/lib/storage";
import { generateBlueprint, generateFrontMatter, generateChapter, generateChapterChunked, generateSubchapter, generateBackMatter, rewriteChapter, evaluateChapterQuality, RewriteLevel, ChunkProgress, buildGenreLock } from "@/lib/generation";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { fetchPlan } from "@/lib/plan";
import { isDevMode } from "@/lib/dev-mode";
import { getDevPlanOverride } from "@/lib/dev-plan-override";

const FREE_MAX_PROJECT_WORDS = 10_000;

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
  const marker = "[Fine anteprima gratuita — limite Free raggiunto.]";
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;

  const markerWords = marker.split(/\s+/).filter(Boolean);
  const allowedBodyWords = Math.max(0, maxWords - markerWords.length);
  return [...words.slice(0, allowedBodyWords), ...markerWords].join(" ");
}

async function getActivePlanForEngine() {
  return isDevMode() ? getDevPlanOverride() : await fetchPlan();
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
    if (p) saveProjectAsync(p.project, p.cbs).catch(() => {});
  }, 1500);
}

export interface SyncCallbacks {
  onSaving?: () => void;
  onSaved?: () => void;
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

    const safeConfig: BookConfig = activePlan === "free"
      ? {
          ...config,
          bookLength: "short",
          customTotalWords: Math.min(config.customTotalWords ?? FREE_MAX_PROJECT_WORDS, FREE_MAX_PROJECT_WORDS),
        }
      : config;

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
    saveProjectAsync(newProject, syncCallbacks).catch(() => {});

    addMessage("system", `Starting book: "${safeConfig.title}" — ${safeConfig.numberOfChapters} chapters, ${safeConfig.language}, ${safeConfig.genre}, ${safeConfig.bookLength} book`);
    addGenerating("blueprint");

    try {
      addMessage("assistant", "Generating book blueprint... 🏗️");
      const blueprint = await generateBlueprint(safeConfig, genreLock);
      updateAndSave(p => ({ ...p, blueprint, phase: "front-matter" as GenerationPhase }));
      addMessage("assistant", `Blueprint ready! ${blueprint.chapterOutlines.length} chapters planned.`);
    } catch (e: any) {
      addMessage("assistant", `❌ Error: ${e.message}`);
      toast.error(t("toast_gen_failed"));
    } finally {
      removeGenerating("blueprint");
    }
  }, [addMessage, updateAndSave]);

  const generateNext = useCallback(async () => {
    const p = getLatestProject() || project;
    if (!p) return;

    const activePlan = await getActivePlanForEngine();
    if (activePlan === "free" && countProjectWordsHard(p) >= FREE_MAX_PROJECT_WORDS) {
      const msg = "Limite Free raggiunto: hai completato le 10.000 parole gratuite.";
      addMessage("assistant", `🔒 ${msg}`);
      toast.error(msg);
      updateAndSave(pr => ({ ...pr, phase: "complete" as GenerationPhase }));
      return;
    }

    if (p.blueprint && (!p.frontMatter || p.phase === "front-matter")) {
      addGenerating("front-matter");
      updateAndSave(pr => ({ ...pr, frontMatterStatus: "generating" as GenerationStatus }));
      try {
        addMessage("assistant", "Generating front matter... 📖");
        const fm = await generateFrontMatter(p.config, p.blueprint, p.genreLock);
        updateAndSave(pr => ({
          ...pr,
          frontMatter: fm,
          // Only advance phase if we were still on front-matter; otherwise keep current phase.
          phase: pr.phase === "front-matter" ? "chapters" : pr.phase,
          frontMatterStatus: "completed" as GenerationStatus,
        }));
        addMessage("assistant", "Front matter complete!");
      } catch (e: any) {
        updateAndSave(pr => ({ ...pr, frontMatterStatus: "error" as GenerationStatus }));
        addMessage("assistant", `❌ Error: ${e.message}`);
        toast.error(t("toast_gen_failed"));
      } finally {
        removeGenerating("front-matter");
      }
    } else if (p.blueprint && !p.backMatter) {
      addGenerating("back-matter");
      updateAndSave(pr => ({
        ...pr,
        phase: "back-matter" as GenerationPhase,
        backMatterStatus: "generating" as GenerationStatus,
      }));
      try {
        addMessage("assistant", "Generating back matter... 📝");
        const latestP = getLatestProject() || p;
        const bm = await generateBackMatter(latestP.config, latestP.blueprint!, latestP.chapters, latestP.genreLock);
        updateAndSave(pr => ({ ...pr, backMatter: bm, phase: "complete", backMatterStatus: "completed" as GenerationStatus }));
        addMessage("assistant", "🎉 Book generation complete!");
      } catch (e: any) {
        updateAndSave(pr => ({ ...pr, backMatterStatus: "error" as GenerationStatus }));
        addMessage("assistant", `❌ Error: ${e.message}`);
        toast.error(t("toast_gen_failed"));
      } finally {
        removeGenerating("back-matter");
      }
    }
  }, [project, addMessage, updateAndSave]);

  const generateSingleChapter = useCallback(async (index: number) => {
    const p = getLatestProject() || project;
    if (!p?.blueprint) return;
    const genKey = `chapter-${index}`;
    if (generatingSet.has(genKey)) return;

    const activePlan = await getActivePlanForEngine();
    if (activePlan === "free" && countProjectWordsHard(p) >= FREE_MAX_PROJECT_WORDS) {
      const msg = "Limite Free raggiunto: hai completato le 10.000 parole gratuite.";
      addMessage("assistant", `🔒 ${msg}`);
      toast.error(msg);
      updateAndSave(pr => ({ ...pr, phase: "complete" as GenerationPhase }));
      return;
    }

    addGenerating(genKey);
    updateAndSave(proj => {
      const chapters = [...proj.chapters];
      while (chapters.length <= index) chapters.push({ title: "", content: "", subchapters: [], status: "idle" });
      chapters[index] = { ...chapters[index], status: "generating" };
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
            while (chapters.length <= index) chapters.push({ title: "", content: "", subchapters: [], status: "idle" });
            chapters[index] = {
              ...chapters[index],
              content: progress.content,
              status: "generating" as GenerationStatus,
            };
            return { ...proj, chapters };
          });
        },
        latestP.genreLock,
      );

      const activePlanAfterGeneration = await getActivePlanForEngine();

      updateAndSave(proj => {
        const chapters = [...proj.chapters];
        while (chapters.length <= index) chapters.push({ title: "", content: "", subchapters: [], status: "idle" });

        let finalChapter = { ...chapter };
        let nextPhase: GenerationPhase = proj.phase;

        if (activePlanAfterGeneration === "free") {
          const existingChapter = chapters[index];
          chapters[index] = { ...existingChapter, content: "", subchapters: [] } as any;
          const usedWithoutThisChapter = countProjectWordsHard({ ...proj, chapters });
          const remaining = Math.max(0, FREE_MAX_PROJECT_WORDS - usedWithoutThisChapter);

          finalChapter = {
            ...chapter,
            content: trimTextToWordLimit(chapter.content, remaining),
            subchapters: [],
          };

          if (remaining <= 0 || countWordsSafe(finalChapter.content) >= remaining) {
            nextPhase = "complete" as GenerationPhase;
          }
        }

        chapters[index] = { ...finalChapter, status: "completed" as GenerationStatus, lengthOverride: proj.chapters[index]?.lengthOverride };
        const allGenerated = chapters.length >= proj.config.numberOfChapters && chapters.every(c => c.content.length > 0);
        return { ...proj, chapters, phase: nextPhase === "complete" ? nextPhase : (allGenerated ? "back-matter" as GenerationPhase : proj.phase) };
      });

      const latestAfterSave = getLatestProject();
      const finalWords = countWordsSafe((latestAfterSave?.chapters?.[index]?.content || chapter.content));
      addMessage("assistant", `Chapter ${index + 1} "${chapter.title}" complete! ✅ (${finalWords} words)`);
      if (activePlanAfterGeneration === "free" && countProjectWordsHard(getLatestProject()) >= FREE_MAX_PROJECT_WORDS) {
        const msg = "Limite Free raggiunto: il libro gratuito è completo.";
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
      toast.error(t("toast_gen_failed"));
    } finally {
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
      const sub = await generateSubchapter(p.config, p.blueprint, chapterIndex, subIndex, chapter, prevChapters, p.genreLock);
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
    } finally {
      removeGenerating(genKey);
    }
  }, [project, generatingSet, addMessage, updateAndSave]);

  const regenerateChapter = useCallback(async (index: number) => {
    const p = getLatestProject() || project;
    if (!p?.blueprint) return;
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
      const chapter = await generateChapter(latestP.config, latestP.blueprint!, index, prevChapters, latestP.chapters[index]?.lengthOverride);
      updateAndSave(proj => {
        const chapters = [...proj.chapters];
        chapters[index] = { ...chapter, status: "completed" as GenerationStatus, lengthOverride: proj.chapters[index]?.lengthOverride };
        return { ...proj, chapters };
      });
      addMessage("assistant", `Chapter ${index + 1} regenerated!`);
    } catch (e: any) {
      updateAndSave(proj => {
        const chapters = [...proj.chapters];
        if (chapters[index]) chapters[index] = { ...chapters[index], status: "error" as GenerationStatus };
        return { ...proj, chapters };
      });
      addMessage("assistant", `❌ Error: ${e.message}`);
      toast.error(t("toast_gen_failed"));
    } finally {
      removeGenerating(genKey);
    }
  }, [project, generatingSet, addMessage, updateAndSave]);

  // AI Quality Evaluation
  const evaluateChapter = useCallback(async (index: number) => {
    const p = getLatestProject() || project;
    if (!p?.chapters[index]?.content) return;
    const genKey = `eval-${index}`;
    if (generatingSet.has(genKey)) return;

    addGenerating(genKey);
    try {
      addMessage("assistant", `Evaluating Chapter ${index + 1} quality... 🔍`);
      const rating = await evaluateChapterQuality(p.config, p.chapters[index], index);
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
    if (!p?.blueprint || !p.chapters[index]) return;
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
        latestP.chapters.slice(0, index), instruction, aiRating, level
      );
      updateAndSave(proj => {
        const chapters = [...proj.chapters];
        chapters[index] = { ...chapter, status: "completed" as GenerationStatus, aiRating: undefined, qualityRating: undefined, lengthOverride: proj.chapters[index]?.lengthOverride };
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
      toast.error(t("toast_gen_failed"));
    } finally {
      removeGenerating(genKey);
    }
  }, [project, generatingSet, addMessage, updateAndSave]);

  // Auto-rewrite until quality threshold met
  const autoRewriteToThreshold = useCallback(async (index: number, threshold: number, maxAttempts: number = 3) => {
    const p = getLatestProject() || project;
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
        rating = await evaluateChapterQuality(latestP.config, latestP.chapters[index], index);
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
      const chapters = [...p.chapters];
      chapters[chapterIndex] = { ...chapters[chapterIndex], content };
      return { ...p, chapters };
    });
  }, [updateAndSave]);

  const updateChapterTitle = useCallback((chapterIndex: number, title: string) => {
    updateAndSave(p => {
      const chapters = [...p.chapters];
      while (chapters.length <= chapterIndex) chapters.push({ title: "", content: "", subchapters: [], status: "idle" });
      chapters[chapterIndex] = { ...chapters[chapterIndex], title };
      // Also sync the blueprint outline title so TOC, exports & sidebar stay aligned
      const blueprint = p.blueprint
        ? {
            ...p.blueprint,
            chapterOutlines: p.blueprint.chapterOutlines.map((o, i) =>
              i === chapterIndex ? { ...o, title } : o
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
      while (chapters.length <= chapterIndex) chapters.push({ title: "", content: "", subchapters: [], status: "idle" });
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
      chapterOutlines[index] = { ...chapterOutlines[index], title };
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
    if (!p.config.category) p.config.category = "Self Help";
    if (!p.config.subcategory) p.config.subcategory = "Mindset";
    if (!p.config.genre) p.config.genre = "self-help";
    if (!p.config.bookLength) p.config.bookLength = "medium";

    setProject(p);
    syncRef(p);
    setLastProjectId(p.id);
    setMessages([{ id: crypto.randomUUID(), role: "system", content: `Loaded project: "${p.config.title}" — Phase: ${p.phase}`, timestamp: new Date().toISOString() }]);
  }, []);

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
    if (!start?.blueprint) {
      toast.error("Genera prima il blueprint");
      return;
    }
    addMessage("assistant", "🚀 Avvio generazione completa del libro...");
    toast.success("Generazione libro completo avviata");

    try {
      // 1) Front matter (se mancante)
      let cur = getLatestProject() || start;
      if (!cur.frontMatter) {
        onSectionFocus?.("front-matter");
        await generateNext();
        await new Promise(r => setTimeout(r, 300));
      }

      // 2) Tutti i capitoli in sequenza (coerenza garantita: ogni capitolo legge i precedenti)
      cur = getLatestProject() || start;
      const fullBookPlan = await getActivePlanForEngine();
      const total = cur.config.numberOfChapters;
      for (let i = 0; i < total; i++) {
        const latest = getLatestProject() || cur;

        if (fullBookPlan === "free" && countProjectWordsHard(latest) >= FREE_MAX_PROJECT_WORDS) {
          updateAndSave(p => ({ ...p, phase: "complete" as GenerationPhase }));
          addMessage("assistant", "🔒 Limite Free raggiunto: generazione fermata a 10.000 parole.");
          toast.error("Limite Free raggiunto");
          break;
        }

        if (latest.chapters[i]?.content && latest.chapters[i].content.length > 200) {
          continue; // già scritto, salta
        }
        onSectionFocus?.(`chapter-${i}`);
        await generateSingleChapter(i);
        await new Promise(r => setTimeout(r, 400));
      }

      // 3) Back matter
      cur = getLatestProject() || start;
      if (fullBookPlan === "free" && countProjectWordsHard(cur) >= FREE_MAX_PROJECT_WORDS) {
        updateAndSave(p => ({ ...p, phase: "complete" as GenerationPhase }));
        addMessage("assistant", "🔒 Demo Free completata. Passa a Pro/Premium per continuare.");
        toast.error("Demo Free completata");
        return;
      }

      if (!cur.backMatter) {
        // forza phase a back-matter se necessario
        if (cur.phase !== "back-matter") {
          updateAndSave(p => ({ ...p, phase: "back-matter" as GenerationPhase }));
          await new Promise(r => setTimeout(r, 200));
        }
        onSectionFocus?.("back-matter");
        await generateNext();
      }

      addMessage("assistant", "🎉 Libro completo! Pronto per l'esportazione.");
      toast.success("Libro completato! Esporta in EPUB, PDF, DOCX o TXT");
    } catch (e: any) {
      addMessage("assistant", `❌ Errore generazione completa: ${e.message}`);
      toast.error("Generazione interrotta — riprova dalla sezione fallita");
    }
  }, [project, addMessage, generateNext, generateSingleChapter, updateAndSave]);

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
    startNewBook, generateNext, generateSingleChapter, generateSingleSubchapter,
    regenerateChapter, rewriteChapterWithDepth, evaluateChapter, autoRewriteToThreshold,
    updateConfig, updateChapterContent, updateChapterTitle, updateSubchapterContent, updateSubchapterTitle,
    updateBlueprintField, updateBlueprintOutlineTitle, updateBlueprintOutlineSummary,
    updateFrontMatterField, updateBackMatterField,
    setChapterLengthOverride,
    loadProject, handleUserMessage, isGeneratingSection, cancelGeneration,
    generateFullBook,
    generateChaptersParallel, generateAllChaptersParallel,
  };
}
