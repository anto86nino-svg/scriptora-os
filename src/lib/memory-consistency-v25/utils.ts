import type { Chapter } from "@/types/book";

export function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function chapterCorpus(chapter: Chapter): string {
  const subs = (chapter.subchapters || []).map((sub) => sub.content).join("\n");
  return normalizeText(`${chapter.content}\n${subs}`);
}

export function allChapterCorpus(chapters: Chapter[]): string {
  return chapters.map(chapterCorpus).filter(Boolean).join("\n\n");
}

export function corpusForCharacter(name: string, chapters: Chapter[]): string {
  const lower = name.toLowerCase();
  return chapters
    .map(chapterCorpus)
    .filter((text) => text.toLowerCase().includes(lower))
    .join("\n");
}

export function extractSentences(text: string, limit = 8): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 18)
    .slice(0, limit);
}

export function firstMatchSentences(text: string, patterns: RegExp[], limit = 4): string[] {
  const hits: string[] = [];
  for (const sentence of extractSentences(text, 24)) {
    if (patterns.some((pattern) => {
      pattern.lastIndex = 0;
      return pattern.test(sentence);
    })) {
      hits.push(sentence.slice(0, 160));
    }
    if (hits.length >= limit) break;
  }
  return hits;
}

export function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function pairKey(a: string, b: string): string {
  return [a, b].sort((left, right) => left.localeCompare(right)).join("::");
}

export function pairLabel(a: string, b: string): string {
  return `${a} ↔ ${b}`;
}
