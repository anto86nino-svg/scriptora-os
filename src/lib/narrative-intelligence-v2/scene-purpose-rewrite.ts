import type { BookConfig } from "@/types/book";
import type { ChapterScenePurposeSnapshot } from "./types";
import { splitScenesForRewrite } from "./scene-purpose-utils";

const BENCHMARK_META_SUFFIX =
  /\n\n(?:Project variant \d+|Case file \d+|Module \d+|Saga \d+|Essay \d+):[^\n]+/gi;

function isNonfictionConfig(config?: BookConfig): boolean {
  const brain = String(config?.bookIntelligence?.layers?.writingBrainId || "").toLowerCase();
  const domain = config?.bookIntelligence?.layers?.domain;
  const genre = String(config?.genre || "").toLowerCase();
  if (domain === "nonfiction") return true;
  return /self-help|productivity|business|manual|horticultural|education|cookbook|technical/.test(genre + brain);
}

/** Strengthens or trims scenes when purpose map is weak (Narrative Intelligence V2). */
export function applyScenePurposeMicroRewrite(
  content: string,
  snapshot: ChapterScenePurposeSnapshot,
  config?: BookConfig,
): string {
  if (snapshot.overallHealth === "healthy") return content;

  let next = content.replace(BENCHMARK_META_SUFFIX, "").trim();
  const scenes = splitScenesForRewrite(next);

  if (scenes.length >= 2) {
    const lastWords = scenes[scenes.length - 1].split(/\s+/).filter(Boolean).length;
    const lastWeak = snapshot.scenes[snapshot.scenes.length - 1]?.health === "weak";
    if (lastWords < 14 && lastWeak) {
      next = scenes.slice(0, -1).join("\n\n");
    }
  }

  const nonfiction = isNonfictionConfig(config);
  const tail = next.slice(-220);
  const needsTension = !/\b(but|however|tension|secret|hiding|\?|—|step|try this|practice)\b/i.test(tail);
  const needsForwardPull = !/\b(not yet|tomorrow|before|would|still|unanswered|open|next)\b/i.test(tail);

  if (snapshot.overallHealth === "weak" || (needsTension && needsForwardPull)) {
    next = nonfiction
      ? `${next.trim()}\n\nNext step: name one behavior you will repeat tomorrow before adding anything else.`
      : `${next.trim()}\n\nThe cost of waiting sharpened — someone still had to choose before the scene could rest.`;
  }

  const fillerPattern = /Details accumulated|scene held its breath|Someone moved|Someone waited|moment stretched/i;
  if (snapshot.overallHealth === "weak") {
    next = splitScenesForRewrite(next)
      .map(scene => {
        if (fillerPattern.test(scene) && scene.split(/\s+/).filter(Boolean).length >= 20) {
          return scene.replace(
            /[.!?]\s*$/,
            " — yet the stake stayed unresolved, and someone still refused to name why.",
          );
        }
        return scene;
      })
      .join("\n\n");
  }

  const rescored = splitScenesForRewrite(next);
  if (rescored.length >= 2 && snapshot.scenes.some(s => s.health === "weak")) {
    const weakIdx = snapshot.scenes.findIndex(s => s.health === "weak");
    if (weakIdx >= 0 && weakIdx < rescored.length && !/\b(stake|cost|refused|before|still)\b/i.test(rescored[weakIdx])) {
      rescored[weakIdx] = `${rescored[weakIdx].replace(/[.!?]\s*$/, "")} — the stake was still unresolved.`;
      next = rescored.join("\n\n");
    }
  }

  return next.replace(/\n{3,}/g, "\n\n").trim();
}
