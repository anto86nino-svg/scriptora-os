import type { BookConfig } from "@/types/book";
import { scoreEmotionalRepetition } from "@/lib/premium-writing/narrative-beat-engine";
import { scoreSceneProgression } from "@/lib/premium-writing/scene-purpose-validator";
import { scoreHumanNarrativeRealism } from "./post-process";

export interface GenerationExcellenceScores {
  aiSmellReduction: number;
  compulsiveReadability: number;
  emotionalRealism: number;
  dialogueHumanity: number;
  narrativeEscalation: number;
  commercialQuality: number;
  composite: number;
  phase: "human-v3";
}

function compulsiveReadabilityScore(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  const questions = (text.match(/\?/g) || []).length;
  const hooks = (text.match(/\b(ma|però|quando|improvvisamente|suddenly|but|when|then)\b/gi) || []).length;
  const cliff = (text.match(/[.!?…]["”»]?\s*$/m) || []).length;
  const density = (questions + hooks) / Math.max(1, words / 200);
  return Math.round(Math.max(25, Math.min(95, 48 + density * 12 + Math.min(15, cliff))));
}

function commercialQualityScore(text: string, config?: Partial<BookConfig>): number {
  const realism = scoreHumanNarrativeRealism(text);
  const hasTitle = Boolean(String(config?.title || "").trim());
  const lengthOk = text.split(/\s+/).length >= 120;
  return Math.round(
    Math.max(30, Math.min(92, (realism.aiSmell + realism.dialogueHumanity) / 2 + (hasTitle ? 5 : 0) + (lengthOk ? 8 : 0))),
  );
}

/** Phase 1 unified metrics — baseline before Greatness Engine. */
export function scoreGenerationExcellence(
  text: string,
  opts?: { priorText?: string; config?: Partial<BookConfig> },
): GenerationExcellenceScores {
  const prior = opts?.priorText || "";
  const realism = scoreHumanNarrativeRealism(text);
  const escalation = scoreEmotionalRepetition(text, prior);
  const sceneProgress = scoreSceneProgression(text);

  const aiSmellReduction = realism.aiSmell;
  const dialogueHumanity = realism.dialogueHumanity;
  const emotionalRealism = Math.round((realism.aiSmell + realism.poeticDensity + escalation) / 3);
  const narrativeEscalation = Math.round((escalation + sceneProgress) / 2);
  const compulsiveReadability = compulsiveReadabilityScore(text);
  const commercialQuality = commercialQualityScore(text, opts?.config);

  const composite = Math.round(
    (aiSmellReduction * 0.22 +
      compulsiveReadability * 0.18 +
      emotionalRealism * 0.2 +
      dialogueHumanity * 0.18 +
      narrativeEscalation * 0.12 +
      commercialQuality * 0.1),
  );

  return {
    aiSmellReduction,
    compulsiveReadability,
    emotionalRealism,
    dialogueHumanity,
    narrativeEscalation,
    commercialQuality,
    composite,
    phase: "human-v3",
  };
}
