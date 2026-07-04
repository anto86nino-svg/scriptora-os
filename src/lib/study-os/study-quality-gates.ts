export type StudyQualityStatus = "pass" | "warning" | "fail";

export interface StudyTextQualityReport {
  status: StudyQualityStatus;
  score: number;
  reason: string;
  detectedIssues: string[];
  suggestedAction: string;
  suspiciousLines: string[];
}

export interface StudyOutputQualityReport {
  status: StudyQualityStatus;
  score: number;
  detectedIssues: string[];
}

export const STUDY_TEXT_NOT_READABLE_MESSAGE =
  "Il testo non è leggibile abbastanza per creare materiale di studio affidabile. Riscatta la foto con più luce, tieni la pagina dritta e assicurati che le parole siano nitide.";

export const STUDY_TEXT_WARNING_MESSAGE =
  "Ho letto il testo, ma alcune parti sembrano poco chiare. Puoi continuare, ma il materiale potrebbe essere meno preciso.";

export const STUDY_TEXT_READY_MESSAGE =
  "Materiale pronto per lo studio.";

export type StudyTextSourceKind = "pasted" | "pdf" | "docx" | "epub" | "image" | "ocr" | "unknown";

const COMMON_WORDS = new Set([
  "anche", "come", "della", "delle", "degli", "dopo", "essere", "molto", "nella", "nelle",
  "parte", "perche", "prima", "questa", "questo", "senza", "sopra", "sotto", "stato", "tutto",
  "about", "after", "again", "because", "before", "between", "could", "every", "other", "people",
  "their", "there", "these", "those", "which", "would",
]);

const PLACEHOLDER_PATTERN =
  /\b(la spiegazione sta nel contesto|come indicato nel manoscritto|questo termine è importante nel testo|questo termine e' importante nel testo|dipende dal contesto|non disponibile|placeholder|n\/a|definizione scolastica:|concetto da spiegare con definizione|da spiegare con definizione)\b/i;

const VOCABULARY_PLACEHOLDER_PATTERN =
  /\b(definizione \+ esempio|collegalo al tema centrale|testo incollato|definizione scolastica)\b/i;

export function resolveStudyTextSourceKind(sourceType?: string): StudyTextSourceKind {
  const kind = String(sourceType || "").toLowerCase();
  if (kind === "image" || kind === "ocr") return "image";
  if (kind === "pdf") return "pdf";
  if (kind === "docx" || kind === "doc") return "docx";
  if (kind === "epub") return "epub";
  if (kind === "txt" || kind === "text" || kind === "md" || kind === "markdown" || kind === "pasted") return "pasted";
  return "unknown";
}

function isPastedOrDocumentSource(kind: StudyTextSourceKind): boolean {
  return kind === "pasted" || kind === "pdf" || kind === "docx" || kind === "epub";
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function wordsOf(text: string): string[] {
  return String(text || "").match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || [];
}

function alphaWordsOf(text: string): string[] {
  return String(text || "").match(/\p{L}[\p{L}'’-]*/gu) || [];
}

function hasVerbLikeStructure(sentence: string): boolean {
  return /\b(è|e'|sono|era|erano|ha|hanno|aveva|può|possono|deve|devono|viene|vengono|consiste|produce|provoca|determina|indica|spiega|descrive|permette|is|are|was|were|has|have|can|must|means|causes|describes)\b/i.test(sentence);
}

export function hasStudyPlaceholderText(text: string): boolean {
  return PLACEHOLDER_PATTERN.test(String(text || ""));
}

export function isMeaningfulStudyKeyword(term: string): boolean {
  const clean = String(term || "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s'’-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const lower = clean.toLowerCase().replace(/[’']/g, "");
  const parts = lower.split(/\s+/).filter(Boolean);

  if (!clean || clean.length < 4 || clean.length > 64) return false;
  if (parts.length > 4) return false;
  if (parts.some((part) => part.length <= 2)) return false;
  if (parts.every((part) => COMMON_WORDS.has(part))) return false;
  if (/^\d+$/.test(lower)) return false;
  if (/(.)\1{3,}/.test(lower)) return false;
  if (hasStudyPlaceholderText(lower)) return false;
  return true;
}

export function evaluateStudyTextQuality(
  text: string,
  options: { sourceType?: string; ocrConfidence?: number; minWords?: number } = {},
): StudyTextQualityReport {
  const sourceKind = resolveStudyTextSourceKind(options.sourceType);
  const pastedOrDocument = isPastedOrDocumentSource(sourceKind);
  const normalized = String(text || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
  const words = wordsOf(normalized);
  const alphaWords = alphaWordsOf(normalized);
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const sentences = normalized.replace(/\n+/g, " ").match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || [];
  const minWords = options.minWords ?? 40;
  const issues: string[] = [];
  const suspiciousLines: string[] = [];
  const paragraphs = normalized.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  const hasCoherentParagraphs = paragraphs.length >= 2 && paragraphs.some((part) => wordsOf(part).length >= 20);
  const formulaSignals = normalized.match(
    /[=<>±√∑∫π^*]|(?:\b\d+\/\d+\b)|(?:\b(?:formula|equazione|funzione|teorema|forza|energia|massa|accelerazione|velocità|corrente|tensione)\b)/gi,
  ) || [];
  const formulaRichText = formulaSignals.length >= 3;

  if (words.length < minWords) issues.push(`testo troppo corto (${words.length}/${minWords} parole)`);

  const validAlphaWords = alphaWords.filter((word) => /^\p{L}{3,}$/u.test(word));
  const validWordRatio = words.length ? validAlphaWords.length / words.length : 0;
  if (words.length >= minWords && validWordRatio < 0.62 && !formulaRichText) issues.push("troppi token non leggibili o non alfabetici");

  const weirdChars = normalized.match(/[^\p{L}\p{N}\s.,;:!?'"()\-–—/%=+*^°àèéìòùÀÈÉÌÒÙ]/gu) || [];
  const weirdCharRatio = normalized.length ? weirdChars.length / normalized.length : 0;
  if (weirdCharRatio > 0.035) issues.push("troppi caratteri anomali");

  const shortRuns = normalized.match(/\b\p{L}{1,2}(?:\s+\p{L}{1,2}){2,}\b/gu) || [];
  if (shortRuns.length >= 2) issues.push("parole spezzate in sillabe");

  const brokenLineEndings = lines.filter((line) => /\b\p{L}{1,2}$/u.test(line) && !/[.!?:;,"')\]-]$/.test(line));
  if (brokenLineEndings.length >= Math.max(2, Math.ceil(lines.length * 0.18))) issues.push("righe che terminano con frammenti di parola");
  suspiciousLines.push(...brokenLineEndings.slice(0, 4));

  const fragmentedLines = lines.filter((line) => {
    const count = wordsOf(line).length;
    return count > 0 && count <= 3 && !/[.!?]$/.test(line);
  });
  if (lines.length >= 6 && fragmentedLines.length / lines.length > 0.42) issues.push("troppe righe brevi e frammentate");
  suspiciousLines.push(...fragmentedLines.slice(0, 4));

  const structuredSentences = sentences.filter((sentence) => wordsOf(sentence).length >= 6 && hasVerbLikeStructure(sentence));
  const verbLessSentences = sentences.filter((sentence) => wordsOf(sentence).length >= 4 && !hasVerbLikeStructure(sentence));
  const verbLessRatio = sentences.length ? verbLessSentences.length / sentences.length : 0;
  const structuredRatio = sentences.length ? structuredSentences.length / sentences.length : 0;
  const shouldCheckStructure = sourceKind === "image" || sourceKind === "ocr" || typeof options.ocrConfidence === "number";
  const lacksStructureProof =
    structuredSentences.length < Math.max(2, Math.floor(sentences.length * 0.18))
    && verbLessRatio > 0.42
    && !hasCoherentParagraphs;
  if (
    words.length >= minWords
    && !formulaRichText
    && shouldCheckStructure
    && lacksStructureProof
    && !(pastedOrDocument && structuredRatio >= 0.22 && hasCoherentParagraphs)
  ) {
    issues.push("frasi senza struttura minima");
  }

  if (typeof options.ocrConfidence === "number") {
    if (options.ocrConfidence < 55) issues.push(`confidenza OCR bassa (${Math.round(options.ocrConfidence)}%)`);
    else if (options.ocrConfidence < 72) issues.push(`confidenza OCR da verificare (${Math.round(options.ocrConfidence)}%)`);
  }

  let score = 100;
  if (words.length < minWords) score -= words.length < 12 ? 75 : 48;
  score -= Math.max(0, (formulaRichText ? 0.55 : 0.78) - validWordRatio) * (formulaRichText ? 35 : 80);
  score -= Math.min(26, weirdCharRatio * 480);
  score -= Math.min(28, shortRuns.length * 7);
  score -= Math.min(20, brokenLineEndings.length * 4);
  score -= Math.min(18, fragmentedLines.length * 2);
  if (structuredSentences.length < 1 && words.length >= minWords && !formulaRichText) score -= 18;
  if (typeof options.ocrConfidence === "number") score -= Math.max(0, 72 - options.ocrConfidence) * 0.65;
  if (pastedOrDocument && hasCoherentParagraphs && structuredRatio >= 0.2) score += 12;
  if (pastedOrDocument && words.length >= 200 && structuredRatio >= 0.25) score += 6;
  if (pastedOrDocument && issues.length === 0 && words.length >= 150) score = Math.max(score, 92);
  score = clampScore(score);

  const hardFail =
    words.length < 12
    || (words.length < minWords && options.sourceType === "image")
    || (validWordRatio < 0.48 && !formulaRichText)
    || weirdCharRatio > 0.08
    || (options.sourceType === "image" && weirdChars.length >= 20 && weirdCharRatio > 0.02)
    || shortRuns.length >= 4
    || (typeof options.ocrConfidence === "number" && options.ocrConfidence < 45);

  const warningThreshold = pastedOrDocument ? 82 : 78;
  const onlySoftIssues = issues.every((issue) =>
    /confidenza OCR|righe che terminano|righe brevi/i.test(issue),
  );
  const status: StudyQualityStatus = hardFail || score < 55
    ? "fail"
    : score >= 90 && !hardFail && (issues.length === 0 || (pastedOrDocument && onlySoftIssues))
      ? "pass"
      : score < warningThreshold || issues.length > 0
        ? "warning"
        : "pass";

  return {
    status,
    score,
    reason: status === "pass"
      ? score >= 90 ? STUDY_TEXT_READY_MESSAGE : "Testo leggibile e adatto alla generazione Study OS."
      : status === "warning"
        ? STUDY_TEXT_WARNING_MESSAGE
        : STUDY_TEXT_NOT_READABLE_MESSAGE,
    detectedIssues: Array.from(new Set(issues)),
    suggestedAction: status === "fail"
      ? "Riscatta foto, carica un'altra immagine o incolla il testo manualmente."
      : status === "warning"
        ? "Controlla il testo estratto prima di continuare."
        : score >= 90 ? STUDY_TEXT_READY_MESSAGE : "Puoi generare il materiale di studio.",
    suspiciousLines: Array.from(new Set(suspiciousLines)).slice(0, 8),
  };
}

export function canGenerateStudyOutputs(report: StudyTextQualityReport | null | undefined): boolean {
  return !report || report.status !== "fail";
}

function hasTruncatedSummarySentence(text: string): boolean {
  return /(?:\b(per|da|di|a|in|con|che|un|una)\s*\.|\bse uno Stato fosse entrato\.|presentavano la guerra come un modo per\.)\s*$/im.test(text);
}

function hasSummaryDuplication(text: string): boolean {
  const compact = text.replace(/\s+/g, " ");
  if (/\bLa Prima guerra mondiale La Prima guerra mondiale\b/i.test(compact)) return true;
  if (compact.length > 4000) {
    const chunks = compact.toLowerCase().match(/\b[\p{L}][\p{L}'’-]{5,}\s+[\p{L}][\p{L}'’-]{5,}\b/gu) || [];
    const seen = new Set<string>();
    for (const chunk of chunks) {
      if (seen.has(chunk)) return true;
      seen.add(chunk);
    }
    return false;
  }
  return /(.{18,}?)\1/i.test(compact);
}

function hasNonIntroductorySummaryStart(text: string): boolean {
  const body = text.replace(/^Riassunto[^\n]*\n+/i, "").trim();
  return /^Per la sua estensione\b/i.test(body);
}

export function evaluateSummaryQuality(summary: string, sourceText = ""): StudyOutputQualityReport {
  const text = String(summary || "").trim();
  const words = wordsOf(text).length;
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const bulletLines = lines.filter((line) => /^[•\-\d.)]/.test(line)).length;
  const tableLines = lines.filter((line) => /^\|.*\|$/.test(line)).length;
  const issues: string[] = [];

  if (words < (wordsOf(sourceText).length > 250 ? 80 : 35)) issues.push("riassunto troppo corto");
  if (lines.length > 3 && bulletLines / lines.length > 0.65) issues.push("riassunto simile a lista, non discorsivo");
  if (tableLines > 0 || /\|[^\n]+\|/.test(text)) issues.push("tabella usata nel campo riassunto");
  if (hasStudyPlaceholderText(text)) issues.push("placeholder nel riassunto");
  if (/\b(questo testo parla di|argomento importante|concetti vari)\b/i.test(text)) issues.push("frasi generiche");
  if (hasTruncatedSummarySentence(text)) issues.push("frasi troncate nel riassunto");
  if (hasSummaryDuplication(text)) issues.push("duplicazioni nel riassunto");
  if (hasNonIntroductorySummaryStart(text)) issues.push("incipit non introduttivo");

  const score = clampScore(100 - issues.length * 24 - (words < 35 ? 20 : 0));
  return {
    status: issues.length >= 2 || score < 55 ? "fail" : issues.length ? "warning" : "pass",
    score,
    detectedIssues: issues,
  };
}

export function ensureDiscursiveStudySummary(summary: string, fallback: string): string {
  const report = evaluateSummaryQuality(summary);
  const defective =
    report.status === "fail"
    || hasTruncatedSummarySentence(summary)
    || hasSummaryDuplication(summary)
    || hasNonIntroductorySummaryStart(summary);
  if (!defective) return summary;

  const lines = String(summary || fallback || "")
    .split("\n")
    .map((line) => line.replace(/^[•\-\d.)\s]+/, "").trim())
    .filter(Boolean)
    .filter((line) => !/^\|.*\|$/.test(line))
    .slice(0, 10);

  if (!lines.length) return fallback;
  const title = lines[0];
  const body = lines.slice(1).join(" ");
  return [title, body || fallback].filter(Boolean).join("\n\n");
}

export function evaluateExerciseQuality(
  exercises: Array<{ prompt?: string; solution?: string; explanation?: string; difficulty?: string; level?: string; sourceConcept?: string }>,
): StudyOutputQualityReport {
  const issues: string[] = [];
  if (exercises.length < 6) issues.push("pochi esercizi");
  if (new Set(exercises.map((item) => item.difficulty || item.level).filter(Boolean)).size < 3) issues.push("livelli insufficienti");
  if (exercises.some((item) => !item.prompt || !item.explanation || !item.solution)) issues.push("esercizi senza risposta o spiegazione");
  if (exercises.some((item) => hasStudyPlaceholderText(`${item.prompt || ""} ${item.solution || ""} ${item.explanation || ""}`))) issues.push("placeholder negli esercizi");
  if (exercises.some((item) => !item.sourceConcept)) issues.push("manca riferimento al concetto studiato");
  const score = clampScore(100 - issues.length * 22);
  return {
    status: issues.includes("placeholder negli esercizi") || issues.length >= 2 ? "fail" : issues.length ? "warning" : "pass",
    score,
    detectedIssues: issues,
  };
}

export function evaluateKeywordQuality(
  words: Array<{ word?: string; simple?: string; technical?: string; example?: string; school?: string; advanced?: string }>,
): StudyOutputQualityReport {
  const issues: string[] = [];
  const terms = words.map((item) => String(item.word || ""));
  if (terms.some((term) => !isMeaningfulStudyKeyword(term))) issues.push("keyword casuali o frammenti OCR");
  if (new Set(terms.map((term) => term.toLowerCase())).size < terms.length) issues.push("keyword duplicate");
  if (words.some((item) => !item.simple || !item.technical || !item.example)) issues.push("definizioni incomplete");
  if (words.some((item) => hasStudyPlaceholderText(`${item.simple || ""} ${item.technical || ""} ${item.example || ""} ${item.school || ""} ${item.advanced || ""} ${item.examQuestion || ""}`))) {
    issues.push("placeholder nelle spiegazioni");
  }
  if (words.some((item) => VOCABULARY_PLACEHOLDER_PATTERN.test(`${item.school || ""} ${item.simple || ""} ${item.technical || ""}`))) {
    issues.push("definizioni generiche");
  }
  const score = clampScore(100 - issues.length * 25);
  const hardFail =
    issues.includes("placeholder nelle spiegazioni") ||
    issues.includes("definizioni incomplete") ||
    issues.includes("keyword casuali o frammenti OCR");
  return { status: hardFail || issues.length >= 2 ? "fail" : issues.length ? "warning" : "pass", score, detectedIssues: issues };
}
