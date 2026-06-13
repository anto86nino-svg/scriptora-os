import { clampScore, endingText } from "./utils";

const FLAT_ENDING_PATTERNS = [
  /(everything was fine|all was well|in conclusione|in summary|the end|fine del capitolo|tutto era a posto)/i,
  /(and so they went home|e tornarono a casa|peace returned|la pace tornò)/i,
];

const MAGNET_ENDING_PATTERNS = [
  { pattern: /\?/, label: "domanda irrisolta" },
  { pattern: /\b(secret|segreto|truth|verità|danger|pericolo|knock|busso|message|messaggio)\b/i, label: "cliffhanger element" },
  { pattern: /\b(but|ma|però|however|yet|still|only|solo)\b/i, label: "tension shift" },
  { pattern: /\b(tomorrow|domani|next|poi|later|waiting|aspett|before (he|she|they)|prima che)\b/i, label: "forward pull" },
  { pattern: /\b(realized|capì|understood|saw|vide|heard|sentì)\b.*\b(not|non|never|mai)\b/i, label: "incomplete reveal" },
];

export interface ChapterEndingResult {
  score: number;
  magnets: string[];
  risks: string[];
}

export function scoreChapterEndingMagnetism(text: string): ChapterEndingResult {
  const ending = endingText(text).toLowerCase();
  const risks: string[] = [];
  const magnets: string[] = [];
  let score = 48;

  for (const { pattern, label } of MAGNET_ENDING_PATTERNS) {
    if (pattern.test(ending)) {
      score += 10;
      magnets.push(label);
    }
  }

  for (const pattern of FLAT_ENDING_PATTERNS) {
    if (pattern.test(ending)) {
      score -= 22;
      risks.push("Chiusura piatta — basso page-turn");
    }
  }

  if (magnets.length === 0) {
    risks.push("Manca reveal incompleto, cliffhanger o nuova domanda");
  }

  return { score: clampScore(score), magnets, risks };
}

export function buildChapterEndingPromptBlock(): string {
  return `CHAPTER ENDING MAGNETISM:
Chiudi con ALMENO UNO:
• reveal incompleto
• mini cliffhanger
• tension shift
• emotional reversal
• nuova domanda
• rischio crescente
NO chiusure piatte. Il lettore deve pensare: "ok ancora un capitolo".`;
}
