export type BookConceptFormat =
  | "poetry_collection"
  | "manual"
  | "self_help"
  | "psychology_guide"
  | "workbook"
  | "study_material"
  | "essay"
  | "memoir"
  | "short_story_collection"
  | "novella"
  | "novel";

export interface BookConceptFormatInput {
  bookFormat?: unknown;
  genre?: unknown;
  subcategory?: unknown;
  generationStrategy?: unknown;
  blueprintType?: unknown;
}

export interface BookConceptInput extends BookConceptFormatInput {
  seedIdea?: unknown;
  tone?: unknown;
  intensity?: unknown;
  centralDynamic?: unknown;
  protagonistType?: unknown;
  targetReader?: unknown;
  setting?: unknown;
  language?: unknown;
  chapterCount?: unknown;
  subchaptersPerChapter?: unknown;
  previousIdeas?: string[];
  preserveUserStory?: boolean;
  bookKernelPromptBlock?: unknown;
  creativeCoordinates?: Record<string, unknown>;
  contentMode?: unknown;
  structureMode?: unknown;
  blueprintType?: unknown;
  requiresCharacters?: unknown;
  requiresPlot?: unknown;
  requiresPoems?: unknown;
}

export interface BookConceptPrompts {
  system: string;
  user: string;
  format: BookConceptFormat;
}

function clean(value: unknown, max = 140): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();
}

function normalize(value: unknown): string {
  return clean(value, 400).toLowerCase().replace(/[_\s]+/g, "-");
}

function numberOr(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

export function resolveBookConceptFormat(input: BookConceptFormatInput): BookConceptFormat {
  const identity = [
    input.bookFormat,
    input.genre,
    input.subcategory,
    input.generationStrategy,
    input.blueprintType,
  ].map(normalize).join(" ");

  if (/poetry-collection|poetryblueprint|generatepoetrycollection|raccolta-poetica|poesia|poetry/.test(identity)) {
    return "poetry_collection";
  }
  if (/study-material|studyblueprint|generatestudymaterial|materiale-studio|education|studio|study/.test(identity)) {
    return "study_material";
  }
  if (/workbook|journal|generateworkbook/.test(identity)) {
    return "workbook";
  }
  if (/psychology-guide|psychologyblueprint|generatepsychologyguide|psicologia|psychology/.test(identity)) {
    return "psychology_guide";
  }
  if (/self-help|self_help|generateselfhelpguide|crescita-personale|mindset|coaching/.test(identity)) {
    return "self_help";
  }
  if (/manual|guideblueprint|generatemanual|business-book|cookbook|travel-guide/.test(identity)) {
    return "manual";
  }
  if (/essay|essayblueprint|generateessay|saggio/.test(identity)) {
    return "essay";
  }
  if (/memoir|memoirblueprint|generatememoir|autobiograf/.test(identity)) {
    return "memoir";
  }
  if (/short-story-collection|short_story_collection|raccolta-racconti|story-collection|generateshortstorycollection/.test(identity)) {
    return "short_story_collection";
  }
  if (/novella|generatenovella/.test(identity)) {
    return "novella";
  }
  return "novel";
}

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

const narrativeContaminationPatterns = [
  /\bprotagonist[aoie]?\b/i,
  /\bantagonist[aoie]?\b/i,
  /\bpersonaggi?\b/i,
  /\bcast\b/i,
  /\btrama\b/i,
  /\bconflitto narrativo\b/i,
  /\bpromessa narrativa\b/i,
  /\bla storia segue\b/i,
  /\bla storia racconta\b/i,
  /\bdeve allearsi con\b/i,
  /\bper scoprire la verit[ae]\b/i,
  /\blei e\b/i,
  /\blui e\b/i,
  /\bscene\b/i,
];

const practicalContaminationPatterns = [
  /\bprotagonist[aoie]?\b/i,
  /\bantagonist[aoie]?\b/i,
  /\bpersonaggi?\b/i,
  /\bcast\b/i,
  /\btrama\b/i,
  /\bpromessa narrativa\b/i,
  /\bromance\b/i,
  /\bcliffhanger\b/i,
  /\bla storia segue\b/i,
  /\blei e\b/i,
  /\blui e\b/i,
];

export function isConceptContaminatedForFormat(input: BookConceptFormatInput & { text?: unknown }): boolean {
  const text = clean(input.text, 12000);
  if (!text) return true;

  const format = resolveBookConceptFormat(input);
  if (format === "poetry_collection") {
    return hasAny(text, narrativeContaminationPatterns);
  }
  if (format === "manual" || format === "self_help" || format === "psychology_guide" || format === "workbook" || format === "study_material" || format === "essay") {
    return hasAny(text, practicalContaminationPatterns);
  }
  if (format === "short_story_collection") {
    return hasAny(text, [/\bsingolo romanzo\b/i, /\bromanzo unico\b/i, /\bun unico protagonista\b/i]);
  }
  if (format === "memoir") {
    return hasAny(text, [/\bromanzo inventato\b/i, /\bcast fiction\b/i, /\bmitologia fantasy\b/i]);
  }
  return false;
}

export function buildDeterministicBookConcept(input: BookConceptInput): string {
  const format = resolveBookConceptFormat(input);
  const tone = clean(input.tone, 90);
  const central = clean(input.centralDynamic || input.seedIdea, 120);
  const subject = clean(input.protagonistType || input.targetReader, 110);
  const setting = clean(input.setting, 130);
  const poems = numberOr(input.chapterCount, 60);
  const sections = numberOr(input.subchaptersPerChapter, 4);

  if (format === "poetry_collection") {
    const theme = central || "Memoria e identita'";
    const voice = subject || tone || "Intima e contemplativa, limpida, ferita ma non vittimistica";
    const symbols = setting || "Nebbia, acqua ferma, mappe, luce dei lampioni, camere vuote";
    return `Tema centrale:
${theme}.

Voce poetica:
${voice}.

Campo simbolico:
${symbols}.

Arco emotivo:
Smarrimento -> ricerca -> riconoscimento -> accettazione.

Struttura:
${sections} sezioni, ${poems} poesie.

Possibili sezioni:
1. Origine della frattura
2. Geografie del vuoto
3. Riconoscere la voce
4. Restare nella luce

Promessa poetica:
Una raccolta che attraversa ${theme.toLowerCase()} attraverso immagini concrete, ritmo e continuita' interiore.

Tono e ritmo:
${tone || "Essenziale, musicale, preciso"}; testi brevi alternati a poesie piu' distese.

Cosa NON fara' la raccolta:
Non diventera' narrazione lineare, indagine o saga: restera' una raccolta di nuclei poetici autonomi.`;
  }

  if (format === "manual" || format === "self_help" || format === "psychology_guide") {
    const problem = central || "Confusione, blocco e mancanza di strumenti pratici";
    return `Problema lettore:
${problem}.

Trasformazione:
Da difficolta' frammentata a percorso chiaro, applicabile e verificabile.

Metodo:
Consapevolezza, diagnosi del problema, strumenti operativi, esempi, esercizi e piano d'azione.

Capitoli pratici:
${numberOr(input.chapterCount, 10)} capitoli brevi con obiettivo, spiegazione, applicazione e sintesi.

Esercizi:
Domande guidate, pratica settimanale, revisione dei progressi e azioni concrete.

Checklist:
Controlli rapidi a fine capitolo per verificare comprensione e applicazione.

Esempi:
Casi realistici collegati al lettore target${subject ? `: ${subject}` : ""}.

Avvertenza responsabile:
Il contenuto offre educazione e strumenti pratici, senza sostituire supporto professionale quando necessario.`;
  }

  if (format === "workbook") {
    return `Obiettivo operativo:
${central || "Trasformare consapevolezza in azioni misurabili"}.

Schede:
${numberOr(input.chapterCount, 12)} schede progressive con istruzioni chiare e spazio di lavoro.

Esercizi:
Pratiche brevi, riflessioni guidate, micro-azioni e verifica dei risultati.

Domande guidate:
Domande aperte per riconoscere blocchi, decisioni e prossimi passi.

Progress tracker:
Indicatori settimanali, autovalutazione e tracciamento dei completamenti.

Attivita' settimanali:
Routine leggere ma costanti, pensate per mantenere continuita'.

Risultati misurabili:
Ogni sezione produce una decisione, un'abitudine o una prova concreta di avanzamento.`;
  }

  if (format === "study_material") {
    return `Materia:
${central || "Argomento di studio da organizzare in percorso verificabile"}.

Livello:
${subject || "Studente intermedio, con spiegazioni progressive"}.

Moduli:
${numberOr(input.chapterCount, 8)} moduli con definizioni, concetti chiave, esempi e prerequisiti.

Riassunti:
Sintesi breve, standard e approfondita per ogni modulo.

Quiz:
Domande di memoria, comprensione, applicazione e simulazione.

Flashcard:
Carte su definizioni, formule, date, relazioni logiche e concetti essenziali.

Simulazione:
Verifica finale con punteggio, feedback e aree da ripassare.

Obiettivi di apprendimento:
Capire, ricordare, applicare e prepararsi a una prova reale.`;
  }

  if (format === "essay") {
    return `Tesi centrale:
${central || "Una posizione chiara da sostenere con argomenti verificabili"}.

Argomenti:
Tre linee principali con esempi, fonti possibili e conseguenze logiche.

Controargomenti:
Obiezioni credibili da affrontare senza semplificare il tema.

Esempi:
Casi concreti, riferimenti culturali e applicazioni contemporanee.

Struttura saggistica:
Introduzione, sviluppo argomentativo, snodi critici e conclusione.

Conclusione:
Una sintesi che lasci al lettore una posizione piu' chiara e piu' forte.`;
  }

  if (format === "memoir") {
    return `Voce autobiografica:
${tone || "Intima, onesta, concreta"}.

Ferita / tema personale:
${central || "Un passaggio di vita che chiede significato, memoria e responsabilita'"}.

Arco di consapevolezza:
Dalla frattura iniziale alla comprensione di cio' che quell'esperienza ha trasformato.

Memoria:
Luoghi, oggetti, dialoghi ricordati e dettagli sensoriali come prove emotive.

Scene di vita possibili:
Episodi reali selezionati per illuminare una verita' personale, non per romanzare.

Confine editoriale:
Il progetto resta radicato nell'esperienza vissuta e non inventa una mitologia esterna.`;
  }

  if (format === "short_story_collection") {
    return `Tema comune:
${central || "Una domanda emotiva o morale che ritorna in forme diverse"}.

Racconti autonomi:
Ogni racconto ha situazione, tensione e chiusura propria.

Struttura raccolta:
${numberOr(input.chapterCount, 12)} racconti ordinati per variazione di tono, intensita' e punto di vista.

Variazione:
Luoghi, figure e conflitti cambiano, mentre il filo tematico resta riconoscibile.

Confine editoriale:
La raccolta non diventa un singolo romanzo lungo: funziona per risonanza, contrasto e accumulo.`;
  }

  if (/dark.?romance|romance/.test(normalize(input.genre))) {
    return `Due figure con desideri incompatibili entrano in una relazione che mette al centro attrazione, ferita e scelta emotiva. Il mistero resta una pressione esterna, non il motore principale: ogni svolta deve far crescere desiderio, fiducia, paura di esporsi e conseguenze intime. Il nucleo commerciale e' una promessa di relazione intensa, conflitto emotivo e payoff leggibile.`;
  }

  if (/horror|gotic/.test(normalize(input.genre))) {
    return `Un luogo in decadenza trattiene una minaccia che emerge per atmosfera, dettagli disturbanti e memoria corrotta. La paura cresce prima dell'azione: inquietudine, segreti del luogo e conseguenze fisiche rendono ogni scelta piu' stretta.`;
  }

  return `Una premessa narrativa costruita su ${central || "desiderio, ferita e conseguenza"}. Il nucleo deve contenere figure attive, posta in gioco concreta, atmosfera riconoscibile e una promessa commerciale specifica, senza imitare varianti gia' generate.`;
}

function formatLocks(input: BookConceptInput): string {
  const parts = [
    `bookFormat=${clean(input.bookFormat)}`,
    `contentMode=${clean(input.contentMode)}`,
    `structureMode=${clean(input.structureMode)}`,
    `blueprintType=${clean(input.blueprintType)}`,
    `generationStrategy=${clean(input.generationStrategy)}`,
    `requiresCharacters=${String(Boolean(input.requiresCharacters))}`,
    `requiresPlot=${String(Boolean(input.requiresPlot))}`,
    `requiresPoems=${String(Boolean(input.requiresPoems))}`,
  ].filter((part) => !part.endsWith("="));
  return parts.join("\n");
}

function baseContext(input: BookConceptInput): string {
  const previous = input.previousIdeas?.length
    ? input.previousIdeas.map((item, index) => `${index + 1}. ${clean(item, 260)}`).join("\n")
    : "Nessuna idea recente disponibile.";
  const creative = input.creativeCoordinates && typeof input.creativeCoordinates === "object"
    ? Object.entries(input.creativeCoordinates)
      .map(([key, value]) => `- ${key}: ${clean(value, 180)}`)
      .filter((line) => !line.endsWith(": "))
      .join("\n")
    : "";
  return `DNA / format locks:
${formatLocks(input)}

Kernel:
${clean(input.bookKernelPromptBlock, 3000) || "Kernel non disponibile nel payload."}

Coordinate:
Genere: ${clean(input.genre) || "da rispettare in base al formato"}
Filone / sottogenere: ${clean(input.subcategory) || "coerente con formato e genere"}
Tono: ${clean(input.tone) || "professionale e vendibile"}
Intensita': ${clean(input.intensity) || "medium"}
Tema / dinamica: ${clean(input.centralDynamic) || "da costruire dal formato scelto"}
Voce / soggetto / target: ${clean(input.protagonistType || input.targetReader) || "da definire senza forzature narrative"}
Immagini / contesto / esempi: ${clean(input.setting) || "da scegliere in modo specifico"}
Seme utente: ${clean(input.seedIdea, 1200) || "nessun seme specifico"}

Coordinate creative:
${creative || "Nessuna coordinata creativa obbligatoria."}

Idee recenti da non imitare:
${previous}`;
}

export function buildFormatAwareConceptPrompts(input: BookConceptInput): BookConceptPrompts {
  const format = resolveBookConceptFormat(input);
  const language = clean(input.language) || "Italian";
  const system = `Sei Scriptora Book Concept Architect.
Generi nuclei editoriali in base al formato reale del libro, non una pipeline universale da romanzo.
Scrivi in ${language}.
Rispetta FORMAT_LOCK, CONTENT_LOCK, STRUCTURE_LOCK, PROMISE_LOCK e QUALITY_LOCK quando presenti.
Se il formato non richiede trama o personaggi, non inventarli.
Output diretto, professionale, pronto per Book Forge.`;

  const context = baseContext(input);

  if (format === "poetry_collection") {
    return {
      format,
      system,
      user: `${context}

GENERA UN NUCLEO POETICO, NON UNA SINOSSI.

VIETATO ASSOLUTO:
- protagonista, antagonista, personaggi, cast
- trama, conflitto narrativo, mistero narrativo
- scene, indagini, alleanze, rivelazioni da romanzo
- frasi come "Lei e", "Lui e", "La storia segue"
- la dicitura "promessa narrativa"

OBBLIGATORIO:
- Tema centrale
- Voce poetica
- Campo simbolico / immagini ricorrenti
- Arco emotivo della raccolta
- Numero sezioni
- Numero poesie
- Possibili sezioni con titolo
- Promessa poetica
- Tono e ritmo
- Cosa NON fara' la raccolta

Usa esattamente queste etichette e non aggiungere note tecniche.`,
    };
  }

  if (format === "manual" || format === "self_help" || format === "psychology_guide") {
    return {
      format,
      system,
      user: `${context}

GENERA UN CONCEPT DA MANUALE / GUIDA PRATICA.

VIETATO:
- protagonista fiction, cast, scene, cliffhanger
- trama o promessa narrativa
- romance o svolte da romanzo

OBBLIGATORIO:
- Problema lettore
- Trasformazione
- Metodo
- Capitoli pratici
- Esercizi
- Checklist
- Esempi
- Avvertenza responsabile per temi psicologici, salute o benessere

Output con etichette chiare, concreto e applicabile.`,
    };
  }

  if (format === "workbook") {
    return {
      format,
      system,
      user: `${context}

GENERA UN CONCEPT DA WORKBOOK.

OBBLIGATORIO:
- Obiettivo operativo
- Schede
- Esercizi
- Domande guidate
- Progress tracker
- Attivita' settimanali
- Risultati misurabili

VIETATO:
- trama, protagonisti, cast, promessa narrativa`,
    };
  }

  if (format === "study_material") {
    return {
      format,
      system,
      user: `${context}

GENERA UN CONCEPT DA MATERIALE DI STUDIO.

OBBLIGATORIO:
- Materia
- Livello
- Moduli
- Riassunti
- Quiz
- Flashcard
- Simulazione
- Obiettivi di apprendimento

VIETATO:
- trama, protagonisti, cast, personaggi`,
    };
  }

  if (format === "essay") {
    return {
      format,
      system,
      user: `${context}

GENERA UN CONCEPT DA SAGGIO.

OBBLIGATORIO:
- Tesi centrale
- Argomenti
- Controargomenti
- Esempi
- Struttura saggistica
- Conclusione

VIETATO:
- trama fiction
- protagonista fiction`,
    };
  }

  if (format === "memoir") {
    return {
      format,
      system,
      user: `${context}

GENERA UN CONCEPT DA MEMOIR.

OBBLIGATORIO:
- Voce autobiografica
- Ferita / tema personale
- Arco di consapevolezza
- Memoria
- Scene di vita possibili
- Confine editoriale

ATTENZIONE:
Il memoir puo' avere persone e scene reali, ma non deve diventare romanzo inventato.`,
    };
  }

  if (format === "short_story_collection") {
    return {
      format,
      system,
      user: `${context}

GENERA UN CONCEPT DA RACCOLTA DI RACCONTI.

OBBLIGATORIO:
- Tema comune
- Racconti autonomi
- Possibile variazione di figure per racconto
- Struttura raccolta
- Confine editoriale

VIETATO:
- trasformarlo in un singolo romanzo lungo`,
    };
  }

  const romanceRule = /dark.?romance|romance/.test(normalize(input.genre))
    ? "\nREGOLA DARK/ROMANCE: relazione, desiderio, ferita e payoff emotivo devono dominare; mystery e pericolo restano subordinati alla relazione."
    : "";
  const horrorRule = /horror|gotic/.test(normalize(input.genre))
    ? "\nREGOLA HORROR: atmosfera, inquietudine, decadenza e paura devono dominare prima dell'azione."
    : "";

  return {
    format,
    system,
    user: `${context}

GENERA UNA PREMESSA NARRATIVA PER ${format === "novella" ? "NOVELLA" : "ROMANZO"}.

OBBLIGATORIO:
- figure narrative attive
- ferita, desiderio, conflitto e conseguenza
- atmosfera specifica
- promessa commerciale chiara
- 4-7 frasi massimo
${romanceRule}${horrorRule}

Non creare titoli. Non scrivere note tecniche.`,
  };
}
