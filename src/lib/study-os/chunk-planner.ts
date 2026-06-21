export interface StudyChunk {
  id: string;
  title: string;
  index: number;
  startWord: number;
  endWord: number;
  wordCount: number;
  content: string;
  contentPreview: string;
  kind: "chapter" | "section" | "block";
}

export interface StudyChunkPlan {
  sourceName: string;
  totalWords: number;
  shouldUseChunks: boolean;
  mode: "single" | "chapters" | "blocks" | "huge";
  chunks: StudyChunk[];
  ranges: Array<{
    id: string;
    title: string;
    from: number;
    to: number;
    wordCount: number;
    content: string;
  }>;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function preview(text: string, max = 280): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max).trim()}…` : clean;
}

function normalizeStudyText(text: string): string {
  return String(text || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function detectChapterSegments(text: string): Array<{ title: string; content: string }> {
  const clean = normalizeStudyText(text);
  const headingRegex = /(^|\n)(Chapter\s+\d+[^\n]{0,140}|Capitolo\s+\d+[^\n]{0,140}|Parte\s+\d+[^\n]{0,140}|Sezione\s+\d+[^\n]{0,140})/gi;
  const matches = Array.from(clean.matchAll(headingRegex));
  if (matches.length < 2) return [];

  return matches
    .map((match, idx) => {
      const start = match.index || 0;
      const next = matches[idx + 1]?.index ?? clean.length;
      const title = String(match[2] || `Sessione ${idx + 1}`).replace(/\s+/g, " ").trim();
      const content = clean.slice(start, next).trim();
      return { title, content };
    })
    .filter((segment) => countWords(segment.content) >= 80);
}

function splitIntoWordChunks(content: string, baseTitle: string, startIndex: number, maxWords: number): StudyChunk[] {
  const words = content.trim().split(/\s+/).filter(Boolean);
  const chunks: StudyChunk[] = [];

  for (let offset = 0; offset < words.length; offset += maxWords) {
    const partWords = words.slice(offset, offset + maxWords);
    const partContent = partWords.join(" ");
    const index = startIndex + chunks.length;

    chunks.push({
      id: `chunk-${index}`,
      title: words.length > maxWords ? `${baseTitle} · parte ${chunks.length + 1}` : baseTitle,
      index,
      startWord: offset + 1,
      endWord: offset + partWords.length,
      wordCount: partWords.length,
      content: partContent,
      contentPreview: preview(partContent),
      kind: words.length > maxWords ? "block" : "chapter",
    });
  }

  return chunks;
}

function createFallbackBlocks(text: string, maxWords: number): StudyChunk[] {
  const words = normalizeStudyText(text).split(/\s+/).filter(Boolean);
  const chunks: StudyChunk[] = [];

  for (let offset = 0; offset < words.length; offset += maxWords) {
    const partWords = words.slice(offset, offset + maxWords);
    const content = partWords.join(" ");
    const index = chunks.length + 1;

    chunks.push({
      id: `chunk-${index}`,
      title: `Blocco studio ${index}`,
      index,
      startWord: offset + 1,
      endWord: offset + partWords.length,
      wordCount: partWords.length,
      content,
      contentPreview: preview(content),
      kind: "block",
    });
  }

  return chunks;
}

function createRanges(chunks: StudyChunk[]): StudyChunkPlan["ranges"] {
  const ranges: StudyChunkPlan["ranges"] = [];
  const groupSize = 5;

  for (let i = 0; i < chunks.length; i += groupSize) {
    const group = chunks.slice(i, i + groupSize);
    if (group.length < 2) continue;

    ranges.push({
      id: `range-${group[0].index}-${group[group.length - 1].index}`,
      title: `Sessioni ${group[0].index}–${group[group.length - 1].index}`,
      from: group[0].index,
      to: group[group.length - 1].index,
      wordCount: group.reduce((sum, chunk) => sum + chunk.wordCount, 0),
      content: group.map((chunk) => `${chunk.title}\n\n${chunk.content}`).join("\n\n---\n\n"),
    });
  }

  return ranges.slice(0, 12);
}

export function createStudyChunkPlan(text: string, sourceName = "Materiale"): StudyChunkPlan {
  const clean = normalizeStudyText(text);
  const totalWords = countWords(clean);

  if (totalWords < 12000) {
    return { sourceName, totalWords, shouldUseChunks: false, mode: "single", chunks: [], ranges: [] };
  }

  const huge = totalWords > 60000 || clean.length > 320000;
  const maxWordsPerChunk = huge ? 3500 : 5500;
  const chapters = detectChapterSegments(clean);

  let chunks: StudyChunk[] = [];

  if (chapters.length >= 2) {
    chapters.forEach((chapter) => {
      chunks.push(...splitIntoWordChunks(chapter.content, chapter.title, chunks.length + 1, maxWordsPerChunk));
    });
  } else {
    chunks = createFallbackBlocks(clean, maxWordsPerChunk);
  }

  chunks = chunks.map((chunk, idx) => ({ ...chunk, id: `chunk-${idx + 1}`, index: idx + 1 }));

  return {
    sourceName,
    totalWords,
    shouldUseChunks: chunks.length > 1,
    mode: huge ? "huge" : chapters.length >= 2 ? "chapters" : "blocks",
    chunks,
    ranges: createRanges(chunks),
  };
}
