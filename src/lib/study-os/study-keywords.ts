import { isMeaningfulStudyKeyword } from "@/lib/study-os/study-quality-gates";
import type { StudyMaterialClassification } from "@/lib/study-session";

/** Italian didactic stoplist — common words that must not become study concepts. */
export const STUDY_DIDACTIC_STOP_WORDS = new Set([
  "erano", "essere", "sono", "era", "hanno", "aveva", "molte", "molti", "molta", "molto",
  "aumento", "nascita", "economica", "economico", "politica", "politico", "mondiale",
  "guerra", "stati", "stato", "parte", "dopo", "prima", "anche", "come", "della", "delle",
  "degli", "degli", "questo", "questa", "quello", "quella", "quindi", "perché", "mentre",
  "sempre", "ancora", "nulla", "qualcosa", "coinvolse", "presentavano", "estensione",
  "testo", "incollato", "materiale", "capitolo", "sezione", "parole", "frase", "frasi",
  "europa", "europei", "europeo", "popoli", "popolo", "grande", "grandi", "nuovo", "nuova",
  "primo", "prima", "secondo", "terzo", "molteplici", "diversi", "diverse", "importante",
  "importanti", "principale", "principali", "sviluppo", "periodo", "anni", "anno",
]);

/** Historical phrases to preserve as single concepts (longest first). */
const HISTORICAL_PHRASE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bprima guerra mondiale\b/gi, label: "Prima guerra mondiale" },
  { pattern: /\btriplice intesa\b/gi, label: "Triplice Intesa" },
  { pattern: /\btriplice alleanza\b/gi, label: "Triplice Alleanza" },
  { pattern: /\bimpero austro[- ]ungarico\b/gi, label: "Impero austro-ungarico" },
  { pattern: /\btrattato di versailles\b/gi, label: "Trattato di Versailles" },
  { pattern: /\battentato di sarajevo\b/gi, label: "Attentato di Sarajevo" },
  { pattern: /\bfrancesco ferdinando\b/gi, label: "Francesco Ferdinando" },
  { pattern: /\bgavrilo princip\b/gi, label: "Gavrilo Princip" },
  { pattern: /\bguerra di trincea\b/gi, label: "Guerra di trincea" },
  { pattern: /\bpatto di londra\b/gi, label: "Patto di Londra" },
  { pattern: /\bvittorio veneto\b/gi, label: "Vittorio Veneto" },
  { pattern: /\brivoluzione russa\b/gi, label: "Rivoluzione russa" },
  { pattern: /\bstati uniti\b/gi, label: "Stati Uniti" },
  { pattern: /\bimperi centrali\b/gi, label: "Imperi centrali" },
  { pattern: /\bbattaglia di caporetto\b/gi, label: "Caporetto" },
  { pattern: /\bcaporetto\b/gi, label: "Caporetto" },
  { pattern: /\bfiume piave\b/gi, label: "Piave" },
  { pattern: /\bpiave\b/gi, label: "Piave" },
  { pattern: /\bnazionalismo\b/gi, label: "Nazionalismo" },
  { pattern: /\bimperialismo\b/gi, label: "Imperialismo" },
  { pattern: /\bmilitarismo\b/gi, label: "Militarismo" },
  { pattern: /\bneutralisti\b/gi, label: "Neutralisti" },
  { pattern: /\binterventisti\b/gi, label: "Interventisti" },
  { pattern: /\barmistizio\b/gi, label: "Armistizio" },
  { pattern: /\balleati\b/gi, label: "Alleanza degli Alleati" },
];

const HISTORY_SINGLE_TERMS = new Set([
  "nazionalismo", "imperialismo", "militarismo", "colonialismo", "neutralismo",
  "interventismo", "trincea", "trincee", "artiglieria", "gas", "sottomarino",
  "tank", "aereo", "propaganda", "totalitarismo", "democrazia", "repubblica",
  "monarchia", "impero", "alleanza", "intesa", "balcani", "sarajevo", "caporetto",
  "versailles", "armistizio", "bolscevismo", "lenin", "wilson", "kaiser",
]);

function normalizeKeyword(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isDidacticStopWord(term: string): boolean {
  const lower = normalizeKeyword(term);
  if (STUDY_DIDACTIC_STOP_WORDS.has(lower)) return true;
  const parts = lower.split(/\s+/);
  if (parts.length === 1 && parts[0].length < 5) return true;
  if (parts.length === 2 && parts.every((p) => STUDY_DIDACTIC_STOP_WORDS.has(p))) return true;
  if (/^(erano|sono|era|hanno|coinvolse|presentavano)\b/i.test(lower)) return true;
  if (/^(molte|molti|aumento|nascita|economica)\b/i.test(lower)) return true;
  return false;
}

function isValidStudyConcept(term: string, classification?: StudyMaterialClassification): boolean {
  const clean = term.trim();
  if (!clean || !isMeaningfulStudyKeyword(clean)) return false;
  if (isDidacticStopWord(clean)) return false;

  const lower = normalizeKeyword(clean);
  if (classification?.type === "history") {
    if (HISTORY_SINGLE_TERMS.has(lower)) return true;
    if (HISTORICAL_PHRASE_PATTERNS.some((item) => normalizeKeyword(item.label) === lower)) return true;
    if (/\b(19|20)\d{2}\b/.test(clean)) return true;
    if (/^[A-ZÀ-Ý]/.test(clean) && clean.split(/\s+/).length <= 4) return true;
    if (/(ismo|zione|alleanza|intesa|impero|trattato|attentato|armistizio|rivoluzione|battaglia)/i.test(lower)) return true;
  }

  if (clean.split(/\s+/).length === 1 && clean.length < 6) return false;
  if (/^(definizione|esempio|collegamento|concetto)$/i.test(lower)) return false;
  return true;
}

function extractHistoricalPhrases(text: string): Array<{ term: string; score: number }> {
  const lower = text.toLowerCase();
  const found = new Map<string, number>();

  for (const { pattern, label } of HISTORICAL_PHRASE_PATTERNS) {
    const matches = lower.match(new RegExp(pattern.source, "gi")) || [];
    if (matches.length) {
      found.set(normalizeKeyword(label), (found.get(normalizeKeyword(label)) || 0) + matches.length * 8);
    }
  }

  return [...found.entries()].map(([term, score]) => ({ term, score }));
}

function extractWeightedWords(text: string, classification?: StudyMaterialClassification): Array<{ term: string; score: number }> {
  const words = text.toLowerCase().match(/[\p{L}][\p{L}'’-]{4,}/gu) || [];
  const counts = new Map<string, number>();

  for (const raw of words) {
    const word = raw.replace(/[’']/g, "").toLowerCase();
    if (STUDY_DIDACTIC_STOP_WORDS.has(word)) continue;
    if (word.length < 5) continue;

    let weight = 1;
    if (classification?.type === "history" && HISTORY_SINGLE_TERMS.has(word)) weight = 6;
    if (/(ismo|zione|mento|archia|crazia)$/i.test(word)) weight += 2;
    if (/^\d{4}$/.test(word)) weight += 5;

    counts.set(word, (counts.get(word) || 0) + weight);
  }

  return [...counts.entries()].map(([term, score]) => ({ term, score }));
}

function titleCaseConcept(term: string): string {
  const trimmed = term.trim();
  if (!trimmed) return "";
  if (/^[A-ZÀ-Ý]/.test(trimmed) && trimmed.split(/\s+/).length > 1) return trimmed;
  return trimmed
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

/** Extract study keywords preferring historical phrases, events, and discipline terms. */
export function extractStudyKeywords(
  text: string,
  limit = 12,
  classification?: StudyMaterialClassification,
): string[] {
  const phraseHits = extractHistoricalPhrases(text);
  const wordHits = extractWeightedWords(text, classification);
  const merged = new Map<string, number>();

  for (const hit of [...phraseHits, ...wordHits]) {
    const key = normalizeKeyword(hit.term);
    merged.set(key, (merged.get(key) || 0) + hit.score);
  }

  // Ensure core historical phrases present in source are always candidates.
  if (classification?.type === "history") {
    const lower = text.toLowerCase();
    for (const { pattern, label } of HISTORICAL_PHRASE_PATTERNS) {
      if (pattern.test(lower)) {
        const key = normalizeKeyword(label);
        merged.set(key, (merged.get(key) || 0) + 12);
      }
    }
  }

  const ranked = [...merged.entries()]
    .filter(([term]) => isValidStudyConcept(term, classification))
    .sort((a, b) => b[1] - a[1])
    .map(([term]) => titleCaseConcept(term));

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const term of ranked) {
    const key = normalizeKeyword(term);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(term);
    if (unique.length >= limit) break;
  }

  return unique;
}

export function isBannedStudyConcept(term: string): boolean {
  return isDidacticStopWord(term) || !isValidStudyConcept(term);
}
