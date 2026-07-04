import type { StudyDifficultyLevel } from "@/lib/study-session";
import type { StudySummaryMode } from "@/lib/study-session";

export interface SummaryModeLabel {
  key: StudySummaryMode;
  title: string;
  badge: string;
}

const SCHOOL_SUMMARY_LABELS: SummaryModeLabel[] = [
  { key: "brief", title: "Breve", badge: "Sintesi rapida" },
  { key: "complete", title: "Completo", badge: "Studio base" },
  { key: "university", title: "Approfondito", badge: "Livello scolastico avanzato" },
  { key: "oral", title: "Interrogazione", badge: "Risposta a voce" },
  { key: "ultraSimple", title: "Ultra semplice", badge: "Spiegato facile" },
  { key: "quickReview", title: "Ripasso veloce", badge: "5 minuti" },
  { key: "chronological", title: "Timeline", badge: "Sequenza" },
  { key: "causeEffect", title: "Cause e conseguenze", badge: "Relazioni" },
  { key: "bulletPoints", title: "Punti elenco", badge: "Checklist" },
  { key: "oralExam", title: "Esame orale", badge: "Metodo professore" },
];

const UNIVERSITY_SUMMARY_LABELS: SummaryModeLabel[] = [
  { key: "brief", title: "Breve", badge: "Sintesi rapida" },
  { key: "complete", title: "Completo", badge: "Studio base" },
  { key: "university", title: "Universitario", badge: "Approfondito" },
  { key: "oral", title: "Interrogazione", badge: "Risposta a voce" },
  { key: "ultraSimple", title: "Ultra semplice", badge: "Spiegato facile" },
  { key: "quickReview", title: "Ripasso veloce", badge: "5 minuti" },
  { key: "chronological", title: "Cronologico", badge: "Sequenza" },
  { key: "causeEffect", title: "Causa-effetto", badge: "Relazioni" },
  { key: "bulletPoints", title: "Punti elenco", badge: "Checklist" },
  { key: "oralExam", title: "Esame orale", badge: "Metodo professore" },
];

/** Summary UI labels respect school vs university difficulty level. */
export function getSummaryModeLabels(difficultyLevel: StudyDifficultyLevel = 3): SummaryModeLabel[] {
  return difficultyLevel >= 5 ? UNIVERSITY_SUMMARY_LABELS : SCHOOL_SUMMARY_LABELS;
}

export function getUniversitySummaryTitle(difficultyLevel: StudyDifficultyLevel = 3): string {
  return difficultyLevel >= 5 ? "Universitario" : "Approfondito";
}

export function getDictionaryAdvancedLabel(difficultyLevel: StudyDifficultyLevel = 3): string {
  return getUniversitySummaryTitle(difficultyLevel);
}

export function getDictionaryAdvancedHeadline(difficultyLevel: StudyDifficultyLevel = 3): string {
  return difficultyLevel >= 5 ? "Spiegamelo da universitario" : "Spiegamelo in modo approfondito";
}
