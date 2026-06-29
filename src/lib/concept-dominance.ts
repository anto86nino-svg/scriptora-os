export type ConceptDominanceResult = {
  genre?: string;
  bookFormat?: string;
  blockRomanceTemplates: boolean;
  blockPhilosophyBlueprint: boolean;
  protagonist?: string;
};

const PRESERVED_FICTION_GENRES = [
  "fantasy",
  "horror",
  "thriller",
  "romance",
  "dark-romance",
  "sci-fi",
  "historical",
  "mystery",
  "narrativa",
];

function normalize(value: string): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function isPreservedFictionGenre(genre?: string): boolean {
  const g = normalize(genre || "");
  if (!g) return false;
  return PRESERVED_FICTION_GENRES.some((item) => g.includes(item));
}

export function hasHighConceptFantasySignals(text: string): boolean {
  const hay = normalize(text);
  if (!hay) return false;
  if (/\b(fantasy|fantasia|high concept)\b/.test(hay)) return true;

  const anchorHits = [
    /\bporta(?:\s+nel\s+cuore)?\b/,
    /\bmemoria ancestrale\b/,
    /\bfine del mondo\b/,
    /\bapocaliss\w*\b/,
    /\bmille anni\b/,
    /\bgiorno della fine\b/,
    /\bcustod\w*\b/,
    /\bdestino\b/,
  ].filter((pattern) => pattern.test(hay)).length;

  if (anchorHits >= 2) return true;
  if (/\bporta\b/.test(hay) && /\b(ricordi|destino|mille anni|fine del mondo)\b/.test(hay)) return true;
  return false;
}

export function hasExplicitRomanceSignals(text: string): boolean {
  const hay = normalize(text);
  if (!hay) return false;
  if (hasHighConceptFantasySignals(hay)) return false;
  return /\b(romance|slow burn|love story|storia d'amore|amore proibito|desiderio|forced proximity|enemies to lovers|attrazione romantica|coppia|bacio|innamor)\b/.test(
    hay,
  );
}

export function extractConceptProtagonist(idea: string): string | undefined {
  const skip = new Set(["Ogni", "Una", "Uno", "Il", "Lo", "La", "Le", "I", "Gli", "Quando", "Fotografie", "Ricordi", "Donna", "Persone"]);
  for (const match of String(idea || "").matchAll(/\b([A-ZÀ-Ý][a-zà-ÿ]+)\b/g)) {
    const name = match[1];
    if (!skip.has(name)) return name;
  }
  return undefined;
}

export function isGenericPhilosophyTitleForFiction(title: string, idea: string): boolean {
  const t = normalize(title);
  if (!t) return false;
  if (/^quello che\s+\w+\s+nasconde$/.test(t)) return true;
  if (/\bessere\b/.test(t) && /nasconde/.test(t) && hasHighConceptFantasySignals(idea)) return true;
  return false;
}

export function resolveConceptDominance(
  idea: string,
  opts: { genre?: string; tags?: string } = {},
): ConceptDominanceResult {
  const hay = `${opts.genre || ""} ${opts.tags || ""} ${idea}`.trim();
  const protagonist = extractConceptProtagonist(idea);

  if (hasHighConceptFantasySignals(hay)) {
    return {
      genre: "fantasy",
      bookFormat: "novel",
      blockRomanceTemplates: true,
      blockPhilosophyBlueprint: true,
      protagonist,
    };
  }

  const genre = opts.genre?.trim();
  return {
    genre,
    blockRomanceTemplates: !hasExplicitRomanceSignals(hay),
    blockPhilosophyBlueprint: false,
    protagonist,
  };
}

export function buildFantasyChapterTitles(idea: string): string[] {
  const hay = normalize(idea);
  const titles = ["La Porta", "Il Primo Ricordo"];
  if (/donna|mille anni/.test(hay)) titles.push("La Donna Morta da Mille Anni");
  if (/fine del mondo|apocaliss|giorno della fine/.test(hay)) titles.push("Il Giorno della Fine");
  if (/custod/.test(hay)) titles.push("I Custodi");
  titles.push("L'Ultima Scelta");
  return titles;
}
