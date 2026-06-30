import type { Chapter } from "@/types/book";
import {
  analyzeChapterContinuityAssembly,
  type ChapterContinuityAssemblyResult,
  repairChapterContinuityAssembly,
  type RegenerateSubchapterFn,
} from "@/lib/writer/chapter-continuity-assembly";
import { finalizeAssembledChapter } from "@/lib/writer/subchapter-pipeline";

export type CriticalFailureType =
  | "duplicate_scene"
  | "backward_time_travel"
  | "duplicate_decision"
  | "meeting_redone"
  | "duplicate_revelation"
  | "duplicate_threshold"
  | "causality_violation"
  | "corrupted_fragment";

export type CriticalFailure = {
  type: CriticalFailureType | string;
  message: string;
  subchapterIndex?: number;
  excerpt?: string;
};

export type NarrativeContinuityGateResult = {
  pass: boolean;
  score: number;
  criticalFailures: CriticalFailure[];
  assembly: ChapterContinuityAssemblyResult;
};

const AUTO_FAIL_TYPES = new Set<CriticalFailureType>([
  "duplicate_scene",
  "backward_time_travel",
  "duplicate_decision",
  "meeting_redone",
  "duplicate_revelation",
  "duplicate_threshold",
  "causality_violation",
  "corrupted_fragment",
]);

function mapErrorsToCriticalFailures(assembly: ChapterContinuityAssemblyResult): CriticalFailure[] {
  const failures: CriticalFailure[] = [];
  const seen = new Set<string>();

  for (const error of assembly.errors.filter((e) => e.severity === "critical")) {
    if (seen.has(error.message)) continue;
    seen.add(error.message);
    const type = assembly.criticalFailureTypes.find((t) =>
      error.message.toLowerCase().includes(t.replace(/_/g, " ").slice(0, 8)),
    ) || error.category;
    failures.push({
      type,
      message: error.message,
      subchapterIndex: error.subchapterIndex,
      excerpt: error.excerpt,
    });
  }

  return failures;
}

export const NARRATIVE_CONTINUITY_PASS_THRESHOLD = 60;

export function runNarrativeContinuityGate(
  chapter: Chapter,
  context?: { language?: string },
): NarrativeContinuityGateResult {
  const subs = (chapter.subchapters || []).filter((s) => String(s.content || "").trim());
  if (subs.length < 2) {
    const assembly = analyzeChapterContinuityAssembly({ subchapters: subs }, context);
    return {
      pass: true,
      score: subs.length ? 95 : 0,
      criticalFailures: [],
      assembly,
    };
  }

  const assembly = analyzeChapterContinuityAssembly({ subchapters: subs }, context);
  const criticalFailures = mapErrorsToCriticalFailures(assembly);
  const hasAutoFail = assembly.criticalFailureTypes.some((t) => AUTO_FAIL_TYPES.has(t as CriticalFailureType))
    || assembly.errors.some((e) => e.severity === "critical");

  const pass = !hasAutoFail && assembly.score >= NARRATIVE_CONTINUITY_PASS_THRESHOLD;

  return {
    pass,
    score: assembly.score,
    criticalFailures,
    assembly,
  };
}

export function shouldBlockChapterSave(gate: NarrativeContinuityGateResult): boolean {
  return !gate.pass;
}

export type EnsureContinuityBeforeSaveResult = {
  chapter: Chapter;
  gate: NarrativeContinuityGateResult;
  blocked: boolean;
  repaired: boolean;
};

export async function ensureChapterContinuityBeforeSave(
  chapter: Chapter,
  options: {
    language?: string;
    maxRegenAttemptsPerSubchapter?: number;
    regenerateSubchapter?: RegenerateSubchapterFn;
  } = {},
): Promise<EnsureContinuityBeforeSaveResult> {
  let working = chapter;
  let gate = runNarrativeContinuityGate(working, { language: options.language });
  if (gate.pass) {
    return { chapter: working, gate, blocked: false, repaired: false };
  }

  const subs = (working.subchapters || []).filter((s) => String(s.content || "").trim());
  if (subs.length < 2 || !options.regenerateSubchapter) {
    return { chapter: working, gate, blocked: true, repaired: false };
  }

  const repair = await repairChapterContinuityAssembly(working, {
    language: options.language,
    maxRegenAttemptsPerSubchapter: options.maxRegenAttemptsPerSubchapter ?? 2,
    regenerateSubchapter: options.regenerateSubchapter,
  });
  working = finalizeAssembledChapter(repair.chapter);
  gate = runNarrativeContinuityGate(working, { language: options.language });

  return {
    chapter: working,
    gate,
    blocked: shouldBlockChapterSave(gate),
    repaired: repair.repaired,
  };
}
