import type { SceneImpactScore } from "./types";
import { average, clampScore, splitScenes } from "./utils";

const GENERIC_SCENE = /\b(beautiful|bell|dark|buio|scary|inquiet|sad|triste|very)\b/i;
const TURN_PATTERNS = /\b(but|ma|però|suddenly|improvvisamente|then|poi|only|solo|realized|capì)\b/i;
const SENSORY = /\b(smell|odore|cold|freddo|taste|sapore|sound|rumore|touch|pelle|light|luce)\b/i;

function scoreSceneDimension(text: string, base: number, boosters: RegExp[], penalties: RegExp[]): number {
  let score = base;
  for (const pattern of boosters) {
    if (pattern.test(text)) score += 8;
  }
  for (const pattern of penalties) {
    if (pattern.test(text)) score -= 10;
  }
  return clampScore(score);
}

function buildMicroSurgery(scene: SceneImpactScore): string | undefined {
  if (!scene.weak) return undefined;
  if (scene.pageTurningPower < 55) {
    return "Chiudi la scena con una domanda, rischio o reveal parziale invece di riflessione.";
  }
  if (scene.uniqueness < 55) {
    return "Sostituisci un aggettivo generico con un dettaglio specifico e memorabile.";
  }
  if (scene.memorability < 55) {
    return "Aggiungi un micro-simbolo o gesto ricorrente che il lettore possa ricordare.";
  }
  if (scene.emotionalWeight < 55) {
    return "Mostra conseguenza emotiva con gesto/silenzio, non con dichiarazione esplicita.";
  }
  return "Accorcia esposizione e inserisci un turno di tensione nella scena.";
}

export function scoreSceneImpact(text: string, fiction: boolean): SceneImpactScore[] {
  const scenes = splitScenes(text);
  if (!scenes.length) {
    const fallback = text.trim().slice(0, 220);
    return [{
      sceneIndex: 0,
      excerpt: fallback,
      memorability: 45,
      emotionalWeight: 45,
      tension: 45,
      pageTurningPower: 45,
      uniqueness: 45,
      payoffValue: 45,
      average: 45,
      weak: true,
      microSurgery: "Suddividi in scene con obiettivo e conseguenza visibile.",
    }];
  }

  return scenes.map((scene, index) => {
    const memorability = scoreSceneDimension(scene, 48, [SENSORY, /[«""]/], [GENERIC_SCENE]);
    const emotionalWeight = scoreSceneDimension(scene, 46, [/silenz|quiet|remained|rimase|after|dopo/i], [/felt|era triste|pensò che/i]);
    const tension = scoreSceneDimension(scene, 44, [TURN_PATTERNS, /\?/, /\b(secret|danger|pericolo|segreto)\b/i], [/everything was fine|tutto ok/i]);
    const pageTurningPower = scoreSceneDimension(scene, 45, [TURN_PATTERNS, /\b(tomorrow|domani|before|prima che)\b/i], [/in conclusion|in summary/i]);
    const uniqueness = scoreSceneDimension(scene, 47, [/statua|faceless|wrong|sbagliat|only one|solo uno/i], [GENERIC_SCENE]);
    const payoffValue = scoreSceneDimension(scene, fiction ? 46 : 52, [/\b(because|perché|therefore|quindi|now|ora)\b/i], [/maybe|forse|somehow/i]);
    const avg = average([memorability, emotionalWeight, tension, pageTurningPower, uniqueness, payoffValue]);
    const impact: SceneImpactScore = {
      sceneIndex: index,
      excerpt: scene.slice(0, 140),
      memorability,
      emotionalWeight,
      tension,
      pageTurningPower,
      uniqueness,
      payoffValue,
      average: clampScore(avg),
      weak: avg < 58,
    };
    impact.microSurgery = buildMicroSurgery(impact);
    return impact;
  });
}

export function buildSceneImpactPromptBlock(): string {
  return `SCENE IMPACT SCORING:
Ogni scena deve puntare a: memorability, emotional weight, tension, page-turning power, uniqueness, payoff value.
Scene deboli → micro surgery: accorcia, aggiungi turno, dettaglio unico, o chiusura con tensione.`;
}
