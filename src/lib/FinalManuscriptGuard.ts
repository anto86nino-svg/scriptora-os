export type FinalManuscriptGuardOptions = {
  language?: string;
};

const LEAK_LINE_PATTERNS = [
  /^\s*(?:genre coach|editorial os|chapter doctor|scansione rapida)\s*[:\-–—]?\s*.*$/i,
  /^\s*assistente per genere dentro editorial os\s*.*$/i,
  /^\s*usa dopo scansione rapida o chapter doctor\s*.*$/i,
  /^\s*(?:system|assistant|developer|prompt|instruction|internal note|nota interna)\s*[:\-–—]\s*.*$/i,
  /^\s*(?:to be generated|da generare|pending|tbd|placeholder)\s*$/i,
];

const LEAK_SENTENCE_PATTERNS = [
  /\bThe detail finally revealed itself\s*[—-]\s*not as closure[^.!?]*[.!?]?/gi,
  /\bOne detail stuck\s*[—-]\s*wrong, but unforgettable[^.!?]*[.!?]?/gi,
  /\bThe next move would not wait for (?:her|him|them)[^.!?]*[.!?]?/gi,
  /\bSome details stay\s*[—-]\s*even when you want to forget them[^.!?]*[.!?]?/gi,
];

function normalizeParagraphKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function removeDuplicateParagraphs(text: string): string {
  const seen = new Set<string>();
  return text
    .split(/\n{2,}/)
    .filter((paragraph) => {
      const key = normalizeParagraphKey(paragraph);
      if (!key || key.length < 48) return Boolean(key);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join("\n\n");
}

function cleanupPunctuation(text: string): string {
  return text
    .replace(/^\s*[,.;:!?]+\s*$/gm, "")
    .replace(/\s+,\s*\./g, ".")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,;:])\s*([.!?])/g, "$2")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Conservative clean room: removes only high-confidence technical leakage and exact duplicates. */
export function sanitizeFinalManuscript(
  text: string,
  _options: FinalManuscriptGuardOptions = {},
): string {
  if (!text?.trim()) return text;

  let next = text
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/^#{1,6}\s+.*$/gm, "");

  for (const pattern of LEAK_SENTENCE_PATTERNS) next = next.replace(pattern, "");

  next = next
    .split("\n")
    .filter((line) => !LEAK_LINE_PATTERNS.some((pattern) => pattern.test(line)))
    .join("\n");

  return cleanupPunctuation(removeDuplicateParagraphs(next));
}

/** Safe during chunk assembly: same clean-room rules, intentionally no speculative rewriting. */
export function sanitizeLiveManuscriptChunk(text: string, options: FinalManuscriptGuardOptions = {}): string {
  return sanitizeFinalManuscript(text, options);
}

