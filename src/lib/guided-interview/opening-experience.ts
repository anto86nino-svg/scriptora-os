import type { GuidedInterviewState } from "./types";

export type ForgeDaypart = "morning" | "afternoon" | "evening" | "night";

export type ForgeAuthorLabel =
  | "scrittore"
  | "autore"
  | "autrice"
  | "creatore"
  | "voce narrativa";

export const FORGE_OPENING_QUESTION_ID = "welcome-opening";

export const FORBIDDEN_PREMATURE_PHRASES = [
  "posta in gioco",
  "rischio reale",
  "confidence",
  "dna",
  "blueprint",
  "vedo bene il personaggio",
  "cosa potrebbe perdere",
  "genre dna",
  "readinessscore",
] as const;

const MORNING_GREETINGS = ["Buongiorno", "Buongiorno"] as const;
const AFTERNOON_GREETINGS = ["Buon pomeriggio", "Buon pomeriggio"] as const;
const EVENING_GREETINGS = ["Buonasera", "Buonasera"] as const;

const OPENING_BODIES: Record<ForgeAuthorLabel, string[]> = {
  scrittore: [
    "Apriamo il taccuino: prima di parlare di capitoli o struttura, voglio capire che libro vuoi far nascere. Da dove iniziamo?",
    "Raccontami il primo frammento: un titolo, un'immagine, una ferita, una domanda. Poi lo mettiamo a fuoco insieme.",
    "Qui non dobbiamo compilare un modulo: dobbiamo tirare fuori il libro che hai in testa. Puoi partire da una scena, da un personaggio, da un'emozione o anche da un'idea confusa.",
  ],
  autore: [
    "Qui non dobbiamo compilare un modulo: dobbiamo tirare fuori il libro che hai in testa. Puoi partire da una scena, da un personaggio, da un'emozione o anche da un'idea confusa.",
    "Prima di parlare di struttura, voglio sentire il libro nella sua forma grezza. Da dove iniziamo?",
    "Dimmi il primo frammento — anche confuso. Poi lo affiniamo insieme, senza fretta.",
  ],
  autrice: [
    "Apriamo il taccuino: prima di parlare di capitoli o struttura, voglio capire che libro vuoi far nascere. Da dove iniziamo?",
    "Raccontami il primo frammento: un titolo, un'immagine, una ferita, una domanda. Poi lo mettiamo a fuoco insieme.",
    "Puoi partire da una scena, da un personaggio, da un'emozione o anche da un'idea ancora sfocata. Da dove iniziamo?",
  ],
  creatore: [
    "Prima di parlare di struttura, voglio sentire il libro nella sua forma grezza. Da dove iniziamo?",
    "Tiriamo fuori l'idea che hai in testa — anche a pezzi. Poi la mettiamo a fuoco insieme.",
    "Non serve avere tutto chiaro: basta un frammento. Da dove iniziamo?",
  ],
  "voce narrativa": [
    "Voglio capire che libro vuoi far nascere, prima di qualsiasi struttura. Da dove iniziamo?",
    "Raccontami il primo frammento — un'immagine, una voce, una domanda. Poi lo affiniamo insieme.",
    "Puoi partire liberamente: scena, personaggio, emozione o idea confusa. Da dove iniziamo?",
  ],
};

const EXISTING_IDEA_PREFIX =
  "Perfetto, partiamo da questo. Sento già una direzione possibile, ma prima di fissarla voglio capirla meglio. ";

const EXISTING_IDEA_FOLLOWUPS = [
  "Qual è l'immagine o la scena che ti resta più addosso?",
  "Cosa ti ha fatto venire voglia di scriverlo — anche in una frase grezza?",
  "Se lo raccontassi a un amico in un minuto, cosa diresti per primo?",
];

function pickVariant<T>(items: readonly T[], seed: number): T {
  return items[Math.abs(seed) % items.length];
}

export function getForgeDaypart(date: Date = new Date()): ForgeDaypart {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 23) return "evening";
  return "night";
}

function daypartGreeting(daypart: ForgeDaypart, seed: number): string {
  switch (daypart) {
    case "morning":
      return pickVariant(MORNING_GREETINGS, seed);
    case "afternoon":
      return pickVariant(AFTERNOON_GREETINGS, seed);
    default:
      return pickVariant(EVENING_GREETINGS, seed);
  }
}

export function isTechnicalPrematureContent(text: string): boolean {
  const lower = text.toLowerCase();
  return FORBIDDEN_PREMATURE_PHRASES.some((phrase) => lower.includes(phrase));
}

export function countForgeUserAnswers(state: GuidedInterviewState): number {
  return (state.messages ?? []).filter((m) => m.role === "user").length;
}

export function isFirstForgeAssistantMessage(state: GuidedInterviewState): boolean {
  return countForgeUserAnswers(state) === 0;
}

export function getForgeOpeningGreeting(options?: {
  userName?: string | null;
  authorLabel?: ForgeAuthorLabel;
  hasExistingIdea?: boolean;
  language?: string;
  date?: Date;
}): string {
  const date = options?.date ?? new Date();
  const seed = date.getHours() + date.getDate();
  const label = options?.authorLabel ?? "scrittore";
  const greeting = daypartGreeting(getForgeDaypart(date), seed);
  const name = options?.userName?.trim();

  if (options?.hasExistingIdea) {
    const followUp = pickVariant(EXISTING_IDEA_FOLLOWUPS, seed + 3);
    return `${EXISTING_IDEA_PREFIX}${followUp}`;
  }

  const body = pickVariant(OPENING_BODIES[label], seed + 1);
  const address = name ? `${greeting}, ${name}` : `${greeting}, ${label}`;
  return `${address}. ${body}`;
}

export function resolveForgeOpeningContent(state: GuidedInterviewState): string {
  const firstUser = state.messages.find((m) => m.role === "user")?.content?.trim();
  const partialIdea =
    Boolean(firstUser && firstUser.length >= 12) ||
    Boolean(state.extracted?.promise?.trim()) ||
    Boolean(state.extracted?.centralConflict?.trim());

  return getForgeOpeningGreeting({
    hasExistingIdea: partialIdea && countForgeUserAnswers(state) > 0,
    language: state.extracted?.language,
  });
}

/** @deprecated Use getForgeOpeningGreeting — kept for imports that expect a constant shape */
export function getLegacyOpeningMessage(): string {
  return getForgeOpeningGreeting();
}
