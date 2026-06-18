/**
 * Manuscript Integrity Guard — post-generation cleanup before save/render/export.
 */

import type { ChapterWritingPlan } from "@/lib/writing-director/chapter-writing-director";
import { detectChapterClicheViolations } from "@/lib/writing-director/chapter-writing-director";

export type ManuscriptIntegrityContext = {
  language?: string;
  chapterTitle?: string;
  chapterNumber?: number;
  expectedSetting?: string;
  bookSetting?: string;
  genre?: string;
  chapterLength?: "short" | "medium" | "long";
  writingPlan?: ChapterWritingPlan;
};

export type ManuscriptIntegrityCorrection = {
  type: string;
  detail?: string;
  pattern?: string;
  countBefore?: number;
  countAfter?: number;
};

export type ManuscriptIntegrityResult = {
  content: string;
  corrections: ManuscriptIntegrityCorrection[];
  warnings: string[];
  repeatedPatterns: string[];
};

const UI_LABEL_LINES = new Set([
  "lunghezza capitolo",
  "breve",
  "medio",
  "lungo",
  "aggiungi sottocapitolo",
  "tools",
  "indice",
  "ascolta",
  "patch",
  "analysis",
  "altro",
  "crediti",
  "piano",
  "dev",
  "wallet locale",
  "free:",
  "dev · wallet locale",
]);

const STRONG_LOCATION_LEAKS = [
  "cattedrale",
  "astronave",
  "ospedale",
  "tribunale",
  "metropolitana",
  "stazione",
  "aeroporto",
  "laboratorio",
  "hotel moderno",
  "supermercato",
  "scuola",
  "ufficio",
];

const FOREST_SETTING_HINTS = ["foresta", "radura", "bosco", "selva", "alberi", "foglie", "villaggio"];

const AI_REPETITION_PATTERNS: Array<{
  id: string;
  regex: RegExp;
  maxShort: number;
  maxMedium: number;
  maxLong: number;
  replacements?: string[];
}> = [
  { id: "annui_lentamente", regex: /annu[iì]\s+lentamente/gi, maxShort: 0, maxMedium: 0, maxLong: 1, replacements: ["abbassò appena il mento"] },
  { id: "annui", regex: /annu[iì](?!\s+lentamente)/gi, maxShort: 0, maxMedium: 0, maxLong: 0, replacements: [] },
  { id: "silenzio_cadde", regex: /il silenzio cadde/gi, maxShort: 1, maxMedium: 1, maxLong: 2 },
  { id: "silenzio_allungo", regex: /il silenzio si allung[òo]/gi, maxShort: 1, maxMedium: 1, maxLong: 2 },
  { id: "per_un_istante", regex: /per un istante/gi, maxShort: 1, maxMedium: 1, maxLong: 2 },
  { id: "voce_bassa", regex: /la voce era bassa/gi, maxShort: 1, maxMedium: 1, maxLong: 1 },
  { id: "nodo_gola", regex: /un nodo alla gola/gi, maxShort: 1, maxMedium: 1, maxLong: 2 },
  { id: "qualcosa_dentro", regex: /qualcosa dentro di (?:lei|lui|loro)/gi, maxShort: 2, maxMedium: 3, maxLong: 4 },
  { id: "come_se", regex: /come se/gi, maxShort: 2, maxMedium: 3, maxLong: 4 },
  { id: "non_era_x_era_y", regex: /non era [^,.\n]{2,40}, era [^,.\n]{2,40}/gi, maxShort: 1, maxMedium: 1, maxLong: 2 },
  { id: "occhi_grigi", regex: /gli occhi grigi/gi, maxShort: 1, maxMedium: 1, maxLong: 2 },
  { id: "certezza_fredda", regex: /una certezza fredda/gi, maxShort: 1, maxMedium: 1, maxLong: 1 },
  { id: "come_un_coltello", regex: /come un coltello/gi, maxShort: 1, maxMedium: 1, maxLong: 1 },
  { id: "passo_avanti", regex: /fece un passo avanti/gi, maxShort: 1, maxMedium: 2, maxLong: 2 },
  { id: "passo_indietro", regex: /fece un passo indietro/gi, maxShort: 1, maxMedium: 2, maxLong: 2 },
  { id: "cuore_batteva", regex: /il cuore (?:le|gli|mi) batteva/gi, maxShort: 1, maxMedium: 1, maxLong: 2 },
  { id: "abbasso_sguardo", regex: /abbass[òo] lo sguardo/gi, maxShort: 1, maxMedium: 2, maxLong: 3 },
  { id: "strinse_mascella", regex: /strinse la mascella/gi, maxShort: 1, maxMedium: 1, maxLong: 2 },
  { id: "non_rispose_subito", regex: /non rispose subito/gi, maxShort: 1, maxMedium: 1, maxLong: 2 },
];

function normalizeComparable(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titlesSimilar(a: string, b: string): boolean {
  const na = normalizeComparable(a);
  const nb = normalizeComparable(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const naWords = na.split(" ").filter((w) => w.length > 2);
  const nbWords = new Set(nb.split(" ").filter((w) => w.length > 2));
  const overlap = naWords.filter((w) => nbWords.has(w)).length;
  return overlap >= Math.min(3, Math.ceil(naWords.length * 0.7));
}

export function removeDuplicateChapterHeading(
  content: string,
  chapterTitle?: string,
  chapterNumber?: number,
): { content: string; removed: boolean } {
  if (!content?.trim() || !chapterTitle?.trim()) return { content, removed: false };

  const lines = content.split("\n");
  let start = 0;
  while (start < lines.length && !lines[start]?.trim()) start += 1;
  if (start >= lines.length) return { content, removed: false };

  const firstLine = lines[start]!.trim();
  const cleanTitle = chapterTitle.trim();
  const num = chapterNumber != null ? chapterNumber + 1 : null;

  const patterns = [
    new RegExp(`^capitolo\\s+${num ?? "\\d+"}\\s*[:.\\-–—]\\s*(.+)$`, "i"),
    new RegExp(`^#{1,3}\\s+(.+)$`),
    /^(.+)$/,
  ];

  let shouldRemove = false;
  for (const pattern of patterns) {
    const match = firstLine.match(pattern);
    const candidate = (match?.[1] ?? match?.[0] ?? firstLine).replace(/^#+\s*/, "").trim();
    if (titlesSimilar(candidate, cleanTitle)) {
      shouldRemove = true;
      break;
    }
  }

  if (!shouldRemove) return { content, removed: false };

  const rest = lines.slice(start + 1).join("\n").replace(/^\n+/, "");
  return { content: rest.trim(), removed: true };
}

export function removeUiLabelsFromManuscript(content: string): { content: string; removed: string[] } {
  const removed: string[] = [];
  const kept = content
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      const key = normalizeComparable(trimmed);
      if (UI_LABEL_LINES.has(key)) {
        removed.push(trimmed);
        return false;
      }
      if (/^(dev|wallet locale|free)\b/i.test(trimmed) && trimmed.length < 40) {
        removed.push(trimmed);
        return false;
      }
      return true;
    })
    .join("\n");
  return { content: kept, removed };
}

export function normalizeMarkdownItalics(content: string): { content: string; fixed: number } {
  let fixed = 0;
  let result = content;

  const fixSpan = (inner: string) => {
    fixed += 1;
    const trimmed = inner.trim().replace(/\s+\./g, ".");
    return `*${capitalizeItalicInner(trimmed)}*`;
  };

  result = result.replace(/\*\s+([^*\n]+?)\s+\*/g, (_, inner: string) => fixSpan(inner));
  result = result.replace(/\*([^*\n]+?)\s+\*/g, (_, inner: string) => fixSpan(inner));
  result = result.replace(/\*\s+([^*\n]+?)\*/g, (_, inner: string) => fixSpan(inner));

  return { content: result, fixed };
}

function capitalizeItalicInner(text: string): string {
  if (!text) return text;
  const first = text.charAt(0);
  if (first === first.toUpperCase() && first !== first.toLowerCase()) return text;
  return first.toUpperCase() + text.slice(1);
}

function buildExpectedContextBag(context: ManuscriptIntegrityContext): string {
  return [
    context.expectedSetting,
    context.bookSetting,
    context.chapterTitle,
    context.genre,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function detectSceneContextLeaks(
  content: string,
  context: ManuscriptIntegrityContext,
): string[] {
  const bag = buildExpectedContextBag(context);
  const leaks: string[] = [];
  const lower = content.toLowerCase();

  for (const location of STRONG_LOCATION_LEAKS) {
    if (!lower.includes(location)) continue;
    if (bag.includes(location)) continue;
    leaks.push(location);
  }
  return [...new Set(leaks)];
}

export function repairObviousSceneLeaks(
  content: string,
  leaks: string[],
  context: ManuscriptIntegrityContext,
): { content: string; repaired: string[] } {
  if (!leaks.length) return { content, repaired: [] };

  const bag = buildExpectedContextBag(context);
  const forestLike = FOREST_SETTING_HINTS.some((h) => bag.includes(h));
  let result = content;
  const repaired: string[] = [];

  if (forestLike && leaks.includes("cattedrale")) {
    const replacement =
      "La radura sembrava trattenere il respiro. Da qualche parte cadde una goccia d'acqua dalle foglie.";
    const pattern = /La cattedrale cadeva a pezzi\.?\s*Da qualche parte cad[eé] una goccia d['']acqua\.?/gi;
    if (pattern.test(result)) {
      result = result.replace(pattern, replacement);
      repaired.push("cattedrale→radura");
    } else if (/\bcattedrale\b/i.test(result)) {
      result = result.replace(/\bLa cattedrale[^.!?]*[.!?]/gi, replacement);
      repaired.push("cattedrale");
    }
  }

  return { content: result, repaired };
}

export function detectAiRepetitionPatterns(content: string): Array<{ pattern: string; count: number }> {
  const found: Array<{ pattern: string; count: number }> = [];
  const annuiCount = (content.match(/annu[iì](\s+lentamente)?/gi) || []).length;
  if (annuiCount) found.push({ pattern: "annui", count: annuiCount });
  for (const entry of AI_REPETITION_PATTERNS) {
    if (entry.id.startsWith("annui")) continue;
    const matches = content.match(entry.regex);
    if (matches?.length) {
      found.push({ pattern: entry.id, count: matches.length });
    }
  }
  const guardLook = /\b(la guardò|lei lo guardò|lui la guardò|(?:\w+\s+)?guardò)\b/gi;
  const guardCount = (content.match(guardLook) || []).length;
  if (guardCount >= 4) found.push({ pattern: "guardò", count: guardCount });
  return found;
}

function reduceAnnuiFamily(text: string, max: number): { text: string; removed: number } {
  const re = /annu[iì](\s+lentamente)?/gi;
  const before = (text.match(re) || []).length;
  if (before <= max) return { text, removed: 0 };
  let occurrence = 0;
  const alts = ["non aggiunse altro", "accettò in silenzio", "abbassò appena il mento"];
  const result = text.replace(re, (full) => {
    occurrence += 1;
    if (occurrence <= max) return full;
    return alts[(occurrence - max - 1) % alts.length]!;
  });
  return { text: result, removed: before - max };
}

function maxForLength(
  entry: (typeof AI_REPETITION_PATTERNS)[number],
  length: ManuscriptIntegrityContext["chapterLength"],
): number {
  if (length === "long") return entry.maxLong;
  if (length === "medium") return entry.maxMedium;
  return entry.maxShort;
}

export function reduceAiRepetitionPatterns(
  content: string,
  context: ManuscriptIntegrityContext,
): { content: string; corrections: ManuscriptIntegrityCorrection[]; warnings: string[] } {
  let result = content;
  const corrections: ManuscriptIntegrityCorrection[] = [];
  const warnings: string[] = [];

  const annuiMax =
    context.chapterLength === "long" ? 2 : 1;
  const annuiReduced = reduceAnnuiFamily(result, annuiMax);
  if (annuiReduced.removed > 0) {
    result = annuiReduced.text;
    corrections.push({
      type: "ai_repetition_reduced",
      pattern: "annui",
      countBefore: annuiReduced.removed + annuiMax,
      countAfter: annuiMax,
    });
  }

  const sorted = [...AI_REPETITION_PATTERNS].filter((e) => !e.id.startsWith("annui")).sort(
    (a, b) => b.regex.source.length - a.regex.source.length,
  );

  for (const entry of sorted) {
    const max = maxForLength(entry, context.chapterLength || "medium");
    const flags = entry.regex.flags.includes("g") ? entry.regex.flags : `${entry.regex.flags}g`;
    const re = new RegExp(entry.regex.source, flags);
    const before = (result.match(re) || []).length;
    if (before <= max) continue;

    let occurrence = 0;
    result = result.replace(re, (match) => {
      occurrence += 1;
      if (occurrence <= max) return match;
      const alt = entry.replacements?.[(occurrence - max - 1) % (entry.replacements?.length || 1)];
      if (alt) return alt;
      return "";
    });
    result = result
      .replace(/(\w)\s+\./g, "$1.")
      .replace(/\s{2,}/g, " ")
      .replace(/ \n/g, "\n")
      .replace(/\n{3,}/g, "\n\n");

    const after = (result.match(re) || []).length;
    if (before > after || occurrence > max) {
      corrections.push({
        type: "ai_repetition_reduced",
        pattern: entry.id,
        countBefore: before,
        countAfter: Math.min(after, max),
      });
    }
  }

  const guardPattern = /\b([A-ZÀ-Ú][a-zà-ú]+)\s+(?:la\s+|lo\s+)?guardò\b/gi;
  const guardMatches = [...result.matchAll(guardPattern)];
  if (guardMatches.length > 5) {
    let seen = 0;
    result = result.replace(guardPattern, (match) => {
      seen += 1;
      if (seen <= 3) return match;
      return "";
    });
    corrections.push({
      type: "ai_repetition_reduced",
      pattern: "guardò",
      countBefore: guardMatches.length,
      countAfter: 3,
    });
  }

  const repeated = detectAiRepetitionPatterns(result).filter((r) => {
    const entry = AI_REPETITION_PATTERNS.find((e) => e.id === r.pattern);
    if (!entry) return r.count > 5;
    return r.count > maxForLength(entry, context.chapterLength || "medium");
  });
  for (const r of repeated) {
    warnings.push(`Pattern ripetuto: ${r.pattern} (${r.count}x)`);
  }

  return { content: result.trim(), corrections, warnings };
}

export function sanitizeGeneratedChapterContent(
  content: string,
  context: ManuscriptIntegrityContext = {},
): ManuscriptIntegrityResult {
  const corrections: ManuscriptIntegrityCorrection[] = [];
  const warnings: string[] = [];

  let text = content || "";

  const heading = removeDuplicateChapterHeading(text, context.chapterTitle, context.chapterNumber);
  if (heading.removed) {
    text = heading.content;
    corrections.push({ type: "duplicate_heading_removed", detail: context.chapterTitle });
  }

  const ui = removeUiLabelsFromManuscript(text);
  if (ui.removed.length) {
    text = ui.content;
    corrections.push({ type: "ui_labels_removed", countBefore: ui.removed.length });
  }

  const md = normalizeMarkdownItalics(text);
  if (md.fixed) {
    text = md.content;
    corrections.push({ type: "markdown_italics_normalized", countBefore: md.fixed });
  }

  const leaks = detectSceneContextLeaks(text, context);
  if (leaks.length) {
    const repair = repairObviousSceneLeaks(text, leaks, context);
    text = repair.content;
    if (repair.repaired.length) {
      corrections.push({ type: "scene_leak_repaired", detail: repair.repaired.join(", ") });
    } else {
      warnings.push(`Possibile leak di setting: ${leaks.join(", ")}`);
    }
  }

  const repetition = reduceAiRepetitionPatterns(text, context);
  text = repetition.content;
  corrections.push(...repetition.corrections);
  warnings.push(...repetition.warnings);

  const mdFinal = normalizeMarkdownItalics(text);
  if (mdFinal.fixed) {
    text = mdFinal.content;
    corrections.push({ type: "markdown_italics_normalized", countBefore: mdFinal.fixed });
  }

  if (context.writingPlan) {
    const clicheViolations = detectChapterClicheViolations(text, context.writingPlan);
    for (const v of clicheViolations) {
      warnings.push(`Cliché/violazione: ${v.type} — ${v.detail}`);
      corrections.push({ type: "cliche_detected", detail: `${v.type}: ${v.detail}` });
    }
  }

  const repeatedPatterns = detectAiRepetitionPatterns(text).map((r) => `${r.pattern}:${r.count}`);

  return {
    content: text.trim(),
    corrections,
    warnings,
    repeatedPatterns,
  };
}
