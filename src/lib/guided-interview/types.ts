import type { BookDnaLock } from "./dna-lock";
import type { InferredBookProfile } from "./dna-inference";

export type InterviewRole = "assistant" | "user";

export type InterviewGenre =
  | "romance"
  | "dark-romance"
  | "thriller"
  | "fantasy"
  | "literary-fiction"
  | "self-help"
  | "business"
  | "manual"
  | "poetry"
  | "general";

export interface InterviewMessage {
  id: string;
  role: InterviewRole;
  content: string;
  createdAt: number;
}

export type InterviewQuickSuggestion = {
  label: string;
  value: string;
};

export interface InterviewQuestion {
  id: string;
  key: string;
  question: string;
  helper?: string;
  placeholder?: string;
  genre?: InterviewGenre[];
  quickSuggestions?: InterviewQuickSuggestion[];
}

export interface ExtractedBookIntent {
  promise?: string;
  protagonistWound?: string;
  emotionalTone?: string;
  readerTransformation?: string;
  centralConflict?: string;
  setting?: string;
  targetReader?: string;
  narrativeDrive?: string;
  genreDNA?: string;

  /** Book Forge Pro configuration — collected conversationally, not through legacy screens */
  language?: string;
  marketplace?: string;
  authorName?: string;
  bookType?: string;
  genre?: string;
  subgenre?: string;
  bookLength?: string;
  chapterCount?: string;
  chapterLength?: string;
  subchaptersPreference?: string;
  subchaptersPerChapter?: string;
  structurePreference?: string;
  commercialGoal?: string;
  openingHook?: string;
}

export interface GuidedInterviewState {
  completed: boolean;
  currentStep: number;
  confidence: number;

  messages: InterviewMessage[];

  extracted: ExtractedBookIntent;

  /** Chat-first: Scriptora discovers genre — never asks upfront */
  chatFirst?: boolean;
  inferredProfile?: InferredBookProfile;

  selectedGenre?: string;
  selectedBookType?: string;
  selectedTone?: string;
  selectedLength?: string;
  wantsSubchapters?: boolean;
  dnaLock?: BookDnaLock;
}

export interface NextQuestionResult {
  done: boolean;
  question?: InterviewQuestion;
  state: GuidedInterviewState;
}
