import { clampScore, openingText } from "./utils";

const SLOW_OPENING_PATTERNS = [
  /^(la pioggia|the rain|it was a dark|era una giornata|in this chapter|il giorno in cui tutto)/i,
  /^(once upon|c'era una volta|the town was|il paese era)/i,
  /\b(giornata normale|normal day|woke up|si svegliò|beautiful morning)\b/i,
];

const STRONG_HOOK_PATTERNS = [
  /\b(suddenly|improvvisamente|without warning|non sapeva|didn't know|wrong|sbagliato)\b/i,
  /\b(blood|sangue|knock|busso|message|messaggio|secret|segreto|danger|pericolo)\b/i,
  /\b(only|solo|but|ma|però|however|yet)\b/i,
];

const INSTRUCTIONAL_HOOK_PATTERNS = [
  /\b(step|passo|tool|strumento|mistake|errore|truth|verità|here's what)\b/i,
];

export interface HookPowerResult {
  score: number;
  risks: string[];
  strengths: string[];
  blockedPatterns: string[];
}

export function scoreHookPower(text: string, fiction: boolean): HookPowerResult {
  const open = openingText(text).toLowerCase();
  const risks: string[] = [];
  const strengths: string[] = [];
  const blockedPatterns: string[] = [];
  let score = fiction ? 50 : 58;

  for (const pattern of SLOW_OPENING_PATTERNS) {
    if (pattern.test(open)) {
      score -= 18;
      risks.push("Apertura lenta o troppo descrittiva");
      blockedPatterns.push(pattern.source);
    }
  }

  for (const pattern of STRONG_HOOK_PATTERNS) {
    if (pattern.test(open)) {
      score += 10;
      strengths.push("Apertura crea domanda, rischio o tensione");
      break;
    }
  }

  if (!fiction) {
    for (const pattern of INSTRUCTIONAL_HOOK_PATTERNS) {
      if (pattern.test(open)) {
        score += 12;
        strengths.push("Hook promette utilità immediata");
        break;
      }
    }
  }

  if (open.length > 35 && /[.!?]/.test(open.slice(0, 180))) {
    score += 8;
    strengths.push("Hook entra in scena rapidamente");
  }

  return { score: clampScore(score), risks, strengths, blockedPatterns };
}

export function buildHookPowerPromptBlock(fiction: boolean): string {
  if (!fiction) {
    return `HOOK POWER ENGINE:
- Apri con promessa concreta, errore comune, o verità applicabile — non con introduzione generica.
- Entro 80 parole: il lettore deve capire PERCHÉ continuare ORA.`;
  }

  return `HOOK POWER ENGINE (PRIORITÀ MASSIMA):
- I primi 120 parole devono creare: domanda, rischio, tensione, desiderio o mistero.
- VIETATO aprire con pioggia/paese/mattina generica SE non serve tensione immediata.
- NO: "La pioggia cadeva sul paese..." senza costo narrativo.
- SÌ: azione, segreto, errore, minaccia, desiderio proibito, dettaglio sbagliato.
- Il lettore deve pensare "solo un'altra pagina" entro la prima scena.`;
}
