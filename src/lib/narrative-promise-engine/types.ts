export type PromiseStatus = "OPEN" | "PARTIAL" | "RESOLVED" | "BROKEN";

export type NarrativePromise = {
  id: string;
  label: string;
  genreHint: string;
  status: PromiseStatus;
  introducedChapter: number;
  lastTouchedChapter: number;
  excerpt: string;
};

export type NarrativePromiseRegistry = {
  version: 1;
  updatedAt: string;
  promises: NarrativePromise[];
  openCount: number;
  brokenCount: number;
  integrityScore: number;
};

export type PromiseDetectionInput = {
  content: string;
  chapterIndex: number;
  genre?: string;
  previousRegistry?: NarrativePromiseRegistry;
};
