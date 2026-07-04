import { countStudyWords } from "@/lib/study-session";

const BANNED_TOPIC_PATTERN =
  /\b(testo|materiale|documento|file|nuova[\s-]?sessione|sessione|appunti|dispensa|upload|paste|pasted)[\s_-]*(incollat|caricat|studio|analisi|manuale)?\b/i;

const BANNED_TOPIC_EXACT = new Set([
  "testo incollato",
  "materiale incollato",
  "testo incollato txt",
  "testo",
  "incollato",
  "materiale",
  "materiale studio",
  "materiale di studio",
  "nuova sessione",
  "testo non leggibile",
]);

function normalizeTopic(value: string): string {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/^#+\s*/, "")
    .replace(/^\d+[\).\]]\s*/, "")
    .trim();
}

function normalizeTopicKey(value: string): string {
  return normalizeTopic(value).toLowerCase().replace(/[_-]+/g, " ");
}

export function isBannedStudyTopic(value: string): boolean {
  const clean = normalizeTopic(value);
  if (!clean) return true;
  const key = normalizeTopicKey(clean);
  if (BANNED_TOPIC_EXACT.has(key)) return true;
  if (BANNED_TOPIC_PATTERN.test(clean)) return true;
  if (/^testo[\s_-]*incollat/i.test(clean)) return true;
  if (/^materiale[\s_-]*incollat/i.test(clean)) return true;
  if (key === "testo incollato" || key === "materiale incollato") return true;
  return false;
}

function formatTitleLine(line: string): string {
  const clean = normalizeTopic(line);
  if (!clean) return "";
  if (/^[A-ZÀ-Ý]/.test(clean) && clean.split(/\s+/).length <= 8) return clean;
  return clean
    .split(/\s+/)
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : ""))
    .join(" ");
}

function isTitleCandidate(line: string): boolean {
  const clean = normalizeTopic(line);
  if (!clean || isBannedStudyTopic(clean)) return false;
  const words = countStudyWords(clean);
  if (words < 2 || words > 12) return false;
  if (/[.!?…:;]$/.test(clean) && words > 6) return false;
  if (/^(le cause|lo scoppio|l'italia|il 1917|la fine|le conseguenze|i trattati)\b/i.test(clean)) return false;
  return true;
}

function titleFromSourceName(sourceName: string): string {
  return normalizeTopic(
    String(sourceName || "")
      .replace(/\.(txt|md|markdown|docx|pdf|epub|png|jpe?g|webp|heic|heif)$/i, "")
      .replace(/[_-]+/g, " "),
  );
}

function titleFromProminentHeading(text: string): string {
  const lines = String(text || "")
    .split(/\n/)
    .map((line) => normalizeTopic(line))
    .filter(Boolean);

  for (const line of lines.slice(0, 6)) {
    if (!isTitleCandidate(line)) continue;
    if (/\b(guerra mondiale|rivoluzione|impero|trattato|repubblica|rivoluzione)\b/i.test(line)) {
      return formatTitleLine(line);
    }
  }
  return "";
}

/** Extract a real study topic from pasted text — never "testo incollato". */
export function extractStudyTopic(text: string, sourceName = ""): string {
  const lines = String(text || "")
    .split(/\n/)
    .map((line) => normalizeTopic(line))
    .filter(Boolean);

  for (const line of lines.slice(0, 4)) {
    if (isTitleCandidate(line)) return formatTitleLine(line);
  }

  const fromHeading = titleFromProminentHeading(text);
  if (fromHeading && !isBannedStudyTopic(fromHeading)) return fromHeading;

  const fromName = titleFromSourceName(sourceName);
  if (fromName && !isBannedStudyTopic(fromName)) return fromName;

  if (/\bprima guerra mondiale\b/i.test(text)) return "La Prima guerra mondiale";
  if (/\bseconda guerra mondiale\b/i.test(text)) return "La Seconda guerra mondiale";
  if (/\brivoluzione francese\b/i.test(text)) return "La Rivoluzione francese";

  return "Materiale di studio";
}

export function sanitizeStudyTopic(value: string, textFallback = ""): string {
  const clean = normalizeTopic(value);
  if (!clean || isBannedStudyTopic(clean)) {
    return textFallback ? extractStudyTopic(textFallback, "") : "Materiale di studio";
  }
  return clean;
}

export function replaceBannedTopicPhrases(text: string, topic: string): string {
  const safeTopic = sanitizeStudyTopic(topic);
  return String(text || "")
    .replace(/\b(tema centrale|argomento|titolo)\s*:\s*(testo|materiale)[\s_-]*incollat\w*/gi, `$1: ${safeTopic}`)
    .replace(/\btesto[\s_-]*incollat\w*\b/gi, safeTopic)
    .replace(/\bmateriale[\s_-]*incollat\w*\b/gi, safeTopic);
}
