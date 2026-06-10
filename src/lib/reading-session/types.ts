export type ReadingSessionMode = "reader" | "editor" | "immersion";

export type ReadingFlowMode = "single" | "queue" | "continue-book";

export type SessionPresetId = "15min" | "30min" | "full-chapter" | "continue-book";

export type ListeningNoteType =
  | "dialogue-artificial"
  | "emotion-over-explained"
  | "pacing-slow"
  | "repetitive"
  | "strong-moment"
  | "emotional-impact";

export interface ListeningNote {
  id: string;
  projectId: string;
  chapterIndex: number;
  chapterTitle: string;
  paragraphIndex: number;
  sentenceIndex: number;
  noteType: ListeningNoteType;
  excerpt: string;
  sessionId: string;
  createdAt: string;
}

export interface ReadingSessionSnapshot {
  projectId: string;
  chapterIndex: number;
  sentenceIndex: number;
  progress: number;
  styleId: string;
  speed: number;
  manualVoiceKey: string;
  mode: ReadingSessionMode;
  flowMode: ReadingFlowMode;
  sessionId: string;
  updatedAt: string;
}

export interface ListeningNoteOption {
  type: ListeningNoteType;
  label: string;
  shortLabel: string;
  category: "warning" | "positive";
}
