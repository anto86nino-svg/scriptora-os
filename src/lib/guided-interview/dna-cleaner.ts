/** Sanitize and assess DNA text quality — prevents dirty/repetitive blueprint gates. */

export type DnaQualityReport = {
  pass: boolean;
  isDirty: boolean;
  isRepetitive: boolean;
  isAmbiguous: boolean;
  isIncomplete: boolean;
  issues: string[];
};

const REPETITION_LOOP = /\b(\w{2,12})(?:\s+\1){2,}\b/gi;
const ARTIFACT_PATTERN = /\b(un|il|la|lo|di|che|e)\s+(?:\1\s+){2,}/gi;

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Remove loops, dedupe phrases, normalize whitespace. */
export function sanitizeDnaText(value: unknown): string {
  return hardSanitizeDnaText(value);
}

/** Hard sanitize — dedupe tokens, remove loops, phrase repair, semantic compression. */
export function hardSanitizeDnaText(value: unknown): string {
  let text = clean(value);
  if (!text) return "";

  text = text.replace(ARTIFACT_PATTERN, "$1 ");
  text = text.replace(REPETITION_LOOP, "$1");

  // Phrase-level dedup: "un romanzo un romanzo" → "un romanzo"
  text = text.replace(/\b(\w+(?:\s+\w+){0,3})\s+\1\b/gi, "$1");
  text = text.replace(/\b(un|il|la|lo|di|che|e|a|in)\s+(?:\1\s+)+/gi, "$1 ");

  const words = text.split(/\s+/).filter(Boolean);
  const deduped: string[] = [];
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i].toLowerCase();
    const prev = deduped[deduped.length - 1]?.toLowerCase();
    const prev2 = deduped[deduped.length - 2]?.toLowerCase();
    if (w === prev && w === prev2) continue;
    deduped.push(words[i]);
  }
  text = deduped.join(" ");

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const uniqueSentences: string[] = [];
  for (const s of sentences) {
    const key = s.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueSentences.push(s);
  }
  text = uniqueSentences.join(" ").trim();

  if (text.length > 420) {
    text = `${text.slice(0, 400).replace(/\s+\S*$/, "")}…`;
  }

  return text.replace(/\s{2,}/g, " ").trim();
}

export function isDnaTooDirtyToShow(extracted: Record<string, unknown>): boolean {
  const joined = Object.values(extracted).map(hardSanitizeDnaText).join(" ");
  if (!joined.trim()) return false;
  const report = assessDnaQuality(extracted, { confidence: 1 });
  return report.isDirty || report.isRepetitive || /\bun un\b|\bun romanzo un romanzo\b/i.test(joined);
}

export function repairDnaFields(extracted: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(extracted)) {
    const sanitized = hardSanitizeDnaText(value);
    if (sanitized && sanitized.length >= 8) out[key] = sanitized;
  }
  return out;
}

export function sanitizeExtractedFields(
  extracted: Record<string, unknown>,
): Record<string, string> {
  return repairDnaFields(extracted);
}

function repetitionScore(text: string): number {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length < 6) return 0;
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
  const maxFreq = Math.max(...freq.values());
  return maxFreq / words.length;
}

export function assessDnaQuality(
  extracted: Record<string, unknown>,
  opts?: { missingCount?: number; confidence?: number },
): DnaQualityReport {
  const issues: string[] = [];
  const rawJoined = Object.values(extracted)
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean)
    .join(" ");
  const values = Object.values(extracted).map(hardSanitizeDnaText).filter(Boolean);
  const joined = values.join(" ");

  const isRepetitive =
    repetitionScore(rawJoined) > 0.22 ||
    repetitionScore(joined) > 0.22 ||
    REPETITION_LOOP.test(rawJoined) ||
    /\b(\w+)\s+\1\b/i.test(rawJoined);

  const isDirty =
    /\bun un\b|\bun romanzo un romanzo\b/i.test(rawJoined) ||
    (rawJoined.length > 0 && joined.length < rawJoined.length * 0.55);

  const isAmbiguous =
    values.length > 0 &&
    values.filter((v) => v.length < 16).length >= Math.max(2, values.length - 2);

  const isIncomplete = (opts?.missingCount ?? 0) > 0;

  if (isRepetitive) issues.push("Testo ripetitivo o loop lessicali.");
  if (isDirty) issues.push("DNA sporco — frasi duplicate o artefatti.");
  if (isAmbiguous) issues.push("Risposte troppo vaghe o ambigue.");
  if (isIncomplete) issues.push("Campi critici ancora mancanti.");
  if ((opts?.confidence ?? 0) < 0.95) issues.push("Confidenza inferenza sotto 95%.");

  const pass = issues.length === 0;

  return { pass, isDirty, isRepetitive, isAmbiguous, isIncomplete, issues };
}

export function getBlockedDnaMessage(report: DnaQualityReport): string {
  if (report.pass) return "";
  return "Ho ancora dubbi sul libro. Voglio capirlo meglio prima di costruirlo.";
}
