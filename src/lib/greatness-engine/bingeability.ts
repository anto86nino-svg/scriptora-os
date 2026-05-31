import { evaluateChapterBestsellerIntel } from "@/lib/bestseller-intelligence";
import type { BookConfig } from "@/types/book";
import type { BingeabilityReport } from "./types";
import { clamp100, endingChars, splitScenes, wordCount } from "./utils";

export function analyzeBingeability(
  content: string,
  context: { config?: BookConfig; chapterIndex?: number } = {},
): BingeabilityReport {
  const text = String(content || "").trim();
  const ending = endingChars(text);
  const warnings: string[] = [];

  const bestseller = evaluateChapterBestsellerIntel({
    config: context.config || ({ genre: "literary-fiction" } as BookConfig),
    chapterIndex: context.chapterIndex ?? 0,
    content: text,
  });

  const questions = (text.match(/\?/g) || []).length;
  const wc = wordCount(text);
  const curiosityMomentum = clamp100(40 + (questions / Math.max(1, wc / 500)) * 35 + (questions >= 2 ? 12 : 0));

  const scenes = splitScenes(text);
  let cliffParagraphs = 0;
  for (const scene of scenes) {
    const lastSentence = scene.split(/(?<=[.!?])\s+/).pop() || "";
    if (/\?/.test(lastSentence) || /\b(?:but|yet|however|only|still|before|after|tomorrow|domani)\b/i.test(lastSentence)) {
      cliffParagraphs += 1;
    }
  }
  const pageTurnPressure = clamp100(42 + (cliffParagraphs / Math.max(1, scenes.length)) * 45);

  if (/(everything was fine|all was well|in conclusion|the end|fine del capitolo)/i.test(ending)) {
    warnings.push("Reader can stop easily — ending resolves too cleanly");
  }
  if (pageTurnPressure < 50) {
    warnings.push("Low page-turn pressure between scenes");
  }

  const narrativePull = clamp100(bestseller.scores.bingeability * 0.55 + pageTurnPressure * 0.25 + curiosityMomentum * 0.2);
  const compulsiveReadability = clamp100(
    bestseller.scores.readerRetention * 0.4 + narrativePull * 0.35 + curiosityMomentum * 0.25,
  );

  return {
    pageTurnPressure,
    curiosityMomentum,
    narrativePull,
    compulsiveReadability,
    passesGate: narrativePull >= 52 && pageTurnPressure >= 48,
    warnings,
  };
}

function cliffSuffix(config?: BookConfig): string {
  const genre = String(config?.genre || "").toLowerCase();
  const brain = String(config?.bookIntelligence?.layers?.writingBrainId || "").toLowerCase();
  if (/self-help|productivity|business|manual|horticultural/.test(genre + brain)) {
    return " — but the next step still waited.";
  }
  if (/thriller|mystery|crime/.test(genre + brain)) {
    return " — yet the record still did not match.";
  }
  if (/fantasy|sci-fi|myth|epic|dragon/.test(genre + brain)) {
    return " — yet the ward had not finished listening.";
  }
  return " — but the thread stayed hot.";
}

/** Adds page-turn pressure at scene breaks without new plot events (Greatness Engine). */
export function applyBingeabilityMicroRewrite(
  content: string,
  context: { config?: BookConfig; chapterIndex?: number } = {},
): string {
  const scenes = content
    .split(/\n\s*\n/)
    .map(s => s.trim())
    .filter(Boolean);
  if (!scenes.length) return content.trim();

  const enhanced = scenes.map((scene, index) => {
    const lastSentence = scene.split(/(?<=[.!?])\s+/).pop() || scene;
    const hasCliff =
      /\?/.test(lastSentence) ||
      /\b(?:but|yet|however|only|still|before|tomorrow|unanswered|waiting|not yet)\b/i.test(lastSentence);
    if (hasCliff || index === scenes.length - 1) return scene;
    return `${scene.replace(/[.!?]\s*$/, cliffSuffix(context.config))}`;
  });

  let next = enhanced.join("\n\n");
  const questions = (next.match(/\?/g) || []).length;
  if (questions < 2) {
    next = `${next.trim()}\n\nSomething still waited — unanswered.`;
  }

  const ending = next.slice(-180);
  if (!/\?/.test(ending) && !/\b(?:but|yet|still|before|tomorrow|unanswered)\b/i.test(ending)) {
    const genre = String(context.config?.genre || "").toLowerCase();
    const brain = String(context.config?.bookIntelligence?.layers?.writingBrainId || "").toLowerCase();
    const pull = context.config?.genre === "self-help"
      ? "What single behavior will you repeat before turning the page?"
      : /fantasy|sci-fi|myth|epic|dragon/.test(genre + brain)
        ? "The pact still held one condition — who had already broken it?"
        : "The next answer would not wait — so why stop here?";
    next = `${next.trim()}\n\n${pull}`;
  }

  return next.replace(/\n{3,}/g, "\n\n").trim();
}
