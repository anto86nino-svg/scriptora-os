export type RepetitionIssue = {
  phrase: string;
  count: number;
  message: string;
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

export function detectRepetitionIssues(text: string): RepetitionIssue[] {
  const issues: RepetitionIssue[] = [];
  const hay = normalizeHay(text);

  for (const phrase of GESTURE_CLICHES) {
    const count = countPhraseOccurrences(hay, normalizeHay(phrase));
    if (count > MAX_OCCURRENCES_PER_CHAPTER) {
      issues.push({
        phrase,
        count,
        message: `Frase cliché ripetuta ${count} volte (max ${MAX_OCCURRENCES_PER_CHAPTER}): "${phrase}".`,
      });
    }
  }

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
        message: `Rimosse ${trimmed.removed} ripetizioni di "${phrase}".`,
      });
    }
  }

  return { text: result, issues, fixesApplied };
}
