import type { BookConfig } from "@/types/book";
import { isLiteraryRomanceGenreContext } from "@/lib/concept-dominance";

export const TRADITIONAL_EDITOR_MIN_WORD_RATIO = 0.95;

export type TraditionalEditorContext = {
  config: Partial<BookConfig>;
  chapterIndex?: number;
  chapterTitle?: string;
  outlineSummary?: string;
  language?: string;
};

function normalizeHay(value: string): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function countWords(text: string): number {
  const trimmed = String(text || "").trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

function normalizeForDedupe(value: string): string {
  return normalizeHay(value).replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
}

function splitSentences(value: string): string[] {
  return String(value || "")
    .split(/(?<=[.!?…]["»”]?)\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function extractCharacterNames(config: Partial<BookConfig>): string[] {
  const names = new Set<string>();
  for (const character of config.characters || []) {
    const name = String(character?.name || "").trim();
    if (name) names.add(name);
  }

  const ext = config as Partial<BookConfig> & { protagonist?: string; expressConfig?: { protagonist?: string } };
  for (const raw of [ext.protagonist, ext.expressConfig?.protagonist]) {
    const candidate = String(raw || "").trim();
    if (!candidate) continue;
    const match = candidate.match(/^([A-ZÀ-ÖØ-Þ][\p{L}'-]+(?:\s+[A-ZÀ-ÖØ-Þ][\p{L}'-]+)?)/u);
    if (match?.[1]) names.add(match[1]);
  }

  return [...names];
}

function buildPreserveCharacterRolesRule(config: Partial<BookConfig>): string {
  const names = extractCharacterNames(config);
  if (!names.length) {
    return "4. NON CAMBIARE IL RUOLO DEI PERSONAGGI (protagonista, co-protagonisti, antagonisti)";
  }
  const protagonist = names[0];
  const roster = names.join(", ");
  return `4. NON CAMBIARE IL RUOLO DI ${protagonist.toUpperCase()} (esempio — preserva i ruoli dei personaggi: ${roster})`;
}

export function TRADITIONAL_EDITOR_SYSTEM_PROMPT(config: Partial<BookConfig>): string {
  const roleRule = buildPreserveCharacterRolesRule(config);
  return `AGISCI COME UN EDITOR TRADIZIONALE DI ALTO LIVELLO SPECIALIZZATO IN ROMANCE LETTERARIO E NARRATIVA EMOTIVA CONTEMPORANEA.

OBIETTIVO: Trasforma il capitolo in versione da pubblicazione professionale mantenendo trama, personaggi, tono e struttura esistenti.

REGOLE OBBLIGATORIE:
1. NON CAMBIARE LA STORIA
2. NON CAMBIARE GLI EVENTI
3. NON CAMBIARE I NOMI
${roleRule}
5. NON INSERIRE COLPI DI SCENA NUOVI
6. NON ACCORCIARE IL TESTO
7. AUMENTA QUALITÀ LETTERARIA SENZA ALTERARE CONTENUTO

INTERVENTI: eliminate repetitions, fix grammar/syntax/continuity, broken sentences, improve rhythm, strengthen protagonist characterization, memorable details, emotional depth via action/gesture/sensory not exposition, elegant adult commercial prose, international bestseller style, avoid clichés/generic/poetic/sentimental excess.

QC before return: no broken sentences, no incoherence, no repetition, no filler, every scene adds value, rising emotional tension, coherent voice, memorable protagonist, professional level.

OUTPUT: complete chapter rewritten, no comments/analysis/notes.`;
}

export function shouldApplyTraditionalEditorPass(config: Partial<BookConfig>): boolean {
  if (isLiteraryRomanceGenreContext({
    genre: config.genre,
    subcategory: config.subcategory,
    subgenre: config.subgenre,
    bookTypeId: config.bookTypeId,
  })) {
    return true;
  }

  const hay = normalizeHay(`${config.genre || ""} ${config.subcategory || ""} ${config.subgenre || ""} ${config.bookTypeId || ""} ${config.bookFormat || ""}`);
  if (!hay.trim()) return false;

  const disqualified = /\b(cookbook|ricettario|thriller|horror|fantasy|fantasi|sci-?fi|fantascienza|mystery|mistero|dark\s+romance|self[-\s]?help|workbook|manuale|ricetta)\b/.test(hay);
  if (disqualified) return false;

  if (/\b(philosophy|filosofi)\b/.test(hay) && /\b(literary|letterari|fiction|narrativa)\b/.test(hay)) {
    return true;
  }

  if (/\b(romance|romantico|literary|letterari|contemporary|contemporanea|women|donne|narrativa\s+emotiva)\b/.test(hay)) {
    return true;
  }

  return false;
}

export function shouldShowTraditionalEditorStatus(config: Partial<BookConfig>): boolean {
  const ext = config as Partial<BookConfig> & { controlLevel?: string };
  if (ext.controlLevel === "auto") return false;
  if (normalizeHay(String(config.generatedFrom || "")).includes("auto")) return false;
  return true;
}

export function applyTraditionalEditorLocalPrep(text: string): string {
  const source = String(text || "").trim();
  if (!source) return source;

  const paragraphs = source.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const dedupedParagraphs: string[] = [];

  for (const paragraph of paragraphs) {
    const previous = dedupedParagraphs[dedupedParagraphs.length - 1];
    if (previous && normalizeForDedupe(previous) === normalizeForDedupe(paragraph)) continue;

    const sentences = splitSentences(paragraph);
    const dedupedSentences: string[] = [];
    for (const sentence of sentences) {
      const prevSentence = dedupedSentences[dedupedSentences.length - 1];
      if (prevSentence && normalizeForDedupe(prevSentence) === normalizeForDedupe(sentence)) continue;
      dedupedSentences.push(sentence);
    }
    dedupedParagraphs.push(dedupedSentences.join(" "));
  }

  return dedupedParagraphs.join("\n\n").trim();
}

export function meetsTraditionalEditorWordCountGuard(inputWords: number, outputWords: number): boolean {
  if (inputWords <= 0) return true;
  return outputWords >= Math.floor(inputWords * TRADITIONAL_EDITOR_MIN_WORD_RATIO);
}

export function buildTraditionalEditorUserPrompt(chapterText: string, context: TraditionalEditorContext): string {
  const language = context.language || context.config.language || "Italian";
  const chapterLabel = context.chapterIndex != null ? `Capitolo ${context.chapterIndex + 1}` : "Capitolo";
  const title = context.chapterTitle ? `"${context.chapterTitle}"` : chapterLabel;
  const summary = context.outlineSummary ? `\nPiano editoriale: ${context.outlineSummary}` : "";
  const minWords = Math.floor(countWords(chapterText) * TRADITIONAL_EDITOR_MIN_WORD_RATIO);

  return `Riscrivi integralmente ${title} per la pubblicazione professionale.
Lingua: ${language}
Vincolo lunghezza: almeno ${minWords} parole (non accorciare il testo).${summary}

TESTO DA EDITARE:
---
${chapterText}
---

Restituisci SOLO il capitolo riscritto completo, senza commenti, note o analisi.`;
}
