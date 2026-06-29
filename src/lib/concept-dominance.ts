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
  "Ogni", "Una", "Uno", "Il", "Lo", "La", "Le", "I", "Gli", "Quando", "Dopo", "Prima", "Durante",
  "Mentre", "Per", "Oltre", "Se", "Non", "Anche", "Sempre", "Mai", "Tutto", "Nulla", "Qualcosa",
  "Qualcuno", "Nessuno", "Altri", "Altre", "Molti", "Pochi", "Tutti", "Tutte", "Come", "Dove",
  "Perche", "Perché", "Cosi", "Così", "Loro", "Lui", "Lei", "Noi", "Voi", "Esso", "Era", "Erano",
  "Sono", "Infine", "Inoltre", "Tuttavia", "Quindi", "Perciò", "Benché", "Sebbene", "Oppure",
  "Forse", "Fotografie", "Ricordi", "Donna", "Persone", "Thriller", "Horror", "Fantasy", "Romanzo",
  "Libro", "Idea", "Mistero", "Memoria", "Destino", "Tempo", "Futuro", "Supernatural",
  "Soprannaturale", "High", "Concept", "Mystery", "Romance", "Narrativa", "Notte", "Alle",
  "Piccolo", "Nel", "Nella", "Che", "Un", "Es", "Visione", "Città", "Citta", "Una",
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

function isSkippedProtagonistCandidate(name: string, offset: number, text: string): boolean {
  if (!name || name.length < 2) return true;
  if (PROTAGONIST_SKIP.has(name)) return true;
  if (ITALIAN_SENTENCE_STARTERS.has(name.toLowerCase())) {
    const before = text.slice(Math.max(0, offset - 2), offset);
    if (offset === 0 || /(?:^|[.!?…]\s*)$/.test(before)) return true;
  }
  return false;
}

export function extractConceptProtagonist(idea: string): string | undefined {
  const text = sanitizeUserConceptInput(idea);
  if (!text) return undefined;

  const explicitRole = text.match(
    /\bprotagonist[ao]\s+([A-ZÀ-Ý][a-zà-ÿ]{1,24})\b/i,
  );
  if (explicitRole?.[1] && !PROTAGONIST_SKIP.has(explicitRole[1])) {
    return explicitRole[1];
  }

  const commaRolePatterns = [
    /,\s*([A-ZÀ-Ý][a-zà-ÿ]{1,24})\s*,\s*(?:ultim[oa]|investigatore|storico|storica|insegnante|restauratrice|chef|medico|medica)\b/i,
    /(?:^|[.!?…]\s+)([A-ZÀ-Ý][a-zà-ÿ]{1,24})\s*,\s*(?:ultim[oa]|investigatore|storico|storica|insegnante)\b/i,
    /(?:^|[.!?…]\s+)([A-ZÀ-Ý][a-zà-ÿ]{1,24})\s*,/,
  ];
  for (const pattern of commaRolePatterns) {
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
  return hasSupernaturalThrillerSignals(idea) || hasSubmergedCitySciFiSignals(idea);
}

export function isConceptDominanceSubtitle(subtitle: string, idea: string): boolean {
  if (!shouldPreserveConceptSubtitle(idea)) return false;
  const variants: SupernaturalThrillerSubtitleVariant[] = ["safe", "commercial", "bold"];
  const norm = normalize(subtitle);
  if (hasSubmergedCitySciFiSignals(idea)) {
    return variants.some((variant) => normalize(buildSubmergedCitySubtitle(idea, variant)) === norm);
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

  if (hasHighConceptFantasySignals(sanitized)) {
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

export function buildFantasyChapterBeats(idea: string): ConceptChapterBeat[] {
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

export function expandConceptBeatsToCount(beats: ConceptChapterBeat[], count: number): ConceptChapterBeat[] {
  if (count <= 0) return [];
  if (beats.length === 0) return [];
  return Array.from({ length: count }, (_, index) => {
    const beat = beats[index % beats.length]!;
    if (index < beats.length) return beat;
    return {
      title: `${beat.title} — parte ${Math.floor(index / beats.length) + 1}`,
      summary: `${beat.summary} Escalation nel capitolo ${index + 1}.`,
    };
  });
}
