import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookProject } from "@/types/book";
import { resolveGenreKey } from "@/lib/genre-intelligence";
import { getEditorialTier } from "@/lib/editorial-mastery";
import { buildBlueprintIntegrityRuntimeBlock } from "@/lib/BlueprintIntegrityEngine";
import { buildSurgicalEditDirectiveBlock } from "@/lib/chapter-doctor-pro";
import { validateSurgicalPatchOutput } from "@/lib/surgical-edit-engine";
import { getCurrentUserId } from "@/services/storageService";
import { getScriptoraLanguage } from "@/lib/i18n";
import { toast } from "sonner";

export type JobKind = "dominate" | "patch";

export interface DominationJob {
  id: string; // `${kind}::${projectId}::${chapterIndex}`
  kind: JobKind;
  projectId: string;
  projectTitle: string;
  chapterIndex: number;
  chapterTitle: string;
  status: "running" | "ready" | "error";
  startedAt: number;
  finishedAt?: number;
  result?: any;
  error?: string;
}

interface DominationContextValue {
  jobs: Record<string, DominationJob>;
  startDominate: (project: BookProject, chapterIndex: number, opts?: { genreAutoFixBlock?: string }) => Promise<void>;
  startPatch: (project: BookProject, chapterIndex: number) => Promise<void>;
  applyJob: (jobId: string, onApply: (newContent: string) => void) => void;
  dismissJob: (jobId: string) => void;
  getJob: (projectId: string, chapterIndex: number, kind?: JobKind) => DominationJob | undefined;
  runningCount: number;
  readyCount: number;
}

const DominationContext = createContext<DominationContextValue | null>(null);

export function DominationProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Record<string, DominationJob>>({});

  const upsertJob = (job: DominationJob) =>
    setJobs(prev => ({ ...prev, [job.id]: job }));

  const startDominate = useCallback(async (project: BookProject, chapterIndex: number, opts?: { genreAutoFixBlock?: string }) => {
    const chapter = project.chapters[chapterIndex];
    if (!chapter?.content) {
      toast.error("Chapter is empty");
      return;
    }
    const id = `dominate::${project.id}::${chapterIndex}`;
    if (jobs[id]?.status === "running") {
      toast.info("Already dominating this chapter");
      return;
    }

    upsertJob({
      id,
      kind: "dominate",
      projectId: project.id,
      projectTitle: project.config.title || "Untitled",
      chapterIndex,
      chapterTitle: chapter.title,
      status: "running",
      startedAt: Date.now(),
    });
    const tierInfo = getEditorialTier(project.config.genre, (project.config as any).subcategory);
    const masteryMode = tierInfo.tier === "mastery";
    toast.success(
      masteryMode
        ? `🔥 Dominating "${chapter.title}" with Editorial Mastery Engine`
        : `🔥 Dominating "${chapter.title}" — runs in background`
    );

    try {
      const threshold = 8.5;
      // SINGLE-PASS by default. Multi-pass only when user explicitly requests
      // it via Dominate Mode amplifier (masteryMode). Saves ~50% latency & cost.
      const maxIterations = masteryMode ? 2 : 1;
      const passes: any[] = [];
      let currentText = chapter.content;
      let finalScore = 0;
      let finalScores: any = null;

      const genreKey = resolveGenreKey(project.config.genre, (project.config as any).subcategory);
      const blueprintIntegrityBlock = buildBlueprintIntegrityRuntimeBlock(project.config, project.blueprint, {
        chapterIndex,
        compact: true,
      });

      for (let iter = 1; iter <= maxIterations; iter++) {
        const { data, error } = await supabase.functions.invoke("dominate-chapter", {
          body: {
            chapterTitle: chapter.title,
            chapterText: currentText,
            genre: project.config.genre,
            subcategory: (project.config as any).subcategory,
            genreKey,
            tone: project.config.tone,
            language: project.config.language,
            reportLanguage: getScriptoraLanguage(),
            threshold,
            iteration: iter,
            genreAutoFixBlock: opts?.genreAutoFixBlock || "",
            blueprintIntegrityBlock,
            masteryMode,
            projectId: project.id,
            userId: getCurrentUserId(),
          },
        });
        if (error) throw new Error(error.message || "Edge function error");
        if (!data) throw new Error("No response");
        if (data.error) throw new Error(data.error);

        passes.push(data.pass);
        currentText = data.finalText;
        finalScore = data.finalScore;
        finalScores = data.finalScores;

        if (data.reachedThreshold) break;
      }

      const allReverted = passes.length > 0 && passes.every((p: any) => p?.revertedForVoice);
      const lastPass = passes[passes.length - 1];

      upsertJob({
        id,
        kind: "dominate",
        projectId: project.id,
        projectTitle: project.config.title || "Untitled",
        chapterIndex,
        chapterTitle: chapter.title,
        status: "ready",
        startedAt: jobs[id]?.startedAt || Date.now(),
        finishedAt: Date.now(),
        result: {
          passes,
          finalText: currentText,
          finalScore,
          finalScores,
          iterationsRun: passes.length,
          reachedThreshold: finalScore >= threshold,
          allReverted,
          voice: lastPass?.voice,
          revertReason: lastPass?.revertReason,
          voiceProfileUsed: lastPass?.voiceProfileUsed,
          rewriteConfidence: lastPass?.rewriteConfidence,
          masteryMode,
          tier: tierInfo.tier,
        },
      });
      if (allReverted) {
        toast.warning(`🛡️ Voice Guard [${lastPass?.voiceProfileUsed || genreKey}]: riscrittura scartata — voce autoriale preservata`);
      } else {
        const conf = lastPass?.rewriteConfidence;
        const confLabel = typeof conf === "number" ? ` · confidence ${(conf * 100).toFixed(0)}%` : "";
        if (masteryMode) {
          toast.success(`🔥 "${chapter.title}" ottimizzato con Editorial Mastery Engine — score ${finalScore?.toFixed(1)}/10${confLabel}`);
        } else {
          toast.success(`✅ "${chapter.title}" dominated — score ${finalScore?.toFixed(1)}/10${confLabel}`);
        }
      }
    } catch (e: any) {
      upsertJob({
        id,
        kind: "dominate",
        projectId: project.id,
        projectTitle: project.config.title || "Untitled",
        chapterIndex,
        chapterTitle: chapter.title,
        status: "error",
        startedAt: jobs[id]?.startedAt || Date.now(),
        finishedAt: Date.now(),
        error: e.message || "Domination failed",
      });
      toast.error(`❌ "${chapter.title}": ${e.message || "failed"}`);
    }
  }, [jobs]);

  const startPatch = useCallback(async (project: BookProject, chapterIndex: number) => {
    const chapter = project.chapters[chapterIndex];
    if (!chapter?.content) {
      toast.error("Chapter is empty");
      return;
    }
    const id = `patch::${project.id}::${chapterIndex}`;
    if (jobs[id]?.status === "running") {
      toast.info("Already patching this chapter");
      return;
    }

    upsertJob({
      id,
      kind: "patch",
      projectId: project.id,
      projectTitle: project.config.title || "Untitled",
      chapterIndex,
      chapterTitle: chapter.title,
      status: "running",
      startedAt: Date.now(),
    });
    toast.success(`✂️ Surgical Edit on "${chapter.title}" — running in background`);

    try {
      const blueprintBlock = buildBlueprintIntegrityRuntimeBlock(project.config, project.blueprint, {
        chapterIndex,
        compact: true,
      });
      const surgicalBlock = buildSurgicalEditDirectiveBlock({
        chapterText: chapter.content,
        project,
        chapterIndex,
      });
      const { data, error } = await supabase.functions.invoke("patch-chapter", {
        body: {
          chapterTitle: chapter.title,
          chapterText: chapter.content,
          genre: project.config.genre,
          tone: project.config.tone,
          language: project.config.language,
          reportLanguage: getScriptoraLanguage(),
          blueprintIntegrityBlock: [blueprintBlock, surgicalBlock].filter(Boolean).join("\n\n"),
          projectId: project.id,
          userId: getCurrentUserId(),
        },
      });
      if (error) throw new Error(error.message || "Edge function error");
      if (!data) throw new Error("No response");
      if (data.error) throw new Error(data.error);

      const validated = validateSurgicalPatchOutput(chapter.content, data);

      upsertJob({
        id,
        kind: "patch",
        projectId: project.id,
        projectTitle: project.config.title || "Untitled",
        chapterIndex,
        chapterTitle: chapter.title,
        status: "ready",
        startedAt: jobs[id]?.startedAt || Date.now(),
        finishedAt: Date.now(),
        result: validated,
      });
      toast.success(`✅ "${chapter.title}" — ${validated.patches?.length || 0} surgical edits (${validated.modificationPercent}%)`);
    } catch (e: any) {
      upsertJob({
        id,
        kind: "patch",
        projectId: project.id,
        projectTitle: project.config.title || "Untitled",
        chapterIndex,
        chapterTitle: chapter.title,
        status: "error",
        startedAt: jobs[id]?.startedAt || Date.now(),
        finishedAt: Date.now(),
        error: e.message || "Patch failed",
      });
      toast.error(`❌ "${chapter.title}": ${e.message || "failed"}`);
    }
  }, [jobs]);

  const applyJob = useCallback((jobId: string, onApply: (newContent: string) => void) => {
    const job = jobs[jobId];
    if (!job?.result) return;
    const newText = job.kind === "patch" ? job.result.patchedText : job.result.finalText;
    if (!newText) return;
    onApply(newText);
    setJobs(prev => {
      const next = { ...prev };
      delete next[jobId];
      return next;
    });
  }, [jobs]);

  const dismissJob = useCallback((jobId: string) => {
    setJobs(prev => {
      const next = { ...prev };
      delete next[jobId];
      return next;
    });
  }, []);

  const getJob = useCallback((projectId: string, chapterIndex: number, kind: JobKind = "dominate") =>
    jobs[`${kind}::${projectId}::${chapterIndex}`], [jobs]);

  const list = Object.values(jobs);
  const runningCount = list.filter(j => j.status === "running").length;
  const readyCount = list.filter(j => j.status === "ready").length;

  return (
    <DominationContext.Provider value={{ jobs, startDominate, startPatch, applyJob, dismissJob, getJob, runningCount, readyCount }}>
      {children}
    </DominationContext.Provider>
  );
}

export function useDomination() {
  const ctx = useContext(DominationContext);
  if (!ctx) throw new Error("useDomination must be used within DominationProvider");
  return ctx;
}
