import type { BookConfig } from "@/types/book";
import { normalizeBookConfig } from "@/lib/book-config-studio/defaults";
import { resolveBookTypeDefinition } from "@/lib/book-type-engine";

export interface BlueprintReadinessReport {
  ready: boolean;
  score: number;
  missingFields: string[];
  weakFields: string[];
  suggestions: Record<string, string>;
  genreSpecificWarnings: string[];
  canAutoComplete: boolean;
}

export interface AutoCompleteBookConfigResult {
  config: BookConfig;
  completedFields: string[];
  notes: string[];
}

const SUPPORTED_LANGUAGES = new Set(["English", "Italian", "Spanish", "French", "German"]);

function compact(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function isDefaultTitle(value: unknown): boolean {
  const title = compact(value).toLowerCase();
  return !title || title === "romanzo senza titolo" || title === "untitled" || title === "senza titolo";
}

function meaningful(value: unknown, min = 8): boolean {
  return compact(value).length >= min;
}

function hasNamedCharacter(config: BookConfig): boolean {
  return Boolean(
    config.characters?.some((character) => compact(character.name).length >= 2)
      || meaningful(config.characterBibleText, 24),
  );
}

function isItalian(config: BookConfig): boolean {
  return String(config.language || "").toLowerCase().includes("ital");
}

function labelFor(config: BookConfig, italian: string, english: string): string {
  return isItalian(config) ? italian : english;
}

function inferCategoryForFamily(family: string): string {
  if (family === "narrative" || family === "poetry") return "Fiction";
  if (family === "educational") return "Education";
  if (family === "manual" || family === "cookbook") return "Manuali";
  return "Non-Fiction";
}

function defaultTargetReader(config: BookConfig, family: string): string {
  const title = compact(config.title) || "questo libro";
  if (family === "educational") return `Studenti e lettori che vogliono capire ${title} con spiegazioni progressive, esempi e verifiche.`;
  if (family === "manual") return `Lettori pratici che vogliono applicare ${title} con passaggi chiari, esempi e checklist.`;
  if (family === "poetry") return `Lettori sensibili a immagini, ritmo e una raccolta poetica coerente intorno a ${title}.`;
  if (family === "nonfiction") return `Lettori che cercano una trasformazione concreta, esempi pratici e un metodo affidabile su ${title}.`;
  return `Lettori di ${config.genre} che cercano una storia coerente, emotiva e guidata da conflitto, scelte e conseguenze.`;
}

function defaultTone(config: BookConfig, family: string): string {
  if (family === "educational") return "chiaro, didattico, progressivo, concreto";
  if (family === "manual") return "pratico, preciso, ordinato, autorevole";
  if (family === "poetry") return "evocativo, concreto, musicale, coerente";
  if (config.genre === "thriller" || config.genre === "horror") return "teso, cinematografico, essenziale, atmosferico";
  if (config.genre === "romance" || config.genre === "dark-romance") return "intimo, trattenuto, sensoriale, slow burn";
  return "editoriale, chiaro, coinvolgente";
}

function defaultIdea(config: BookConfig, family: string): string {
  const title = compact(config.title) || "il libro";
  if (family === "educational") return `Guidare il lettore nello studio di ${title} con definizioni, esempi, recap ed esercizi.`;
  if (family === "manual") return `Offrire un percorso pratico e progressivo per applicare ${title} senza confusione.`;
  if (family === "poetry") return `Costruire una raccolta intorno a ${title}, con immagini ricorrenti e progressione emotiva.`;
  if (family === "nonfiction") return `Aiutare il lettore a ottenere un cambiamento concreto attraverso un metodo chiaro su ${title}.`;
  return `Raccontare ${title} attraverso un conflitto centrale, una scelta difficile e conseguenze che cambiano i personaggi.`;
}

export function validateBookReadinessForBlueprint(input: Partial<BookConfig> | BookConfig): BlueprintReadinessReport {
  const config = normalizeBookConfig(input);
  const definition = resolveBookTypeDefinition(config.genre, config.subcategory, config.subgenre, config.bookTypeId);
  const family = definition.family;
  const missingFields: string[] = [];
  const weakFields: string[] = [];
  const genreSpecificWarnings: string[] = [];
  const suggestions: Record<string, string> = {};

  if (isDefaultTitle(input.title ?? config.title)) {
    missingFields.push("Titolo libro");
    suggestions.title = "Dai al libro un titolo provvisorio concreto. Puoi cambiarlo più avanti.";
  }

  if (!SUPPORTED_LANGUAGES.has(String(input.language || config.language))) {
    missingFields.push("Lingua");
    suggestions.language = "Scegli la lingua prima di generare: il blueprint userà quella come language lock.";
  }

  if (!compact(input.genre ?? config.genre)) {
    missingFields.push("Tipo/genere libro");
    suggestions.genre = "Scegli il tipo di libro: romanzo, romance, thriller, self-help, manuale, poesia, studio...";
  }

  if (Number(input.numberOfChapters ?? config.numberOfChapters) < 1) {
    missingFields.push("Struttura capitoli");
    suggestions.numberOfChapters = "Imposta una struttura automatica o almeno 1 capitolo.";
  }

  const premise = compact(config.idea || config.subtitle);
  if (!meaningful(premise, 12)) {
    weakFields.push("Idea centrale / promessa");
    suggestions.idea = "Aggiungi una premessa, promessa o obiettivo: cosa deve cambiare per il lettore o per i personaggi?";
  }

  if (!meaningful(config.targetReader, 12)) {
    weakFields.push("Target lettore");
    suggestions.targetReader = "Definisci chi leggerà il libro e quale aspettativa porta con sé.";
  }

  if (!meaningful(config.tone, 8)) {
    weakFields.push("Tono/stile");
    suggestions.tone = "Scegli un tono coerente: dark, didattico, pratico, cinematografico, poetico...";
  }

  if (!meaningful(config.subcategory, 4) || /^general$/i.test(config.subcategory)) {
    weakFields.push("Sottogenere/nicchia");
    suggestions.subcategory = "Rendi più specifica la nicchia: slow burn, gothic thriller, manuale tecnico, studio universitario...";
  }

  if (family === "narrative") {
    if (!hasNamedCharacter(config)) {
      weakFields.push("Protagonista/personaggi");
      suggestions.characters = "Aggiungi almeno protagonista, desiderio e ostacolo. Bastano poche righe.";
    }
    if (!/(conflitto|ostacolo|minaccia|mistero|scelta|segreto|paura|posta|twist|desiderio|amore|pericolo)/i.test(`${config.idea} ${config.subtitle} ${config.subgenre}`)) {
      genreSpecificWarnings.push("Per la narrativa manca un conflitto esplicito: il blueprint rischia capitoli belli ma fermi.");
    }
    if ((config.genre === "romance" || config.genre === "dark-romance") && !/(slow|burn|trope|ostacol|desiderio|rottura|heat|tensione|attrito)/i.test(`${config.idea} ${config.subgenre} ${config.subcategory}`)) {
      genreSpecificWarnings.push("Romance/Dark Romance: definisci trope, ostacolo emotivo e velocità del payoff.");
    }
    if ((config.genre === "thriller" || config.genre === "horror") && !/(minaccia|mistero|indizio|twist|reveal|pericolo|violenza|dark|sospetto)/i.test(`${config.idea} ${config.subgenre} ${config.subcategory}`)) {
      genreSpecificWarnings.push("Thriller/Horror: manca minaccia, mistero o escalation.");
    }
    if ((config.genre === "fantasy" || config.genre === "sci-fi") && !/(mondo|regola|magia|tecnologia|fazione|viaggio|potere|costo)/i.test(`${config.idea} ${config.subgenre} ${config.subcategory}`)) {
      genreSpecificWarnings.push("Fantasy/Sci-fi: chiarisci regole del mondo, posta in gioco e costi.");
    }
  }

  if (family === "nonfiction") {
    if (!/(metodo|framework|passi|trasform|problema|beneficio|eserciz|checklist|risultato)/i.test(`${config.idea} ${config.subtitle} ${config.targetReader}`)) {
      genreSpecificWarnings.push("Non-fiction/Self-help: serve una promessa trasformativa più concreta.");
    }
  }

  if (family === "educational" || family === "manual") {
    if (!/(livello|student|universit|scuola|lezion|modul|eserciz|verifica|prerequis|glossario|step)/i.test(`${config.idea} ${config.targetReader} ${config.subcategory}`)) {
      genreSpecificWarnings.push("Manuale/Studio: indica livello, prerequisiti o tipo di esercizi/verifiche.");
    }
  }

  if (family === "poetry") {
    if (!/(tema|voce|immagin|sezion|ritmo|raccolta|simbol|arco emotivo)/i.test(`${config.idea} ${config.subcategory} ${config.tone}`)) {
      genreSpecificWarnings.push("Poesia: definisci tema, voce poetica e immagini ricorrenti; non usare struttura da romanzo.");
    }
  }

  const score = Math.max(
    0,
    Math.min(100, 100 - missingFields.length * 22 - weakFields.length * 7 - genreSpecificWarnings.length * 5),
  );
  const canAutoComplete = missingFields.length === 0 && (weakFields.length > 0 || genreSpecificWarnings.length > 0);

  return {
    ready: missingFields.length === 0 && score >= 75,
    score,
    missingFields,
    weakFields,
    suggestions,
    genreSpecificWarnings,
    canAutoComplete,
  };
}

export function autoCompleteBookConfig(input: Partial<BookConfig> | BookConfig): AutoCompleteBookConfigResult {
  const config = normalizeBookConfig(input);
  const definition = resolveBookTypeDefinition(config.genre, config.subcategory, config.subgenre, config.bookTypeId);
  const next: BookConfig = { ...config };
  const completedFields: string[] = [];
  const notes: string[] = [];

  if (!meaningful(next.targetReader, 12)) {
    next.targetReader = defaultTargetReader(next, definition.family);
    completedFields.push("Target lettore");
  }
  if (!meaningful(next.tone, 8) || next.tone === "editoriale, chiaro, coinvolgente") {
    next.tone = defaultTone(next, definition.family);
    completedFields.push("Tono/stile");
  }
  if (!meaningful(next.idea, 12)) {
    next.idea = defaultIdea(next, definition.family);
    completedFields.push("Idea centrale");
    notes.push("Idea centrale creata come traccia provvisoria: rivedila prima di pubblicare.");
  }
  if (!meaningful(next.subcategory, 4) || /^general$/i.test(next.subcategory)) {
    next.subcategory = definition.label || next.subgenre || next.genre;
    completedFields.push("Sottogenere/nicchia");
  }
  if (!meaningful(next.category, 3)) {
    next.category = inferCategoryForFamily(definition.family);
    completedFields.push("Categoria");
  }
  if (next.numberOfChapters < 1) {
    next.numberOfChapters = definition.family === "poetry" ? 5 : definition.family === "educational" ? 8 : 12;
    completedFields.push("Struttura capitoli");
  }
  if (!meaningful(next.authorStyle, 4)) {
    next.authorStyle = labelFor(next, "Autorevole ma umano", "Authoritative but human");
    completedFields.push("Stile autore");
  }

  return { config: { ...next, configStatus: "validated" }, completedFields, notes };
}
