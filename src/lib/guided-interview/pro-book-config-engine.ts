import type { GuidedInterviewState, InterviewQuestion } from "./types";
import { sanitizeDnaText } from "./dna-cleaner";

const CONFIG_KEYS = [
  "language",
  "authorName",
  "bookType",
  "genre",
  "subgenre",
  "bookLength",
  "chapterCount",
  "subchaptersPreference",
  "frontMatter",
  "backMatter",
  "marketplace",
] as const;

function clean(value?: unknown): string {
  return sanitizeDnaText(value);
}

function has(value?: unknown, min = 3): boolean {
  return clean(value).length >= min;
}

function q(
  id: string,
  key: string,
  question: string,
  helper?: string,
  quickSuggestions?: InterviewQuestion["quickSuggestions"],
): InterviewQuestion {
  return {
    id,
    key,
    question,
    helper,
    placeholder: "Raccontamelo con parole tue…",
    quickSuggestions,
  };
}

const NATURAL_CONFIG_QUESTIONS: InterviewQuestion[] = [
  q(
    "cfg-language",
    "language",
    "In che lingua deve respirare questo libro — e raggiungere il lettore giusto?",
    "La lingua non è un dettaglio tecnico: è il mercato e la voce.",
    [
      { label: "Italiano", value: "Italiano" },
      { label: "Inglese", value: "Inglese" },
      { label: "Spagnolo", value: "Spagnolo" },
    ],
  ),
  q(
    "cfg-author",
    "authorName",
    "Questo libro uscirà con il tuo nome — o con un'identità editoriale diversa?",
    "Pseudonimo, brand, nome reale: scegli la firma che deve stare in copertina.",
    [
      { label: "Antonino Campanella", value: "Antonino Campanella" },
      { label: "Livia Emerson", value: "Livia Emerson" },
      { label: "Decidiamo dopo", value: "Decidiamo dopo in base al genere e al mercato." },
    ],
  ),
  q(
    "cfg-book-type",
    "bookType",
    "Se dovessi descrivere la forma del libro a un editore in ascensore, cosa diresti?",
    "Romanzo, saggio, manuale, poesia — la forma guida tutto il resto.",
    [
      { label: "Romanzo", value: "Romanzo narrativo" },
      { label: "Saggio / Self-help", value: "Saggio o self-help" },
      { label: "Manuale pratico", value: "Manuale pratico" },
      { label: "Poesie", value: "Raccolta poetica" },
    ],
  ),
  q(
    "cfg-genre",
    "genre",
    "Dove deve stare questo libro nello scaffale — e nella testa del lettore?",
    "Genere e nicchia: non etichetta, posizione editoriale.",
    [
      { label: "Dark romance", value: "Dark romance" },
      { label: "Thriller psicologico", value: "Thriller psicologico" },
      { label: "Fantasy", value: "Fantasy" },
      { label: "Self-help", value: "Self-help" },
    ],
  ),
  q(
    "cfg-subgenre",
    "subgenre",
    "C'è un sottogenere o una sfumatura che rende questo libro riconoscibile subito?",
    "Esempio: slow burn, gotico moderno, business pratico, fantasy epico.",
  ),
  q(
    "cfg-length",
    "bookLength",
    "Preferisci una lettura rapida e intensa — o un viaggio narrativo più lungo?",
    "La lunghezza cambia ritmo, profondità e promessa commerciale.",
    [
      { label: "Rapida e intensa", value: "Libro breve, rapido e intenso" },
      { label: "Viaggio medio", value: "Libro medio, con respiro narrativo" },
      { label: "Epico e lungo", value: "Libro lungo, immersivo, epico" },
      { label: "KDP completo", value: "Libro completo pensato per Amazon KDP" },
    ],
  ),
  q(
    "cfg-chapters",
    "chapterCount",
    "Come immagini il respiro del libro — pochi capitoli densi o tanti capitoli che tirano avanti?",
    "Non un numero per compiacere un modulo: un ritmo che il lettore sente.",
    [
      { label: "8 capitoli", value: "8 capitoli" },
      { label: "12 capitoli", value: "12 capitoli" },
      { label: "18 capitoli", value: "18 capitoli" },
      { label: "Ottimizza tu", value: "Ottimizza tu il numero di capitoli in base al libro." },
    ],
  ),
  q(
    "cfg-subchapters",
    "subchaptersPreference",
    "Vuoi che il lettore entri in ogni capitolo con sottosezioni — o preferisci un flusso continuo?",
    "Utili per manuali, saggi e strutture KDP più ordinate.",
    [
      { label: "Sì, strutturati", value: "Sì, usa sottocapitoli strutturati dove servono." },
      { label: "Solo dove serve", value: "Sì, ma solo dove la struttura lo richiede davvero." },
      { label: "Flusso continuo", value: "No, voglio un flusso continuo senza sottocapitoli." },
    ],
  ),
  q(
    "cfg-front-matter",
    "frontMatter",
    "Cosa deve trovare il lettore prima della storia vera — dedica, prefazione, nota dell'autore?",
    "Il front matter prepara l'atmosfera e la promessa.",
    [
      { label: "Dedica", value: "Dedica" },
      { label: "Prefazione", value: "Prefazione" },
      { label: "Nota autore", value: "Nota dell'autore" },
      { label: "Minimo essenziale", value: "Solo il minimo essenziale." },
    ],
  ),
  q(
    "cfg-back-matter",
    "backMatter",
    "E dopo l'ultima pagina — ringraziamenti, note, appendice, invito al prossimo libro?",
    undefined,
    [
      { label: "Ringraziamenti", value: "Ringraziamenti" },
      { label: "Note e appendice", value: "Note e appendice" },
      { label: "Invito al lettore", value: "Invito al lettore / prossimo libro" },
      { label: "Niente extra", value: "Niente back matter aggiuntivo." },
    ],
  ),
  q(
    "cfg-marketplace",
    "marketplace",
    "Dove immagini questo libro vivere davvero — Amazon, libreria, studio, audio?",
    "Il marketplace influenza titolo, hook e struttura.",
    [
      { label: "Amazon KDP", value: "Amazon KDP" },
      { label: "Libreria / editore", value: "Libreria tradizionale o editore" },
      { label: "Audio / podcast", value: "Audiolibro o adattamento audio" },
      { label: "Studio / università", value: "Studio personale o università" },
    ],
  ),
];

export function getMissingConfigFields(state: GuidedInterviewState): string[] {
  const ex = state.extracted ?? {};
  return CONFIG_KEYS.filter((key) => !has((ex as Record<string, unknown>)[key]));
}

export function isConfigurationComplete(state: GuidedInterviewState): boolean {
  return getMissingConfigFields(state).length === 0;
}

export function getProBookConfigQuestions(state: GuidedInterviewState): InterviewQuestion[] {
  const missing = new Set(getMissingConfigFields(state));
  return NATURAL_CONFIG_QUESTIONS.filter((q) => missing.has(q.key as (typeof CONFIG_KEYS)[number])).slice(0, 2);
}
