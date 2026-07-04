import type { Chapter } from "@/types/book";
import {
  detectResidualSplitArtifacts,
  repairCorruptedMergeFragments,
  repairSubchapterSplitBoundaries,
} from "@/lib/writer/clean-text-pass";
import { assembleChapterFromSubchapters } from "@/lib/writer/subchapter-pipeline";

export type NarrativeCorruptionKind =
  | "broken_sentence_start"
  | "double_punctuation"
  | "mid_sentence_capital"
  | "nonsense_fragment"
  | "out_of_context"
  | "duplicate_cliche"
  | "typo_artifact"
  | "split_subchapter_boundary";

export interface NarrativeCorruptionIssue {
  kind: NarrativeCorruptionKind;
  message: string;
  excerpt: string;
}

export interface NarrativeCleanupContext {
  language?: string | null;
  genre?: string | null;
  chapterTitle?: string;
  settingKeywords?: string[];
}

export interface NarrativeCleanupResult {
  text: string;
  issues: NarrativeCorruptionIssue[];
  fixesApplied: number;
}

const CONJUNCTION_WORDS = new Set(["ma", "pero", "però", "e", "o", "a", "se", "perché", "perche", "but", "and", "or", "if", "because"]);

const TYPO_FIXES: Array<[RegExp, string]> = [
  [/\bun\s+crepa\b/gi, "una crepa"],
  [/\bcome\s+se\s+a\s+fosse\s+successo\b/gi, "come se nulla fosse successo"],
  [/\bpizzico la gola\b/gi, "pizzicò la gola"],
  [/\ble pizzico la\b/gi, "le pizzicò la"],
  [/\bnon diceva a\./gi, "non diceva nulla."],
  [/\bNon subito\.\./gi, "Non subito."],
  [/\bnon trovarono a da fare\b/gi, "non trovarono nulla da fare"],
  [/\bLe mani non trovarono a da fare\b/g, "Le mani non trovarono nulla da fare"],
];

const NONSENSE_FRAGMENT_PATTERNS: RegExp[] = [
  /\bnon diceva a\./i,
  /\bnon trovarono a da fare\b/i,
  /\bAnch'io Le mani\b/i,
  /\bpizzico la gola\b/i,
];

const DUPLICATE_CLICHES = [
  "le mani non trovarono nulla da fare",
  "the hands found nothing to do",
  "nulla da fare con le mani",
];

const OUT_OF_CONTEXT_FRAGMENTS: Array<{ pattern: RegExp; contextHints: RegExp[] }> = [
  {
    pattern: /\bla cattedrale cadeva a pezzi\b/i,
    contextHints: [/\bcattedrale\b/i, /\bchiesa\b/i, /\bcathedral\b/i],
  },
  {
    pattern: /\bil castello bruciava\b/i,
    contextHints: [/\bcastello\b/i, /\bcastle\b/i],
  },
  {
    pattern: /\bla neve copriva le montagne\b/i,
    contextHints: [/\bneve\b/i, /\bmontagn/i, /\bsnow\b/i, /\bmountain/i],
  },
];

const BROKEN_SENTENCE_START = /\b(Perché|Perché|Ma|Però|Pero|E|O|A|Se|But|And|Or|If|Because)\s+([A-ZÀÈÉÌÒÙ][a-zàèéìòù]+)\s+(?=[a-zàèéìòù])/g;
const MID_SENTENCE_CAPITAL = /\b(Ma|Però|Pero|E|But|And)\s+([A-ZÀÈÉÌÒÙ][a-zàèéìòù]{2,})\s+(?=[a-zàèéìòù])/g;

function normalizeHay(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function splitSentences(text: string): string[] {
  return String(text || "")
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function joinSentences(sentences: string[]): string {
  return sentences.join(" ").replace(/\s+/g, " ").trim();
}

function lowercaseAfterConjunction(match: string, conj: string, word: string): string {
  const normalizedWord = normalizeHay(word);
  const isArticleBeforeNoun = /^(le|la|lo|gli|i)$/i.test(word) && CONJUNCTION_WORDS.has(normalizeHay(conj));
  if (CONJUNCTION_WORDS.has(normalizeHay(conj)) && /^[A-ZÀÈÉÌÒÙ]/.test(word)) {
    if (isArticleBeforeNoun || !/^(I|Io|Lei|Lui|Noi|Voi|Loro|Il|La|Lo|Gli|Le|Un|Una|Uno|The|She|He|They|We|You)\b/.test(word)) {
      return `${conj} ${word.charAt(0).toLowerCase()}${word.slice(1)}`;
    }
  }
  if (normalizedWord === word.toLowerCase()) return match;
  return match;
}

function fixDoublePunctuation(text: string): { text: string; count: number } {
  let count = 0;
  const result = text
    .replace(/\.{2,}/g, () => { count += 1; return "."; })
    .replace(/,{2,}/g, () => { count += 1; return ","; })
    .replace(/\?{2,}/g, () => { count += 1; return "?"; })
    .replace(/!{2,}/g, () => { count += 1; return "!"; })
    .replace(/\.\s*\./g, () => { count += 1; return "."; });
  return { text: result, count };
}

function clicheFingerprint(sentence: string): string {
  return normalizeHay(sentence).replace(/^(ma|pero|però|e)\s+/, "");
}

function removeDuplicateCliches(text: string): { text: string; removed: NarrativeCorruptionIssue[] } {
  const paragraphs = String(text || "").split(/\n\s*\n+/);
  const seen = new Set<string>();
  const removed: NarrativeCorruptionIssue[] = [];

  const cleanedParagraphs = paragraphs.map((paragraph) => {
    const sentences = splitSentences(paragraph);
    const kept: string[] = [];
    for (const sentence of sentences) {
      const fingerprint = clicheFingerprint(sentence);
      const isCliche = DUPLICATE_CLICHES.some((c) => fingerprint.includes(normalizeHay(c)));
      if (isCliche) {
        if (seen.has(fingerprint)) {
          removed.push({
            kind: "duplicate_cliche",
            message: "Frase cliché duplicata nel capitolo.",
            excerpt: sentence.slice(0, 80),
          });
          continue;
        }
        seen.add(fingerprint);
      }
      kept.push(sentence);
    }
    return joinSentences(kept);
  }).filter(Boolean);

  return { text: cleanedParagraphs.join("\n\n"), removed };
}

function removeOutOfContextFragments(text: string, context: NarrativeCleanupContext): { text: string; removed: NarrativeCorruptionIssue[] } {
  const fullHay = normalizeHay(text);
  const removed: NarrativeCorruptionIssue[] = [];
  const hints = (context.settingKeywords || []).map(normalizeHay).filter((h) => h.length > 3);
  const genreHay = normalizeHay(context.genre || "");
  const beachRomance = /spiaggia|mare|sabbia|romance|romantic|love|beach|sea/i.test(`${fullHay} ${genreHay} ${context.chapterTitle || ""}`);

  const sentences = splitSentences(text);
  const kept: string[] = [];

  for (const sentence of sentences) {
    let drop = false;
    for (const { pattern, contextHints } of OUT_OF_CONTEXT_FRAGMENTS) {
      if (!pattern.test(sentence)) continue;
      const hasContext = contextHints.some((h) => h.test(fullHay));
      const surrealInBeach = beachRomance && /\bcattedrale|castello|neve copriva\b/i.test(sentence);
      if (!hasContext || surrealInBeach) {
        removed.push({
          kind: "out_of_context",
          message: "Frase fuori contesto o allucinazione narrativa.",
          excerpt: sentence.slice(0, 80),
        });
        drop = true;
        break;
      }
    }
    if (!drop && hints.length > 0) {
      const sentenceHay = normalizeHay(sentence);
      const mentionsUnrelatedLandmark = /\bcattedrale\b/i.test(sentenceHay)
        && !hints.some((h) => sentenceHay.includes(h))
        && !/\bcattedrale\b/i.test(fullHay.replace(sentenceHay, ""));
      if (mentionsUnrelatedLandmark) {
        removed.push({
          kind: "out_of_context",
          message: "Elemento scenico non coerente con il setting del capitolo.",
          excerpt: sentence.slice(0, 80),
        });
        drop = true;
      }
    }
    if (!drop) kept.push(sentence);
  }

  return { text: joinSentences(kept), removed };
}

function detectIssuesInText(text: string, context: NarrativeCleanupContext = {}): NarrativeCorruptionIssue[] {
  const issues: NarrativeCorruptionIssue[] = [];
  const source = String(text || "");

  if (BROKEN_SENTENCE_START.test(source)) {
    const m = source.match(/\b(?:Perché|Ma|Però|E|O|A|Se)\s+[A-ZÀÈÉÌÒÙ][a-zàèéìòù]+\s+[a-zàèéìòù]/);
    if (m) {
      issues.push({
        kind: "broken_sentence_start",
        message: "Inizio frase corrotto (maiuscola dopo congiunzione).",
        excerpt: m[0],
      });
    }
  }
  BROKEN_SENTENCE_START.lastIndex = 0;

  if (/\.{2,}|,\s*,|\?\?|!!/.test(source)) {
    const m = source.match(/.{0,20}\.{2,}.{0,20}/);
    issues.push({
      kind: "double_punctuation",
      message: "Punteggiatura doppia o corrotta.",
      excerpt: (m?.[0] || "..").trim(),
    });
  }

  if (MID_SENTENCE_CAPITAL.test(source)) {
    const m = source.match(/\b(?:Ma|Però|E)\s+[A-ZÀÈÉÌÒÙ][a-zàèéìòù]+\s+[a-zàèéìòù]/);
    if (m) {
      issues.push({
        kind: "mid_sentence_capital",
        message: "Maiuscola errata a metà frase.",
        excerpt: m[0],
      });
    }
  }
  MID_SENTENCE_CAPITAL.lastIndex = 0;

  for (const pattern of NONSENSE_FRAGMENT_PATTERNS) {
    const m = source.match(pattern);
    if (m) {
      issues.push({
        kind: "nonsense_fragment",
        message: "Frammento di testo nonsenso da merge/generazione.",
        excerpt: m[0],
      });
    }
  }

  for (const cliche of DUPLICATE_CLICHES) {
    const re = new RegExp(cliche.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const matches = source.match(re) || [];
    if (matches.length > 1) {
      issues.push({
        kind: "duplicate_cliche",
        message: "Frase cliché ripetuta più volte.",
        excerpt: matches[0] || cliche,
      });
    }
  }

  for (const artifact of detectResidualSplitArtifacts(source)) {
    issues.push({
      kind: "split_subchapter_boundary",
      message: "Parola o frase spezzata da assemblaggio tra sottocapitoli.",
      excerpt: artifact,
    });
  }

  const ooc = removeOutOfContextFragments(source, context);
  issues.push(...ooc.removed);

  return issues;
}

export function detectNarrativeCorruption(
  text: string,
  context: NarrativeCleanupContext = {},
): NarrativeCorruptionIssue[] {
  return detectIssuesInText(text, context);
}

export function countNarrativeCorruptionIssues(text: string, context: NarrativeCleanupContext = {}): number {
  return detectNarrativeCorruption(text, context).length;
}

export function applyNarrativeCleanupPass(
  text: string,
  context: NarrativeCleanupContext = {},
): NarrativeCleanupResult {
  let result = repairCorruptedMergeFragments(String(text || "").trim());
  if (!result) return { text: result, issues: [], fixesApplied: 0 };

  let fixesApplied = 0;
  const issues: NarrativeCorruptionIssue[] = [];

  for (const [pattern, replacement] of TYPO_FIXES) {
    const before = result;
    result = result.replace(pattern, replacement);
    if (before !== result) fixesApplied += 1;
  }

  result = result.replace(BROKEN_SENTENCE_START, (match, conj, word) => {
    fixesApplied += 1;
    const fixed = lowercaseAfterConjunction(match, conj, word);
    return fixed === match ? match : `${fixed} `;
  });

  result = result.replace(MID_SENTENCE_CAPITAL, (match, conj, word) => {
    fixesApplied += 1;
    const fixed = lowercaseAfterConjunction(match, conj, word);
    return fixed === match ? match : `${fixed} `;
  });

  const punct = fixDoublePunctuation(result);
  result = punct.text;
  fixesApplied += punct.count;

  const dupes = removeDuplicateCliches(result);
  result = dupes.text;
  issues.push(...dupes.removed);
  fixesApplied += dupes.removed.length;

  const ooc = removeOutOfContextFragments(result, context);
  result = ooc.text;
  issues.push(...ooc.removed);
  fixesApplied += ooc.removed.length;

  const remaining = detectIssuesInText(result, context);
  for (const issue of remaining) {
    if (!issues.some((i) => i.kind === issue.kind && i.excerpt === issue.excerpt)) {
      issues.push(issue);
    }
  }

  return {
    text: result.replace(/\s{2,}/g, " ").trim(),
    issues,
    fixesApplied,
  };
}

export function applyNarrativeCleanupToChapter(
  chapter: Chapter,
  context: NarrativeCleanupContext = {},
): Chapter {
  const cleanedSubs = (chapter.subchapters || []).map((sub) => {
    const cleaned = applyNarrativeCleanupPass(String(sub.content || ""), context);
    return { ...sub, content: cleaned.text };
  });
  const subs = repairSubchapterSplitBoundaries(cleanedSubs).subchapters;
  const fullText = assembleChapterFromSubchapters(subs);
  const fullCleaned = applyNarrativeCleanupPass(fullText, context);
  return {
    ...chapter,
    subchapters: subs,
    content: fullCleaned.text,
  };
}
