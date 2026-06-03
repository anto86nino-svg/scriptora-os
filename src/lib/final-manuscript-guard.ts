import type { BookConfig, Chapter } from "@/types/book";

interface GuardContext {
  config?: Partial<BookConfig>;
}

const TECHNICAL_LINE_PATTERNS = [
  /^\s*(?:assistant|system|user|developer|prompt|analysis|output|metadata|debug|telemetry)\s*[:=-]/i,
  /^\s*(?:genre coach|chapter doctor|editorial note|writing brain|human writing engine|scriptora writing brain)\s*[:=-]/i,
  /^\s*(?:return only|do not return|do not include|write in|target for this chunk|current progress)\b/i,
  /^\s*(?:__result__|```|json\s*\{|content\s*:|error\s*:)/i,
];

const TECHNICAL_PHRASES = [
  /\bThe detail finally revealed itself\b/gi,
  /\bGenre Coach\b/gi,
  /\bChapter Doctor\b/gi,
  /\bHUMAN WRITING ENGINE V\d?\b/gi,
  /\bSCRIPTORA WRITING BRAIN PRO\b/gi,
  /\bReturn ONLY\b[^.?!\n]*[.?!]?/gi,
  /\bDo NOT return\b[^.?!\n]*[.?!]?/gi,
  /\bDo NOT include\b[^.?!\n]*[.?!]?/gi,
  /\bTARGET for this chunk\b[^.?!\n]*[.?!]?/gi,
  /\bCURRENT PROGRESS\b[^.?!\n]*[.?!]?/gi,
];

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTechnicalLines(text: string): string {
  return text
    .split(/\n/)
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      return !TECHNICAL_LINE_PATTERNS.some((pattern) => pattern.test(trimmed));
    })
    .join("\n");
}

function stripTechnicalPhrases(text: string): string {
  return TECHNICAL_PHRASES.reduce((next, pattern) => next.replace(pattern, ""), text);
}

function stripMarkdownNoise(text: string): string {
  return text
    .replace(/^```[a-z]*\s*/gim, "")
    .replace(/```\s*$/gim, "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+(?=(?:Chapter|Capitolo|Scene|Scena|Beat|Goal|Obiettivo)\b)/gim, "");
}

function stripPlaceholders(text: string): string {
  return text
    .replace(/\b(?:to be generated|placeholder|insert text here|lorem ipsum)\b[^.?!\n]*[.?!]?/gi, "")
    .replace(/\b(?:da generare|segnaposto|testo provvisorio|inserisci testo qui)\b[^.?!\n]*[.?!]?/gi, "");
}

function dedupeAdjacentParagraphs(text: string): string {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const result: string[] = [];
  const seenOpenings = new Set<string>();

  for (const paragraph of paragraphs) {
    const key = normalizeKey(paragraph).slice(0, 180);
    const previous = result.length ? normalizeKey(result[result.length - 1]).slice(0, 180) : "";
    if (key && (key === previous || seenOpenings.has(key))) continue;
    if (key.length > 80) seenOpenings.add(key);
    result.push(paragraph);
  }

  return result.join("\n\n");
}

function tidyBrokenFragments(text: string): string {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s*[,.;:]\s*$/gm, "")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/([.!?]){3,}/g, "$1")
    .trim();
}

function stripItalianUiEnglishLeak(text: string, config?: Partial<BookConfig>): string {
  const language = String(config?.language || "").toLowerCase();
  if (!language.includes("ital")) return text;

  return text
    .replace(/^\s*(?:Chapter|Scene|Beat|Goal|Conflict|Resolution|Emotional promise|Narrative direction)\s*[:=-].*$/gim, "")
    .replace(/\b(?:manuscript live|editorial preview|commercial cover readiness)\b/gi, "");
}

export function guardFinalManuscriptText(text: string, context: GuardContext = {}): string {
  if (!text?.trim()) return text || "";

  let next = text;
  next = stripTechnicalLines(next);
  next = stripTechnicalPhrases(next);
  next = stripMarkdownNoise(next);
  next = stripPlaceholders(next);
  next = stripItalianUiEnglishLeak(next, context.config);
  next = dedupeAdjacentParagraphs(next);
  next = tidyBrokenFragments(next);

  return next;
}

export function guardFinalChapter(chapter: Chapter, context: GuardContext = {}): Chapter {
  return {
    ...chapter,
    content: guardFinalManuscriptText(chapter.content, context),
    subchapters: Array.isArray(chapter.subchapters)
      ? chapter.subchapters.map((subchapter) => ({
          ...subchapter,
          content: guardFinalManuscriptText(subchapter.content, context),
        }))
      : chapter.subchapters,
  };
}
