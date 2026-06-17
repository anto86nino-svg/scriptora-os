import type { InterviewQuickSuggestion } from "./types";

export const LANGUAGE_PRESETS: InterviewQuickSuggestion[] = [
  { label: "Italiano", value: "Italiano" },
  { label: "English", value: "English" },
  { label: "Español", value: "Español" },
  { label: "Français", value: "Français" },
  { label: "Deutsch", value: "Deutsch" },
  { label: "Altra lingua", value: "Altra lingua — la specifico dopo." },
];

export const BOOK_TYPE_PRESETS: InterviewQuickSuggestion[] = [
  { label: "Romanzo", value: "Romanzo narrativo" },
  { label: "Dark romance", value: "Dark romance" },
  { label: "Thriller", value: "Thriller" },
  { label: "Horror", value: "Horror" },
  { label: "Fantasy", value: "Fantasy" },
  { label: "Self-help", value: "Self-help" },
  { label: "Saggio", value: "Saggio" },
  { label: "Manuale", value: "Manuale pratico" },
  { label: "Poesia", value: "Poesia / raccolta poetica" },
  { label: "Raccolta racconti", value: "Raccolta di racconti" },
  { label: "Memoir", value: "Memoir / autobiografia" },
  { label: "Libro per bambini", value: "Libro per bambini" },
  { label: "Studio / universitario", value: "Libro di studio / universitario" },
];

export const GENRE_DIRECTION_PRESETS: InterviewQuickSuggestion[] = [
  { label: "Dark romance psicologico", value: "Dark romance psicologico" },
  { label: "Thriller emotivo", value: "Thriller emotivo" },
  { label: "Romanzo drammatico", value: "Romanzo drammatico" },
  { label: "Altro / guidami", value: "Altro — guidami tu con altre opzioni." },
];

export const LENGTH_PRESETS: InterviewQuickSuggestion[] = [
  { label: "Breve", value: "Libro breve, intenso, senza cuscinetti." },
  { label: "Standard", value: "Lunghezza standard, equilibrata." },
  { label: "Lungo", value: "Romanzo lungo, immersivo." },
  { label: "KDP rapido", value: "KDP rapido — snello e commerciale." },
  { label: "Romanzo completo", value: "Romanzo completo con respiro narrativo." },
  { label: "Manuale pratico", value: "Manuale pratico, step concreti." },
];

export const TONE_PRESETS: InterviewQuickSuggestion[] = [
  { label: "Cinematico", value: "Cinematico, visivo, ritmato." },
  { label: "Poetico", value: "Poetico, sensoriale, lirico." },
  { label: "Crudo", value: "Crudo, diretto, senza filtri." },
  { label: "Elegante", value: "Elegante, raffinato, controllato." },
  { label: "Commerciale", value: "Commerciale, leggibile, coinvolgente." },
  { label: "Accademico", value: "Accademico ma chiaro." },
  { label: "Semplice", value: "Semplice, accessibile, concreto." },
  { label: "Intenso", value: "Intenso, magnetico, immersivo." },
];

export const STRUCTURE_PRESETS: InterviewQuickSuggestion[] = [
  { label: "Capitoli senza sottocapitoli", value: "Capitoli senza sottocapitoli, flusso continuo." },
  { label: "Capitoli + sottocapitoli", value: "Capitoli con sottocapitoli dove serve." },
  { label: "Parte I / II / III", value: "Struttura in tre parti." },
  { label: "Lezioni / esercizi", value: "Lezioni con esercizi pratici." },
  { label: "Racconti separati", value: "Racconti separati ma coerenti." },
  { label: "Sezioni poetiche", value: "Sezioni poetiche tematiche." },
];

export const TITLE_PRESETS: InterviewQuickSuggestion[] = [
  { label: "Ho un titolo", value: "Ho già un titolo definitivo." },
  { label: "Titolo provvisorio", value: "Usiamo un titolo provvisorio per ora." },
  { label: "Proponi tu", value: "Proponi tu tre titoli possibili." },
];

export const UNCERTAINTY_PRESETS: InterviewQuickSuggestion[] = [
  { label: "Fammi vedere altre opzioni", value: "Fammi vedere altre opzioni concrete." },
  { label: "Voglio rispondere liberamente", value: "Preferisco rispondere liberamente." },
];
