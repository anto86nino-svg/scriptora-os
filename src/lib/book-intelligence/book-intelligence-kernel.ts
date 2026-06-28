import type { BookBlueprint, BookConfig, Genre } from "@/types/book";
import { validateFormatPurity } from "../../../supabase/functions/_shared/format-purity-engine.ts";

export type BookFormat =
  | "novel"
  | "novella"
  | "short_story_collection"
  | "poetry_collection"
  | "essay"
  | "manual"
  | "self_help"
  | "psychology_guide"
  | "business_book"
  | "memoir"
  | "biography"
  | "autobiography"
  | "academic_book"
  | "academic_summary"
  | "children_book"
  | "picture_book"
  | "cookbook"
  | "workbook"
  | "study_material"
  | "spiritual_book"
  | "devotional"
  | "journal"
  | "travel_guide"
  | "historical_analysis"
  | "research_book"
  | "hybrid_book"
  | "mixed_or_unknown";

export type ContentMode =
  | "narrative"
  | "educational"
  | "practical"
  | "transformational"
  | "reflective"
  | "poetic"
  | "academic"
  | "instructional"
  | "reference"
  | "hybrid";

export type UniversalStructureMode =
  | "chapters"
  | "lessons"
  | "modules"
  | "poems"
  | "exercises"
  | "stories"
  | "entries"
  | "reflections"
  | "days"
  | "sessions"
  | "frameworks";

export type StructureModel =
  | "narrative_chapters"
  | "compact_narrative_chapters"
  | "short_story_units"
  | "poetry_sections"
  | "practical_chapters"
  | "study_modules"
  | "essay_arguments"
  | "workbook_sheets"
  | "memoir_arc"
  | "biographical_timeline"
  | "recipe_sections"
  | "academic_chapters"
  | "picture_book_spreads"
  | "travel_sections"
  | "research_sections"
  | "devotional_entries"
  | "journal_prompts"
  | "mixed_structure";

export type BlueprintType =
  | "NarrativeBlueprint"
  | "PoetryBlueprint"
  | "GuideBlueprint"
  | "StudyBlueprint"
  | "EssayBlueprint"
  | "WorkbookBlueprint"
  | "MemoirBlueprint"
  | "BiographyBlueprint"
  | "BusinessBlueprint"
  | "AcademicBlueprint"
  | "CookbookBlueprint"
  | "DevotionalBlueprint"
  | "PictureBookBlueprint"
  | "TravelGuideBlueprint"
  | "ResearchBlueprint"
  | "HybridBlueprint";

export type GenerationStrategy =
  | "generateNovel"
  | "generateNovella"
  | "generateShortStoryCollection"
  | "generatePoetryCollection"
  | "generateManual"
  | "generateSelfHelpGuide"
  | "generatePsychologyGuide"
  | "generateBusinessBook"
  | "generateEssay"
  | "generateWorkbook"
  | "generateStudyMaterial"
  | "generateAcademicBook"
  | "generateMemoir"
  | "generateBiography"
  | "generateChildrenBook"
  | "generatePictureBook"
  | "generateCookbook"
  | "generateSpiritualBook"
  | "generateTravelGuide"
  | "generateHistoricalAnalysis"
  | "generateResearchBook"
  | "generateHybridBook";

export interface FormatPublishingStandards {
  idealStructure: string[];
  idealLength: string;
  idealChapterRange: [number, number];
  readerExpectations: string[];
  commercialStandards: string[];
  amazonStandards: string[];
  errorsToAvoid: string[];
}

export interface FormatBestsellerIntelligence {
  primaryMetrics: string[];
  scoringFocus: string;
  readerRetentionDriver: string;
}

export interface FormatQualityGate {
  mustHave: string[];
  rejectIf: string[];
  checks: string[];
}

export interface FormatCommercialIntelligence {
  target: string;
  positioning: string;
  differentiation: string;
  amazonCategory: string;
  keywords: string[];
  marketRisk: string;
  commercialStrength: string;
}

export interface FormatExportIntelligence {
  layoutProfile: string;
  frontMatter: string[];
  backMatter: string[];
  formattingRules: string[];
}

export interface BookIntelligenceKernelSnapshot {
  version: 1;
  bookFormat: BookFormat;
  contentMode: ContentMode;
  contentLock: ContentMode;
  genre: Genre | string;
  subgenre: string;
  tone: string;
  targetReader: string;
  structureModel: StructureModel;
  structureLock: UniversalStructureMode;
  chapterModel: string;
  sectionModel: string;
  blueprintType: BlueprintType;
  generationStrategy: GenerationStrategy;
  requiresCharacters: boolean;
  requiresPlot: boolean;
  requiresWorldbuilding: boolean;
  requiresExercises: boolean;
  requiresReferences: boolean;
  requiresPoems: boolean;
  requiresScenes: boolean;
  requiresCaseStudies: boolean;
  requiresExamples: boolean;
  requiresWorkbook: boolean;
  narrativeMode: boolean;
  educationalMode: boolean;
  poeticMode: boolean;
  commercialPromise: string;
  promiseLock: string;
  allowedStructures: string[];
  forbiddenPatterns: string[];
  qualityRules: string[];
  qualityLock: string[];
  publishingStandards: FormatPublishingStandards;
  bestsellerIntelligence: FormatBestsellerIntelligence;
  qualityGate: FormatQualityGate;
  commercialIntelligence: FormatCommercialIntelligence;
  exportIntelligence: FormatExportIntelligence;
  registryKey: string;
  lockedAt: string;
}

export interface FormatCoherenceIssue {
  kind: "format" | "structure" | "forbidden_pattern" | "promise";
  severity: "critical" | "high" | "medium";
  message: string;
  evidence: string[];
}

export interface FormatCoherenceReport {
  passed: boolean;
  issues: FormatCoherenceIssue[];
  kernel: BookIntelligenceKernelSnapshot;
}

export type BookKernelTemplate = Omit<BookIntelligenceKernelSnapshot,
  | "genre"
  | "subgenre"
  | "tone"
  | "targetReader"
  | "contentLock"
  | "structureLock"
  | "promiseLock"
  | "qualityLock"
  | "publishingStandards"
  | "bestsellerIntelligence"
  | "qualityGate"
  | "commercialIntelligence"
  | "exportIntelligence"
  | "registryKey"
  | "lockedAt"
> & {
  defaultGenre: Genre | string;
  defaultTone: string;
};

export type CustomBookKernelTemplate = Omit<BookKernelTemplate, "bookFormat"> & {
  bookFormat?: string;
};

const NARRATIVE_FORBIDDEN = [
  "manuale freddo non richiesto",
  "struttura da corso se non richiesta",
  "checklist come sostituto della scena",
];

const NONFICTION_FORBIDDEN = [
  "protagonista",
  "antagonista",
  "trama",
  "plot twist",
  "climax",
  "love interest",
  "forced proximity",
  "baci proibiti",
  "dark romance",
  "scena romanzata dominante",
];

const POETRY_FORBIDDEN = [
  "protagonista",
  "antagonista",
  "trama",
  "worldbuilding",
  "forced proximity",
  "love interest",
  "dark romance",
  "cliffhanger",
  "Capitolo 1",
  "capitoli narrativi",
  "climax",
];

function structureLockFor(model: StructureModel): UniversalStructureMode {
  if (model === "poetry_sections") return "poems";
  if (model === "short_story_units") return "stories";
  if (model === "study_modules") return "modules";
  if (model === "workbook_sheets") return "exercises";
  if (model === "devotional_entries") return "days";
  if (model === "journal_prompts") return "entries";
  if (model === "recipe_sections") return "frameworks";
  if (model === "essay_arguments") return "reflections";
  if (model === "academic_chapters" || model === "research_sections") return "chapters";
  if (model === "picture_book_spreads") return "stories";
  if (model === "travel_sections") return "modules";
  if (model === "practical_chapters") return "frameworks";
  return "chapters";
}

function publishingStandardsFor(format: BookFormat, template: BookKernelTemplate): FormatPublishingStandards {
  const base: FormatPublishingStandards = {
    idealStructure: template.allowedStructures,
    idealLength: "lunghezza coerente con promessa, pubblico e complessita' del formato",
    idealChapterRange: template.structureModel === "compact_narrative_chapters" ? [6, 14] : [8, 24],
    readerExpectations: ["chiarezza immediata del patto editoriale", "progressione coerente", "nessuna contaminazione da altri formati"],
    commercialStandards: ["titolo e promessa coerenti con formato e scaffale", "beneficio leggibile in anteprima", "differenziazione concreta"],
    amazonStandards: ["categoria primaria coerente", "keyword specifiche", "Look Inside leggibile e allineato alla promessa"],
    errorsToAvoid: template.forbiddenPatterns,
  };

  switch (format) {
    case "novel":
      return { ...base, idealLength: "50.000-90.000 parole", idealChapterRange: [18, 45], readerExpectations: ["conflitto", "personaggi vivi", "tensione crescente", "payoff"], amazonStandards: ["sottogenere chiaro", "hook narrativo", "comp title coerenti"] };
    case "novella":
      return { ...base, idealLength: "20.000-45.000 parole", idealChapterRange: [6, 16], readerExpectations: ["arco compatto", "pochi personaggi", "finale forte"] };
    case "short_story_collection":
      return { ...base, idealLength: "25.000-70.000 parole", idealChapterRange: [6, 20], readerExpectations: ["racconti autonomi", "variazione", "tema unificante"] };
    case "poetry_collection":
      return { ...base, idealLength: "40-120 poesie o 4-8 sezioni", idealChapterRange: [4, 8], readerExpectations: ["voce riconoscibile", "immagini memorabili", "arco emotivo"], amazonStandards: ["categoria poesia specifica", "estratti forti", "formattazione ariosa"] };
    case "workbook":
    case "journal":
      return { ...base, idealLength: "60-180 pagine operative", idealChapterRange: [6, 18], readerExpectations: ["spazi risposta", "tracking", "esercizi completabili"], amazonStandards: ["interni stampabili", "beneficio pratico", "categoria journal/workbook"] };
    case "study_material":
    case "academic_summary":
      return { ...base, idealLength: "moduli brevi e ripassabili", idealChapterRange: [5, 18], readerExpectations: ["fedelta' al materiale", "definizioni", "quiz", "ripasso"], amazonStandards: ["materia e livello chiari", "indice scansionabile", "nessuna invenzione"] };
    case "academic_book":
    case "research_book":
    case "historical_analysis":
      return { ...base, idealLength: "40.000-120.000 parole con apparato coerente", idealChapterRange: [8, 20], readerExpectations: ["tesi", "metodo", "fonti", "argomentazione"], amazonStandards: ["categoria accademica chiara", "autorevolezza", "bibliografia o note dove richiesto"] };
    case "picture_book":
      return { ...base, idealLength: "24-40 pagine/spread illustrati", idealChapterRange: [12, 20], readerExpectations: ["ritmo pagina", "immagine + frase", "eta' target"], amazonStandards: ["eta' dichiarata", "anteprima visiva forte", "formato illustrato"] };
    case "cookbook":
      return { ...base, idealLength: "40-120 ricette o sezioni tematiche", idealChapterRange: [6, 16], readerExpectations: ["ingredienti precisi", "tempi", "risultato ripetibile"] };
    case "travel_guide":
      return { ...base, idealLength: "itinerari, mappe testuali e sezioni pratiche", idealChapterRange: [6, 20], readerExpectations: ["orientamento", "itinerari", "costi", "consigli concreti"] };
    default:
      return base;
  }
}

function bestsellerIntelligenceFor(format: BookFormat): FormatBestsellerIntelligence {
  if (["novel", "novella", "short_story_collection", "children_book", "picture_book"].includes(format)) {
    return { primaryMetrics: ["tensione", "conflitto", "voce", "payoff", "read-through"], scoringFocus: "desiderio di continuare la lettura", readerRetentionDriver: "domande narrative aperte e ricompense emotive" };
  }
  if (format === "poetry_collection") {
    return { primaryMetrics: ["memorabilita'", "immagini", "musicalita'", "voce", "citabilita'"], scoringFocus: "intensita' lirica senza genericita'", readerRetentionDriver: "immagini ricorrenti e progressione emotiva" };
  }
  if (["manual", "business_book", "self_help", "psychology_guide", "travel_guide"].includes(format)) {
    return { primaryMetrics: ["applicabilita'", "trasformazione percepita", "chiarezza", "autorita'", "completezza"], scoringFocus: "quanto il lettore puo' usare subito il contenuto", readerRetentionDriver: "benefici concreti, esempi e checklist" };
  }
  if (["workbook", "journal"].includes(format)) {
    return { primaryMetrics: ["completabilita'", "progressione", "chiarezza esercizi", "tracking", "ritorno d'uso"], scoringFocus: "quanto e' facile completare e tornare al libro", readerRetentionDriver: "micro-vittorie e spazi risposta ben progettati" };
  }
  if (["study_material", "academic_summary", "academic_book", "research_book", "historical_analysis"].includes(format)) {
    return { primaryMetrics: ["accuratezza", "gerarchia concetti", "memorizzazione", "verificabilita'", "chiarezza"], scoringFocus: "apprendimento e affidabilita' del contenuto", readerRetentionDriver: "progressione didattica e fiducia nelle fonti" };
  }
  return { primaryMetrics: ["chiarezza promessa", "coerenza formato", "differenziazione", "utilita'"], scoringFocus: "aderenza al formato scelto", readerRetentionDriver: "progressione chiara e beneficio mantenuto" };
}

function qualityGateFor(format: BookFormat, template: BookKernelTemplate): FormatQualityGate {
  return {
    mustHave: [
      `formato ${format} rispettato`,
      `struttura ${template.structureModel} usata come modello primario`,
      ...template.qualityRules.slice(0, 3),
    ],
    rejectIf: template.forbiddenPatterns,
    checks: [
      "nessuna struttura vietata dal formato",
      "promessa mantenuta in ogni sezione",
      "output verificabile rispetto al formato e al pubblico",
    ],
  };
}

function commercialIntelligenceFor(format: BookFormat, template: BookKernelTemplate): FormatCommercialIntelligence {
  const keywords = [format, template.sectionModel, template.defaultGenre, ...template.allowedStructures.slice(0, 4)]
    .map((item) => String(item).toLowerCase())
    .filter(Boolean);
  return {
    target: template.requiresCharacters ? "lettori interessati a esperienza narrativa coerente" : "lettori interessati a risultato, chiarezza o consultazione",
    positioning: `${template.commercialPromise} con struttura ${template.structureModel}`,
    differentiation: `Non usa template generici: formato ${format} e contenuto ${template.contentMode} sono bloccati dal kernel.`,
    amazonCategory: String(template.defaultGenre || format),
    keywords,
    marketRisk: template.forbiddenPatterns[0] || "promessa troppo generica",
    commercialStrength: template.commercialPromise,
  };
}

function exportIntelligenceFor(format: BookFormat, template: BookKernelTemplate): FormatExportIntelligence {
  if (format === "poetry_collection") {
    return { layoutProfile: "poetry-airy", frontMatter: ["titolo", "dedica facoltativa", "indice sezioni"], backMatter: ["nota autore"], formattingRules: ["mantenere versi e spazi", "non giustificare come prosa", "una poesia puo' iniziare su nuova pagina"] };
  }
  if (format === "workbook" || format === "journal") {
    return { layoutProfile: "interactive-workbook", frontMatter: ["istruzioni d'uso", "obiettivi"], backMatter: ["tracker finale", "piano di continuita'"], formattingRules: ["spazi risposta ampi", "checkbox leggibili", "schede stampabili"] };
  }
  if (format === "cookbook") {
    return { layoutProfile: "recipe-reference", frontMatter: ["come usare il ricettario", "attrezzatura"], backMatter: ["indice ingredienti", "conversioni"], formattingRules: ["ingredienti separati", "tempi visibili", "passaggi numerati"] };
  }
  if (template.educationalMode || template.contentMode === "academic") {
    return { layoutProfile: "study-reference", frontMatter: ["obiettivi", "prerequisiti"], backMatter: ["glossario", "ripasso", "fonti se presenti"], formattingRules: ["definizioni evidenziate", "formule non alterate", "quiz separati dal testo"] };
  }
  if (template.narrativeMode) {
    return { layoutProfile: "narrative-prose", frontMatter: ["titolo", "dedica facoltativa", "indice"], backMatter: ["ringraziamenti", "nota autore"], formattingRules: ["capitoli puliti", "scene break coerenti", "nessun layout da workbook"] };
  }
  return { layoutProfile: "professional-nonfiction", frontMatter: ["introduzione", "promessa", "indice"], backMatter: ["risorse", "checklist", "note"], formattingRules: ["heading coerenti", "liste leggibili", "azioni evidenziate"] };
}

const MATRIX: Record<BookFormat, BookKernelTemplate> = {
  novel: {
    version: 1,
    bookFormat: "novel",
    contentMode: "narrative",
    defaultGenre: "romance",
    defaultTone: "narrativo, immersivo, coerente",
    structureModel: "narrative_chapters",
    chapterModel: "capitoli narrativi con scene, conflitti e conseguenze",
    sectionModel: "capitolo",
    blueprintType: "NarrativeBlueprint",
    generationStrategy: "generateNovel",
    requiresCharacters: true,
    requiresPlot: true,
    requiresWorldbuilding: true,
    requiresExercises: false,
    requiresReferences: false,
    requiresPoems: false,
    requiresScenes: true,
    requiresCaseStudies: false,
    requiresExamples: false,
    requiresWorkbook: false,
    narrativeMode: true,
    educationalMode: false,
    poeticMode: false,
    commercialPromise: "promessa narrativa ed emotiva",
    allowedStructures: ["capitoli narrativi", "scene", "archi personaggio", "conflitto", "payoff"],
    forbiddenPatterns: NARRATIVE_FORBIDDEN,
    qualityRules: ["Ogni capitolo muove trama o personaggi.", "Nessuna scena duplicata.", "Il genere colora la storia, non la sostituisce."],
  },
  novella: {
    version: 1,
    bookFormat: "novella",
    contentMode: "narrative",
    defaultGenre: "literary-fiction",
    defaultTone: "compatto, intenso, narrativo",
    structureModel: "compact_narrative_chapters",
    chapterModel: "capitoli brevi e concentrati",
    sectionModel: "capitolo",
    blueprintType: "NarrativeBlueprint",
    generationStrategy: "generateNovella",
    requiresCharacters: true,
    requiresPlot: true,
    requiresWorldbuilding: false,
    requiresExercises: false,
    requiresReferences: false,
    requiresPoems: false,
    requiresScenes: true,
    requiresCaseStudies: false,
    requiresExamples: false,
    requiresWorkbook: false,
    narrativeMode: true,
    educationalMode: false,
    poeticMode: false,
    commercialPromise: "promessa narrativa compatta",
    allowedStructures: ["capitoli brevi", "arco concentrato", "pochi snodi", "finale netto"],
    forbiddenPatterns: [...NARRATIVE_FORBIDDEN, "sottotrame eccessive"],
    qualityRules: ["Meno sottotrame.", "Massima concentrazione emotiva.", "Ogni scena deve pesare."],
  },
  short_story_collection: {
    version: 1,
    bookFormat: "short_story_collection",
    contentMode: "narrative",
    defaultGenre: "horror",
    defaultTone: "vario, coerente, narrativo",
    structureModel: "short_story_units",
    chapterModel: "racconti autonomi uniti da un filo tematico",
    sectionModel: "racconto",
    blueprintType: "NarrativeBlueprint",
    generationStrategy: "generateShortStoryCollection",
    requiresCharacters: true,
    requiresPlot: true,
    requiresWorldbuilding: false,
    requiresExercises: false,
    requiresReferences: false,
    requiresPoems: false,
    requiresScenes: true,
    requiresCaseStudies: false,
    requiresExamples: false,
    requiresWorkbook: false,
    narrativeMode: true,
    educationalMode: false,
    poeticMode: false,
    commercialPromise: "promessa di raccolta: racconti autonomi con tema comune",
    allowedStructures: ["racconti autonomi", "tema comune", "variazione di personaggi", "unità di tono"],
    forbiddenPatterns: ["romanzo unico mascherato", "stessa trama ripetuta", "un solo protagonista obbligatorio"],
    qualityRules: ["Ogni racconto deve funzionare da solo.", "La raccolta ha un filo, non una trama unica forzata."],
  },
  poetry_collection: {
    version: 1,
    bookFormat: "poetry_collection",
    contentMode: "poetic",
    defaultGenre: "poetry",
    defaultTone: "lirico, preciso, musicale",
    structureModel: "poetry_sections",
    chapterModel: "sezioni poetiche con poesie autonome",
    sectionModel: "sezione poetica",
    blueprintType: "PoetryBlueprint",
    generationStrategy: "generatePoetryCollection",
    requiresCharacters: false,
    requiresPlot: false,
    requiresWorldbuilding: false,
    requiresExercises: false,
    requiresReferences: false,
    requiresPoems: true,
    requiresScenes: false,
    requiresCaseStudies: false,
    requiresExamples: false,
    requiresWorkbook: false,
    narrativeMode: false,
    educationalMode: false,
    poeticMode: true,
    commercialPromise: "promessa poetica, voce, immagini e arco emotivo della raccolta",
    allowedStructures: ["parti poetiche", "poesie titolate", "immagini ricorrenti", "arco emotivo", "voce poetica"],
    forbiddenPatterns: POETRY_FORBIDDEN,
    qualityRules: ["Ogni poesia ha un'immagine concreta.", "Niente trama da romanzo.", "Spazio, ritmo e silenzio sono struttura."],
  },
  essay: {
    version: 1,
    bookFormat: "essay",
    contentMode: "reflective",
    defaultGenre: "philosophy",
    defaultTone: "argomentativo, lucido, autorevole",
    structureModel: "essay_arguments",
    chapterModel: "capitoli argomentativi",
    sectionModel: "argomento",
    blueprintType: "EssayBlueprint",
    generationStrategy: "generateEssay",
    requiresCharacters: false,
    requiresPlot: false,
    requiresWorldbuilding: false,
    requiresExercises: false,
    requiresReferences: true,
    requiresPoems: false,
    requiresScenes: false,
    requiresCaseStudies: false,
    requiresExamples: true,
    requiresWorkbook: false,
    narrativeMode: false,
    educationalMode: false,
    poeticMode: false,
    commercialPromise: "promessa argomentativa: tesi, prove, riflessione e conclusione",
    allowedStructures: ["tesi", "argomenti", "controargomenti", "esempi", "conclusione"],
    forbiddenPatterns: NONFICTION_FORBIDDEN,
    qualityRules: ["Ogni sezione sostiene la tesi.", "Argomenti chiari, non trama.", "Conclusione memorabile."],
  },
  manual: {
    version: 1,
    bookFormat: "manual",
    contentMode: "instructional",
    defaultGenre: "manual",
    defaultTone: "chiaro, pratico, operativo",
    structureModel: "practical_chapters",
    chapterModel: "capitoli pratici con esempi, checklist e procedure",
    sectionModel: "capitolo pratico",
    blueprintType: "GuideBlueprint",
    generationStrategy: "generateManual",
    requiresCharacters: false,
    requiresPlot: false,
    requiresWorldbuilding: false,
    requiresExercises: true,
    requiresReferences: false,
    requiresPoems: false,
    requiresScenes: false,
    requiresCaseStudies: true,
    requiresExamples: true,
    requiresWorkbook: false,
    narrativeMode: false,
    educationalMode: false,
    poeticMode: false,
    commercialPromise: "promessa pratica: il lettore impara a fare qualcosa",
    allowedStructures: ["obiettivo", "spiegazione", "procedura", "esempio", "checklist", "errori comuni"],
    forbiddenPatterns: NONFICTION_FORBIDDEN,
    qualityRules: ["Ogni capitolo deve essere applicabile.", "Niente protagonista fiction.", "Checklist ed esempi concreti."],
  },
  self_help: {
    version: 1,
    bookFormat: "self_help",
    contentMode: "transformational",
    defaultGenre: "self-help",
    defaultTone: "empatico, concreto, responsabile",
    structureModel: "practical_chapters",
    chapterModel: "capitoli trasformativi con esercizi e domande",
    sectionModel: "capitolo guida",
    blueprintType: "GuideBlueprint",
    generationStrategy: "generateSelfHelpGuide",
    requiresCharacters: false,
    requiresPlot: false,
    requiresWorldbuilding: false,
    requiresExercises: true,
    requiresReferences: false,
    requiresPoems: false,
    requiresScenes: false,
    requiresCaseStudies: true,
    requiresExamples: true,
    requiresWorkbook: true,
    narrativeMode: false,
    educationalMode: false,
    poeticMode: false,
    commercialPromise: "promessa trasformativa realistica: chiarezza, strumenti e pratica",
    allowedStructures: ["problema", "consapevolezza", "strumento", "esercizio", "domande journaling", "mantenimento"],
    forbiddenPatterns: [...NONFICTION_FORBIDDEN, "cura miracolosa", "diagnosi del lettore"],
    qualityRules: ["Tono empatico ma non clinico.", "Nessuna promessa assoluta.", "Esercizi concreti e sicuri."],
  },
  psychology_guide: {
    version: 1,
    bookFormat: "psychology_guide",
    contentMode: "transformational",
    defaultGenre: "philosophy",
    defaultTone: "divulgativo, empatico, responsabile",
    structureModel: "practical_chapters",
    chapterModel: "capitoli divulgativi con auto-riflessione e quando chiedere aiuto",
    sectionModel: "capitolo guida",
    blueprintType: "GuideBlueprint",
    generationStrategy: "generatePsychologyGuide",
    requiresCharacters: false,
    requiresPlot: false,
    requiresWorldbuilding: false,
    requiresExercises: true,
    requiresReferences: true,
    requiresPoems: false,
    requiresScenes: false,
    requiresCaseStudies: true,
    requiresExamples: true,
    requiresWorkbook: true,
    narrativeMode: false,
    educationalMode: false,
    poeticMode: false,
    commercialPromise: "promessa psicologica responsabile: capire, riflettere, applicare con prudenza",
    allowedStructures: ["informazione", "meccanismo", "auto-riflessione", "esercizio", "quando chiedere aiuto"],
    forbiddenPatterns: [...NONFICTION_FORBIDDEN, "cura miracolosa", "diagnosi del lettore", "terapia garantita"],
    qualityRules: ["Non diagnosticare il lettore.", "Distingui informazione da supporto professionale.", "Esempi realistici."],
  },
  business_book: {
    version: 1,
    bookFormat: "business_book",
    contentMode: "practical",
    defaultGenre: "business",
    defaultTone: "strategico, operativo, autorevole",
    structureModel: "practical_chapters",
    chapterModel: "framework, casi studio, checklist e piano operativo",
    sectionModel: "capitolo strategico",
    blueprintType: "BusinessBlueprint",
    generationStrategy: "generateBusinessBook",
    requiresCharacters: false,
    requiresPlot: false,
    requiresWorldbuilding: false,
    requiresExercises: true,
    requiresReferences: false,
    requiresPoems: false,
    requiresScenes: false,
    requiresCaseStudies: true,
    requiresExamples: true,
    requiresWorkbook: false,
    narrativeMode: false,
    educationalMode: false,
    poeticMode: false,
    commercialPromise: "promessa business: framework, strategie e risultato operativo",
    allowedStructures: ["problema mercato", "framework", "strategia", "caso studio", "checklist", "piano operativo"],
    forbiddenPatterns: NONFICTION_FORBIDDEN,
    qualityRules: ["Niente buzzword senza applicazione.", "Ogni capitolo deve produrre una decisione o azione."],
  },
  memoir: {
    version: 1,
    bookFormat: "memoir",
    contentMode: "reflective",
    defaultGenre: "memoir",
    defaultTone: "intimo, vero, riflessivo",
    structureModel: "memoir_arc",
    chapterModel: "scene autobiografiche e riflessione",
    sectionModel: "memoria",
    blueprintType: "MemoirBlueprint",
    generationStrategy: "generateMemoir",
    requiresCharacters: true,
    requiresPlot: false,
    requiresWorldbuilding: false,
    requiresExercises: false,
    requiresReferences: false,
    requiresPoems: false,
    requiresScenes: true,
    requiresCaseStudies: false,
    requiresExamples: false,
    requiresWorkbook: false,
    narrativeMode: true,
    educationalMode: false,
    poeticMode: false,
    commercialPromise: "promessa memoir: verita' personale, scene e significato",
    allowedStructures: ["scene reali", "memoria", "tema", "riflessione", "trasformazione personale"],
    forbiddenPatterns: ["fantasy inventato", "romance forzato", "eventi non dichiarati come fiction"],
    qualityRules: ["Non inventare come fantasy.", "La memoria guida la struttura.", "Scene possibili, ma verita' prima."],
  },
  biography: {
    version: 1,
    bookFormat: "biography",
    contentMode: "reference",
    defaultGenre: "biography",
    defaultTone: "documentaristico, narrativo, accurato",
    structureModel: "biographical_timeline",
    chapterModel: "capitoli cronologici o tematici",
    sectionModel: "periodo",
    blueprintType: "BiographyBlueprint",
    generationStrategy: "generateBiography",
    requiresCharacters: true,
    requiresPlot: false,
    requiresWorldbuilding: false,
    requiresExercises: false,
    requiresReferences: true,
    requiresPoems: false,
    requiresScenes: false,
    requiresCaseStudies: false,
    requiresExamples: false,
    requiresWorkbook: false,
    narrativeMode: false,
    educationalMode: false,
    poeticMode: false,
    commercialPromise: "promessa biografica: vita, contesto, svolte e legacy",
    allowedStructures: ["timeline", "contesto", "fonti", "svolte", "eredita'"],
    forbiddenPatterns: ["arco fiction inventato", "hagiography", "romance forzato"],
    qualityRules: ["Accuratezza e contesto.", "Non inventare svolte romanzesche.", "Distinguere fatto e interpretazione."],
  },
  autobiography: {
    version: 1,
    bookFormat: "autobiography",
    contentMode: "reflective",
    defaultGenre: "memoir",
    defaultTone: "personale, cronologico, riflessivo",
    structureModel: "memoir_arc",
    chapterModel: "capitoli autobiografici",
    sectionModel: "periodo di vita",
    blueprintType: "MemoirBlueprint",
    generationStrategy: "generateMemoir",
    requiresCharacters: true,
    requiresPlot: false,
    requiresWorldbuilding: false,
    requiresExercises: false,
    requiresReferences: false,
    requiresPoems: false,
    requiresScenes: true,
    requiresCaseStudies: false,
    requiresExamples: false,
    requiresWorkbook: false,
    narrativeMode: true,
    educationalMode: false,
    poeticMode: false,
    commercialPromise: "promessa autobiografica: percorso reale e significato personale",
    allowedStructures: ["periodi di vita", "snodi", "relazioni reali", "riflessione"],
    forbiddenPatterns: ["fantasy inventato", "antagonista fiction", "plot twist inventato"],
    qualityRules: ["L'io narrante resta centrale.", "Non fiction prima della drammatizzazione."],
  },
  academic_book: {
    version: 1,
    bookFormat: "academic_book",
    contentMode: "academic",
    defaultGenre: "education",
    defaultTone: "accademico, chiaro, verificabile",
    structureModel: "academic_chapters",
    chapterModel: "capitoli accademici con tesi, metodo, prove e sintesi",
    sectionModel: "capitolo accademico",
    blueprintType: "AcademicBlueprint",
    generationStrategy: "generateAcademicBook",
    requiresCharacters: false,
    requiresPlot: false,
    requiresWorldbuilding: false,
    requiresExercises: false,
    requiresReferences: true,
    requiresPoems: false,
    requiresScenes: false,
    requiresCaseStudies: true,
    requiresExamples: true,
    requiresWorkbook: false,
    narrativeMode: false,
    educationalMode: true,
    poeticMode: false,
    commercialPromise: "promessa accademica: tesi, metodo, prove e contributo chiaro",
    allowedStructures: ["tesi", "metodologia", "capitoli argomentativi", "fonti", "conclusioni"],
    forbiddenPatterns: [...NONFICTION_FORBIDDEN, "affermazioni senza fonte", "stile motivazionale vago"],
    qualityRules: ["Ogni tesi deve avere supporto.", "Separare fatti, interpretazione e limiti.", "Nessuna invenzione di fonti."],
  },
  children_book: {
    version: 1,
    bookFormat: "children_book",
    contentMode: "narrative",
    defaultGenre: "children",
    defaultTone: "semplice, immaginativo, adatto all'eta'",
    structureModel: "compact_narrative_chapters",
    chapterModel: "capitoli o scene brevi per eta' target",
    sectionModel: "episodio",
    blueprintType: "NarrativeBlueprint",
    generationStrategy: "generateChildrenBook",
    requiresCharacters: true,
    requiresPlot: true,
    requiresWorldbuilding: false,
    requiresExercises: false,
    requiresReferences: false,
    requiresPoems: false,
    requiresScenes: true,
    requiresCaseStudies: false,
    requiresExamples: false,
    requiresWorkbook: false,
    narrativeMode: true,
    educationalMode: false,
    poeticMode: false,
    commercialPromise: "promessa per bambini: emozione semplice, morale chiara, linguaggio adatto",
    allowedStructures: ["personaggi semplici", "problema", "scelta", "morale", "finale rassicurante"],
    forbiddenPatterns: ["complessita' adulta", "spice", "violenza adulta"],
    qualityRules: ["Linguaggio adatto all'eta'.", "Morale chiara senza predica.", "Scene brevi."],
  },
  picture_book: {
    version: 1,
    bookFormat: "picture_book",
    contentMode: "narrative",
    defaultGenre: "children",
    defaultTone: "visivo, semplice, ritmico",
    structureModel: "picture_book_spreads",
    chapterModel: "spread illustrati con testo breve e progressione visiva",
    sectionModel: "spread",
    blueprintType: "PictureBookBlueprint",
    generationStrategy: "generatePictureBook",
    requiresCharacters: true,
    requiresPlot: true,
    requiresWorldbuilding: false,
    requiresExercises: false,
    requiresReferences: false,
    requiresPoems: false,
    requiresScenes: true,
    requiresCaseStudies: false,
    requiresExamples: false,
    requiresWorkbook: false,
    narrativeMode: true,
    educationalMode: false,
    poeticMode: false,
    commercialPromise: "promessa illustrata: emozione semplice, ritmo pagina e immaginazione visiva",
    allowedStructures: ["spread", "ritmo pagina", "immagine dominante", "testo minimo", "finale rassicurante"],
    forbiddenPatterns: ["capitoli lunghi", "paragrafi adulti", "spiegazioni astratte"],
    qualityRules: ["Ogni spread deve avere una funzione visiva.", "Testo breve e leggibile.", "Eta' target sempre rispettata."],
  },
  cookbook: {
    version: 1,
    bookFormat: "cookbook",
    contentMode: "reference",
    defaultGenre: "cookbook",
    defaultTone: "preciso, sensoriale, pratico",
    structureModel: "recipe_sections",
    chapterModel: "sezioni con ricette, tecniche e varianti",
    sectionModel: "ricetta/sezione",
    blueprintType: "CookbookBlueprint",
    generationStrategy: "generateCookbook",
    requiresCharacters: false,
    requiresPlot: false,
    requiresWorldbuilding: false,
    requiresExercises: false,
    requiresReferences: false,
    requiresPoems: false,
    requiresScenes: false,
    requiresCaseStudies: false,
    requiresExamples: true,
    requiresWorkbook: false,
    narrativeMode: false,
    educationalMode: false,
    poeticMode: false,
    commercialPromise: "promessa culinaria: ricette ripetibili, tecniche, risultato",
    allowedStructures: ["ingredienti", "tempi", "tecnica", "varianti", "errori comuni", "servizio"],
    forbiddenPatterns: NONFICTION_FORBIDDEN,
    qualityRules: ["Quantita', tempi e consistenze specifiche.", "Nessuna ricetta vaga.", "Risultato verificabile."],
  },
  workbook: {
    version: 1,
    bookFormat: "workbook",
    contentMode: "practical",
    defaultGenre: "manual",
    defaultTone: "guidato, operativo, incoraggiante",
    structureModel: "workbook_sheets",
    chapterModel: "schede, esercizi, domande e spazi risposta",
    sectionModel: "scheda",
    blueprintType: "WorkbookBlueprint",
    generationStrategy: "generateWorkbook",
    requiresCharacters: false,
    requiresPlot: false,
    requiresWorldbuilding: false,
    requiresExercises: true,
    requiresReferences: false,
    requiresPoems: false,
    requiresScenes: false,
    requiresCaseStudies: false,
    requiresExamples: true,
    requiresWorkbook: true,
    narrativeMode: false,
    educationalMode: false,
    poeticMode: false,
    commercialPromise: "promessa workbook: pratica guidata, consapevolezza e progresso",
    allowedStructures: ["schede", "domande", "esercizi", "spazi risposta", "tracker"],
    forbiddenPatterns: NONFICTION_FORBIDDEN,
    qualityRules: ["Ogni sezione deve far fare qualcosa.", "Domande chiare.", "Progressione misurabile."],
  },
  study_material: {
    version: 1,
    bookFormat: "study_material",
    contentMode: "educational",
    defaultGenre: "education",
    defaultTone: "didattico, chiaro, progressivo",
    structureModel: "study_modules",
    chapterModel: "moduli con spiegazioni, riassunti, quiz e flashcard",
    sectionModel: "modulo",
    blueprintType: "StudyBlueprint",
    generationStrategy: "generateStudyMaterial",
    requiresCharacters: false,
    requiresPlot: false,
    requiresWorldbuilding: false,
    requiresExercises: true,
    requiresReferences: true,
    requiresPoems: false,
    requiresScenes: false,
    requiresCaseStudies: false,
    requiresExamples: true,
    requiresWorkbook: true,
    narrativeMode: false,
    educationalMode: true,
    poeticMode: false,
    commercialPromise: "promessa di apprendimento: capire, ricordare, verificare",
    allowedStructures: ["moduli", "riassunti", "mappe", "quiz", "flashcard", "verifiche"],
    forbiddenPatterns: NONFICTION_FORBIDDEN,
    qualityRules: ["Ridurre carico cognitivo.", "Ogni modulo ha obiettivo e verifica.", "Niente romanzo."],
  },
  academic_summary: {
    version: 1,
    bookFormat: "academic_summary",
    contentMode: "academic",
    defaultGenre: "education",
    defaultTone: "sintetico, accurato, accademico",
    structureModel: "study_modules",
    chapterModel: "moduli di sintesi e concetti chiave",
    sectionModel: "modulo",
    blueprintType: "StudyBlueprint",
    generationStrategy: "generateStudyMaterial",
    requiresCharacters: false,
    requiresPlot: false,
    requiresWorldbuilding: false,
    requiresExercises: true,
    requiresReferences: true,
    requiresPoems: false,
    requiresScenes: false,
    requiresCaseStudies: false,
    requiresExamples: true,
    requiresWorkbook: false,
    narrativeMode: false,
    educationalMode: true,
    poeticMode: false,
    commercialPromise: "promessa accademica: sintesi fedele, concetti, verifica",
    allowedStructures: ["concetti", "definizioni", "schemi", "domande", "riepilogo"],
    forbiddenPatterns: NONFICTION_FORBIDDEN,
    qualityRules: ["Fedelta' al materiale.", "Date, formule e definizioni non si perdono.", "Niente invenzioni."],
  },
  spiritual_book: {
    version: 1,
    bookFormat: "spiritual_book",
    contentMode: "reflective",
    defaultGenre: "spirituality",
    defaultTone: "contemplativo, caldo, radicato",
    structureModel: "practical_chapters",
    chapterModel: "riflessioni, pratiche e meditazioni",
    sectionModel: "riflessione",
    blueprintType: "DevotionalBlueprint",
    generationStrategy: "generateSpiritualBook",
    requiresCharacters: false,
    requiresPlot: false,
    requiresWorldbuilding: false,
    requiresExercises: true,
    requiresReferences: false,
    requiresPoems: false,
    requiresScenes: false,
    requiresCaseStudies: false,
    requiresExamples: true,
    requiresWorkbook: false,
    narrativeMode: false,
    educationalMode: false,
    poeticMode: false,
    commercialPromise: "promessa spirituale: riflessione, pratica e presenza",
    allowedStructures: ["riflessione", "meditazione", "pratica", "integrazione"],
    forbiddenPatterns: NONFICTION_FORBIDDEN,
    qualityRules: ["Niente dogmatismo gratuito.", "Pratica concreta.", "Tono coerente."],
  },
  devotional: {
    version: 1,
    bookFormat: "devotional",
    contentMode: "reflective",
    defaultGenre: "spirituality",
    defaultTone: "devozionale, raccolto, pratico",
    structureModel: "devotional_entries",
    chapterModel: "giorni, meditazioni o letture brevi",
    sectionModel: "giorno",
    blueprintType: "DevotionalBlueprint",
    generationStrategy: "generateSpiritualBook",
    requiresCharacters: false,
    requiresPlot: false,
    requiresWorldbuilding: false,
    requiresExercises: true,
    requiresReferences: true,
    requiresPoems: false,
    requiresScenes: false,
    requiresCaseStudies: false,
    requiresExamples: true,
    requiresWorkbook: false,
    narrativeMode: false,
    educationalMode: false,
    poeticMode: false,
    commercialPromise: "promessa devozionale: lettura, riflessione, pratica quotidiana",
    allowedStructures: ["giorni", "lettura", "meditazione", "domanda", "pratica"],
    forbiddenPatterns: NONFICTION_FORBIDDEN,
    qualityRules: ["Ogni entry deve chiudersi con pratica o riflessione.", "Tono rispettoso.", "Niente romanzo."],
  },
  journal: {
    version: 1,
    bookFormat: "journal",
    contentMode: "practical",
    defaultGenre: "manual",
    defaultTone: "guidato, intimo, chiaro",
    structureModel: "journal_prompts",
    chapterModel: "prompt, spazi di scrittura, tracker",
    sectionModel: "prompt",
    blueprintType: "WorkbookBlueprint",
    generationStrategy: "generateWorkbook",
    requiresCharacters: false,
    requiresPlot: false,
    requiresWorldbuilding: false,
    requiresExercises: true,
    requiresReferences: false,
    requiresPoems: false,
    requiresScenes: false,
    requiresCaseStudies: false,
    requiresExamples: false,
    requiresWorkbook: true,
    narrativeMode: false,
    educationalMode: false,
    poeticMode: false,
    commercialPromise: "promessa journal: riflessione guidata e continuita'",
    allowedStructures: ["prompt", "domande", "tracker", "spazio risposte"],
    forbiddenPatterns: NONFICTION_FORBIDDEN,
    qualityRules: ["Ogni pagina guida una risposta.", "Niente capitoli fiction.", "Progressione gentile."],
  },
  travel_guide: {
    version: 1,
    bookFormat: "travel_guide",
    contentMode: "practical",
    defaultGenre: "manual",
    defaultTone: "pratico, vivido, affidabile",
    structureModel: "travel_sections",
    chapterModel: "itinerari, sezioni pratiche, consigli e mappe testuali",
    sectionModel: "itinerario",
    blueprintType: "TravelGuideBlueprint",
    generationStrategy: "generateTravelGuide",
    requiresCharacters: false,
    requiresPlot: false,
    requiresWorldbuilding: false,
    requiresExercises: false,
    requiresReferences: true,
    requiresPoems: false,
    requiresScenes: false,
    requiresCaseStudies: false,
    requiresExamples: true,
    requiresWorkbook: false,
    narrativeMode: false,
    educationalMode: false,
    poeticMode: false,
    commercialPromise: "promessa travel: orientamento, itinerari e decisioni pratiche migliori",
    allowedStructures: ["destinazioni", "itinerari", "budget", "trasporti", "consigli locali", "checklist"],
    forbiddenPatterns: [...NONFICTION_FORBIDDEN, "romanzo di viaggio forzato", "informazioni non verificabili come certe"],
    qualityRules: ["Distinguere ispirazione e informazione pratica.", "Ogni itinerario deve essere utilizzabile.", "Segnalare dati da verificare se temporali."],
  },
  historical_analysis: {
    version: 1,
    bookFormat: "historical_analysis",
    contentMode: "academic",
    defaultGenre: "historical",
    defaultTone: "analitico, documentato, chiaro",
    structureModel: "research_sections",
    chapterModel: "capitoli storico-analitici con contesto, cause, prove e conseguenze",
    sectionModel: "analisi storica",
    blueprintType: "ResearchBlueprint",
    generationStrategy: "generateHistoricalAnalysis",
    requiresCharacters: false,
    requiresPlot: false,
    requiresWorldbuilding: false,
    requiresExercises: false,
    requiresReferences: true,
    requiresPoems: false,
    requiresScenes: false,
    requiresCaseStudies: true,
    requiresExamples: true,
    requiresWorkbook: false,
    narrativeMode: false,
    educationalMode: true,
    poeticMode: false,
    commercialPromise: "promessa storica: capire cause, contesto, svolte e conseguenze",
    allowedStructures: ["periodizzazione", "contesto", "cause", "fonti", "interpretazioni", "conseguenze"],
    forbiddenPatterns: [...NONFICTION_FORBIDDEN, "anacronismi", "fonti inventate", "romanzo storico mascherato"],
    qualityRules: ["Cronologia chiara.", "Separare fatti e interpretazioni.", "Nessuna fonte inventata."],
  },
  research_book: {
    version: 1,
    bookFormat: "research_book",
    contentMode: "academic",
    defaultGenre: "education",
    defaultTone: "rigoroso, metodico, verificabile",
    structureModel: "research_sections",
    chapterModel: "domanda di ricerca, metodo, risultati, discussione e limiti",
    sectionModel: "sezione di ricerca",
    blueprintType: "ResearchBlueprint",
    generationStrategy: "generateResearchBook",
    requiresCharacters: false,
    requiresPlot: false,
    requiresWorldbuilding: false,
    requiresExercises: false,
    requiresReferences: true,
    requiresPoems: false,
    requiresScenes: false,
    requiresCaseStudies: true,
    requiresExamples: true,
    requiresWorkbook: false,
    narrativeMode: false,
    educationalMode: true,
    poeticMode: false,
    commercialPromise: "promessa research: domanda, metodo, risultati e contributo verificabile",
    allowedStructures: ["research question", "metodo", "letteratura", "risultati", "discussione", "limiti"],
    forbiddenPatterns: [...NONFICTION_FORBIDDEN, "risultati inventati", "fonti inventate", "conclusioni assolute"],
    qualityRules: ["Metodo esplicito.", "Limiti dichiarati.", "Nessuna evidenza inventata."],
  },
  hybrid_book: {
    version: 1,
    bookFormat: "hybrid_book",
    contentMode: "hybrid",
    defaultGenre: "manual",
    defaultTone: "editoriale, coerente, flessibile",
    structureModel: "mixed_structure",
    chapterModel: "struttura ibrida con componenti dichiarate e non confuse",
    sectionModel: "sezione ibrida",
    blueprintType: "HybridBlueprint",
    generationStrategy: "generateHybridBook",
    requiresCharacters: false,
    requiresPlot: false,
    requiresWorldbuilding: false,
    requiresExercises: false,
    requiresReferences: false,
    requiresPoems: false,
    requiresScenes: false,
    requiresCaseStudies: true,
    requiresExamples: true,
    requiresWorkbook: false,
    narrativeMode: false,
    educationalMode: false,
    poeticMode: false,
    commercialPromise: "promessa ibrida: combinare formati dichiarati senza confondere il lettore",
    allowedStructures: ["componenti dichiarate", "sezioni separate", "regole di transizione", "promessa unica"],
    forbiddenPatterns: ["cambio formato non segnalato", "romanzo automatico", "manuale mascherato senza promessa"],
    qualityRules: ["Ogni componente deve dichiarare funzione.", "La promessa unica governa il mix.", "Nessun formato deve contaminare l'altro."],
  },
  mixed_or_unknown: {
    version: 1,
    bookFormat: "mixed_or_unknown",
    contentMode: "hybrid",
    defaultGenre: "manual",
    defaultTone: "chiaro, editoriale, flessibile",
    structureModel: "mixed_structure",
    chapterModel: "struttura ibrida da confermare",
    sectionModel: "sezione",
    blueprintType: "GuideBlueprint",
    generationStrategy: "generateManual",
    requiresCharacters: false,
    requiresPlot: false,
    requiresWorldbuilding: false,
    requiresExercises: false,
    requiresReferences: false,
    requiresPoems: false,
    requiresScenes: false,
    requiresCaseStudies: false,
    requiresExamples: true,
    requiresWorkbook: false,
    narrativeMode: false,
    educationalMode: false,
    poeticMode: false,
    commercialPromise: "promessa editoriale da chiarire senza forzare romanzo",
    allowedStructures: ["sezioni", "capitoli", "moduli da confermare"],
    forbiddenPatterns: ["template romance automatico", "personaggi forzati", "trama forzata"],
    qualityRules: ["Non indovinare oltre i dati.", "Usa default sicuro non narrativo se il formato manca."],
  },
};

const FORMAT_ALIASES: Array<{ format: BookFormat; pattern: RegExp }> = [
  { format: "poetry_collection", pattern: /\b(poetry_collection|raccolta poetica|silloge|poesie|poesia|versi|liriche|poetry)\b/i },
  { format: "short_story_collection", pattern: /\b(short_story_collection|raccolta di racconti|raccolta racconti|racconti horror|story collection|short stories)\b/i },
  { format: "psychology_guide", pattern: /\b(psychology_guide|psicologia|psicologico|narcisismo|narcisista|ansia|anxiety|trauma|dipendenza affettiva|conflitto interiore)\b/i },
  { format: "self_help", pattern: /\b(self_help|self-help|self help|crescita personale|autostima|vincere l'ansia|come vincere|guida introspettiva)\b/i },
  { format: "business_book", pattern: /\b(business_book|business|marketing|vendere libri|amazon|kdp|leadership|startup|sales|vendite)\b/i },
  { format: "workbook", pattern: /\b(workbook|quaderno operativo|schede|esercizi guidati|autostima workbook)\b/i },
  { format: "study_material", pattern: /\b(study_material|materiale studio|materiale di studio|esame|quiz|flashcard|riassunti|sicurezza sul lavoro)\b/i },
  { format: "academic_summary", pattern: /\b(academic_summary|riassunto universitario|dispensa|sintesi accademica)\b/i },
  { format: "academic_book", pattern: /\b(academic_book|libro accademico|trattato accademico|monografia accademica|academic book)\b/i },
  { format: "research_book", pattern: /\b(research_book|libro di ricerca|ricerca scientifica|research book|studio di ricerca)\b/i },
  { format: "historical_analysis", pattern: /\b(historical_analysis|analisi storica|saggio storico|studio storico|historical analysis)\b/i },
  { format: "travel_guide", pattern: /\b(travel_guide|guida di viaggio|itinerario|itinerari|travel guide|viaggio)\b/i },
  { format: "manual", pattern: /\b(manual|manuale|guida pratica|how to|come fare|tutorial|guida)\b/i },
  { format: "essay", pattern: /\b(essay|saggio|tesi|argomentazione|potere della solitudine)\b/i },
  { format: "memoir", pattern: /\b(memoir|memorie|mia rinascita|la mia storia|periodo difficile)\b/i },
  { format: "autobiography", pattern: /\b(autobiografia|autobiography)\b/i },
  { format: "biography", pattern: /\b(biografia|biography|vita di)\b/i },
  { format: "picture_book", pattern: /\b(picture_book|albo illustrato|libro illustrato|picture book|silent book)\b/i },
  { format: "children_book", pattern: /\b(children_book|favola|fiaba|bambini|ragazzi|coraggio)\b/i },
  { format: "cookbook", pattern: /\b(cookbook|ricettario|ricette|cucina)\b/i },
  { format: "devotional", pattern: /\b(devotional|devozionale)\b/i },
  { format: "spiritual_book", pattern: /\b(spiritual_book|spiritualita|spiritualità|meditazioni)\b/i },
  { format: "journal", pattern: /\b(journal|diario guidato|prompt diario)\b/i },
  { format: "hybrid_book", pattern: /\b(hybrid_book|libro ibrido|hybrid book|formato ibrido)\b/i },
  { format: "novella", pattern: /\b(novella|romanzo breve)\b/i },
  { format: "novel", pattern: /\b(novel|romanzo|romance|thriller|fantasy|horror|narrativa)\b/i },
];

const BOOK_TYPE_FORMAT: Record<string, BookFormat> = {
  poetry: "poetry_collection",
  manual: "manual",
  "technical-manual": "manual",
  "software-guide": "manual",
  "ai-tools-guide": "manual",
  "self-help": "self_help",
  mindset: "self_help",
  coaching: "self_help",
  productivity: "self_help",
  psychology: "psychology_guide",
  philosophy: "essay",
  business: "business_book",
  marketing: "business_book",
  leadership: "business_book",
  finance: "business_book",
  education: "study_material",
  "history-school": "study_material",
  "math-school": "study_material",
  "science-school": "study_material",
  memoir: "memoir",
  biography: "biography",
  academic: "academic_book",
  "academic-book": "academic_book",
  "research-book": "research_book",
  history: "historical_analysis",
  children: "children_book",
  "fairy-tale": "children_book",
  "picture-book": "picture_book",
  cookbook: "cookbook",
  "cookbook-vegan": "cookbook",
  "cookbook-keto": "cookbook",
  "cookbook-dessert": "cookbook",
  travel: "travel_guide",
  "travel-guide": "travel_guide",
  romance: "novel",
  "dark-romance": "novel",
  fantasy: "novel",
  "cozy-fantasy": "novel",
  thriller: "novel",
  "gothic-thriller": "novel",
  crime: "novel",
  horror: "novel",
  mystery: "novel",
  "sci-fi": "novel",
  dystopian: "novel",
  historical: "novel",
  literary: "novel",
  paranormal: "novel",
  adventure: "novel",
  ya: "children_book",
};

const FORMAT_BOOK_TYPE_ID: Record<BookFormat, string> = {
  novel: "romance",
  novella: "literary",
  short_story_collection: "literary",
  poetry_collection: "poetry",
  essay: "philosophy",
  manual: "manual",
  self_help: "self-help",
  psychology_guide: "psychology",
  business_book: "business",
  memoir: "memoir",
  biography: "biography",
  autobiography: "memoir",
  children_book: "children",
  cookbook: "cookbook",
  workbook: "manual",
  study_material: "education",
  academic_summary: "education",
  academic_book: "education",
  research_book: "education",
  historical_analysis: "historical",
  spiritual_book: "spirituality",
  devotional: "spirituality",
  journal: "manual",
  picture_book: "children",
  travel_guide: "manual",
  hybrid_book: "manual",
  mixed_or_unknown: "manual",
};

const CUSTOM_FORMAT_ALIASES: Array<{ format: BookFormat; pattern: RegExp }> = [];

function normalize(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toRegistryKey(value: string): string {
  return normalize(value).replace(/\s+/g, "_");
}

export function registerBookKernelTemplate(
  format: string,
  template: CustomBookKernelTemplate,
  options: { aliases?: RegExp[]; bookTypeId?: string } = {},
): BookFormat {
  const registryKey = toRegistryKey(format) as BookFormat;
  (MATRIX as Record<string, BookKernelTemplate>)[registryKey] = {
    ...template,
    bookFormat: registryKey,
  } as BookKernelTemplate;
  if (options.bookTypeId) {
    (FORMAT_BOOK_TYPE_ID as Record<string, string>)[registryKey] = options.bookTypeId;
  }
  for (const alias of options.aliases || []) {
    CUSTOM_FORMAT_ALIASES.push({ format: registryKey, pattern: alias });
  }
  return registryKey;
}

export function listBookKernelFormats(): BookFormat[] {
  return Object.keys(MATRIX) as BookFormat[];
}

function readConfigText(config?: Partial<BookConfig> | null, extra = ""): string {
  return [
    config?.bookFormat,
    config?.bookTypeId,
    config?.genre,
    config?.category,
    config?.subcategory,
    config?.subgenre,
    config?.title,
    config?.subtitle,
    config?.idea,
    config?.originalIdea,
    extra,
  ].filter(Boolean).join(" ");
}

function parseFormat(value?: unknown): BookFormat | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (Object.prototype.hasOwnProperty.call(MATRIX, raw)) return raw as BookFormat;
  const normalized = normalize(raw);
  const registryKey = toRegistryKey(raw);
  if (Object.prototype.hasOwnProperty.call(MATRIX, registryKey)) return registryKey as BookFormat;
  const customAlias = CUSTOM_FORMAT_ALIASES.find((entry) => entry.pattern.test(normalized));
  if (customAlias) return customAlias.format;
  const byAlias = FORMAT_ALIASES.find((entry) => entry.pattern.test(normalized));
  return byAlias?.format || null;
}

function inferFormat(config?: Partial<BookConfig> | null, explicitText = ""): BookFormat {
  const explicitFormat = parseFormat(config?.bookFormat);
  if (explicitFormat) return explicitFormat;

  const bookType = String(config?.bookTypeId || "").trim();
  if (bookType && BOOK_TYPE_FORMAT[bookType]) return BOOK_TYPE_FORMAT[bookType];

  const userIntentText = normalize([
    explicitText,
    config?.idea,
    config?.originalIdea,
    config?.title,
    config?.subtitle,
  ].filter(Boolean).join(" "));
  const explicitFormatText = FORMAT_ALIASES.find((entry) => entry.pattern.test(userIntentText));
  if (explicitFormatText) {
    if (explicitFormatText.format === "psychology_guide") {
      if (/\bromanzo\b|\bnovel\b|\bnarrativa\b/.test(userIntentText)) return "novel";
      if (/\bpoesia\b|\bpoetry\b|\braccolta poetica\b/.test(userIntentText)) return "poetry_collection";
      if (/\bself help\b|\bmanuale\b|\bguida\b|\bcome vincere\b|\bnarcisismo\b|\bansia\b/.test(userIntentText)) return "psychology_guide";
    }
    return explicitFormatText.format;
  }

  const text = normalize(readConfigText(config, explicitText));
  const configFormatText = FORMAT_ALIASES.find((entry) => entry.pattern.test(text));
  if (configFormatText) return configFormatText.format;

  const genre = normalize(config?.genre);
  if (genre && BOOK_TYPE_FORMAT[genre]) return BOOK_TYPE_FORMAT[genre];

  return "mixed_or_unknown";
}

function resolveGenreForFormat(format: BookFormat, config?: Partial<BookConfig> | null): Genre | string {
  const current = String(config?.genre || "").trim();
  if (format === "novel" && current) return current;
  if (format === "short_story_collection" && current && current !== "philosophy") return current;
  if (format === "psychology_guide") return "philosophy";
  return MATRIX[format].defaultGenre;
}

export function resolveBookKernel(input: {
  config?: Partial<BookConfig> | null;
  idea?: string;
  explicitBookFormat?: BookFormat | string | null;
}): BookIntelligenceKernelSnapshot {
  const explicitConfig = input.explicitBookFormat
    ? { ...(input.config || {}), bookFormat: input.explicitBookFormat as string }
    : input.config;
  const format = inferFormat(explicitConfig, input.idea || "");
  const template = MATRIX[format] || MATRIX.mixed_or_unknown;
  const genre = resolveGenreForFormat(format, explicitConfig);
  const subgenre = String(explicitConfig?.subgenre || explicitConfig?.subcategory || "").trim();
  const structureLock = structureLockFor(template.structureModel);
  const qualityLock = [
    ...template.qualityRules,
    ...template.forbiddenPatterns.map((pattern) => `Vietato: ${pattern}`),
  ];
  return {
    ...template,
    contentLock: template.contentMode,
    structureLock,
    genre,
    subgenre,
    tone: String(explicitConfig?.tone || template.defaultTone).trim(),
    targetReader: String(explicitConfig?.targetReader || "").trim(),
    promiseLock: template.commercialPromise,
    qualityLock,
    publishingStandards: publishingStandardsFor(format, template),
    bestsellerIntelligence: bestsellerIntelligenceFor(format),
    qualityGate: qualityGateFor(format, template),
    commercialIntelligence: commercialIntelligenceFor(format, template),
    exportIntelligence: exportIntelligenceFor(format, template),
    registryKey: format,
    lockedAt: new Date().toISOString(),
  };
}

export function isNarrativeKernel(kernel: Pick<BookIntelligenceKernelSnapshot, "contentMode" | "requiresPlot">): boolean {
  return kernel.contentMode === "narrative" || kernel.requiresPlot;
}

export function applyBookKernelToConfig(config: BookConfig): BookConfig {
  const kernel = resolveBookKernel({ config });
  const shouldDropCharacters = !kernel.requiresCharacters;
  const shouldDisableSubchapters = kernel.bookFormat === "poetry_collection";
  const currentBookType = String(config.bookTypeId || "").trim();
  const currentFormat = currentBookType ? BOOK_TYPE_FORMAT[currentBookType] : null;
  const nextBookTypeId =
    currentBookType && (currentFormat === kernel.bookFormat || (kernel.bookFormat === "novel" && currentFormat === "novel"))
      ? currentBookType
      : FORMAT_BOOK_TYPE_ID[kernel.bookFormat] || config.bookTypeId;
  return {
    ...config,
    bookFormat: kernel.bookFormat,
    bookTypeId: nextBookTypeId,
    contentMode: kernel.contentMode,
    structureMode: kernel.structureModel,
    structureLock: kernel.structureLock,
    promiseLock: kernel.promiseLock,
    qualityLock: kernel.qualityLock,
    generationStrategy: kernel.generationStrategy,
    blueprintType: kernel.blueprintType,
    publishingStandards: kernel.publishingStandards,
    bestsellerIntelligence: kernel.bestsellerIntelligence,
    qualityGate: kernel.qualityGate,
    commercialIntelligence: kernel.commercialIntelligence,
    exportIntelligence: kernel.exportIntelligence,
    requiresCharacters: kernel.requiresCharacters,
    requiresPlot: kernel.requiresPlot,
    requiresWorldbuilding: kernel.requiresWorldbuilding,
    requiresExercises: kernel.requiresExercises,
    requiresPoems: kernel.requiresPoems,
    genre: kernel.genre as Genre,
    category:
      kernel.bookFormat === "poetry_collection"
        ? "Poesia"
        : kernel.narrativeMode
          ? "Fiction"
          : kernel.educationalMode
            ? "Education"
            : "Non-Fiction",
    subcategory: config.subcategory || kernel.subgenre || kernel.sectionModel,
    subgenre: config.subgenre || kernel.subgenre,
    tone: config.tone || kernel.tone,
    characters: shouldDropCharacters ? [] : config.characters,
    subchaptersEnabled: shouldDisableSubchapters ? false : config.subchaptersEnabled,
    subchaptersPerChapter: shouldDisableSubchapters ? 0 : config.subchaptersPerChapter,
    bookKernel: kernel,
  };
}

function containsForbidden(text: string, pattern: string): boolean {
  const normalizedText = normalize(text);
  const normalizedPattern = normalize(pattern);
  if (!normalizedText || !normalizedPattern) return false;
  if (normalizedPattern.length <= 3) return false;
  return normalizedText.includes(normalizedPattern);
}

export function validateFormatCoherence(
  config: Partial<BookConfig>,
  blueprint?: Partial<BookBlueprint> | null,
  generatedOutput = "",
): FormatCoherenceReport {
  const kernel = resolveBookKernel({ config });
  const haystack = [
    generatedOutput,
    blueprint?.overview,
    blueprint?.emotionalArc,
    ...(blueprint?.themes || []),
    ...(blueprint?.chapterOutlines || []).flatMap((outline) => [
      outline.title,
      outline.summary,
      ...(outline.subchapters || []).flatMap((sub) => [sub.title, sub.summary]),
    ]),
  ].filter(Boolean).join("\n");

  const issues: FormatCoherenceIssue[] = [];
  const forbiddenHits = kernel.forbiddenPatterns.filter((pattern) => containsForbidden(haystack, pattern));
  if (forbiddenHits.length > 0) {
    issues.push({
      kind: "forbidden_pattern",
      severity: "critical",
      message: `Output incoerente con ${kernel.bookFormat}: contiene strutture vietate.`,
      evidence: forbiddenHits.slice(0, 6),
    });
  }

  if (!kernel.requiresCharacters && Array.isArray(config.characters) && config.characters.length > 0) {
    issues.push({
      kind: "format",
      severity: "high",
      message: `${kernel.bookFormat} non richiede personaggi fiction canonici.`,
      evidence: config.characters.map((character: any) => String(character?.name || character?.role || "personaggio")).slice(0, 4),
    });
  }

  const outlineTitles = blueprint?.chapterOutlines?.map((outline) => String(outline.title || "")).join(" ") || "";
  if (kernel.bookFormat === "poetry_collection" && /\bcapitolo\s+\d+\b/i.test(outlineTitles)) {
    issues.push({
      kind: "structure",
      severity: "critical",
      message: "Una raccolta poetica non deve essere impostata come romanzo a capitoli numerati.",
      evidence: [outlineTitles.slice(0, 200)],
    });
  }

  if (kernel.bookFormat === "manual" || kernel.bookFormat === "self_help" || kernel.bookFormat === "psychology_guide") {
    const text = normalize(haystack);
    if (/\b(protagonista|antagonista|love interest|trama)\b/.test(text)) {
      issues.push({
        kind: "structure",
        severity: "critical",
        message: "Guide e manuali devono restare pratici: niente struttura fiction.",
        evidence: ["protagonista/antagonista/trama"],
      });
    }
  }

  if (!kernel.commercialPromise.trim()) {
    issues.push({
      kind: "promise",
      severity: "medium",
      message: "Promessa editoriale non definita dal kernel.",
      evidence: [kernel.bookFormat],
    });
  }

  if (haystack.trim()) {
    const purity = validateFormatPurity({
      bookFormat: kernel.bookFormat,
      genre: kernel.genre,
      subcategory: kernel.subgenre,
      generationStrategy: kernel.generationStrategy,
      blueprintType: kernel.blueprintType,
      text: haystack,
      requireMandatorySections: false,
    });
    if (!purity.passed) {
      issues.push({
        kind: "forbidden_pattern",
        severity: "critical",
        message: `Format Purity Score ${purity.score}/${purity.threshold}: output contaminato per ${kernel.bookFormat}.`,
        evidence: purity.issues.flatMap((issue) => issue.evidence).slice(0, 8),
      });
    }
  }

  return {
    passed: issues.length === 0,
    issues,
    kernel,
  };
}

export function buildBookKernelPromptBlock(config: Partial<BookConfig>): string {
  const kernel = resolveBookKernel({ config });
  return `BOOK INTELLIGENCE KERNEL — FORMAT LOCK
FORMAT_LOCK: ${kernel.bookFormat}
CONTENT_LOCK: ${kernel.contentLock}
STRUCTURE_LOCK: ${kernel.structureLock}
PROMISE_LOCK: ${kernel.promiseLock}
QUALITY_LOCK: ${kernel.qualityGate.checks.join("; ")}
CONTENT_MODE: ${kernel.contentMode}
BLUEPRINT_TYPE: ${kernel.blueprintType}
GENERATION_STRATEGY: ${kernel.generationStrategy}
STRUCTURE_MODEL: ${kernel.structureModel}
REQUIRES_CHARACTERS: ${kernel.requiresCharacters ? "yes" : "no"}
REQUIRES_PLOT: ${kernel.requiresPlot ? "yes" : "no"}
REQUIRES_SCENES: ${kernel.requiresScenes ? "yes" : "no"}
REQUIRES_POEMS: ${kernel.requiresPoems ? "yes" : "no"}
REQUIRES_EXERCISES: ${kernel.requiresExercises ? "yes" : "no"}
COMMERCIAL_PROMISE: ${kernel.commercialPromise}

PUBLISHING_STANDARDS:
- Ideal length: ${kernel.publishingStandards.idealLength}
- Ideal range: ${kernel.publishingStandards.idealChapterRange[0]}-${kernel.publishingStandards.idealChapterRange[1]} ${kernel.structureLock}
- Reader expectations: ${kernel.publishingStandards.readerExpectations.join("; ")}
- Amazon standards: ${kernel.publishingStandards.amazonStandards.join("; ")}

BESTSELLER_INTELLIGENCE:
- Metrics: ${kernel.bestsellerIntelligence.primaryMetrics.join("; ")}
- Scoring focus: ${kernel.bestsellerIntelligence.scoringFocus}
- Retention driver: ${kernel.bestsellerIntelligence.readerRetentionDriver}

COMMERCIAL_INTELLIGENCE:
- Target: ${kernel.commercialIntelligence.target}
- Positioning: ${kernel.commercialIntelligence.positioning}
- Differentiation: ${kernel.commercialIntelligence.differentiation}
- Amazon category: ${kernel.commercialIntelligence.amazonCategory}
- Keywords: ${kernel.commercialIntelligence.keywords.join(", ")}
- Market risk: ${kernel.commercialIntelligence.marketRisk}
- Commercial strength: ${kernel.commercialIntelligence.commercialStrength}

EXPORT_INTELLIGENCE:
- Layout profile: ${kernel.exportIntelligence.layoutProfile}
- Front matter: ${kernel.exportIntelligence.frontMatter.join(", ")}
- Back matter: ${kernel.exportIntelligence.backMatter.join(", ")}
- Formatting: ${kernel.exportIntelligence.formattingRules.join("; ")}

ALLOWED_STRUCTURES:
${kernel.allowedStructures.map((item) => `- ${item}`).join("\n")}

FORBIDDEN_STRUCTURES:
${kernel.forbiddenPatterns.map((item) => `- ${item}`).join("\n")}

QUALITY_BAR:
${kernel.qualityRules.map((item) => `- ${item}`).join("\n")}

QUALITY_LOCK_RULES:
${kernel.qualityLock.map((item) => `- ${item}`).join("\n")}

QUALITY_GATE:
${kernel.qualityGate.mustHave.map((item) => `- Must have: ${item}`).join("\n")}
${kernel.qualityGate.rejectIf.map((item) => `- Reject if: ${item}`).join("\n")}

COHERENCE_CONSTRAINTS:
- bookFormat viene prima del genere commerciale.
- Il genere colora il formato, non lo cambia.
- Non introdurre personaggi, trama, scene o worldbuilding quando il kernel li vieta.
- Non trasformare poesia, manuale, self-help, studio o workbook in romanzo.`;
}

export function getKernelTemplate(format: BookFormat): BookIntelligenceKernelSnapshot {
  return resolveBookKernel({ explicitBookFormat: format });
}
