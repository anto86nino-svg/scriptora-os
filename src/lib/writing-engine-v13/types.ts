export type V13BookFamily =
  | "narrative"
  | "nonfiction"
  | "manual"
  | "educational"
  | "poetry"
  | "unknown";

export type V13Signal = {
  id: string;
  score: number;
  message: string;
};

export type V13Context = {
  language?: string;
  genre?: string;
  bookTypeId?: string;
  family?: V13BookFamily;
  chapterIndex?: number;
  totalChapters?: number;
  previousChapters?: Array<{ title?: string; content?: string }>;
  blueprint?: any;
  characters?: any[];
};

export type V13Result = {
  score: number;
  signals: V13Signal[];
  directives: string[];
};
