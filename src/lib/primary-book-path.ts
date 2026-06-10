import type { BookConfig } from "@/types/book";

export const PRIMARY_BOOK_PATH_STEPS = [
  { id: "idea", label: "Idea" },
  { id: "blueprint", label: "Blueprint" },
  { id: "characters", label: "Personaggi" },
  { id: "structure", label: "Struttura" },
  { id: "chapters", label: "Capitoli" },
  { id: "diagnostic", label: "Diagnostica" },
  { id: "cover", label: "Cover" },
  { id: "export", label: "Export" },
] as const;

export type PrimaryBookPathStepId = (typeof PRIMARY_BOOK_PATH_STEPS)[number]["id"];

export const PRIMARY_BOOK_LAUNCH_KEY = "nexora-new-book";

/** Persist config and return the storage key used by Writer Studio boot. */
export function persistPrimaryBookLaunch(config: BookConfig): void {
  sessionStorage.setItem(PRIMARY_BOOK_LAUNCH_KEY, JSON.stringify(config));
}

export function readPrimaryBookLaunch(): BookConfig | null {
  try {
    const raw = sessionStorage.getItem(PRIMARY_BOOK_LAUNCH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BookConfig;
  } catch {
    return null;
  }
}

export function clearPrimaryBookLaunch(): void {
  sessionStorage.removeItem(PRIMARY_BOOK_LAUNCH_KEY);
}
