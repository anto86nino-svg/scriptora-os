import type { BookConfig } from "@/types/book";
import { scoreEmotionalRepetition, detectStaleBeatLoop } from "./narrative-beat-engine";
import { scoreSceneProgression } from "./scene-purpose-validator";
import { scoreAiTellDensity } from "./ai-detection-reduction";
import { wrapRetryWithVoicePreserve } from "./author-voice-preserve";

export interface ManuscriptQualityScores {
  emotionalRepetition: number;
  dialogueHumanity: number;
  characterConsistency: number;
  sceneProgression: number;
  readerEngagement: number;
  composite: number;
  passed: boolean;
  issues: string[];
}

function dialogueHumanityScore(text: string): number {
  const lines = text.match(/[«""][^«""\n]{6,}[»""]/g) || [];
  if (!lines.length) return 68;
  let human = 0;
  let perfect = 0;
  for (const line of lines) {
    if (/\.{2,}|—|…|\?.*—|forse|eh\b|ma\b|non so/i.test(line)) human++;
    if (/ti amo|capisco perfettamente|I understand completely|va tutto bene|it's okay/i.test(line)) perfect++;
  }
  return Math.round(Math.max(30, Math.min(94, 58 + (human / lines.length) * 30 - perfect * 8)));
}

function characterConsistencyScore(text: string, config?: BookConfig): number {
  const characters = Array.isArray(config?.characters) ? config!.characters : [];
  if (!characters.length) return 72;
  let score = 78;
  const names = characters.map((c) => String(c.name || "").trim()).filter(Boolean);
  for (const name of names) {
    if (!name) continue;
    const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (!re.test(text)) continue;
    if (/\b(orgoglios[oa]|proud|distant[ei]|cold)\b/i.test(String(characters.find((c) => c.name === name)?.personality || ""))) {
      if (/\b(ti amo|confesso tutto|I love you|I'm completely open)\b/i.test(text)) score -= 8;
    }
  }
  return Math.round(Math.max(35, Math.min(90, score)));
}

function readerEngagementScore(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  const questions = (text.match(/\?/g) || []).length;
  const hooks = (text.match(/\b(improvvisamente|ma|però|quando|allora|suddenly|but|when)\b/gi) || []).length;
  const opening = text.slice(0, 400);
  const openingStrength = /[.!?…]/.test(opening) && opening.split(/\s+/).length > 12 ? 12 : 0;
  return Math.round(Math.max(35, Math.min(92, 48 + Math.min(questions, 6) * 4 + Math.min(hooks, 12) * 2 + openingStrength)));
}

const THRESHOLDS = {
  emotionalRepetition: 58,
  dialogueHumanity: 55,
  characterConsistency: 52,
  sceneProgression: 50,
  readerEngagement: 48,
};

export function evaluateManuscriptQuality(
  text: string,
  priorText: string,
  config?: BookConfig,
): ManuscriptQualityScores {
  const issues: string[] = [];
  const emotionalRepetition = scoreEmotionalRepetition(text, priorText);
  const dialogueHumanity = dialogueHumanityScore(text);
  const characterConsistency = characterConsistencyScore(text, config);
  const sceneProgression = scoreSceneProgression(text);
  const readerEngagement = readerEngagementScore(text);
  const aiTell = scoreAiTellDensity(text);

  if (emotionalRepetition < THRESHOLDS.emotionalRepetition) issues.push("emotional_repetition");
  if (dialogueHumanity < THRESHOLDS.dialogueHumanity) issues.push("dialogue_perfection");
  if (characterConsistency < THRESHOLDS.characterConsistency) issues.push("character_drift");
  if (sceneProgression < THRESHOLDS.sceneProgression) issues.push("scene_stall");
  if (readerEngagement < THRESHOLDS.readerEngagement) issues.push("low_engagement");
  if (aiTell < 55) issues.push("ai_tells");
  if (detectStaleBeatLoop(text, priorText)) issues.push("beat_loop");

  const composite = Math.round(
    emotionalRepetition * 0.24 +
      dialogueHumanity * 0.2 +
      characterConsistency * 0.16 +
      sceneProgression * 0.18 +
      readerEngagement * 0.14 +
      aiTell * 0.08,
  );

  const passed = composite >= 62 && issues.length <= 1;

  return {
    emotionalRepetition,
    dialogueHumanity,
    characterConsistency,
    sceneProgression,
    readerEngagement,
    composite,
    passed,
    issues,
  };
}

export function buildManuscriptQualityRetryInstruction(
  result: ManuscriptQualityScores,
  config: BookConfig,
): string {
  if (result.passed) return "";
  const fixes: string[] = [];
  if (result.issues.includes("emotional_repetition") || result.issues.includes("beat_loop")) {
    fixes.push("Replace repeated emotional beats with a NEW consequence or action — not the same fear/confession reworded.");
  }
  if (result.issues.includes("dialogue_perfection")) {
    fixes.push("Add subtext, interruption, hesitation. Remove therapeutic clarity.");
  }
  if (result.issues.includes("character_drift")) {
    fixes.push("Restore character defenses and wounds — no out-of-character emotional surrender.");
  }
  if (result.issues.includes("scene_stall")) {
    fixes.push("Every paragraph must advance plot, tension, or revelation. Cut mood-only filler.");
  }
  if (result.issues.includes("low_engagement")) {
    fixes.push("Strengthen hook and end with unresolved tension or concrete stakes.");
  }
  if (result.issues.includes("ai_tells")) {
    fixes.push("Remove aphorism endings and generic metaphors. Add concrete sensory detail.");
  }
  return wrapRetryWithVoicePreserve(config, fixes.join("\n"));
}
