/**
 * Author-first format / genre catalog.
 * Author chooses. Scriptora suggests. Never the reverse.
 */

export type AuthorBookFormatId =
  | "romanzo"
  | "raccolta_racconti"
  | "raccolta_poetica"
  | "self_help"
  | "business"
  | "memoir"
  | "workbook"
  | "saggio"
  | "cookbook"
  | "bambini"
  | "altro";

export type AuthorGenreOption = {
  id: string;
  label: string;
  genre: string;
  bookTypeId: string;
};

export type AuthorFormatOption = {
  id: AuthorBookFormatId;
  label: string;
  bookFormat: string;
  defaultBookTypeId: string;
  defaultGenre: string;
};

export type AuthorFoundations = {
  formatId: AuthorBookFormatId;
  formatLabel: string;
  genreId: string;
  genreLabel: string;
  subgenre?: string;
  targetReader?: string;
  tone?: string;
};

export const BOOK_FORMAT_OPTIONS: AuthorFormatOption[] = [
  { id: "romanzo", label: "Romanzo", bookFormat: "novel", defaultBookTypeId: "literary", defaultGenre: "narrativa" },
  { id: "raccolta_racconti", label: "Raccolta racconti", bookFormat: "short_story_collection", defaultBookTypeId: "literary", defaultGenre: "narrativa" },
  { id: "raccolta_poetica", label: "Raccolta poetica", bookFormat: "poetry_collection", defaultBookTypeId: "poetry", defaultGenre: "poetry" },
  { id: "self_help", label: "Self Help", bookFormat: "self_help", defaultBookTypeId: "self-help", defaultGenre: "self-help" },
  { id: "business", label: "Business", bookFormat: "self_help", defaultBookTypeId: "business", defaultGenre: "business" },
  { id: "memoir", label: "Memoir", bookFormat: "memoir", defaultBookTypeId: "memoir", defaultGenre: "memoir" },
  { id: "workbook", label: "Workbook", bookFormat: "workbook", defaultBookTypeId: "manual", defaultGenre: "manual" },
  { id: "saggio", label: "Saggio", bookFormat: "essay", defaultBookTypeId: "literary", defaultGenre: "philosophy" },
  { id: "cookbook", label: "Cookbook", bookFormat: "cookbook", defaultBookTypeId: "cookbook", defaultGenre: "cookbook" },
  { id: "bambini", label: "Libro per bambini", bookFormat: "children_book", defaultBookTypeId: "children", defaultGenre: "children" },
  { id: "altro", label: "Altro", bookFormat: "mixed_or_unknown", defaultBookTypeId: "literary", defaultGenre: "narrativa" },
];

const GENRES_BY_FORMAT: Record<AuthorBookFormatId, AuthorGenreOption[]> = {
  romanzo: [
    { id: "fantasy", label: "Fantasy", genre: "fantasy", bookTypeId: "fantasy" },
    { id: "thriller", label: "Thriller", genre: "thriller", bookTypeId: "thriller" },
    { id: "horror", label: "Horror", genre: "horror", bookTypeId: "horror" },
    { id: "romance", label: "Romance", genre: "romance", bookTypeId: "romance" },
    { id: "mystery", label: "Mystery", genre: "mystery", bookTypeId: "mystery" },
    { id: "storico", label: "Storico", genre: "historical", bookTypeId: "historical" },
    { id: "fantascienza", label: "Fantascienza", genre: "sci-fi", bookTypeId: "sci-fi" },
    { id: "literary-fiction", label: "Literary Fiction", genre: "literary-fiction", bookTypeId: "literary" },
  ],
  raccolta_racconti: [
    { id: "contemporanea", label: "Contemporanea", genre: "literary-fiction", bookTypeId: "literary" },
    { id: "fantasy", label: "Fantasy", genre: "fantasy", bookTypeId: "fantasy" },
    { id: "horror", label: "Horror", genre: "horror", bookTypeId: "horror" },
    { id: "noir", label: "Noir", genre: "thriller", bookTypeId: "thriller" },
    { id: "storica", label: "Storica", genre: "historical", bookTypeId: "historical" },
    { id: "letteraria", label: "Letteraria", genre: "literary-fiction", bookTypeId: "literary" },
  ],
  raccolta_poetica: [
    { id: "contemporanea", label: "Contemporanea", genre: "poetry", bookTypeId: "poetry" },
    { id: "introspettiva", label: "Introspettiva", genre: "poetry", bookTypeId: "poetry" },
    { id: "romantica", label: "Romantica", genre: "poetry", bookTypeId: "poetry" },
    { id: "spirituale", label: "Spirituale", genre: "poetry", bookTypeId: "poetry" },
    { id: "sociale", label: "Sociale", genre: "poetry", bookTypeId: "poetry" },
  ],
  self_help: [
    { id: "crescita-personale", label: "Crescita personale", genre: "self-help", bookTypeId: "self-help" },
    { id: "produttivita", label: "Produttività", genre: "productivity", bookTypeId: "productivity" },
    { id: "abitudini", label: "Abitudini", genre: "self-help", bookTypeId: "mindset" },
    { id: "leadership", label: "Leadership", genre: "self-help", bookTypeId: "coaching" },
    { id: "mindset", label: "Mindset", genre: "self-help", bookTypeId: "mindset" },
  ],
  business: [
    { id: "strategia", label: "Strategia", genre: "business", bookTypeId: "business" },
    { id: "marketing", label: "Marketing", genre: "business", bookTypeId: "marketing" },
    { id: "finanza", label: "Finanza", genre: "business", bookTypeId: "business" },
    { id: "leadership", label: "Leadership", genre: "business", bookTypeId: "business" },
    { id: "startup", label: "Startup", genre: "business", bookTypeId: "business" },
  ],
  memoir: [
    { id: "personale", label: "Personale", genre: "memoir", bookTypeId: "memoir" },
    { id: "professionale", label: "Professionale", genre: "memoir", bookTypeId: "memoir" },
    { id: "familiare", label: "Familiare", genre: "memoir", bookTypeId: "memoir" },
    { id: "viaggio", label: "Di viaggio", genre: "memoir", bookTypeId: "memoir" },
    { id: "ispirazionale", label: "Ispirazionale", genre: "memoir", bookTypeId: "memoir" },
  ],
  workbook: [
    { id: "produttivita", label: "Produttività", genre: "manual", bookTypeId: "manual" },
    { id: "crescita", label: "Crescita", genre: "manual", bookTypeId: "manual" },
    { id: "creativita", label: "Creatività", genre: "manual", bookTypeId: "manual" },
    { id: "benessere", label: "Benessere", genre: "manual", bookTypeId: "manual" },
    { id: "business", label: "Business", genre: "manual", bookTypeId: "manual" },
  ],
  saggio: [
    { id: "cultura", label: "Cultura", genre: "philosophy", bookTypeId: "literary" },
    { id: "societa", label: "Società", genre: "philosophy", bookTypeId: "literary" },
    { id: "filosofia", label: "Filosofia", genre: "philosophy", bookTypeId: "literary" },
    { id: "scienza", label: "Scienza", genre: "philosophy", bookTypeId: "literary" },
    { id: "arte", label: "Arte", genre: "philosophy", bookTypeId: "literary" },
  ],
  cookbook: [
    { id: "mediterranea", label: "Mediterranea", genre: "cookbook", bookTypeId: "cookbook" },
    { id: "vegana", label: "Vegana", genre: "cookbook", bookTypeId: "cookbook" },
    { id: "dolci", label: "Dolci", genre: "cookbook", bookTypeId: "cookbook" },
    { id: "regionale", label: "Regionale", genre: "cookbook", bookTypeId: "cookbook" },
    { id: "salutare", label: "Salutare", genre: "cookbook", bookTypeId: "cookbook" },
  ],
  bambini: [
    { id: "3-5", label: "3-5 anni", genre: "children", bookTypeId: "children" },
    { id: "6-8", label: "6-8 anni", genre: "children", bookTypeId: "children" },
    { id: "9-12", label: "9-12 anni", genre: "children", bookTypeId: "children" },
    { id: "fiabe", label: "Fiabe", genre: "children", bookTypeId: "children" },
    { id: "educativo", label: "Educativo", genre: "children", bookTypeId: "children" },
  ],
  altro: [
    { id: "generico", label: "Generico", genre: "narrativa", bookTypeId: "literary" },
    { id: "sperimentale", label: "Sperimentale", genre: "literary-fiction", bookTypeId: "literary" },
    { id: "multigenere", label: "Multigenere", genre: "narrativa", bookTypeId: "literary" },
  ],
};

const NARRATIVE_FORBIDDEN_FORMATS: AuthorBookFormatId[] = [
  "raccolta_poetica",
  "self_help",
  "business",
  "workbook",
  "cookbook",
  "saggio",
];

export function getFormatOption(formatId: AuthorBookFormatId): AuthorFormatOption | undefined {
  return BOOK_FORMAT_OPTIONS.find((option) => option.id === formatId);
}

export function getGenresForFormat(formatId: AuthorBookFormatId): AuthorGenreOption[] {
  return GENRES_BY_FORMAT[formatId] ?? GENRES_BY_FORMAT.altro;
}

export function isAuthorFoundationsComplete(
  foundations: Partial<AuthorFoundations>,
): foundations is AuthorFoundations {
  return Boolean(foundations.formatId && foundations.genreId);
}

export function formatForbidsNarrativeFields(formatId?: AuthorBookFormatId): boolean {
  if (!formatId) return false;
  return NARRATIVE_FORBIDDEN_FORMATS.includes(formatId);
}

export function resolveAuthorFoundationsToConfig(foundations: AuthorFoundations): {
  bookFormat: string;
  genre: string;
  bookTypeId: string;
  category: string;
  subcategory: string;
  subgenre: string;
  authorFormatLocked: true;
} {
  const format = getFormatOption(foundations.formatId)!;
  const genreOption =
    getGenresForFormat(foundations.formatId).find((g) => g.id === foundations.genreId)
    ?? getGenresForFormat(foundations.formatId)[0];

  const subgenre = foundations.subgenre?.trim() || genreOption.label;

  return {
    bookFormat: format.bookFormat,
    genre: genreOption.genre,
    bookTypeId: genreOption.bookTypeId,
    category: categoryForFormat(foundations.formatId),
    subcategory: subgenre,
    subgenre,
    authorFormatLocked: true,
  };
}

function categoryForFormat(formatId: AuthorBookFormatId): string {
  switch (formatId) {
    case "raccolta_poetica":
      return "Poesia";
    case "cookbook":
      return "Cookbook";
    case "self_help":
    case "business":
    case "workbook":
      return "Non-Fiction";
    case "memoir":
      return "Memoir";
    case "bambini":
      return "Children";
    case "saggio":
      return "Non-Fiction";
    default:
      return "Fiction";
  }
}

export function buildFoundationsFromDetection(
  proposal: { bookFormat?: string; genre?: string; bookTypeId?: string; detectedLabel?: string; subgenre?: string },
): Partial<AuthorFoundations> | null {
  const formatMatch = BOOK_FORMAT_OPTIONS.find((f) => f.bookFormat === proposal.bookFormat);
  if (!formatMatch) return null;

  const genres = getGenresForFormat(formatMatch.id);
  const genreMatch =
    genres.find((g) => g.genre === proposal.genre || g.bookTypeId === proposal.bookTypeId)
    ?? genres[0];

  return {
    formatId: formatMatch.id,
    formatLabel: formatMatch.label,
    genreId: genreMatch.id,
    genreLabel: proposal.detectedLabel || genreMatch.label,
    subgenre: proposal.subgenre,
  };
}
