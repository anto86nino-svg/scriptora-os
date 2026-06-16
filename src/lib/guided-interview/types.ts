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

export interface InterviewQuestion {
  id: string;
  key: string;
  question: string;
  helper?: string;
  placeholder?: string;
  genre?: InterviewGenre[];
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
  genreDNA?: string[];
}

export interface GuidedInterviewState {
  completed: boolean;
  currentStep: number;
  confidence: number;

  messages: InterviewMessage[];

  extracted: ExtractedBookIntent;

  selectedGenre?: string;
  selectedBookType?: string;
  selectedTone?: string;
  selectedLength?: string;
  wantsSubchapters?: boolean;
}

export interface NextQuestionResult {
  done: boolean;
  question?: InterviewQuestion;
  state: GuidedInterviewState;
}
