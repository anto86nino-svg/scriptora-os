import type { StudySessionResult } from "@/lib/study-session";
import type { RiassuntoProLevel } from "@/lib/study-os/study-intelligence-kernel";

export interface RiassuntoProSection {
  keyConcepts: string[];
  definitions: Array<{ term: string; definition: string }>;
  examples: string[];
  formulas: string[];
  commonErrors: string[];
  body: string;
  level: RiassuntoProLevel;
}

const LEVEL_TO_LEGACY: Record<RiassuntoProLevel, keyof NonNullable<StudySessionResult["summaries"]>> = {
  rapido: "brief",
  dettagliato: "complete",
  accademico: "university",
  per_esame: "oralExam",
  ultra_sintetico: "ultraSimple",
};

const LEVEL_LABELS: Record<RiassuntoProLevel, string> = {
  rapido: "Riassunto rapido",
  dettagliato: "Riassunto dettagliato",
  accademico: "Riassunto accademico",
  per_esame: "Riassunto per esame",
  ultra_sintetico: "Ultra sintetico",
};

function extractFormulas(text: string): string[] {
  const matches = text.match(/[^.\n]{0,80}[=<>±√∑∫π][^.\n]{0,80}/g) ?? [];
  return Array.from(new Set(matches.map((m) => m.trim()).filter((m) => m.length >= 4))).slice(0, 8);
}

function definitionsFromVocabulary(result: StudySessionResult): Array<{ term: string; definition: string }> {
  return result.difficultWords.slice(0, 12).map((item) => ({
    term: item.word,
    definition: item.school || item.simple || item.technical,
  }));
}

function commonErrorsFromPackage(result: StudySessionResult): string[] {
  const fromPackage = result.learningPackage?.commonMistakes ?? [];
  const fromWords = result.difficultWords.map((w) => w.commonMistake).filter(Boolean) as string[];
  return Array.from(new Set([...fromPackage, ...fromWords])).slice(0, 8);
}

function examplesFromMaterial(result: StudySessionResult): string[] {
  const examples = [
    ...result.difficultWords.map((w) => w.example).filter(Boolean),
    ...result.flashcards.map((c) => c.example).filter(Boolean) as string[],
  ];
  if (result.keyConcepts.length) {
    examples.push(`Collega ${result.keyConcepts[0]} a un caso tratto dal materiale.`);
  }
  return Array.from(new Set(examples)).slice(0, 6);
}

function resolveBody(result: StudySessionResult, level: RiassuntoProLevel): string {
  const summaries = result.summaries ?? {};
  const legacyKey = LEVEL_TO_LEGACY[level];
  const fromSummaries = summaries[legacyKey];
  if (fromSummaries?.trim()) return fromSummaries;

  if (level === "rapido" || level === "ultra_sintetico") return result.lightSummary || result.summaries?.brief || "";
  if (level === "dettagliato") return result.mediumSummary || result.summaries?.complete || "";
  if (level === "accademico") return result.proSummary || result.summaries?.university || "";
  return result.studyNotesPro || result.proSummary || result.mediumSummary;
}

/** Build structured Riassunti Pro output for a given level. */
export function buildRiassuntoPro(result: StudySessionResult, level: RiassuntoProLevel): RiassuntoProSection {
  const body = resolveBody(result, level);
  const combinedText = [body, result.mediumSummary, result.proSummary].join("\n");

  return {
    level,
    body: body || `${LEVEL_LABELS[level]}: ${result.title}`,
    keyConcepts: result.keyConcepts.slice(0, 12),
    definitions: definitionsFromVocabulary(result),
    examples: examplesFromMaterial(result),
    formulas: extractFormulas(combinedText),
    commonErrors: commonErrorsFromPackage(result),
  };
}

export function getRiassuntoProLevelLabel(level: RiassuntoProLevel): string {
  return LEVEL_LABELS[level];
}

export const RIASSUNTO_PRO_LEVELS: RiassuntoProLevel[] = [
  "rapido",
  "dettagliato",
  "accademico",
  "per_esame",
  "ultra_sintetico",
];
