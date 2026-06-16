import type { BookConfig, Chapter } from "@/types/book";
import {
  analyzeStoryStability,
  applyStoryBibleLock,
  applyStoryBibleLockWithReport,
  type StoryBibleLockContext,
} from "@/lib/StoryBibleLock";
import type { WritingEngineContext } from "./types";

export type CanonLockV2Result = {
  passed: boolean;
  text: string;
  criticalDrift: boolean;
  nameDrift: number;
  canonMutations: number;
  issues: string[];
};

export function buildCanonLockV2Block(config: BookConfig, _opts: WritingEngineContext = {}): string {
  const characters = Array.isArray(config.characters) ? config.characters : [];
  const nameList = characters.slice(0, 10).map((c) => [c.name, c.surname].filter(Boolean).join(" ").trim()).filter(Boolean);

  return `
CANON LOCK V2 (ABSOLUTE):
Before writing, verify: blueprint, character memory, active project canon, chapter continuity, protagonist truth, DNA lock.
NEVER rename characters. NEVER replace established names (Nora→Flora, Damian→Nathan, etc.).
NEVER change setting, relationship state, trauma history, world rules or timeline for convenience.

LOCKED CAST:
${nameList.length ? nameList.map((n) => `- ${n}`).join("\n") : "- infer from prior chapters; zero rename drift"}

HARD FAIL: wrong protagonist, wrong city, wrong relationship, wrong canon → rewrite before continuing.`;
}

function toStoryBibleContext(opts: WritingEngineContext): StoryBibleLockContext {
  return {
    config: opts.config,
    previousChapters: opts.previousChapters,
    chapterIndex: opts.chapterIndex,
    outlineSummary: opts.outlineSummary,
    storyBibleLockEnabled: true,
    storyEngineV11Enabled: true,
  };
}

export function validateCanonLockV2(text: string, opts: WritingEngineContext = {}): CanonLockV2Result {
  if (!text?.trim() || !opts.config) {
    return { passed: true, text, criticalDrift: false, nameDrift: 0, canonMutations: 0, issues: [] };
  }

  const context = toStoryBibleContext(opts);
  const beforeMetrics = analyzeStoryStability(text, context);
  const issues: string[] = [];

  if (beforeMetrics.nameDrift > 0) issues.push(`name_drift:${beforeMetrics.nameDrift}`);
  if (beforeMetrics.canonMutations > 0) issues.push(`canon_mutations:${beforeMetrics.canonMutations}`);

  const criticalDrift = beforeMetrics.nameDrift > 0 || beforeMetrics.canonMutations >= 2;
  const locked = applyStoryBibleLockWithReport(text, context);

  return {
    passed: !criticalDrift,
    text: locked.text,
    criticalDrift,
    nameDrift: beforeMetrics.nameDrift,
    canonMutations: beforeMetrics.canonMutations,
    issues,
  };
}

export function applyCanonLockV2Postprocess(text: string, opts: WritingEngineContext = {}): string {
  if (!text?.trim() || !opts.config) return text || "";
  return applyStoryBibleLock(text, toStoryBibleContext(opts));
}

export function validateCanonChunkBeforeMerge(
  chunkText: string,
  opts: WritingEngineContext & { accumulatedContent?: string },
): { reject: boolean; reason?: string } {
  if (!opts.config || !chunkText?.trim()) return { reject: false };

  const priorChapters = opts.previousChapters || [];
  const syntheticPrior: Array<Pick<Chapter, "title" | "content">> = [
    ...priorChapters,
    ...(opts.accumulatedContent
      ? [{ title: "Accumulated", content: opts.accumulatedContent }]
      : []),
  ];

  const check = validateCanonLockV2(chunkText, {
    ...opts,
    previousChapters: syntheticPrior,
  });

  if (check.criticalDrift) {
    return {
      reject: true,
      reason: check.issues.join(", ") || "canon_drift",
    };
  }
  return { reject: false };
}

export { analyzeStoryStability };
