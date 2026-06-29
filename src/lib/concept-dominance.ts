export type ConceptDominanceResult = {
  genre?: string;
  bookFormat?: string;
  blockRomanceTemplates: boolean;
  blockPhilosophyBlueprint: boolean;
  blockFantasyTemplates: boolean;
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

const UI_NOISE_PATTERNS = [
  /^idea\s+di\s+libro[:\s—-]*/i,
  /^che\s+libro\s+vuoi\s+creare[:\s—-]*/i,
  /^descrivi\s+(la\s+)?tua\s+idea[:\s—-]*/i,
  /^racconta\s+(la\s+)?tua\s+idea[:\s—-]*/i,
  /^inserisci\s+(la\s+)?tua\s+idea[:\s—-]*/i,
];

const CHIP_WORD =
  "fantasy|thriller|horror|mystery|memoria|destino|tempo|futuro|high\\s*concept|mistero|supernatural|soprannaturale|sci[\\s-]?fi|fantascienza|narrativa";

function stripCommaSeparatedChipPrefix(text: string): string {
  const pattern = new RegExp(
    `^(?:${CHIP_WORD})(?:\\s*,\\s*(?:${CHIP_WORD}))*\\s*[.,:;—-]\\s*`,
    "gi",
  );
  let cleaned = text.trim();
  let prev = "";
  while (prev !== cleaned) {
    prev = cleaned;
    cleaned = cleaned.replace(pattern, "").trim();
  }
  return cleaned;
}

const PROTAGONIST_SKIP = new Set([
  "Ogni", "Una", "Uno", "Il", "Lo", "La", "Le", "I", "Gli", "Quando", "Dopo", "Prima",
  "Fotografie", "Ricordi", "Donna", "Persone", "Thriller", "Horror", "Fantasy", "Romanzo",
  "Libro", "Idea", "Mistero", "Memoria", "Destino", "Tempo", "Futuro", "Supernatural",
  "Soprannaturale", "High", "Concept", "Mystery", "Romance", "Narrativa", "Notte", "Alle",
  "Piccolo", "Nel", "Nella", "Che", "Un", "Es", "Nel", "Nella", "Visione",
]);

function normalize(value: string): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function sanitizeUserConceptInput(text: string): string {
  let cleaned = String(text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";

  for (const pattern of UI_NOISE_PATTERNS) {
    cleaned = cleaned.replace(pattern, "").trim();
  }

  cleaned = stripCommaSeparatedChipPrefix(cleaned);
  cleaned = cleaned.replace(/^(?:idea|libro)\s*[:\-—]\s*/i, "").trim();
  return cleaned;
}

export function isPreservedFictionGenre(genre?: string): boolean {
  const g = normalize(genre || "");
  if (!g) return false;
  return PRESERVED_FICTION_GENRES.some((item) => g.includes(item));
}

function normalizedConceptHay(text: string): string {
  return normalize(sanitizeUserConceptInput(text));
}

function hasExplicitFantasyAnchors(hay: string): boolean {
  if (/\b(fantasy|fantasia|epic\s+fantasy|high\s+concept)\b/.test(hay)) return true;
  if (/\b(magia|regno|drago|elf|incantesim\w*|mondo\s+immagin\w*)\b/.test(hay)) return true;
  if (/\bporta\s+nel\s+cuore\b/.test(hay) && /\bmille\s+anni\b/.test(hay)) return true;
  if (/\bmemoria\s+ancestrale\b/.test(hay)) return true;

  const apocalypse = /\b(fine\s+del\s+mondo|apocaliss\w*|giorno\s+della\s+fine)\b/.test(hay);
  const fantasyWorld = /\b(porta(?:\s+nel\s+cuore)?|mille\s+anni|custod\w*)\b/.test(hay);
  return apocalypse && fantasyWorld;
}

function hasThrillerAnchors(hay: string): boolean {
  if (/\b(horror|gotico|gothic|folk\s+horror|stazione\s+ferroviaria)\b/.test(hay) && !/\bthriller\b/.test(hay)) {
    return false;
  }

  const explicit =
    /\bthriller\s+soprannatural|\bsoprannatural\w*\s+thriller\b/.test(hay) ||
    (/\bthriller\b/.test(hay) && /\b(visioni?|ricordi\s+dal\s+futuro|morte\s+predett|soprannatural)/.test(hay));

  const timeAnchor = /\b\d{1,2}:\d{2}\b/.test(hay);
  const contextualAnchors =
    /\b(morte(?:\s+predett\w*)?|visioni?|futuro|ricordi\s+dal\s+futuro|paese|insegnante|piccolo\s+paese)\b/.test(hay) ||
    (/\bricordi\b/.test(hay) && /\b(futuro|morte|visioni?)\b/.test(hay));

  if (explicit) return true;
  if (timeAnchor && contextualAnchors) return true;
  if (/\bthriller\b/.test(hay) && /\b\d{1,2}:\d{2}\b/.test(hay)) return true;
  return false;
}

export function hasSupernaturalThrillerSignals(text: string): boolean {
  const hay = normalizedConceptHay(text);
  if (!hay) return false;
  if (hasExplicitFantasyAnchors(hay) && !/\bthriller\b/.test(hay) && !/\bsoprannatural/.test(hay)) {
    return false;
  }
  return hasThrillerAnchors(hay);
}

export function hasHighConceptFantasySignals(text: string): boolean {
  const hay = normalizedConceptHay(text);
  if (!hay) return false;
  if (hasThrillerAnchors(hay) && !hasExplicitFantasyAnchors(hay)) return false;
  return hasExplicitFantasyAnchors(hay);
}

export function hasExplicitRomanceSignals(text: string): boolean {
  const hay = normalize(sanitizeUserConceptInput(text));
  if (!hay) return false;
  if (hasHighConceptFantasySignals(hay)) return false;
  if (hasSupernaturalThrillerSignals(hay)) return false;
  return /\b(romance|slow burn|love story|storia d'amore|amore proibito|desiderio|forced proximity|enemies to lovers|attrazione romantica|coppia|bacio|innamor)\b/.test(
    hay,
  );
}

export function extractConceptProtagonist(idea: string): string | undefined {
  const text = sanitizeUserConceptInput(idea);
  for (const match of text.matchAll(/\b([A-ZÀ-Ý][a-zà-ÿ]+)\b/g)) {
    const name = match[1];
    if (!PROTAGONIST_SKIP.has(name)) return name;
  }
  return undefined;
}

export function extractTimeAnchor(idea: string): string | undefined {
  const match = sanitizeUserConceptInput(idea).match(/\b(\d{1,2}:\d{2})\b/);
  return match?.[1];
}

export function buildTimeAnchoredTitle(idea: string): string | undefined {
  const time = extractTimeAnchor(idea);
  if (!time) return undefined;
  const hay = normalize(idea);
  if (/\bogni\s+notte\b/.test(hay) || /\balle\b/.test(hay)) {
    return `Ogni Notte alle ${time}`;
  }
  return `Alle ${time}`;
}

export type SupernaturalThrillerSubtitleVariant = "safe" | "commercial" | "bold";

function feminineItalianName(name?: string): boolean {
  if (!name) return true;
  return /[aeiouàèéìòóù]$/i.test(name.trim());
}

export function buildSupernaturalThrillerSubtitle(
  idea: string,
  variant: SupernaturalThrillerSubtitleVariant = "commercial",
): string {
  const hay = normalizedConceptHay(idea);
  const feminine = feminineItalianName(extractConceptProtagonist(sanitizeUserConceptInput(idea)));
  const killVerb = feminine ? "ucciderla" : "ucciderlo";
  const consumeVerb = feminine ? "consumarla" : "consumarlo";
  const hasDeath = /\bmorte(?:\s+predett\w*)?\b/.test(hay);
  const hasFuture = /\bfuturo\b/.test(hay) || /\bricordi\s+dal\s+futuro\b/.test(hay);
  const hasMemories = /\bricordi\b/.test(hay);

  if (variant === "bold") {
    return hasDeath
      ? `La morte che ha già visto non le lascerà scelta`
      : "Il futuro non chiede permesso — chiede sangue";
  }

  if (variant === "safe") {
    return hasDeath && hasMemories
      ? "Quando i ricordi dal futuro annunciano una morte inevitabile"
      : "Visioni dal futuro in un paese che non può più mentire";
  }

  if (hasFuture && hasMemories && hasDeath) {
    return `I ricordi del futuro stanno per ${killVerb}`;
  }
  if (hasFuture && hasMemories) {
    return `I ricordi del futuro stanno per ${consumeVerb}`;
  }
  return "Quando il tempo invia visioni che nessuno dovrebbe vedere";
}

export function buildSupernaturalThrillerSecondaryCast(): string[] {
  return [
    "Sceriffo locale",
    "Abitanti che ricevono visioni",
    "Primo uomo del futuro",
  ];
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
  const sanitized = sanitizeUserConceptInput(idea);
  const hay = `${opts.genre || ""} ${opts.tags || ""} ${sanitized}`.trim();
  const protagonist = extractConceptProtagonist(sanitized);

  if (hasSupernaturalThrillerSignals(hay)) {
    return {
      genre: "thriller",
      bookFormat: "novel",
      blockRomanceTemplates: true,
      blockPhilosophyBlueprint: true,
      blockFantasyTemplates: true,
      protagonist,
    };
  }

  if (hasHighConceptFantasySignals(hay)) {
    return {
      genre: "fantasy",
      bookFormat: "novel",
      blockRomanceTemplates: true,
      blockPhilosophyBlueprint: true,
      blockFantasyTemplates: false,
      protagonist,
    };
  }

  const genre = opts.genre?.trim();
  return {
    genre,
    blockRomanceTemplates: !hasExplicitRomanceSignals(hay),
    blockPhilosophyBlueprint: false,
    blockFantasyTemplates: false,
    protagonist,
  };
}

export function buildFantasyChapterTitles(idea: string): string[] {
  const hay = normalize(sanitizeUserConceptInput(idea));
  const titles = ["La Porta", "Il Primo Ricordo"];
  if (/donna|mille anni/.test(hay)) titles.push("La Donna Morta da Mille Anni");
  if (/fine del mondo|apocaliss|giorno della fine/.test(hay)) titles.push("Il Giorno della Fine");
  if (/custod/.test(hay)) titles.push("I Custodi");
  titles.push("L'Ultima Scelta");
  return titles;
}
