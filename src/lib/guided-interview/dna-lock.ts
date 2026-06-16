import type { GuidedInterviewState } from "./types";

export type BookDnaLock = {
  coreTopic?: string;
  primaryIntent?: string;
  targetReader?: string;
  tone?: string;
  educationalLevel?: string;

  whatBookIs: string[];
  whatBookIsNot: string[];

  antiDriftRules: string[];

  confidenceScore: number;
  missingCriticalAnswers: string[];
  readyForBlueprint: boolean;
};

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
  return typeof value === "string" ? value.trim() : "";
}

function hasMeaning(value: unknown, min = 12): boolean {
  return clean(value).length >= min;
}

export function buildInitialDnaLock(): BookDnaLock {
  return {
    confidenceScore: 0.1,
    whatBookIs: [],
    whatBookIsNot: [],
    antiDriftRules: [],
    missingCriticalAnswers: [...CRITICAL_FIELDS],
    readyForBlueprint: false,
  };
}

export function buildDnaLockFromInterviewState(
  state: GuidedInterviewState
): BookDnaLock {
  const extracted = state.extracted ?? {};

  const readerTransformation = clean((extracted as any).readerTransformation);
  const centralConflict = clean((extracted as any).centralConflict);
  const emotionalTone = clean((extracted as any).emotionalTone);
  const genreDNA = clean((extracted as any).genreDNA);
  const promise = clean((extracted as any).promise);
  const setting = clean((extracted as any).setting);

  const targetReader = clean((extracted as any).targetReader);

  const missingCriticalAnswers = CRITICAL_FIELDS.filter(
    (field) => !hasMeaning((extracted as any)[field])
  );

  const whatBookIs = [
    readerTransformation && `Trasformazione/promessa lettore: ${readerTransformation}`,
    centralConflict && `Conflitto o problema centrale: ${centralConflict}`,
    emotionalTone && `Tono emotivo dominante: ${emotionalTone}`,
    genreDNA && `DNA di genere/stile: ${genreDNA}`,
    promise && `Promessa narrativa/editoriale: ${promise}`,
    setting && `Mondo, contesto o atmosfera: ${setting}`,
    targetReader && `Lettore ideale: ${targetReader}`,
  ].filter(Boolean) as string[];

  const whatBookIsNot = [
    "Non deve cambiare genere senza conferma esplicita dell'autore.",
    "Non deve sostituire il cuore del libro con un tema più generico.",
    "Non deve ignorare tono, promessa e pubblico ricavati dall'intervista.",
    "Non deve generare blueprint se mancano risposte critiche.",
  ];

  const antiDriftRules = [
    readerTransformation
      ? `Preserva sempre questa trasformazione centrale: ${readerTransformation}`
      : "Prima di generare, chiarisci la trasformazione centrale del lettore.",
    centralConflict
      ? `Ogni struttura deve servire questo conflitto/problema: ${centralConflict}`
      : "Prima di generare, chiarisci il conflitto o problema principale.",
    emotionalTone
      ? `Mantieni il tono emotivo richiesto: ${emotionalTone}`
      : "Prima di generare, chiarisci il tono emotivo.",
    genreDNA
      ? `Non tradire il DNA di genere/stile: ${genreDNA}`
      : "Prima di generare, chiarisci il DNA di genere o stile.",
  ];

  const baseConfidence = typeof state.confidence === "number" ? state.confidence : 0.1;
  const completenessBonus = (CRITICAL_FIELDS.length - missingCriticalAnswers.length) * 0.04;
  const confidenceScore = Math.min(0.98, Math.max(0.1, baseConfidence + completenessBonus));

  return {
    coreTopic: promise || readerTransformation || centralConflict || undefined,
    primaryIntent: readerTransformation || promise || undefined,
    targetReader: clean((extracted as any).targetReader) || undefined,
    tone: emotionalTone || undefined,
    educationalLevel: clean((extracted as any).educationalLevel) || undefined,
    whatBookIs,
    whatBookIsNot,
    antiDriftRules,
    confidenceScore,
    missingCriticalAnswers,
    readyForBlueprint: confidenceScore >= 0.82 && missingCriticalAnswers.length <= 1,
  };
}

export function getDnaLockReadinessMessage(lock: BookDnaLock): string {
  if (lock.readyForBlueprint) {
    return "DNA del libro abbastanza chiaro: puoi confermare e generare il blueprint.";
  }

  if (lock.missingCriticalAnswers.length > 0) {
    return `Servono ancora risposte chiave: ${lock.missingCriticalAnswers.join(", ")}.`;
  }

  return "Il DNA del libro esiste, ma la confidenza non è ancora abbastanza alta.";
}
