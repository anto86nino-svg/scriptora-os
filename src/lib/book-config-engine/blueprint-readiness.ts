import type { BookConfig } from "@/types/book";
import { normalizeBookConfig } from "@/lib/book-config-studio/defaults";
import { resolveBookTypeDefinition } from "@/lib/book-type-engine";

export interface BlueprintReadinessReport {
  ready: boolean;
  score: number;
  missingFields: string[];
  weakFields: string[];
  blockingIssues: string[];
  suggestions: Record<string, string>;
  autoCompletedFields: string[];
  genreSpecificWarnings: string[];
  blueprintConfigPreview: BlueprintReadyConfigPreview;
  canGenerate: boolean;
  canAutoComplete: boolean;
}

export interface AutoCompleteBookConfigResult {
  config: BookConfig;
  completedFields: string[];
  assumptions: string[];
  stillMissing: string[];
  confidence: number;
  notes: string[];
}

export interface BlueprintReadyConfigPreview {
  bookType: string;
  family: string;
  genre: string;
  subgenre: string;
  language: string;
  title: string;
  premise: string;
  targetReader: string;
  tone: string;
  structureMode: string;
  chapterCount: number;
  estimatedLength: string;
  pointOfView: string;
  narrativeTense: string;
  fictionConfig?: Record<string, string>;
  romanceConfig?: Record<string, string>;
  thrillerConfig?: Record<string, string>;
  fantasyConfig?: Record<string, string>;
  nonfictionConfig?: Record<string, string>;
  studyConfig?: Record<string, string>;
  poetryConfig?: Record<string, string>;
  shortStoriesConfig?: Record<string, string>;
  sourceCompleteness: number;
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

function defaultChapterCount(family: string, genre: string): number {
  if (family === "poetry") return 5;
  if (family === "educational") return 8;
  if (family === "manual" || family === "cookbook") return 10;
  if (family === "nonfiction") return 12;
  if (genre === "thriller" || genre === "horror") return 24;
  if (genre === "romance" || genre === "dark-romance") return 28;
  if (genre === "fantasy" || genre === "sci-fi") return 30;
  return 18;
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

function inferFromText(config: BookConfig, patterns: RegExp[], fallback: string): string {
  const hay = compact(`${config.idea} ${config.subtitle} ${config.subcategory} ${config.subgenre} ${config.targetReader}`);
  const found = patterns.find((pattern) => pattern.test(hay));
  return found ? hay : fallback;
}

function isShortStoryCollection(config: BookConfig): boolean {
  return /raccolta racconti|racconti brevi|short stories|short story|stories collection/i.test(
    `${config.genre} ${config.subcategory} ${config.subgenre} ${config.idea} ${config.subtitle}`,
  );
}

export function normalizeBookConfigForBlueprint(input: Partial<BookConfig> | BookConfig): {
  config: BookConfig;
  preview: BlueprintReadyConfigPreview;
  warnings: string[];
} {
  const config = normalizeBookConfig(input);
  const definition = resolveBookTypeDefinition(config.genre, config.subcategory, config.subgenre, config.bookTypeId);
  const family = definition.family;
  const shortStories = isShortStoryCollection(config);
  const chapterCount = Math.max(1, Number(config.numberOfChapters || (shortStories ? 10 : defaultChapterCount(family, config.genre))));
  const premise = compact(config.idea || config.subtitle || defaultIdea(config, family));
  const preview: BlueprintReadyConfigPreview = {
    bookType: definition.label,
    family,
    genre: config.genre,
    subgenre: compact(config.subgenre || config.subcategory || definition.label),
    language: config.language,
    title: compact(config.title),
    premise,
    targetReader: compact(config.targetReader),
    tone: compact(config.tone),
    structureMode: config.subchaptersEnabled ? "capitoli con sottocapitoli" : "capitoli lineari",
    chapterCount,
    estimatedLength: config.bookLength === "custom" ? `${config.customTotalWords || "custom"} parole` : config.bookLength,
    pointOfView: inferFromText(config, [/prima persona/i, /terza persona/i, /pov/i], "POV coerente col genere, da confermare nella revisione"),
    narrativeTense: inferFromText(config, [/presente/i, /passato/i, /past tense/i, /present tense/i], "Tempo narrativo coerente e stabile"),
    sourceCompleteness: 0,
  };

  if (family === "narrative") {
    preview.fictionConfig = {
      protagonist: hasNamedCharacter(config) ? "Personaggi presenti nella configurazione" : "Protagonista provvisorio da completare",
      conflict: inferFromText(config, [/conflitto|ostacolo|minaccia|mistero|scelta|segreto|posta|pericolo/i], "Conflitto centrale da esplicitare"),
      stakes: inferFromText(config, [/posta|perdere|rischio|conseguenza|costo/i], "Posta in gioco personale e narrativa"),
      endingDirection: inferFromText(config, [/finale|payoff|rivelazione|climax|riconciliazione/i], "Direzione finale coerente con la promessa narrativa"),
    };
    if (config.genre === "romance" || config.genre === "dark-romance") {
      preview.romanceConfig = {
        trope: inferFromText(config, [/second chance|enemies|friends|small town|forced proximity|slow burn|trope/i], "trope romance da confermare"),
        burnSpeed: /fast|rapido/i.test(premise) ? "fast burn controllato" : "slow burn",
        heatLevel: inferFromText(config, [/heat|spicy|clean|sensuale|esplicito/i], "heat level medio, modificabile"),
        emotionalObstacle: inferFromText(config, [/paura|ferita|trauma|fiducia|abbandono|segreto/i], "ostacolo emotivo progressivo"),
        externalObstacle: inferFromText(config, [/famiglia|lavoro|distanza|paese|nemico|rischio/i], "ostacolo esterno concreto"),
        payoffDirection: "payoff guadagnato, non confessione immediata",
      };
    }
    if (config.genre === "thriller" || config.genre === "horror") {
      preview.thrillerConfig = {
        threat: inferFromText(config, [/minaccia|pericolo|killer|entità|paura|sospetto/i], "minaccia/forza antagonista da rendere esplicita"),
        mystery: inferFromText(config, [/mistero|indizio|prova|false lead|reveal|twist/i], "mistero con indizi e reveal progressivo"),
        escalation: "pressione crescente capitolo per capitolo",
        darkLevel: inferFromText(config, [/dark|violenza|cruento|psicologico|gotico/i], "livello dark controllato"),
      };
    }
    if (config.genre === "fantasy" || config.genre === "sci-fi") {
      preview.fantasyConfig = {
        worldPremise: inferFromText(config, [/mondo|regno|pianeta|futuro|sistema|società/i], "mondo/speculative premise da esplicitare"),
        ruleSystem: inferFromText(config, [/regola|magia|tecnologia|potere|limite|costo/i], "regole del mondo con limiti e costi"),
        factions: inferFromText(config, [/fazione|gilda|impero|ribelli|ordine|corporazione/i], "forze/fazioni da definire"),
        antiInfodump: "worldbuilding attraverso conflitto e conseguenze",
      };
    }
  }

  if (family === "nonfiction") {
    preview.nonfictionConfig = {
      readerProblem: inferFromText(config, [/problema|fatica|blocco|bisogno|dolore/i], "problema lettore da esplicitare"),
      promise: premise,
      method: inferFromText(config, [/metodo|framework|passi|sistema|protocollo/i], "metodo/framework da chiarire"),
      practicalLevel: inferFromText(config, [/eserciz|checklist|esempi|azioni|pratico/i], "alto livello pratico"),
    };
  }

  if (family === "educational" || family === "manual") {
    preview.studyConfig = {
      subject: compact(config.subcategory || config.title),
      level: inferFromText(config, [/scuola|universit|base|intermedio|avanzato|principiant/i], "livello da confermare"),
      learningObjective: premise,
      prerequisites: inferFromText(config, [/prerequis|prima di|serve sapere|base/i], "prerequisiti minimi da definire"),
      exercises: inferFromText(config, [/quiz|eserciz|verifica|domande|simulazioni/i], "esercizi, quiz e recap"),
    };
  }

  if (family === "poetry") {
    preview.poetryConfig = {
      theme: premise,
      poeticVoice: inferFromText(config, [/voce|liric|spoken|intima|minimal|simbol/i], "voce poetica coerente"),
      collectionStructure: inferFromText(config, [/sezion|raccolta|ciclo|parte/i], "raccolta in sezioni emotive"),
      recurringImages: inferFromText(config, [/immagin|simbol|stanze|mare|luce|ombra|corpo/i], "immagini ricorrenti da raffinare"),
      emotionalArc: "progressione emotiva, non struttura ad atti da romanzo",
    };
  }

  if (shortStories) {
    preview.shortStoriesConfig = {
      thread: inferFromText(config, [/filo|tema|motivo|ossessione|domanda/i], "filo conduttore della raccolta da confermare"),
      storyCount: String(chapterCount),
      varietyStrategy: "variazione di protagonisti, conflitti o prospettive senza perdere coerenza tematica",
      orderingLogic: inferFromText(config, [/ordine|progressione|ciclo|sezion/i], "ordine emotivo/editoriale della raccolta"),
    };
  }

  const filled = [
    preview.title,
    preview.language,
    preview.genre,
    preview.subgenre,
    preview.premise,
    preview.targetReader,
    preview.tone,
    preview.chapterCount > 0 ? "chapters" : "",
  ].filter(Boolean).length;
  preview.sourceCompleteness = Math.round((filled / 8) * 100);

  return { config: { ...config, numberOfChapters: chapterCount }, preview, warnings: [] };
}

export function validateBookReadinessForBlueprint(input: Partial<BookConfig> | BookConfig): BlueprintReadinessReport {
  const { config, preview } = normalizeBookConfigForBlueprint(input);
  const family = preview.family;
  const missingFields: string[] = [];
  const weakFields: string[] = [];
  const blockingIssues: string[] = [];
  const genreSpecificWarnings: string[] = [];
  const suggestions: Record<string, string> = {};

  if (isDefaultTitle(input.title ?? config.title)) {
    missingFields.push("Titolo libro");
    blockingIssues.push("Titolo libro mancante");
    suggestions.title = "Dai al libro un titolo provvisorio concreto. Puoi cambiarlo più avanti.";
  }

  if (!SUPPORTED_LANGUAGES.has(String(input.language || config.language))) {
    missingFields.push("Lingua");
    blockingIssues.push("Lingua non impostata");
    suggestions.language = "Scegli la lingua prima di generare: il blueprint userà quella come language lock.";
  }

  if (!compact(input.genre ?? config.genre)) {
    missingFields.push("Tipo/genere libro");
    blockingIssues.push("Tipo libro non riconosciuto");
    suggestions.genre = "Scegli il tipo di libro: romanzo, romance, thriller, self-help, manuale, poesia, studio...";
  }

  if (Number(input.numberOfChapters ?? config.numberOfChapters) < 1) {
    missingFields.push("Struttura capitoli");
    blockingIssues.push("Struttura capitoli non valida");
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

  if (isShortStoryCollection(config) && !/(filo|tema|racconti|storie|ordine|varietà|raccolta)/i.test(`${config.idea} ${config.subcategory} ${config.subgenre}`)) {
    genreSpecificWarnings.push("Raccolta racconti: definisci filo conduttore, varietà delle storie e ordine della raccolta.");
  }

  const score = Math.max(
    0,
    Math.min(100, 100 - blockingIssues.length * 24 - missingFields.length * 12 - weakFields.length * 6 - genreSpecificWarnings.length * 4),
  );
  const canAutoComplete = blockingIssues.length === 0 && (weakFields.length > 0 || genreSpecificWarnings.length > 0 || score < 90);
  const ready = blockingIssues.length === 0 && score >= 75;

  return {
    ready,
    score,
    missingFields,
    weakFields,
    blockingIssues,
    suggestions,
    autoCompletedFields: [],
    genreSpecificWarnings,
    blueprintConfigPreview: preview,
    canGenerate: ready,
    canAutoComplete,
  };
}

export function autoCompleteBookConfig(input: Partial<BookConfig> | BookConfig): AutoCompleteBookConfigResult {
  return autoCompleteBookConfigForBlueprint(input);
}

export function autoCompleteBookConfigForBlueprint(input: Partial<BookConfig> | BookConfig): AutoCompleteBookConfigResult {
  const config = normalizeBookConfig(input);
  const definition = resolveBookTypeDefinition(config.genre, config.subcategory, config.subgenre, config.bookTypeId);
  const next: BookConfig = { ...config };
  const completedFields: string[] = [];
  const assumptions: string[] = [];
  const notes: string[] = [];

  if (!meaningful(next.targetReader, 12)) {
    next.targetReader = defaultTargetReader(next, definition.family);
    completedFields.push("Target lettore");
    assumptions.push("Target lettore dedotto da titolo, genere e famiglia libro.");
  }
  if (!meaningful(next.tone, 8) || next.tone === "editoriale, chiaro, coinvolgente") {
    next.tone = defaultTone(next, definition.family);
    completedFields.push("Tono/stile");
    assumptions.push(`Tono impostato per ${definition.label}.`);
  }
  if (!meaningful(next.idea, 12)) {
    next.idea = defaultIdea(next, definition.family);
    completedFields.push("Idea centrale");
    notes.push("Idea centrale creata come traccia provvisoria: rivedila prima di pubblicare.");
    assumptions.push("Premessa provvisoria costruita dal titolo.");
  }
  if (!meaningful(next.subcategory, 4) || /^general$/i.test(next.subcategory)) {
    next.subcategory = definition.label || next.subgenre || next.genre;
    completedFields.push("Sottogenere/nicchia");
    assumptions.push("Nicchia allineata alla definizione libro più vicina.");
  }
  if (!meaningful(next.category, 3)) {
    next.category = inferCategoryForFamily(definition.family);
    completedFields.push("Categoria");
  }
  if (next.numberOfChapters < 1 || (definition.family === "poetry" && next.numberOfChapters > 16)) {
    next.numberOfChapters = defaultChapterCount(definition.family, next.genre);
    completedFields.push("Struttura capitoli");
    assumptions.push(`Struttura consigliata: ${next.numberOfChapters} sezioni/capitoli.`);
  }
  if (isShortStoryCollection(next) && (!Number(input.numberOfChapters) || next.numberOfChapters > 14)) {
    next.numberOfChapters = 10;
    completedFields.push("Struttura raccolta racconti");
    assumptions.push("Raccolta impostata su 10 racconti/sezioni con filo editoriale comune.");
  }
  if (!meaningful(next.authorStyle, 4)) {
    next.authorStyle = labelFor(next, "Autorevole ma umano", "Authoritative but human");
    completedFields.push("Stile autore");
  }

  if (definition.family === "narrative" && !hasNamedCharacter(next)) {
    const title = compact(next.title) || "il libro";
    next.characterBibleText = `Protagonista provvisorio: una figura centrale legata a "${title}", con desiderio, ferita e scelta da rifinire prima della scrittura.`;
    completedFields.push("Protagonista/personaggi");
    assumptions.push("Personaggio centrale provvisorio creato per evitare blueprint narrativi senza agente.");
  }

  if (next.genre === "romance" || next.genre === "dark-romance") {
    if (!/slow|burn|trope|ostacol|desiderio|rottura|heat|tensione|attrito/i.test(`${next.idea} ${next.subgenre} ${next.subcategory}`)) {
      next.idea = `${next.idea} Dinamica romance: slow burn, ostacolo emotivo, ostacolo esterno, punto di rottura e payoff guadagnato.`;
      completedFields.push("Dinamica romance");
    }
  }

  if (next.genre === "thriller" || next.genre === "horror") {
    if (!/minaccia|mistero|indizio|twist|reveal|pericolo|violenza|dark|sospetto/i.test(`${next.idea} ${next.subgenre} ${next.subcategory}`)) {
      next.idea = `${next.idea} Struttura tensione: minaccia chiara, indizi, false lead, escalation, reveal e aftermath.`;
      completedFields.push("Minaccia/escalation");
    }
  }

  if (next.genre === "fantasy" || next.genre === "sci-fi") {
    if (!/mondo|regola|magia|tecnologia|fazione|viaggio|potere|costo/i.test(`${next.idea} ${next.subgenre} ${next.subcategory}`)) {
      next.idea = `${next.idea} Worldbuilding: regole del mondo, limiti, costo del potere/tecnologia, fazioni e scoperta progressiva senza infodump.`;
      completedFields.push("Worldbuilding minimo");
    }
  }

  if (definition.family === "nonfiction" && !/metodo|framework|passi|trasform|problema|beneficio|eserciz|checklist|risultato/i.test(`${next.idea} ${next.subtitle} ${next.targetReader}`)) {
    next.idea = `${next.idea} Metodo pratico: problema del lettore, promessa, framework, esempi, esercizi e takeaway.`;
    completedFields.push("Metodo/framework");
  }

  if ((definition.family === "educational" || definition.family === "manual") && !/livello|student|universit|scuola|lezion|modul|eserciz|verifica|prerequis|glossario|step/i.test(`${next.idea} ${next.targetReader} ${next.subcategory}`)) {
    next.idea = `${next.idea} Percorso didattico: livello, prerequisiti, moduli, spiegazioni progressive, esercizi, quiz e glossario.`;
    completedFields.push("Struttura didattica");
  }

  if (definition.family === "poetry" && !/tema|voce|immagin|sezion|ritmo|raccolta|simbol|arco emotivo/i.test(`${next.idea} ${next.subcategory} ${next.tone}`)) {
    next.idea = `${next.idea} Raccolta poetica: tema, voce, sezioni, immagini ricorrenti e arco emotivo simbolico.`;
    completedFields.push("Struttura poetica");
  }

  if (isShortStoryCollection(next) && !/filo|tema|racconti|storie|ordine|varietà|raccolta/i.test(`${next.idea} ${next.subcategory} ${next.subgenre}`)) {
    next.idea = `${next.idea} Raccolta racconti: filo conduttore, varietà controllata, ordine editoriale e promessa specifica per ogni storia.`;
    completedFields.push("Filo raccolta racconti");
  }

  const finalReport = validateBookReadinessForBlueprint({ ...next, configStatus: "validated" });

  return {
    config: { ...next, configStatus: "validated" },
    completedFields: Array.from(new Set(completedFields)),
    assumptions,
    stillMissing: [...finalReport.blockingIssues, ...finalReport.weakFields],
    confidence: finalReport.score,
    notes,
  };
}
