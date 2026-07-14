import type { Genre } from "@/types/book";
import { studioGenresFromRegistry } from "@/lib/book-type-engine";
import { resolveLevel1FromBookTypeId } from "@/lib/book-config-engine";
import type { Level1BookType } from "@/lib/book-config-engine/types";
import { resolveNarrativePromise } from "@/lib/narrative-promise-intelligence";
import { hasHighConceptFantasySignals, hasSupernaturalThrillerSignals, sanitizeUserConceptInput } from "@/lib/concept-dominance";

export type InferredBookFormat =
  | "novel"
  | "novella"
  | "poetry_collection"
  | "poetic_essay"
  | "lyrical_prose"
  | "short_story_collection"
  | "essay"
  | "short_essay"
  | "manual"
  | "guide"
  | "cookbook"
  | "workbook"
  | "historical_essay"
  | "memoir"
  | "self_help"
  | "study_material"
  | "children_book"
  | "mixed_or_unknown";

export type ContentFamily =
  | "FICTION"
  | "SELF_HELP"
  | "BUSINESS"
  | "MEMOIR"
  | "WORKBOOK"
  | "POETRY"
  | "COOKBOOK";

export type ContentFamilyDetection = {
  family: ContentFamily;
  confidence: number;
  label: string;
};

export type GenreInference = {
  bookFormat: InferredBookFormat;
  bookTypeId: string;
  genre: Genre;
  category: string;
  subcategory: string;
  subgenre: string;
  tone: string;
  targetReader: string;
  narrativePromise: string;
  commercialGoal: string;
  level1: Level1BookType;
  confidence: "high" | "medium" | "low";
  label: string;
  family?: ContentFamily;
  familyConfidence?: number;
  familyLabel?: string;
  suggestedChapters: number;
};

type Signal = {
  id: string;
  test: RegExp;
  weight: number;
  inference: Omit<GenreInference, "bookFormat" | "confidence" | "label" | "suggestedChapters"> & {
    bookFormat?: InferredBookFormat;
    label: string;
    chapters: number;
  };
};

const STUDIO = studioGenresFromRegistry();

function studioMeta(bookTypeId: string) {
  return STUDIO.find((g) => g.id === bookTypeId) || STUDIO.find((g) => g.id === "literary")!;
}

const POETRY_FORM_PATTERNS = [
  /raccolta poetic[ao]/i,
  /libro poetic[ao]/i,
  /saggio poetic[ao]/i,
  /prosa poetic[ao]/i,
  /prosa liric[ao]/i,
  /\bpoesia\b/i,
  /\bpoesie\b/i,
  /\bframmenti\b/i,
  /\bmeditazioni\b/i,
  /\baforismi\b/i,
];

const POETRY_CONTENT_PATTERNS = [
  /voce autentica/i,
  /\bsilenzio\b/i,
  /\bmargine\b/i,
  /\bcrepa\b/i,
  /domanda interiore/i,
  /\bverit[aà]\b/i,
  /\bidentit[aà]\b/i,
  /\bascolto\b/i,
  /io interiore/i,
  /testo introspettivo/i,
  /\bliric[ao]\b/i,
];

const EXPLICIT_ROMANCE_PATTERN =
  /dark romance|romance|relazione romantica|love interest|storia d['’]?amore|\bcoppia\b|\battrazione\b|\bdesiderio\b|\bbacio\b|rottura sentimentale|riconciliazione amorosa|slow burn|enemies to lovers/i;

const CONTENT_FAMILY_LABELS: Record<ContentFamily, string> = {
  FICTION: "Fiction",
  SELF_HELP: "Self Help",
  BUSINESS: "Business",
  MEMOIR: "Memoir",
  WORKBOOK: "Workbook",
  POETRY: "Poesia",
  COOKBOOK: "Cookbook",
};

function countPatternHits(patterns: RegExp[], text: string): number {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(0.99, Number(value.toFixed(2))));
}

function normalizeKnownBookFormat(value?: string): InferredBookFormat | "" {
  const normalized = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");

  if (normalized === "selfhelp") return "self_help";
  return normalized as InferredBookFormat | "";
}

function detectHits(patterns: RegExp[], text: string): number {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

export function detectContentFamily(title: string, idea = "", knownBookFormat?: string): ContentFamilyDetection {
  const hay = `${title} ${sanitizeUserConceptInput(idea)} ${knownBookFormat || ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, " ");

  const scores: Record<ContentFamily, number> = {
    FICTION: 0.22,
    SELF_HELP: 0,
    BUSINESS: 0,
    MEMOIR: 0,
    WORKBOOK: 0,
    POETRY: 0,
    COOKBOOK: 0,
  };

  if (/poetry_collection|poesia|poesie|raccolta poetic/.test(hay)) scores.POETRY += 0.92;
  if (/\ble\s+cose\s+che\s+non\s+ho\s+detto\b|\bnon\s+ho\s+detto\s+al\s+mare\b|\bmare\b.*\bsilenzio\b|\bversi\b/.test(hay)) {
    scores.POETRY += 0.76;
  }
  if (/cookbook|ricettario|ricette|cucina|menu|ingredienti/.test(hay)) scores.COOKBOOK += 0.9;
  if (/workbook|schede|esercizi guidati|tracker|attivita|attività/.test(hay)) scores.WORKBOOK += 0.86;
  if (/memoir|memorie|autobiograf|storia vera|racconto personale/.test(hay)) scores.MEMOIR += 0.82;
  if (/\bmio\s+padre\b|\bmia\s+madre\b|\bnon\s+mi\s+ha\s+mai\s+insegnat\w*\b|\bin\s+bicicletta\b|\binfanzia\s+raccontat\w*\b/.test(hay)) {
    scores.MEMOIR += 0.86;
  }
  if (/business|marketing|leadership|imprend|startup|vendite|fatturato|brand|azienda/.test(hay)) scores.BUSINESS += 0.84;
  if (/self[_\s-]?help|crescita\s+personale|personal\s+growth/.test(hay)) scores.SELF_HELP += 0.92;

  const selfHelpHits = detectHits([
    /\babitudin\w*\b/,
    /\bdisciplina\b/,
    /\bmotivazion\w*\b/,
    /\bprocrastinazion\w*\b/,
    /\bcrescita\s+personale\b/,
    /\bobiettiv\w*\b/,
    /\bmentalita\b/,
    /\bmentalità\b/,
    /\bsuccesso\b/,
    /\bproduttivit\w*\b/,
    /\bautostima\b/,
    /\brimand\w*\b/,
    /\bmetodo\b/,
    /\bmindset\b/,
    /\btrasformazion\w*\s+personale\b/,
  ], hay);

  scores.SELF_HELP += selfHelpHits * 0.18;
  if (/\bvita\s+che\s+rimandi\s+sempre\b/.test(hay)) scores.SELF_HELP += 0.62;
  if (/\b(?:la|il)\s+\w+\s+che\s+rimandi\b/.test(hay)) scores.SELF_HELP += 0.42;
  if (/\bguida\s+pratica|manuale\s+pratico|percorso\s+pratico\b/.test(hay)) scores.SELF_HELP += 0.28;

  const explicitFictionHits = detectHits([
    /\bromanzo\b/,
    /\bprotagonist\w*\b/,
    /\bantagonist\w*\b/,
    /\btrama\b/,
    /\bcast\b/,
    /\bthriller\b/,
    /\bhorror\b/,
    /\bromance\b/,
    /\bfantasy\b/,
    /\bmystery\b/,
    /\bindagine\b/,
    /\bomicid\w*\b/,
  ], hay);
  scores.FICTION += explicitFictionHits * 0.18;

  if (scores.SELF_HELP > 0.7) {
    scores.FICTION = Math.min(scores.FICTION, 0.25);
  }
  if (Math.max(scores.BUSINESS, scores.MEMOIR, scores.WORKBOOK, scores.POETRY, scores.COOKBOOK) > 0.7) {
    scores.FICTION = Math.min(scores.FICTION, 0.3);
  }

  const [family, confidence] = (Object.entries(scores) as Array<[ContentFamily, number]>)
    .sort((a, b) => b[1] - a[1])[0] || ["FICTION", 0.22];

  return {
    family,
    confidence: clampConfidence(confidence),
    label: CONTENT_FAMILY_LABELS[family],
  };
}

function inferPoeticBookFormat(text: string): InferredBookFormat | null {
  const formHits = countPatternHits(POETRY_FORM_PATTERNS, text);
  const contentHits = countPatternHits(POETRY_CONTENT_PATTERNS, text);
  const explicitNovelForm = /\bromanzo\b|novella|racconto|saga|trilogia|fantasy|thriller|horror/i.test(text);
  const poeticToneOnly = /\bpoetic[ao]\b/i.test(text) && formHits === 0 && contentHits < 2;

  if (poeticToneOnly) return null;
  if (explicitNovelForm && formHits === 0) return null;
  if (EXPLICIT_ROMANCE_PATTERN.test(text) && formHits === 0) return null;

  if (/raccolta poetic[ao]|\bpoesia\b|\bpoesie\b|\bframmenti\b|\baforismi\b/i.test(text)) {
    return "poetry_collection";
  }
  if (/saggio poetic[ao]|testo introspettivo|voce autentica/i.test(text) && (formHits > 0 || contentHits >= 2)) {
    return "poetic_essay";
  }
  if (/prosa poetic[ao]|prosa liric[ao]|\bliric[ao]\b/i.test(text) && (formHits > 0 || contentHits >= 2)) {
    return "lyrical_prose";
  }
  if (formHits > 0 && contentHits > 0) return "poetic_essay";
  if (contentHits >= 3 && /\bintrospettiv[ao]\b|\bpoetic[ao]\b|\bliric[ao]\b/i.test(text)) return "lyrical_prose";
  return null;
}

function bookFormatForBookType(bookTypeId: string): InferredBookFormat {
  if (bookTypeId === "poetry") return "poetry_collection";
  if (bookTypeId === "self-help") return "self_help";
  if (bookTypeId === "education") return "study_material";
  if (bookTypeId === "memoir") return "memoir";
  if (bookTypeId === "children") return "children_book";
  if (bookTypeId === "manual") return "manual";
  if (bookTypeId === "business") return "essay";
  return "novel";
}

function buildPoetryInference(format: InferredBookFormat, score: number): GenreInference {
  const meta = studioMeta("poetry");
  const label =
    format === "poetry_collection"
      ? "Raccolta poetica"
      : format === "lyrical_prose"
        ? "Prosa lirica"
        : "Saggio poetico";
  const subgenre =
    format === "poetry_collection"
      ? "raccolta poetica contemporanea"
      : format === "lyrical_prose"
        ? "prosa lirica introspettiva"
        : "saggio poetico esistenziale";

  return {
    bookFormat: format,
    label,
    bookTypeId: "poetry",
    genre: "poetry",
    category: meta.category,
    subcategory: "Poesia",
    subgenre,
    tone: "lirico, introspettivo, concreto, musicale",
    targetReader: "Lettori di poesia e prosa lirica che cercano voce autentica, immagini precise e risonanza interiore.",
    narrativePromise: "Una struttura per sezioni, frammenti e meditazioni che sviluppa un percorso emotivo senza forzare trama o archi sentimentali.",
    commercialGoal: "Identità poetica chiara, titolo evocativo e promessa letteraria riconoscibile senza schemi da romanzo commerciale.",
    level1: "poesia",
    confidence: score >= 4 ? "high" : "medium",
    suggestedChapters: 7,
  };
}

function buildFormatLockedInference(format: InferredBookFormat, title: string, idea: string): GenreInference | null {
  const combined = `${title} ${idea}`.trim();
  if (format === "cookbook") {
    return {
      bookFormat: "cookbook",
      label: "Cookbook",
      bookTypeId: "cookbook",
      genre: "cookbook",
      category: "Non-Fiction",
      subcategory: "Cookbook",
      subgenre: "ricettario pratico",
      tone: "chiaro, pratico, sensoriale",
      targetReader: "Lettori che cercano ricette replicabili con ingredienti e tecniche chiare.",
      narrativePromise: "Struttura in ingredienti, ricette, tecniche e menu senza derive narrative.",
      commercialGoal: "Ricettario operativo, leggibile e orientato all'esecuzione.",
      level1: "manuale",
      confidence: "high",
      suggestedChapters: 12,
    };
  }
  if (format === "workbook") {
    return {
      bookFormat: "workbook",
      label: "Workbook",
      bookTypeId: "manual",
      genre: "manual",
      category: "Non-Fiction",
      subcategory: "Workbook",
      subgenre: "schede operative",
      tone: "operativo, chiaro, guidato",
      targetReader: "Lettori che vogliono esercizi, tracker e progressione pratica.",
      narrativePromise: "Percorso pratico in schede, esercizi e verifiche senza archi narrativi fiction.",
      commercialGoal: "Workbook ad alta completabilità con risultati misurabili.",
      level1: "manuale",
      confidence: "high",
      suggestedChapters: 12,
    };
  }
  if (format === "study_material") {
    return {
      bookFormat: "study_material",
      label: "Materiale di studio",
      bookTypeId: "education",
      genre: "education",
      category: "Education",
      subcategory: "Study Material",
      subgenre: "moduli didattici",
      tone: "didattico, chiaro, progressivo",
      targetReader: "Studenti e professionisti in preparazione esami/certificazioni.",
      narrativePromise: "Moduli, esempi, quiz e verifica progressiva senza fallback filosofico.",
      commercialGoal: "Materiale formativo strutturato e verificabile.",
      level1: "educazione",
      confidence: "high",
      suggestedChapters: 14,
    };
  }
  if (format === "self_help") {
    const detected = detectContentFamily(title, idea, "self_help");
    return buildSelfHelpFamilyInference({
      family: "SELF_HELP",
      confidence: Math.max(detected.confidence, 0.92),
      label: CONTENT_FAMILY_LABELS.SELF_HELP,
    }, title, idea);
  }
  if (format === "poetry_collection") return buildPoetryInference("poetry_collection", 5);
  if (format === "memoir") {
    const meta = studioMeta("memoir");
    return withIdeaAwarePromise({
      bookFormat: "memoir",
      label: "Memoir",
      bookTypeId: "memoir",
      genre: "memoir",
      category: meta.category,
      subcategory: "Memoir",
      subgenre: "memoir riflessivo",
      tone: "intimo, riflessivo, concreto",
      targetReader: "Lettori memoir in cerca di verità personale e scena vissuta.",
      narrativePromise: "Percorso autobiografico con scene e riflessione, senza fallback generico fiction.",
      commercialGoal: "Memoir con voce personale e promessa chiara.",
      level1: "biografia",
      confidence: "high",
      suggestedChapters: 14,
    }, combined);
  }
  return null;
}

const SIGNALS: Signal[] = [
  {
    id: "horror",
    test: /horror|dark horror|folk horror|gotico|gothic|disturb|inquiet|paura|mostr|fantasm|occult|supernatural|paranormal(?!\s*romance)|casa sotto|madri del buio|sangue|abisso|notte|buio profondo|spavent/i,
    weight: 12,
    inference: {
      label: "Horror / Dark",
      bookTypeId: "horror",
      genre: "horror",
      category: "Fiction",
      subcategory: "Horror",
      subgenre: "dark horror / psychological horror",
      tone: "oscuro, claustrofobico, disturbante, cinematografico",
      targetReader: "Lettori horror adulti che cercano tensione, mistero e atmosfera inquietante.",
      narrativePromise: "Mistero disturbante con rivelazione progressiva e pressione emotiva crescente.",
      commercialGoal: "Posizionamento dark horror / gothic suspense su Amazon e BookTok horror.",
      level1: "romanzo",
      chapters: 28,
    },
  },
  {
    id: "dark-romance",
    test: /dark romance|romance dark|enemies to lovers|morally grey|ossessione|desiderio pericoloso/i,
    weight: 15,
    inference: {
      label: "Dark Romance",
      bookTypeId: "dark-romance",
      genre: "dark-romance",
      category: "Fiction",
      subcategory: "Romance",
      subgenre: "dark romance psicologico",
      tone: "oscuro, sensuale, trattenuto, cinematografico",
      targetReader: "Lettrici romance adulte che amano tensione, ambiguità morale e slow burn.",
      narrativePromise: "Attrazione pericolosa, vulnerabilità progressiva e conseguenze emotive.",
      commercialGoal: "Alta tensione emotiva e posizionamento BookTok dark romance.",
      level1: "romanzo",
      chapters: 24,
    },
  },
  {
    id: "supernatural-thriller",
    test: /thriller\s+soprannatural|soprannatural\w*\s+thriller|\b\d{1,2}:\d{2}\b.*\b(morte|visioni?|futuro|ricordi|paese|insegnante)\b|\bthriller\b.*\b(visioni?|ricordi\s+dal\s+futuro|morte\s+predett)/i,
    weight: 14,
    inference: {
      label: "Thriller soprannaturale",
      bookTypeId: "thriller",
      genre: "thriller",
      category: "Fiction",
      subcategory: "Thriller",
      subgenre: "supernatural psychological thriller",
      tone: "misterioso, inquietante, claustrofobico, cinematografico",
      targetReader: "Lettori thriller che cercano mistero temporale, visioni e tensione crescente in un contesto chiuso.",
      narrativePromise: "Visioni dal futuro, morte annunciata e verità sepolte che collassano il tempo fino a una scelta irreversibile.",
      commercialGoal: "Hook temporale forte, escalation di visioni e payoff thriller su KDP.",
      level1: "romanzo",
      chapters: 26,
    },
  },
  {
    id: "thriller",
    test: /thriller|noir|mistero|indagine|omicid|serial killer|sospett|crime|giallo/i,
    weight: 10,
    inference: {
      label: "Thriller",
      bookTypeId: "thriller",
      genre: "thriller",
      category: "Fiction",
      subcategory: "Thriller",
      subgenre: "psychological thriller",
      tone: "teso, serrato, sospeso, cinematografico",
      targetReader: "Lettori thriller che amano ritmo, indizi e capitoli a gancio.",
      narrativePromise: "Pericolo crescente, segreti e inversioni fino alla rivelazione finale.",
      commercialGoal: "Retention alta e hook per ogni capitolo su KDP thriller.",
      level1: "romanzo",
      chapters: 26,
    },
  },
  {
    id: "fantasy",
    test: /fantasy|fantasia|magia|regno|elf|drago|portal|epic fantasy|mondo immagin|high concept|porta\s+nel\s+cuore|memoria ancestrale|fine del mondo|apocaliss|mille anni|custod/i,
    weight: 10,
    inference: {
      label: "Fantasy",
      bookTypeId: "fantasy",
      genre: "fantasy",
      category: "Fiction",
      subcategory: "Fantasy",
      subgenre: "epic fantasy",
      tone: "mitico, immersivo, sensoriale, cinematografico",
      targetReader: "Lettori fantasy adulti che cercano worldbuilding e personaggi credibili.",
      narrativePromise: "Viaggio in un mondo con regole, costo e scelta impossibile.",
      commercialGoal: "Fantasy immersivo con promessa forte e cover direction epica.",
      level1: "romanzo",
      chapters: 30,
    },
  },
  {
    id: "romance",
    test: /romance|slow burn|love story|storia d'amore|relazione|amore proibito|desiderio|forced proximity|enemies to lovers/i,
    weight: 8,
    inference: {
      label: "Romance",
      bookTypeId: "romance",
      genre: "romance",
      category: "Fiction",
      subcategory: "Romance",
      subgenre: "contemporary romance",
      tone: "intimo, emotivo, cinematografico, slow burn",
      targetReader: "Lettrici romance che cercano chimica, vulnerabilità e payoff emotivo.",
      narrativePromise: "Due persone che si avvicinano nonostante ostacoli credibili.",
      commercialGoal: "Romance commerciale con hook emotivo e sottotitolo memorabile.",
      level1: "romanzo",
      chapters: 22,
    },
  },
  {
    id: "self-help",
    test: /self.?help|crescita personal|mindset|produttiv|abitudin|disciplina|motivaz|benessere|ansia|overthinking|ritrovare sé|tornare a sé|guida pratica|trasformaz/i,
    weight: 11,
    inference: {
      label: "Self-help",
      bookTypeId: "self-help",
      genre: "self-help",
      category: "Non-Fiction",
      subcategory: "Mindset",
      subgenre: "crescita personale pratica",
      tone: "chiaro, autorevole, caldo, pratico",
      targetReader: "Persone che cercano strumenti concreti, esempi semplici e trasformazione realistica.",
      narrativePromise: "Dal caos mentale a una pratica quotidiana sostenibile.",
      commercialGoal: "Promessa chiara, capitoli pratici e posizionamento Amazon self-help.",
      level1: "self-help",
      chapters: 12,
    },
  },
  {
    id: "business",
    test: /business|marketing|leadership|imprend|startup|vendite|brand/i,
    weight: 9,
    inference: {
      label: "Business",
      bookTypeId: "business",
      genre: "business",
      category: "Non-Fiction",
      subcategory: "Business",
      subgenre: "business strategy",
      tone: "autorevole, diretto, orientato al risultato",
      targetReader: "Professionisti e imprenditori che cercano metodo e casi pratici.",
      narrativePromise: "Framework applicabile per decisioni e crescita commerciale.",
      commercialGoal: "Autorità, promessa netta e posizionamento business su KDP.",
      level1: "business",
      chapters: 14,
    },
  },
  {
    id: "education",
    test: /scuol|universit|didatt|dispens|esercizi|manuale di studio|studiare|esame/i,
    weight: 9,
    inference: {
      label: "Educazione / Studio",
      bookTypeId: "education",
      genre: "education",
      category: "Non-Fiction",
      subcategory: "Education",
      subgenre: "studio e didattica",
      tone: "chiaro, didattico, progressivo",
      targetReader: "Studenti e docenti che cercano struttura, esempi e ritenzione.",
      narrativePromise: "Percorso progressivo con concetti chiari e applicazione immediata.",
      commercialGoal: "Manuale didattico con struttura modulare e titoli capitolo espliciti.",
      level1: "educazione",
      chapters: 16,
    },
  },
];

const GENERIC_SELF_HELP_TITLES = /^(il viaggio interiore|rinascere|la forza dentro di te|torna a te|ritrova te stesso|il potere di)$/i;

function withIdeaAwarePromise(inference: GenreInference, idea: string): GenreInference {
  return {
    ...inference,
    narrativePromise: resolveNarrativePromise(idea, inference.genre, inference.narrativePromise),
  };
}

function withContentFamily(inference: GenreInference, family: ContentFamilyDetection): GenreInference {
  return {
    ...inference,
    family: family.family,
    familyConfidence: family.confidence,
    familyLabel: family.label,
  };
}

function buildSelfHelpFamilyInference(
  family: ContentFamilyDetection,
  title: string,
  idea: string,
): GenreInference {
  const meta = studioMeta("self-help");
  const hay = `${title} ${idea}`.toLowerCase();
  const procrastination = /\b(procrastinazion\w*|rimand\w*)\b/i.test(hay);
  return withContentFamily(withIdeaAwarePromise({
    bookFormat: "self_help",
    label: "Self Help",
    bookTypeId: "self-help",
    genre: "self-help",
    category: meta.category || "Non-Fiction",
    subcategory: "Self Help",
    subgenre: procrastination ? "procrastinazione / crescita personale" : "crescita personale pratica",
    tone: "chiaro, pratico, motivante, concreto",
    targetReader: "Persone che vogliono smettere di rimandare, costruire abitudini sostenibili e trasformare obiettivi in azioni quotidiane.",
    narrativePromise: "Un percorso pratico per riconoscere il rinvio, ricostruire disciplina e trasformare la crescita personale in passi concreti.",
    commercialGoal: "Posizionamento self-help chiaro: promessa pratica, problema specifico e trasformazione misurabile.",
    level1: "self-help",
    confidence: family.confidence >= 0.82 ? "high" : "medium",
    suggestedChapters: 12,
  }, idea), family);
}

function buildBusinessFamilyInference(
  family: ContentFamilyDetection,
  title: string,
  idea: string,
): GenreInference {
  const meta = studioMeta("business");
  return withContentFamily(withIdeaAwarePromise({
    bookFormat: "essay",
    label: "Business",
    bookTypeId: "business",
    genre: "business",
    category: meta.category || "Non-Fiction",
    subcategory: "Business",
    subgenre: "business strategy",
    tone: "autorevole, diretto, pratico, orientato ai risultati",
    targetReader: "Professionisti, imprenditori e team che cercano modelli applicabili, casi e metriche.",
    narrativePromise: "Un percorso business fondato su metodo, strategia, casi e applicazione misurabile.",
    commercialGoal: "Posizionamento business chiaro: promessa utile, framework riconoscibile e outcome concreto.",
    level1: "business",
    confidence: family.confidence >= 0.82 ? "high" : "medium",
    suggestedChapters: 14,
  }, `${title} ${idea}`), family);
}

export function inferGenreFromText(title: string, idea = "", knownBookFormat?: string): GenreInference {
  const known = normalizeKnownBookFormat(knownBookFormat);
  const sanitizedIdea = sanitizeUserConceptInput(idea);
  const contentFamily = detectContentFamily(title, sanitizedIdea, known);
  if (known) {
    const locked = buildFormatLockedInference(known, title, sanitizedIdea);
    if (locked) return withContentFamily(locked, contentFamily);
  }
  const hay = `${title} ${sanitizedIdea}`.toLowerCase();
  if (contentFamily.family === "SELF_HELP" && contentFamily.confidence > 0.7) {
    return buildSelfHelpFamilyInference(contentFamily, title, sanitizedIdea);
  }
  if (contentFamily.confidence > 0.7) {
    if (contentFamily.family === "COOKBOOK") {
      const locked = buildFormatLockedInference("cookbook", title, sanitizedIdea);
      if (locked) return withContentFamily(locked, contentFamily);
    }
    if (contentFamily.family === "WORKBOOK") {
      const locked = buildFormatLockedInference("workbook", title, sanitizedIdea);
      if (locked) return withContentFamily(locked, contentFamily);
    }
    if (contentFamily.family === "MEMOIR") {
      const locked = buildFormatLockedInference("memoir", title, sanitizedIdea);
      if (locked) return withContentFamily(locked, contentFamily);
    }
    if (contentFamily.family === "POETRY") {
      return withContentFamily(buildPoetryInference("poetry_collection", 5), contentFamily);
    }
    if (contentFamily.family === "BUSINESS") {
      return buildBusinessFamilyInference(contentFamily, title, sanitizedIdea);
    }
  }
  const poetryFormat = inferPoeticBookFormat(hay);
  if (poetryFormat) {
    const poetryScore = countPatternHits(POETRY_FORM_PATTERNS, hay) * 2 + countPatternHits(POETRY_CONTENT_PATTERNS, hay);
    return withContentFamily(buildPoetryInference(poetryFormat, poetryScore), contentFamily);
  }

  let best: { score: number; signal: Signal } | null = null;

  for (const signal of SIGNALS) {
    if (!signal.test.test(hay)) continue;
    if (signal.id === "fantasy" && hasSupernaturalThrillerSignals(hay) && !hasHighConceptFantasySignals(hay)) continue;
    if (signal.id === "supernatural-thriller" && /horror|gotico|gothic|stazione\s+ferroviaria/i.test(hay) && !/\bthriller\b/.test(hay)) continue;
    const score = signal.weight + (hay.length > 40 ? 2 : 0);
    if (!best || score > best.score) best = { score, signal };
  }

  if (best) {
    const meta = studioMeta(best.signal.inference.bookTypeId);
    return withContentFamily(withIdeaAwarePromise({
      ...best.signal.inference,
      bookFormat: best.signal.inference.bookFormat || bookFormatForBookType(best.signal.inference.bookTypeId),
      category: meta.category,
      subcategory: best.signal.inference.subcategory || meta.defaultSubcategory,
      level1: resolveLevel1FromBookTypeId(best.signal.inference.bookTypeId),
      confidence: best.score >= 11 ? "high" : "medium",
      suggestedChapters: best.signal.inference.chapters,
    }, sanitizedIdea), contentFamily);
  }

  const looksFictionTitle = /la |le |il |lo |una |un |casa|notte|sangue|ombra|madre|anima|morte|segreto/i.test(title)
    && !/guida|manuale|metodo|abitudin|disciplina/i.test(hay);

  if (hasSupernaturalThrillerSignals(hay) && !hasHighConceptFantasySignals(hay)) {
    const thrillerSignal = SIGNALS.find((signal) => signal.id === "supernatural-thriller")
      ?? SIGNALS.find((signal) => signal.id === "thriller");
    if (thrillerSignal) {
      const meta = studioMeta(thrillerSignal.inference.bookTypeId);
      return withContentFamily(withIdeaAwarePromise({
        ...thrillerSignal.inference,
        bookFormat: thrillerSignal.inference.bookFormat || bookFormatForBookType(thrillerSignal.inference.bookTypeId),
        category: meta.category,
        subcategory: thrillerSignal.inference.subcategory || meta.defaultSubcategory,
        level1: resolveLevel1FromBookTypeId(thrillerSignal.inference.bookTypeId),
        confidence: "high",
        suggestedChapters: thrillerSignal.inference.chapters,
      }, sanitizedIdea), contentFamily);
    }
  }

  if (hasHighConceptFantasySignals(hay)) {
    const fantasySignal = SIGNALS.find((signal) => signal.id === "fantasy");
    if (fantasySignal) {
      const meta = studioMeta(fantasySignal.inference.bookTypeId);
      return withContentFamily(withIdeaAwarePromise({
        ...fantasySignal.inference,
        bookFormat: fantasySignal.inference.bookFormat || bookFormatForBookType(fantasySignal.inference.bookTypeId),
        category: meta.category,
        subcategory: fantasySignal.inference.subcategory || meta.defaultSubcategory,
        level1: resolveLevel1FromBookTypeId(fantasySignal.inference.bookTypeId),
        confidence: "high",
        suggestedChapters: fantasySignal.inference.chapters,
      }, sanitizedIdea), contentFamily);
    }
  }

  if (looksFictionTitle || GENERIC_SELF_HELP_TITLES.test(title.trim())) {
    const meta = studioMeta("literary");
    return withContentFamily(withIdeaAwarePromise({
      bookFormat: "novel",
      label: "Narrativa letteraria",
      bookTypeId: "literary",
      genre: "philosophy",
      category: meta.category,
      subcategory: "Literary",
      subgenre: "romanzo contemporaneo",
      tone: "cinematografico, emotivo, concreto",
      targetReader: "Lettori di narrativa che cercano atmosfera, personaggi e tensione credibile.",
      narrativePromise: "Una storia che resta addosso con rivelazioni progressive.",
      commercialGoal: "Romanzo commerciale con titolo memorabile e promessa chiara.",
      level1: "romanzo",
      confidence: "low",
      suggestedChapters: 24,
    }, sanitizedIdea), contentFamily);
  }

  const meta = studioMeta("literary");
  return withContentFamily(withIdeaAwarePromise({
    bookFormat: "novel",
    label: "Romanzo (default narrativo)",
    bookTypeId: "literary",
    genre: "philosophy",
    category: meta.category,
    subcategory: "Literary",
    subgenre: "romanzo contemporaneo",
    tone: "editoriale, chiaro, coinvolgente",
    targetReader: "Lettori di narrativa contemporanea.",
    narrativePromise: "Storia con personaggi credibili e progressione emotiva.",
    commercialGoal: "Romanzo commerciale su Amazon.",
    level1: "romanzo",
    confidence: "low",
    suggestedChapters: 20,
  }, sanitizedIdea), contentFamily);
}

export { computeTitleCategoryCoherence, isConfigIncoherentWithInference } from "./title-category-coherence";
export type { TitleCategoryCoherenceInput, TitleCategoryCoherenceLevel, TitleCategoryCoherenceResult } from "./title-category-coherence";

export function getGuidedGenreAlternatives(inference: GenreInference): GenreInference[] {
  const alts: GenreInference[] = [inference];
  if (inference.bookTypeId === "horror") {
    alts.push({ ...inferGenreFromText("thriller psicologico gotico", ""), confidence: "medium" });
    alts.push({ ...inferGenreFromText("dark romance", ""), confidence: "low" });
  }
  if (inference.bookTypeId === "self-help") {
    alts.push({ ...inferGenreFromText("produttività abitudini", ""), confidence: "medium" });
  }
  return alts.slice(0, 3);
}

/** Fill missing genre fields from title/idea — never defaults to Self-help for fiction. */
export function fillMissingGenreFromInference(
  config: {
    title?: string;
    idea?: string;
    category?: string;
    subcategory?: string;
    genre?: Genre;
    bookTypeId?: string;
    subgenre?: string;
    tone?: string;
    bookFormat?: string;
  },
): void {
  if (config.category && config.subcategory && config.genre) return;
  const inf = inferGenreFromText(config.title || "", config.idea || "", config.bookFormat);
  if (!config.category) config.category = inf.category;
  if (!config.subcategory) config.subcategory = inf.subcategory;
  if (!config.genre) config.genre = inf.genre;
  if (!config.bookTypeId) config.bookTypeId = inf.bookTypeId;
  if (!config.subgenre) config.subgenre = inf.subgenre;
  if (!config.tone) config.tone = inf.tone;
}
