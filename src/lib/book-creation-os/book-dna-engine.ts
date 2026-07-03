import {
  detectContentFamily,
  inferGenreFromText,
  type ContentFamily,
  type ContentFamilyDetection,
  type GenreInference,
} from "./genre-inference";

export type BookDnaInput = {
  title?: string;
  subtitle?: string;
  idea?: string;
  genre?: string;
  subgenre?: string;
  bookTypeId?: string;
  bookFormat?: string;
  targetReader?: string;
  promise?: string;
};

export type BookDnaElement = {
  key: string;
  label: string;
  present: boolean;
  source: "manual" | "inferred" | "missing";
  evidence?: string;
};

export type BookFamilyProfile = {
  family: ContentFamily;
  label: string;
  visibleFields: string[];
  hiddenFields: string[];
  wizardSteps: string[];
  blueprintStages: string[];
};

export type BookDna = {
  family: ContentFamily;
  familyLabel: string;
  familyConfidence: number;
  detectedLabel: string;
  genre: string;
  subgenre: string;
  bookFormat: string;
  inference: GenreInference;
  elements: BookDnaElement[];
  presentFields: string[];
  missingFields: string[];
  visibleFields: string[];
  hiddenFields: string[];
  wizardSteps: string[];
  blueprintStages: string[];
  shouldAskGenre: boolean;
  shouldSkipTitleGeneration: boolean;
  shouldSkipSubtitleGeneration: boolean;
};

const FAMILY_PROFILES: Record<ContentFamily, BookFamilyProfile> = {
  FICTION: {
    family: "FICTION",
    label: "Fiction",
    visibleFields: [
      "title",
      "subtitle",
      "genre",
      "audience",
      "promise",
      "protagonist",
      "antagonist",
      "cast",
      "setting",
      "conflict",
      "theme",
      "pov",
      "worldbuilding",
      "narrativeStructure",
    ],
    hiddenFields: [
      "readerProblem",
      "method",
      "framework",
      "exercises",
      "caseStudies",
      "callToAction",
      "recipeCount",
      "worksheets",
      "tracker",
    ],
    wizardSteps: [
      "Fondamenta narrative",
      "Concept e hook",
      "Cast",
      "Mondo e conflitto",
      "Struttura narrativa",
      "Blueprint",
    ],
    blueprintStages: [
      "Premessa",
      "Personaggi",
      "Conflitto centrale",
      "Progressione atti",
      "Payoff",
      "Indice capitoli",
    ],
  },
  SELF_HELP: {
    family: "SELF_HELP",
    label: "Self Help",
    visibleFields: [
      "title",
      "subtitle",
      "genre",
      "audience",
      "readerProblem",
      "transformation",
      "promise",
      "method",
      "framework",
      "exercises",
      "caseStudies",
      "callToAction",
    ],
    hiddenFields: [
      "protagonist",
      "antagonist",
      "cast",
      "worldbuilding",
      "pov",
      "narrativeArc",
    ],
    wizardSteps: [
      "Problema lettore",
      "Promessa di trasformazione",
      "Metodo",
      "Framework",
      "Esercizi",
      "Casi studio",
      "CTA",
    ],
    blueprintStages: [
      "Diagnosi problema",
      "Metodo",
      "Pilastri",
      "Esercizi",
      "Applicazione",
      "Trasformazione finale",
    ],
  },
  BUSINESS: {
    family: "BUSINESS",
    label: "Business",
    visibleFields: [
      "title",
      "subtitle",
      "genre",
      "audience",
      "niche",
      "model",
      "strategy",
      "caseStudies",
      "implementation",
      "metrics",
      "promise",
    ],
    hiddenFields: ["protagonist", "antagonist", "cast", "worldbuilding", "pov", "narrativeArc"],
    wizardSteps: ["Niche", "Modello", "Strategia", "Casi studio", "Implementazione", "Metriche"],
    blueprintStages: ["Problema di mercato", "Framework", "Strategia", "Casi", "Piano operativo", "Metriche"],
  },
  MEMOIR: {
    family: "MEMOIR",
    label: "Memoir",
    visibleFields: [
      "title",
      "subtitle",
      "genre",
      "audience",
      "lifePeriod",
      "keyEvents",
      "personalTransformation",
      "lessons",
      "theme",
      "promise",
    ],
    hiddenFields: ["magicSystem", "fantasyAntagonist", "worldbuilding", "povTechnical", "questStructure"],
    wizardSteps: ["Periodo di vita", "Eventi chiave", "Trasformazione personale", "Lezioni", "Voce"],
    blueprintStages: ["Arco di vita", "Scene reali", "Snodi emotivi", "Riflessione", "Lezioni", "Chiusura"],
  },
  WORKBOOK: {
    family: "WORKBOOK",
    label: "Workbook",
    visibleFields: [
      "title",
      "subtitle",
      "genre",
      "audience",
      "objective",
      "exercises",
      "challenge",
      "tracker",
      "worksheets",
      "promise",
    ],
    hiddenFields: ["protagonist", "antagonist", "cast", "pov", "worldbuilding", "plot"],
    wizardSteps: ["Obiettivo", "Esercizi", "Sfide", "Tracker", "Schede"],
    blueprintStages: ["Obiettivo", "Moduli", "Schede", "Esercizi", "Tracker", "Verifica"],
  },
  POETRY: {
    family: "POETRY",
    label: "Poesia",
    visibleFields: [
      "title",
      "subtitle",
      "genre",
      "audience",
      "collectionTheme",
      "poeticStyle",
      "tone",
      "structure",
      "symbolicField",
      "recurringImages",
      "promise",
    ],
    hiddenFields: ["plot", "protagonist", "antagonist", "cast", "conflict", "pov", "worldbuilding"],
    wizardSteps: ["Tema raccolta", "Voce poetica", "Campo simbolico", "Struttura", "Promessa poetica"],
    blueprintStages: ["Tema centrale", "Immagini", "Sezioni", "Arco emotivo", "Ritmo", "Sequenza poesie"],
  },
  COOKBOOK: {
    family: "COOKBOOK",
    label: "Cookbook",
    visibleFields: [
      "title",
      "subtitle",
      "genre",
      "audience",
      "cuisineType",
      "difficulty",
      "recipeCount",
      "recipeCategories",
      "nutrition",
      "promise",
    ],
    hiddenFields: ["protagonist", "antagonist", "cast", "plot", "conflict", "pov", "worldbuilding"],
    wizardSteps: ["Tipo cucina", "Difficolta", "Numero ricette", "Categorie", "Nutrizione"],
    blueprintStages: ["Identita cucina", "Tecniche base", "Categorie ricette", "Menu", "Consigli", "Indice ricette"],
  },
};

const FIELD_LABELS: Record<string, string> = {
  antagonist: "Antagonista",
  audience: "Pubblico",
  callToAction: "Call to action",
  caseStudies: "Casi studio",
  cast: "Cast",
  collectionTheme: "Tema raccolta",
  conflict: "Conflitto",
  cuisineType: "Tipo cucina",
  difficulty: "Difficolta",
  exercises: "Esercizi",
  framework: "Framework",
  genre: "Genere",
  keyEvents: "Eventi chiave",
  lifePeriod: "Periodo di vita",
  method: "Metodo",
  metrics: "Metriche",
  model: "Modello",
  niche: "Niche",
  nutrition: "Nutrizione",
  objective: "Obiettivo",
  personalTransformation: "Trasformazione personale",
  poeticStyle: "Stile poetico",
  promise: "Promessa",
  protagonist: "Protagonista",
  readerProblem: "Problema lettore",
  recipeCategories: "Categorie ricette",
  recipeCount: "Numero ricette",
  recurringImages: "Immagini ricorrenti",
  setting: "Ambientazione",
  strategy: "Strategia",
  structure: "Struttura",
  symbolicField: "Campo simbolico",
  theme: "Tema",
  title: "Titolo",
  tone: "Tono",
  transformation: "Trasformazione",
  worksheets: "Schede",
  worldbuilding: "Worldbuilding",
};

function clean(value: unknown): string {
  return String(value || "").trim();
}

function hasText(value: unknown, min = 2): boolean {
  return clean(value).length >= min;
}

function haystack(input: BookDnaInput): string {
  return `${input.title || ""} ${input.subtitle || ""} ${input.idea || ""} ${input.genre || ""} ${input.subgenre || ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, " ");
}

function familyFromExplicitInput(input: BookDnaInput): ContentFamily | null {
  const explicit = `${input.bookFormat || ""} ${input.bookTypeId || ""} ${input.genre || ""}`.toLowerCase();
  if (/poetry|poesia/.test(explicit)) return "POETRY";
  if (/cookbook|ricettario|cucina/.test(explicit)) return "COOKBOOK";
  if (/workbook/.test(explicit)) return "WORKBOOK";
  if (/memoir|biografia|autobiograf/.test(explicit)) return "MEMOIR";
  if (/self[-_\s]?help|crescita personale/.test(explicit)) return "SELF_HELP";
  if (/business|marketing|leadership|startup|azienda/.test(explicit)) return "BUSINESS";
  if (/novel|romanzo|fiction|fantasy|thriller|horror|romance|literary/.test(explicit)) return "FICTION";
  return null;
}

function resolveFamily(
  input: BookDnaInput,
  detection: ContentFamilyDetection,
  inference: GenreInference,
): ContentFamily {
  const explicit = familyFromExplicitInput(input);
  if (explicit) return explicit;
  if (detection.confidence >= 0.7) return detection.family;
  if (inference.family && (inference.familyConfidence || 0) >= 0.7) return inference.family;
  return "FICTION";
}

function canonicalGenreFor(family: ContentFamily, inference: GenreInference): string {
  if (family === "SELF_HELP") return "self_help";
  if (family === "COOKBOOK") return "cookbook";
  if (family === "WORKBOOK") return "workbook";
  if (family === "POETRY") return "poetry";
  if (family === "MEMOIR") return "memoir";
  if (family === "BUSINESS") return "business";
  return inference.bookTypeId || "literary";
}

function detectField(input: BookDnaInput, key: string, inference: GenreInference): BookDnaElement {
  const hay = haystack(input);
  const manualEvidence: Record<string, string | undefined> = {
    title: clean(input.title),
    subtitle: clean(input.subtitle),
    genre: clean(input.genre || input.bookTypeId),
    audience: clean(input.targetReader),
    promise: clean(input.promise || input.subtitle),
  };
  const inferredEvidence: Record<string, string | undefined> = {
    genre: inference.label,
    audience: inference.targetReader,
    promise: inference.narrativePromise,
  };
  const patternEvidence: Record<string, RegExp> = {
    readerProblem: /\b(problema|dolore|blocco|procrastinazion|rimand)\w*\b/,
    transformation: /\b(trasformazion|cambiare|migliorare|crescita|rinascita)\w*\b/,
    method: /\b(metodo|sistema|pratica|protocollo|framework)\w*\b/,
    framework: /\b(framework|pilastri|modello|sistema)\w*\b/,
    exercises: /\b(esercizi|attivita|schede|workbook)\w*\b/,
    caseStudies: /\b(casi studio|case study|esempi reali|storie vere)\b/,
    callToAction: /\b(call to action|prossimo passo|azione)\b/,
    cuisineType: /\b(cucina|sicilian|siciliana|ricette|ricettario)\b/,
    difficulty: /\b(facile|intermedio|avanzato|difficolta)\b/,
    recipeCount: /\b\d+\s+ricette\b/,
    recipeCategories: /\b(antipasti|primi|secondi|dolci|menu|categorie)\b/,
    nutrition: /\b(nutrizion|calorie|macro|dieta|ingredienti)\w*\b/,
    collectionTheme: /\b(tema|mare|memoria|silenzio|identita|perdita|voce)\b/,
    poeticStyle: /\b(poet|liric|versi|frammenti|contemporanea)\w*\b/,
    symbolicField: /\b(simbol|mare|acqua|nebbia|luce|mappe|ombra)\w*\b/,
    recurringImages: /\b(immagini|mare|acqua|nebbia|luce|mappe|case)\b/,
    lifePeriod: /\b(infanzia|padre|madre|famiglia|adolescenza|anni)\b/,
    keyEvents: /\b(eventi|perdita|separazione|bicicletta|insegnato|ricordo)\w*\b/,
    personalTransformation: /\b(trasformazion|imparare|capire|perdonare|crescere)\w*\b/,
    lessons: /\b(lezion|insegnat|capito|imparato)\w*\b/,
    protagonist: /\b(protagonist|eroe|eroina)\w*\b/,
    antagonist: /\b(antagonist|villain|nemico)\w*\b/,
    cast: /\b(cast|personaggi|alleato|mentore)\w*\b/,
    setting: /\b(ambientazion|mondo|citta|regno|paese|luogo)\w*\b/,
    conflict: /\b(conflitto|ostacolo|minaccia|scelta impossibile)\w*\b/,
    pov: /\b(pov|prima persona|terza persona)\b/,
    worldbuilding: /\b(worldbuilding|mondo|magia|regno|lore)\b/,
    narrativeStructure: /\b(tre atti|struttura narrativa|arco narrativo|trama)\b/,
  };

  const manual = manualEvidence[key];
  if (hasText(manual)) {
    return { key, label: FIELD_LABELS[key] || key, present: true, source: "manual", evidence: manual };
  }
  const inferred = inferredEvidence[key];
  if (hasText(inferred, key === "genre" ? 2 : 12)) {
    return { key, label: FIELD_LABELS[key] || key, present: true, source: "inferred", evidence: inferred };
  }
  const pattern = patternEvidence[key];
  if (pattern?.test(hay)) {
    return { key, label: FIELD_LABELS[key] || key, present: true, source: "inferred" };
  }
  return { key, label: FIELD_LABELS[key] || key, present: false, source: "missing" };
}

export function getBookFamilyProfile(family: ContentFamily): BookFamilyProfile {
  return FAMILY_PROFILES[family];
}

export function buildBookDna(input: BookDnaInput): BookDna {
  const detection = detectContentFamily(input.title || "", input.idea || "", input.bookFormat);
  const inference = inferGenreFromText(input.title || "", input.idea || "", input.bookFormat);
  const family = resolveFamily(input, detection, inference);
  const profile = getBookFamilyProfile(family);
  const elements = profile.visibleFields.map((field) => detectField(input, field, inference));
  const presentFields = elements.filter((element) => element.present).map((element) => element.key);
  const missingFields = elements.filter((element) => !element.present).map((element) => element.key);
  const titlePresent = hasText(input.title, 3);
  const subtitlePresent = hasText(input.subtitle, 8);

  return {
    family,
    familyLabel: profile.label,
    familyConfidence: familyFromExplicitInput(input) ? 0.99 : detection.confidence,
    detectedLabel: `Ho rilevato: ${profile.label}`,
    genre: canonicalGenreFor(family, inference),
    subgenre: clean(input.subgenre) || inference.subgenre,
    bookFormat: clean(input.bookFormat) || inference.bookFormat,
    inference,
    elements,
    presentFields,
    missingFields,
    visibleFields: profile.visibleFields,
    hiddenFields: profile.hiddenFields,
    wizardSteps: profile.wizardSteps,
    blueprintStages: profile.blueprintStages,
    shouldAskGenre: !presentFields.includes("genre"),
    shouldSkipTitleGeneration: titlePresent,
    shouldSkipSubtitleGeneration: subtitlePresent,
  };
}
