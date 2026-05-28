export type MacroGenre = "fiction" | "nonfiction" | "special";

export type MicroGenre =
  | "travel"
  | "cookbook"
  | "poetry"
  | "children"
  | "technical"
  | "business"
  | "biography"
  | "history"
  | "self_help"
  | "unknown"
  | string;

export type FormatType =
  | "chapter"
  | "recipe"
  | "poem"
  | "guide"
  | "manual"
  | "journal"
  | "workbook"
  | "devotional"
  | string;

export interface GenreProfile {
  macro: MacroGenre;
  micro: MicroGenre;
  format: FormatType;
  narrativeDensity: number; // 0..1
  informationalDensity: number; // 0..1
  emotionalIntensity: number; // 0..1
  readerExpectations: string[]; // e.g. ["practical","inspirational","entertaining"]
  structuralHints?: Record<string, any>;
}

export interface ClassifierOptions {
  allowFallback?: boolean;
}
