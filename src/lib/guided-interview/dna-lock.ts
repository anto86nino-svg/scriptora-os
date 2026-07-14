import type { GuidedInterviewState } from "./types";
import { summarizeForgeProConfig } from "./forge-pro-config";
import { evaluateEditorialUnderstanding } from "./book-understanding-engine";
import { evaluateForgeEvolution } from "./forge-evolution-engine";
import {
  assessDnaQuality,
  getBlockedDnaMessage,
  sanitizeDnaText,
  sanitizeExtractedFields,
  type DnaQualityReport,
} from "./dna-cleaner";

export type BookDnaLock = {
  coreTopic?: string;
  primaryIntent?: string;
  targetReader?: string;
  tone?: string;
  educationalLevel?: string;

  /** Inferred editorial identity */
  inferredBookType?: string;
  inferredGenre?: string;
  inferredSubgenre?: string;
  pacingLock?: string;
  emotionalLock?: string;
  promiseLock?: string;
  forbiddenPatterns: string[];

  whatBookIs: string[];
  whatBookIsNot: string[];

  antiDriftRules: string[];

  confidenceScore: number;
  missingCriticalAnswers: string[];
  readyForBlueprint: boolean;
  dnaQuality: DnaQualityReport;
  blockedMessage?: string;
  lockedAt?: string;
};

export const CONFIDENCE_BLUEPRINT_THRESHOLD = 0.95;

const CRITICAL_FIELDS = [
  "readerTransformation",
  "centralConflict",
  "emotionalTone",
  "genreDNA",
  "promise",
  "setting",
  "targetReader",
] as const;

function clean(value: unknown): string {
  return sanitizeDnaText(value);
}

function hasMeaning(value: unknown, min = 12): boolean {
  return clean(value).length >= min;
}

export function buildInitialDnaLock(): BookDnaLock {
  const dnaQuality = assessDnaQuality({}, { missingCount: CRITICAL_FIELDS.length, confidence: 0.1 });
  return {
    confidenceScore: 0.1,
    whatBookIs: [],
    whatBookIsNot: [],
    antiDriftRules: [],
    forbiddenPatterns: [],
    missingCriticalAnswers: [...CRITICAL_FIELDS],
    readyForBlueprint: false,
    dnaQuality,
    blockedMessage: getBlockedDnaMessage(dnaQuality),
  };
}

export function buildDnaLockFromInterviewState(state: GuidedInterviewState): BookDnaLock {
  const sanitized = sanitizeExtractedFields((state.extracted ?? {}) as Record<string, unknown>);
  const extracted = sanitized;

  const readerTransformation = clean(extracted.readerTransformation);
  const centralConflict = clean(extracted.centralConflict);
  const emotionalTone = clean(extracted.emotionalTone);
  const genreDNA = clean(extracted.genreDNA);
  const promise = clean(extracted.promise);
  const setting = clean(extracted.setting);
  const targetReader = clean(extracted.targetReader);
  const editorial = evaluateEditorialUnderstanding(state);
  const evolution = evaluateForgeEvolution(state);

  const missingCriticalAnswers = CRITICAL_FIELDS.filter(
    (field) => !hasMeaning(extracted[field]),
  );

  const inferredGenre = state.selectedGenre || state.inferredProfile?.genre || undefined;
  const inferredBookType = state.inferredProfile?.bookType || state.selectedBookType;
  const inferredSubgenre = state.inferredProfile?.subgenre;
  const pacingLock = state.inferredProfile?.pacing;
  const emotionalLock = emotionalTone || state.inferredProfile?.tone;
  const promiseLock = promise || readerTransformation;

  const proConfigSummary = summarizeForgeProConfig(state);

  const whatBookIs = [
    ...proConfigSummary,
    inferredBookType && `Tipo libro dedotto: ${inferredBookType}`,
    inferredSubgenre && `Genere dedotto: ${inferredSubgenre}`,
    readerTransformation && `Trasformazione/promessa lettore: ${readerTransformation}`,
    centralConflict && `Conflitto o problema centrale: ${centralConflict}`,
    emotionalTone && `Tono emotivo dominante: ${emotionalTone}`,
    genreDNA && `DNA editoriale: ${genreDNA}`,
    promise && `Promessa narrativa/editoriale: ${promise}`,
    setting && `Mondo, contesto o atmosfera: ${setting}`,
    targetReader && `Lettore ideale: ${targetReader}`,
    pacingLock && `Ritmo/pacing: ${pacingLock}`,
  ].filter(Boolean) as string[];

  const whatBookIsNot = [
    inferredGenre === "romance"
      ? "Non deve diventare un saggio motivazionale mascherato."
      : inferredGenre === "self-help"
        ? "Non deve diventare un romanzo con troppa fiction."
        : "Non deve cambiare genere senza conferma esplicita dell'autore.",
    "Non deve sostituire il cuore del libro con un tema più generico.",
    "Non deve ignorare tono, promessa e pubblico ricavati dall'intervista.",
    "Non deve generare blueprint se mancano risposte critiche o DNA sporco.",
  ];

  const forbiddenPatterns = [
    "Cambiare genere a metà struttura",
    "Appiattire il tono emotivo verso il generico",
    "Ignorare la promessa al lettore",
    pacingLock ? `Tradire il pacing: ${pacingLock}` : "Tradire il ritmo narrativo dedotto",
  ];

  const antiDriftRules = [
    readerTransformation
      ? `Preserva sempre questa trasformazione centrale: ${readerTransformation}`
      : "Prima di generare, chiarisci la trasformazione centrale del lettore.",
    centralConflict
      ? `Ogni struttura deve servire questo conflitto/problema: ${centralConflict}`
      : "Prima di generare, chiarisci il conflitto o problema principale.",
    emotionalLock
      ? `Mantieni il tono emotivo richiesto: ${emotionalLock}`
      : "Prima di generare, chiarisci il tono emotivo.",
    genreDNA
      ? `Non tradire il DNA editoriale: ${genreDNA}`
      : "Prima di generare, chiarisci il DNA di genere o stile.",
    promiseLock ? `Promessa lock: ${promiseLock}` : "Prima di generare, chiarisci la promessa editoriale.",
  ];

  const baseConfidence = typeof state.confidence === "number" ? state.confidence : 0.1;
  const inferenceBoost = state.inferredProfile?.confidence ?? 0;
  const completenessBonus = (CRITICAL_FIELDS.length - missingCriticalAnswers.length) * 0.02;
  const blended = Math.max(
    0.1,
    editorial.overallConfidence * 0.72 +
      baseConfidence * 0.12 +
      completenessBonus +
      inferenceBoost * 0.1,
  );
  const confidenceScore = Math.min(
    0.99,
    editorial.readyForBlueprint ? Math.max(0.95, blended) : blended,
  );

  const dnaQuality = assessDnaQuality(extracted, {
    missingCount: missingCriticalAnswers.length,
    confidence: confidenceScore,
  });

  const dnaQualityPass =
    dnaQuality.pass ||
    (evolution.repetitionClear &&
      !dnaQuality.isDirty &&
      !dnaQuality.isAmbiguous &&
      missingCriticalAnswers.length === 0);

  const readyForBlueprint =
    evolution.readyForBlueprint &&
    editorial.canExplainBook &&
    editorial.contradictions.length === 0 &&
    confidenceScore >= CONFIDENCE_BLUEPRINT_THRESHOLD &&
    missingCriticalAnswers.length === 0 &&
    dnaQualityPass;

  const blockedMessage = readyForBlueprint
    ? undefined
    : getBlockedDnaMessage(dnaQuality);

  return {
    coreTopic: promise || readerTransformation || centralConflict || undefined,
    primaryIntent: readerTransformation || promise || undefined,
    targetReader: targetReader || undefined,
    tone: emotionalLock || undefined,
    educationalLevel: clean(extracted.educationalLevel) || undefined,
    inferredBookType,
    inferredGenre,
    inferredSubgenre,
    pacingLock,
    emotionalLock,
    promiseLock,
    forbiddenPatterns,
    whatBookIs,
    whatBookIsNot,
    antiDriftRules,
    confidenceScore,
    missingCriticalAnswers,
    readyForBlueprint,
    dnaQuality,
    blockedMessage,
  };
}

export function getDnaLockReadinessMessage(lock: BookDnaLock): string {
  if (lock.readyForBlueprint) {
    return "DNA del libro chiaro al 95%+: puoi confermare e generare il blueprint.";
  }

  if (lock.blockedMessage && lock.missingCriticalAnswers.length === 0) {
    return lock.blockedMessage;
  }

  if (lock.missingCriticalAnswers.length > 0) {
    return `Servono ancora risposte chiave: ${lock.missingCriticalAnswers.join(", ")}.`;
  }

  if (lock.blockedMessage) return lock.blockedMessage;

  if (lock.confidenceScore < CONFIDENCE_BLUEPRINT_THRESHOLD) {
    return `Confidenza ${Math.round(lock.confidenceScore * 100)}% — serve almeno 95% prima del blueprint.`;
  }

  return "Il DNA del libro esiste, ma la qualità non è ancora abbastanza alta.";
}

export function persistDnaLock(state: GuidedInterviewState): BookDnaLock {
  return buildDnaLockFromInterviewState(state);
}
