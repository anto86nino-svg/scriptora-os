export type {
  ListeningNote,
  ListeningNoteType,
  ReadingFlowMode,
  ReadingSessionMode,
  ReadingSessionSnapshot,
  SessionPresetId,
} from "./types";

export {
  FLOW_MODE_LABELS,
  LISTENING_NOTE_OPTIONS,
  READING_SESSION_ENGINE_V1,
  READING_SESSION_STORAGE_KEY,
  SESSION_MODE_LABELS,
  SESSION_PRESET_LABELS,
} from "./constants";

export { mapSentenceToParagraph } from "./paragraph-map";

export {
  appendListeningNote,
  clearReadingSessionSnapshot,
  createSessionId,
  groupNotesByChapter,
  loadListeningNotes,
  loadReadingSessionSnapshot,
  notesForProject,
  notesForSession,
  saveListeningNotes,
  saveReadingSessionSnapshot,
} from "./storage";

export type { ChapterNoteGroup } from "./storage";

export {
  useReadingSessionOrchestration,
  type ChapterPlaybackCompleteResult,
} from "./useReadingSessionOrchestration";
