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

export const CHAPTER_BREATHING_PRESETS: InterviewQuickSuggestion[] = [
  { label: "Compatto: 10–12 capitoli", value: "12 capitoli, struttura compatta e intensa." },
  { label: "Standard bestseller: 16–20 capitoli", value: "18 capitoli, struttura standard bestseller." },
  { label: "Ampio e immersivo: 24+ capitoli", value: "24 capitoli, respiro ampio e immersivo." },
];

export const MARKETPLACE_PRESETS: InterviewQuickSuggestion[] = [
  { label: "Amazon KDP", value: "Amazon KDP" },
  { label: "Libreria / editore", value: "Libreria tradizionale o editore" },
  { label: "Audio / podcast", value: "Audiolibro o adattamento audio" },
  { label: "Studio / università", value: "Studio personale o università" },
];

export const FRONT_MATTER_PRESETS: InterviewQuickSuggestion[] = [
  { label: "Prefazione", value: "Prefazione dell'autore" },
  { label: "Dedica", value: "Dedica" },
  { label: "Minimo essenziale", value: "Solo il minimo essenziale." },
  { label: "Niente front matter", value: "Niente front matter aggiuntivo." },
];

export const BACK_MATTER_PRESETS: InterviewQuickSuggestion[] = [
  { label: "Ringraziamenti", value: "Ringraziamenti" },
  { label: "Note e appendice", value: "Note e appendice" },
  { label: "Invito al lettore", value: "Invito al lettore / prossimo libro" },
  { label: "Niente extra", value: "Niente back matter aggiuntivo." },
];

export const SUBCHAPTER_PRESETS: InterviewQuickSuggestion[] = [
  { label: "Sì, sottocapitoli", value: "Sì, con sottocapitoli per ogni sezione importante." },
  { label: "No, capitoli continui", value: "No, solo capitoli continui senza sottodivisioni." },
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
