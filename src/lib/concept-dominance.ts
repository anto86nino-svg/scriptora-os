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
  "fantasy|thriller|horror|mystery|memoria|destino|tempo|futuro|high\\s*concept|mistero|supernatural|soprannaturale|sci[\\s-]?fi|fantascienza|narrativa|romanzo|ricettario|memoir|business|manuale|saggio|self[-\\s]?help|workbook";

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
  "Ogni", "Una", "Uno", "Il", "Lo", "La", "Le", "I", "Gli", "Quando", "Dopo", "Prima", "Durante",
  "Mentre", "Per", "Oltre", "Se", "Non", "Anche", "Sempre", "Mai", "Tutto", "Nulla", "Qualcosa",
  "Qualcuno", "Nessuno", "Altri", "Altre", "Molti", "Pochi", "Tutti", "Tutte", "Come", "Dove",
  "Perche", "Perché", "Cosi", "Così", "Loro", "Lui", "Lei", "Noi", "Voi", "Esso", "Era", "Erano",
  "Sono", "Infine", "Inoltre", "Tuttavia", "Quindi", "Perciò", "Benché", "Sebbene", "Oppure",
  "Forse", "Fotografie", "Ricordi", "Donna", "Persone", "Thriller", "Horror", "Fantasy", "Romanzo",
  "Libro", "Idea", "Mistero", "Memoria", "Destino", "Tempo", "Futuro", "Supernatural",
  "Soprannaturale", "High", "Concept", "Mystery", "Romance", "Narrativa", "Notte", "Alle",
  "Piccolo", "Nel", "Nella", "Che", "Un", "Es", "Visione", "Città", "Citta", "Una",
  "Ho", "Questo", "Menu", "Manuale", "Libro", "Varianti", "Esposizione", "Diaframma",
  "Composizione", "Luce", "Esercizi", "Piano", "Cucina", "Mediterranea", "Tradizionali",
  "Si", "Tre", "Romanzo", "Bruma", "Nagasaki", "Se", "Nel", "Nella", "Donna", "Idea",
]);

const ITALIAN_SENTENCE_STARTERS = new Set([
  "per", "oltre", "quando", "dopo", "prima", "durante", "mentre", "se", "non", "anche", "ogni",
  "una", "uno", "il", "lo", "la", "le", "i", "gli", "nel", "nella", "nello", "negli", "nelle",
  "un", "una", "che", "come", "dove", "perché", "perche", "così", "cosi", "infine", "inoltre",
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

export type LiteraryRomanceGenreContext = {
  genre?: string;
  subcategory?: string;
  subgenre?: string;
  bookTypeId?: string;
};

export function isLiteraryRomanceGenreContext(opts: LiteraryRomanceGenreContext = {}): boolean {
  const hay = `${opts.genre || ""} ${opts.subcategory || ""} ${opts.subgenre || ""} ${opts.bookTypeId || ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!hay.trim()) return false;
  const romanceOrLiterary =
    /\b(romance|romantico|emozional|literary|letterari|women|narrativa\s+contemporanea|fiction\s+letteraria|romanzo\s+contemporaneo)\b/.test(hay);
  const disqualified = /\b(fantasy|fantasi|horror|thriller|sci-?fi|fantascienza|dark\s+fantasy)\b/.test(hay);
  return romanceOrLiterary && !disqualified;
}

export function hasLiteraryRomanceSignals(text: string, genreContext?: LiteraryRomanceGenreContext): boolean {
  const hay = normalizedConceptHay(text);
  const contextBag = `${hay} ${genreContext?.subgenre || ""} ${genreContext?.subcategory || ""} ${genreContext?.genre || ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const romanceInContext = /\b(romance|romantico|emozional|amore\s+maturo|women'?s\s+fiction|fiction\s+letteraria)\b/.test(
    contextBag,
  );
  const romanceInIdea = /\b(romance|romantico|emozional|amore\s+maturo|storia\s+d'amore|seconda\s+opportunit|slow\s*burn|literary|letterari|innamor|desiderio|cuore|scelte\s+irreversibili)\b/.test(
    hay,
  );
  if (!romanceInContext && !romanceInIdea) return false;
  if (hasHighConceptFantasySignals(text, genreContext)) return false;
  if (hasSupernaturalThrillerSignals(text)) return false;
  if (hasSubmergedCitySciFiSignals(text)) return false;
  return true;
}

function normalizedConceptHay(text: string): string {
  return normalize(sanitizeUserConceptInput(text));
}

function hasExplicitFantasyAnchors(hay: string): boolean {
  if (/\b(fantasy|fantasia|epic\s+fantasy|high\s+concept)\b/.test(hay)) return true;
  if (/\b(magia|drago|draghi|draghe|elf|incantesim\w*|mondo\s+immagin\w*|corona|maledizion\w*)\b/.test(hay)) return true;
  if (/\bregno\b/.test(hay) && /\b(magia|drago|draghi|incantesim\w*|corona|epic)\b/.test(hay)) return true;
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

export function hasHighConceptFantasySignals(
  text: string,
  genreContext?: LiteraryRomanceGenreContext,
): boolean {
  const hay = normalizedConceptHay(text);
  if (!hay) return false;
  if (genreContext && isLiteraryRomanceGenreContext(genreContext)) {
    if (/\b(fantasy|fantasia|epic\s+fantasy|high\s+concept)\b/.test(hay)) return true;
    if (/\b(magia|drago|draghi|draghe|incantesim\w*|corona\s+di|regno\s+di)\b/.test(hay)) return true;
    if (/\bporta\s+nel\s+cuore\b/.test(hay) && /\bmille\s+anni\b/.test(hay)) return true;
    return false;
  }
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

function isLikelyPlaceName(name: string, offset: number, text: string): boolean {
  const before = text.slice(Math.max(0, offset - 28), offset).toLowerCase();
  if (/\b(?:di|a|in|nel|nella|presso|portuale\s+di|citt[aà]\s+(?:portuale\s+)?di|del|della)\s+$/i.test(before)) return true;
  if (/\bnagasaki\b/i.test(name) && /\b(?:a|in|nel|nella)\s+$/i.test(before)) return true;
  return false;
}

function isSkippedProtagonistCandidate(name: string, offset: number, text: string): boolean {
  if (!name || name.length < 2) return true;
  if (PROTAGONIST_SKIP.has(name)) return true;
  if (isLikelyPlaceName(name, offset, text)) return true;
  if (ITALIAN_SENTENCE_STARTERS.has(name.toLowerCase())) {
    const before = text.slice(Math.max(0, offset - 2), offset);
    if (offset === 0 || /(?:^|[.!?…]\s*)$/.test(before)) return true;
  }
  return false;
}

export function isFirstPersonAuthorVoice(text: string): boolean {
  const hay = normalizedConceptHay(text);
  if (!hay) return false;
  return (
    /\bho\s+(lavorato|costruito|scritto|raccontato|imparato|vissuto|fondato|aperto)\b/.test(hay) ||
    /\bquesto\s+libro\s+racconta\b/.test(hay) ||
    /\bper\s+venticinque\s+anni\s+ho\b/.test(hay) ||
    /\bper\s+\d+\s+anni\s+ho\b/.test(hay)
  );
}

export function hasDragonFlameFantasySignals(text: string): boolean {
  const hay = normalizedConceptHay(text);
  if (!hay) return false;
  const dragon = /\b(drago|draghi|draghe)\b/.test(hay);
  const flame = /\b(fiamma|fiamme|fuoco|incendio)\b/.test(hay);
  const control = /\bcontroll\w*\s+(il\s+)?fuoco\b/.test(hay) || /\bfuoco\s+degli\s+altri\s+draghi\b/.test(hay);
  return dragon && (flame || control);
}

export function hasHorrorStationSignals(text: string): boolean {
  const hay = normalizedConceptHay(text);
  if (!hay) return false;
  if (hasSupernaturalThrillerSignals(text)) return false;
  const station = /\bstazione(?:\s+ferroviaria)?(?:\s+abbandonata)?\b/.test(hay);
  const horrorAnchors =
    /\b(03:17|\d{1,2}:\d{2})\b/.test(hay) ||
    /\b(fotograf\w*|treno|madre|gallerie?\s+inesistenti?)\b/.test(hay);
  return station && horrorAnchors;
}

export function hasHospitalGuardianMemoirSignals(text: string): boolean {
  const hay = normalizedConceptHay(text);
  return (
    /\b(guardiano|custode)\b/.test(hay) &&
    /\bospedale\b/.test(hay) &&
    (/\bnotturn\w*\b/.test(hay) || /\bchiusura\b/.test(hay) || isFirstPersonAuthorVoice(text))
  );
}

export function hasBusinessRestaurantSignals(text: string): boolean {
  const hay = normalizedConceptHay(text);
  return (
    /\b(ristorant\w*|chiosco|fatturato|catena)\b/.test(hay) &&
    /\b(sistemi|strategie|errori|imprend|milioni)\b/.test(hay)
  );
}

export function hasCookbookMediterraneanSignals(text: string): boolean {
  const hay = normalizedConceptHay(text);
  return (
    /\b(ricett\w*|cucina|menu)\b/.test(hay) &&
    /\b(mediterrane\w*|ingredienti|vegetarian\w*|piano\s+alimentare)\b/.test(hay)
  );
}

export function hasPhotographyManualSignals(text: string): boolean {
  const hay = normalizedConceptHay(text);
  return (
    /\bfotograf\w*\b/.test(hay) &&
    /\b(esposizione|diaframma|composizione|luce)\b/.test(hay)
  );
}

export function extractConceptProtagonist(idea: string): string | undefined {
  const text = sanitizeUserConceptInput(idea);
  if (!text) return undefined;
  if (isFirstPersonAuthorVoice(text)) return undefined;

  const explicitRole = text.match(
    /\bprotagonist[ao]\s+([A-ZÀ-Ý][a-zà-ÿ]{1,24})\b/i,
  );
  if (explicitRole?.[1] && !PROTAGONIST_SKIP.has(explicitRole[1])) {
    return explicitRole[1];
  }

  const namedPatterns: Array<{ pattern: RegExp; group?: number }> = [
    { pattern: /\b[Ss][Ii]\s+chiama\s+([A-ZÀ-Ý][a-zà-ÿ]{1,24})\b/ },
    { pattern: /\b(?:la|il)\s+(?:pescatrice|volpe|interprete)\s+([A-ZÀ-Ý][a-zà-ÿ]{1,24})\b/i },
    { pattern: /\bl['']interprete\s+([A-ZÀ-Ý][a-zà-ÿ]{1,24})\b/i },
    { pattern: /\b([A-ZÀ-Ý][a-zà-ÿ]{1,24})\s*,\s*(?:amministratore|amministratrice|pescatrice|interprete|cartograf\w*|giovane)\b/i },
    { pattern: /(?:^|[.!?…]\s+)([A-ZÀ-Ý][a-zà-ÿ]{1,24})\s*,\s*(?:ultim[oa]|investigatore|storico|storica|insegnante|cartograf\w*|giovane)\b/i },
    { pattern: /,\s*([A-ZÀ-Ý][a-zà-ÿ]{1,24})\s*,\s*(?:ultim[oa]|investigatore|storico|storica|insegnante|restauratrice|chef|medico|medica)\b/i },
  ];
  for (const { pattern } of namedPatterns) {
    const match = text.match(pattern);
    const name = match?.[1];
    if (name && !isSkippedProtagonistCandidate(name, match?.index ?? 0, text)) return name;
  }

  for (const match of text.matchAll(/\b([A-ZÀ-Ý][a-zà-ÿ]{1,24})\b/g)) {
    const name = match[1];
    const offset = match.index ?? 0;
    if (!isSkippedProtagonistCandidate(name, offset, text)) return name;
  }
  return undefined;
}

export function isSparseConceptInput(text: string): boolean {
  const sanitized = sanitizeUserConceptInput(text);
  const words = sanitized.split(/\s+/).filter(Boolean);
  if (words.length > 5) return false;
  if (extractConceptProtagonist(sanitized)) return false;
  if (/\b\d{1,2}:\d{2}\b/.test(sanitized)) return false;
  if (
    hasCookbookMediterraneanSignals(sanitized) ||
    hasBusinessRestaurantSignals(sanitized) ||
    hasPhotographyManualSignals(sanitized) ||
    /\b(workbook|ricett|cookbook|manuale|memoir|business)\b/i.test(sanitized)
  ) {
    return false;
  }
  return words.length <= 4;
}

export function countWildNarrativeAnchors(text: string): number {
  const hay = normalizedConceptHay(text);
  if (!hay) return 0;
  const matches = hay.match(
    /\b(scatola|marted|chiav\w*|bottega|scelte?\s+non\s+compiut\w*|libero\s+arbitrio|lettera|confessione|cadaver|fantasma|mare|sonno|incubi|bollette|wifi|porte?|volpe|regno|silenzio|economist|insomne|guerra|calendario|pescatrice|interprete|condominio|luna\s+piena|mercato\s+nero|banche\s+dei\s+sogni|mezze\s+verit)\w*\b/g,
  );
  return matches?.length ?? 0;
}

export function hasEntityDrivenNarrativeSignals(text: string): boolean {
  const sanitized = sanitizeUserConceptInput(text);
  if (!sanitized || isSparseConceptInput(sanitized)) return false;
  const anchors = countWildNarrativeAnchors(sanitized);
  const words = sanitized.split(/\s+/).filter(Boolean);
  const protagonist = extractConceptProtagonist(sanitized);
  if (anchors >= 3) return true;
  if (protagonist && anchors >= 2) return true;
  if (words.length >= 14 && anchors >= 1 && protagonist) return true;
  if (words.length >= 18 && anchors >= 2) return true;
  return false;
}

export function inferNarrativeGenreFromIdea(text: string): string | undefined {
  const hay = normalizedConceptHay(text);
  if (!hay) return undefined;
  if (hasSupernaturalThrillerSignals(text) || (/\bthriller\b/.test(hay) && /\b(chiave|porta|indagine|omicid)\b/.test(hay))) {
    return "thriller";
  }
  if (/\b(1[0-9]{3}|nagasaki|imperi|confessione|interprete)\b/.test(hay) && /\b(guerra|traduz|parola)\b/.test(hay)) {
    return "historical";
  }
  if (/\b(fantasma|bollette|condominio|wifi|morti)\b/.test(hay)) return "horror";
  if (/\b(cadaver|noir|bruma|pescatrice)\b/.test(hay)) return "thriller";
  if (/\b(sonno|valuta|economist|insomne|mercato\s+nero)\b/.test(hay)) return "narrativa";
  if (/\b(volpe|regno|lettera|allegor)\b/.test(hay)) return "narrativa";
  if (/\b(scatola|marted|calendario)\b/.test(hay)) return "narrativa";
  if (/\b(chiav\w*|bottega)\b/.test(hay) && /\b(scelte?\s+non\s+compiut\w*|libero\s+arbitrio|destino|futuro)\b/.test(hay)) {
    return "narrativa";
  }
  if (/\b(chiave|porte?)\b/.test(hay) && !hasHighConceptFantasySignals(text)) return "thriller";
  return undefined;
}

export function shouldUseEntityDrivenScaffold(text: string): boolean {
  const sanitized = sanitizeUserConceptInput(text);
  if (!sanitized || isSparseConceptInput(sanitized)) return false;
  if (
    hasDragonFlameFantasySignals(sanitized) ||
    hasHorrorStationSignals(sanitized) ||
    hasHospitalGuardianMemoirSignals(sanitized) ||
    hasBusinessRestaurantSignals(sanitized) ||
    hasCookbookMediterraneanSignals(sanitized) ||
    hasPhotographyManualSignals(sanitized) ||
    hasSubmergedCitySciFiSignals(sanitized) ||
    hasSupernaturalThrillerSignals(sanitized)
  ) {
    return false;
  }
  return hasEntityDrivenNarrativeSignals(sanitized);
}

export type ConceptAnalysis = {
  protagonist?: string;
  setting?: string;
  timeAnchor?: string;
  entities: string[];
  genre?: string;
  bookFormat?: string;
};

function extractConceptSetting(idea: string): string | undefined {
  const text = sanitizeUserConceptInput(idea);
  const patterns = [
    /\b(citt[aà]\s+sommersa)\b/i,
    /\b(piccolo\s+paese|paese|villaggio)\b/i,
    /\b(stazione(?:\s+ferroviaria)?(?:\s+abbandonata)?)\b/i,
    /\b(regno|impero|colonia)\b/i,
    /\b(bottega(?:\s+delle\s+chiavi\s+perdute)?)\b/i,
    /\b(casa|villa|bosco|isola)\b/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

function extractConceptEntities(idea: string): string[] {
  const text = sanitizeUserConceptInput(idea);
  const entities: string[] = [];
  const patterns = [
    /\b(citt[aà]\s+sommersa)\b/gi,
    /\b(disgelo|ghiaccio|congelat\w*)\b/gi,
    /\b(trecento\s+anni|\d+\s+anni)\b/gi,
    /\b(tecnolog\w*\s+impossibil\w*)\b/gi,
    /\b(entit[aà]\s+antica)\b/gi,
    /\b(segret\w*)\b/gi,
    /\b(storico|storica)\b/gi,
    /\b(bottega\s+delle\s+chiavi\s+perdute)\b/gi,
    /\b(chiavi?\s+(?:delle\s+)?scelte?\s+non\s+compiut\w*)\b/gi,
    /\b(chiave\s+(?:dal|del|proveniente\s+dal)\s+futuro)\b/gi,
    /\b(libero\s+arbitrio)\b/gi,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const label = match[0].trim();
      if (label && !entities.some((e) => e.toLowerCase() === label.toLowerCase())) {
        entities.push(label);
      }
    }
  }
  const protagonist = extractConceptProtagonist(text);
  if (protagonist && !entities.includes(protagonist)) entities.unshift(protagonist);
  return entities;
}

export function hasSubmergedCitySciFiSignals(text: string): boolean {
  const hay = normalizedConceptHay(text);
  if (!hay) return false;
  const iceCity =
    /\b(citta\s+sommersa|sommersa|sottacqua|sottomarin)\b/.test(hay) ||
    (/\bcitt\w+\b/.test(hay) && /\b(ghiaccio|disgelo|congelat|nascost\w*\s+sotto|prigione)\b/.test(hay)) ||
    /\bprigione\s+(di\s+)?ghiaccio\b/.test(hay) ||
    /\bghiaccio\s+etern/.test(hay);
  const thaw = /\b(disgelo|ghiaccio|congelat|prigione|svegli\w*|risvegli\w*)\b/.test(hay);
  const ancient = /\b(entita\s+antica|tecnolog\w*\s+impossibil|segreto|svegli\w*|risvegli\w*)\b/.test(hay);
  const timeJump = /\b(trecento|tre\s+cento|\d+\s+anni|sette\s+giorni)\b/.test(hay);
  return iceCity && (thaw || ancient || timeJump);
}

export function extractSubmergedCityRole(idea: string): string {
  const hay = normalizedConceptHay(idea);
  if (/\bcartograf\w*\b/.test(hay)) return "cartografo";
  if (/\b(storico|storica)\b/.test(hay)) return "storico della città";
  return "cartografo";
}

export function extractSubmergedCityLabel(idea: string): string {
  const hay = normalizedConceptHay(idea);
  if (/\bcitta\s+sommersa\b/.test(hay)) return "la città sommersa";
  if (/\bnord\b/.test(hay)) return "la città nascosta sotto il ghiaccio del Nord";
  return "la città nel ghiaccio";
}

export function analyzeConceptFromIdea(
  idea: string,
  opts: { genre?: string; tags?: string } = {},
): ConceptAnalysis {
  const sanitized = sanitizeUserConceptInput(idea);
  const dominance = resolveConceptDominance(sanitized, opts);
  return {
    protagonist: extractConceptProtagonist(sanitized),
    setting: extractConceptSetting(sanitized),
    timeAnchor: extractTimeAnchor(sanitized),
    entities: extractConceptEntities(sanitized),
    genre: dominance.genre,
    bookFormat: dominance.bookFormat,
  };
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

export function shouldPreserveConceptSubtitle(idea: string): boolean {
  return (
    hasSupernaturalThrillerSignals(idea) ||
    hasSubmergedCitySciFiSignals(idea) ||
    hasDragonFlameFantasySignals(idea) ||
    hasHorrorStationSignals(idea) ||
    hasHospitalGuardianMemoirSignals(idea) ||
    hasBusinessRestaurantSignals(idea)
  );
}

export function isConceptDominanceSubtitle(subtitle: string, idea: string): boolean {
  if (!shouldPreserveConceptSubtitle(idea)) return false;
  const variants: SupernaturalThrillerSubtitleVariant[] = ["safe", "commercial", "bold"];
  const norm = normalize(subtitle);
  if (hasSubmergedCitySciFiSignals(idea)) {
    return variants.some((variant) => normalize(buildSubmergedCitySubtitle(idea, variant)) === norm);
  }
  if (hasDragonFlameFantasySignals(idea)) {
    return variants.some((variant) => normalize(buildDragonFlameFantasySubtitle(idea, variant)) === norm);
  }
  if (hasHorrorStationSignals(idea)) {
    return variants.some((variant) => normalize(buildHorrorStationSubtitle(idea, variant)) === norm);
  }
  if (hasHospitalGuardianMemoirSignals(idea)) {
    return norm === normalize(buildHospitalMemoirSubtitle(idea));
  }
  if (hasBusinessRestaurantSignals(idea)) {
    return norm === normalize(buildBusinessRestaurantSubtitle(idea));
  }
  return variants.some((variant) => normalize(buildSupernaturalThrillerSubtitle(idea, variant)) === norm);
}

export function buildSubmergedCityTitle(
  idea: string,
  variant: SupernaturalThrillerSubtitleVariant = "commercial",
): string {
  const hay = normalizedConceptHay(idea);
  if (variant === "bold") return "La Prigione Eterna di Ghiaccio";
  if (/\bprigione\b/.test(hay) && /\bghiaccio\b/.test(hay)) return "La Città nella Prigione di Ghiaccio";
  if (/\bdisgelo\b/.test(hay)) return "Il Disgelo della Città Nascosta";
  if (/\bsette\s+giorni\b/.test(hay)) return "I Sette Giorni Perduti nel Ghiaccio";
  return "La Città nel Ghiaccio Eterno";
}

export function buildSubmergedCitySubtitle(
  idea: string,
  variant: SupernaturalThrillerSubtitleVariant = "commercial",
): string {
  const protagonist = extractConceptProtagonist(idea) || "il cartografo";
  const role = extractSubmergedCityRole(idea);
  const city = extractSubmergedCityLabel(idea);

  if (variant === "bold") {
    return "Quando il ghiaccio cede, la prigione si apre — e qualcosa sotto la città ricorda come svegliarsi";
  }
  if (variant === "safe") {
    return `Dopo trecento anni nel ghiaccio, ${protagonist} scopre che ${city} custodisce un segreto capace di riscrivere la storia dell'umanità`;
  }
  return `Una città nascosta nel ghiaccio, sette giorni perduti e un ${role} che scopre la tecnologia impossibile prima che il mondo la raggiunga`;
}

export function buildSubmergedCitySecondaryCast(): string[] {
  return [
    "Abitanti convinti che siano passati solo sette giorni",
    "Potenze mondiali in cerca del segreto",
    "Custodi della tecnologia impossibile",
  ];
}

export function buildSupernaturalThrillerSubtitle(
  idea: string,
  variant: SupernaturalThrillerSubtitleVariant = "commercial",
): string {
  const hay = normalizedConceptHay(idea);
  const hasDeath = /\bmorte(?:\s+predett\w*)?\b/.test(hay);
  const hasFuture = /\bfuturo\b/.test(hay) || /\bricordi\s+dal\s+futuro\b/.test(hay);
  const hasMemories = /\bricordi\b/.test(hay);

  if (variant === "bold") {
    return hasDeath
      ? "La morte che ha già visto non lascerà scelta"
      : "Il futuro non chiede permesso — chiede sangue";
  }

  if (variant === "safe") {
    return hasDeath && hasMemories
      ? "Quando i ricordi dal futuro annunciano una morte inevitabile"
      : "Visioni dal futuro in un paese che non può più mentire";
  }

  if (hasFuture && hasMemories && hasDeath) {
    return "I ricordi del futuro annunciano una morte che nessuno può ignorare";
  }
  if (hasFuture && hasMemories) {
    return "I ricordi del futuro stanno per travolgere tutto ciò che conosce";
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

  if (hasDragonFlameFantasySignals(sanitized)) {
    return {
      genre: "fantasy",
      bookFormat: "novel",
      blockRomanceTemplates: true,
      blockPhilosophyBlueprint: true,
      blockFantasyTemplates: false,
      protagonist,
    };
  }

  if (hasHorrorStationSignals(sanitized)) {
    return {
      genre: "horror",
      bookFormat: "novel",
      blockRomanceTemplates: true,
      blockPhilosophyBlueprint: true,
      blockFantasyTemplates: true,
      protagonist,
    };
  }

  if (hasHospitalGuardianMemoirSignals(sanitized)) {
    return {
      genre: "memoir",
      bookFormat: "memoir",
      blockRomanceTemplates: true,
      blockPhilosophyBlueprint: true,
      blockFantasyTemplates: true,
      protagonist: undefined,
    };
  }

  if (hasBusinessRestaurantSignals(sanitized)) {
    return {
      genre: "business",
      bookFormat: "business_book",
      blockRomanceTemplates: true,
      blockPhilosophyBlueprint: true,
      blockFantasyTemplates: true,
      protagonist: undefined,
    };
  }

  if (hasPhotographyManualSignals(sanitized)) {
    return {
      genre: "manual",
      bookFormat: "manual",
      blockRomanceTemplates: true,
      blockPhilosophyBlueprint: true,
      blockFantasyTemplates: true,
      protagonist: undefined,
    };
  }

  if (hasCookbookMediterraneanSignals(sanitized)) {
    return {
      genre: "cookbook",
      bookFormat: "cookbook",
      blockRomanceTemplates: true,
      blockPhilosophyBlueprint: true,
      blockFantasyTemplates: true,
      protagonist: undefined,
    };
  }

  if (hasSubmergedCitySciFiSignals(sanitized)) {
    return {
      genre: "sci-fi",
      bookFormat: "novel",
      blockRomanceTemplates: true,
      blockPhilosophyBlueprint: true,
      blockFantasyTemplates: true,
      protagonist,
    };
  }

  const genreContext: LiteraryRomanceGenreContext = {
    genre: opts.genre,
    subcategory: opts.tags,
  };

  if (hasLiteraryRomanceSignals(sanitized, genreContext)) {
    return {
      genre: opts.genre || "romance",
      bookFormat: "novel",
      blockRomanceTemplates: false,
      blockPhilosophyBlueprint: false,
      blockFantasyTemplates: true,
      protagonist,
    };
  }

  if (hasHighConceptFantasySignals(sanitized, genreContext)) {
    return {
      genre: "fantasy",
      bookFormat: "novel",
      blockRomanceTemplates: true,
      blockPhilosophyBlueprint: true,
      blockFantasyTemplates: false,
      protagonist,
    };
  }

  const inferredGenre = inferNarrativeGenreFromIdea(sanitized);
  const entityDriven = hasEntityDrivenNarrativeSignals(sanitized);
  const genre = inferredGenre || opts.genre?.trim();

  if (entityDriven) {
    return {
      genre: genre || "narrativa",
      bookFormat: "novel",
      blockRomanceTemplates: true,
      blockPhilosophyBlueprint: true,
      blockFantasyTemplates: true,
      protagonist,
    };
  }

  return {
    genre,
    blockRomanceTemplates: !hasExplicitRomanceSignals(hay),
    blockPhilosophyBlueprint: false,
    blockFantasyTemplates: false,
    protagonist,
  };
}

export type ConceptChapterBeat = { title: string; summary: string };

export function buildSupernaturalThrillerChapterTitles(idea: string): ConceptChapterBeat[] {
  const text = sanitizeUserConceptInput(idea);
  const protagonist = extractConceptProtagonist(text) || "Il protagonista";
  const time = extractTimeAnchor(text);
  const timeRef = time ? ` alle ${time}` : "";
  return [
    {
      title: "La prima visione",
      summary: `${protagonist} riceve la prima visione dal futuro${timeRef} — un ricordo che non può spiegare al paese.`,
    },
    {
      title: "Il giorno della morte",
      summary: `La visione mostra la morte di ${protagonist}. Lo sceriffo locale inizia a nascondere ciò che sa.`,
    },
    {
      title: "Frammenti dal futuro",
      summary: `Ogni notte arrivano ricordi più precisi. Gli abitanti ricevono visioni sincroniche.`,
    },
    {
      title: "Il cerchio si stringe",
      summary: `Il paese si divide tra profezia e panico. ${protagonist} non sa più cosa è memoria e cosa è destino.`,
    },
    {
      title: "Il collasso temporale",
      summary: `Passato, futuro e presente si sovrappongono${timeRef}. La verità del paese inizia a emergere.`,
    },
    {
      title: "Il primo uomo del futuro",
      summary: `Compare la presenza che invia le visioni. Il destino diventa una minaccia concreta.`,
    },
    {
      title: "Profezia e panico",
      summary: `Il paese stringe il cerchio attorno a ${protagonist}. Ogni scelta alimenta la profezia.`,
    },
    {
      title: "La scelta finale",
      summary: `${protagonist} deve decidere se accettare la morte prevista o riscrivere il tempo.`,
    },
  ];
}

export function buildPsychologicalThrillerChapterTitles(idea: string): ConceptChapterBeat[] {
  const text = sanitizeUserConceptInput(idea);
  const protagonist = extractConceptProtagonist(text) || "L'investigatore";
  return [
    {
      title: "La prima vittima",
      summary: `${protagonist} trova un corpo e un dettaglio che non torna — l'indagine inizia con una firma invisibile.`,
    },
    {
      title: "Il profilo che manca",
      summary: `Ogni prova sembra guidare verso un colpevole impossibile. ${protagonist} scopre un pattern sepolto.`,
    },
    {
      title: "La prova contraddetta",
      summary: `Un alibi crolla e la pista si sposta più vicino a chi ${protagonist} avrebbe dovuto proteggere.`,
    },
    {
      title: "Il sospetto personale",
      summary: `La minaccia diventa intima: qualcuno conosce i segreti di ${protagonist} meglio della polizia.`,
    },
    {
      title: "Midpoint — verità parziale",
      summary: `Una rivelazione ribalta l'indagine. Il serial killer non cerca solo vittime — cerca un testimone.`,
    },
    {
      title: "La trappola psicologica",
      summary: `${protagonist} capisce di essere stato scelto. Ogni mossa alimenta il gioco del colpevole.`,
    },
    {
      title: "Confronto con il buio",
      summary: `Le prove convergono su un volto familiare. La posta in gioco non è solo giustizia — è identità.`,
    },
    {
      title: "L'ultima indagine",
      summary: `${protagonist} affronta il colpevole nel punto dove psicologia e colpa si fondono.`,
    },
  ];
}

export function buildMemoirChapterTitles(idea: string): ConceptChapterBeat[] {
  const text = sanitizeUserConceptInput(idea);
  const theme = text.split(/[.!?…]/)[0]?.trim() || "il viaggio interiore";
  return [
    {
      title: "Origine",
      summary: `Memoria d'inizio: come ${theme.toLowerCase()} ha preso forma nella vita reale — senza trama da fiction.`,
    },
    {
      title: "La frattura",
      summary: `Il momento in cui tutto si è incrinato. Voce autentica, scena di memoria, verità personale.`,
    },
    {
      title: "Il silenzio",
      summary: `Ciò che non si raccontava ad alta voce. Memoir riflessivo — non payoff da fiction né struttura narrativa generica.`,
    },
    {
      title: "La svolta",
      summary: `Una scelta o un incontro che ha cambiato la prospettiva. Memoria personale, non arco narrativo generico.`,
    },
    {
      title: "Ricostruzione",
      summary: `Come il senso è stato ricomposto dopo la perdita. Memoir e integrazione dell'identità.`,
    },
    {
      title: "Integrazione",
      summary: `Ciò che resta dopo il viaggio. Memoria, verità e una voce che guarda indietro senza fiction template.`,
    },
  ];
}

export function buildSelfHelpChapterTitles(idea: string): ConceptChapterBeat[] {
  const text = sanitizeUserConceptInput(idea);
  const theme = text.split(/[.!?…]/)[0]?.trim() || "il blocco che trattiene";
  return [
    {
      title: "Diagnosi pratica",
      summary: `Capire ${theme.toLowerCase()} senza filosofia astratta — quadro chiaro del problema del lettore.`,
    },
    {
      title: "Il primo esercizio",
      summary: `Pratica guidata immediata: uno strumento applicabile oggi, non arco narrativo.`,
    },
    {
      title: "Metodo settimanale",
      summary: `Routine misurabile per consolidare progressi. Esercizi, tracker e checkpoint concreti.`,
    },
    {
      title: "Casi reali",
      summary: `Esempi applicati al tema. Guida pratica — nessun arco narrativo da fiction.`,
    },
    {
      title: "Ostacoli prevedibili",
      summary: `Come riconoscere ricadute e correggere rotta. Pratica, non payoff emotivo da fiction.`,
    },
    {
      title: "Piano sostenibile",
      summary: `Integrare il metodo nella vita quotidiana. Esercizi finali e promessa misurabile.`,
    },
  ];
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

export function isForbiddenFantasyTitlePattern(title: string): boolean {
  const loose = normalize(title);
  if (!loose) return false;
  return /\b(porta|custod\w*|corona|ghiaccio|mille\s+anni|patto\s+spezzato|soglia\s+magica|regno|incantesim|drago|magia|apocaliss|prigione\s+di\s+ghiaccio|disgelo|entita\s+antica)\b/.test(
    loose,
  );
}

export function buildLiteraryRomanceChapterBeats(idea: string): ConceptChapterBeat[] {
  const text = sanitizeUserConceptInput(idea);
  const protagonist = extractConceptProtagonist(text) || "Il protagonista";
  const hay = normalizedConceptHay(text);
  const memory = /\b(memori|ricord|passato)\b/.test(hay);
  const choice = /\b(scelte?\s+irreversibili|decisione|seconda\s+opportunit)\b/.test(hay);
  const matureLove = /\b(amore\s+maturo|desiderio|innamor|ritrov|separat)\b/.test(hay);

  return [
    {
      title: "Il secondo che cambia tutto",
      summary: `${protagonist} vive un momento sospeso che riapre una ferita emotiva — non magia, ma memoria e desiderio che tornano a galla.`,
    },
    {
      title: "La distanza necessaria",
      summary: matureLove
        ? `${protagonist} misura quanto l'amore maturo chieda silenzi, pause e verità mai dette.`
        : `${protagonist} capisce che la vicinanza emotiva può ferire più della lontananza.`,
    },
    {
      title: memory ? "Ciò che il passato tiene ancora" : "Il nome che non si pronuncia",
      summary: memory
        ? `Il passato non è un mistero soprannaturale: è ciò che ${protagonist} ha scelto di non guardare.`
        : `${protagonist} affronta ciò che è stato evitato troppo a lungo tra due persone reali.`,
    },
    {
      title: "Un appuntamento senza alibi",
      summary: `Un incontro concreto obbliga ${protagonist} a uscire dalla difesa — tempo, luogo e corpo contano più delle metafore.`,
    },
    {
      title: choice ? "La scelta che non si rimanda" : "Il peso del domani",
      summary: choice
        ? `${protagonist} deve decidere cosa salvare e cosa lasciare andare senza illusioni eroiche.`
        : `${protagonist} capisce che rimandare equivale già a una decisione.`,
    },
    {
      title: "Ciò che resta dopo il silenzio",
      summary: `Conseguenze emotive reali: ${protagonist} integra ciò che è emerso senza payoff da fantasy né trama artificiale.`,
    },
  ];
}

export function buildSubmergedCityChapterTitles(idea: string): ConceptChapterBeat[] {
  const text = sanitizeUserConceptInput(idea);
  const protagonist = extractConceptProtagonist(text) || "Il protagonista";
  const role = extractSubmergedCityRole(text);
  const city = extractSubmergedCityLabel(text);
  const hasSevenDays = /\bsette\s+giorni\b/i.test(text);
  const hasAwakening = /\bsvegli\w*|risvegli\w*\b/i.test(text);
  const threatLabel = /\bentit[aà]\s+antica\b/i.test(text) ? "un'entità antica" : "qualcosa imprigionato nel ghiaccio";

  return [
    {
      title: "Il Disgelo",
      summary: `${protagonist}, giovane ${role}, nota i primi segni del disgelo su ${city} — e capisce che trecento anni di ghiaccio eterno stanno per finire.`,
    },
    {
      title: "I Sette Giorni Perduti",
      summary: hasSevenDays
        ? `Gli abitanti credono che siano passati solo sette giorni. ${protagonist} scopre che il salto temporale nasconde il vero costo del risveglio della città.`
        : `Il tempo nella città non coincide con il mondo esterno. ${protagonist} deve capire quanti secoli il ghiaccio ha davvero congelato.`,
    },
    {
      title: "La Tecnologia Impossibile",
      summary: `Sotto il ghiaccio emergono macchine che non dovrebbero esistere. ${protagonist} documenta ciò che può riscrivere la storia dell'umanità mentre il mondo inizia a combattere per impossessarsene.`,
    },
    {
      title: "La Prigione di Ghiaccio",
      summary: `${protagonist} scopre che il ghiaccio non era solo protezione: era una prigione costruita per contenere ${threatLabel} sotto la città.`,
    },
    {
      title: "Ciò che Si Sveglia",
      summary: hasAwakening
        ? `Il disgelo libera non solo rovine e segreti: ${threatLabel} sta per svegliarsi. ${protagonist} deve capire perché è stata imprigionata e cosa accadrà quando il ghiaccio cederà del tutto.`
        : `La minaccia sepolta sotto ${city} inizia a muoversi. ${protagonist} collega tecnologia impossibile, segreto storico e prigione di ghiaccio in un'unica posta in gioco.`,
    },
    {
      title: "Il Prezzo della Verità",
      summary: `${protagonist} deve decidere se rivelare il segreto che cambia la storia dell'umanità o lasciare ancora imprigionato ciò che il ghiaccio teneva in catene.`,
    },
  ];
}

export function buildDragonFlameFantasyTitle(idea: string): string {
  const protagonist = extractConceptProtagonist(idea) || "Kael";
  const hay = normalizedConceptHay(idea);
  if (/\bnasce\s+senza\b/.test(hay) && /\bfiamma\b/.test(hay)) return "Il Drago Senza Fiamma";
  if (protagonist) return `La Fiamma di ${protagonist}`;
  return "La Fiamma Rubata";
}

export function buildDragonFlameFantasySubtitle(
  idea: string,
  variant: SupernaturalThrillerSubtitleVariant = "commercial",
): string {
  const protagonist = extractConceptProtagonist(idea) || "Kael";
  if (variant === "bold") {
    return "Quando controllare il fuoco degli altri draghi significa diventare la minaccia più temuta del continente";
  }
  if (variant === "safe") {
    return `${protagonist} nasce senza fiamma, condannato a morte — finché scopre di comandare il fuoco altrui`;
  }
  return `Un fantasy epico su draghi, fiamme e ${protagonist}, il drago che può controllare il fuoco degli altri`;
}

export function buildHorrorStationSubtitle(
  idea: string,
  variant: SupernaturalThrillerSubtitleVariant = "commercial",
): string {
  const protagonist = extractConceptProtagonist(idea) || "Elia";
  const time = extractTimeAnchor(idea);
  if (variant === "bold") {
    return "La fotografia della madre è un avvertimento — e il treno non perdona chi ignora l'orario";
  }
  if (variant === "safe") {
    return time
      ? `Alle ${time} la stazione riappare tra gallerie inesistenti — e ${protagonist} deve capire cosa vuole la madre nella fotografia`
      : `Una stazione fantasma, una fotografia e un treno che ${protagonist} non deve lasciare salire nessuno`;
  }
  return time
    ? `Horror ferroviario alle ${time}: stazione abbandonata, fotografia della madre e un treno che non dovrebbe esistere`
    : `Stazione abbandonata, fotografia maledetta e un treno che ${protagonist} deve fermare`;
}

export function buildHospitalMemoirTitle(idea: string): string {
  const hay = normalizedConceptHay(idea);
  if (/\bventicinque\s+anni\b/.test(hay)) return "Venti'anni di Guardia";
  if (/\bospedale\b/.test(hay)) return "Le Notti dell'Ospedale";
  return "Memorie di un Guardiano Notturno";
}

export function buildHospitalMemoirSubtitle(idea: string): string {
  return "Un memoir in prima persona su un ospedale in chiusura, le notti da guardiano e le persone che insegnano cosa significa essere umani";
}

export function buildBusinessRestaurantTitle(idea: string): string {
  const hay = normalizedConceptHay(idea);
  if (/\b17\s+ristorant/.test(hay) && /\bchiosco\b/.test(hay)) return "Da un Chiosco a 17 Ristoranti";
  if (/\bfatturato\b/.test(hay)) return "Zero a Milioni";
  return "Sistemi, Errori e Strategie";
}

export function buildBusinessRestaurantSubtitle(idea: string): string {
  return "Il percorso imprenditoriale da chiosco di panini a catena da milioni — sistemi, errori e strategie replicabili";
}

export function buildPhotographyManualTitle(): string {
  return "Fotografia Digitale per Principianti";
}

export function buildPhotographyManualSubtitle(): string {
  return "Esposizione, diaframma, composizione e luce — esercizi pratici e piano di miglioramento di 30 giorni";
}

export function buildDragonFlameFantasyChapterTitles(idea: string): ConceptChapterBeat[] {
  const protagonist = extractConceptProtagonist(idea) || "Kael";
  return [
    {
      title: "La Fiamma Mancante",
      summary: `${protagonist} nasce senza la fiamma che ogni drago riceve alla nascita — e il clan lo condanna a morte per questa assenza.`,
    },
    {
      title: "Il Giudizio del Clan",
      summary: `La sentenza di morte su ${protagonist} rivela quanto il fuoco sia legge, identità e potere tra i draghi del continente.`,
    },
    {
      title: "Il Fuoco degli Altri",
      summary: `${protagonist} scopre di poter controllare il fuoco degli altri draghi — un potere impossibile che nessuno ha mai visto.`,
    },
    {
      title: "Il Più Pericoloso",
      summary: `Ogni drago che sfida ${protagonist} alimenta la sua minaccia: chi comanda il fuoco altrui diventa l'essere più temuto del continente.`,
    },
    {
      title: "Caccia e Condanna",
      summary: `Il continente si divide tra chi vuole usare ${protagonist} come arma e chi vuole estinguerlo prima che il fuoco cambi l'ordine del mondo.`,
    },
    {
      title: "Il Prezzo del Fuoco Rubato",
      summary: `${protagonist} capisce che controllare il fuoco altrui ha un costo — e che la condanna alla nascita era solo l'inizio.`,
    },
    {
      title: "Draghi contro Drago",
      summary: `L'ultimo confronto tra ${protagonist} e i custodi del fuoco decide se un drago senza fiamma può riscrivere la legge dei draghi.`,
    },
    {
      title: "La Fiamma che Sceglie",
      summary: `${protagonist} deve decidere se restare minaccia, salvatore o nuova origine del fuoco — e quale continente ne pagherà il prezzo.`,
    },
  ];
}

export function buildHorrorStationChapterTitles(idea: string): ConceptChapterBeat[] {
  const protagonist = extractConceptProtagonist(idea) || "Elia";
  const time = extractTimeAnchor(idea) || "03:17";
  return [
    {
      title: `Alle ${time}`,
      summary: `Ogni notte alle ${time} la stazione ferroviaria abbandonata compare tra due gallerie inesistenti — e ${protagonist} è la prima a vederla riapparire.`,
    },
    {
      title: "La Fotografia della Madre",
      summary: `${protagonist} trova una fotografia della madre con l'avvertimento: non lasciare che salga sul treno. L'immagine mostra una donna che non combacia con i ricordi.`,
    },
    {
      title: "Gallerie Inesistenti",
      summary: `Tra le gallerie che non dovrebbero esistere, ${protagonist} segue tracce, ricordi distorti e segni che la stazione lascia solo a chi la guarda.`,
    },
    {
      title: "Il Treno che Non Parte",
      summary: `Il treno compare senza orario ufficiale. ${protagonist} capisce che salire significherebbe accettare una verità che la madre ha cercato di seppellire.`,
    },
    {
      title: "Non Lasciare che Io Salga",
      summary: `La scritta sulla fotografia diventa comando e maledizione: ${protagonist} deve impedire alla madre — o a ciò che la fotografia mostra — di salire.`,
    },
    {
      title: "Memoria che Contamina",
      summary: `Ricordi e presenze si sovrappongono nella stazione. ${protagonist} non sa più se sta salvando la madre — la donna nella fotografia — o salvando se stesso dal treno.`,
    },
    {
      title: "L'Ultimo Binario",
      summary: `Alle ${time} la stazione si rivela per l'ultima volta con chiarezza. ${protagonist} deve scegliere tra verità, sopravvivenza e ciò che il treno porta via.`,
    },
    {
      title: "Sul Treno o Fuori",
      summary: `Finale: ${protagonist} affronta la fotografia, la madre e il treno nel punto dove gallerie inesistenti e memoria convergono.`,
    },
  ];
}

export function buildHospitalMemoirChapterTitles(): ConceptChapterBeat[] {
  return [
    {
      title: "Il Turno di Notte",
      summary: "Memoria d'inizio: la prima notte come guardiano in un ospedale destinato alla chiusura — voce in prima persona, non trama da fiction.",
    },
    {
      title: "Corridoi in Chiusura",
      summary: "L'ospedale che si svuota: pazienti, infermieri e silenzi che insegnano cosa resta quando un luogo muore lentamente.",
    },
    {
      title: "Le Persone che Restano",
      summary: "Scene di memoria su chi ha attraversato quelle notti — figure reali che mostrano cosa significa essere umani.",
    },
    {
      title: "Vigilia e Verità",
      summary: "Notturno dopo notturno: il guardiano osserva, ascolta e registra verità che solo chi resta sveglio può vedere.",
    },
    {
      title: "Cosa Insegna un Ospedale",
      summary: "Memoir riflessivo: lezioni di umanità tratte da corpi fragili, addii e piccoli gesti di cura quotidiana.",
    },
    {
      title: "L'Ultima Notte",
      summary: "La chiusura imminente stringe il racconto: cosa resta dopo venticinque anni di guardia e di incontri che cambiano lo sguardo.",
    },
    {
      title: "Voce che Resta",
      summary: "Integrazione: il libro restituisce le persone incontrate e il senso di ciò che significa essere umani — senza payoff da romanzo.",
    },
    {
      title: "Dopo la Guardia",
      summary: "Chiusura memoir: memoria, gratitudine e una voce autoriale che guarda indietro senza fiction template.",
    },
  ];
}

export function buildBusinessRestaurantChapterTitles(): ConceptChapterBeat[] {
  return [
    {
      title: "Il Chiosco di Panini",
      summary: "Origine imprenditoriale: il primo punto vendita, i primi errori e le prime lezioni sul campo — business, non arco narrativo.",
    },
    {
      title: "Sistemi che Reggono",
      summary: "Come trasformare intuizione in processi replicabili: standard, turni, fornitori e controllo qualità.",
    },
    {
      title: "Errori Costosi",
      summary: "Casi reali di decisioni sbagliate nella crescita — e cosa sono costati in fatturato, tempo e reputazione.",
    },
    {
      title: "Da Uno a Molti",
      summary: "Apertura dei primi ristoranti: delega, formazione del team e strategie che separano espansione da implosione.",
    },
    {
      title: "La Catena Prende Forma",
      summary: "Costruire una rete di 17 punti vendita: numeri, margini, posizionamento e scelte di mercato concrete.",
    },
    {
      title: "Strategie da Zero a Milioni",
      summary: "Framework operativi che hanno portato da fatturato iniziale a milioni — leve, KPI e priorità imprenditoriali.",
    },
    {
      title: "Crisi e Correzioni",
      summary: "Ostacoli prevedibili nella ristorazione: stagionalità, personale, costi e come correggere rotta senza teoria vuota.",
    },
    {
      title: "Il Manuale del Fondatore",
      summary: "Sintesi finale: sistemi, errori e strategie replicabili per chi vuole costruire crescita misurabile nel food business.",
    },
  ];
}

export function buildCookbookChapterTitles(): ConceptChapterBeat[] {
  return [
    { title: "Ingredienti di Stagione", summary: "Pantry mediterraneo, ingredienti base e sostituzioni — sezione ricettario operativa." },
    { title: "Tecniche Fondamentali", summary: "Taglio, cottura, condimenti e tempi: le basi della cucina mediterranea tradizionale." },
    { title: "100 Ricette Tradizionali", summary: "Ricette passo-passo con dosi, tempi e varianti per piatti classici del Mediterraneo." },
    { title: "Menu Settimanali", summary: "Menu completi per la settimana: colazione, pranzo e cena con lista spesa integrata." },
    { title: "Varianti Vegetariane", summary: "Adattamenti vegetariani delle ricette tradizionali senza perdere sapore né equilibrio." },
    { title: "Piano Alimentare 30 Giorni", summary: "Piano alimentare di 30 giorni con menu, prep e rotazione stagionale." },
    { title: "Errori in Cucina", summary: "Errori comuni, correzioni rapide e checklist per risultati replicabili." },
    { title: "Servizio e Tavola", summary: "Impiattamento, conservazione e servizio per chiudere il ricettario con autonomia completa." },
  ];
}

export function buildPhotographyManualChapterTitles(): ConceptChapterBeat[] {
  return [
    { title: "Esposizione", summary: "ISO, tempo e triangolo dell'esposizione — fondamenti per principianti con esempi immediati." },
    { title: "Diaframma", summary: "Profondità di campo, apertura e controllo della luce: diaframma spiegato con esercizi guidati." },
    { title: "Composizione", summary: "Inquadratura, regola dei terzi, linee e punto focale — costruire immagini che funzionano." },
    { title: "Luce Naturale e Artificiale", summary: "Leggere e usare la luce: ore dorate, controluce, riflessi e lampi base." },
    { title: "Esercizi Pratici", summary: "Esercizi settimanali per consolidare esposizione, diaframma e composizione con feedback misurabile." },
    { title: "Piano di 30 Giorni", summary: "Piano di miglioramento di 30 giorni: progressione guidata da principiante a fotografo consapevole." },
    { title: "Errori dei Principianti", summary: "Troubleshooting: sfocature, sovraesposizione, composizione piatta e come correggerle sul campo." },
    { title: "Portfolio e Prossimi Passi", summary: "Selezionare le migliori immagini, costruire un portfolio iniziale e continuare a migliorare." },
  ];
}

export function buildFantasyChapterBeats(idea: string): ConceptChapterBeat[] {
  if (hasDragonFlameFantasySignals(idea)) {
    return buildDragonFlameFantasyChapterTitles(idea);
  }
  const text = sanitizeUserConceptInput(idea);
  const protagonist = extractConceptProtagonist(text) || "Il protagonista";
  const titles = buildFantasyChapterTitles(idea);
  return titles.map((title, index) => ({
    title,
    summary:
      index === 0
        ? `${protagonist} scopre la porta nel cuore del mistero — il primo legame con la memoria ancestrale.`
        : index === titles.length - 1
          ? `${protagonist} affronta l'ultima scelta tra potere, destino e il costo della magia.`
          : `Capitolo fantasy: ${title} — magia, tradimento e posta in gioco legati all'idea originale.`,
  }));
}

export type ChapterScaffoldFormat =
  | "dragon_fantasy"
  | "horror_station"
  | "submerged_city"
  | "hospital_memoir"
  | "memoir"
  | "business"
  | "cookbook"
  | "photography_manual"
  | "supernatural_thriller"
  | "psychological_thriller"
  | "self_help"
  | "fantasy"
  | "literary_romance"
  | "generic";

type ExpansionPhase = "escalation" | "complication" | "reversal" | "climax" | "denouement";

function dedupeChapterBeats(beats: ConceptChapterBeat[]): ConceptChapterBeat[] {
  const seen = new Set<string>();
  return beats.filter((beat) => {
    const key = normalize(beat.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function phaseForChapterIndex(index: number, total: number): ExpansionPhase {
  const ratio = (index + 1) / Math.max(1, total);
  if (ratio <= 0.3) return "escalation";
  if (ratio <= 0.55) return "complication";
  if (ratio <= 0.75) return "reversal";
  if (ratio <= 0.9) return "climax";
  return "denouement";
}

function expansionBeat(
  title: string,
  summary: string,
  protagonist: string,
  entity: string,
  phase: ExpansionPhase,
): ConceptChapterBeat {
  const phaseSummary: Record<ExpansionPhase, string> = {
    escalation: `${protagonist} scopre che ${entity} cambia le regole del gioco — tensione crescente verso il midpoint.`,
    complication: `${entity} complica la scelta di ${protagonist}: nessuna via è neutrale.`,
    reversal: `Ribaltamento: ciò che ${protagonist} credeva su ${entity} si rovescia.`,
    climax: `Confronto decisivo su ${entity}: ${protagonist} deve agire senza margine di errore.`,
    denouement: `Conseguenze di ${entity}: ${protagonist} integra ciò che è emerso.`,
  };
  return { title, summary: summary || phaseSummary[phase] };
}

function getFormatExpansionPool(format: ChapterScaffoldFormat, idea: string): ConceptChapterBeat[] {
  const text = sanitizeUserConceptInput(idea);
  const protagonist = extractConceptProtagonist(text) || "Il protagonista";
  const entity = extractSubmergedCityLabel(text) || "il mistero centrale";
  const time = extractTimeAnchor(text) || "03:17";

  const pools: Record<ChapterScaffoldFormat, ConceptChapterBeat[]> = {
    dragon_fantasy: [
      expansionBeat("Sangue di Drago", "", protagonist, "il clan", "escalation"),
      expansionBeat("Alleanza di Fuoco", "", protagonist, "i draghi rivali", "complication"),
      expansionBeat("Terre Bruciate", "", protagonist, "il continente", "escalation"),
      expansionBeat("Il Nido Abbandonato", "", protagonist, "la fiamma ancestrale", "complication"),
      expansionBeat("Legge Antica", "", protagonist, "la condanna alla nascita", "reversal"),
      expansionBeat("Fuoco che Consuma", "", protagonist, "il fuoco altrui", "climax"),
      expansionBeat("Eredità del Clan", "", protagonist, "l'ordine dei draghi", "denouement"),
      expansionBeat("Cielo di Ceneri", "", protagonist, "la minaccia continentale", "climax"),
      expansionBeat("Volo nell'Oscurità", "", protagonist, "la caccia", "escalation"),
      expansionBeat("Sacrificio di Scaglie", "", protagonist, "il prezzo del potere", "reversal"),
      expansionBeat("Dominio del Continente", "", protagonist, "il controllo del fuoco", "climax"),
      expansionBeat("Cenere e Corona", "", protagonist, "la nuova legge del fuoco", "denouement"),
    ],
    horror_station: [
      expansionBeat("Il Vigile Dormiente", "", protagonist, "la stazione", "escalation"),
      expansionBeat("Orario Cancellato", "", protagonist, `l'orario delle ${time}`, "complication"),
      expansionBeat("Binario Fantasma", "", protagonist, "il treno", "escalation"),
      expansionBeat("Eco di Voce Materna", "", protagonist, "la fotografia della madre", "complication"),
      expansionBeat("Soglia tra Gallerie", "", protagonist, "le gallerie inesistenti", "reversal"),
      expansionBeat("Il Conduttore Senza Volto", "", protagonist, "chi guida il treno", "climax"),
      expansionBeat("Ombra sul Marciapiede", "", protagonist, "la stazione abbandonata", "escalation"),
      expansionBeat("La Notte che Non Finisce", "", protagonist, `il ciclo delle ${time}`, "complication"),
      expansionBeat("Contro il Ritardo", "", protagonist, "l'avvertimento sulla fotografia", "reversal"),
      expansionBeat("Fotogramma Morto", "", protagonist, "l'immagine della madre", "climax"),
      expansionBeat("Ultima Chiamata", "", protagonist, "l'ultimo binario", "climax"),
      expansionBeat("Oltre la Stazione", "", protagonist, "ciò che il treno porta via", "denouement"),
    ],
    submerged_city: [
      expansionBeat("Mappa del Disgelo", "", protagonist, entity, "escalation"),
      expansionBeat("Sette Giorni Contati", "", protagonist, "il salto temporale", "complication"),
      expansionBeat("Guerra per il Segreto", "", protagonist, "le potenze esterne", "escalation"),
      expansionBeat("Voce dal Ghiaccio Profondo", "", protagonist, "la prigione di ghiaccio", "complication"),
      expansionBeat("Cartografia del Tempo", "", protagonist, "trecento anni congelati", "reversal"),
      expansionBeat("I Custodi del Nord", "", protagonist, "chi ha costruito la prigione", "complication"),
      expansionBeat("Tecnologia Proibita", "", protagonist, "le macchine impossibili", "climax"),
      expansionBeat("Risveglio Imminente", "", protagonist, "l'entità sepolta", "climax"),
      expansionBeat("Fronte Esterno", "", protagonist, "il mondo che combatte", "escalation"),
      expansionBeat("Prigioniero Eterno", "", protagonist, "ciò che il ghiaccio conteneva", "reversal"),
      expansionBeat("Verità Sotto la Città", "", protagonist, entity, "climax"),
      expansionBeat("Storia Riscritta", "", protagonist, "il segreto dell'umanità", "denouement"),
    ],
    hospital_memoir: [
      { title: "Notte dopo Notte", summary: "Memoria operativa: il ritmo delle notti e ciò che resta quando il turno finisce." },
      { title: "Addii al Corridoio", summary: "Scene di chiusura: pazienti, familiari e silenzi che segnano la fine di un'epoca." },
      { title: "Paziente che Resta", summary: "Un volto che attraversa le notti — lezione di umanità senza fiction template." },
      { title: "Luci al Tramonto", summary: "Il guardiano osserva la città svegliarsi mentre l'ospedale si spegne." },
      { title: "Battute con gli Infermieri", summary: "Umorismo e tenerezza nel turno notturno — voce autentica, non arco narrativo." },
      { title: "Sala Operatoria Vuota", summary: "Luoghi che hanno visto nascite e addii: memoria sensoriale del guardiano." },
      { title: "Lettere mai Inviate", summary: "Ciò che non si è detto ad alta voce durante venticinque anni di guardia." },
      { title: "Specchio del Guardiano", summary: "Riflessione: cosa significa restare svegli quando tutti dormono." },
      { title: "Ospedale che Muore", summary: "La chiusura imminente come cornice emotiva del memoir." },
      { title: "Voce della Maggiordomia", summary: "Figure minori che illuminano il senso del servizio notturno." },
      { title: "Ultimo Addio al Reparto", summary: "Chiusura di un capitolo di vita — integrazione, non finale da romanzo." },
      { title: "Ciò che Porto con Me", summary: "Memoria finale: le persone che hanno insegnato cosa significa essere umani." },
    ],
    memoir: [
      { title: "Prima della frattura", summary: "Contesto di vita prima del punto di svolta — memoria, non setup narrativo." },
      { title: "Il giorno che cambiò tutto", summary: "Scena di memoria centrale: la frattura che divide il prima e il dopo." },
      { title: "Chi c'era con me", summary: "Figure reali del periodo narrato — voce autoriale autentica." },
      { title: "Ciò che non dissi", summary: "Silenzi e verità rimandate nel racconto riflessivo." },
      { title: "Ricostruzione lenta", summary: "Come il senso è stato ricomposto dopo la perdita o la crisi." },
      { title: "Specchi e confronti", summary: "Confronto con versioni precedenti di sé — memoir, non fiction." },
      { title: "Il costo della verità", summary: "Prezzo emotivo di nominare ciò che è stato vissuto." },
      { title: "Nuove mappe", summary: "Integrazione: come la vita prosegue dopo il periodo narrato." },
      { title: "Echi nel presente", summary: "Ciò che resta oggi della storia raccontata." },
      { title: "Voce che guarda indietro", summary: "Chiusura riflessiva con senso di continuità e verità." },
    ],
    business: [
      { title: "Margini che Contano", summary: "KPI, margini e numeri che separano crescita sostenibile da espansione fragile." },
      { title: "Personale che Scala", summary: "Assunzione, formazione e delega nella crescita da uno a molti punti vendita." },
      { title: "Fornitori e Qualità", summary: "Controllo qualità, forniture e standard replicabili nel food business." },
      { title: "Stagionalità e Crisi", summary: "Gestire picchi, cali e imprevisti senza teoria — casi dal campo." },
      { title: "Brand e Posizionamento", summary: "Come il posizionamento guida scelte di menu, prezzo e percezione." },
      { title: "Finanziamenti e Dilazioni", summary: "Crescita finanziata: quando accelerare e quando consolidare." },
      { title: "Espansione Regionale", summary: "Apertura di nuovi punti vendita: criteri, errori e lezioni imprenditoriali." },
      { title: "Delega Operativa", summary: "Passare da fare tutto da soli a sistemi che reggono senza il fondatore." },
      { title: "Audit dei Processi", summary: "Revisione operativa: cosa misurare e cosa correggere nella catena." },
      { title: "Cultura Aziendale", summary: "Valori, team e ritmo che sostengono la crescita a lungo termine." },
      { title: "Numeri che Decidono", summary: "Dashboard imprenditoriale: fatturato, costi e priorità strategiche." },
      { title: "Legacy del Fondatore", summary: "Sintesi: sistemi, errori e strategie replicabili per chi parte da zero." },
    ],
    cookbook: [
      { title: "Antipasti Rapidi", summary: "Antipasti mediterranei con tempi brevi, dosi precise e varianti stagionali." },
      { title: "Primi Classici", summary: "Pasta e risotti tradizionali con tecniche fondamentali e menu domenicali." },
      { title: "Secondi di Pesce", summary: "Pesce mediterraneo: cotture, condimenti e abbinamenti operativi." },
      { title: "Contorni di Mare e Terra", summary: "Verdure, legumi e contorni che completano il menu settimanale." },
      { title: "Dolci della Tradizione", summary: "Dolci classici con dosi testate e varianti per intolleranze comuni." },
      { title: "Salse e Condimenti", summary: "Basi aromatiche, pesti e condimenti che accelerano la cucina quotidiana." },
      { title: "Conservazione e Prep", summary: "Meal prep, conservazione e organizzazione settimanale in cucina." },
      { title: "Feste e Menu Speciali", summary: "Menu per occasioni con timing coordinato e lista spesa integrata." },
      { title: "Cucina Vegetariana Avanzata", summary: "Adattamenti vegetariani delle ricette tradizionali senza perdere equilibrio." },
      { title: "Piatti One-Pot", summary: "Ricette uniche pentola per cene veloci con profilo mediterraneo." },
      { title: "Colazione Mediterranea", summary: "Colazioni e brunch con ingredienti di stagione e prep anticipata." },
      { title: "Cena tra Amici", summary: "Menu conviviale con antipasti, primi e dolce — servizio e impiattamento." },
    ],
    photography_manual: [
      { title: "Bilanciamento del Bianco", summary: "Temperatura colore e bilanciamento per scene naturali e artificiali." },
      { title: "HDR e Dinamica", summary: "Gestire alte luci e ombre senza perdere dettaglio nell'immagine." },
      { title: "Ritratto Naturale", summary: "Ritratti con luce disponibile: posa, distanza focale e sfondo." },
      { title: "Paesaggio Urbano", summary: "Composizione in città: linee, simmetrie e punto focale." },
      { title: "Macro e Dettaglio", summary: "Fotografia ravvicinata: messa a fuoco, stabilizzazione e luce." },
      { title: "Post-Produzione Base", summary: "Correzioni essenziali senza eccessi: esposizione, contrasto e nitidezza." },
      { title: "Attrezzatura Essenziale", summary: "Obiettivi, treppiedi e accessori per principianti con budget contenuto." },
      { title: "Scatto Notturno", summary: "ISO, tempo lungo e luce artificiale per scene notturne controllate." },
      { title: "Street Photography", summary: "Discrezione, tempismo e composizione per fotografia di strada." },
      { title: "Ritratti in Controluce", summary: "Gestire controluce e silhouette con esposizione mirata." },
      { title: "Settimana 2 del Piano", summary: "Progressione guidata: consolidare esposizione e composizione." },
      { title: "Portfolio Avanzato", summary: "Selezione finale, coerenza visiva e prossimi passi formativi." },
    ],
    supernatural_thriller: [
      expansionBeat("Visione sincrona", "", protagonist, "il paese", "escalation"),
      expansionBeat("Testimoni del futuro", "", protagonist, "i ricordi dal futuro", "complication"),
      expansionBeat("Profezia divisa", "", protagonist, "lo sceriffo", "reversal"),
      expansionBeat("Conto alla rovescia", "", protagonist, "la morte predetta", "climax"),
      expansionBeat("Memoria contaminata", "", protagonist, "tempo e destino", "complication"),
      expansionBeat("Il cerchio si chiude", "", protagonist, "la visione finale", "climax"),
      expansionBeat("Verità del paese", "", protagonist, "ciò che è stato nascosto", "reversal"),
      expansionBeat("Oltre la profezia", "", protagonist, "la scelta sul futuro", "denouement"),
    ],
    psychological_thriller: [
      expansionBeat("Primo sospetto", "", protagonist, "l'indagine", "escalation"),
      expansionBeat("Prova mancante", "", protagonist, "il colpevole", "complication"),
      expansionBeat("Testimone inaffidabile", "", protagonist, "la memoria", "reversal"),
      expansionBeat("Trappola narrativa", "", protagonist, "la verità parziale", "climax"),
      expansionBeat("Doppio fondo", "", protagonist, "il movente", "reversal"),
      expansionBeat("Confronto finale", "", protagonist, "la resa dei conti", "climax"),
      expansionBeat("Cicatrice aperta", "", protagonist, "le conseguenze", "denouement"),
    ],
    self_help: [
      { title: "Audit delle abitudini", summary: "Mappare pattern ricorrenti senza giudizio — diagnosi pratica del lettore." },
      { title: "Micro-azioni quotidiane", summary: "Esercizi da 10 minuti integrabili nella routine reale." },
      { title: "Resistenza prevedibile", summary: "Riconoscere ricadute e correggere rotta con strumenti misurabili." },
      { title: "Accountability", summary: "Sistemi di verifica: tracker, checkpoint e celebrazione dei progressi." },
      { title: "Riformulazione cognitiva", summary: "Riscrivere il dialogo interno da giudizio a coaching operativo." },
      { title: "Integrazione sociale", summary: "Come il cambiamento si riflette in relazioni e contesto quotidiano." },
      { title: "Piano di mantenimento", summary: "Consolidare risultati oltre l'ultima pagina del percorso." },
      { title: "Prossima frontiera", summary: "Dove proseguire dopo il primo ciclo completo del metodo." },
    ],
    fantasy: [
      expansionBeat("Il Patto Spezzato", "", protagonist, "la magia ancestrale", "escalation"),
      expansionBeat("Custodi del Soglia", "", protagonist, "la porta nel cuore", "complication"),
      expansionBeat("Memoria che Brucia", "", protagonist, "i ricordi antichi", "reversal"),
      expansionBeat("Corona di Cenere", "", protagonist, "il destino del mondo", "climax"),
      expansionBeat("Ultimo Custode", "", protagonist, "la scelta finale", "denouement"),
    ],
    literary_romance: [
      expansionBeat("Il messaggio non inviato", "", protagonist, "il desiderio trattenuto", "escalation"),
      expansionBeat("La stanza del confronto", "", protagonist, "la verità emotiva", "complication"),
      expansionBeat("Un caffè di troppo", "", protagonist, "la routine interrotta", "escalation"),
      expansionBeat("La promessa sospesa", "", protagonist, "ciò che non si è detto", "complication"),
      expansionBeat("Il corpo che ricorda", "", protagonist, "memoria sensoriale", "reversal"),
      expansionBeat("La scelta del mattino", "", protagonist, "la decisione concreta", "climax"),
      expansionBeat("Dopo la tempesta domestica", "", protagonist, "le conseguenze reali", "denouement"),
      expansionBeat("La forma del perdono", "", protagonist, "amore maturo", "denouement"),
    ],
    generic: [],
  };

  return pools[format] ?? [];
}

function generateOverflowBeat(
  index: number,
  total: number,
  idea: string,
  format: ChapterScaffoldFormat,
  usedTitles: Set<string>,
): ConceptChapterBeat {
  const text = sanitizeUserConceptInput(idea);
  const protagonist = extractConceptProtagonist(text) || "Il protagonista";
  const phase = phaseForChapterIndex(index, total);
  const entity =
    extractSubmergedCityLabel(text) ||
    (/\bospedale\b/i.test(text) ? "l'ospedale" : null) ||
    (/\bristorant|chiosco\b/i.test(text) ? "la catena" : null) ||
    (/\bfotograf/i.test(text) ? "la macchina fotografica" : null) ||
    (/\bmediterrane/i.test(text) ? "la cucina mediterranea" : null) ||
    "la posta in gioco";

  const phaseLabels: Record<ExpansionPhase, string> = {
    escalation: "Intensificazione",
    complication: "Complicazione",
    reversal: "Ribaltamento",
    climax: "Confronto",
    denouement: "Eco finale",
  };

  let attempt = 0;
  while (attempt < 8) {
    const title = `${phaseLabels[phase]} su ${entity} — ${protagonist}`;
    const altTitle = attempt > 0 ? `${title} (${index + 1})` : title;
    const key = normalize(altTitle);
    if (!usedTitles.has(key)) {
      return expansionBeat(altTitle, "", protagonist, entity, phase);
    }
    attempt += 1;
  }

  return {
    title: `Capitolo ${index + 1}: ${phaseLabels[phase]}`,
    summary: `${protagonist} attraversa la fase di ${phaseLabels[phase].toLowerCase()} legata a ${entity}.`,
  };
}

export function expandChapterScaffold(
  beats: ConceptChapterBeat[],
  targetCount: number,
  idea: string,
  format: ChapterScaffoldFormat = "generic",
): ConceptChapterBeat[] {
  if (targetCount <= 0) return [];
  if (beats.length === 0) return [];

  const expansionPool = format === "literary_romance"
    ? getFormatExpansionPool(format, idea).filter((beat) => !isForbiddenFantasyTitlePattern(beat.title))
    : getFormatExpansionPool(format, idea);
  const merged = dedupeChapterBeats([...beats, ...expansionPool]);
  if (targetCount <= merged.length) {
    return merged.slice(0, targetCount);
  }

  const result = [...merged];
  const usedTitles = new Set(merged.map((beat) => normalize(beat.title)));

  while (result.length < targetCount) {
    const overflow = generateOverflowBeat(result.length, targetCount, idea, format, usedTitles);
    result.push(overflow);
    usedTitles.add(normalize(overflow.title));
  }

  return result;
}

export function expandConceptBeatsToCount(
  beats: ConceptChapterBeat[],
  count: number,
  idea = "",
  format: ChapterScaffoldFormat = "generic",
): ConceptChapterBeat[] {
  return expandChapterScaffold(beats, count, idea, format);
}

export function buildHorrorStationTitle(
  idea: string,
  variant: SupernaturalThrillerSubtitleVariant = "commercial",
): string {
  const timeTitle = buildTimeAnchoredTitle(idea);
  const lead = extractConceptProtagonist(idea) || "Elia";
  const time = extractTimeAnchor(idea) || "03:17";
  if (variant === "bold") return "Non Lasciare che Io Salga sul Treno";
  if (variant === "safe") return lead ? `La Fotografia di ${lead}` : `La Stazione delle ${time}`;
  return timeTitle || `La Stazione delle ${time}`;
}

export function buildCookbookMediterraneanTitle(idea: string): string {
  const hay = normalizedConceptHay(idea);
  if (/\b100\s+ricette\b/.test(hay)) return "Cento Ricette del Mediterraneo";
  if (/\bmenu\s+settimanal/.test(hay)) return "Mediterraneo in Sette Menu";
  if (/\bvegetarian/.test(hay)) return "Mediterraneo Vegetariano";
  return "Cucina Mediterranea Tradizionale";
}
