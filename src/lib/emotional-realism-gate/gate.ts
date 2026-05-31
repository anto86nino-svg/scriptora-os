import type { BookConfig, Chapter } from "@/types/book";
import type { BehavioralConsistencyReport } from "@/lib/behavioral-consistency";
import type { CharacterSupremacyProfile } from "@/lib/character-supremacy";
import type { DialogueHumanityReport } from "@/lib/dialogue-humanity";
import { enhanceDialogueHumanity } from "@/lib/dialogue-humanity";
import { humanizeNarrativeText } from "@/lib/HumanizerLayer";
import type { SubtextAnalysis } from "@/lib/subtext-engine";
import { rewriteExplainedEmotion } from "@/lib/subtext-engine";
import type { TensionEngineV2Snapshot } from "@/lib/tension-engine-v2";

export type EmotionalRealismReport = {
  version: 1;
  chapterIndex: number;
  evaluatedAt: string;
  credibleReactions: number;
  credibleTiming: number;
  credibleConflicts: number;
  credibleFears: number;
  realismScore: number;
  failedChecks: string[];
  passesGate: boolean;
};

const INCREDIBLE_FEAR_RESOLUTION = /\b(?:suddenly|all at a sudden|improvvisamente|in un istante).{0,40}(?:brave|coraggios|not afraid|nulla paura)/gi;
const INSTANT_CONFLICT_RESOLUTION = /\b(?:they hugged|si abbracciarono|made up|riconciliati).{0,30}(?:minutes|minuti|subito|immediately)/gi;

export function analyzeEmotionalRealism(input: {
  content: string;
  chapterIndex: number;
  profiles?: CharacterSupremacyProfile[];
  behavioral?: BehavioralConsistencyReport;
  subtext?: SubtextAnalysis;
  tension?: TensionEngineV2Snapshot;
  dialogue?: DialogueHumanityReport;
}): EmotionalRealismReport {
  const text = String(input.content || "");
  const failedChecks: string[] = [];

  const fearSignals = (text.match(/\b(fear|paura|afraid|terrified|trembl|tremor)\b/gi) || []).length;
  const actionDespiteFear = (text.match(/\b(still|e comunque|anyway|lo stesso|despite|nonostante).{0,30}(?:walked|entered|disse|said|went|andò)\b/gi) || []).length;
  const credibleReactions = Math.min(100, 40 + actionDespiteFear * 15 + (input.subtext?.subtextScore || 50) * 0.4);

  const credibleTiming = input.tension?.passesGate ? 75 : 45;
  if (!input.tension?.passesGate) failedChecks.push("Emotional timing too fast — payoff or reconciliation premature");

  const credibleConflicts = input.behavioral?.passesGate ? 80 : 40;
  if (!input.behavioral?.passesGate) {
    failedChecks.push(input.behavioral?.violations[0]?.message || "Behavioral inconsistency detected");
  }

  const credibleFears = fearSignals > 0 && !INCREDIBLE_FEAR_RESOLUTION.test(text) ? 78 : fearSignals > 0 ? 45 : 60;
  if (INCREDIBLE_FEAR_RESOLUTION.test(text)) failedChecks.push("Fear dissolved unrealistically fast");

  if (INSTANT_CONFLICT_RESOLUTION.test(text)) failedChecks.push("Conflict resolved without credible duration");

  if (input.dialogue && !input.dialogue.passesGate) {
    failedChecks.push("Dialogue sounds therapeutic or artificially mature");
  }

  if (input.subtext && input.subtext.metrics.explainedEmotion > 0) {
    failedChecks.push("Emotions explained instead of shown");
  }

  const realismScore = Math.round(
    credibleReactions * 0.25 +
      credibleTiming * 0.25 +
      credibleConflicts * 0.25 +
      credibleFears * 0.25,
  );

  return {
    version: 1,
    chapterIndex: input.chapterIndex,
    evaluatedAt: new Date().toISOString(),
    credibleReactions,
    credibleTiming,
    credibleConflicts,
    credibleFears,
    realismScore,
    failedChecks: failedChecks.slice(0, 5),
    passesGate: failedChecks.filter(c => /inconsistency|too fast|explained|therapeutic/i.test(c)).length === 0,
  };
}

export function applyEmotionalRealismMicroRewrite(
  text: string,
  report: EmotionalRealismReport,
  context: {
    config?: BookConfig;
    previousChapters?: Chapter[];
    chapterIndex?: number;
    outlineSummary?: string;
    subtext?: SubtextAnalysis;
  },
): string {
  let next = text;

  if (report.failedChecks.some(c => /explained/i.test(c))) {
    next = rewriteExplainedEmotion(next, context.subtext);
  }
  if (report.failedChecks.some(c => /therapeutic|Dialogue/i.test(c))) {
    next = enhanceDialogueHumanity(next);
  }
  if (report.failedChecks.some(c => /too fast|premature|reconcil/i.test(c))) {
    next = next
      .replace(/\b(?:they hugged|si abbracciarono|made up|riconciliati)\b/gi, "They stood apart, neither ready to close the distance")
      .replace(/\b(?:I love you|ti amo)\b/gi, "I shouldn't say this yet");
  }

  next = humanizeNarrativeText(next, {
    config: context.config,
    previousChapters: context.previousChapters,
    chapterIndex: context.chapterIndex,
    outlineSummary: context.outlineSummary,
  });

  return next.trim();
}

export type { EmotionalRealismReport };
