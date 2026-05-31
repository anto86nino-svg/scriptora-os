import type { BookConfig } from "@/types/book";
import { analyzeMemorability } from "@/lib/greatness-engine";
import { analyzeTensionV2 } from "@/lib/tension-engine-v2";
import type { SceneCompetitionReport, SceneVariant } from "./types";
import { clamp100, isImportantScene, joinScenes, splitScenes } from "./utils";

function tensionVariant(scene: string): string {
  if (/\?/.test(scene)) return scene;
  return `${scene.replace(/\.$/, "")} — but something refused to add up.`;
}

function memorableVariant(scene: string): string {
  if (/\b(but|yet|however|instead)\b/i.test(scene)) return scene;
  const sentences = scene.split(/(?<=[.!?])\s+/);
  if (sentences.length >= 2) {
    sentences[1] = `Some details stay — even when you want to forget them.`;
    return sentences.join(" ");
  }
  return `${scene} One detail would outlast the rest.`;
}

function sceneImpact(scene: string, config: BookConfig, chapterIndex: number): number {
  const tension = analyzeTensionV2({ content: scene, chapterIndex, config });
  const mem = analyzeMemorability(scene);
  return clamp100(tension.narrativeTension * 0.45 + mem.readerRecallScore * 0.55);
}

export function runSceneCompetition(input: {
  content: string;
  config: BookConfig;
  chapterIndex: number;
}): { content: string; report: SceneCompetitionReport } {
  const scenes = splitScenes(input.content);
  const winners: SceneVariant[] = [];
  let variantsGenerated = 0;
  let impactGainTotal = 0;

  const nextScenes = scenes.map((scene, index) => {
    if (!isImportantScene(scene, index, scenes.length)) return scene;

    const originalImpact = sceneImpact(scene, input.config, input.chapterIndex);
    const candidates: Array<{ label: SceneVariant["variantLabel"]; text: string; impact: number }> = [
      { label: "original", text: scene, impact: originalImpact },
      { label: "tension", text: tensionVariant(scene), impact: sceneImpact(tensionVariant(scene), input.config, input.chapterIndex) },
      { label: "memorable", text: memorableVariant(scene), impact: sceneImpact(memorableVariant(scene), input.config, input.chapterIndex) },
    ];
    variantsGenerated += 2;

    candidates.sort((a, b) => b.impact - a.impact);
    const winner = candidates[0];
    impactGainTotal += Math.max(0, winner.impact - originalImpact);

    if (winner.label !== "original") {
      winners.push({
        sceneIndex: index,
        original: scene.slice(0, 120),
        selected: winner.text.slice(0, 120),
        variantLabel: winner.label,
        impactScore: winner.impact,
      });
    }

    return winner.text;
  });

  return {
    content: joinScenes(nextScenes),
    report: {
      scenesEvaluated: scenes.filter((s, i) => isImportantScene(s, i, scenes.length)).length,
      variantsGenerated,
      winners: winners.slice(0, 8),
      averageImpactGain: winners.length ? clamp100(impactGainTotal / winners.length) : 0,
    },
  };
}
