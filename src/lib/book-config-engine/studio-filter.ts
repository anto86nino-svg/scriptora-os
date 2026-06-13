import type { StudioGenreOption } from "@/lib/book-type-engine";
import { studioGenresFromRegistry } from "@/lib/book-type-engine";
import type { Level1BookType } from "./types";
import { getLevel1Definition } from "./level1-lock";

export function filterStudioGenresForLevel1(level1: Level1BookType): StudioGenreOption[] {
  const def = getLevel1Definition(level1);
  const all = studioGenresFromRegistry();
  return all.filter((g) => def.allowedBookTypeIds.includes(g.id));
}

/** Romanzo subgenres visible when level-1 = romanzo (user spec). */
export const ROMANZO_VISIBLE_SUBGENRES = [
  "thriller", "gothic-thriller", "crime", "mystery", "dark-romance", "romance",
  "fantasy", "cozy-fantasy", "historical", "literary", "ya", "sci-fi", "adventure",
  "paranormal", "horror",
] as const;

/** Self-help subgenres visible when level-1 = self-help (user spec). */
export const SELF_HELP_VISIBLE_SUBGENRES = [
  "self-help", "mindset", "productivity", "coaching", "spirituality", "psychology",
] as const;

export function getVisibleBookTypesForLevel1(level1: Level1BookType): StudioGenreOption[] {
  const filtered = filterStudioGenresForLevel1(level1);
  if (level1 === "romanzo") {
    return filtered.filter((g) => (ROMANZO_VISIBLE_SUBGENRES as readonly string[]).includes(g.id));
  }
  if (level1 === "self-help") {
    return filtered.filter((g) => (SELF_HELP_VISIBLE_SUBGENRES as readonly string[]).includes(g.id));
  }
  return filtered;
}
