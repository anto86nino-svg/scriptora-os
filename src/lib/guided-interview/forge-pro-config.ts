import type { GuidedInterviewState, InterviewQuestion } from "./types";
import { sanitizeDnaText } from "./dna-cleaner";

export const FORGE_PRO_CONFIG_FIELD_KEYS = [
  "language",
  "authorName",
  "bookType",
  "genre",
  "bookLength",
  "chapterCount",
  "subchaptersPreference",
  "targetReader",
  "tone",
  "structurePreference",
] as const;

export const FORGE_PRO_CONFIG_QUESTIONS: InterviewQuestion[] = [
  {
    id: "pro-language",
    key: "language",
    question: "Prima di costruire il libro: in che lingua vuoi scriverlo e pubblicarlo?",
    helper: "La lingua influenza tono, mercato, titoli, struttura e stile.",
    placeholder: "Esempio: Italiano, Inglese, Spagnolo…",
    quickSuggestions: [
      { label: "Italiano", value: "Italiano" },
      { label: "Inglese", value: "Inglese" },
      { label: "Spagnolo", value: "Spagnolo" },
      { label: "Francese", value: "Francese" },
      { label: "Tedesco", value: "Tedesco" },
    ],
  },
  {
    id: "pro-author",
    key: "authorName",
    question: "Con quale identità autore deve nascere questo libro?",
    helper: "Puoi usare il tuo nome, uno pseudonimo o un’identità editoriale diversa.",
    placeholder: "Esempio: Antonino Campanella, Livia Emerson, nome brand…",
    quickSuggestions: [
      { label: "Antonino Campanella", value: "Antonino Campanella" },
      { label: "Livia Emerson", value: "Livia Emerson" },
      { label: "Decidiamolo dopo", value: "Decidiamolo dopo in base al genere e al mercato." },
    ],
  },
  {
    id: "pro-book-type",
    key: "bookType",
    question: "Che tipo di libro vuoi creare davvero?",
    helper: "Non serve essere perfetto: scegli la direzione più vicina, poi la rifiniamo.",
    placeholder: "Romanzo, saggio, manuale, raccolta poetica, libro per studenti…",
    quickSuggestions: [
      { label: "Romanzo", value: "Romanzo narrativo" },
      { label: "Saggio / Self-help", value: "Saggio o self-help" },
      { label: "Manuale pratico", value: "Manuale pratico" },
      { label: "Poesie", value: "Raccolta poetica" },
      { label: "Libro studio", value: "Libro educativo o universitario" },
    ],
  },
  {
    id: "pro-genre",
    key: "genre",
    question: "Ora scegliamo il genere o la nicchia: dove deve posizionarsi il libro?",
    helper: "Questo evita che Scriptora inventi un’identità generica.",
    placeholder: "Esempio: dark romance, thriller psicologico, fantasy, business, self-help…",
    quickSuggestions: [
      { label: "Dark romance", value: "Dark romance" },
      { label: "Thriller psicologico", value: "Thriller psicologico" },
      { label: "Fantasy", value: "Fantasy" },
      { label: "Self-help", value: "Self-help" },
      { label: "Business", value: "Business" },
      { label: "Manuale", value: "Manuale" },
    ],
  },
  {
    id: "pro-length",
    key: "bookLength",
    question: "Quanto deve essere grande questo libro?",
    helper: "La lunghezza cambia profondità, numero capitoli, ritmo e promessa commerciale.",
    placeholder: "Breve, medio, lungo, KDP completo…",
    quickSuggestions: [
      { label: "Breve", value: "Libro breve" },
      { label: "Medio", value: "Libro medio" },
      { label: "Lungo", value: "Libro lungo" },
      { label: "KDP completo", value: "Libro completo pensato per Amazon KDP" },
    ],
  },
  {
    id: "pro-chapters",
    key: "chapterCount",
    question: "Quanti capitoli immagini?",
    helper: "Possiamo scegliere un numero preciso o lasciarlo ottimizzare a Scriptora.",
    placeholder: "Esempio: 10, 12, 18, 24, oppure decidilo tu…",
    quickSuggestions: [
      { label: "8 capitoli", value: "8 capitoli" },
      { label: "12 capitoli", value: "12 capitoli" },
      { label: "18 capitoli", value: "18 capitoli" },
      { label: "24 capitoli", value: "24 capitoli" },
      { label: "Ottimizza tu", value: "Ottimizza tu il numero di capitoli in base al tipo di libro." },
    ],
  },
  {
    id: "pro-subchapters",
    key: "subchaptersPreference",
    question: "Vuoi anche i sottocapitoli?",
    helper: "Sono utili per manuali, saggi, libri lunghi e strutture KDP più ordinate.",
    placeholder: "Sì, no, oppure scegli tu in base al libro…",
    quickSuggestions: [
      { label: "Sì, 3 per capitolo", value: "Sì, usa 3 sottocapitoli per capitolo." },
      { label: "Sì, ma leggeri", value: "Sì, usa sottocapitoli leggeri solo dove servono." },
      { label: "No", value: "No, voglio solo capitoli principali." },
      { label: "Decidi tu", value: "Decidi tu se servono sottocapitoli in base al libro." },
    ],
  },
  {
    id: "pro-structure",
    key: "structurePreference",
    question: "Che struttura vuoi sentire sotto il libro?",
    helper: "Qui decidiamo l’architettura: più narrativa, più pratica, più commerciale o più poetica.",
    placeholder: "Esempio: molto narrativa, pratica passo-passo, commerciale KDP, poetica…",
    quickSuggestions: [
      { label: "Narrativa immersiva", value: "Struttura narrativa immersiva e cinematografica." },
      { label: "Pratica passo-passo", value: "Struttura pratica, progressiva, orientata all'azione." },
      { label: "Commerciale KDP", value: "Struttura commerciale ottimizzata per Amazon KDP." },
      { label: "Poetica / lirica", value: "Struttura poetica, emotiva, divisa per sezioni." },
    ],
  },
];

function hasMeaning(value: unknown, min = 3): boolean {
  return sanitizeDnaText(value).length >= min;
}

export function getMissingForgeProConfigFields(state: GuidedInterviewState): string[] {
  const extracted = state.extracted ?? {};
  return FORGE_PRO_CONFIG_FIELD_KEYS.filter((key) => !hasMeaning((extracted as any)[key]));
}

export function getNextForgeProConfigQuestion(state: GuidedInterviewState): InterviewQuestion | undefined {
  const missing = getMissingForgeProConfigFields(state);
  const key = missing[0];
  return FORGE_PRO_CONFIG_QUESTIONS.find((q) => q.key === key);
}

export function mapForgeAnswerToProConfigKey(rawKey: string): string {
  if (rawKey === "tone") return "emotionalTone";
  return rawKey;
}

export function summarizeForgeProConfig(state: GuidedInterviewState): string[] {
  const e = state.extracted ?? {};
  return [
    e.language && `Lingua: ${e.language}`,
    e.authorName && `Autore: ${e.authorName}`,
    e.bookType && `Tipo libro: ${e.bookType}`,
    e.genre && `Genere/nicchia: ${e.genre}`,
    e.subgenre && `Sottogenere: ${e.subgenre}`,
    e.bookLength && `Lunghezza: ${e.bookLength}`,
    e.chapterCount && `Capitoli: ${e.chapterCount}`,
    e.subchaptersPreference && `Sottocapitoli: ${e.subchaptersPreference}`,
    e.structurePreference && `Struttura: ${e.structurePreference}`,
    e.commercialGoal && `Obiettivo: ${e.commercialGoal}`,
  ].filter(Boolean) as string[];
}
