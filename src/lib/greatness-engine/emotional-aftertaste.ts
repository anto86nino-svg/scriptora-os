import { clampScore } from "./utils";

const THERAPY_SPEECH = [
  /\b(capisco perfettamente|i completely understand|it's okay|va tutto bene|non è colpa tua|i love you and i'm not afraid)\b/gi,
  /\b(realized that everything|ho capito che tutto|finally understood myself)\b/gi,
];

const AFTERTASTE_SIGNALS = [
  /\b(silence|silenzio|quiet|quieto|empty|vuoto|still|fermo|remained|rimase)\b/gi,
  /\b(hand|mano|breath|respiro|door|porta|light|luce|shadow|ombra)\b/gi,
  /\b(after|dopo|later|più tardi|never|mai|again|ancora)\b/gi,
];

export interface EmotionalAftertasteResult {
  score: number;
  therapyDensity: number;
  residueSignals: number;
  risks: string[];
  strengths: string[];
}

function countPatternMatches(text: string, patterns: readonly RegExp[]): number {
  return patterns.reduce((total, pattern) => total + (text.match(pattern)?.length || 0), 0);
}

export function scoreEmotionalAftertaste(text: string): EmotionalAftertasteResult {
  const therapyDensity = countPatternMatches(text, THERAPY_SPEECH);
  const residueSignals = countPatternMatches(text, AFTERTASTE_SIGNALS);
  const explainedEmotion = (text.match(/\b(felt|era|was|capì|understood|realized)\b/gi) || []).length;
  let score = 48 + Math.min(residueSignals, 12) * 4 - therapyDensity * 16 - Math.max(0, explainedEmotion - residueSignals) * 3;

  const risks: string[] = [];
  const strengths: string[] = [];
  if (therapyDensity >= 2) risks.push("Troppi monologhi spiegati — poco aftertaste");
  if (residueSignals >= 6) strengths.push("Immagini e silenzi lasciano effetto residuo");
  if (score < 45) risks.push("Scena si chiude senza conseguenza sensoriale");

  return {
    score: clampScore(score),
    therapyDensity,
    residueSignals,
    risks,
    strengths,
  };
}

export function buildEmotionalAftertastePromptBlock(): string {
  return `EMOTIONAL AFTERTASTE ENGINE:
- Riduci monologhi che spiegano emozioni.
- Aumenta: silenzi, conseguenze, gesti, payoff ritardati, immagini residue.
- Il lettore deve SENTIRE la scena anche dopo aver chiuso la pagina.
- Chiudi almeno una scena con un'immagine concreta che resta, non con una dichiarazione emotiva.`;
}
