import type { BookBlueprint, Chapter } from "@/types/book";
import type { StoryPromiseItem } from "./types";
import { chapterCorpus, extractSentences, firstMatchSentences } from "./utils";

const MYSTERY_PATTERNS = [
  /\b(mistero|mystery|segret[oi]|secret|non\s+sa(peva|per)|didn't\s+know|unanswered)\b/i,
];
const QUESTION_PATTERNS = [/\?\s*$/m, /\b(chi\s+era|who\s+was|perché|why\s+did|cosa\s+significava)\b/i];
const OBJECT_PATTERNS = [
  /\b(chiave|key|lettera|letter|anello|ring|foto|photograph|medaglione|locket|diario|journal)\b/i,
];
const SYMBOL_PATTERNS = [
  /\b(simbolo|symbol|richiamo|recurring|sempre\s+lo\s+stesso|same\s+image)\b/i,
];
const PAYOFF_PATTERNS = [
  /\b(promessa|promise|giurò|swore|doveva\s+ritornare|must\s+return|payoff)\b/i,
];
const TENSION_PATTERNS = [
  /\b(tensione|tension|cliffhanger|in\s+sospeso|unresolved|irrisolto)\b/i,
];

function classifySentence(sentence: string): StoryPromiseItem["type"] {
  if (PAYOFF_PATTERNS.some((pattern) => pattern.test(sentence))) return "payoff";
  if (OBJECT_PATTERNS.some((pattern) => pattern.test(sentence))) return "object";
  if (SYMBOL_PATTERNS.some((pattern) => pattern.test(sentence))) return "symbol";
  if (MYSTERY_PATTERNS.some((pattern) => pattern.test(sentence))) return "mystery";
  if (QUESTION_PATTERNS.some((pattern) => pattern.test(sentence))) return "question";
  return "tension";
}

function urgencyForChapter(chapterIndex: number, totalChapters: number): StoryPromiseItem["urgency"] {
  const ratio = chapterIndex / Math.max(totalChapters, 1);
  if (ratio >= 0.7) return "high";
  if (ratio >= 0.4) return "medium";
  return "low";
}

export function buildStoryPromiseTracker(
  chapters: Chapter[],
  blueprint: BookBlueprint | null,
  totalChapters: number,
): StoryPromiseItem[] {
  const items: StoryPromiseItem[] = [];

  chapters.forEach((chapter, index) => {
    const text = chapterCorpus(chapter);
    if (!text) return;
    const sentences = [
      ...firstMatchSentences(text, MYSTERY_PATTERNS, 2),
      ...firstMatchSentences(text, OBJECT_PATTERNS, 2),
      ...firstMatchSentences(text, PAYOFF_PATTERNS, 2),
      ...extractSentences(text, 6).filter((sentence) => QUESTION_PATTERNS.some((pattern) => pattern.test(sentence))),
      ...firstMatchSentences(text, TENSION_PATTERNS, 1),
    ];

    sentences.forEach((sentence, hitIndex) => {
      items.push({
        id: `promise-${index + 1}-${hitIndex}`,
        type: classifySentence(sentence),
        description: sentence.slice(0, 170),
        chapterIntroduced: index + 1,
        status: "open",
        urgency: urgencyForChapter(index + 1, totalChapters),
      });
    });
  });

  for (const outline of blueprint?.chapterOutlines || []) {
    const summary = outline.summary?.trim();
    if (!summary || summary.length < 24) continue;
    if (!MYSTERY_PATTERNS.some((pattern) => pattern.test(summary))
      && !OBJECT_PATTERNS.some((pattern) => pattern.test(summary))
      && !PAYOFF_PATTERNS.some((pattern) => pattern.test(summary))) continue;
    items.push({
      id: `blueprint-${items.length + 1}`,
      type: classifySentence(summary),
      description: summary.slice(0, 170),
      chapterIntroduced: 0,
      status: "open",
      urgency: "medium",
    });
  }

  const deduped = new Map<string, StoryPromiseItem>();
  for (const item of items) {
    const key = item.description.toLowerCase().slice(0, 80);
    if (!deduped.has(key)) deduped.set(key, item);
  }

  return [...deduped.values()].slice(0, 14);
}
