import type { Genre } from "@/types/book";
import type { BookTypeDefinition } from "./types";

/** Universal taxonomy — maps editorial labels to native Genre + family. */
export const BOOK_TYPE_REGISTRY: BookTypeDefinition[] = [
  // Narrativa
  { id: "romance", label: "Romance", family: "narrative", genre: "romance", subcategoryHints: ["contemporary", "booktok"], chapterStyle: "narrative", defaultSubchapters: true, titleMode: "contextual" },
  { id: "dark-romance", label: "Dark Romance", family: "narrative", genre: "dark-romance", subcategoryHints: ["morally grey"], chapterStyle: "narrative", defaultSubchapters: true, titleMode: "contextual" },
  { id: "fantasy", label: "Fantasy", family: "narrative", genre: "fantasy", subcategoryHints: ["epic", "cozy"], chapterStyle: "narrative", defaultSubchapters: true, titleMode: "contextual" },
  { id: "cozy-fantasy", label: "Cozy Fantasy", family: "narrative", genre: "fantasy", subcategoryHints: ["cozy", "comfort"], chapterStyle: "narrative", defaultSubchapters: true, titleMode: "contextual" },
  { id: "thriller", label: "Thriller", family: "narrative", genre: "thriller", subcategoryHints: ["psychological", "crime"], chapterStyle: "narrative", defaultSubchapters: true, titleMode: "contextual" },
  { id: "crime", label: "Crime", family: "narrative", genre: "thriller", subcategoryHints: ["crime", "noir"], chapterStyle: "narrative", defaultSubchapters: true, titleMode: "contextual" },
  { id: "horror", label: "Horror", family: "narrative", genre: "horror", subcategoryHints: ["supernatural"], chapterStyle: "narrative", defaultSubchapters: true, titleMode: "contextual" },
  { id: "mystery", label: "Mystery", family: "narrative", genre: "thriller", subcategoryHints: ["mystery", "whodunit"], chapterStyle: "narrative", defaultSubchapters: true, titleMode: "contextual" },
  { id: "sci-fi", label: "Sci-Fi", family: "narrative", genre: "sci-fi", subcategoryHints: ["space", "dystopian"], chapterStyle: "narrative", defaultSubchapters: true, titleMode: "contextual" },
  { id: "dystopian", label: "Dystopian", family: "narrative", genre: "sci-fi", subcategoryHints: ["dystopian"], chapterStyle: "narrative", defaultSubchapters: true, titleMode: "contextual" },
  { id: "ya", label: "Young Adult", family: "narrative", genre: "romance", subcategoryHints: ["ya", "young adult"], chapterStyle: "narrative", defaultSubchapters: true, titleMode: "contextual" },
  { id: "historical", label: "Historical Fiction", family: "narrative", genre: "historical", subcategoryHints: ["historical"], chapterStyle: "narrative", defaultSubchapters: true, titleMode: "contextual" },
  { id: "adventure", label: "Adventure", family: "narrative", genre: "fantasy", subcategoryHints: ["adventure"], chapterStyle: "narrative", defaultSubchapters: true, titleMode: "contextual" },
  { id: "literary", label: "Literary Fiction", family: "narrative", genre: "philosophy", subcategoryHints: ["literary"], chapterStyle: "narrative", defaultSubchapters: false, titleMode: "contextual" },
  { id: "paranormal", label: "Paranormal", family: "narrative", genre: "romance", subcategoryHints: ["paranormal"], chapterStyle: "narrative", defaultSubchapters: true, titleMode: "contextual" },
  // Non fiction
  { id: "self-help", label: "Self Help", family: "nonfiction", genre: "self-help", subcategoryHints: ["mindset", "personal growth"], chapterStyle: "lesson", defaultSubchapters: true, titleMode: "topic" },
  { id: "mindset", label: "Mindset", family: "nonfiction", genre: "self-help", subcategoryHints: ["mindset"], chapterStyle: "lesson", defaultSubchapters: true, titleMode: "topic" },
  { id: "productivity", label: "Productivity", family: "nonfiction", genre: "productivity", subcategoryHints: ["habits", "focus"], chapterStyle: "workflow", defaultSubchapters: true, titleMode: "topic" },
  { id: "business", label: "Business", family: "nonfiction", genre: "business", subcategoryHints: ["marketing", "leadership"], chapterStyle: "lesson", defaultSubchapters: true, titleMode: "topic" },
  { id: "marketing", label: "Marketing", family: "nonfiction", genre: "business", subcategoryHints: ["marketing"], chapterStyle: "lesson", defaultSubchapters: true, titleMode: "topic" },
  { id: "leadership", label: "Leadership", family: "nonfiction", genre: "business", subcategoryHints: ["leadership"], chapterStyle: "lesson", defaultSubchapters: true, titleMode: "topic" },
  { id: "finance", label: "Finance", family: "nonfiction", genre: "business", subcategoryHints: ["finance"], chapterStyle: "lesson", defaultSubchapters: true, titleMode: "topic" },
  { id: "coaching", label: "Coaching", family: "nonfiction", genre: "self-help", subcategoryHints: ["coaching"], chapterStyle: "lesson", defaultSubchapters: true, titleMode: "topic" },
  { id: "spirituality", label: "Spiritualità", family: "nonfiction", genre: "spirituality", subcategoryHints: ["meditation"], chapterStyle: "lesson", defaultSubchapters: false, titleMode: "topic" },
  { id: "psychology", label: "Psicologia", family: "nonfiction", genre: "philosophy", subcategoryHints: ["psychology"], chapterStyle: "lesson", defaultSubchapters: true, titleMode: "topic" },
  // Educational
  { id: "education", label: "Educational", family: "educational", genre: "education", subcategoryHints: ["scuola", "università"], chapterStyle: "lesson", defaultSubchapters: true, titleMode: "lesson" },
  { id: "history-school", label: "Storia (scolastico)", family: "educational", genre: "education", subcategoryHints: ["storia", "history"], chapterStyle: "lesson", defaultSubchapters: true, titleMode: "lesson" },
  { id: "math-school", label: "Matematica", family: "educational", genre: "education", subcategoryHints: ["matematica", "math"], chapterStyle: "lesson", defaultSubchapters: true, titleMode: "lesson" },
  { id: "science-school", label: "Scienze", family: "educational", genre: "education", subcategoryHints: ["fisica", "chimica", "biologia"], chapterStyle: "lesson", defaultSubchapters: true, titleMode: "lesson" },
  // Manualistica
  { id: "technical-manual", label: "Manuale tecnico", family: "manual", genre: "technical-manual", subcategoryHints: ["technical"], chapterStyle: "workflow", defaultSubchapters: true, titleMode: "topic" },
  { id: "software-guide", label: "Manuale software", family: "manual", genre: "software-guide", subcategoryHints: ["software"], chapterStyle: "workflow", defaultSubchapters: true, titleMode: "topic" },
  { id: "ai-tools-guide", label: "Manuale AI", family: "manual", genre: "ai-tools-guide", subcategoryHints: ["ai", "prompt"], chapterStyle: "workflow", defaultSubchapters: true, titleMode: "topic" },
  { id: "manual", label: "Guida pratica", family: "manual", genre: "manual", subcategoryHints: ["guide"], chapterStyle: "workflow", defaultSubchapters: true, titleMode: "topic" },
  // Ricettari
  { id: "cookbook", label: "Ricettario", family: "cookbook", genre: "cookbook", subcategoryHints: ["italiana", "regional"], chapterStyle: "recipe", defaultSubchapters: true, titleMode: "recipe" },
  { id: "cookbook-vegan", label: "Cucina vegan", family: "cookbook", genre: "cookbook", subcategoryHints: ["vegan"], chapterStyle: "recipe", defaultSubchapters: true, titleMode: "recipe" },
  { id: "cookbook-keto", label: "Keto", family: "cookbook", genre: "diet-nutrition", subcategoryHints: ["keto"], chapterStyle: "recipe", defaultSubchapters: true, titleMode: "recipe" },
  { id: "cookbook-dessert", label: "Dolci", family: "cookbook", genre: "cookbook", subcategoryHints: ["dolci", "dessert"], chapterStyle: "recipe", defaultSubchapters: true, titleMode: "recipe" },
  // Poesia
  { id: "poetry", label: "Poesia", family: "poetry", genre: "poetry", subcategoryHints: ["moderna", "libera"], chapterStyle: "poetry", defaultSubchapters: false, titleMode: "contextual" },
];

export function resolveBookTypeById(bookTypeId?: string): BookTypeDefinition | undefined {
  if (!bookTypeId) return undefined;
  return BOOK_TYPE_REGISTRY.find((t) => t.id === bookTypeId);
}

export function resolveBookTypeDefinition(
  genre: Genre | string,
  subcategory?: string,
  subgenre?: string,
  bookTypeId?: string,
): BookTypeDefinition {
  const byId = resolveBookTypeById(bookTypeId);
  if (byId) return byId;

  const hay = `${genre} ${subcategory || ""} ${subgenre || ""}`.toLowerCase();
  const exact = BOOK_TYPE_REGISTRY.find((t) => t.genre === genre && t.subcategoryHints.some((h) => hay.includes(h)));
  if (exact) return exact;
  const byGenre = BOOK_TYPE_REGISTRY.find((t) => t.genre === genre);
  if (byGenre) return byGenre;
  if (/cook|ricett|recipe|vegan|keto|pizza|dolci/i.test(hay)) {
    return BOOK_TYPE_REGISTRY.find((t) => t.id === "cookbook")!;
  }
  if (/manual|guida|software|ai tool/i.test(hay)) {
    return BOOK_TYPE_REGISTRY.find((t) => t.id === "ai-tools-guide") || BOOK_TYPE_REGISTRY.find((t) => t.family === "manual")!;
  }
  if (/storia|geografia|matematica|scuola|univers/i.test(hay)) {
    return BOOK_TYPE_REGISTRY.find((t) => t.family === "educational")!;
  }
  if (/poesia|poetry|haiku/i.test(hay)) {
    return BOOK_TYPE_REGISTRY.find((t) => t.family === "poetry")!;
  }
  if (/self|help|mindset|business|productiv/i.test(hay)) {
    return BOOK_TYPE_REGISTRY.find((t) => t.family === "nonfiction")!;
  }
  return BOOK_TYPE_REGISTRY.find((t) => t.id === "romance")!;
}

export interface StudioGenreOption {
  /** BOOK_TYPE_REGISTRY id — persisted as config.bookTypeId */
  id: string;
  genre: Genre;
  label: string;
  category: string;
  family: string;
  defaultSubcategory: string;
  defaultSubchapters: boolean;
}

export function studioGenresFromRegistry(): StudioGenreOption[] {
  return BOOK_TYPE_REGISTRY.map((t) => ({
    id: t.id,
    genre: t.genre,
    label: t.label,
    category:
      t.family === "nonfiction" || t.family === "educational" || t.family === "manual" || t.family === "cookbook"
        ? "Non-Fiction"
        : t.family === "poetry"
          ? "Poesia"
          : "Fiction",
    family: t.family,
    defaultSubcategory: t.subcategoryHints[0] || "General",
    defaultSubchapters: t.defaultSubchapters,
  }));
}
