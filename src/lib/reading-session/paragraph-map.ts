/** Map karaoke sentence index → paragraph number (1-based) for author notes */
export function mapSentenceToParagraph(chapterContent: string, sentenceIndex: number, sentenceText?: string): number {
  const paragraphs = String(chapterContent || "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (!paragraphs.length) return 1;

  const needle = String(sentenceText || "").trim().slice(0, 48);
  if (needle.length >= 8) {
    for (let i = 0; i < paragraphs.length; i += 1) {
      if (paragraphs[i].includes(needle)) return i + 1;
    }
  }

  const sentences = String(chapterContent || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);

  const ratio = sentenceIndex / Math.max(sentences.length - 1, 1);
  return Math.min(paragraphs.length, Math.max(1, Math.round(ratio * (paragraphs.length - 1)) + 1));
}
