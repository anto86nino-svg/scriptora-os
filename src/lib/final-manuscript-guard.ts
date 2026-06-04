import type { BookConfig, Chapter } from "@/types/book";

interface GuardContext {
  config?: Partial<BookConfig>;
}

const TECHNICAL_LINE_PATTERNS = [
  /^\s*(?:assistant|system|user|developer|prompt|analysis|output|metadata|debug|telemetry)\s*[:=-]/i,
  /^\s*(?:genre coach|chapter doctor|editorial note|writing brain|human writing engine|scriptora writing brain)\s*[:=-]/i,
  /^\s*(?:return only|do not return|do not include|write in|target for this chunk|current progress)\b/i,
  /^\s*(?:objective|goal|emotional promise|narrative direction|tension|chapter plan|scene continuity contract|genre-specific pressure)\s*[:=-]/i,
  /^\s*(?:obiettivo|promessa emotiva|direzione narrativa|tensione principale|anteprima editoriale|manoscritto live)\s*[:=-]/i,
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
  /\bSCENE CONTINUITY CONTRACT\b[^.?!\n]*[.?!]?/gi,
  /\bGENRE-SPECIFIC PRESSURE\b[^.?!\n]*[.?!]?/gi,
  /\bSubtext protocol\b[^.?!\n]*[.?!]?/gi,
];

const ITALIAN_TECHNICAL_ENGLISH_LINE_PATTERNS = [
  /^\s*(?:chapter|scene|beat|goal|conflict|resolution|emotional promise|narrative direction|commercial cover readiness|manuscript live|editorial preview)\s*[:=-]/i,
  /^\s*(?:here is|here are|as an ai|i can't|i cannot|certainly|of course)\b/i,
  /\b(?:Return ONLY|Do NOT|CURRENT PROGRESS|TARGET for this chunk|Chapter Doctor|Genre Coach|Assistant)\b/i,
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
    .replace(/^\s*[-*]\s+(?=(?:Chapter|Capitolo|Scene|Scena|Beat|Goal|Obiettivo|Promessa|Direzione)\b)/gim, "");
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
  const seenParagraphs = new Set<string>();

  for (const paragraph of paragraphs) {
    const key = normalizeKey(paragraph).slice(0, 180);
    const openingKey = normalizeKey(paragraph).split(" ").slice(0, 18).join(" ");
    const previous = result.length ? normalizeKey(result[result.length - 1]).slice(0, 180) : "";
    const paragraphKey = normalizeKey(paragraph).slice(0, 420);
    if (key && (key === previous || seenOpenings.has(key))) continue;
    if (openingKey.length > 70 && seenOpenings.has(openingKey)) continue;
    if (paragraphKey.length > 160 && seenParagraphs.has(paragraphKey)) continue;
    if (key.length > 80) seenOpenings.add(key);
    if (openingKey.length > 70) seenOpenings.add(openingKey);
    if (paragraphKey.length > 160) seenParagraphs.add(paragraphKey);
    result.push(paragraph);
  }

  return result.join("\n\n");
}

function dedupeRepeatedSentences(text: string): string {
  const seen = new Set<string>();
  const sentencePattern = /[^.!?]+[.!?]+(?:["”»])?/g;
  return text
    .split(/\n{2,}/)
    .map((paragraph) => {
      const sentences = paragraph.match(sentencePattern);
      if (!sentences || sentences.length < 2) return paragraph;
      const rebuilt: string[] = [];
      let previousKey = "";
      for (const sentence of sentences) {
        const key = normalizeKey(sentence);
        if (key.length > 14 && key === previousKey) continue;
        if (key.length > 48 && seen.has(key)) continue;
        if (key.length > 48) seen.add(key);
        rebuilt.push(sentence.trim());
        previousKey = key;
      }
      return rebuilt.join(" ");
    })
    .join("\n\n");
}

function tidyBrokenFragments(text: string): string {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s*[,.;:!?]\s*$/gm, "")
    .replace(/^\s*(?:\.{2,}|-{2,}|_{2,})\s*$/gm, "")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/([.!?]){3,}/g, "$1")
    .replace(/([,;:])\s*\1+/g, "$1")
    .trim();
}

function stripItalianUiEnglishLeak(text: string, config?: Partial<BookConfig>): string {
  const language = String(config?.language || "").toLowerCase();
  if (!language.includes("ital")) return text;

  return text
    .split(/\n/)
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      return !ITALIAN_TECHNICAL_ENGLISH_LINE_PATTERNS.some((pattern) => pattern.test(trimmed));
    })
    .join("\n")
    .replace(/\b(?:manuscript live|editorial preview|commercial cover readiness|bestseller prediction|hook strength|retention risk)\b/gi, "");
}

function stripPromptListLeak(text: string): string {
  const lines = text.split(/\n/);
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\s*[-*]\s+(?:Do not|Never|Always|Return|Write|Avoid|Increase|Reduce|Use|Include)\b/i.test(trimmed)) continue;
    if (/^\s*[-*]\s+(?:Non|Mai|Sempre|Scrivi|Evita|Aumenta|Riduci|Usa|Includi)\b/i.test(trimmed) && /(?:prompt|output|json|markdown|label|tecnic)/i.test(trimmed)) continue;
    result.push(line);
  }
  return result.join("\n");
}

export function guardFinalManuscriptText(text: string, context: GuardContext = {}): string {
  if (!text?.trim()) return text || "";

  let next = text;
  next = stripTechnicalLines(next);
  next = stripTechnicalPhrases(next);
  next = stripMarkdownNoise(next);
  next = stripPlaceholders(next);
  next = stripPromptListLeak(next);
  next = stripItalianUiEnglishLeak(next, context.config);
  next = dedupeRepeatedSentences(next);
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
