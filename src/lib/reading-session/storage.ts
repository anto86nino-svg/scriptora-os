import {
  LISTENING_NOTES_STORAGE_KEY,
  READING_SESSION_STORAGE_KEY,
} from "./constants";
import type { ListeningNote, ReadingSessionSnapshot } from "./types";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function createSessionId(): string {
  return `rs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadReadingSessionSnapshot(): ReadingSessionSnapshot | null {
  if (typeof window === "undefined") return null;
  const parsed = safeParse<ReadingSessionSnapshot | null>(
    localStorage.getItem(READING_SESSION_STORAGE_KEY),
    null,
  );
  if (!parsed?.projectId) return null;
  return parsed;
}

export function saveReadingSessionSnapshot(snapshot: ReadingSessionSnapshot): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    READING_SESSION_STORAGE_KEY,
    JSON.stringify({ ...snapshot, updatedAt: new Date().toISOString() }),
  );
}

export function clearReadingSessionSnapshot(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(READING_SESSION_STORAGE_KEY);
}

export function loadListeningNotes(): ListeningNote[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParse<ListeningNote[]>(localStorage.getItem(LISTENING_NOTES_STORAGE_KEY), []);
  return Array.isArray(parsed) ? parsed : [];
}

export function saveListeningNotes(notes: ListeningNote[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LISTENING_NOTES_STORAGE_KEY, JSON.stringify(notes.slice(0, 500)));
}

export function appendListeningNote(note: ListeningNote): ListeningNote[] {
  const notes = [note, ...loadListeningNotes()].slice(0, 500);
  saveListeningNotes(notes);
  return notes;
}

export function notesForSession(sessionId: string): ListeningNote[] {
  return loadListeningNotes().filter((n) => n.sessionId === sessionId);
}

export function notesForProject(projectId: string): ListeningNote[] {
  return loadListeningNotes().filter((n) => n.projectId === projectId);
}

export interface ChapterNoteGroup {
  chapterIndex: number;
  chapterTitle: string;
  notes: ListeningNote[];
}

export function groupNotesByChapter(notes: ListeningNote[]): ChapterNoteGroup[] {
  const map = new Map<number, ChapterNoteGroup>();
  for (const note of notes) {
    const existing = map.get(note.chapterIndex);
    if (existing) {
      existing.notes.push(note);
    } else {
      map.set(note.chapterIndex, {
        chapterIndex: note.chapterIndex,
        chapterTitle: note.chapterTitle,
        notes: [note],
      });
    }
  }
  return [...map.values()].sort((a, b) => a.chapterIndex - b.chapterIndex);
}
