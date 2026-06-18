import type { InterviewQuestion, InterviewQuickSuggestion } from "./types";
import type { ForgeInterviewMemory, ForgeSlotKey } from "./interview-memory";
import { isRomanceMode } from "./narrative-first-engine";

const FICTION_GENRES = /romanzo|romance|dark romance|thriller|horror|fantasy|giallo|noir|narrativa|fiction|memoir|racconti/i;
const NONFICTION_GENRES = /self-help|saggio|manuale|guida|business|studio|universitar/i;
const POETRY_GENRES = /poesia|poetry|verso|lyric/i;

function isSlotFilled(memory: ForgeInterviewMemory, slot: ForgeSlotKey): boolean {
  const value = memory.slotValues[slot];
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length >= 2;
  return true;
}

function detectBookMode(memory: ForgeInterviewMemory): "fiction" | "nonfiction" | "poetry" {
  const bag = [memory.slotValues.bookType, memory.slotValues.genre, memory.slotValues.rawIdea]
    .filter(Boolean)
    .join(" ");
  if (POETRY_GENRES.test(bag)) return "poetry";
  if (NONFICTION_GENRES.test(bag)) return "nonfiction";
  if (FICTION_GENRES.test(bag)) return "fiction";
  return "fiction";
}

type AdaptiveDef = {
  id: string;
  key: string;
  slotTarget: string;
  text: string;
  quickChoices?: InterviewQuickSuggestion[];
  match: (memory: ForgeInterviewMemory) => boolean;
};

function bag(memory: ForgeInterviewMemory): string {
  return [
    memory.slotValues.genre,
    memory.slotValues.subgenre,
    memory.slotValues.bookType,
    memory.slotValues.rawIdea,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isDarkRomance(memory: ForgeInterviewMemory): boolean {
  return /dark romance|dark-romance|mafia romance/.test(bag(memory));
}

function isThrillerHorror(memory: ForgeInterviewMemory): boolean {
  return /thriller|horror|crime|mystery|giallo|noir/.test(bag(memory));
}

function isSelfHelp(memory: ForgeInterviewMemory): boolean {
  return detectBookMode(memory) === "nonfiction" && /self-help|psicologia|crescita|spiritual|filosofia/.test(bag(memory));
}

function isBusiness(memory: ForgeInterviewMemory): boolean {
  return /business|marketing|leadership/.test(bag(memory));
}

function isPoetry(memory: ForgeInterviewMemory): boolean {
  return detectBookMode(memory) === "poetry";
}

const ADAPTIVE_QUESTIONS: AdaptiveDef[] = [
  {
    id: "adaptive-dr-poles",
    key: "protagonistWound",
    slotTarget: "protagonist",
    text: "Chi sono i due poli emotivi e pericolosi di questa storia?",
    quickChoices: [
      { label: "Desiderio vs controllo", value: "Due poli tra desiderio incontrollabile e bisogno di controllo." },
      { label: "Ferita vs maschera", value: "Uno mostra la ferita, l'altro la maschera perfetta." },
    ],
    match: (m) => isDarkRomance(m) || (isRomanceMode(m) && isSlotOpen(m, "protagonist")),
  },
  {
    id: "adaptive-dr-wound",
    key: "centralConflict",
    slotTarget: "centralConflict",
    text: "Quale ferita li rende incompatibili — e perché proprio loro?",
    match: (m) => isDarkRomance(m) && isSlotOpen(m, "centralConflict"),
  },
  {
    id: "adaptive-dr-limit",
    key: "narrativeDrive",
    slotTarget: "stakes",
    text: "Quale limite morale non deve essere superato in questa storia?",
    quickChoices: [
      { label: "Niente consenso ambiguo", value: "Il limite è: nessuna ambiguità sul consenso." },
      { label: "Niente redenzione facile", value: "Il limite è: niente redenzione gratuita del pericolo." },
    ],
    match: (m) => isDarkRomance(m) && isSlotOpen(m, "stakes"),
  },
  {
    id: "adaptive-dr-tension",
    key: "emotionalTone",
    slotTarget: "tone",
    text: "Che tipo di tensione vuoi dominare: lenta, tossica, proibita o vendicativa?",
    quickChoices: [
      { label: "Lenta", value: "Tensione lenta, trattenuta, slow burn." },
      { label: "Tossica", value: "Tensione tossica, magnetica, autodistruttiva." },
      { label: "Proibita", value: "Tensione proibita, morale e desiderio in collisione." },
    ],
    match: (m) => (isDarkRomance(m) || isRomanceMode(m)) && isSlotOpen(m, "tone"),
  },
  {
    id: "adaptive-th-threat",
    key: "centralConflict",
    slotTarget: "centralConflict",
    text: "Quale minaccia apre la storia — la prima crepa nel mondo ordinato?",
    match: (m) => isThrillerHorror(m) && isSlotOpen(m, "centralConflict"),
  },
  {
    id: "adaptive-th-late",
    key: "narrativeDrive",
    slotTarget: "endingDirection",
    text: "Cosa scopre il protagonista troppo tardi?",
    match: (m) => isThrillerHorror(m) && isSlotOpen(m, "endingDirection"),
  },
  {
    id: "adaptive-th-secret",
    key: "promise",
    slotTarget: "promise",
    text: "Qual è il segreto o l'orrore nascosto che tiene in piedi tutto?",
    match: (m) => isThrillerHorror(m) && isSlotOpen(m, "promise"),
  },
  {
    id: "adaptive-th-fear",
    key: "readerTransformation",
    slotTarget: "stakes",
    text: "Quale paura deve restare addosso al lettore quando chiude il libro?",
    match: (m) => isThrillerHorror(m) && isSlotOpen(m, "stakes"),
  },
  {
    id: "adaptive-sh-transform",
    key: "readerTransformation",
    slotTarget: "outcome",
    text: "Quale trasformazione concreta promette questo libro al lettore?",
    match: (m) => isSelfHelp(m) && isSlotOpen(m, "outcome"),
  },
  {
    id: "adaptive-sh-problem",
    key: "centralConflict",
    slotTarget: "problem",
    text: "Qual è il problema reale e quotidiano del lettore che vogliamo risolvere?",
    match: (m) => isSelfHelp(m) && isSlotOpen(m, "problem"),
  },
  {
    id: "adaptive-sh-method",
    key: "genreDNA",
    slotTarget: "method",
    text: "Che metodo o percorso useremo — esercizi, esempi, casi pratici, capitoli brevi?",
    quickChoices: [
      { label: "Esercizi", value: "Percorso con esercizi pratici dopo ogni capitolo." },
      { label: "Casi reali", value: "Metodo basato su casi reali e applicazione immediata." },
      { label: "Capitoli brevi", value: "Capitoli brevi con micro-azioni quotidiane." },
    ],
    match: (m) => isSelfHelp(m) && isSlotOpen(m, "method"),
  },
  {
    id: "adaptive-biz-reader",
    key: "targetReader",
    slotTarget: "audience",
    text: "A chi parla questo libro — con precisione, non in generale?",
    match: (m) => isBusiness(m) && isSlotOpen(m, "audience"),
  },
  {
    id: "adaptive-biz-result",
    key: "promise",
    slotTarget: "promise",
    text: "Quale risultato pratico promette — misurabile entro 90 giorni?",
    match: (m) => isBusiness(m) && isSlotOpen(m, "promise"),
  },
  {
    id: "adaptive-biz-tone",
    key: "emotionalTone",
    slotTarget: "tone",
    text: "Tono autorevole, semplice, provocatorio o premium?",
    quickChoices: [
      { label: "Autorevole", value: "Tono autorevole, competente, diretto." },
      { label: "Semplice", value: "Tono semplice, accessibile, zero fuffa." },
      { label: "Provocatorio", value: "Tono provocatorio, netto, anticonformista." },
    ],
    match: (m) => isBusiness(m) && isSlotOpen(m, "tone"),
  },
  {
    id: "adaptive-poetry-emotion",
    key: "emotionalTone",
    slotTarget: "tone",
    text: "Quale emozione attraversa l'intera raccolta?",
    match: (m) => isPoetry(m) && isSlotOpen(m, "tone"),
  },
  {
    id: "adaptive-poetry-imagery",
    key: "setting",
    slotTarget: "setting",
    text: "Quale immaginario ricorrente vuoi — simboli, luoghi, oggetti?",
    match: (m) => isPoetry(m) && isSlotOpen(m, "setting"),
  },
  {
    id: "adaptive-poetry-form",
    key: "structurePreference",
    slotTarget: "chapterCount",
    text: "Poesie brevi, medie o lunghe — struttura libera o sezioni tematiche?",
    quickChoices: [
      { label: "Brevi", value: "Poesie brevi, frammenti intensi." },
      { label: "Sezioni tematiche", value: "Raccolta in sezioni tematiche coerenti." },
      { label: "Libera", value: "Struttura libera, flusso emotivo continuo." },
    ],
    match: (m) => isPoetry(m) && isSlotOpen(m, "chapterCount"),
  },
];

function isSlotOpen(memory: ForgeInterviewMemory, slot: ForgeSlotKey): boolean {
  return !isSlotFilled(memory, slot);
}

export function selectAdaptiveGenreQuestion(memory: ForgeInterviewMemory): InterviewQuestion | null {
  for (const def of ADAPTIVE_QUESTIONS) {
    if (!def.match(memory)) continue;
    if (memory.askedQuestionKeys.includes(def.id)) continue;
    return {
      id: def.id,
      key: def.key,
      question: def.text,
      quickSuggestions: def.quickChoices,
      placeholder: "Rispondi con una scelta netta…",
    };
  }
  return null;
}
