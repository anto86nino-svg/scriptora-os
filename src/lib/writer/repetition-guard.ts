export type RepetitionIssue = {
  phrase: string;
  count: number;
  message: string;
  type?: "cliche" | "sentence_opening";
};

export type RepetitionGuardResult = {
  text: string;
  issues: RepetitionIssue[];
  fixesApplied: number;
};

const GESTURE_CLICHES = [
  "si passò una mano sul viso",
  "si passo una mano sul viso",
  "passed a hand over his face",
  "passed a hand over her face",
  "guardò fuori dalla finestra",
  "guardo fuori dalla finestra",
  "looked out the window",
  "looked out of the window",
  "il silenzio cadde",
  "il silenzio calò",
  "silence fell",
  "the silence fell",
  "le mani non trovarono nulla da fare",
  "the hands found nothing to do",
];

const MAX_OCCURRENCES_PER_CHAPTER = 1;
const MAX_SENTENCE_OPENING_OCCURRENCES = 2;
const OPENING_STOPWORDS = new Set([
  "il", "lo", "la", "i", "gli", "le", "un", "una", "uno", "the", "a", "an",
  "e", "ma", "poi", "and", "but", "then", "quando", "mentre", "when", "while",
]);

function normalizeHay(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitSentences(text: string): string[] {
  return String(text || "")
    .split(/(?<=[.!?…]["»”]?)\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function joinSentences(sentences: string[]): string {
  return sentences.join(" ").replace(/\s+/g, " ").trim();
}

function countPhraseOccurrences(text: string, phrase: string): number {
  const pattern = new RegExp(escapeRegExp(phrase), "gi");
  return (text.match(pattern) || []).length;
}

function sentenceOpening(sentence: string): string | null {
  const words = normalizeHay(sentence)
    .replace(/[^a-z0-9à-ú\s]/gi, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length < 4) return null;
  const meaningful = words.filter((word) => !OPENING_STOPWORDS.has(word)).slice(0, 3);
  if (meaningful.length < 2) return null;
  return meaningful.slice(0, 2).join(" ");
}

function detectRepeatedSentenceOpenings(text: string): RepetitionIssue[] {
  const counts = new Map<string, number>();
  for (const sentence of splitSentences(text)) {
    const opening = sentenceOpening(sentence);
    if (!opening) continue;
    counts.set(opening, (counts.get(opening) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > MAX_SENTENCE_OPENING_OCCURRENCES)
    .map(([phrase, count]) => ({
      phrase,
      count,
      type: "sentence_opening" as const,
      message: `Apertura di frase ripetuta ${count} volte: "${phrase}". Varia soggetto, ritmo o punto di ingresso della frase.`,
    }));
}

export function detectRepetitionIssues(text: string): RepetitionIssue[] {
  const issues: RepetitionIssue[] = [];
  const hay = normalizeHay(text);

  for (const phrase of GESTURE_CLICHES) {
    const count = countPhraseOccurrences(hay, normalizeHay(phrase));
    if (count > MAX_OCCURRENCES_PER_CHAPTER) {
      issues.push({
        phrase,
        count,
        type: "cliche",
        message: `Frase cliché ripetuta ${count} volte (max ${MAX_OCCURRENCES_PER_CHAPTER}): "${phrase}".`,
      });
    }
  }

  issues.push(...detectRepeatedSentenceOpenings(text));

  return issues;
}

function removeExcessPhraseOccurrences(text: string, phrase: string, max: number): { text: string; removed: number } {
  const normalizedPhrase = normalizeHay(phrase);
  const sentences = splitSentences(text);
  let seen = 0;
  let removed = 0;
  const kept: string[] = [];

  for (const sentence of sentences) {
    const sentenceHay = normalizeHay(sentence);
    if (sentenceHay.includes(normalizedPhrase)) {
      seen += 1;
      if (seen > max) {
        removed += 1;
        continue;
      }
    }
    kept.push(sentence);
  }

  return { text: joinSentences(kept), removed };
}

export function applyRepetitionGuard(text: string): RepetitionGuardResult {
  let result = String(text || "").trim();
  if (!result) return { text: result, issues: [], fixesApplied: 0 };

  const issues: RepetitionIssue[] = [];
  let fixesApplied = 0;

  for (const phrase of GESTURE_CLICHES) {
    const count = countPhraseOccurrences(result, phrase);
    if (count > MAX_OCCURRENCES_PER_CHAPTER) {
      const trimmed = removeExcessPhraseOccurrences(result, phrase, MAX_OCCURRENCES_PER_CHAPTER);
      result = trimmed.text;
      fixesApplied += trimmed.removed;
      issues.push({
        phrase,
        count,
        type: "cliche",
        message: `Rimosse ${trimmed.removed} ripetizioni di "${phrase}".`,
      });
    }
  }

  issues.push(...detectRepeatedSentenceOpenings(result));

  return { text: result, issues, fixesApplied };
}
