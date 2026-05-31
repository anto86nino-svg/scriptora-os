import { humanizeNarrativeText } from "@/lib/HumanizerLayer";
import type { BookConfig, Chapter } from "@/types/book";
import type { ReaderSimulationSnapshot } from "./types";

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
  if (simulation.curiosity < 45 || simulation.failedChecks.some(c => /curiosity/i.test(c))) {
    next = injectCuriosityHook(next);
  }

  next = humanizeNarrativeText(next, {
    config: context.config,
    previousChapters: context.previousChapters,
    chapterIndex: context.chapterIndex,
    outlineSummary: context.outlineSummary,
  });

  return next.trim();
}
