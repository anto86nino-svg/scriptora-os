import type { SubChapter } from "@/types/book";
import { repairSubchapterSplitBoundaries } from "@/lib/writer/clean-text-pass";

export const MIN_REAL_SUBCHAPTER_CHARS = 80;

const PLACEHOLDER_RE =
  /^(?:|da generare|to be generated|placeholder|scena|scene|sottocapitolo|subchapter|contenuto|content|testo)$/i;

const DEFAULT_SUBCHAPTER_TITLES = [
  "Apertura",
  "Pressione",
  "Scelta",
  "Conseguenza",
  "Payoff",
  "Rivelazione",
  "Svolta",
  "Eco",
];

function cleanText(value: unknown): string {
  return String(value || "").replace(/\r\n/g, "\n").trim();
}

function cleanTitle(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizePlaceholder(value: unknown): string {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function hasRealSubchapterContent(value: unknown): boolean {
  const text = cleanText(value);
  if (text.length < MIN_REAL_SUBCHAPTER_CHARS) return false;
  if (PLACEHOLDER_RE.test(normalizePlaceholder(text))) return false;
  return true;
}

function fallbackSubchapterTitle(chapterIndex: number, subIndex: number): string {
  return DEFAULT_SUBCHAPTER_TITLES[subIndex] || `Sottocapitolo ${chapterIndex + 1}.${subIndex + 1}`;
}

function resolveSubchapterTitle(
  chapterIndex: number,
  subIndex: number,
  existing?: Partial<SubChapter>,
  outline?: Partial<SubChapter>,
): string {
  return (
    cleanTitle(existing?.title) ||
    cleanTitle(outline?.title) ||
    fallbackSubchapterTitle(chapterIndex, subIndex)
  );
}

function semanticMarkerIndex(value: string): number {
  const normalized = normalizePlaceholder(value);
  const markers = [
    /^(apertura|opening|innesco|setup)\b/,
    /^(pressione|pressure|tensione|conflitto)\b/,
    /^(scelta|choice|decisione|svolta)\b/,
    /^(conseguenza|consequence|payoff|chiusura|echo|eco)\b/,
  ];
  return markers.findIndex((marker) => marker.test(normalized));
}

function splitByExplicitMarkers(text: string, chapterIndex: number, expectedCount: number): string[] {
  const buckets = Array.from({ length: expectedCount }, () => "");
  let current = -1;
  let foundMarkers = 0;

  for (const rawLine of text.split(/\n+/)) {
    const line = rawLine.trim();
    if (!line) {
      if (current >= 0) buckets[current] += "\n\n";
      continue;
    }

    const marker = line.match(
      /^(?:#{1,6}\s*)?(?:(?:sottocapitolo|subchapter|scena|scene)\s*)?(?:(\d+)\.(\d+)|([A-Za-zÀ-ÿ]+))\s*(?:[:.)\-\u2013\u2014]\s*)?(.*)$/i,
    );

    let markerIndex = -1;
    let remainder = "";

    if (marker) {
      const markerChapter = Number(marker[1]);
      const markerSub = Number(marker[2]);
      if (markerChapter === chapterIndex + 1 && markerSub >= 1 && markerSub <= expectedCount) {
        markerIndex = markerSub - 1;
        remainder = marker[4] || "";
      } else if (!marker[1] && marker[3]) {
        const semanticIndex = semanticMarkerIndex(marker[3]);
        if (semanticIndex >= 0 && semanticIndex < expectedCount) {
          markerIndex = semanticIndex;
          remainder = marker[4] || "";
        }
      }
    }

    if (markerIndex >= 0) {
      current = markerIndex;
      foundMarkers += 1;
      if (remainder.trim()) buckets[current] += `${remainder.trim()}\n`;
      continue;
    }

    if (current >= 0) {
      buckets[current] += `${line}\n`;
    }
  }

  const filled = buckets.map((bucket) => bucket.trim());
  return foundMarkers >= 2 && filled.some(hasRealSubchapterContent) ? filled : [];
}

function splitProportionally(text: string, expectedCount: number): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  const units = paragraphs.length >= expectedCount
    ? paragraphs
    : text.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);

  if (!units.length) return Array.from({ length: expectedCount }, () => "");

  const totalChars = units.reduce((sum, unit) => sum + unit.length, 0);
  const targetChars = Math.max(1, Math.ceil(totalChars / expectedCount));
  const chunks: string[] = [];
  let current: string[] = [];
  let currentChars = 0;

  for (const unit of units) {
    const remainingSlots = expectedCount - chunks.length - 1;
    const remainingUnits = units.length - (chunks.reduce((sum, chunk) => sum + chunk.split(/\n\n/).length, 0) + current.length);

    if (
      chunks.length < expectedCount - 1 &&
      current.length > 0 &&
      currentChars + unit.length > targetChars &&
      remainingUnits >= remainingSlots
    ) {
      chunks.push(current.join("\n\n").trim());
      current = [];
      currentChars = 0;
    }

    current.push(unit);
    currentChars += unit.length;
  }

  if (current.length) chunks.push(current.join("\n\n").trim());
  while (chunks.length < expectedCount) chunks.push("");

  return chunks.slice(0, expectedCount);
}

/** Re-split chapter body into subchapters after chapter-level editorial passes. */
export function resyncSubchapterContentsFromChapter(
  chapterContent: string,
  subchapters: SubChapter[],
  chapterIndex: number,
): SubChapter[] {
  const expectedCount = subchapters.length;
  if (expectedCount <= 0) return subchapters;

  const cleaned = cleanText(chapterContent);
  const markerChunks = splitByExplicitMarkers(cleaned, chapterIndex, expectedCount);
  if (markerChunks.length) {
    return subchapters.map((sub, index) => ({
      ...sub,
      content: cleanText(markerChunks[index]) || cleanText(sub.content),
    }));
  }

  if (expectedCount === 1) {
    return [{ ...subchapters[0]!, content: cleaned }];
  }

  const chunks = splitProportionally(cleaned, expectedCount);
  const resynced = subchapters.map((sub, index) => ({
    ...sub,
    content: chunks[index] || cleanText(sub.content),
  }));
  return repairSubchapterSplitBoundaries(resynced).subchapters;
}

export function distributeChapterContentToSubchapters(input: {
  chapterContent: string;
  chapterIndex: number;
  expectedCount: number;
  existingSubchapters?: Array<Partial<SubChapter>>;
  outlineSubchapters?: Array<Partial<SubChapter>>;
}): SubChapter[] {
  const expectedCount = Math.max(0, Math.floor(input.expectedCount || 0));
  const existing = Array.isArray(input.existingSubchapters) ? input.existingSubchapters : [];
  const outline = Array.isArray(input.outlineSubchapters) ? input.outlineSubchapters : [];
  if (expectedCount <= 0) {
    return existing.map((sub, index) => ({
      title: resolveSubchapterTitle(input.chapterIndex, index, sub, outline[index]),
      content: cleanText(sub?.content),
    }));
  }

  const chapterContent = cleanText(input.chapterContent);
  const markerChunks = splitByExplicitMarkers(chapterContent, input.chapterIndex, expectedCount);
  const fallbackChunks = markerChunks.length ? markerChunks : splitProportionally(chapterContent, expectedCount);

  return Array.from({ length: expectedCount }, (_, index) => {
    const current = existing[index];
    const currentContent = cleanText(current?.content);
    return {
      title: resolveSubchapterTitle(input.chapterIndex, index, current, outline[index]),
      content: hasRealSubchapterContent(currentContent)
        ? currentContent
        : cleanText(fallbackChunks[index]),
    };
  });
}
