import type { InterviewQuickSuggestion, InterviewQuestion } from "./types";

export type ForgeGenreFamilyId =
  | "narrativa"
  | "non-fiction"
  | "studio"
  | "creativi";

export type ForgeGenreCatalogEntry = {
  id: string;
  label: string;
  family: ForgeGenreFamilyId;
  familyLabel: string;
  bookType: string;
  genre: string;
  subgenre?: string;
};

export const FORGE_GENRE_OPENING_QUESTION_ID = "genre-family-select";
export const FORGE_HOST_GREETING_MESSAGE_ID = "host-greeting";

export const FORGE_GENRE_FAMILIES: Array<{ id: ForgeGenreFamilyId; label: string }> = [
  { id: "narrativa", label: "Narrativa" },
  { id: "non-fiction", label: "Non Fiction" },
  { id: "studio", label: "Studio / Educational" },
  { id: "creativi", label: "Creativi" },
];

export const FORGE_GENRE_CATALOG: ForgeGenreCatalogEntry[] = [
  { id: "romance", label: "Romance", family: "narrativa", familyLabel: "Narrativa", bookType: "Romanzo", genre: "romance" },
  { id: "dark-romance", label: "Dark Romance", family: "narrativa", familyLabel: "Narrativa", bookType: "Romanzo", genre: "dark-romance", subgenre: "Dark Romance" },
  { id: "contemporary-romance", label: "Contemporary Romance", family: "narrativa", familyLabel: "Narrativa", bookType: "Romanzo", genre: "romance", subgenre: "Contemporary Romance" },
  { id: "mafia-romance", label: "Mafia Romance", family: "narrativa", familyLabel: "Narrativa", bookType: "Romanzo", genre: "dark-romance", subgenre: "Mafia Romance" },
  { id: "thriller", label: "Thriller", family: "narrativa", familyLabel: "Narrativa", bookType: "Romanzo", genre: "thriller" },
  { id: "crime", label: "Crime", family: "narrativa", familyLabel: "Narrativa", bookType: "Romanzo", genre: "thriller", subgenre: "Crime" },
  { id: "horror", label: "Horror", family: "narrativa", familyLabel: "Narrativa", bookType: "Romanzo", genre: "thriller", subgenre: "Horror" },
  { id: "fantasy", label: "Fantasy", family: "narrativa", familyLabel: "Narrativa", bookType: "Romanzo", genre: "fantasy" },
  { id: "epic-fantasy", label: "Epic Fantasy", family: "narrativa", familyLabel: "Narrativa", bookType: "Romanzo", genre: "fantasy", subgenre: "Epic Fantasy" },
  { id: "urban-fantasy", label: "Urban Fantasy", family: "narrativa", familyLabel: "Narrativa", bookType: "Romanzo", genre: "fantasy", subgenre: "Urban Fantasy" },
  { id: "sci-fi", label: "Sci-Fi", family: "narrativa", familyLabel: "Narrativa", bookType: "Romanzo", genre: "fantasy", subgenre: "Sci-Fi" },
  { id: "mystery", label: "Mystery", family: "narrativa", familyLabel: "Narrativa", bookType: "Romanzo", genre: "thriller", subgenre: "Mystery" },
  { id: "literary-fiction", label: "Literary Fiction", family: "narrativa", familyLabel: "Narrativa", bookType: "Romanzo", genre: "literary-fiction" },
  { id: "young-adult", label: "Young Adult", family: "narrativa", familyLabel: "Narrativa", bookType: "Romanzo", genre: "romance", subgenre: "Young Adult" },
  { id: "historical-fiction", label: "Historical Fiction", family: "narrativa", familyLabel: "Narrativa", bookType: "Romanzo", genre: "literary-fiction", subgenre: "Historical Fiction" },
  { id: "self-help", label: "Self Help", family: "non-fiction", familyLabel: "Non Fiction", bookType: "Saggio", genre: "self-help" },
  { id: "business", label: "Business", family: "non-fiction", familyLabel: "Non Fiction", bookType: "Saggio", genre: "business" },
  { id: "marketing", label: "Marketing", family: "non-fiction", familyLabel: "Non Fiction", bookType: "Saggio", genre: "business", subgenre: "Marketing" },
  { id: "leadership", label: "Leadership", family: "non-fiction", familyLabel: "Non Fiction", bookType: "Saggio", genre: "business", subgenre: "Leadership" },
  { id: "psicologia", label: "Psicologia", family: "non-fiction", familyLabel: "Non Fiction", bookType: "Saggio", genre: "self-help", subgenre: "Psicologia" },
  { id: "crescita-personale", label: "Crescita Personale", family: "non-fiction", familyLabel: "Non Fiction", bookType: "Saggio", genre: "self-help", subgenre: "Crescita Personale" },
  { id: "filosofia", label: "Filosofia", family: "non-fiction", familyLabel: "Non Fiction", bookType: "Saggio", genre: "self-help", subgenre: "Filosofia" },
  { id: "spiritualita", label: "Spiritualità", family: "non-fiction", familyLabel: "Non Fiction", bookType: "Saggio", genre: "self-help", subgenre: "Spiritualità" },
  { id: "biografia", label: "Biografia", family: "non-fiction", familyLabel: "Non Fiction", bookType: "Memoir", genre: "memoir", subgenre: "Biografia" },
  { id: "memoir", label: "Memoir", family: "non-fiction", familyLabel: "Non Fiction", bookType: "Memoir", genre: "memoir" },
  { id: "manuale", label: "Manuale", family: "studio", familyLabel: "Studio / Educational", bookType: "Manuale", genre: "manual" },
  { id: "universita", label: "Università", family: "studio", familyLabel: "Studio / Educational", bookType: "Libro studio", genre: "manual", subgenre: "Università" },
  { id: "corso", label: "Corso", family: "studio", familyLabel: "Studio / Educational", bookType: "Manuale", genre: "manual", subgenre: "Corso" },
  { id: "matematica", label: "Matematica", family: "studio", familyLabel: "Studio / Educational", bookType: "Libro studio", genre: "manual", subgenre: "Matematica" },
  { id: "fisica", label: "Fisica", family: "studio", familyLabel: "Studio / Educational", bookType: "Libro studio", genre: "manual", subgenre: "Fisica" },
  { id: "diritto", label: "Diritto", family: "studio", familyLabel: "Studio / Educational", bookType: "Libro studio", genre: "manual", subgenre: "Diritto" },
  { id: "medicina", label: "Medicina", family: "studio", familyLabel: "Studio / Educational", bookType: "Libro studio", genre: "manual", subgenre: "Medicina" },
  { id: "poesie", label: "Poesie", family: "creativi", familyLabel: "Creativi", bookType: "Poesie", genre: "poetry" },
  { id: "racconti", label: "Raccolta Racconti", family: "creativi", familyLabel: "Creativi", bookType: "Raccolta racconti", genre: "literary-fiction", subgenre: "Raccolta racconti" },
  { id: "canzoni", label: "Canzoni", family: "creativi", familyLabel: "Creativi", bookType: "Poesie", genre: "poetry", subgenre: "Canzoni" },
  { id: "aforismi", label: "Aforismi", family: "creativi", familyLabel: "Creativi", bookType: "Poesie", genre: "poetry", subgenre: "Aforismi" },
];

export function catalogEntryToChip(entry: ForgeGenreCatalogEntry): InterviewQuickSuggestion {
  const value = [
    entry.bookType,
    entry.subgenre ?? entry.label,
    entry.genre,
    entry.familyLabel,
  ].join(" · ");
  return { label: entry.label, value };
}

export function genreCatalogQuickSuggestions(family?: ForgeGenreFamilyId): InterviewQuickSuggestion[] {
  const items = family
    ? FORGE_GENRE_CATALOG.filter((e) => e.family === family)
    : FORGE_GENRE_CATALOG;
  return items.map(catalogEntryToChip);
}

export function resolveGenreCatalogFromAnswer(answer: string): ForgeGenreCatalogEntry | null {
  const normalized = answer.trim().toLowerCase();
  for (const entry of FORGE_GENRE_CATALOG) {
    if (normalized.includes(entry.label.toLowerCase())) return entry;
    if (normalized.includes(entry.id.replace(/-/g, " "))) return entry;
    if (entry.subgenre && normalized.includes(entry.subgenre.toLowerCase())) return entry;
  }
  const byChip = FORGE_GENRE_CATALOG.find((entry) => {
    const chip = catalogEntryToChip(entry);
    return chip.value.toLowerCase() === normalized || chip.label.toLowerCase() === normalized;
  });
  return byChip ?? null;
}

export function getGenreSelectionQuestion(): InterviewQuestion {
  return {
    id: FORGE_GENRE_OPENING_QUESTION_ID,
    key: "genre",
    question: "Che tipo di libro vuoi scrivere oggi?",
    helper: "Scegli un genere — poi costruiamo il libro una decisione alla volta.",
    placeholder: "Oppure scrivi il genere con parole tue…",
    quickSuggestions: genreCatalogQuickSuggestions(),
  };
}

export function isGenreSlotLocked(memory: { answeredSlots?: Partial<Record<string, boolean>> }): boolean {
  return Boolean(memory.answeredSlots?.genre) || Boolean(memory.answeredSlots?.bookType);
}
