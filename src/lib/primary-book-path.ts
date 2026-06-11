import type { BookConfig } from "@/types/book";
import { isBackMatterEnabled, isFrontMatterEnabled } from "@/lib/matter-options";

export const PRIMARY_BOOK_PATH_CORE = [
  { id: "idea", label: "Idea" },
  { id: "blueprint", label: "Blueprint" },
  { id: "characters", label: "Personaggi" },
  { id: "structure", label: "Struttura" },
] as const;

export const PRIMARY_BOOK_PATH_TAIL = [
  { id: "diagnostic", label: "Diagnostica" },
  { id: "cover", label: "Cover" },
  { id: "export", label: "Export" },
] as const;

/** @deprecated Use getPrimaryBookPathSteps(config) for matter-aware flow */
export const PRIMARY_BOOK_PATH_STEPS = [
  ...PRIMARY_BOOK_PATH_CORE,
  { id: "chapters", label: "Capitoli" },
  ...PRIMARY_BOOK_PATH_TAIL,
] as const;

export type PrimaryBookPathStepId =
  | (typeof PRIMARY_BOOK_PATH_CORE)[number]["id"]
  | "front-matter"
  | "chapters"
  | "back-matter"
  | (typeof PRIMARY_BOOK_PATH_TAIL)[number]["id"];

export function getPrimaryBookPathSteps(config: BookConfig) {
  const mid: Array<{ id: PrimaryBookPathStepId; label: string }> = [];
  if (isFrontMatterEnabled(config)) mid.push({ id: "front-matter", label: "Premessa" });
  mid.push({ id: "chapters", label: "Capitoli" });
  if (isBackMatterEnabled(config)) mid.push({ id: "back-matter", label: "Postfazione" });
  return [...PRIMARY_BOOK_PATH_CORE, ...mid, ...PRIMARY_BOOK_PATH_TAIL];
}

export const PRIMARY_BOOK_LAUNCH_KEY = "scriptora-new-book";

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
