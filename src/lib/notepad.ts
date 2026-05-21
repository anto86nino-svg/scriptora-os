export type ScriptoraNoteTextColor = "black" | "red" | "green" | "blue" | "violet" | "amber";

export interface ScriptoraNote {
  id: string;
  title: string;
  content: string;
  textColor?: ScriptoraNoteTextColor;
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

const NOTES_STORAGE_KEY = "scriptora-notepad-notes-v1";

function notesStorageKey(scope?: string | null): string {
  const safeScope = String(scope || "local").trim() || "local";
  return `${NOTES_STORAGE_KEY}:${safeScope}`;
}

function makeId(): string {
  try {
    return `note-${crypto.randomUUID()}`;
  } catch {
    return `note-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function createScriptoraNote(seed?: Partial<ScriptoraNote>): ScriptoraNote {
  const now = new Date().toISOString();
  return {
    id: seed?.id || makeId(),
    title: seed?.title || "Nuovo appunto",
    content: seed?.content || "",
    textColor: seed?.textColor || "black",
    pinned: seed?.pinned || false,
    createdAt: seed?.createdAt || now,
    updatedAt: seed?.updatedAt || now,
  };
}

export function normalizeScriptoraNote(note: Partial<ScriptoraNote>): ScriptoraNote {
  const createdAt = note.createdAt || new Date().toISOString();
  const updatedAt = note.updatedAt || createdAt;

  return {
    id: note.id || makeId(),
    title: String(note.title || "").trim() || "Senza titolo",
    content: String(note.content || ""),
    textColor: normalizeNoteTextColor(note.textColor),
    pinned: Boolean(note.pinned),
    createdAt,
    updatedAt,
  };
}

function normalizeNoteTextColor(value: unknown): ScriptoraNoteTextColor {
  const color = String(value || "black");
  if (["black", "red", "green", "blue", "violet", "amber"].includes(color)) {
    return color as ScriptoraNoteTextColor;
  }
  return "black";
}

export function sortScriptoraNotes(notes: ScriptoraNote[]): ScriptoraNote[] {
  return [...notes].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function loadScriptoraNotes(scope?: string | null): ScriptoraNote[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(notesStorageKey(scope));
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return sortScriptoraNotes(parsed.map(normalizeScriptoraNote));
  } catch {
    return [];
  }
}

export function saveScriptoraNotes(notes: ScriptoraNote[], scope?: string | null): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(notesStorageKey(scope), JSON.stringify(sortScriptoraNotes(notes)));
}

export function countNoteWords(content: string): number {
  return String(content || "").trim().split(/\s+/).filter(Boolean).length;
}

export function getNotePreview(content: string): string {
  return String(content || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}
