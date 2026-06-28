import type { BookConfig } from "@/types/book";
import {
  resolveBookKernel,
  type BookFormat,
  type BookIntelligenceKernelSnapshot,
} from "./book-intelligence-kernel";

export type UniversalBookStudioId =
  | "narrative"
  | "poetry"
  | "transformation"
  | "professional_guide"
  | "workbook"
  | "study"
  | "memoir";

export type UniversalStudioFieldMode = "narrative" | "poetry" | "manual" | "workbook" | "study";

export interface UniversalBookStudioDefinition {
  id: UniversalBookStudioId;
  visibleName: string;
  objective: string;
  activationSignals: string[];
  generatorName: string;
  blueprintName: string;
  qualityGateName: string;
  exportProfile: string;
  fieldMode: UniversalStudioFieldMode;
  visibleFields: string[];
  forbiddenFields: string[];
  ui: {
    countLabel: string;
    sectionCountLabel?: string;
    ideaLabel: string;
    ideaPlaceholder: string;
    step2Title: string;
    step4Title: string;
    step4Description: string;
    promiseLabel: string;
    settingLabel: string;
    subjectLabel: string;
    methodLabel: string;
    formatNotice: string;
    handoffCopy: string;
  };
}

export interface ResolvedUniversalBookStudio {
  studio: UniversalBookStudioDefinition;
  kernel: BookIntelligenceKernelSnapshot;
}

const NARRATIVE_FIELDS = [
  "protagonists",
  "characters",
  "antagonist",
  "relationships",
  "conflict",
  "plot",
  "worldbuilding",
  "chapters",
  "subchapters",
  "ending",
];

const STUDIOS: Record<UniversalBookStudioId, UniversalBookStudioDefinition> = {
  narrative: {
    id: "narrative",
    visibleName: "ROMANZI E RACCONTI",
    objective: "Creare narrativa professionale con personaggi, trama, conflitto e payoff.",
    activationSignals: ["romanzo", "novella", "raccolta racconti", "fantasy", "thriller", "horror", "romance", "dark romance", "fantascienza", "giallo", "storico"],
    generatorName: "Narrative Generator",
    blueprintName: "Narrative Blueprint",
    qualityGateName: "Narrative Quality Gate",
    exportProfile: "Narrative Export",
    fieldMode: "narrative",
    visibleFields: NARRATIVE_FIELDS,
    forbiddenFields: [],
    ui: {
      countLabel: "Capitoli",
      ideaLabel: "Idea narrativa",
      ideaPlaceholder: "Es. Una nave-laboratorio torna vuota al porto. Nella camera 14 restano audiocassette, mappe antiche e iscrizioni che cambiano quando nessuno guarda...",
      step2Title: "Racconta la tua storia",
      step4Title: "Costruisci il cast",
      step4Description: "I personaggi nascono da DNA + idea + titolo e restano canonici nel passaggio a Book Forge.",
      promiseLabel: "Promessa narrativa base",
      settingLabel: "Ambientazione",
      subjectLabel: "Tipo protagonista / soggetto",
      methodLabel: "Dinamica centrale",
      formatNotice: "",
      handoffCopy: "Scriptora apre Book Forge con cast, genere, filone e tono gia' collegati.",
    },
  },
  poetry: {
    id: "poetry",
    visibleName: "POESIE E RACCOLTE",
    objective: "Creare raccolte poetiche complete con voce, immagini, ritmo e sezioni.",
    activationSignals: ["poesia", "raccolta poetica", "poesia contemporanea", "poesia classica", "poesia spirituale"],
    generatorName: "Poetry Collection Generator",
    blueprintName: "Poetry Blueprint",
    qualityGateName: "Poetry Purity Gate",
    exportProfile: "Poetry Export",
    fieldMode: "poetry",
    visibleFields: ["tema centrale", "voce poetica", "immagini ricorrenti", "simboli", "tono", "ritmo", "sezioni", "numero poesie", "promessa poetica"],
    forbiddenFields: ["cast", "personaggi", "protagonista", "antagonista", "trama", "finale", "promessa narrativa"],
    ui: {
      countLabel: "Numero poesie",
      sectionCountLabel: "Numero sezioni",
      ideaLabel: "Nucleo della raccolta",
      ideaPlaceholder: "Es. Una raccolta sul vuoto, il ritorno della luce, immagini d'acqua, stanze chiuse e rinascita.",
      step2Title: "Definisci la raccolta",
      step4Title: "Canone poetico",
      step4Description: "Niente cast: Scriptora usa voce, immagini ricorrenti, registro e arco emotivo.",
      promiseLabel: "Promessa poetica",
      settingLabel: "Immagini ricorrenti / campo simbolico",
      subjectLabel: "Voce poetica",
      methodLabel: "Tema centrale",
      formatNotice: "Formato poesia: POV, finale narrativo, protagonista e cast sono disattivati.",
      handoffCopy: "Scriptora apre Book Forge con voce poetica, sezioni, immagini e promessa gia' collegate.",
    },
  },
  transformation: {
    id: "transformation",
    visibleName: "GUIDE E CRESCITA PERSONALE",
    objective: "Aiutare il lettore a cambiare con trasformazione, strumenti ed esercizi.",
    activationSignals: ["self help", "narcisismo", "ansia", "relazioni tossiche", "psicologia", "crescita personale", "motivazione", "benessere"],
    generatorName: "Transformation Generator",
    blueprintName: "Transformation Blueprint",
    qualityGateName: "Transformation Quality Gate",
    exportProfile: "Guide Export",
    fieldMode: "manual",
    visibleFields: ["problema del lettore", "trasformazione", "metodo", "risultati", "esercizi", "strumenti pratici", "piano d'azione", "errori da evitare"],
    forbiddenFields: ["cast", "personaggi", "trama", "worldbuilding", "promessa narrativa"],
    ui: {
      countLabel: "Capitoli pratici",
      sectionCountLabel: "Esercizi / checklist",
      ideaLabel: "Problema lettore / trasformazione",
      ideaPlaceholder: "Es. Una guida per passare da ansia quotidiana a strumenti pratici di autoregolazione.",
      step2Title: "Definisci la trasformazione",
      step4Title: "Architettura del cambiamento",
      step4Description: "Niente cast: servono problema, metodo, esercizi, strumenti e risultati verificabili.",
      promiseLabel: "Promessa di trasformazione",
      settingLabel: "Esempi / casi / contesto applicativo",
      subjectLabel: "Problema del lettore",
      methodLabel: "Metodo / framework",
      formatNotice: "Formato trasformativo: personaggi, trama, POV e worldbuilding sono disattivati.",
      handoffCopy: "Scriptora apre Book Forge con problema, trasformazione, metodo ed esercizi gia' collegati.",
    },
  },
  professional_guide: {
    id: "professional_guide",
    visibleName: "MANUALI E GUIDE PROFESSIONALI",
    objective: "Trasferire competenze con framework, procedure, esempi e checklist.",
    activationSignals: ["manuale", "guida pratica", "business", "marketing", "leadership", "vendita", "startup", "finanza"],
    generatorName: "Professional Guide Generator",
    blueprintName: "Professional Guide Blueprint",
    qualityGateName: "Professional Guide Quality Gate",
    exportProfile: "Professional Export",
    fieldMode: "manual",
    visibleFields: ["problema", "metodo", "framework", "esempi", "casi studio", "procedure", "checklist", "implementazione"],
    forbiddenFields: ["protagonista", "cast", "trama", "promessa narrativa"],
    ui: {
      countLabel: "Capitoli pratici",
      sectionCountLabel: "Checklist / procedure",
      ideaLabel: "Problema professionale / argomento",
      ideaPlaceholder: "Es. Una guida pratica per costruire un funnel marketing con esempi, checklist e casi studio.",
      step2Title: "Definisci la competenza",
      step4Title: "Architettura professionale",
      step4Description: "Niente personaggi: servono metodo, framework, esempi, procedure e implementazione.",
      promiseLabel: "Promessa professionale",
      settingLabel: "Esempi / casi studio / contesto",
      subjectLabel: "Problema da risolvere",
      methodLabel: "Metodo / framework",
      formatNotice: "Formato professionale: protagonista, cast e trama sono disattivati.",
      handoffCopy: "Scriptora apre Book Forge con metodo, framework, procedure e checklist gia' collegati.",
    },
  },
  workbook: {
    id: "workbook",
    visibleName: "ESERCIZI E WORKBOOK",
    objective: "Far lavorare il lettore con schede, attivita', tracker e verifiche.",
    activationSignals: ["workbook", "planner", "diario guidato", "journal"],
    generatorName: "Workbook Generator",
    blueprintName: "Workbook Blueprint",
    qualityGateName: "Workbook Quality Gate",
    exportProfile: "Workbook Export",
    fieldMode: "workbook",
    visibleFields: ["esercizi", "schede", "attivita'", "tracker", "progressi", "verifiche"],
    forbiddenFields: ["trama", "personaggi", "protagonista", "promessa narrativa"],
    ui: {
      countLabel: "Schede",
      sectionCountLabel: "Attivita' per scheda",
      ideaLabel: "Obiettivo del workbook",
      ideaPlaceholder: "Es. Un workbook per trasformare autostima fragile in abitudini, esercizi e tracking settimanale.",
      step2Title: "Definisci il percorso pratico",
      step4Title: "Architettura delle attivita'",
      step4Description: "Niente personaggi: servono schede, esercizi, domande, tracker e completabilita'.",
      promiseLabel: "Promessa pratica",
      settingLabel: "Esercizi / tracker ricorrenti",
      subjectLabel: "Problema del lettore",
      methodLabel: "Metodo / framework",
      formatNotice: "Formato workbook: cast, POV e finale narrativo sono disattivati.",
      handoffCopy: "Scriptora apre Book Forge con schede, esercizi e progress tracker gia' collegati.",
    },
  },
  study: {
    id: "study",
    visibleName: "STUDIO E FORMAZIONE",
    objective: "Insegnare con moduli, lezioni, quiz, flashcard, simulazioni e verifiche.",
    activationSignals: ["materiale studio", "preparazione esami", "riassunti", "accademico", "concorsi", "universita"],
    generatorName: "Study Generator",
    blueprintName: "Study Blueprint",
    qualityGateName: "Study Quality Gate",
    exportProfile: "Study Export",
    fieldMode: "study",
    visibleFields: ["moduli", "lezioni", "quiz", "flashcard", "simulazioni", "verifiche"],
    forbiddenFields: ["narrativa", "cast", "trama", "personaggi"],
    ui: {
      countLabel: "Moduli",
      sectionCountLabel: "Verifiche per modulo",
      ideaLabel: "Materiale / materia da studiare",
      ideaPlaceholder: "Es. Materiale per esame di biologia: cellula, mitosi, meiosi, genetica e domande d'esame.",
      step2Title: "Definisci il materiale",
      step4Title: "Architettura didattica",
      step4Description: "Niente cast: servono moduli, quiz, flashcard, livello studente e simulazioni.",
      promiseLabel: "Promessa di apprendimento",
      settingLabel: "Concetti chiave / prerequisiti",
      subjectLabel: "Livello studente",
      methodLabel: "Metodo didattico",
      formatNotice: "Formato studio: personaggi, POV e finale narrativo sono disattivati.",
      handoffCopy: "Scriptora apre Book Forge con moduli, quiz, flashcard e verifiche gia' collegati.",
    },
  },
  memoir: {
    id: "memoir",
    visibleName: "BIOGRAFIE E MEMORIE",
    objective: "Raccontare una vita attraverso eventi chiave, svolte e consapevolezza.",
    activationSignals: ["memoir", "autobiografia", "biografia"],
    generatorName: "Memoir Generator",
    blueprintName: "Memoir Blueprint",
    qualityGateName: "Memoir Quality Gate",
    exportProfile: "Memoir Export",
    fieldMode: "manual",
    visibleFields: ["periodi della vita", "eventi chiave", "svolte", "lezioni apprese", "trasformazioni"],
    forbiddenFields: ["romanzo inventato", "cast fiction", "mitologia fantasy"],
    ui: {
      countLabel: "Periodi / capitoli",
      sectionCountLabel: "Scene di vita / snodi",
      ideaLabel: "Vita / periodo da raccontare",
      ideaPlaceholder: "Es. Un memoir su perdita, ricostruzione e identita' attraverso tre periodi di vita decisivi.",
      step2Title: "Definisci la memoria",
      step4Title: "Architettura autobiografica",
      step4Description: "Niente cast fiction: servono periodi, eventi chiave, svolte, memoria e consapevolezza.",
      promiseLabel: "Promessa memoir",
      settingLabel: "Luoghi / oggetti / memorie ricorrenti",
      subjectLabel: "Voce autobiografica",
      methodLabel: "Tema personale",
      formatNotice: "Formato memoir: persone e scene reali sono ammesse, ma niente romanzo inventato.",
      handoffCopy: "Scriptora apre Book Forge con voce, periodi, eventi chiave e arco di consapevolezza gia' collegati.",
    },
  },
};

const TRANSFORMATION_FORMATS = new Set<BookFormat>(["self_help", "psychology_guide", "spiritual_book", "devotional"]);
const PROFESSIONAL_FORMATS = new Set<BookFormat>(["manual", "business_book", "cookbook", "travel_guide", "research_book", "historical_analysis", "essay", "hybrid_book", "mixed_or_unknown"]);
const STUDY_FORMATS = new Set<BookFormat>(["study_material", "academic_summary", "academic_book"]);
const MEMOIR_FORMATS = new Set<BookFormat>(["memoir", "biography", "autobiography"]);

function normalize(value: unknown): string {
  return String(value || "").toLowerCase().replace(/[_\s]+/g, "-");
}

export function getUniversalBookStudio(id: UniversalBookStudioId): UniversalBookStudioDefinition {
  return STUDIOS[id];
}

export function listUniversalBookStudios(): UniversalBookStudioDefinition[] {
  return Object.values(STUDIOS);
}

export function resolveUniversalBookStudio(input: {
  config?: Partial<BookConfig> | null;
  idea?: string;
  explicitBookFormat?: BookFormat | string | null;
}): ResolvedUniversalBookStudio {
  const kernel = resolveBookKernel(input);
  const identity = [
    kernel.bookFormat,
    kernel.genre,
    kernel.subgenre,
    input.config?.genre,
    input.config?.subcategory,
    input.config?.subgenre,
    input.idea,
  ].map(normalize).join(" ");

  let studioId: UniversalBookStudioId = "narrative";
  if (kernel.bookFormat === "poetry_collection" || /\bpoesia\b|\bpoetry\b|\braccolta-poetica\b/.test(identity)) {
    studioId = "poetry";
  } else if (kernel.bookFormat === "workbook" || kernel.bookFormat === "journal") {
    studioId = "workbook";
  } else if (STUDY_FORMATS.has(kernel.bookFormat)) {
    studioId = "study";
  } else if (MEMOIR_FORMATS.has(kernel.bookFormat)) {
    studioId = "memoir";
  } else if (TRANSFORMATION_FORMATS.has(kernel.bookFormat)) {
    studioId = "transformation";
  } else if (PROFESSIONAL_FORMATS.has(kernel.bookFormat)) {
    studioId = "professional_guide";
  } else if (!kernel.requiresPlot && kernel.contentMode === "educational") {
    studioId = "study";
  } else if (!kernel.requiresPlot && kernel.contentMode === "practical") {
    studioId = "professional_guide";
  } else if (!kernel.requiresPlot && kernel.contentMode === "reflective") {
    studioId = "memoir";
  }

  return { studio: STUDIOS[studioId], kernel };
}

export function buildUniversalStudioContract(input: {
  config?: Partial<BookConfig> | null;
  idea?: string;
  explicitBookFormat?: BookFormat | string | null;
}): string {
  const { studio, kernel } = resolveUniversalBookStudio(input);
  return `UNIVERSAL BOOK STUDIO LOCK
STUDIO_ID: ${studio.id}
STUDIO_NAME: ${studio.visibleName}
GENERATOR: ${studio.generatorName}
BLUEPRINT: ${studio.blueprintName}
KERNEL_BLUEPRINT_TYPE: ${kernel.blueprintType}
KERNEL_GENERATION_STRATEGY: ${kernel.generationStrategy}
QUALITY_GATE: ${studio.qualityGateName}
EXPORT_PROFILE: ${studio.exportProfile}
VISIBLE_FIELDS: ${studio.visibleFields.join(", ")}
FORBIDDEN_FIELDS: ${studio.forbiddenFields.join(", ") || "none"}`;
}
