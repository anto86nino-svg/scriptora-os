import { hasHighConceptFantasySignals } from "@/lib/concept-dominance";

const GENERIC_PROMISE_PATTERNS = [
  /mistero disturbante con rivelazione progressiva/i,
  /tensione emotiva crescente/i,
  /promessa emotiva memorabile/i,
  /storia che resta addosso/i,
  /rivelazione progressiva e pressione emotiva/i,
  /atmosfera, decadenza e paura crescente/i,
  /un horror .+ dove atmosfera/i,
];

export interface NarrativeIdeaSignals {
  protagonist?: string;
  places: string[];
  objects: string[];
  mysteries: string[];
  stakes: string[];
  uniqueElements: string[];
}

function clean(value: string): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalize(value: string): string {
  return clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function isGenericNarrativePromise(promise: string): boolean {
  const text = clean(promise);
  if (!text || text.length < 24) return true;
  return GENERIC_PROMISE_PATTERNS.some((pattern) => pattern.test(text));
}

export function extractNarrativeIdeaSignals(idea: string): NarrativeIdeaSignals {
  const text = clean(idea);
  const signals: NarrativeIdeaSignals = {
    places: [],
    objects: [],
    mysteries: [],
    stakes: [],
    uniqueElements: [],
  };
  if (!text) return signals;

  const skipProtagonist = new Set([
    "Ogni", "Una", "Uno", "Il", "Lo", "La", "Le", "I", "Gli", "Quando", "Dopo", "Prima", "Fotografie", "Ricordi", "Donna", "Persone",
  ]);
  for (const match of text.matchAll(/\b([A-ZÀ-Ý][a-zà-ÿ]+)\b/g)) {
    const name = match[1];
    if (!skipProtagonist.has(name)) {
      signals.protagonist = name;
      break;
    }
  }

  const placePatterns = [
    /\b(porta(?:\s+nel\s+cuore)?)/gi,
    /\b(stazione(?:\s+ferroviaria)?(?:\s+abbandonata)?)/gi,
    /\b(gallerie?\s+inesistenti?)/gi,
    /\b(casa|villa|villaggio|bosco|ospedale|manicomio|isola)\b/gi,
  ];
  for (const pattern of placePatterns) {
    for (const match of text.matchAll(pattern)) {
      const label = clean(match[0]);
      if (label && !signals.places.includes(label)) signals.places.push(label);
    }
  }

  const objectPatterns = [
    /\b(fotograf(?:ia|ie))/gi,
    /\b(treno)/gi,
    /\b(lettere?|diari?o|mappe?|orologio|specchio)\b/gi,
  ];
  for (const pattern of objectPatterns) {
    for (const match of text.matchAll(pattern)) {
      const label = clean(match[0]);
      if (label && !signals.objects.includes(label)) signals.objects.push(label);
    }
  }

  const mysteryPatterns = [
    /\b(donna(?:\s+vissuta)?(?:\s+\w+){0,4}\s+mille\s+anni)/gi,
    /\b(fine del mondo|apocaliss\w*|giorno della fine)/gi,
    /\b(ricordi(?:\s+di)?(?:\s+\w+){0,4})/gi,
    /\b(destino|memoria ancestrale)/gi,
    /\b(donna vestita di nero)/gi,
    /\b(\d{1,2}:\d{2})/g,
    /\b(ricordi che si riscrivono)/gi,
    /\b(persone cancellate dall'esistenza)/gi,
    /\b(fotograf(?:ia|ie) che cambiano)/gi,
    /\b(non lasciare che io salga sul treno)/gi,
  ];
  for (const pattern of mysteryPatterns) {
    for (const match of text.matchAll(pattern)) {
      const label = clean(match[0]);
      if (label && !signals.mysteries.includes(label)) signals.mysteries.push(label);
    }
  }

  if (/\bmadre\b/i.test(text)) signals.stakes.push("madre");
  if (/\bmemor/i.test(text) || /\bricordi\b/i.test(text)) signals.stakes.push("memoria");
  if (/\bdestino\b/i.test(text)) signals.stakes.push("destino");
  if (/\bfine del mondo|apocaliss/i.test(text)) signals.stakes.push("fine del mondo");
  if (/\bcolpa\b/i.test(text)) signals.stakes.push("colpa");
  if (/\bverità\b/i.test(text)) signals.stakes.push("verità");

  signals.uniqueElements = [
    ...signals.places,
    ...signals.objects,
    ...signals.mysteries,
    ...signals.stakes,
  ].filter((item, index, arr) => arr.indexOf(item) === index);

  return signals;
}

export function hasRichNarrativeIdea(idea: string): boolean {
  const signals = extractNarrativeIdeaSignals(idea);
  return signals.uniqueElements.length >= 3;
}

export function buildNarrativePromiseFromIdea(idea: string, genre?: string): string {
  const signals = extractNarrativeIdeaSignals(idea);
  const lead = signals.protagonist || "il protagonista";
  const genreLabel = clean(genre || "horror");

  if (signals.uniqueElements.length < 2) {
    return "";
  }

  if ((hasHighConceptFantasySignals(idea) || /fantasy/i.test(genre || "")) && !/horror|thriller/i.test(genre || "")) {
    const door = signals.places.find((place) => /porta/i.test(place)) || "la porta nel cuore";
    const endWorld = signals.stakes.includes("fine del mondo") || /\bfine del mondo|apocaliss/i.test(idea);
    const memory = signals.stakes.includes("memoria") || /\bricordi\b/i.test(idea);
    return `Quando ${lead} apre ${door}, scopre i ricordi di una donna vissuta mille anni prima${
      endWorld ? " che conosce il giorno esatto in cui il mondo finirà" : ""
    }. Per cambiare il destino dovrà capire perché quei ricordi sono stati affidati a lui${
      memory ? " e quale sacrificio richiede il futuro" : ""
    }.`;
  }

  const place = signals.places[0];
  const object = signals.objects[0];
  const mystery = signals.mysteries[0];
  const time = signals.mysteries.find((m) => /\d{1,2}:\d{2}/.test(m));
  const mother = signals.stakes.includes("madre") ? "madre" : "";
  const memory = signals.stakes.includes("memoria") ? "memoria che si riscrive" : "";

  if (time && place && object) {
    return `${lead} deve capire perché alle ${time} ${place} riappare per pochi minuti — e cosa significa ${object}${mother ? ` della ${mother}` : ""} prima che ${memory || "la verità"} lo cancelli dall'esistenza.`;
  }

  if (place && mystery) {
    return `Un ${genreLabel} dove ${place}, ${mystery} e ${object || "un segreto familiare"} costringono ${lead} a scegliere tra ricordare e sopravvivere.`;
  }

  const anchors = signals.uniqueElements.slice(0, 4).join(", ");
  return `Un ${genreLabel} costruito su ${anchors}: ogni capitolo aumenta la posta in gioco finché ${lead} non può più fingere di non sapere.`;
}

export function resolveNarrativePromise(
  idea: string,
  genre: string,
  fallback: string,
): string {
  const fromIdea = buildNarrativePromiseFromIdea(idea, genre);
  if (fromIdea && hasRichNarrativeIdea(idea)) return fromIdea;
  if (!isGenericNarrativePromise(fallback)) return fallback;
  if (fromIdea) return fromIdea;
  return fallback;
}
