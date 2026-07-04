import type { Chapter } from "@/types/book";
import {
  detectResidualSplitArtifacts,
  repairCorruptedMergeFragments,
  repairSubchapterSplitBoundaries,
  type SplitBoundaryIssue,
} from "@/lib/writer/clean-text-pass";

export type EditorialCleanupIssueType =
  | "corrupted_sentence"
  | "duplicate_heading"
  | "typo"
  | "incomplete_sentence"
  | "redundancy"
  | "markdown_cleanup";

export type EditorialCleanupIssue = {
  type: EditorialCleanupIssueType;
  severity: "low" | "medium" | "high";
  before: string;
  after?: string;
};

export type EditorialCleanupStats = {
  errorsCorrected: number;
  repetitionsReduced: number;
  incompleteSentencesFixed: number;
  typosRemoved: number;
};

export type EditorialCleanupResult = {
  cleanedContent: string;
  cleanedSubchapters?: Array<{ title: string; content: string }>;
  issuesFound: EditorialCleanupIssue[];
  changesApplied: string[];
  summary: string;
  stats: EditorialCleanupStats;
  confidence: number;
};

export type EditorialCleanupValidation = {
  valid: boolean;
  reason?: string;
};

type EditorialCleanupInput = {
  title?: string;
  content: string;
  subchapters?: Chapter["subchapters"];
};

type SegmentCleanup = {
  text: string;
  issues: EditorialCleanupIssue[];
};

function cleanWhitespace(text: string): SegmentCleanup {
  let next = text.replace(/\r\n/g, "\n");
  const issues: EditorialCleanupIssue[] = [];

  const normalizedSpaces = next
    .replace(/[ \t]+([,.;:!?])/g, "$1")
    .replace(/([.!?])([A-ZÀ-Ý])/g, "$1 $2")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n");

  if (normalizedSpaces !== next) {
    issues.push({ type: "typo", severity: "low", before: "spaziatura/punteggiatura irregolare", after: "spaziatura normalizzata" });
    next = normalizedSpaces;
  }

  const withoutSeparators = next.replace(/(?:^|\n)\s*(?:-{3,}|\*{3,}|_{3,})\s*(?=\n|$)/g, "\n");
  if (withoutSeparators !== next) {
    issues.push({ type: "markdown_cleanup", severity: "low", before: "separatore markdown inutile", after: "" });
    next = withoutSeparators.replace(/\n{3,}/g, "\n\n");
  }

  return { text: next.trim(), issues };
}

function removeDuplicateHeadings(text: string, chapterTitle = ""): SegmentCleanup {
  const issues: EditorialCleanupIssue[] = [];
  const title = chapterTitle.trim().toLowerCase();
  const lines = text.split("\n");
  const kept: string[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const normalized = trimmed.replace(/^#+\s*/, "").toLowerCase();
    const headingLike = /^#{1,6}\s+capitolo\s+\d+/i.test(trimmed) || /^capitolo\s+\d+\s*$/i.test(trimmed);
    const duplicatedTitle = index <= 2 && title && normalized === title;
    if ((index <= 2 && headingLike) || duplicatedTitle) {
      issues.push({ type: "duplicate_heading", severity: "medium", before: line, after: "" });
      return;
    }
    kept.push(line);
  });

  return { text: kept.join("\n").trim(), issues };
}

function fixKnownCorruptions(text: string): SegmentCleanup {
  const replacements: Array<{ pattern: RegExp; before: string; after: string }> = [
    { pattern: /\bun\s+crepa\b/gi, before: "un crepa", after: "una crepa" },
    { pattern: /\bcome\s+se\s+a\s+fosse\s+successo\b/gi, before: "come se a fosse successo", after: "come se nulla fosse successo" },
    { pattern: /\ba fissare il a\b/gi, before: "a fissare il a", after: "a fissare il vuoto" },
    { pattern: /\bAdesso non sembra pi[ùu] a\b/gi, before: "Adesso non sembra più a", after: "Adesso non sembra più lo stesso" },
    { pattern: /\bSi schiar[iì] la voce, ma non disse subito a\b/gi, before: "Si schiarì la voce, ma non disse subito a", after: "Si schiarì la voce, ma non disse subito nulla" },
  ];
  let next = text;
  const issues: EditorialCleanupIssue[] = [];

  for (const replacement of replacements) {
    if (!replacement.pattern.test(next)) continue;
    replacement.pattern.lastIndex = 0;
    next = next.replace(replacement.pattern, replacement.after);
    issues.push({
      type: "corrupted_sentence",
      severity: "high",
      before: replacement.before,
      after: replacement.after,
    });
  }

  const repaired = repairCorruptedMergeFragments(next);
  if (repaired !== next) {
    for (const artifact of detectResidualSplitArtifacts(next)) {
      issues.push({
        type: "corrupted_sentence",
        severity: "high",
        before: artifact,
        after: repaired,
      });
    }
    next = repaired;
  }

  return { text: next, issues };
}

function fixTypos(text: string): SegmentCleanup {
  let next = text;
  const issues: EditorialCleanupIssue[] = [];

  const nonNon = /\bnon\s+non\b/gi;
  if (nonNon.test(next)) {
    next = next.replace(nonNon, (match) => (match[0] === match[0].toUpperCase() ? "Non" : "non"));
    issues.push({ type: "typo", severity: "medium", before: "non non", after: "non" });
  }

  const repeatedWord = /\b([A-Za-zÀ-ÿ]{3,})\s+\1\b/gi;
  if (repeatedWord.test(next)) {
    next = next.replace(repeatedWord, "$1");
    issues.push({ type: "typo", severity: "low", before: "parola ripetuta consecutivamente", after: "ripetizione rimossa" });
  }

  return { text: next, issues };
}

function sentenceKey(sentence: string): string {
  return sentence
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function removeRedundantParagraphs(text: string): SegmentCleanup {
  const issues: EditorialCleanupIssue[] = [];
  const seen = new Set<string>();
  const paragraphs = text.split(/\n{2,}/);
  const kept: string[] = [];

  for (const paragraph of paragraphs) {
    const key = sentenceKey(paragraph);
    if (key.length > 40 && seen.has(key)) {
      issues.push({ type: "redundancy", severity: "medium", before: paragraph.slice(0, 120), after: "" });
      continue;
    }
    if (key.length > 40) seen.add(key);
    kept.push(paragraph);
  }

  return { text: kept.join("\n\n").trim(), issues };
}

function removeAdjacentDuplicateSentences(text: string): SegmentCleanup {
  const issues: EditorialCleanupIssue[] = [];
  const parts = text.split(/(?<=[.!?])\s+/);
  const kept: string[] = [];
  let previous = "";

  for (const part of parts) {
    const key = sentenceKey(part);
    if (key && key === previous && key.length > 24) {
      issues.push({ type: "redundancy", severity: "medium", before: part.slice(0, 120), after: "" });
      continue;
    }
    kept.push(part);
    if (key) previous = key;
  }

  return { text: kept.join(" ").trim(), issues };
}

function fixIncompleteEnding(text: string): SegmentCleanup {
  const issues: EditorialCleanupIssue[] = [];
  let next = text.trim();
  const truncatedTail = next.match(/(?:^|[\s.!?])(E io|E lui|E lei|Ma|Perch[eé]|E)\s*$/i);
  if (truncatedTail) {
    issues.push({ type: "incomplete_sentence", severity: "high", before: truncatedTail[1], after: "" });
    next = next.slice(0, truncatedTail.index).trim();
  }

  const danglingWord = next.match(/\b(a|il|lo|la|di|da|con|per|che|non)\s*$/i);
  if (danglingWord && next.length > 80) {
    issues.push({ type: "incomplete_sentence", severity: "medium", before: danglingWord[0], after: "" });
    next = next.slice(0, danglingWord.index).trim();
  }

  if (next && !/[.!?…]"?$/.test(next)) next += ".";
  return { text: next, issues };
}

function cleanupSegment(text: string, title?: string): SegmentCleanup {
  const steps = [
    (value: string) => removeDuplicateHeadings(value, title),
    cleanWhitespace,
    fixKnownCorruptions,
    fixTypos,
    removeRedundantParagraphs,
    removeAdjacentDuplicateSentences,
    fixIncompleteEnding,
    cleanWhitespace,
  ];

  return steps.reduce<SegmentCleanup>(
    (current, step) => {
      const next = step(current.text);
      return { text: next.text, issues: [...current.issues, ...next.issues] };
    },
    { text, issues: [] },
  );
}

function boundaryIssuesToCleanupIssues(issues: SplitBoundaryIssue[]): EditorialCleanupIssue[] {
  return issues.map((issue) => ({
    type: "corrupted_sentence",
    severity: "high",
    before: issue.before,
    after: issue.after || undefined,
  }));
}

function assembleWithBoundaryRepairs(
  subchapters: Array<{ content?: string }>,
  issues: SplitBoundaryIssue[],
): string {
  return subchapters.reduce((assembled, sub, index) => {
    const content = String(sub.content || "").trim();
    if (!content) return assembled;
    if (!assembled) return content;
    const repairedBoundary = issues.some((issue) => issue.boundaryIndex === index - 1 && issue.repaired);
    return `${assembled}${repairedBoundary ? " " : "\n\n"}${content}`;
  }, "").trim();
}

function uniqueChanges(issues: EditorialCleanupIssue[]): string[] {
  const labels: Partial<Record<EditorialCleanupIssueType, string>> = {
    corrupted_sentence: "Corrette frasi corrotte o parole mancanti",
    duplicate_heading: "Rimosse intestazioni duplicate dentro il capitolo",
    typo: "Rimossi refusi evidenti e ripetizioni immediate",
    incomplete_sentence: "Sistemati finali o periodi troncati",
    redundancy: "Ridotti doppioni testuali evidenti",
    markdown_cleanup: "Puliti residui markdown o separatori inutili",
  };
  return Array.from(new Set(issues.map((issue) => labels[issue.type]).filter(Boolean))) as string[];
}

function statsForIssues(issues: EditorialCleanupIssue[]): EditorialCleanupStats {
  return {
    errorsCorrected: issues.filter((issue) => issue.type === "corrupted_sentence" || issue.type === "duplicate_heading").length,
    repetitionsReduced: issues.filter((issue) => issue.type === "redundancy").length,
    incompleteSentencesFixed: issues.filter((issue) => issue.type === "incomplete_sentence").length,
    typosRemoved: issues.filter((issue) => issue.type === "typo" || issue.type === "markdown_cleanup").length,
  };
}

export function hasCleanableChapterContent(content?: string, subchapters?: Chapter["subchapters"]): boolean {
  if (String(content || "").trim().length > 20) return true;
  return Boolean((subchapters || []).some((sub) => String(sub?.content || "").trim().length > 20));
}

export function runEditorialCleanup(input: EditorialCleanupInput): EditorialCleanupResult {
  const subchaptersWithContent = (input.subchapters || []).filter((sub) => String(sub?.content || "").trim().length > 20);

  if (subchaptersWithContent.length > 0) {
    const boundaryRepair = repairSubchapterSplitBoundaries(input.subchapters || []);
    const sourceSubchapters = boundaryRepair.subchapters;
    const cleanedSubchapters = sourceSubchapters.map((sub) => {
      if (!String(sub?.content || "").trim()) return { title: sub?.title || "", content: sub?.content || "" };
      const cleaned = cleanupSegment(sub.content, sub.title);
      return { title: sub.title, content: cleaned.text };
    });
    const issuesFound = [
      ...boundaryIssuesToCleanupIssues(boundaryRepair.issues),
      ...sourceSubchapters.flatMap((sub) => cleanupSegment(sub?.content || "", sub?.title).issues),
    ];
    const cleanedContent = boundaryRepair.issues.some((issue) => issue.repaired)
      ? cleanupSegment(assembleWithBoundaryRepairs(sourceSubchapters, boundaryRepair.issues), input.title).text
      : cleanedSubchapters
          .filter((sub) => sub.content.trim())
          .map((sub) => [sub.title, sub.content].filter(Boolean).join("\n\n"))
          .join("\n\n");
    const stats = statsForIssues(issuesFound);
    return {
      cleanedContent,
      cleanedSubchapters,
      issuesFound,
      changesApplied: uniqueChanges(issuesFound),
      summary: issuesFound.length
        ? "Capitolo pulito dai sottocapitoli senza alterare struttura, voce o contenuti narrativi."
        : "Nessun problema editoriale evidente rilevato nei sottocapitoli.",
      stats,
      confidence: issuesFound.some((issue) => issue.severity === "high") ? 0.86 : 0.78,
    };
  }

  const cleaned = cleanupSegment(input.content, input.title);
  const stats = statsForIssues(cleaned.issues);
  return {
    cleanedContent: cleaned.text,
    issuesFound: cleaned.issues,
    changesApplied: uniqueChanges(cleaned.issues),
    summary: cleaned.issues.length
      ? "Capitolo pulito senza alterare trama, ordine degli eventi o voce."
      : "Nessun problema editoriale evidente rilevato.",
    stats,
    confidence: cleaned.issues.some((issue) => issue.severity === "high") ? 0.86 : 0.76,
  };
}

export function validateEditorialCleanupResult(originalContent: string, result: EditorialCleanupResult): EditorialCleanupValidation {
  const original = String(originalContent || "").trim();
  const cleaned = String(result.cleanedContent || "").trim();

  if (!cleaned) return { valid: false, reason: "La versione pulita e' vuota." };
  if (original.length > 100 && cleaned.length < original.length * 0.6) {
    return { valid: false, reason: "La versione pulita e' troppo corta rispetto all'originale." };
  }
  if (result.issuesFound.some((issue) => issue.severity === "high") && cleaned === original) {
    return { valid: false, reason: "Sono stati rilevati errori gravi, ma il testo non e' cambiato." };
  }
  if (/\bTODO\b|lorem ipsum|\[[^\]]*\]|continua\s*$/i.test(cleaned)) {
    return { valid: false, reason: "La versione pulita contiene ancora placeholder o residui tecnici." };
  }

  return { valid: true };
}
