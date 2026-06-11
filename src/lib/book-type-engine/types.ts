import type { BookConfig, Genre, GenreLock } from "@/types/book";
import type { GenreKey } from "@/lib/genre-intelligence";

export type BookTypeFamily =
  | "narrative"
  | "nonfiction"
  | "educational"
  | "manual"
  | "cookbook"
  | "poetry";

export interface BookTypeDefinition {
  id: string;
  label: string;
  family: BookTypeFamily;
  genre: Genre;
  subcategoryHints: string[];
  chapterStyle: "narrative" | "lesson" | "recipe" | "reference" | "workflow" | "poetry";
  defaultSubchapters: boolean;
  titleMode: "contextual" | "topic" | "recipe" | "lesson";
}

export interface BookTypeContext {
  definition: BookTypeDefinition;
  genreKey: GenreKey;
  lock: GenreLock;
  titleRulesBlock: string;
  subchapterRulesBlock: string;
  editorialRulesBlock: string;
  humanizationBlock: string;
  validationBlock: string;
}

export interface BookTypeResolveInput {
  config: BookConfig;
}
