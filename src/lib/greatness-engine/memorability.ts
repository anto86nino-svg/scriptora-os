import { clampScore } from "./utils";

const GENERIC_IMAGERY = [
  /\b(casa inquietante|haunted house|dark corridor|corridoio buio|beautiful sunset|tramonto bellissimo)\b/i,
  /\b(very beautiful|molto bella|quite scary|abbastanza inquietante|bel mattino|beautiful morning|felici)\b/i,
];

const MEMORABLE_IMAGERY = [
  /\b(statua|statue|senza volto|faceless|ogni giorno|every day|different position|posizione diversa)\b/i,
  /\b(odor|odore|smell|taste|sapore|cold metal|metallo freddo|cracked|crepa|stain|macchia)\b/i,
  /\b(only one|solo uno|never the same|mai uguale|wrong number|numero sbagliato)\b/i,
  /\b(tremò|trembled|shook|bicchiere|glass|polso|wrist|dita|fingers)\b/i,
  /[«""][^«""\n]{12,}[»""]/,
];

const SYMBOL_PATTERNS = [
  /\b(chiave|key|ring|anello|photograph|foto|scar|cicatrice|locket|medaglione)\b/i,
];

export interface MemorabilityResult {
  score: number;
  memorableDetails: string[];
  genericRisks: string[];
}

export function scoreMemorability(text: string): MemorabilityResult {
  const memorableDetails: string[] = [];
  const genericRisks: string[] = [];
  let score = 46;

  const sentences = text.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);
  for (const sentence of sentences.slice(0, 40)) {
    if (GENERIC_IMAGERY.some((pattern) => pattern.test(sentence))) {
      score -= 6;
      genericRisks.push(sentence.slice(0, 90));
    }
    if (MEMORABLE_IMAGERY.some((pattern) => pattern.test(sentence))) {
      score += 8;
      memorableDetails.push(sentence.slice(0, 110));
    }
    if (SYMBOL_PATTERNS.some((pattern) => pattern.test(sentence))) {
      score += 5;
      memorableDetails.push(`symbol: ${sentence.slice(0, 90)}`);
    }
  }

  const quotes = text.match(/[«""][^«""\n]{10,}[»""]/g) || [];
  if (quotes.length >= 1) score += 6;

  return {
    score: clampScore(score),
    memorableDetails: memorableDetails.slice(0, 4),
    genericRisks: genericRisks.slice(0, 3),
  };
}

export function buildMemorabilityPromptBlock(): string {
  return `MEMORABILITY ENGINE:
- Preferisci dettagli UNICI e immagini che restano — non aggettivi generici.
- NO: "la casa era inquietante"
- SÌ: "la statua senza volto sembrava ogni giorno in una posizione diversa"
- Inserisci 1–2 micro-simboli o oggetti ricorrenti con payoff invisibile.
- Almeno una riga deve essere quotabile / condivisibile (BookTok-ready se il genere lo permette).`;
}
