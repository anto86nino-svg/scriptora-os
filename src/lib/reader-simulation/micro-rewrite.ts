import { humanizeNarrativeText } from "@/lib/HumanizerLayer";
import { applyNarrativePullRewrite } from "./narrative-pull";
import type { BookConfig, Chapter } from "@/types/book";
import type { ReaderSimulationSnapshot } from "./types";

function injectClosingPull(text: string, config?: BookConfig): string {
  const trimmed = text.trim();
  if (/\?\s*$/.test(trimmed)) return text;
  if (/\b(unanswered|not yet\.|before you turn|next page|still open)\b/i.test(trimmed.slice(-90))) {
    return text;
  }
  const genre = String(config?.genre || "").toLowerCase();
  const brain = String(config?.bookIntelligence?.layers?.writingBrainId || "").toLowerCase();
  if (/self-help|productivity|business|manual|horticultural/.test(genre + brain)) {
    return `${trimmed}\n\nWhat will you avoid tomorrow — and what single behavior will you track for seven days?`;
  }
  if (/thriller|mystery|crime/.test(genre + brain)) {
    return `${trimmed}\n\nThe timestamp would not match — who had access to change it?`;
  }
  return `${trimmed}\n\nTomorrow would demand an answer she was not ready to give — so why did leaving feel impossible?`;
}

function injectCuriosityHook(text: string): string {
  const paragraphs = text.split(/\n\n+/);
  if (paragraphs.length < 2) return text;
  const opener = paragraphs[0].trim();
  if (/\?/.test(opener.slice(0, 200))) return text;
  paragraphs[0] = `${opener.replace(/\.$/, "")} — and the answer was not where anyone looked.`;
  return paragraphs.join("\n\n");
}

function trimEarlyPayoff(text: string): string {
  return text
    .replace(/\b(finally,? (?:understood|knew|felt at peace|found closure))\b/gi, "still did not know")
    .replace(/\b(it was all worth it)\b/gi, "the cost was not finished yet");
}

function shortenSkimBlocks(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  if (sentences.length < 8) return text;
  const trimmed = sentences.map(s => (s.split(/\s+/).length > 32 ? s.replace(/,\s+/g, ". ").slice(0, 180) + "…" : s));
  return trimmed.join(" ");
}

export function applyMicroReaderRewrite(
  text: string,
  simulation: ReaderSimulationSnapshot,
  context: {
    config?: BookConfig;
    previousChapters?: Chapter[];
    chapterIndex?: number;
    outlineSummary?: string;
  } = {},
): string {
  let next = text;

  if (simulation.earlyPayoffRisk || simulation.failedChecks.some(c => /too early/i.test(c))) {
    next = trimEarlyPayoff(next);
  }
  if (simulation.readingPace === "skimming") {
    next = shortenSkimBlocks(next);
  }
  if (simulation.curiosity < 70 || simulation.failedChecks.some(c => /curiosity|retention|predictable|skim/i.test(c))) {
    next = injectCuriosityHook(next);
    next = applyNarrativePullRewrite(next, context.config);
  } else if (simulation.retention < 55) {
    next = applyNarrativePullRewrite(next, context.config);
  }

  if (simulation.curiosity < 70 || simulation.retention < 55 || simulation.failedChecks.some(c => /curiosity/i.test(c))) {
    next = injectClosingPull(next, context.config);
  }

  next = humanizeNarrativeText(next, {
    config: context.config,
    previousChapters: context.previousChapters,
    chapterIndex: context.chapterIndex,
    outlineSummary: context.outlineSummary,
  });

  return next.trim();
}
