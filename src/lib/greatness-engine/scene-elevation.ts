import type { SceneElevationOpportunity, SceneElevationReport } from "./types";
import { clamp100, splitScenes, splitSentences } from "./utils";

const FLAT_PATTERNS: Array<{ pattern: RegExp; penalty: number; reason: string }> = [
  { pattern: /\b(?:entered|walked into|went into|entrarono|entrò|andò in)\b/i, penalty: 18, reason: "Flat entrance — no hesitation or friction" },
  { pattern: /\b(?:was|were|era|erano) (?:sad|happy|triste|felice|angry|arrabbiat)\b/i, penalty: 20, reason: "Told emotion — no physical beat" },
  { pattern: /\b(?:it was a normal|giornata normale|nothing happened|nothing unusual)\b/i, penalty: 22, reason: "Scene lacks immediate tension" },
  { pattern: /\b(?:someone|qualcuno|something|qualcosa) (?:happened|accadde)\b/i, penalty: 14, reason: "Vague event — no concrete image" },
  { pattern: /\b(?:very|really|truly|quite|davvero)\b/i, penalty: 6, reason: "Empty intensifier weakens impact" },
];

const STRONG_SIGNALS: Array<{ pattern: RegExp; bonus: number }> = [
  { pattern: /\b(?:hesitated|paused|stopped|frosted|unread|silence|silenz|threshold|soglia)\b/i, bonus: 12 },
  { pattern: /\b(?:phone|telefono|door|porta|key|chiave|blood|sangue|rain|pioggia|light|luce)\b/i, bonus: 8 },
  { pattern: /\?/, bonus: 10 },
  { pattern: /\b(?:but|yet|however|ma|però|instead|invece)\b/i, bonus: 6 },
];

function scoreScene(scene: string): number {
  let score = 55;
  for (const flat of FLAT_PATTERNS) {
    flat.pattern.lastIndex = 0;
    if (flat.pattern.test(scene)) score -= flat.penalty;
  }
  for (const strong of STRONG_SIGNALS) {
    strong.pattern.lastIndex = 0;
    if (strong.pattern.test(scene)) score += strong.bonus;
  }
  const sentences = splitSentences(scene);
  if (sentences.some(s => s.split(/\s+/).length <= 8 && /[.!?]/.test(s))) score += 8;
  return clamp100(score);
}

function suggestElevation(scene: string, index: number): SceneElevationOpportunity | null {
  const entrance = scene.match(/^([^.!?]+(?:entered|walked into|went into|entrò|andò in)[^.!?]+[.!?])/i);
  if (entrance) {
    const name = entrance[0].match(/^(\w+)/)?.[1] || "They";
    const place = entrance[0].match(/(?:the|il|la|l')\s+([\w\s]+)/i)?.[1]?.trim() || "room";
    return {
      sceneIndex: index,
      original: entrance[0].trim(),
      suggested: `${name} hesitated on the threshold of the ${place}.`,
      reason: "Replace flat entrance with friction",
      dimension: "tension",
    };
  }

  const toldSad = scene.match(/\b(?:She|He|Elena|Marco|They) was sad\.?/i);
  if (toldSad) {
    return {
      sceneIndex: index,
      original: toldSad[0],
      suggested: "She let the phone ring unanswered.",
      reason: "Show emotion through action, not label",
      dimension: "emotion",
    };
  }

  if (/\b(?:was|were) (?:sad|happy|triste|felice)\b/i.test(scene) && !/\b(?:phone|door|hand|looked|guardò)\b/i.test(scene)) {
    return {
      sceneIndex: index,
      original: scene.slice(0, 80).trim(),
      suggested: "Concrete gesture replaces named feeling",
      reason: "No visual anchor for emotion",
      dimension: "visual",
    };
  }

  return null;
}

export function analyzeSceneElevation(content: string): SceneElevationReport {
  const scenes = splitScenes(content);
  const opportunities: SceneElevationOpportunity[] = [];
  const powers: number[] = [];

  scenes.forEach((scene, index) => {
    const power = scoreScene(scene);
    powers.push(power);
    if (power < 62) {
      const opp = suggestElevation(scene, index);
      if (opp) opportunities.push(opp);
    }
  });

  const averageScenePower = powers.length ? clamp100(powers.reduce((a, b) => a + b, 0) / powers.length) : 0;
  const weakScenes = powers.filter(p => p < 62).length;

  return {
    sceneCount: scenes.length,
    weakScenes,
    opportunities: opportunities.slice(0, 6),
    averageScenePower,
    passesGate: averageScenePower >= 62 && weakScenes <= Math.max(1, Math.floor(scenes.length * 0.4)),
  };
}
