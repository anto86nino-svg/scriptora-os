import type { BookConfig } from "@/types/book";
import {
  resolveBookKernel,
  validateFormatCoherence,
  type BookIntelligenceKernelSnapshot,
} from "@/lib/book-intelligence";
import {
  resolveGenreDominanceContract,
  scoreGenreDominance,
} from "@/lib/book-intelligence/genre-dominance";
import {
  validateFormatPurity,
  type FormatPurityIssue,
} from "../../supabase/functions/_shared/format-purity-engine.ts";

export type WritingQualityIssueKind =
  | "duplicate_event"
  | "timeline_confusion"
  | "repeated_beat"
  | "broken_sentence"
  | "stagnant_character_dynamic"
  | "vague_final_hook"
  | "format_contamination"
  | "genre_dominance_weak";

export type WritingQualitySeverity = "critical" | "high" | "medium" | "low";

export interface WritingQualityIssue {
  kind: WritingQualityIssueKind;
  severity: WritingQualitySeverity;
  message: string;
  evidence: string[];
  repairInstruction: string;
}

export interface WritingQualityReport {
  passed: boolean;
  needsRepair: boolean;
  score: number;
  issues: WritingQualityIssue[];
}

export interface WritingQualityGateContext {
  language?: string | null;
  genre?: string | null;
  bookFormat?: string | null;
  config?: Partial<BookConfig> & Record<string, unknown>;
}

interface EventPattern {
  label: string;
  eventTerms: string[];
  actionTerms: string[];
  message: string;
  repairInstruction: string;
}

const DUPLICATE_EVENT_PATTERNS: EventPattern[] = [
  {
    label: "contract_signature",
    eventTerms: ["contratto", "contract", "accordo", "agreement"],
    actionTerms: ["firma", "firmo", "firmato", "firmare", "signed", "signature", "sigla", "siglato"],
    message: "Lo stesso evento di contratto/firma sembra ripetersi piu' di una volta nello stesso capitolo.",
    repairInstruction: "Fondi le ripetizioni del contratto/firma in un unico evento e conserva solo il nuovo sviluppo narrativo.",
  },
  {
    label: "forbidden_door",
    eventTerms: ["porta", "door"],
    actionTerms: ["chiusa", "proibita", "vietata", "locked", "forbidden", "mistero", "mystery"],
    message: "La scena della porta/mistero viene riproposta senza un chiaro avanzamento.",
    repairInstruction: "Mantieni una sola scena della porta e fai avanzare mistero, rischio o informazione a ogni ritorno.",
  },
  {
    label: "revelation",
    eventTerms: ["rivelazione", "verita", "confessione", "revelation", "truth", "confession"],
    actionTerms: ["disse", "rivelo", "svelo", "confesso", "scopri", "revealed", "told", "confessed"],
    message: "Una rivelazione/confessione sembra ripetuta come evento strutturale.",
    repairInstruction: "Lascia una sola rivelazione chiara e trasforma le ripetizioni in conseguenze, reazioni o nuova informazione.",
  },
  {
    label: "irreversible_choice",
    eventTerms: ["scelta", "decisione", "choice", "decision"],
    actionTerms: ["irreversibile", "decise", "scelse", "non poteva tornare", "irreversible", "chose"],
    message: "La stessa scelta decisiva sembra essere rimessa in scena invece di produrre conseguenze.",
    repairInstruction: "Conserva la scelta una sola volta e usa lo spazio restante per mostrarne il costo o la conseguenza.",
  },
];

const REPEATED_BEAT_PHRASES = [
  "avrebbe dovuto andarsene",
  "non lo fece",
  "il cuore batteva troppo forte",
  "il calore rimase",
  "non era paura",
  "nothing would ever be the same",
  "she should have left",
  "he should have left",
  "but she did not",
  "but he did not",
  "it was not fear",
];

const BROKEN_SENTENCE_PATTERNS: Array<{ regex: RegExp; evidence: string; message: string }> = [
  {
    regex: /\bla guardo'?\s+stesse leggendo\b/,
    evidence: "La guardo stesse leggendo",
    message: "Frase spezzata: manca il nesso sintattico tra azione e subordinata.",
  },
  {
    regex: /\bla verita'?\s*\.\s*fosse cosi semplice\b/,
    evidence: "La verita. fosse cosi semplice",
    message: "Frase spezzata: periodo nominale seguito da subordinata isolata.",
  },
  {
    regex: /\blenzuola aggrovigliate\s+qualcuno\s+ci\s+avesse\b/,
    evidence: "lenzuola aggrovigliate qualcuno ci avesse",
    message: "Frase spezzata: manca un verbo/legame grammaticale chiaro.",
  },
];

const STAGNANT_DYNAMIC_PATTERNS = [
  "si guardarono",
  "non disse nulla",
  "restarono in silenzio",
  "lui la guardo",
  "lei lo guardo",
  "he looked at her",
  "she looked at him",
  "said nothing",
];

const PROGRESSION_WORDS = [
  "scopri",
  "rivelo",
  "decise",
  "scelse",
  "confesso",
  "promise",
  "promessa",
  "minaccia",
  "conseguenza",
  "ferita",
  "rischio",
  "clue",
  "revealed",
  "chose",
  "decided",
  "threat",
  "consequence",
];

function normalizeText(text: string): string {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSentences(text: string): string[] {
  return String(text || "")
    .replace(/\r/g, "")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function splitParagraphs(text: string): string[] {
  const paragraphs = String(text || "")
    .replace(/\r/g, "")
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  return paragraphs.length > 1 ? paragraphs : splitSentences(text);
}

function countOccurrences(source: string, phrase: string): number {
  const normalizedPhrase = normalizeText(phrase);
  if (!normalizedPhrase) return 0;
  let count = 0;
  let index = 0;
  while (index < source.length) {
    const next = source.indexOf(normalizedPhrase, index);
    if (next < 0) break;
    count += 1;
    index = next + normalizedPhrase.length;
  }
  return count;
}

function includesAny(source: string, terms: string[]): boolean {
  return terms.some((term) => source.includes(normalizeText(term)));
}

function compactEvidence(items: string[], limit = 3): string[] {
  return Array.from(new Set(items.map((item) => item.replace(/\s+/g, " ").trim()).filter(Boolean)))
    .slice(0, limit)
    .map((item) => item.length > 220 ? `${item.slice(0, 217)}...` : item);
}

function detectDuplicateEvents(text: string): WritingQualityIssue[] {
  const units = splitParagraphs(text).map((raw) => ({ raw, normalized: normalizeText(raw) }));
  const issues: WritingQualityIssue[] = [];

  for (const pattern of DUPLICATE_EVENT_PATTERNS) {
    const hits = units
      .filter(({ normalized }) => includesAny(normalized, pattern.eventTerms) && includesAny(normalized, pattern.actionTerms))
      .map(({ raw }) => raw);

    if (hits.length >= 2) {
      issues.push({
        kind: "duplicate_event",
        severity: "high",
        message: pattern.message,
        evidence: compactEvidence(hits),
        repairInstruction: pattern.repairInstruction,
      });
    }
  }

  return issues;
}

function detectRepeatedBeats(text: string): WritingQualityIssue[] {
  const normalized = normalizeText(text);
  const repeated = REPEATED_BEAT_PHRASES
    .map((phrase) => ({ phrase, count: countOccurrences(normalized, phrase) }))
    .filter(({ count }) => count >= 3);

  if (!repeated.length) return [];

  return [{
    kind: "repeated_beat",
    severity: "high",
    message: "Uno o piu' beat emotivi tornano troppe volte senza una nuova funzione narrativa.",
    evidence: repeated.map(({ phrase, count }) => `${phrase} x${count}`),
    repairInstruction: "Taglia o varia i beat emotivi ripetuti; ogni ritorno deve produrre una nuova scelta, ferita o conseguenza.",
  }];
}

function detectBrokenSentences(text: string): WritingQualityIssue[] {
  const normalized = normalizeText(text);
  const evidence = BROKEN_SENTENCE_PATTERNS
    .filter(({ regex }) => regex.test(normalized))
    .map(({ evidence: item }) => item);

  const hasPastTenseContext = /\b(era|aveva|guardo|disse|sentiva|pensava|rimase|prese|tremava)\b/.test(normalized);
  if (hasPastTenseContext && /\bstringe la spatola\b/.test(normalized)) {
    evidence.push("Stringe la spatola");
  }

  if (!evidence.length) return [];

  return [{
    kind: "broken_sentence",
    severity: "critical",
    message: "Il capitolo contiene frasi tronche o sintatticamente non valide.",
    evidence: compactEvidence(evidence),
    repairInstruction: "Ricostruisci solo le frasi rotte mantenendo eventi, voce, tempo verbale e canon invariati.",
  }];
}

function detectTimelineConfusion(text: string): WritingQualityIssue[] {
  const normalized = normalizeText(text);
  const matches: Array<{ key: "morning" | "afternoon" | "next_morning"; index: number; label: string }> = [];
  const patterns: Array<{ key: "morning" | "afternoon" | "next_morning"; regex: RegExp; label: string }> = [
    { key: "next_morning", regex: /\b(la mattina dopo|il mattino dopo|la mattina seguente|next morning)\b/g, label: "mattina dopo" },
    { key: "morning", regex: /\b(mattina|mattino|morning)\b/g, label: "mattina" },
    { key: "afternoon", regex: /\b(pomeriggio|afternoon)\b/g, label: "pomeriggio" },
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.regex.exec(normalized)) !== null) {
      if (pattern.key === "morning" && /mattina dopo|mattina seguente|mattino dopo/.test(match[0])) continue;
      matches.push({ key: pattern.key, index: match.index, label: pattern.label });
    }
  }

  matches.sort((a, b) => a.index - b.index);

  for (let i = 0; i < matches.length - 2; i += 1) {
    const first = matches[i];
    const second = matches[i + 1];
    const third = matches[i + 2];
    if (first.key !== "morning" || second.key !== "afternoon" || third.key !== "next_morning") continue;

    const bridge = normalized.slice(second.index, third.index);
    const hasTransition = /\b(sera|notte|ore dopo|piu tardi|il giorno seguente|dopo cena|durante la notte|la notte passo|dopo una notte|quando il sole)\b/.test(bridge);
    if (!hasTransition) {
      return [{
        kind: "timeline_confusion",
        severity: "high",
        message: "La linea temporale passa da mattina a pomeriggio a mattina dopo senza una transizione narrativa chiara.",
        evidence: [`${first.label} -> ${second.label} -> ${third.label}`],
        repairInstruction: "Aggiungi o chiarisci una transizione temporale concreta senza cambiare gli eventi del capitolo.",
      }];
    }
  }

  return [];
}

function detectStagnantCharacterDynamic(text: string): WritingQualityIssue[] {
  const normalized = normalizeText(text);
  const repetitions = STAGNANT_DYNAMIC_PATTERNS
    .map((phrase) => ({ phrase, count: countOccurrences(normalized, phrase) }))
    .filter(({ count }) => count >= 2);
  const total = repetitions.reduce((sum, item) => sum + item.count, 0);
  const hasProgression = includesAny(normalized, PROGRESSION_WORDS);

  if (total < 6 || hasProgression) return [];

  return [{
    kind: "stagnant_character_dynamic",
    severity: "medium",
    message: "La dinamica tra personaggi sembra ripetersi senza nuova informazione, scelta, rischio o conseguenza.",
    evidence: repetitions.map(({ phrase, count }) => `${phrase} x${count}`).slice(0, 4),
    repairInstruction: "Comprimi le interazioni equivalenti e fai cambiare qualcosa in ogni scena tra i personaggi.",
  }];
}

function detectVagueFinalHook(text: string): WritingQualityIssue[] {
  const sentences = splitSentences(text);
  const ending = normalizeText(sentences.slice(-2).join(" "));
  if (!ending) return [];

  const vagueHook = /\b(promessa di cio che sarebbe venuto|qualcosa stava per cominciare|nulla sarebbe stato come prima|tutto sarebbe cambiato|quello che sarebbe arrivato|what was coming|everything would change|nothing would ever be the same)\b/.test(ending);
  if (!vagueHook) return [];

  const concreteAnchor = /\b(lettera|chiave|porta|contratto|nome|foto|sangue|anello|biglietto|mappa|messaggio|documento|diario|registrazione|valigia|pistola|coltello|minaccia|segreto|scelta|object|letter|key|door|message|threat|secret|choice)\b/.test(ending);
  if (concreteAnchor) return [];

  return [{
    kind: "vague_final_hook",
    severity: "high",
    message: "Il finale crea attesa in modo astratto ma non lascia un segno concreto al lettore.",
    evidence: compactEvidence(sentences.slice(-2)),
    repairInstruction: "Rendi il gancio finale concreto con oggetto, rivelazione, scelta, minaccia, segno fisico o immagine specifica.",
  }];
}

function detectFormatContamination(text: string, context: WritingQualityGateContext = {}): WritingQualityIssue[] {
  const normalized = normalizeText(text);
  const config = context.config || {};
  const kernel = resolveBookKernel({
    config: {
      ...(config as Partial<BookConfig>),
      bookFormat: String(context.bookFormat || (config as any).bookFormat || ""),
      genre: (context.genre || (config as any).genre) as any,
    },
  });
  const formatSignal = normalizeText([
    context.bookFormat,
    context.genre,
    config.bookType,
    config.bookTypeId,
    config.bookFormat,
    config.genre,
    config.category,
    config.subcategory,
  ].filter(Boolean).join(" "));
  const isPoetry = /\b(poetry|poesia|poetico|poetica|poetry_collection|raccolta poetica)\b/.test(formatSignal);

  const contaminationHits = [
    isPoetry && /\b(20 capitoli|venti capitoli|twenty chapters)\b/.test(normalized) ? "chapter-plan contamination" : "",
    /\bforced proximity\b/.test(normalized) && !kernel.narrativeMode ? "forced proximity" : "",
    /\b(dark romance|love interest|cliffhanger seriale)\b/.test(normalized) && !kernel.narrativeMode ? "romance template" : "",
    isPoetry && /\b(baci|bacio|kiss|kisses|trappola|trappole|trap|traps)\b/.test(normalized) ? "plot-trope contamination" : "",
    isPoetry && /\bcapitolo\s+\d+\b/.test(normalized) ? "novel chapter marker" : "",
    !kernel.requiresCharacters && /\b(protagonista|antagonista|cast|love interest)\b/.test(normalized) ? "fiction character contamination" : "",
    !kernel.requiresPlot && /\b(trama|plot twist|climax|arco narrativo|worldbuilding)\b/.test(normalized) ? "plot structure contamination" : "",
    kernel.educationalMode && /\b(romanzo|romance|bacio|protagonista tormentato)\b/.test(normalized) ? "study-to-novel contamination" : "",
    kernel.requiresWorkbook && /\bcapitoli narrativi|scena dominante\b/.test(normalized) ? "workbook-to-novel contamination" : "",
  ].filter(Boolean);

  if (contaminationHits.length < (isPoetry ? 2 : 1)) return [];

  return [{
    kind: "format_contamination",
    severity: "high",
    message: `Il testo contiene segnali non coerenti con il formato ${kernel.bookFormat}.`,
    evidence: contaminationHits,
    repairInstruction: "Rimuovi strutture vietate dal formato e riallinea il testo al contratto editoriale del progetto.",
  }];
}

function severityPenalty(severity: WritingQualitySeverity): number {
  switch (severity) {
    case "critical": return 34;
    case "high": return 22;
    case "medium": return 11;
    case "low": return 4;
  }
}

function shouldRepair(issues: WritingQualityIssue[]): boolean {
  const criticalOrHigh = issues.some((issue) => issue.severity === "critical" || issue.severity === "high");
  const mediumCount = issues.filter((issue) => issue.severity === "medium").length;
  return criticalOrHigh || mediumCount >= 2;
}

function detectGenreDominanceWeak(chapterText: string, context: WritingQualityGateContext = {}): WritingQualityIssue[] {
  if (!context.config) return [];
  const kernel = resolveBookKernel({ config: context.config as BookConfig });
  if (!kernel.requiresPlot && kernel.bookFormat !== "memoir") return [];
  const contract = resolveGenreDominanceContract({
    genre: context.genre || kernel.genre,
    subcategory: kernel.subgenre,
    bookFormat: kernel.bookFormat,
  });
  if (contract.genreKey === "generic") return [];
  const dominance = scoreGenreDominance(chapterText, contract);
  if (dominance.passed) return [];
  return [{
    kind: "genre_dominance_weak",
    severity: "medium",
    message: "Il capitolo non mantiene il dominio di genere concordato.",
    evidence: [
      ...dominance.forbiddenDominanceHits.map((term) => `domina: ${term}`),
      ...dominance.requiredHits.map((term) => `manca peso: ${term}`),
    ].slice(0, 6),
    repairInstruction: contract.generationInstruction,
  }];
}

export function validateNarrativeChapterQuality(
  chapterText: string,
  context: WritingQualityGateContext = {},
): WritingQualityReport {
  const issues = [
    ...detectDuplicateEvents(chapterText),
    ...detectRepeatedBeats(chapterText),
    ...detectBrokenSentences(chapterText),
    ...detectTimelineConfusion(chapterText),
    ...detectStagnantCharacterDynamic(chapterText),
    ...detectVagueFinalHook(chapterText),
    ...detectFormatContamination(chapterText, context),
    ...detectGenreDominanceWeak(chapterText, context),
  ];
  const penalty = issues.reduce((sum, issue) => sum + severityPenalty(issue.severity), 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));
  const needsRepair = shouldRepair(issues);

  return {
    passed: !needsRepair,
    needsRepair,
    score,
    issues,
  };
}

function isItalian(language?: string | null): boolean {
  return normalizeText(language || "").startsWith("ital") || normalizeText(language || "") === "it";
}

export function buildUniversalWritingQualityRulesBlock(language?: string | null): string {
  if (isItalian(language)) {
    return `REGOLE QUALITA' - NON NEGOZIABILI:
- Scrivi un capitolo unico e coerente, non piu' versioni incollate.
- Non ripetere due volte la stessa scena o lo stesso evento.
- Ogni scena deve aggiungere trama, personaggio, tensione o mistero.
- Evita formule emotive ripetute se non evolvono.
- Mantieni chiara la linea temporale.
- Se una firma, scelta, rivelazione o porta proibita avviene una volta, non rifarla piu' avanti nello stesso capitolo.
- I dialoghi devono portare sottotesto, conflitto o nuova informazione, non spiegare il tema a ripetizione.
- Chiudi con un gancio concreto: oggetto, rivelazione, scelta irreversibile, segno fisico, minaccia o immagine forte.
- Prima di consegnare, elimina in silenzio beat duplicati e frasi rotte.
- Rispetta blueprint, genere, canon personaggi e obiettivo del capitolo.`;
  }

  return `QUALITY RULES - NON NEGOTIABLE:
- Write one coherent chapter, not multiple alternate versions pasted together.
- Do not repeat the same scene/event twice.
- Every scene must advance plot, character, tension or mystery.
- Avoid repeated emotional formulas unless they evolve.
- Keep timeline clear.
- If a contract/choice/revelation/forbidden door happens once, do not replay it later in the same chapter.
- Dialogue must reveal power, conflict or subtext, not explain the theme repeatedly.
- End with a concrete hook: object, reveal, irreversible choice, physical sign, threat or strong image.
- Before finalizing, silently remove duplicated beats and broken sentences.
- Preserve blueprint, genre, character canon and chapter goal.`;
}

const FORMAT_DEDICATED_REPAIR_FORMATS = new Set([
  "poetry_collection",
  "workbook",
  "study_material",
  "manual",
  "self_help",
  "psychology_guide",
  "journal",
]);

const FORMAT_DEDICATED_REPAIR_MODES = new Set([
  "poetic",
  "instructional",
  "practical",
  "reference",
  "academic",
  "educational",
  "transformational",
]);

export function requiresFormatQualityRepair(config: Partial<BookConfig>): boolean {
  const kernel = resolveBookKernel({ config });
  if (FORMAT_DEDICATED_REPAIR_FORMATS.has(kernel.bookFormat)) return true;
  return FORMAT_DEDICATED_REPAIR_MODES.has(kernel.contentMode);
}

function purityIssueToWritingIssue(issue: FormatPurityIssue): WritingQualityIssue {
  return {
    kind: "format_contamination",
    severity: issue.severity === "critical" ? "critical" : issue.severity === "high" ? "high" : "medium",
    message: issue.message,
    evidence: issue.evidence,
    repairInstruction: `Correggi contaminazione formato: ${issue.message}`,
  };
}

function detectFormatSpecificGaps(text: string, kernel: BookIntelligenceKernelSnapshot): WritingQualityIssue[] {
  const normalized = normalizeText(text);
  const issues: WritingQualityIssue[] = [];

  if (kernel.bookFormat === "poetry_collection") {
    const plotSignals = /\b(protagonista|trama|conflitto narrativo|love interest|cliffhanger|scena dominante)\b/.test(normalized);
    const hasVerseStructure = /\n/.test(text) && text.split("\n").filter((line) => line.trim().length > 0 && line.trim().length < 90).length >= 3;
    if (plotSignals) {
      issues.push({
        kind: "format_contamination",
        severity: "critical",
        message: "La sezione poetica contiene segnali narrativi da romanzo.",
        evidence: ["trama/personaggi/love interest"],
        repairInstruction: "Rimuovi trama e personaggi fiction; rafforza immagini, simboli, ritmo e coerenza poetica.",
      });
    }
    if (!hasVerseStructure && text.length > 280) {
      issues.push({
        kind: "format_contamination",
        severity: "medium",
        message: "Il testo poetico manca di struttura a versi o strofe.",
        evidence: ["blocco prosa continuo"],
        repairInstruction: "Riorganizza in versi/strofe con respiro, ripetizioni controllate e campo simbolico coerente.",
      });
    }
  }

  if (kernel.bookFormat === "workbook" || kernel.requiresWorkbook) {
    const hasWorkbookSignals = /\b(eserciz|tracker|scheda|attivit|checkbox|□|☐|\[\s*\]|spazio risposta)\b/i.test(normalized);
    if (!hasWorkbookSignals && text.length > 220) {
      issues.push({
        kind: "format_contamination",
        severity: "high",
        message: "Il workbook manca di esercizi, schede o tracker.",
        evidence: ["nessun esercizio/tracker"],
        repairInstruction: "Aggiungi esercizi applicabili, tracker di progressione e spazi risposta; niente scene o dialoghi narrativi.",
      });
    }
    if (/\b(dialogo|scena|arco narrativo|climax)\b/.test(normalized)) {
      issues.push({
        kind: "format_contamination",
        severity: "high",
        message: "Il workbook contiene struttura narrativa invece di attivita' pratiche.",
        evidence: ["scena/dialogo/arco narrativo"],
        repairInstruction: "Sostituisci scene e dialoghi con esercizi, checklist operative e tracker.",
      });
    }
  }

  if (kernel.bookFormat === "study_material" || kernel.educationalMode) {
    const hasStudySignals = /\b(modul|quiz|flashcard|verific|simulazion|definizion|obiettiv)/i.test(normalized);
    if (!hasStudySignals && text.length > 220) {
      issues.push({
        kind: "format_contamination",
        severity: "high",
        message: "Il materiale di studio manca di moduli, quiz o struttura didattica.",
        evidence: ["nessun modulo/quiz"],
        repairInstruction: "Organizza in moduli con obiettivi, definizioni, quiz o flashcard; niente trama fiction.",
      });
    }
  }

  if (["manual", "self_help", "psychology_guide"].includes(kernel.bookFormat)) {
    const hasOperationalSignals = /\b(checklist|framework|procedur|passo\s*\d|eserciz|strument|azione|metodo)\b/i.test(normalized);
    if (!hasOperationalSignals && text.length > 220) {
      issues.push({
        kind: "format_contamination",
        severity: "medium",
        message: "Il capitolo operativo manca di checklist, framework o azioni concrete.",
        evidence: ["nessuna checklist/framework"],
        repairInstruction: "Aggiungi framework, checklist e passi operativi applicabili; niente protagonista o trama fiction.",
      });
    }
    if (/\b(protagonista|antagonista|trama|love interest)\b/.test(normalized)) {
      issues.push({
        kind: "format_contamination",
        severity: "critical",
        message: "Guida/manuale contaminato da struttura fiction.",
        evidence: ["protagonista/trama"],
        repairInstruction: "Rimuovi personaggi e trama; mantieni capitoli operativi con checklist e framework.",
      });
    }
  }

  return issues;
}

function buildFormatRepairFocusBlock(kernel: BookIntelligenceKernelSnapshot, language?: string | null): string {
  const isItalian = isItalianLanguage(language);
  const focusByFormat: Partial<Record<string, { it: string; en: string }>> = {
    poetry_collection: {
      it: "Ripara immagini, simboli, ritmo, voce poetica e coerenza lirica. NON personaggi, trama o conflitto narrativo.",
      en: "Repair imagery, symbols, rhythm, poetic voice and lyrical coherence. NOT characters, plot or narrative conflict.",
    },
    workbook: {
      it: "Ripara esercizi, schede, tracker e progressione pratica. NON scene, dialoghi o archi narrativi.",
      en: "Repair exercises, sheets, trackers and practical progression. NOT scenes, dialogues or narrative arcs.",
    },
    study_material: {
      it: "Ripara moduli, quiz, flashcard e struttura didattica. NON cast o trama fiction.",
      en: "Repair modules, quizzes, flashcards and study structure. NOT fiction cast or plot.",
    },
    manual: {
      it: "Ripara capitoli operativi, checklist, framework e procedure. NON protagonista o trama.",
      en: "Repair operational chapters, checklists, frameworks and procedures. NOT protagonist or plot.",
    },
    self_help: {
      it: "Ripara trasformazione pratica, esercizi, domande e framework. NON storia romanzata.",
      en: "Repair practical transformation, exercises, prompts and frameworks. NOT novelized story.",
    },
    psychology_guide: {
      it: "Ripara framework psicologici, esercizi, checklist e applicazione responsabile. NON trama fiction.",
      en: "Repair psychological frameworks, exercises, checklists and responsible application. NOT fiction plot.",
    },
    journal: {
      it: "Ripara prompt riflessivi, tracker e spazi risposta. NON trama o personaggi fiction.",
      en: "Repair reflective prompts, trackers and answer spaces. NOT plot or fiction characters.",
    },
  };

  const focus = focusByFormat[kernel.bookFormat];
  const focusLine = focus ? (isItalian ? focus.it : focus.en) : "";

  const allowed = kernel.allowedStructures.slice(0, 6).join(", ");
  const forbidden = kernel.forbiddenPatterns.slice(0, 6).join(", ");
  const qualityRules = kernel.qualityRules.slice(0, 4).join("; ");

  if (isItalian) {
    return `FOCUS RIPARAZIONE FORMATO (${kernel.bookFormat} / ${kernel.contentMode}):
${focusLine}
- Modello struttura: ${kernel.structureModel}
- Promessa editoriale: ${kernel.commercialPromise}
- Strutture consentite: ${allowed}
- Vietato: ${forbidden}
- Regole qualita': ${qualityRules}`;
  }

  return `FORMAT REPAIR FOCUS (${kernel.bookFormat} / ${kernel.contentMode}):
${focusLine}
- Structure model: ${kernel.structureModel}
- Editorial promise: ${kernel.commercialPromise}
- Allowed structures: ${allowed}
- Forbidden: ${forbidden}
- Quality rules: ${qualityRules}`;
}

function isItalianLanguage(language?: string | null): boolean {
  return normalizeText(language || "").startsWith("ital") || normalizeText(language || "") === "it";
}

export function validateFormatChapterQuality(
  chapterText: string,
  context: WritingQualityGateContext & { chapterTitle?: string | null } = {},
): WritingQualityReport {
  const config = (context.config || {}) as Partial<BookConfig>;
  const kernel = resolveBookKernel({ config });

  const purity = validateFormatPurity({
    bookFormat: kernel.bookFormat,
    genre: kernel.genre,
    subcategory: kernel.subgenre,
    generationStrategy: kernel.generationStrategy,
    blueprintType: kernel.blueprintType,
    text: chapterText,
    requireMandatorySections: false,
  });

  const coherence = validateFormatCoherence(config, null, chapterText);

  const issues: WritingQualityIssue[] = [
    ...purity.issues.map(purityIssueToWritingIssue),
    ...coherence.issues.map((issue) => ({
      kind: "format_contamination" as const,
      severity: issue.severity,
      message: issue.message,
      evidence: issue.evidence,
      repairInstruction: `Riallinea al contratto ${kernel.bookFormat}: ${issue.message}`,
    })),
    ...detectFormatSpecificGaps(chapterText, kernel),
  ];

  const penalty = issues.reduce((sum, issue) => sum + severityPenalty(issue.severity), 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));
  const needsRepair = shouldRepair(issues) || !purity.passed || !coherence.passed;

  return {
    passed: !needsRepair,
    needsRepair,
    score,
    issues,
  };
}

export function buildFormatQualityRepairPrompt(input: {
  chapterText: string;
  report: WritingQualityReport;
  config: Partial<BookConfig>;
  language?: string | null;
  chapterTitle?: string | null;
}): string {
  const kernel = resolveBookKernel({ config: input.config });
  const language = input.language || "Italian";
  const issues = input.report.issues
    .map((issue, index) => {
      const evidence = issue.evidence.length ? ` Evidence: ${issue.evidence.join(" | ")}` : "";
      return `${index + 1}. ${issue.kind} (${issue.severity}) - ${issue.repairInstruction}${evidence}`;
    })
    .join("\n");

  const focusBlock = buildFormatRepairFocusBlock(kernel, language);
  const mustHave = kernel.qualityGate.mustHave.map((item) => `- ${item}`).join("\n");
  const rejectIf = kernel.qualityGate.rejectIf.map((item) => `- ${item}`).join("\n");

  if (isItalianLanguage(language)) {
    return `Ripara questa sezione in ${language} rispettando il contratto editoriale ${kernel.bookFormat}.
Non introdurre trama fiction, personaggi canon o scene narrative se il formato li vieta.
Mantieni titolo, obiettivo della sezione, voce autoriale e informazioni gia' presenti.
Correggi solo contaminazioni di formato, lacune strutturali e incoerenze elencate sotto.
Restituisci SOLO il testo revisionato, senza JSON, note o commenti.

${focusBlock}

MUST HAVE:
${mustHave}

REJECT IF:
${rejectIf}

SEZIONE: ${input.chapterTitle || "senza titolo"}

PROBLEMI DA RIPARARE:
${issues}

TESTO:
"""
${input.chapterText}
"""`;
  }

  return `Repair this section in ${language} under the ${kernel.bookFormat} editorial contract.
Do not add fiction plot, canon characters or narrative scenes when the format forbids them.
Preserve title, section goal, author voice and existing information.
Fix only format contamination, structural gaps and listed incoherences.
Return ONLY the revised text, no JSON, notes or commentary.

${focusBlock}

MUST HAVE:
${mustHave}

REJECT IF:
${rejectIf}

SECTION: ${input.chapterTitle || "untitled"}

ISSUES TO REPAIR:
${issues}

TEXT:
"""
${input.chapterText}
"""`;
}

export function buildNarrativeQualityRepairPrompt(input: {
  chapterText: string;
  report: WritingQualityReport;
  language?: string | null;
  chapterTitle?: string | null;
}): string {
  const language = input.language || "Italian";
  const issues = input.report.issues
    .map((issue, index) => {
      const evidence = issue.evidence.length ? ` Evidence: ${issue.evidence.join(" | ")}` : "";
      return `${index + 1}. ${issue.kind} (${issue.severity}) - ${issue.repairInstruction}${evidence}`;
    })
    .join("\n");

  return `Revisiona questo capitolo in ${language} mantenendo trama, eventi, stile, canon e finale narrativo.
Non aggiungere nuove sottotrame. Non cambiare personaggi, ambientazione, POV o ordine degli eventi salvo micro-transizioni necessarie.
Rimuovi soltanto scene duplicate, ripetizioni emotive, timeline incoerente, contaminazioni di formato e frasi rotte.
Se il finale e' vago, rendilo piu' concreto senza inventare una nuova svolta.
Restituisci SOLO il testo revisionato del capitolo, senza JSON, note, titoli o commenti.

CAPITOLO: ${input.chapterTitle || "senza titolo"}

PROBLEMI DA RIPARARE:
${issues}

TESTO:
"""
${input.chapterText}
"""`;
}
