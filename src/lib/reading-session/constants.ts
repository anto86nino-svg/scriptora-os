import type { ListeningNoteOption, ReadingSessionMode } from "./types";

export const READING_SESSION_STORAGE_KEY = "scriptora-reading-session-v1";
export const LISTENING_NOTES_STORAGE_KEY = "scriptora-listening-notes-v1";
export const READING_SESSION_ENGINE_V1 = "scriptora-reading-session-pro-v1";

export const LISTENING_NOTE_OPTIONS: ListeningNoteOption[] = [
  { type: "dialogue-artificial", label: "Dialogue feels artificial", shortLabel: "Dialogue", category: "warning" },
  { type: "emotion-over-explained", label: "Emotion over-explained", shortLabel: "Emotion", category: "warning" },
  { type: "pacing-slow", label: "Pacing slow", shortLabel: "Pacing", category: "warning" },
  { type: "repetitive", label: "This sounds repetitive", shortLabel: "Repetitive", category: "warning" },
  { type: "strong-moment", label: "Strong moment", shortLabel: "Strong", category: "positive" },
  { type: "emotional-impact", label: "Emotional impact", shortLabel: "Impact", category: "positive" },
];

export const SESSION_MODE_LABELS: Record<ReadingSessionMode, string> = {
  reader: "Reader Mode",
  editor: "Editor Mode",
  immersion: "Immersion Mode",
};

export const FLOW_MODE_LABELS = {
  single: "Single chapter",
  queue: "Chapter queue",
  "continue-book": "Continue book",
} as const;

export const SESSION_PRESET_LABELS = {
  "15min": "15 min session",
  "30min": "30 min session",
  "full-chapter": "Full chapter",
  "continue-book": "Continue book",
} as const;
