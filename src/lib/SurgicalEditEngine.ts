export interface SurgicalEditOptions {
  preserveVoice?: boolean;
  preserveCanon?: boolean;
  intensity?: "low" | "medium" | "high";
}

export interface SurgicalResult {
  text: string;
  editsApplied: string[];
}

const AI_DIALOGUE_PATTERNS = [
  /i understand how you feel/gi,
  /i will always be here for you/gi,
  /you deserve better/gi,
  /i care about you deeply/gi,
  /i love you more than anything/gi,
  /everything will be okay/gi,
];

const PERFECT_DIALOGUE_PATTERNS = [
  /\bI understand\b/gi,
  /\bI know exactly how you feel\b/gi,
  /\bYou are not alone\b/gi,
  /\bI am here for you\b/gi,
];

function roughenDialogue(text: string): string {
  let result = text;

  result = result.replace(
    /I understand how you feel/gi,
    "I don't know... maybe I get it."
  );

  result = result.replace(
    /I will always be here for you/gi,
    "I'm still here, okay?"
  );

  result = result.replace(
    /You deserve better/gi,
    "Maybe... maybe this wasn't fair to you."
  );

  result = result.replace(
    /Everything will be okay/gi,
    "I don't know if it'll be okay."
  );

  result = result.replace(
    /\.\s+"/g,
    '.\n\n"'
  );

  return result;
}

function addSilenceInjection(text: string): string {
  const sentences = text.split(". ");

  if (sentences.length < 6) return text;

  const midpoint = Math.floor(sentences.length / 2);

  sentences.splice(
    midpoint,
    0,
    "Nobody said anything for a moment"
  );

  return sentences.join(". ");
}

function trimOverExplanation(text: string): string {
  return text
    .replace(/she felt devastated/gi, "her throat tightened")
    .replace(/he felt broken/gi, "he looked away")
    .replace(/she was heartbroken/gi, "she stopped speaking");
}

export function applyDialogueRoughening(
  text: string,
  options: SurgicalEditOptions = {}
): SurgicalResult {
  let edited = text;
  const editsApplied: string[] = [];

  const foundAiDialogue = AI_DIALOGUE_PATTERNS.some((p) =>
    p.test(text)
  );

  const foundPerfectDialogue = PERFECT_DIALOGUE_PATTERNS.some((p) =>
    p.test(text)
  );

  if (foundAiDialogue || foundPerfectDialogue) {
    edited = roughenDialogue(edited);
    editsApplied.push("dialogue_roughening");
  }

  edited = addSilenceInjection(edited);

  if (edited !== text) {
    editsApplied.push("silence_injection");
  }

  const trimmed = trimOverExplanation(edited);

  if (trimmed !== edited) {
    edited = trimmed;
    editsApplied.push("emotional_trimming");
  }

  return {
    text: edited,
    editsApplied,
  };
}

import {
  analyzeNovel,
  type EditorialWarning,
} from "./EditorialIntelligence";

function hasWarning(
  warnings: EditorialWarning[],
  type: string
): boolean {
  return warnings.some(
    (w) =>
      w.type === type &&
      (w.severity === "medium" ||
        w.severity === "high")
  );
}

export function applySurgicalEditingFromWarnings(
  text: string
): SurgicalResult {
  const analysis = analyzeNovel(text);

  let edited = text;
  const editsApplied: string[] = [];

  if (
    hasWarning(
      analysis.warnings,
      "dialogue_perfection"
    )
  ) {
    const result =
      applyDialogueRoughening(edited);

    edited = result.text;

    editsApplied.push(
      ...result.editsApplied
    );
  }

  return {
    text: edited,
    editsApplied,
  };
}
